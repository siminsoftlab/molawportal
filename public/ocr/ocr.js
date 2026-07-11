// ===================== 전역 =====================
let _rows = [];
let _debtorName = "";
let _debtorSSN = "";

const parseBtn = document.getElementById("parseBtn");
const pdfInput = document.getElementById("pdfFile");
const tableBody = document.querySelector("#debtTable tbody");
const statusEl = document.getElementById("status");
const debtorInfoEl = document.getElementById("debtorInfo");
const exportExcelBtn = document.getElementById("exportExcelBtn");

// ===================== OCR =====================
async function ocrPdf(file) {
  const pdfjsLib = window["pdfjs-dist/build/pdf"];
  pdfjsLib.GlobalWorkerOptions.workerSrc = "//mozilla.github.io/pdf.js/build/pdf.worker.js";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join("\n") + "\n";
  }
  return fullText;
}

// ===================== 유틸 =====================
function normalize(str) {
  let s = (str || "").replace(/\s+/g, "").replace(/[^\w가-힣]/g, "");
  s = s.replace(/(본점|본부|심사부|여신관리단|여신관리부|학자금대출부|대양|중앙회|본사)/g, "");
  return s;
}

function normalizeCreditor(name) {
  return normalize(name);
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const len = Math.max(a.length, b.length);
  let same = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) same++;
  }
  return same / len;
}

// ===================== 채무자 정보 =====================
function extractDebtorInfo(text) {
  const ssnMatch = text.match(/(\d{6}-\d{7})/);
  if (ssnMatch) _debtorSSN = ssnMatch[1];

  const nameMatch =
    text.match(/성명\(대표자\)\s*([\uAC00-\uD7A3]+)/) ||
    text.match(/성 명\s*([\uAC00-\uD7A3]+)/);

  if (nameMatch) _debtorName = nameMatch[1];
}

// ===================== 섹션 분리 =====================
function splitSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = {};
  let current = "기타";

  for (let line of lines) {
    const clean = line.trim();

    if (clean.includes("대출정보")) current = "대출정보";
    else if (clean.includes("신용도판단정보")) current = "신용도판단정보";
    else if (clean.includes("등록내용")) current = "등록내용";
    else if (clean.includes("채권자변동정보")) current = "채권자변동";
    else if (clean.includes("채무현황")) current = "채무현황";

    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  }

  return sections;
}

// ===================== 대출정보 파싱 =====================
function parseLoanInfo(lines) {
  const rows = [];
  for (let line of lines) {
    const clean = line.replace(/\s+/g, " ").trim();
    if (!clean) continue;

    if (!clean.match(/대부대출|학자금대출|신용대출/)) continue;

    const parts = clean.split(" ");
    const loanType = parts[0].includes("대출") ? parts[0] : "-";
    const creditor =
      parts.find(p =>
        p.match(/대부|재단|은행|금고|캐피탈/)
      ) || "";

    const amount = parseInt(parts[parts.length - 1].replace(/,/g, ""), 10) || 0;

    rows.push({
      type: "대출",
      creditor,
      account: "-",
      loanType,
      transfers: "-",
      repaid: "미변제",
      amount
    });
  }
  return rows;
}

// ===================== 등록/신용도판단정보 파싱 =====================
function parseRegister(lines) {
  const rows = [];
  for (let line of lines) {
    const clean = line.replace(/\s+/g, " ").trim();
    if (!clean) continue;

    if (clean.match(/대부|캐피탈|보험|금고|카드|지방법원|재단|장학재단/)) {
      const creditorMatch = clean.match(
        /([가-힣A-Za-z0-9]+대부|[가-힣A-Za-z0-9]+캐피탈|[가-힣A-Za-z0-9]+보험|[가-힣A-Za-z0-9]+금고|[가-힣A-Za-z0-9]+카드|[가-힣A-Za-z0-9]+지방법원|서울보증보험|한국장학재단)/
      );
      const creditor = creditorMatch ? creditorMatch[0] : "";

      const nums = clean.match(/(\d{1,3}(,\d{3})*|\d+)/g);
      const amount = nums ? parseInt(nums[nums.length - 1].replace(/,/g, ""), 10) : 0;

      rows.push({
        type: "등록",
        creditor,
        account: "-",
        loanType: "-",
        transfers: "-",
        repaid: "미변제",
        amount
      });
    }
  }
  return rows;
}

// ===================== 채권자변동정보 파싱 =====================
function parseCreditorChange(lines) {
  const rows = [];
  for (let line of lines) {
    const clean = line.replace(/\s+/g, " ").trim();
    if (!clean) continue;

    if (clean.match(/대부|캐피탈|금고|카드|지방법원|재단|장학재단/)) {
      const creditorMatch = clean.match(
        /([가-힣A-Za-z0-9]+대부|[가-힣A-Za-z0-9]+캐피탈|[가-힣A-Za-z0-9]+금고|[가-힣A-Za-z0-9]+카드|[가-힣A-Za-z0-9]+지방법원|서울보증보험|한국장학재단)/
      );
      const creditor = creditorMatch ? creditorMatch[0] : "";

      let transfers = "-";
      if (clean.includes("양도") || clean.includes("매각")) transfers = clean;

      rows.push({
        type: "변동",
        creditor,
        account: "-",
        loanType: "-",
        transfers,
        repaid: "미변제",
        amount: 0
      });
    }
  }
  return rows;
}

// ===================== alive 판정 =====================
function isAliveDebt(row) {
  const t = (row.transfers || "") + " " + (row.repaid || "");
  if (t.match(/해제|본인변제|소멸시효|면책결정/)) return false;
  return true;
}

function collectAllInstitutions(rows) {
  const set = new Set();
  for (const r of rows) {
    if (!r.creditor) continue;
    const norm = normalizeCreditor(r.creditor);
    if (norm.length < 2) continue;
    set.add(norm);
  }
  return Array.from(set);
}

function isAliveInstitution(inst, rows) {
  let alive = false;

  for (const r of rows) {
    const norm = normalizeCreditor(r.creditor);
    if (norm !== inst) continue;

    if (!isAliveDebt(r)) continue;

    if (r.amount > 0) alive = true;
    if (r.loanType !== "-") alive = true;
    if (r.transfers !== "-") alive = true;
    if (r.repaid === "미변제") alive = true;
  }

  return alive;
}

function buildFinalCreditorList(rows) {
  const institutions = collectAllInstitutions(rows);
  return institutions.filter(inst => isAliveInstitution(inst, rows));
}

// ===================== postProcess =====================
function postProcess(rows) {
  const aliveInstitutions = buildFinalCreditorList(rows);
  const result = [];

  for (const inst of aliveInstitutions) {
    const group = rows.filter(r => normalizeCreditor(r.creditor) === inst);

    const creditor = inst;
    const alive = group.some(r => isAliveDebt(r));
    const repaid = alive ? "미변제" : "해제됨";

    const phoneRow = group.find(r => r.phone && r.phone !== "-");
    const phone = phoneRow ? phoneRow.phone : "-";

    const accountRow = group.find(r => r.account && r.account !== "-");
    const account = accountRow ? accountRow.account : "-";

    const loanTypeRow = group.find(r => r.loanType && r.loanType !== "-");
    const loanType = loanTypeRow ? loanTypeRow.loanType : "-";

    const transfers = group
      .map(r => r.transfers)
      .filter(t => t && t !== "-")
      .join(" / ") || "-";

    result.push({
      creditor,
      phone,
      account,
      loanType,
      transfers,
      repaid
    });
  }

  return result;
}

// ===================== 전체 파싱 =====================
function parseCreditReport(text) {
  extractDebtorInfo(text);
  const sections = splitSections(text);

  const loanRows = parseLoanInfo(sections["대출정보"] || []);
  const judgmentRows = parseRegister(sections["신용도판단정보"] || []);
  const registerRows = parseRegister(sections["등록내용"] || []);
  const changeRows = parseCreditorChange(sections["채권자변동"] || []);
  const debtStatusRows = parseLoanInfo(sections["채무현황"] || []);

  const allRows = [
    ...loanRows,
    ...judgmentRows,
    ...registerRows,
    ...changeRows,
    ...debtStatusRows
  ];

  return postProcess(allRows);
}

// ===================== 렌더링 =====================
function renderTable(rows) {
  tableBody.innerHTML = "";
  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.creditor}</td>
      <td>${row.phone}</td>
      <td>${row.account}</td>
      <td>${row.loanType}</td>
      <td>${row.transfers}</td>
      <td>${row.repaid}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// ===================== 실행 버튼 =====================
parseBtn.addEventListener("click", async () => {
  if (!pdfInput.files || !pdfInput.files[0]) {
    alert("PDF 파일을 선택하세요.");
    return;
  }

  statusEl.textContent = "자료 수집 중...";

  const file = pdfInput.files[0];
  const text = await ocrPdf(file);

  const rows = parseCreditReport(text);
  _rows = rows;

  renderTable(rows);

  statusEl.textContent = `자료수집 완료 (총 ${rows.length}건)`;
});

// ===================== 엑셀 내보내기 =====================
exportExcelBtn.addEventListener("click", () => {
  if (!_rows.length) {
    alert("먼저 PDF를 분석하세요.");
    return;
  }

  const data = _rows.map(row => ({
    채권사: row.creditor,
    채권사전화번호: row.phone,
    계좌번호_사건번호: row.account,
    대출종류: row.loanType,
    양도양수이력: row.transfers,
    채무변제여부: row.repaid
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "채권현황");
  XLSX.writeFile(wb, "채권현황.xlsx");
});

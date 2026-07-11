// ocr.js — 화이트리스트 제거 + “문서 전체에서 실제 채권을 가진 기관” 직접 추출 버전

// ===================== 전역 =====================
let _rows = [];
let _debtorName = "";
let _debtorSSN = "";

const parseBtn = document.getElementById("parseBtn");
const pdfInput = document.getElementById("pdfFile");
const tableBody = document.querySelector("#debtTable tbody");
const statusEl = document.getElementById("status");
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
  // 부서명 제거 (지방법원, 자산관리대부, 대부캐피탈은 유지)
  s = s.replace(/(본점|본부|심사부|여신관리단|학자금대출부|대양|중앙회|본사)/g, "");
  return s;
}

function normalizeCreditor(name) {
  return normalize(name);
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
    else if (clean.includes("신용도판단정보 및 공공정보 변동분 조회")) current = "변동분";
    else if (clean.includes("신용도판단정보")) current = "신용도판단정보";
    else if (clean.includes("공공정보")) current = "공공정보";
    else if (clean.includes("채권자변동정보 조회서")) current = "채권자변동";
    else if (clean.includes("채무현황")) current = "채무현황";
    else if (clean.includes("등록내용")) current = "등록내용";

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
    const loanType = parts.find(p => p.includes("대출")) || "-";
    const creditor =
      parts.find(p =>
        p.match(/대부|재단|은행|금고|캐피탈/)
      ) || "";

    const nums = clean.match(/(\d{1,3}(,\d{3})*|\d+)/g);
    const amount = nums ? parseInt(nums[nums.length - 1].replace(/,/g, ""), 10) : 0;

    rows.push({
      section: "대출정보",
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

// ===================== 신용도판단정보/등록내용 파싱 =====================
function parseRegisterLike(lines, sectionName) {
  const rows = [];
  for (let line of lines) {
    const clean = line.replace(/\s+/g, " ").trim();
    if (!clean) continue;

    if (!clean.match(/대부|캐피탈|보험|금고|카드|지방법원|재단|장학재단|장학재단|장학재단/)) {
      continue;
    }

    const creditorMatch = clean.match(
      /([가-힣A-Za-z0-9]+대부|[가-힣A-Za-z0-9]+캐피탈|[가-힣A-Za-z0-9]+보험|[가-힣A-Za-z0-9]+금고|[가-힣A-Za-z0-9]+카드|[가-힣A-Za-z0-9]+지방법원|서울보증보험|한국장학재단|신용보증재단중앙회|농협은행)/
    );
    const creditor = creditorMatch ? creditorMatch[0] : "";

    const nums = clean.match(/(\d{1,3}(,\d{3})*|\d+)/g);
    const amount = nums ? parseInt(nums[nums.length - 1].replace(/,/g, ""), 10) : 0;

    let repaid = "미변제";
    if (clean.match(/해제|본인변제|소멸시효|면책결정/)) repaid = "해제됨";

    rows.push({
      section: sectionName,
      type: "등록",
      creditor,
      account: "-",
      loanType: "-",
      transfers: "-",
      repaid,
      amount
    });
  }
  return rows;
}

// ===================== 채권자변동정보 파싱 =====================
function parseCreditorChange(lines) {
  const rows = [];
  for (let line of lines) {
    const clean = line.replace(/\s+/g, " ").trim();
    if (!clean) continue;

    if (!clean.match(/대부|캐피탈|금고|카드|지방법원|재단|장학재단|서울보증보험|한국장학재단|신용보증재단중앙회|농협은행/)) {
      continue;
    }

    const creditorMatch = clean.match(
      /([가-힣A-Za-z0-9]+대부|[가-힣A-Za-z0-9]+캐피탈|[가-힣A-Za-z0-9]+금고|[가-힣A-Za-z0-9]+카드|[가-힣A-Za-z0-9]+지방법원|서울보증보험|한국장학재단|신용보증재단중앙회|농협은행)/
    );
    const creditor = creditorMatch ? creditorMatch[0] : "";

    let transfers = "-";
    if (clean.includes("양도") || clean.includes("매각")) transfers = clean;

    let repaid = "미변제";
    if (clean.match(/해제|본인변제|소멸시효|면책결정/)) repaid = "해제됨";

    const nums = clean.match(/(\d{1,3}(,\d{3})*|\d+)/g);
    const amount = nums ? parseInt(nums[nums.length - 1].replace(/,/g, ""), 10) : 0;

    rows.push({
      section: "채권자변동",
      type: "변동",
      creditor,
      account: "-",
      loanType: "-",
      transfers,
      repaid,
      amount
    });
  }
  return rows;
}

// ===================== alive 판정 =====================
function isAliveDebt(row) {
  // 제외 조건: 해제사유, 본인변제, 소멸시효, 면책결정 등
  const t = (row.transfers || "") + " " + (row.repaid || "");
  if (t.match(/해제|본인변제|소멸시효|면책결정/)) return false;

  // 공공정보만 있는 경우, 설명문/안내문은 위 파싱에서 이미 걸러짐
  return true;
}

// ===================== 기관명 수집 =====================
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

// ===================== 기관별 실제 채권 보유 여부 판정 =====================
function isAliveInstitution(inst, rows) {
  let alive = false;

  for (const r of rows) {
    const norm = normalizeCreditor(r.creditor);
    if (norm !== inst) continue;

    if (!isAliveDebt(r)) continue;

    // 살아있는 채권사 조건
    if (r.section === "대출정보" && r.amount > 0) alive = true;           // 대출정보에 금액
    if (r.section === "신용도판단정보" && r.amount > 0) alive = true;     // 신용도판단정보 연체금액
    if (r.section === "등록내용" && r.amount > 0) alive = true;           // 등록금액
    if (r.section === "채권자변동" && r.amount > 0) alive = true;         // 변제예정금액 등
    if (r.transfers && r.transfers.includes("양수") || r.transfers.includes("매각")) alive = true; // 양수/매각
    if (r.repaid === "미변제") alive = true;                               // 해제되지 않은 등록정보
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

    const phone = "-"; // 전화번호는 별도 매핑 필요 시 추가

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
  const judgmentRows = parseRegisterLike(sections["신용도판단정보"] || [], "신용도판단정보");
  const registerRows = parseRegisterLike(sections["등록내용"] || [], "등록내용");
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

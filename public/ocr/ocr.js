/****************************************************
 * PDF.js 설정
 ****************************************************/
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#debtTable tbody");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const flowContainer = document.getElementById("flowContainer");
const debtorInfoEl = document.getElementById("debtorInfo");

let _rows = [];
let _debtorName = "";
let _debtorSSN = "";
let WHITELIST = [];

function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

async function ocrPdf(file) {
  log("스캔본 OCR 시작...");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    log(`페이지 ${pageNum} 렌더링 중...`);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 5.5 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");

    const res = await fetch("https://us-central1-molawcounter.cloudfunctions.net/visionOCR", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 })
    });

    const result = await res.json();
    fullText += `\n=== PAGE ${pageNum} ===\n` + result.text;
  }

  log("OCR 완료");
  return fullText;
}

function extractDebtorInfo(text) {
  const nameMatch = text.match(/성명\(대표자\)\s*([가-힣]+)/);
  const ssnMatch = text.match(/주민등록번호\s*([0-9]{6}-[0-9]{7})/);

  _debtorName = nameMatch ? nameMatch[1] : "";
  _debtorSSN = ssnMatch ? ssnMatch[1] : "";
}

function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let matches = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) if (a[i] === b[i]) matches++;
  return matches / Math.max(a.length, b.length);
}

function normalize(str) {
  let s = str.replace(/\s+/g, "")
             .replace(/[^\w가-힣]/g, "");

  // 부서명/지점/본부/센터/관리단/총괄/공공정보/여신관리부 등 완전 제거
  s = s.replace(/(본점|본부|관리단|여신관리단|여신관리부|여신관리|영업부|센터|지점|총괄|공공정보|의정부여신|여신|관리부|본|통합)/g, "");

  // OCR 교정
  s = s.replace(/린딩에스/g, "리딩에이스");
  s = s.replace(/렉스스페셜에이/g, "웰릭스에프앤아이");

  return s;
}



function extractPhone(line) {
  const m = line.match(/\b(0\d{1,2}-\d{3,4}-\d{4}|1\d{3}-\d{4}|070-\d{4}-\d{4})\b/);
  return m ? m[0] : "-";
}

function extractFieldAfter(label, line) {
  const idx = line.indexOf(label);
  if (idx === -1) return "-";
  const part = line.slice(idx + label.length).trim();
  const m = part.match(/[:：]?\s*([가-힣A-Za-z0-9]+)/);
  return m ? m[1] : "-";
}

function buildCreditorWhitelist(text) {
  const lines = text.split(/\r?\n/);
  const freq = {};

  for (let raw of lines) {
    const clean = raw.replace(/\s+/g, "");

    if (!clean.match(/(대부|캐피탈|저축|은행|카드|보증|법원|재단|여신|금융|담보)/)) continue;

    const norm = normalize(clean);
    if (norm.length < 3) continue;

    freq[norm] = (freq[norm] || 0) + 1;
  }

  // 1) 등장 횟수 상위 후보군
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  // 2) 채권사 패턴 필터링
  const valid = sorted.filter(name =>
    name.match(/(대부|캐피탈|은행|보증재단|자산관리|지방법원|채권대부|에프앤아이대부)$/)
  );

  return valid;
}


function matchCreditor(line) {
  const norm = normalize(line);

  for (const w of WHITELIST) {
    const score = similarity(norm, normalize(w));
    if (score > 0.75) return w;
  }

  return null;
}

function splitSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = {};
  let current = "기타";
  let regCount = 0;

  for (const line of lines) {
    let l = line.trim().replace(/'/g, "");

    if (l.includes("대출정보")) current = "대출정보";

    else if (
      l.includes("등록내용") ||
      l.includes("등록내역") ||
      l.replace(/\s+/g, "") === "등록내용"
    ) {
      regCount++;
      current = `변동분${regCount}`;
    }

    else if (l.includes("공공정보") && !l.includes("신용도판단정보"))
      current = "공공정보";

    else if (l.includes("연체채권의 채권자 변동 현황"))
      current = "연체변동";

    if (!sections[current]) sections[current] = [];
    sections[current].push(l);
  }

  return sections;
}
function parseLoanInfo(lines) {
  const rows = [];

  for (let line of lines) {
    let clean = line.replace(/\s+/g, " ");

    const creditorName = matchCreditor(clean);
    if (!creditorName) continue;

    const amountMatch = clean.match(/(\d{1,3}(,\d{3})*|\d+)\s*$/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ""), 10) : 0;

    rows.push({
      creditor: creditorName,
      account: "-",
      type: "대출",
      amount,
      loanType: extractFieldAfter("구분", clean),
      transfers: "-",
      repaid: "미변제",
      releaseReason: null,
      phone: "-"
    });
  }

  return rows;
}

function parseJudgmentAndPublic(lines) {
  const rows = [];
  let currentCreditor = null;

  for (let line of lines) {
    let clean = line.replace(/\s+/g, " ");

    const matched = matchCreditor(clean);
    if (matched) {
      currentCreditor = matched;
      continue;
    }
    if (!currentCreditor) continue;

    const phone = "-";

    let type = null;
    if (clean.startsWith("등록")) type = "등록";
    else if (clean.startsWith("해제")) type = "해제";

    if (!type) {
      rows.push({
        creditor: currentCreditor,
        account: "-",
        type: "정보",
        amount: 0,
        loanType: extractFieldAfter("대출종류", clean),
        transfers: "-",
        repaid: "미변제",
        releaseReason: null,
        phone
      });
      continue;
    }

    const clean2 = clean.replace(/[^0-9A-Za-z]/g, "");
    const accountMatch = clean2.match(/[0-9A-Za-z]{6,20}/);
    const account = accountMatch ? accountMatch[0] : "-";

    const amountMatch = clean.match(/(\d{1,3}(,\d{3})*|\d+)\s*$/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ""), 10) : 0;

    let releaseReason = null;
    if (clean.includes("본인변제")) releaseReason = "본인변제";
    else if (clean.includes("회생계획인가결정")) releaseReason = "회생계획인가결정";
    else if (clean.includes("면책")) releaseReason = "면책";
    else if (clean.includes("기타")) releaseReason = "기타";

    rows.push({
      creditor: currentCreditor,
      account,
      type,
      amount,
      loanType: extractFieldAfter("대출종류", clean),
      transfers: "-",
      repaid: releaseReason ? "해제됨" : "미변제",
      releaseReason,
      phone
    });
  }

  return rows;
}

function parseArrearChange(lines) {
  const rows = [];
  let currentCreditor = null;

  for (let line of lines) {
    let clean = line.replace(/\s+/g, " ");

    const matched = matchCreditor(clean);
    if (matched) {
      currentCreditor = matched;
      continue;
    }
    if (!currentCreditor) continue;

    const phone = extractPhone(clean);

    const isArrear =
      clean.includes("양수채권") ||
      clean.includes("대위변제") ||
      clean.includes("일반대출") ||
      clean.includes("매각") ||
      clean.includes("담보");

    if (!isArrear) {
      rows.push({
        creditor: currentCreditor,
        account: "-",
        type: "정보",
        amount: 0,
        loanType: extractFieldAfter("채권구분", clean),
        transfers: "-",
        repaid: "미변제",
        releaseReason: null,
        phone
      });
      continue;
    }

    const principalMatch = clean.match(/(\d{1,3}(,\d{3})*|\d+)\s*$/);
    const principal = principalMatch ? parseInt(principalMatch[1].replace(/,/g, ""), 10) : 0;

    let transfers = [];
    if (clean.includes("매각")) transfers.push("매각");
    if (clean.includes("미양도")) transfers.push("미양도");
    if (clean.includes("개인회생")) transfers.push("개인회생");
    if (clean.includes("대위변제")) transfers.push("대위변제");
    if (clean.includes("담보")) transfers.push("담보");

    rows.push({
      creditor: currentCreditor,
      account: "-",
      type: "연체변동",
      amount: principal,
      loanType: extractFieldAfter("채권구분", clean),
      transfers: transfers.length ? transfers.join(" / ") : "-",
      repaid: "미변제",
      releaseReason: null,
      phone
    });
  }

  return rows;
}

function findBuyer(allRows, sellerCreditor) {
  return allRows.find(r =>
    r.creditor !== sellerCreditor &&
    r.loanType &&
    r.loanType.includes("양수채권")
  );
}

function isAliveDebt(row, allRows) {
  if (row.releaseReason) return false;
  if (row.amount === 0 && !row.loanType) return false;

  if (row.transfers && row.transfers.includes("미양도")) return true;

  if (row.transfers && row.transfers.includes("매각")) {
    const buyer = findBuyer(allRows, row.creditor);
    if (buyer) return true;
  }

  if (row.type === "대출") return true;

  const t = row.loanType || "";
  if (
    t.includes("양수채권") ||
    t.includes("일반대출") ||
    t.includes("신용카드채권") ||
    t.includes("대위변제") ||
    t.includes("대지급") ||
    t.includes("지급보증") ||
    t.includes("담보")
  ) return true;

  if (row.type === "등록" && !row.releaseReason) return true;

  return false;
}

function postProcess(rows) {
  const byKey = new Map();

  for (const row of rows) {
    const normCreditor = normalize(row.creditor);

    // 화이트리스트와 유사도 비교하여 유효 채권사인지 판정
    const isValid = WHITELIST.some(w => similarity(normCreditor, normalize(w)) > 0.75);
    if (!isValid) continue;

    // 실제 매칭되는 채권사 이름 찾기
    const creditor = WHITELIST.find(w => similarity(normCreditor, normalize(w)) > 0.75);

    const account = row.account || "-";
    const key = `${creditor}::${account}`;

    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push({ ...row, creditor });
  }

  const result = [];

  for (const [key, group] of byKey.entries()) {
    const [creditor, account] = key.split("::");

    const alive = group.some(r => isAliveDebt(r, rows));
    const repaid = alive ? "미변제" : "해제됨";

    const phoneRow = group.find(r => r.phone && r.phone !== "-");
    const phone = phoneRow ? phoneRow.phone : "-";

    const accountRow = group.find(r => r.type === "등록" && r.account !== "-");
    const finalAccount = accountRow ? accountRow.account : account;

    const loanTypeRow = group.find(r => r.loanType && r.loanType !== "-");
    const loanType = loanTypeRow ? loanTypeRow.loanType : "-";

    const transfers = group
      .map(r => r.transfers)
      .filter(t => t && t !== "-")
      .join(" / ") || "-";

    result.push({
      creditor,
      phone,
      account: finalAccount,
      loanType,
      transfers,
      repaid
    });
  }

  return result;
}



function parseCreditReport(text) {
  extractDebtorInfo(text);

  // 신규 문서에서도 자동 생성됨
  WHITELIST = buildCreditorWhitelist(text);

  const sections = splitSections(text);

  const loanRows = parseLoanInfo(sections["대출정보"] || []);
  const judgmentRows1 = parseJudgmentAndPublic(sections["변동분1"] || []);
  const judgmentRows2 = parseJudgmentAndPublic(sections["변동분2"] || []);
  const publicRows = parseJudgmentAndPublic(sections["공공정보"] || []);
  const arrearRows = parseArrearChange(sections["연체변동"] || []);

  const allRows = [
    ...loanRows,
    ...judgmentRows1,
    ...judgmentRows2,
    ...publicRows,
    ...arrearRows
  ];

  return postProcess(allRows);
}

parseBtn.addEventListener("click", async () => {
  const file = pdfInput.files && pdfInput.files[0];
  if (!file) {
    alert("PDF 파일을 선택하세요.");
    return;
  }

  tableBody.innerHTML = "";
  statusEl.textContent = "자료 수집 중...";

  let fullText = "";
  try {
    fullText = await ocrPdf(file);
  } catch (e) {
    statusEl.textContent = "OCR 오류: " + e.message;
    return;
  }

  const rows = parseCreditReport(fullText);
  _rows = rows;

  renderTable(rows);
  renderFlowMap(rows);
  renderPublicInfo(rows);
  renderDebtorInfo();

  statusEl.textContent = `자료수집이 완료되었습니다.(총 ${rows.length}건)`;
});

function renderTable(rows) {
  tableBody.innerHTML = "";

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.creditor}</td>
      <td><a href="tel:${row.phone}" class="phone-link">${row.phone}</a></td>
      <td>${row.account}</td>
      <td>${row.loanType}</td>
      <td>${row.transfers}</td>
      <td>${row.repaid}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderFlowMap(rows) {
  if (!flowContainer) return;
  flowContainer.innerHTML = "";

  rows.forEach(r => {
    if (r.transfers && r.transfers.includes("→")) {
      const div = document.createElement("div");
      div.className = "flow-item";
      div.innerHTML = `
        <span class="flow-creditor">${r.creditor}</span>
        <span class="flow-arrow">→</span>
        <span class="flow-target">${r.transfers.split("→")[1].trim()}</span>
        <span class="flow-account">(${r.account})</span>
      `;
      flowContainer.appendChild(div);
    }
  });
}

function renderPublicInfo(rows) {
  if (!flowContainer) return;

  const div = document.createElement("div");
  div.className = "public-info";
  div.style.marginTop = "20px";
  div.style.borderTop = "1px solid #ccc";
  div.style.paddingTop = "10px";

  const title = document.createElement("div");
  title.textContent = "공공정보";
  title.style.fontWeight = "bold";
  title.style.marginBottom = "8px";
  div.appendChild(title);

  rows.forEach(r => {
    if (r.type === "정보" && r.loanType === "-" && r.transfers === "-") {
      const item = document.createElement("div");
      item.textContent = `${r.creditor} / ${r.repaid}`;
      div.appendChild(item);
    }
  });

  flowContainer.appendChild(div);
}

function renderDebtorInfo() {
  if (!_debtorName || !_debtorSSN) return;

  debtorInfoEl.innerHTML = `
    <hr style="margin-top:20px;">
    <div style="margin-top:10px; font-weight:bold;">
      채무자명: ${_debtorName} (${_debtorSSN})
    </div>
  `;
}

exportExcelBtn.style.marginTop = "20px";

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

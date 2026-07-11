// ===================== ocr.js 최종본 =====================

// PDF.js 설정
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

// 로그
function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

// OCR
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

// 채무자 정보
function extractDebtorInfo(text) {
  const nameMatch = text.match(/성명\(대표자\)\s*([가-힣]+)/);
  const ssnMatch = text.match(/주민등록번호\s*([0-9]{6}-[0-9]{7})/);

  _debtorName = nameMatch ? nameMatch[1] : "";
  _debtorSSN = ssnMatch ? ssnMatch[1] : "";
}

// 정규화
function normalize(str) {
  let s = str.replace(/\s+/g, "")
             .replace(/[^가-힣A-Za-z0-9]/g, "");

  s = s.replace(/(본점|본부|심사부|여신관리단|학자금대출부|대양|중앙회|본사|신용분석팀|본부총괄|지점|센터)/g, "");

  s = s.replace(/린딩에스/g, "리딩에이스");
  s = s.replace(/렉스스페셜에이/g, "웰릭스에프앤아이");

  return s;
}

function normalizeCreditor(name) {
  return normalize(name);
}

// 전화번호
function extractPhone(line) {
  const m = line.match(/\b(0\d{1,2}-\d{3,4}-\d{4}|1\d{3}-\d{4}|070-\d{4}-\d{4})\b/);
  return m ? m[0] : "-";
}

// 기관명 자동 추출
function extractCreditorFromLine(line) {
  const m = line.match(
    /(국세청[가-힣]*세무서|[가-힣A-Za-z0-9]+지방법원|[가-힣A-Za-z0-9]+대부|[가-힣A-Za-z0-9]+캐피탈|[가-힣A-Za-z0-9]+카드|[가-힣A-Za-z0-9]+금고|[가-힣A-Za-z0-9]+은행|[가-힣A-Za-z0-9]+자산관리대부|[가-힣A-Za-z0-9]+자산관리|[가-힣A-Za-z0-9]+보증재단|서울보증보험|한국장학재단|신용보증기금|신용회복위원회)/
  );
  return m ? normalizeCreditor(m[0]) : null;
}

// 섹션 분리
function splitSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = {};
  let current = "기타";
  let regCount = 0;

  for (const line of lines) {
    let l = line.trim().replace(/'/g, "");

    if (l.includes("대출정보")) {
      current = "대출정보";
    } else if (
      l.includes("등록내용") ||
      l.includes("등록내역") ||
      l.includes("등록내역표") ||
      l.includes("등록내역조회") ||
      l.replace(/\s+/g, "") === "등록내용" ||
      l.replace(/\s+/g, "") === "등록내역" ||
      l.replace(/[☐\s]/g, "") === "등록내용" ||
      l.replace(/[☐\s]/g, "") === "등록내역"
    ) {
      regCount++;
      current = `변동분${regCount}`;
    } else if (l.includes("공공정보") && !l.includes("신용도판단정보")) {
      current = "공공정보";
    } else if (l.includes("연체채권의 채권자 변동 현황")) {
      current = "연체변동";
    }

    if (!sections[current]) sections[current] = [];
    sections[current].push(l);
  }

  return sections;
}

// 1) 대출정보
function parseLoanInfo(lines) {
  const rows = [];

  for (let line of lines) {
    let clean = line.replace(/\s+/g, " ").replace(/'/g, "");

    const creditorName = extractCreditorFromLine(clean);
    if (!creditorName) continue;

    const amountMatch = clean.match(/(\d{1,3}(,\d{3})*|\d+)\s*$/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ""), 10) : 0;

    rows.push({
      creditor: creditorName,
      account: "-",
      type: "대출",
      amount,
      transfers: "-",
      repaid: "미변제",
      releaseReason: null,
      phone: "-"
    });
  }

  return rows;
}

// 2) 등록/해제/공공정보
function parseJudgmentAndPublic(lines) {
  const rows = [];
  let currentCreditor = null;

  for (let line of lines) {
    let clean = line.replace(/\s+/g, " ").replace(/'/g, "");

    const matched = extractCreditorFromLine(clean);
    if (matched) {
      currentCreditor = matched;
      continue;
    }
    if (!currentCreditor) continue;

    const phone = "-";

    let type = null;
    if (clean.startsWith("등록")) type = "등록";
    else if (clean.startsWith("해제")) type = "해제";
    else if (clean.includes("공공정보")) type = "정보";

    if (!type) {
      rows.push({
        creditor: currentCreditor,
        account: "-",
        type: "정보",
        amount: 0,
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
      transfers: "-",
      repaid: releaseReason ? "해제됨" : "미변제",
      releaseReason,
      phone
    });
  }

  return rows;
}

// 3) 연체채권자 변동
function parseArrearChange(lines) {
  const rows = [];
  let currentCreditor = null;

  for (let line of lines) {
    let clean = line.replace(/\s+/g, " ").replace(/'/g, "");

    const matched = extractCreditorFromLine(clean);
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
      clean.includes("매각");

    if (!isArrear) {
      rows.push({
        creditor: currentCreditor,
        account: "-",
        type: "정보",
        amount: 0,
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
    if (clean.includes("양수채권")) transfers.push("양수채권");

    rows.push({
      creditor: currentCreditor,
      account: "-",
      type: "연체변동",
      amount: principal,
      transfers: transfers.length ? transfers.join(" / ") : "-",
      repaid: "미변제",
      releaseReason: null,
      phone
    });
  }

  return rows;
}

// 기관명 수집
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

// alive 판정
function isAliveInstitution(inst, rows) {
  let alive = false;

  for (const r of rows) {
    const norm = normalizeCreditor(r.creditor);
    if (norm !== inst) continue;

    // 양도인(매각한 기관) 제외
    if (r.transfers && r.transfers.includes("매각")) continue;

    // 해제된 채권 제외
    if (r.repaid === "해제됨") continue;
    if (r.releaseReason) continue;

    // 대출/등록/연체변동 금액 존재
    if (r.type === "대출" && r.amount > 0) alive = true;
    if (r.type === "등록" && r.amount > 0) alive = true;
    if (r.type === "연체변동" && r.amount > 0) alive = true;

    // 양수채권 / 대위변제
    if (r.transfers && r.transfers.includes("양수채권")) alive = true;
    if (r.transfers && r.transfers.includes("대위변제")) alive = true;
  }

  return alive;
}

// alive 기관 목록
function buildFinalCreditorList(rows) {
  const institutions = collectAllInstitutions(rows);
  return institutions.filter(inst => isAliveInstitution(inst, rows));
}

// postProcess
function postProcess(rows) {
  const aliveInstitutions = buildFinalCreditorList(rows);
  const result = [];

  for (const inst of aliveInstitutions) {
    const group = rows.filter(r => normalizeCreditor(r.creditor) === inst);

    const creditor = inst;
    const repaid = group.some(r => r.repaid === "미변제") ? "미변제" : "해제됨";

    const phone = group.find(r => r.phone && r.phone !== "-")?.phone || "-";
    const account = group.find(r => r.account && r.account !== "-")?.account || "-";
    const loanType = group.find(r => r.loanType && r.loanType !== "-")?.loanType || "-";

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

// 전체 파싱
function parseCreditReport(text) {
  extractDebtorInfo(text);

  const sections = splitSections(text);

  const loanRows = parseLoanInfo(sections["대출정보"] || []);

  const judgmentRows1 = parseJudgmentAndPublic(sections["변동분1"] || []);
  const judgmentRows2 = parseJudgmentAndPublic(sections["변동분2"] || []);
  const judgmentRows = [...judgmentRows1, ...judgmentRows2];

  const publicRows = parseJudgmentAndPublic(sections["공공정보"] || []);
  const arrearRows = parseArrearChange(sections["연체변동"] || []);

  const allRows = [...loanRows, ...judgmentRows, ...publicRows, ...arrearRows];
  return postProcess(allRows);
}

// 테이블 렌더링
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

// 흐름도 (지금은 필요 최소)
function renderFlowMap(rows) {
  if (!flowContainer) return;
  flowContainer.innerHTML = "";
}

// 공공정보 표시 (옵션)
function renderPublicInfo(rows) {
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

// 채무자 정보 표시
function renderDebtorInfo() {
  if (!_debtorName || !_debtorSSN) return;

  debtorInfoEl.innerHTML = `
    <hr style="margin-top:20px;">
    <div style="margin-top:10px; font-weight:bold;">
      채무자명: ${_debtorName} (${_debtorSSN})
    </div>
  `;
}

// 실행 버튼
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


// 엑셀 내보내기
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

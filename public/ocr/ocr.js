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

// 로그 출력
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

// 채무자명 + 주민번호 추출
function extractDebtorInfo(text) {
  const nameMatch = text.match(/성명\(대표자\)\s*([가-힣]+)/);
  const ssnMatch = text.match(/주민등록번호\s*([0-9]{6}-[0-9]{7})/);

  _debtorName = nameMatch ? nameMatch[1] : "";
  _debtorSSN = ssnMatch ? ssnMatch[1] : "";
}

// 문자열 유사도
function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let matches = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) if (a[i] === b[i]) matches++;
  return matches / Math.max(a.length, b.length);
}

// 정규화 (OCR 교정 포함)
function normalize(str) {
  let s = str.replace(/\s+/g, "")
             .replace(/[^가-힣A-Za-z0-9\[\]]/g, "")
             .replace(/본점/g, "");

  if (s.includes("[")) {
    s = s.replace(/\[/g, "").replace(/\]/g, "");
  }

  // OCR 교정
  s = s.replace(/린딩에스/g, "리딩에이스");
  s = s.replace(/렉스스페셜에이/g, "웰릭스에프앤아이");

  return s;
}

// 전화번호 추출
function extractPhone(line) {
  const m = line.match(/\b(0\d{1,2}-\d{3,4}-\d{4}|1\d{3}-\d{4}|070-\d{4}-\d{4})\b/);
  return m ? m[0] : "-";
}

// 특정 라벨 뒤 값 추출
function extractFieldAfter(label, line) {
  const idx = line.indexOf(label);
  if (idx === -1) return "-";
  const part = line.slice(idx + label.length).trim();
  const m = part.match(/[:：]?\s*([가-힣A-Za-z0-9]+)/);
  return m ? m[1] : "-";
}

// 채권사 매칭
function matchCreditor(line, CREDITORS) {
  const norm = normalize(line);
  let bestMatch = null;
  let bestScore = 0;

  for (const c of CREDITORS) {
    const score = similarity(norm, normalize(c));
    if (score > bestScore) {
      bestScore = score;
      bestMatch = c;
    }
  }

  // ★ 유사도 기준 강화 (핵심 수정)
  return bestScore > 0.85 ? bestMatch : null;
}


// 채권사 목록
const CREDITORS = [
  "우리카드","KB국민카드","신한카드","하나카드","현대카드",
  "삼성카드","롯데카드","비씨카드","기업은행카드","씨티은행카드",
  "부산은행카드","농협카드","경남은행카드",
  "하나은행","국민은행","우리은행","케이뱅크","한국씨티은행",
  "농협은행(본점)","기업은행","농협은행(지역)","농업협동조합자산관리",
  "농협은행 의정부여신관리단","우리은행 여신관리부","서산수산업협동조합",
  "전북은행","부산은행","경남은행","카카오뱅크","토스뱅크",
  "농협은행 경산여신관리단","새마을금고","페퍼저축은행",
  "상상인저축은행","웰컴저축은행","동원제일저축은행",
  "SBI저축은행","고려상호저축은행","예가람저축은행",
  "우리금융저축은행","다올저축은행","오케이저축은행",
  "키움저축은행","신한저축은행","엔에이치저축은행",
  "애큐온저축은행","한국투자저축은행","청주상호저축은행",
  "IBK저축은행","참저축은행",
  "농심캐피탈","제이엠캐피탈","오케이캐피탈","에이원대부캐피탈",
  "롯데캐피탈","KB캐피탈","비엔케이캐피탈","하나캐피탈(주)",
  "현대캐피탈(주)","우리금융캐피탈","한국투자캐피탈","한국캐피탈",
  "리딩에이스캐피탈","오케이캐피탈","아이엠캐피탈","에이원대부캐피탈",
  "리드코프","웰릭스에프앤아이대부",
  "아프로에프앤아이대부","한빛자산관리대부","베리타스자산대부",
  "애플자산관리대부","엠메이드대부","에이원자산대부관리",
  "아이앤유크레디트대부","제니스자산관리대부","한국에셋채권대부",
  "바리움홀딩스대부","와이케이대부","비케이자산관리대부",
  "희망1자산대부관리","엘하비스트대부","저스트인타임대부",
  "동양자산관리대부","우담자산관리대부","샤인캐피탈대부",
  "흥국생명","한화생명보험","케이디비생명보험",
  "서울보증보험","신용보증재단중앙회","서민금융진흥원",
  "소상공인시장진흥공단","신용보증기금",
  "국민행복기금","새도약기금","한국자산관리공사",
  "서울신용보증재단","경기신용보증재단","경북신용보증재단",
  "경남신용보증재단",
  "LGU+","SKT","KT","SK브로드밴드",
  "국세청","의정부지방법원",
  "한국장학재단","노란우산공제",
  "에스엠신용정보",
  "오리온에셀","소노스테이션","바로렌탈","엔에스텔레콤렌탈",
  "신용회복위원회"
];

/*  
───────────────────────────────────────────────
  섹션 분리 (변동분 인식 완전 수정)
───────────────────────────────────────────────
*/
function splitSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = {};
  let current = "기타";
  let regCount = 0;   // 등록내용 섹션 카운트

  for (const line of lines) {
    let l = line.trim().replace(/'/g, "");

    // 대출정보
    if (l.includes("대출정보")) {
      current = "대출정보";
    }

    // ★ 등록내용이 두 번 나오므로 각각 분리해야 한다
    else if (
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
    }


    // 공공정보
    else if (l.includes("공공정보") && !l.includes("신용도판단정보")) {
      current = "공공정보";
    }

    // 연체채권자 변동 현황
    else if (l.includes("연체채권의 채권자 변동 현황")) {
      current = "연체변동";
    }

    if (!sections[current]) sections[current] = [];
    sections[current].push(l);
  }

  return sections;
}


/*  
───────────────────────────────────────────────
  1) 신용정보조회서 → 대출정보 파싱
───────────────────────────────────────────────
*/
function parseLoanInfo(lines) {
  const rows = [];

  for (let line of lines) {
    let clean = line.replace(/\s+/g, " ").replace(/'/g, "");

    const creditorName = matchCreditor(clean, CREDITORS);
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

/*  
───────────────────────────────────────────────
  2) 변동분/공공정보 → 등록/해제/정보 파싱
───────────────────────────────────────────────
*/
function parseJudgmentAndPublic(lines) {
  const rows = [];
  let currentCreditor = null;

  for (let line of lines) {
    let clean = line.replace(/\s+/g, " ").replace(/'/g, "");

    const matched = matchCreditor(clean, CREDITORS);

    if (matched) {
      currentCreditor = matched;
      continue;
    }
    if (!currentCreditor) continue;

    const phone = "-";

    let type = null;
    if (clean.startsWith("등록")) type = "등록";
    else if (clean.startsWith("해제")) type = "해제";

    // 정보행
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

    // 계좌번호 정규식 강화
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

/*  
───────────────────────────────────────────────
  3) 연체채권자변동 → 채권구분 파싱
───────────────────────────────────────────────
*/
function parseArrearChange(lines) {
  const rows = [];
  let currentCreditor = null;

  for (let line of lines) {
    let clean = line.replace(/\s+/g, " ").replace(/'/g, "");

    const matched = matchCreditor(clean, CREDITORS);

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

/*  
───────────────────────────────────────────────
  히스토리 변환
───────────────────────────────────────────────
*/
function isFullyRepaid(group) {
  return group.some(r => r.releaseReason === "본인변제");
}

function findBuyer(allRows, sellerCreditor) {
  return allRows.find(r =>
    r.creditor !== sellerCreditor &&
    r.type === "연체변동"
  );
}

function convertTransferFormat(group, allRows) {
  const creditor = group[0].creditor;
  const transfers = group
    .map(r => r.transfers)
    .filter(Boolean)
    .filter(t => t !== "-");

  if (!transfers.length) return "-";

  return transfers
    .map(t => {
      if (t.includes("매각")) {
        const buyer = findBuyer(allRows, creditor);
        return buyer ? `${creditor} → ${buyer.creditor}` : `${creditor} → (매각)`;
      }
      if (t.includes("미양도")) return `${creditor} → (미양도)`;
      if (t.includes("대위변제")) return `${creditor} → (대위변제)`;
      if (t.includes("개인회생")) return `${creditor} → (개인회생)`;
      return `${creditor} → (${t})`;
    })
    .join(" / ");
}

/*  
───────────────────────────────────────────────
  postProcess — 대표 행 생성
───────────────────────────────────────────────
*/
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


function parseCreditReport(text) {
  extractDebtorInfo(text);

  const sections = splitSections(text);

  const loanRows = parseLoanInfo(sections["대출정보"] || []);

  // 🔥 변동분1 + 변동분2 모두 파싱
  const judgmentRows1 = parseJudgmentAndPublic(sections["변동분1"] || []);
  const judgmentRows2 = parseJudgmentAndPublic(sections["변동분2"] || []);
  const judgmentRows = [...judgmentRows1, ...judgmentRows2];

  const publicRows = parseJudgmentAndPublic(sections["공공정보"] || []);
  const arrearRows = parseArrearChange(sections["연체변동"] || []);

  const allRows = [...loanRows, ...judgmentRows, ...publicRows, ...arrearRows];
  return postProcess(allRows);
}


/*  
───────────────────────────────────────────────
  실행 버튼
───────────────────────────────────────────────
*/
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

/*  
───────────────────────────────────────────────
  테이블 렌더링
───────────────────────────────────────────────
*/
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

/*  
───────────────────────────────────────────────
  히스토리 흐름도
───────────────────────────────────────────────
*/
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

/*  
───────────────────────────────────────────────
  공공정보 표시 (히스토리 아래)
───────────────────────────────────────────────
*/
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

/*  
───────────────────────────────────────────────
  채무자명(주민번호) 표시
───────────────────────────────────────────────
*/
function renderDebtorInfo() {
  if (!_debtorName || !_debtorSSN) return;

  debtorInfoEl.innerHTML = `
    <hr style="margin-top:20px;">
    <div style="margin-top:10px; font-weight:bold;">
      채무자명: ${_debtorName} (${_debtorSSN})
    </div>
  `;
}

/*  
───────────────────────────────────────────────
  엑셀 내보내기
───────────────────────────────────────────────
*/
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

function normalizeCreditor(name) {
  let s = name.replace(/\s+/g, "")
              .replace(/[^가-힣A-Za-z0-9]/g, "");

  // 부서명 제거
  s = s.replace(/(본점|본부|심사부|여신관리단|학자금대출부|대양|중앙회|본사)/g, "");

  return s;
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

    // 제외 조건
    if (r.repaid === "해제됨") continue;
    if (r.releaseReason) continue;

    // 포함 조건
    if (r.amount > 0) alive = true;
    if (r.type === "대출" && r.amount > 0) alive = true;
    if (r.type === "등록" && r.amount > 0) alive = true;
    if (r.type === "연체변동" && r.amount > 0) alive = true;
    if (r.transfers && r.transfers.includes("양수")) alive = true;
    if (r.transfers && r.transfers.includes("매각")) alive = true;
    if (r.repaid === "미변제") alive = true;
  }

  return alive;
}

function buildFinalCreditorList(rows) {
  const institutions = collectAllInstitutions(rows);
  return institutions.filter(inst => isAliveInstitution(inst, rows));
}

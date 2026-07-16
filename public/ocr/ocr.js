// ===================== Document AI 통합본 (Cloud Functions 연동) =====================

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

// ===================== 로그 =====================
function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

// ===================== PDF → base64 =====================
async function pdfToBase64(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let pagesBase64 = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    log(`페이지 ${pageNum} 렌더링 중...`);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.5 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");

    pagesBase64.push(base64);
  }

  return pagesBase64;
}

// ===================== Cloud Functions(docAI) 호출 =====================
async function callDocumentAI(base64) {
  log("Cloud Functions(docAI) 호출 중...");

  const res = await fetch("https://us-central1-molawcounter.cloudfunctions.net/docAI", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64 })   // ⭐ 여기!
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`docAI 호출 실패: ${res.status} ${text}`);
  }

  const result = await res.json();
  return result.document;
}

// ===================== Document AI 응답 → rows 변환 =====================
function extractTables(document) {
  const tables = [];
  for (const page of document.pages || []) {
    for (const table of page.tables || []) {
      tables.push(table);
    }
  }
  return tables;
}

function cellText(cell) {
  if (cell.layout?.textAnchor?.content) {
    return cell.layout.textAnchor.content.trim();
  }
  if (cell.textAnchor?.content) {
    return cell.textAnchor.content.trim();
  }
  return "";
}

function detectSection(table) {
  const header = (table.headerRows || [])
    .flatMap(r => r.cells || [])
    .map(c => cellText(c))
    .join(" ");

  if (/연체|변동|연체변동/i.test(header)) return "연체변동";
  if (/등록|공공정보|신용정보/i.test(header)) return "등록";
  if (/대출|원리금|상환/i.test(header)) return "대출";
  if (/보증|서울보증|대위변제/i.test(header)) return "보증";

  return "기타";
}

function buildRowsFromDocumentAI(document) {
  const tables = extractTables(document);
  const rows = [];

  for (const table of tables) {
    const sectionType = detectSection(table);

    for (const row of table.bodyRows || []) {
      const cells = row.cells || [];
      const texts = cells.map(cellText);

      if (!texts.length) continue;

      rows.push({
        creditor: texts[0] || "",
        account: texts[1] || "-",
        loanType: texts[2] || "-",
        transfers: texts[3] || "-",
        repaid: texts[4] || "미변제",
        sectionType
      });
    }
  }

  return rows;
}

// ===================== alive 판정 =====================
function normalize(str) {
  return (str || "")
    .replace(/\s+/g, "")
    .replace(/[^가-힣A-Za-z0-9]/g, "")
    .trim();
}

function computeAlive(rows) {
  const byName = new Map();

  for (const r of rows) {
    const name = normalize(r.creditor);
    if (!name) continue;

    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(r);
  }

  const alive = [];

  for (const [name, list] of byName.entries()) {

    const hasLoanOrRegister = list.some(r =>
      r.sectionType === "대출" ||
      r.sectionType === "등록" ||
      r.sectionType === "보증"
    );

    const hasOnlyArrear = list.every(r => r.sectionType === "연체변동");

    const hasAcquisition = list.some(r =>
      (r.transfers || "").includes("양수") ||
      (r.transfers || "").includes("대위변제")
    );

    // 1) 연체변동만 있고, 양수/대위변제도 없으면 → 양도인 → 제외
    if (hasOnlyArrear && !hasLoanOrRegister && !hasAcquisition) {
      continue;
    }

    // 2) 나머지는 alive
    alive.push({
      creditor: name,
      rows: list
    });
  }

  return alive;
}

// ===================== 테이블 렌더링 =====================
function renderTable(alive) {
  tableBody.innerHTML = "";

  alive.forEach(item => {
    const r = item.rows[0];

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.creditor}</td>
      <td>-</td>
      <td>${r.account}</td>
      <td>${r.loanType}</td>
      <td>${r.transfers}</td>
      <td>${r.repaid}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// ===================== 실행 =====================
parseBtn.addEventListener("click", async () => {
  const file = pdfInput.files?.[0];
  if (!file) {
    alert("PDF 파일을 선택하세요.");
    return;
  }

  statusEl.textContent = "PDF 처리 중...";

  try {
    const base64 = await fileToBase64(file);   // ⭐ PDF 원본 그대로 base64
    const document = await callDocumentAI(base64);
    const rows = buildRowsFromDocumentAI(document);
    const alive = computeAlive(rows);

    _rows = alive;

    renderTable(alive);
    statusEl.textContent = `완료 (${alive.length}개 채권사)`;
  } catch (e) {
    console.error(e);
    statusEl.textContent = "오류: " + e.message;
  }
});


function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===================== 엑셀 내보내기 =====================
exportExcelBtn.addEventListener("click", () => {
  if (!_rows.length) {
    alert("먼저 PDF를 분석하세요.");
    return;
  }

  const data = _rows.map(item => {
    const r = item.rows[0];
    return {
      채권사: item.creditor,
      계좌번호: r.account,
      대출종류: r.loanType,
      양도양수이력: r.transfers,
      채무변제여부: r.repaid
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "채권현황");
  XLSX.writeFile(wb, "채권현황.xlsx");
});

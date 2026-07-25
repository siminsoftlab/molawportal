// ocr.js
import { matchCreditors } from "/ocr/creditorMatcher.js";

/* ===================== PDF.js 설정 ===================== */
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#debtTable tbody");
const exportExcelBtn = document.getElementById("exportExcelBtn");

let _rows = [];   // alive creditors

/* ===================== 로그 ===================== */
function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

/* ===================== PDF → base64 ===================== */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ===================== Cloud Functions(docAI2) 호출 ===================== */
async function callDocumentAI(base64) {
  log("docAI2 호출 중...");

  const res = await fetch("https://us-central1-molawcounter.cloudfunctions.net/docAI2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64 })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`docAI 호출 실패: ${res.status} ${text}`);
  }

  return await res.json();   // { text, entities }
}

/* ===================== 테이블 렌더링 ===================== */
function renderTable(alive) {
  tableBody.innerHTML = "";

  alive.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.creditor_id || "-"}</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
    `;
    tableBody.appendChild(tr);
  });
}

/* ===================== 실행 ===================== */
parseBtn.addEventListener("click", async () => {
  const file = pdfInput.files?.[0];
  if (!file) {
    alert("PDF 파일을 선택하세요.");
    return;
  }

  statusEl.textContent = "PDF 처리 중...";

  try {
    const base64 = await fileToBase64(file);
    const { text } = await callDocumentAI(base64);

    const debtorId = "user123"; // 로그인 사용자 UID로 변경 가능
    const aliveCreditors = await matchCreditors(text, debtorId);

    _rows = aliveCreditors;

    renderTable(aliveCreditors);
    statusEl.textContent = `완료 (${aliveCreditors.length}개 채권사)`;
  } catch (e) {
    console.error(e);
    statusEl.textContent = "오류: " + e.message;
  }
});

/* ===================== 엑셀 내보내기 ===================== */
exportExcelBtn.addEventListener("click", () => {
  if (!_rows.length) {
    alert("먼저 PDF를 분석하세요.");
    return;
  }

  const data = _rows.map(item => ({
    채권사: item.name,
    채권사ID: item.creditor_id,
    계좌번호: "-",
    대출종류: "-",
    양도양수이력: "-",
    채무변제여부: "-"
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "채권현황");
  XLSX.writeFile(wb, "채권현황.xlsx");
});

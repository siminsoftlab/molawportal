// PDF.js 설정
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#debtTable tbody");
const exportExcelBtn = document.getElementById("exportExcelBtn");

let parsedRows = [];

/* ---------------------------------------------------------
   OCR 함수 (속도 최적화 버전)
--------------------------------------------------------- */
async function ocrPage(page) {
  const viewport = page.getViewport({ scale: 1 }); // 속도 개선
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;

  // 표 영역만 OCR (상단/하단 제외)
  const cropCanvas = document.createElement("canvas");
  const cropCtx = cropCanvas.getContext("2d");

  const cropY = viewport.height * 0.20;
  const cropHeight = viewport.height * 0.60;

  cropCanvas.width = viewport.width;
  cropCanvas.height = cropHeight;

  cropCtx.drawImage(
    canvas,
    0, cropY, viewport.width, cropHeight,
    0, 0, viewport.width, cropHeight
  );

  // OCR 타임아웃 설정
  const ocrTimeout = ms =>
    new Promise((_, reject) => setTimeout(() => reject("OCR TIMEOUT"), ms));

  const result = await Promise.race([
    Tesseract.recognize(cropCanvas, "eng", {
      logger: () => {} // 로그 비활성화
    }),
    ocrTimeout(15000) // 15초 제한
  ]);

  return result.data.text;
}

/* ---------------------------------------------------------
   PDF → OCR → 텍스트 추출
--------------------------------------------------------- */
parseBtn.addEventListener("click", async () => {
  const file = pdfInput.files[0];
  if (!file) {
    alert("PDF 파일을 먼저 업로드하세요.");
    return;
  }

  statusEl.textContent = "PDF 페이지 렌더링 및 OCR 중... (최대 15초)";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const pageText = await ocrPage(page);
      fullText += "\n" + pageText;
    }

    console.log("OCR 결과:", fullText);

    statusEl.textContent = "OCR 완료. 채권자변동정보 분석 중...";

    const debts = parseFromDocumentText(fullText);
    parsedRows = buildRowsForTable(debts);

    renderTable(parsedRows);

    statusEl.textContent = `완료: 표가 생성되었습니다. (총 ${parsedRows.length}건)`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "오류 발생: OCR 중단됨 (타임아웃 또는 렌더링 실패)";
  }
});

/* ---------------------------------------------------------
   OCR 텍스트 파싱 (신용정보원 패턴 기반)
--------------------------------------------------------- */
function parseFromDocumentText(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);

  const rows = [];

  lines.forEach(line => {
    // 신용정보원 패턴 감지
    if (
      line.includes("양수채권") ||
      line.includes("일반대출") ||
      line.includes("대위변제") ||
      line.includes("대지급")
    ) {
      const parts = line.split(/\s+/);

      const creditor = parts[0];
      const type = parts.find(p => p.includes("채권"));
      const date = parts.find(p => p.match(/\d{4}\.\d{2}\.\d{2}/));
      const account = parts.find(p => p.match(/^[A-Za-z0-9]+$/));
      const principal = parts.find(p => p.match(/^[\d,]+$/));

      rows.push({
        creditor,
        account: account || "",
        transfers: [type],
        repaid: false
      });
    }
  });

  return rows;
}

/* ---------------------------------------------------------
   테이블용 데이터 구성
--------------------------------------------------------- */
function buildRowsForTable(debts) {
  return debts.map(d => ({
    creditor: d.creditor,
    account: d.account,
    transfers: d.transfers,
    repaid: d.repaid
  }));
}

/* ---------------------------------------------------------
   HTML 테이블 렌더링
--------------------------------------------------------- */
function renderTable(rows) {
  tableBody.innerHTML = "";

  rows.forEach(row => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.creditor}</td>
      <td>${row.account}</td>
      <td>${row.transfers.join("<br>")}</td>
      <td>${row.repaid ? "변제됨" : "미변제"}</td>
    `;

    tableBody.appendChild(tr);
  });
}

/* ---------------------------------------------------------
   엑셀(xlsx) 내보내기
--------------------------------------------------------- */
exportExcelBtn.addEventListener("click", () => {
  if (!parsedRows.length) {
    alert("먼저 PDF를 분석하세요.");
    return;
  }

  const data = parsedRows.map(row => ({
    채권사: row.creditor,
    계좌번호: row.account,
    양도양수이력: row.transfers.join(" / "),
    채무변제여부: row.repaid ? "변제됨" : "미변제"
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "채권현황");

  XLSX.writeFile(wb, "채권현황.xlsx");
});

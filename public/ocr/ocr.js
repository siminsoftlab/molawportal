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
   PDF 또는 이미지 → OCR 처리 (debt.js 방식 그대로)
--------------------------------------------------------- */
async function runOCR(file) {
  // PDF 처리
  if (file.type === "application/pdf") {
    const pdfArrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // debt.js와 동일한 방식: PDF 페이지를 이미지로 렌더링
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const imageUrl = canvas.toDataURL("image/png");

      // OCR 실행
      const result = await Tesseract.recognize(imageUrl, "kor+eng", {
        logger: m => console.log(m), // debt.js와 동일
      });

      fullText += result.data.text + "\n";
    }

    return fullText;
  }

  // 이미지 처리
  if (file.type.startsWith("image/")) {
    const imageUrl = URL.createObjectURL(file);

    const result = await Tesseract.recognize(imageUrl, "kor+eng", {
      logger: m => console.log(m),
    });

    return result.data.text;
  }

  throw new Error("지원하지 않는 파일 형식입니다.");
}

/* ---------------------------------------------------------
   버튼 클릭 → OCR → 파싱 → 표 생성
--------------------------------------------------------- */
parseBtn.addEventListener("click", async () => {
  const file = pdfInput.files[0];
  if (!file) {
    alert("PDF 또는 이미지 파일을 업로드하세요.");
    return;
  }

  statusEl.textContent = "OCR 처리 중... (잠시만 기다려주세요)";

  try {
    const fullText = await runOCR(file);

    console.log("OCR 결과:", fullText);

    const debts = parseFromOCR(fullText);
    parsedRows = debts;

    renderTable(parsedRows);

    statusEl.textContent = `완료: 표가 생성되었습니다. (총 ${parsedRows.length}건)`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "OCR 실패";
  }
});

/* ---------------------------------------------------------
   OCR 텍스트 파싱 (신용정보원 패턴 기반)
--------------------------------------------------------- */
function parseFromOCR(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const rows = [];

  lines.forEach(line => {
    // 신용정보원에서 실제로 나오는 패턴 기반
    if (
      line.includes("은행") ||
      line.includes("카드") ||
      line.includes("저축은행") ||
      line.includes("캐피탈") ||
      line.includes("대부")
    ) {
      const accountMatch = line.match(/\d{6,}/); // 계좌번호/사건번호
      const account = accountMatch ? accountMatch[0] : "-";

      const transfer =
        line.includes("양수") || line.includes("양도")
          ? "양도/양수 있음"
          : "-";

      const repaid =
        line.includes("면책") ||
        line.includes("회생") ||
        line.includes("변제")
          ? "변제됨"
          : "미변제";

      rows.push({
        creditor: line,
        account,
        transfers: transfer,
        repaid,
      });
    }
  });

  return rows;
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
      <td>${row.transfers}</td>
      <td>${row.repaid}</td>
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
    양도양수이력: row.transfers,
    채무변제여부: row.repaid
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "채권현황");

  XLSX.writeFile(wb, "채권현황.xlsx");
});

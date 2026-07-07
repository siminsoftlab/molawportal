// PDF.js 설정
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#debtTable tbody");
const exportExcelBtn = document.getElementById("exportExcelBtn");

let parsedRows = [];

// OCR 함수
async function ocrPage(page) {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;

  const result = await Tesseract.recognize(canvas, "kor+eng", {
    logger: m => console.log(m)
  });

  return result.data.text;
}

parseBtn.addEventListener("click", async () => {
  const file = pdfInput.files[0];
  if (!file) {
    alert("PDF 파일을 먼저 업로드하세요.");
    return;
  }

  statusEl.textContent = "PDF 페이지 렌더링 및 OCR 중... (시간이 조금 걸립니다)";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const pageText = await ocrPage(page); // ← OCR로 텍스트 추출
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
    statusEl.textContent = "오류 발생: 콘솔을 확인하세요.";
  }
});

// OCR 텍스트 파싱
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

// 테이블 구성
function buildRowsForTable(debts) {
  return debts.map(d => ({
    creditor: d.creditor,
    account: d.account,
    transfers: d.transfers,
    repaid: d.repaid
  }));
}

// 테이블 렌더링
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

// 엑셀(xlsx) 내보내기
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

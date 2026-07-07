// =========================
// 기본 DOM 요소
// =========================
const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#debtTable tbody");
const exportExcelBtn = document.getElementById("exportExcelBtn");

// PDF.js 워커 설정
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

let _rows = []; // 엑셀용 저장

function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

// =========================
// PDF OCR (고해상도 + 전처리)
// =========================
async function ocrPdf(file) {
  log("PDF OCR 시작...");
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    log(`페이지 ${pageNum} OCR 중...`);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 3.5 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // 흑백 전처리
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i+1] + data[i+2]) / 3;
      const v = avg > 150 ? 255 : 0;
      data[i] = data[i+1] = data[i+2] = v;
    }
    ctx.putImageData(img, 0, 0);

    const dataUrl = canvas.toDataURL("image/png");

    const { data: { text } } = await Tesseract.recognize(dataUrl, "kor+eng", {
      tessedit_pageseg_mode: 6,
      logger: m => log(`p${pageNum} 진행률: ${Math.round(m.progress * 100)}%`)
    });

    fullText += text + "\n";
  }

  log("PDF OCR 완료");
  return fullText;
}

// =========================
// ⭐ 신용정보원 전용 파서
// =========================
function parseCreditReport(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = [];

  for (const line of lines) {
    const clean = line.replace(/\s+/g, " ");

    // 사건번호 (5자리)
    const caseMatch = clean.match(/\b\d{5}\b/);
    const caseNum = caseMatch ? caseMatch[0] : "-";

    // 계좌번호 (6자리 이상)
    const accountMatch = clean.match(/\d{6,}/);
    const account = accountMatch ? accountMatch[0] : caseNum;

    // 채권사 추출
    let creditor = "-";
    if (clean.includes("공공 정보")) {
      creditor = clean.split("공공 정보")[1]?.trim() || "공공 정보";
    } else {
      creditor = clean.split(" " )[0];
    }

    // 양도/양수 여부
    const transfer =
      clean.includes("양도") || clean.includes("양수") || clean.includes("채권자변동")
        ? "양도/양수 있음"
        : "-";

    // 변제 여부
    const repaid =
      clean.includes("해제") || clean.includes("면책") || clean.includes("회생")
        ? "변제됨"
        : "미변제";

    // 실제 표에 들어갈 구조
    rows.push({
      creditor,
      account,
      transfers: transfer,
      repaid
    });
  }

  return rows;
}

// =========================
// 버튼 클릭 → OCR → 파싱 → 표 생성
// =========================
parseBtn.addEventListener("click", async () => {
  const file = pdfInput.files && pdfInput.files[0];
  if (!file) {
    alert("PDF 파일을 선택하세요.");
    return;
  }

  tableBody.innerHTML = "";
  statusEl.textContent = "OCR 처리 중...";

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

  statusEl.textContent = `완료: 표가 생성되었습니다. (총 ${rows.length}건)`;
});

// =========================
// 테이블 렌더링
// =========================
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

// =========================
// 엑셀(xlsx) 내보내기
// =========================
exportExcelBtn.addEventListener("click", () => {
  if (!_rows.length) {
    alert("먼저 PDF를 분석하세요.");
    return;
  }

  const data = _rows.map(row => ({
    채권사: row.creditor,
    계좌번호_사건번호: row.account,
    양도양수이력: row.transfers,
    채무변제여부: row.repaid
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "채권현황");

  XLSX.writeFile(wb, "채권현황.xlsx");
});

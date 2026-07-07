// =========================
// DOM 요소
// =========================
const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#debtTable tbody");
const exportExcelBtn = document.getElementById("exportExcelBtn");

// =========================
// 채권사 화이트리스트
// =========================
const creditorWhitelist = [
  "농협은행 의정부여신관리단",
  "농협은행",
  "리딩에이스캐피탈",
  "한빛자산관리대부",
  "제니스자산관리대부",
  "헬릭스에프앤아이대부",
  "한국자산관리공사",
  "우리카드",
  "우리은행",
  "현대캐피탈",
  "경기신용보증재단",
  "의정부지방법원",
  // 필요하면 계속 추가
];

// =========================
// 상태 저장
// =========================
let _rows = [];

function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

// =========================
// PDF.js 설정
// =========================
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

// =========================
// OCR로 PDF 텍스트 추출
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
    const viewport = page.getViewport({ scale: 5.0 }); // 해상도 올림

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // 흑백 전처리 (조금 더 강하게)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i+1] + data[i+2]) / 3;
      const v = avg > 160 ? 255 : 0;
      data[i] = data[i+1] = data[i+2] = v;
    }
    ctx.putImageData(img, 0, 0);

    const dataUrl = canvas.toDataURL("image/png");

    const { data: { text } } = await Tesseract.recognize(dataUrl, "kor+eng", {
      logger: m => log(`p${pageNum} 진행률: ${Math.round(m.progress * 100)}%`)
    });

    fullText += text + "\n";
  }

  log("PDF OCR 완료");
  console.log(fullText); // 실제 OCR 결과 확인용
  return fullText;
}

// =========================
// 문자열 유사도 계산
// =========================
function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();

  let matches = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) matches++;
  }

  return matches / Math.max(a.length, b.length);
}

function normalize(str) {
  return str.replace(/\s+/g, "").replace(/[^가-힣A-Za-z0-9]/g, "");
}

// =========================
// 신용정보원 전용 파서 (지금 OCR 텍스트에 맞춰 튜닝)
// =========================
function parseCreditReport(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = [];

  let current = null;

  for (let line of lines) {
    const clean = line.replace(/\s+/g, " ");
    const normLine = normalize(clean);

    // 1) 유사도 기반 채권사 매칭
    let bestMatch = null;
    let bestScore = 0;

    for (let i = 0; i < creditorWhitelist.length; i++) {
      const score = similarity(normLine, normalize(creditorWhitelist[i]));
      if (score > bestScore) {
        bestScore = score;
        bestMatch = creditorWhitelist[i];
      }
    }

    // 유사도 0.5 이상이면 채권사로 인정
    if (bestScore > 0.5) {
      if (current) rows.push(current);

      current = {
        creditor: bestMatch,
        account: "-",
        transfers: "-",
        repaid: "미변제"
      };
      continue;
    }

    if (!current) continue;

    // 2) 계좌번호/사건번호/대출정보 추출
    //   - 숫자 6자리 이상
    //   - 또는 "신 용 대 출 ..." 같은 라인
    let accountMatch =
      clean.match(/\d{6,}/) ||
      clean.match(/\b\d{5}\b/) ||
      clean.match(/\d{4}\.\d{2}\.\d{2}/);

    if (!accountMatch && clean.includes("신 용 대 출")) {
      accountMatch = [clean];
    }

    if (accountMatch && current.account === "-") {
      current.account = accountMatch[0];
    }

    // 3) 양도/양수 이력
    if (
      clean.includes("양수채권") ||
      clean.includes("양수") ||
      clean.includes("양도") ||
      clean.includes("채권자변동") ||
      clean.includes("매각")
    ) {
      current.transfers = clean;
    }

    // 4) 변제 여부
    if (
      clean.includes("해제됨") ||
      clean.includes("해제") ||
      clean.includes("면책") ||
      clean.includes("회생") ||
      clean.includes("인가")
    ) {
      current.repaid = "해제됨";
    }
  }

  if (current) rows.push(current);

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
    console.log(fullText);   // ★ OCR 결과 확인용
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
// 엑셀 내보내기
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

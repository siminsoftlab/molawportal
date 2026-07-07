// =========================
// PDF.js 설정
// =========================
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#debtTable tbody");
const exportExcelBtn = document.getElementById("exportExcelBtn");

let _rows = [];

function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

// =========================
// 스캔본 PDF → 이미지 → 전처리 → OCR
// =========================
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
    const viewport = page.getViewport({ scale: 5.5 }); // 스캔본은 고해상도 필수

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // 이미지 데이터 가져오기
    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // -------------------------
    // OpenCV 전처리
    // -------------------------
    let src = cv.matFromImageData(imgData);
    let gray = new cv.Mat();
    let thresh = new cv.Mat();
    let denoise = new cv.Mat();
    let morph = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    // adaptive threshold (스캔본 필수)
    cv.adaptiveThreshold(
      gray,
      thresh,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      35,
      15
    );

    // 노이즈 제거
    cv.bilateralFilter(thresh, denoise, 9, 75, 75);

    // 글자 붙이기
    let kernel = cv.Mat.ones(2, 2, cv.CV_8U);
    cv.dilate(denoise, morph, kernel);

    // 최종 이미지
    cv.imshow(canvas, morph);

    // -------------------------
    // OCR 실행
    // -------------------------
    const dataUrl = canvas.toDataURL("image/png");

    const { data: { text } } = await Tesseract.recognize(dataUrl, "kor+eng", {
      logger: m => log(`OCR 진행률: ${Math.round(m.progress * 100)}%`)
    });

    fullText += text + "\n";

    // 메모리 해제
    src.delete(); gray.delete(); thresh.delete();
    denoise.delete(); morph.delete(); kernel.delete();
  }

  log("OCR 완료");
  console.log(fullText);
  return fullText;
}

// =========================
// 문자열 유사도
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
// 채권사 파싱 (스캔본 전용)
// =========================
function parseCreditReport(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = [];

  const creditors = [
    "우리카드","케이비국민카드","신한카드","하나카드","현대카드",
  "삼성카드","롯데카드","비씨카드","기업은행","씨티은행",
  "농협은행","농협은행 의정부여신관리단","농업협동조합자산관리",
  "전북은행","부산은행","경남은행","카카오뱅크","토스뱅크",
  "상상인저축은행","웰컴저축은행","동원제일저축은행",
  "에스비아이저축은행","고려저축은행","예가람저축은행",
  "우리금융저축은행","다올저축은행","오케이저축은행",
  "키움저축은행","신한저축은행","엔에이치저축은행",
  "롯데캐피탈","케이비캐피탈","비엔케이캐피탈","하나캐피탈",
  "현대캐피탈","우리금융캐피탈","한국투자캐피탈",
  "리딩에이스캐피탈",
  "리드코프","웰릭스에프앤아이대부","아프로에프앤아이대부",
  "한빛자산관리대부","베리타스자산대부","애플자산관리대부",
  "엠메이드대부","에이원자산대부관리","아이앤유크레디트대부",
  "제니스자산관리대부","한국에셋채권대부",
  "고려신용정보","흥국생명보험","서울보증보험",
  "서민금융진흥원","소상공인시장진흥공단","신용보증기금",
  "국민행복기금","새도약기금","한국자산관리공사",
  "서울신용보증재단","경기신용보증재단","경북신용보증재단",
  "경남신용보증재단",
  "LGU+","SKT","KT","SK브로드밴드"
  ];

  let current = null;

  for (let line of lines) {
    const clean = line.replace(/\s+/g, " ");
    const norm = normalize(clean);

    // 유사도 기반 채권사 매칭
    let bestMatch = null;
    let bestScore = 0;

    for (let c of creditors) {
      const score = similarity(norm, normalize(c));
      if (score > bestScore) {
        bestScore = score;
        bestMatch = c;
      }
    }

    if (bestScore > 0.55) {
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

    // 계좌번호 / 사건번호
    const accountMatch =
      clean.match(/\d{6,}/) ||
      clean.match(/[A-Z]\d{6,}/);

    if (accountMatch && current.account === "-") {
      current.account = accountMatch[0];
    }

    // 양도/양수
    if (clean.includes("양수") || clean.includes("양도")) {
      current.transfers = clean;
    }

    // 변제 여부
    if (clean.includes("해제") || clean.includes("면책") || clean.includes("회생")) {
      current.repaid = "해제됨";
    }
  }

  if (current) rows.push(current);

  return rows;
}

// =========================
// 실행
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

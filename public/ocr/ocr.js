// =========================
// 기본 DOM 요소
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
  // 카드사
  "우리카드","케이비국민카드","신한카드","하나카드","현대카드",
  "삼성카드","롯데카드","비씨카드","기업은행(카드)","씨티은행(카드)",
  "농협은행(카드)",

  // 은행
  "수협은행","카카오뱅크","신한은행","토스뱅크","하나은행",
  "국민은행","우리은행","케이뱅크","한국씨티은행",
  "농협은행(본점)","농협은행(지역)","농협은행 의정부여신관리단",
  "농업협동조합자산관리","서산수산업협동조합",
  "전북은행","부산은행","경남은행",

  // 저축은행
  "상상인저축은행","웰컴저축은행","동원제일저축은행",
  "에스비아이저축은행","고려저축은행","예가람저축은행",
  "우리금융저축은행","다올저축은행","오케이저축은행",
  "키움저축은행","에이치비저축은행","신한저축은행",
  "키움에스저축은행","엔에이치저축은행",

  // 캐피탈
  "롯데캐피탈","케이비캐피탈","비엔케이캐피탈","하나캐피탈",
  "현대캐피탈","우리금융캐피탈","한국투자캐피탈",
  "리딩에이스캐피탈",

  // 대부 / 자산관리
  "리드코프","웰릭스에프앤아이대부","아프로에프앤아이대부",
  "한빛자산관리대부","안전대부","케이알앤씨","베리타스자산대부",
  "애플자산관리대부","엠메이드대부","에이원자산대부관리",
  "아이앤유크레디트대부","제니스자산관리대부",
  "한국에셋채권대부",

  // 보험 / 신용정보
  "고려신용정보","흥국생명보험","서울보증보험",

  // 공공기관 / 보증기관
  "서민금융진흥원","소상공인시장진흥공단","신용보증기금",
  "국민행복기금","새도약기금","한국자산관리공사",
  "서울신용보증재단","경기신용보증재단","경북신용보증재단",
  "경남신용보증재단",

  // 통신 / 렌탈 / 기타
  "LGU+","SKT","KT","SK브로드밴드",
  "오리온에셀","소노스테이션","바로렌탈",
  "엔에스텔레콤렌탈","오토핸즈",

  // 기존 금융 키워드
  "은행","캐피탈","대부","저축은행","자산관리",
  "공공 정보","법원"
];

// =========================
// PDF.js 워커 설정
// =========================
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
// ⭐ 신용정보원 전용 파서 (화이트리스트 적용)
// =========================
function parseCreditReport(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const rows = [];

  // OCR 오타 대비: 문자열 정규화 함수
  function normalize(str) {
    return str
      .replace(/\s+/g, "")     // 모든 띄어쓰기 제거
      .replace(/[^가-힣A-Za-z0-9]/g, ""); // 특수문자 제거
  }

  const normalizedWhitelist = creditorWhitelist.map(normalize);

  for (let line of lines) {
    if (!line) continue;

    // 쓰레기 OCR 제거
    if (line.length <= 2) continue;
    if (/^[^A-Za-z0-9가-힣]+$/.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    if (line.match(/[ㄱ-ㅎㅏ-ㅣ]/g)?.length > 3) continue;

    const clean = line.replace(/\s+/g, " ");
    const normLine = normalize(clean);

    // ⭐ 유사도 기반 채권사 감지 (부분 일치 + 띄어쓰기 제거)
    let matchedCreditor = null;

    normalizedWhitelist.forEach((normCreditor, idx) => {
      if (normLine.includes(normCreditor)) {
        matchedCreditor = creditorWhitelist[idx];
      }
    });

    if (!matchedCreditor) continue;

    const creditor = matchedCreditor;

    // 사건번호(5자리)
    const caseMatch = clean.match(/\b\d{5}\b/);
    const caseNum = caseMatch ? caseMatch[0] : "-";

    // 계좌번호(6자리 이상)
    const accountMatch = clean.match(/\d{6,}/);
    const account = accountMatch ? accountMatch[0] : caseNum;

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

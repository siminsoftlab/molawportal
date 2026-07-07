// =========================
// 기본 DOM 요소 (ocr.html 기준)
// =========================
const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#debtTable tbody");
const exportExcelBtn = document.getElementById("exportExcelBtn");

// PDF.js 워커 설정
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

let _creditors = []; // 엑셀 내보내기용

function log(msg) {
  console.log(msg);
  statusEl.textContent = msg;
}

// =========================
// 이미지 OCR
// =========================
async function ocrImage(file) {
  log("이미지 OCR 시작...");
  const url = URL.createObjectURL(file);
  const { data: { text } } = await Tesseract.recognize(url, "kor+eng");
  URL.revokeObjectURL(url);
  log("이미지 OCR 완료");
  return text;
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
    const viewport = page.getViewport({ scale: 3.5 }); // 고해상도

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // 흑백 + 대비 강화
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const v = avg > 150 ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);

    const dataUrl = canvas.toDataURL("image/png");

    const { data: { text } } = await Tesseract.recognize(dataUrl, "kor+eng", {
      tessedit_pageseg_mode: 6,
      logger: m => log(`p${pageNum} 진행률: ${Math.round(m.progress * 100)}%`)
    });

    fullText += `\n=== PAGE ${pageNum} ===\n` + text;
  }

  log("PDF OCR 완료");
  return fullText;
}

// =========================
// 부채 자동 추출 (참고 코드 그대로)
// =========================
function parseDebts(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const debts = [];

  const typeKeywords = ["연 체", "연체", "대 지 급", "대지급", "공 공 정 보", "공공정보", "해 제"];

  for (const line of lines) {
    const hasType = typeKeywords.find(k => line.includes(k));
    if (!hasType) continue;

    const clean = line.replace(/\s+/g, " ");

    const type = detectType(clean);
    if (!type) continue;

    const dates = clean.match(/\d{4}-\d{2}-\d{2}/g) || [];
    const numbers = clean.match(/\d{1,3}(?:,\d{3})+/g) || [];
    const codeMatch = clean.match(/\b\d{5}\b/);

    const code = codeMatch ? codeMatch[0] : "";
    const amount1 = numbers[0] ? numbers[0].replace(/,/g, "") : "";
    const amount2 = numbers[1] ? numbers[1].replace(/,/g, "") : "";

    let inst = clean;
    inst = inst.replace(type, "");
    if (code) inst = inst.replace(code, "");
    dates.forEach(d => (inst = inst.replace(d, "")));
    numbers.forEach(n => (inst = inst.replace(n, "")));
    inst = inst.replace(/[|,:]/g, "").trim();

    debts.push({
      raw: clean,
      type,
      institution: inst,
      code,
      date1: dates[0] || "",
      date2: dates[1] || "",
      amountRegistered: amount1,
      amountOverdue: amount2
    });
  }

  return debts;
}

function detectType(line) {
  if (line.includes("연 체") || line.includes("연체")) return "연체";
  if (line.includes("대 지 급") || line.includes("대지급")) return "대지급";
  if (line.includes("공 공 정 보") || line.includes("공공정보")) return "공공정보";
  if (line.includes("해 제")) return "해제";
  return null;
}

// =========================
// 흐름 추정 (연체 → 해제)
// =========================
function inferFlows(debts) {
  const flows = new Map();
  const byAmount = {};

  debts.forEach((d, idx) => {
    const key = d.amountRegistered;
    if (!key) return;
    if (!byAmount[key]) byAmount[key] = [];
    byAmount[key].push({ idx, d });
  });

  for (const key in byAmount) {
    const list = byAmount[key];
    const overdue = list.filter(x => x.d.type === "연체");
    const release = list.filter(x => x.d.type === "해제");

    overdue.forEach(o => {
      const r = release[0];
      if (r) {
        flows.set(o.idx, `${o.d.institution} → ${r.d.institution}`);
        flows.set(r.idx, `${o.d.institution} → ${r.d.institution} (해제)`);
      }
    });
  }

  return flows;
}

// =========================
// 부채 → 채권사/계좌/양도·양수/변제 여부로 변환
// =========================
function debtsToCreditors(debts, flows) {
  const creditors = [];

  debts.forEach((d, idx) => {
    const creditor = d.institution || "기관미상";
    const account =
      d.code ||
      d.date1 ||
      d.date2 ||
      "-";

    const flow = flows.get(idx) || "";
    const transfers = flow ? "양도/양수 있음: " + flow : "-";

    const repaid =
      d.type === "해제"
        ? "변제/해제"
        : d.type === "연체"
        ? "미변제(연체)"
        : "기타";

    creditors.push({
      creditor,
      account,
      transfers,
      repaid
    });
  });

  return creditors;
}

// =========================
// 버튼 클릭 → OCR → 파싱 → 표 생성
// =========================
parseBtn.addEventListener("click", async () => {
  const file = pdfInput.files && pdfInput.files[0];
  if (!file) {
    alert("PDF 또는 이미지 파일을 선택해 주세요.");
    return;
  }

  tableBody.innerHTML = "";
  statusEl.textContent = "OCR 처리 중...";

  const ext = file.name.toLowerCase().split(".").pop();
  let fullText = "";

  try {
    if (ext === "pdf") fullText = await ocrPdf(file);
    else fullText = await ocrImage(file);
  } catch (e) {
    console.error(e);
    statusEl.textContent = "OCR 오류: " + e.message;
    return;
  }

  const debts = parseDebts(fullText);
  const flows = inferFlows(debts);
  const creditors = debtsToCreditors(debts, flows);

  _creditors = creditors;
  renderTable(creditors);

  statusEl.textContent = `완료: 표가 생성되었습니다. (총 ${creditors.length}건)`;
});

// =========================
// 테이블 렌더링 (ocr.html 형식)
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
  if (!_creditors.length) {
    alert("먼저 PDF를 분석하세요.");
    return;
  }

  const data = _creditors.map(row => ({
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

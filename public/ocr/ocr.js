// PDF.js 설정
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#debtTable tbody");
const exportExcelBtn = document.getElementById("exportExcelBtn");

let parsedRows = []; // 최종 테이블 데이터

parseBtn.addEventListener("click", async () => {
  const file = pdfInput.files[0];
  if (!file) {
    alert("PDF 파일을 먼저 업로드하세요.");
    return;
  }

  statusEl.textContent = "PDF 텍스트 추출 중...";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += "\n" + pageText;      
    }

    console.log(fullText);   // ← 이 줄 추가
    
    statusEl.textContent = "텍스트 추출 완료. 채권자변동정보 분석 중...";

    const debts = parseFromDocumentText(fullText);
    parsedRows = buildRowsForTable(debts);

    renderTable(parsedRows);

    statusEl.textContent = `완료: 표가 생성되었습니다. (총 ${parsedRows.length}건)`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "오류 발생: 콘솔을 확인하세요.";
  }
});

// 문서 텍스트에서 채권자변동정보 부분을 파싱하는 함수
function parseFromDocumentText(text) {
  const words = text.split(/\s+/).filter(w => w.trim() !== "");

  const rows = [];
  let buffer = [];

  const types = ["양수채권", "일반대출", "대위변제대지급"];

  for (let i = 0; i < words.length; i++) {
    buffer.push(words[i]);

    const hasPhone = buffer.some(w => /\(\d{2,4}-\d{3,4}-\d{3,4}\)/.test(w));
    const hasType = buffer.some(w => types.includes(w));
    const hasDate = buffer.some(w => /^'\d{2}\.\d{2}\.\d{2}\.$/.test(w));
    const moneyList = buffer.filter(w => /^[\d,]+$/.test(w));
    const hasMoney = moneyList.length >= 1;

    // 계좌번호(사건번호) 후보: 숫자 또는 영문+숫자 조합
    const accountCandidate = buffer.find(w =>
      /^[A-Za-z0-9]+$/.test(w) &&
      !types.includes(w) &&
      !/^'\d{2}\.\d{2}\.\d{2}\.$/.test(w) &&
      !/\(\d{2,4}-\d{3,4}-\d{3,4}\)/.test(w)
    );

    if (hasPhone && hasType && hasDate && hasMoney) {
      const creditor = buffer[0];
      const phone = buffer.find(w => /\(\d/.test(w));
      const type = buffer.find(w => types.includes(w));
      const date = buffer.find(w => /^'\d{2}\.\d{2}\.\d{2}\.$/.test(w));

      const principal = moneyList[0];
      const interest = moneyList[1] || "0";

      const adjustType = buffer.find(w =>
        ["개인회생", "파산", "면책", "기타"].includes(w)
      ) || "";

      const transferStatus = buffer.find(w =>
        ["미양도", "양도", "매각"].includes(w)
      ) || "";

      rows.push({
        creditor,
        phone,
        type,
        date,
        principal,
        interest,
        adjustType,
        transferStatus,
        account: accountCandidate || ""
      });

      buffer = [];
    }
  }

  return rows;
}

// 테이블용 데이터 구성
function buildRowsForTable(debts) {
  return debts.map(d => {
    const transfers = [];

    if (d.type === "양수채권") transfers.push("양수채권");
    if (d.transferStatus.includes("미양도")) transfers.push("미양도 (최종 보유)");
    if (d.transferStatus.includes("매각")) transfers.push("매각");

    const repaid =
      d.adjustType.includes("회생") ||
      d.adjustType.includes("면책") ||
      d.adjustType.includes("변제");

    return {
      creditor: d.creditor,
      account: d.account || `${d.date} / ${d.principal}`,
      transfers,
      repaid
    };
  });
}

// HTML 테이블 렌더링
function renderTable(rows) {
  tableBody.innerHTML = "";

  rows.forEach(row => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.creditor}</td>
      <td>${row.account}</td>
      <td>${row.transfers.join("<br>") || "-"}</td>
      <td>${row.repaid ? "변제됨/조정" : "미변제 추정"}</td>
    `;

    tableBody.appendChild(tr);
  });
}

// 엑셀(xlsx) 내보내기 (SheetJS)
exportExcelBtn.addEventListener("click", () => {
  if (!parsedRows || parsedRows.length === 0) {
    alert("먼저 PDF를 분석해서 표를 생성하세요.");
    return;
  }

  const data = parsedRows.map(row => ({
    채권사: row.creditor,
    계좌번호_사건번호: row.account,
    양도양수이력: row.transfers.join(" / "),
    채무변제여부: row.repaid ? "변제됨/조정" : "미변제 추정"
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "채권현황");

  XLSX.writeFile(wb, "채권현황.xlsx");
});

// PDF.js 설정
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const pdfInput = document.getElementById("pdfFile");
const parseBtn = document.getElementById("parseBtn");
const statusEl = document.getElementById("status");
const tableBody = document.querySelector("#debtTable tbody");
const exportCsvBtn = document.getElementById("exportCsvBtn");

let parsedRows = []; // 최종 테이블 데이터 저장

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

    statusEl.textContent = "텍스트 추출 완료. 채권자변동정보 분석 중...";

    // 여기서 실제 문서 구조에 맞게 파싱
    const debts = parseFromDocumentText(fullText);

    parsedRows = buildRowsForTable(debts);

    renderTable(parsedRows);

    statusEl.textContent = "완료: 표가 생성되었습니다.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "오류 발생: 콘솔을 확인하세요.";
  }
});

// 문서 텍스트에서 채권자변동정보 부분을 파싱하는 함수
function parseFromDocumentText(text) {
  const result = [];

  // "채권자변동정보" 테이블의 패턴을 기반으로 정규식 구성
  const regex =
    /([가-힣A-Za-z0-9()·\s]+?)\s*\((.*?)\)\s*(양수채권|일반대출|대위변제대지급)\s*'(\d{2}\.\d{2}\.\d{2}\.)\s*([\d,]+)\s*([\d,]+)\s*([가-힣A-Za-z]+)\s*([가-힣A-Za-z]+)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    result.push({
      creditor: match[1].trim(),
      phone: match[2].trim(),
      type: match[3].trim(),
      date: match[4].trim(),
      principal: match[5].trim(),
      interest: match[6].trim(),
      adjustType: match[7].trim(),
      transferStatus: match[8].trim()
    });
  }

  return result;
}


// 양도·양수 이력 체인 및 테이블용 데이터 구성 (간단 버전)
function buildRowsForTable(debts) {
  // 여기서는 계좌번호 정보가 없다고 가정하고,
  // 실제 문서에서는 "계좌번호(사건번호)" 컬럼을 함께 파싱해서 넣어야 함.
  // 예시로 creditor + date를 계좌번호처럼 사용
  return debts.map(d => {
    const transfers = [];

    if (d.type === "양수채권") {
      transfers.push("양수채권");
    }
    if (d.transferStatus && d.transferStatus.includes("미양도")) {
      transfers.push("미양도 (최종 보유)");
    }

    const repaid =
      d.adjustType.includes("회생") ||
      d.adjustType.includes("면책") ||
      d.adjustType.includes("변제");

    return {
      creditor: d.creditor,
      account: `${d.date} / ${d.principal}`, // 실제로는 계좌번호를 파싱해서 넣어야 함
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
      <td>${row.repaid ? "변제 가능/조정" : "미변제 추정"}</td>
    `;

    tableBody.appendChild(tr);
  });
}

// CSV 내보내기
exportCsvBtn.addEventListener("click", () => {
  if (!parsedRows || parsedRows.length === 0) {
    alert("먼저 PDF를 분석해서 표를 생성하세요.");
    return;
  }

  const header = ["채권사", "계좌번호", "양도/양수 이력", "채무변제 여부"];
  const csvRows = [header.join(",")];

  parsedRows.forEach(row => {
    const line = [
      row.creditor,
      row.account,
      row.transfers.join(" / "),
      row.repaid ? "변제 가능/조정" : "미변제 추정"
    ];
    csvRows.push(line.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "채권현황.csv";
  a.click();

  URL.revokeObjectURL(url);
});

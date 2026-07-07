// PDF.js 설정
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.420/pdf.worker.min.js";

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

// 문서 텍스트에서 채권자변동정보 부분을 파싱하는 함수 (예시용)
function parseFromDocumentText(text) {
  // 실제로는 "채권자변동정보 조회서" 이후의 표 구조를 기준으로 정규식/패턴을 맞춰야 함
  // 여기서는 예시로, "연체채권의 채권자 변동 현황" 테이블을 단순 파싱한다고 가정

  // 예시: 줄 단위로 나누고, "양수채권" / "일반대출" / "대위변제대지급" 등이 포함된 줄만 추출
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);

  const result = [];

  lines.forEach(line => {
    // 아주 단순한 예시 패턴 (실제 문서에 맞게 수정 필요)
    // 예: "농업협동조합자산관리 (02-6256-8600) 양수채권 '19.09.10. 3.323 4,172 개인회생 미양도"
    if (
      line.includes("양수채권") ||
      line.includes("일반대출") ||
      line.includes("대위변제대지급")
    ) {
      const parts = line.split(/\s+/);

      // 기관명은 괄호 앞까지, 대략적으로 조합
      const orgIndex = parts.findIndex(p => p.includes("("));
      const creditor = parts.slice(0, orgIndex).join(" ");

      const type = parts[orgIndex + 1]; // 양수채권 / 일반대출 / 대위변제대지급 등
      const date = parts[orgIndex + 2]; // '19.09.10. 같은 형식
      const principal = parts[orgIndex + 3]; // 원금
      const interest = parts[orgIndex + 4]; // 이자(또는 0)
      const adjustType = parts[orgIndex + 5] || ""; // 개인회생 등
      const transferStatus = parts[orgIndex + 6] || ""; // 미양도 등

      result.push({
        creditor,
        type,
        date,
        principal,
        interest,
        adjustType,
        transferStatus
      });
    }
  });

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

import { db } from "/firebase-init.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const tbody = document.querySelector("#creditorTable tbody");
const searchInput = document.getElementById("searchInput");

const creditors = [
  {
    name: "KB국민카드 광주",
    account: "-",
    registeredAmount: null,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "신한카드(통합)",
    account: "-",
    registeredAmount: null,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "현대카드 본점심사팀",
    account: "-",
    registeredAmount: null,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "신한은행 광산금융센터",
    account: "-",
    registeredAmount: 7500,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "신한은행 봉선동(주택담보)",
    account: "-",
    registeredAmount: 56525,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "신한은행 봉선동(신용대출)",
    account: "-",
    registeredAmount: 24733,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "케이뱅크 인터넷점",
    account: "-",
    registeredAmount: 4271,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "카카오뱅크 비즈니스",
    account: "-",
    registeredAmount: 14400,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "토스뱅크 영업부",
    account: "-",
    registeredAmount: 15424,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "하나캐피탈 마케팅부",
    account: "-",
    registeredAmount: 26369,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "케이비저축은행 본점(담보)",
    account: "-",
    registeredAmount: 12129,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "대부대출(통합)",
    account: "-",
    registeredAmount: 18608,
    overdueAmount: null,
    releaseReason: null,
  },
  {
    name: "BMW파이낸셜서비스",
    account: "-",
    registeredAmount: 23398,
    overdueAmount: 23398,
    releaseReason: null,
  },
  {
    name: "KB국민카드 신용관리부",
    account: "-",
    registeredAmount: 8612,
    overdueAmount: 7640,
    releaseReason: "본인변제(2025-09-26)",
  },
  {
    name: "케이비저축은행 본점",
    account: "20526114199",
    registeredAmount: 13837,
    overdueAmount: 13837,
    releaseReason: "본인변제(2025-12-26)",
  },
  {
    name: "신한은행 봉선동(연체)",
    account: "241143239311000001",
    registeredAmount: 27066,
    overdueAmount: 27066,
    releaseReason: null,
  },
  {
    name: "신한은행 여신관리부",
    account: "241143239311000001",
    registeredAmount: 27066,
    overdueAmount: 0,
    releaseReason: "본인변제(2026-03-06)",
  },
];

function renderTable(keyword = "") {
  tbody.innerHTML = "";
  creditors
    .filter(c => c.name.includes(keyword))
    .forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.name}</td>
        <td>${c.account || "-"}</td>
        <td>${c.registeredAmount ?? "-"}</td>
        <td>${c.overdueAmount ?? "-"}</td>
        <td>${c.releaseReason || "-"}</td>
      `;
      tbody.appendChild(tr);
    });
}

renderTable();

searchInput.addEventListener("input", e => {
  renderTable(e.target.value.trim());
});

document.getElementById("syncBtn").addEventListener("click", async () => {
  try {
    await setDoc(doc(db, "creditorData", "latest"), {
      updatedAt: new Date().toISOString(),
      creditors,
    });

    const blob = new Blob(
      [`export const creditors = ${JSON.stringify(creditors, null, 2)};`],
      { type: "application/javascript" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "creditors.js";
    a.click();

    alert("Firebase 저장 + creditors.js 생성 완료");
  } catch (e) {
    console.error(e);
    alert("동기화 중 오류가 발생했습니다.");
  }
});

document.getElementById("pdfBtn").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();

  docPdf.text("부채증명서 발급 대상 전체 채권자 목록", 14, 15);

  const rows = creditors.map(c => [
    c.name,
    c.account || "-",
    c.registeredAmount ?? "-",
    c.overdueAmount ?? "-",
    c.releaseReason || "-"
  ]);

  docPdf.autoTable({
    head: [["채권자", "계좌번호", "등록금액", "연체금액", "해제사유"]],
    body: rows,
    startY: 25,
  });

  docPdf.save("creditors.pdf");
});

document.getElementById("excelBtn").addEventListener("click", () => {
  const wb = XLSX.utils.book_new();

  const wsData = [
    ["채권자", "계좌번호", "등록금액", "연체금액", "해제사유"],
    ...creditors.map(c => [
      c.name,
      c.account || "-",
      c.registeredAmount ?? "-",
      c.overdueAmount ?? "-",
      c.releaseReason || "-"
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "creditors");

  XLSX.writeFile(wb, "creditors.xlsx");
});

document.getElementById("ocrBtn").addEventListener("click", async () => {
  const file = document.getElementById("scanFile").files[0];
  if (!file) return alert("스캔파일을 선택하세요.");

  document.getElementById("scanStatus").innerText = "OCR 처리 중...";

  const imageUrl = URL.createObjectURL(file);

  const result = await Tesseract.recognize(imageUrl, "kor+eng", {
    logger: m => console.log(m),
  });

  const text = result.data.text;
  document.getElementById("scanStatus").innerText = "OCR 완료";

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const extracted = [];

  lines.forEach(line => {
    if (
      line.includes("은행") ||
      line.includes("카드") ||
      line.includes("저축은행") ||
      line.includes("캐피탈") ||
      line.includes("대부")
    ) {
      const accountMatch = line.match(/\d{8,}/);
      const account = accountMatch ? accountMatch[0] : "-";

      extracted.push({
        name: line,
        account,
        registeredAmount: null,
        overdueAmount: null,
        releaseReason: null,
      });
    }
  });

  creditors.push(...extracted);
  renderTable(searchInput.value.trim());

  alert(`OCR로 채권자 후보 ${extracted.length}건을 추출했습니다.`);
});

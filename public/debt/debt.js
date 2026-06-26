import { db } from "/firebase-init.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { creditors } from "/debt/creditors.js";

const tbody = document.querySelector("#creditorTable tbody");
const searchInput = document.getElementById("searchInput");

// 페이지 로드시 스캔 상태 초기화
document.getElementById("scanFile").value = "";
document.getElementById("scanStatus").innerText = "";

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

// Firebase + creditors.js 동기화
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

// PDF 다운로드
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

// 엑셀 다운로드
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

// OCR 버튼 (PDF + 이미지 모두 지원)
document.getElementById("ocrBtn").addEventListener("click", async () => {
  const file = document.getElementById("scanFile").files[0];
  if (!file) return alert("스캔파일을 선택하세요.");

  document.getElementById("scanStatus").innerText = "OCR 처리 중...";

  try {
    // PDF 처리
    if (file.type === "application/pdf") {
      const pdfArrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;

      let fullText = "";

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const imageUrl = canvas.toDataURL("image/png");

        const result = await Tesseract.recognize(imageUrl, "kor+eng", {
          logger: m => console.log(m),
        });

        fullText += result.data.text + "\n";
      }

      processOCRText(fullText);
      return;
    }

    // 이미지 처리
    if (file.type.startsWith("image/")) {
      const imageUrl = URL.createObjectURL(file);

      const result = await Tesseract.recognize(imageUrl, "kor+eng", {
        logger: m => console.log(m),
      });

      processOCRText(result.data.text);
      return;
    }

    alert("지원하지 않는 파일 형식입니다. PDF 또는 이미지 파일을 업로드해주세요.");
  } catch (err) {
    console.error(err);
    document.getElementById("scanStatus").innerText = "OCR 실패";
    alert("이미지를 읽는 중 오류가 발생했습니다. 다른 파일로 시도해주세요.");
  }
});

// OCR 결과 처리 → 채권자 자동 추출
function processOCRText(text) {
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
}

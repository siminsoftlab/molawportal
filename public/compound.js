/******************************************************
 *  엑셀 날짜 변환 (Excel Serial → yyyy-MM-dd)
 ******************************************************/
function excelDateToYMD(serial) {
  if (!serial || isNaN(serial)) return "";

  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const year = date_info.getUTCFullYear();
  const month = String(date_info.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date_info.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/******************************************************
 *  행 추가
 ******************************************************/
function cfAddRow() {
  const tbody = document.querySelector("#cfTable tbody");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><input type="number" class="no"></td>
    <td><input type="date" class="inDate"></td>
    <td><input type="number" class="inAmt"></td>
    <td><input type="date" class="outDate"></td>
    <td><input type="number" class="outAmt"></td>
    <td class="days"></td>
    <td class="rate"></td>
  `;

  tbody.appendChild(tr);
}

/******************************************************
 *  날짜 차이 계산
 ******************************************************/
function diffDays(a, b) {
  if (!a || !b) return null;
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

/******************************************************
 *  복리 연이자율 계산
 *  totalIn: 입금금액, totalOut: 출금금액, days: 이용기간(일)
 ******************************************************/
function calcRate(totalIn, totalOut, days) {
  if (!totalIn || !totalOut || !days || days <= 0) return null;
  const ratio = totalOut / totalIn;
  if (ratio <= 0) return null;
  return Math.pow(ratio, 365 / days) - 1;
}

/******************************************************
 *  메인 계산 (행 단위: 입금 → 출금 기준)
 ******************************************************/
function cfCalculate() {
  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"));

  let grandIn = 0;
  let grandOut = 0;

  rows.forEach(tr => {
    const inDate = tr.querySelector(".inDate")?.value || "";
    const inAmt  = Number(tr.querySelector(".inAmt")?.value || 0);
    const outDate = tr.querySelector(".outDate")?.value || "";
    const outAmt  = Number(tr.querySelector(".outAmt")?.value || 0);

    const daysCell = tr.querySelector(".days");
    const rateCell = tr.querySelector(".rate");

    // 총합 집계
    if (inAmt > 0) grandIn += inAmt;
    if (outAmt > 0) grandOut += outAmt;

    // 초기화
    daysCell.textContent = "";
    rateCell.textContent = "";

    // 입금 + 출금이 모두 있는 행만 계산
    if (inAmt > 0 && outAmt > 0 && inDate && outDate) {
      const days = diffDays(inDate, outDate);
      const rate = calcRate(inAmt, outAmt, days);

      if (days != null) {
        daysCell.textContent = days + "일";
      }
      if (rate != null) {
        rateCell.textContent = (rate * 100).toFixed(2) + "%";
      }
    }
  });

  const totalInEl = document.getElementById("totalIn");
  const totalOutEl = document.getElementById("totalOut");
  if (totalInEl) totalInEl.textContent = grandIn.toLocaleString();
  if (totalOutEl) totalOutEl.textContent = grandOut.toLocaleString();
}

/******************************************************
 *  엑셀 업로드
 ******************************************************/
function cfReadExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    cfLoadData(json);
  };
  reader.readAsArrayBuffer(file);
}

/******************************************************
 *  CSV 붙여넣기
 ******************************************************/
function cfParseCSV() {
  const text = document.getElementById("csvInput")?.value.trim();
  if (!text) return;

  const rows = text.split("\n").map(r => r.split(","));
  cfLoadData(rows);
}

/******************************************************
 *  표에 데이터 로드 (엑셀 날짜 자동 변환)
 *  형식: NO, 입금일자, 입금금액, 출금일자, 출금금액
 ******************************************************/
function cfLoadData(rows) {
  const tbody = document.querySelector("#cfTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    if (idx === 0) return; // 헤더 스킵

    const no = r[0] || "";
    const rawInDate = r[1];
    const rawOutDate = r[3];

    const inDate =
      typeof rawInDate === "number" ? excelDateToYMD(rawInDate) : (rawInDate || "");
    const outDate =
      typeof rawOutDate === "number" ? excelDateToYMD(rawOutDate) : (rawOutDate || "");

    const inAmt = r[2] || "";
    const outAmt = r[4] || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="number" class="no" value="${no}"></td>
      <td><input type="date" class="inDate" value="${inDate}"></td>
      <td><input type="number" class="inAmt" value="${inAmt}"></td>
      <td><input type="date" class="outDate" value="${outDate}"></td>
      <td><input type="number" class="outAmt" value="${outAmt}"></td>
      <td class="days"></td>
      <td class="rate"></td>
    `;
    tbody.appendChild(tr);
  });
}

/******************************************************
 *  엑셀 다운로드
 ******************************************************/
function cfExportExcel() {
  const table = document.getElementById("cfTable");
  if (!table) return;

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);

  XLSX.utils.book_append_sheet(wb, ws, "연이자율");
  XLSX.writeFile(wb, "compound_interest.xlsx");
}

/******************************************************
 *  PDF 다운로드
 ******************************************************/
function cfExportPDF() {
  const table = document.getElementById("cfTable");
  if (!table) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const head = [];
  table.querySelectorAll("thead th").forEach(th => {
    head.push(th.textContent.trim());
  });

  const body = [];
  table.querySelectorAll("tbody tr").forEach(tr => {
    const row = [];
    tr.querySelectorAll("td").forEach(td => {
      const input = td.querySelector("input");
      row.push(input ? (input.value || "") : (td.textContent.trim() || ""));
    });
    body.push(row);
  });

  doc.autoTable({
    head: [head],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 40, 40] }
  });

  doc.save("compound_interest.pdf");
}

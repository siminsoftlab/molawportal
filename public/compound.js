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
  return Math.floor((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

/******************************************************
 *  복리 연이자율 계산
 ******************************************************/
function calcRate(totalIn, totalOut, days) {
  if (!totalIn || !totalOut || !days || days <= 0) return null;
  const ratio = totalOut / totalIn;
  if (ratio <= 0) return null;
  return Math.pow(ratio, 365 / days) - 1;
}

/******************************************************
 *  메인 계산 (행 단위 + NO별 소계 + 접기/펼치기)
 ******************************************************/
function cfCalculate() {
  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"));

  const groups = {};
  let grandIn = 0;
  let grandOut = 0;

  rows.forEach(tr => {
    const no = tr.querySelector(".no")?.value || "";
    const inDate = tr.querySelector(".inDate")?.value || "";
    const inAmt = Number(tr.querySelector(".inAmt")?.value || 0);
    const outDate = tr.querySelector(".outDate")?.value || "";
    const outAmt = Number(tr.querySelector(".outAmt")?.value || 0);

    if (!groups[no]) {
      groups[no] = { rows: [], subtotalIn: 0, subtotalOut: 0 };
    }

    groups[no].rows.push(tr);

    if (inAmt > 0) {
      groups[no].subtotalIn += inAmt;
      grandIn += inAmt;
    }
    if (outAmt > 0) {
      groups[no].subtotalOut += outAmt;
      grandOut += outAmt;
    }

    const daysCell = tr.querySelector(".days");
    const rateCell = tr.querySelector(".rate");
    daysCell.textContent = "";
    rateCell.textContent = "";

    if (inAmt > 0 && outAmt > 0 && inDate && outDate) {
      const days = diffDays(inDate, outDate);
      const rate = calcRate(inAmt, outAmt, days);
      daysCell.textContent = days + "일";
      rateCell.textContent = (rate * 100).toFixed(2) + "%";
    }
  });

  /********** NO별 소계 표시 **********/
  let html = "";
  Object.keys(groups).forEach(no => {
    html += `
      <div class="subtotal-box" onclick="toggleGroup('${no}')">
        <b>NO ${no}</b>  
        — 입금: ${groups[no].subtotalIn.toLocaleString()}원  
        / 출금: ${groups[no].subtotalOut.toLocaleString()}원  
        <span style="float:right;">▼</span>
      </div>
    `;
  });
  document.getElementById("subtotalArea").innerHTML = html;

  /********** 총합 표시 **********/
  document.getElementById("totalIn").textContent = grandIn.toLocaleString();
  document.getElementById("totalOut").textContent = grandOut.toLocaleString();
}

/******************************************************
 *  NO별 접기/펼치기
 ******************************************************/
function toggleGroup(no) {
  const rows = document.querySelectorAll(`#cfTable tbody tr`);
  rows.forEach(tr => {
    const rowNo = tr.querySelector(".no")?.value || "";
    if (rowNo === no) {
      tr.classList.toggle("no-group-hidden");
    }
  });
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
 *  표에 데이터 로드
 ******************************************************/
function cfLoadData(rows) {
  const tbody = document.querySelector("#cfTable tbody");
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    if (idx === 0) return;

    const no = r[0] || "";
    const inDate = typeof r[1] === "number" ? excelDateToYMD(r[1]) : r[1] || "";
    const inAmt = r[2] || "";
    const outDate = typeof r[3] === "number" ? excelDateToYMD(r[3]) : r[3] || "";
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
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const head = [];
  table.querySelectorAll("thead th").forEach(th => head.push(th.textContent.trim()));

  const body = [];
  table.querySelectorAll("tbody tr").forEach(tr => {
    const row = [];
    tr.querySelectorAll("td").forEach(td => {
      const input = td.querySelector("input");
      row.push(input ? (input.value || "") : td.textContent.trim());
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

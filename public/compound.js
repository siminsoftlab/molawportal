// -------------------------------
// 행 추가
// -------------------------------
function addRow() {
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

// -------------------------------
// 날짜 차이 계산
// -------------------------------
function diffDays(a, b) {
  if (!a || !b) return null;
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

// -------------------------------
// 복리 연이자율 계산
// -------------------------------
function calcRate(totalIn, totalOut, days) {
  if (!totalIn || !totalOut || !days || days <= 0) return null;
  const ratio = totalOut / totalIn;
  return Math.pow(ratio, 365 / days) - 1;
}

// -------------------------------
// 메인 계산
// -------------------------------
function calculateCF() {
  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"));

  const groups = {};

  rows.forEach(tr => {
    const no = tr.querySelector(".no").value.trim();
    const inDate = tr.querySelector(".inDate").value;
    const inAmt = Number(tr.querySelector(".inAmt").value || 0);
    const outDate = tr.querySelector(".outDate").value;
    const outAmt = Number(tr.querySelector(".outAmt").value || 0);

    if (!no) return;

    if (!groups[no]) {
      groups[no] = {
        rows: [],
        totalIn: 0,
        totalOut: 0,
        firstInDate: null,
        lastOutDate: null
      };
    }

    const g = groups[no];
    g.rows.push(tr);

    if (inAmt > 0) {
      g.totalIn += inAmt;
      if (inDate && (!g.firstInDate || new Date(inDate) < new Date(g.firstInDate))) {
        g.firstInDate = inDate;
      }
    }

    if (outAmt > 0) {
      g.totalOut += outAmt;
      if (outDate && (!g.lastOutDate || new Date(outDate) > new Date(g.lastOutDate))) {
        g.lastOutDate = outDate;
      }
    }
  });

  let grandIn = 0;
  let grandOut = 0;

  Object.keys(groups).forEach(no => {
    const g = groups[no];

    grandIn += g.totalIn;
    grandOut += g.totalOut;

    const days = diffDays(g.firstInDate, g.lastOutDate);
    const rate = calcRate(g.totalIn, g.totalOut, days);

    g.rows.forEach((tr, idx) => {
      const daysCell = tr.querySelector(".days");
      const rateCell = tr.querySelector(".rate");

      if (idx === 0 && days != null && rate != null) {
        daysCell.textContent = days + "일";
        rateCell.textContent = (rate * 100).toFixed(2) + "%";
      } else {
        daysCell.textContent = "";
        rateCell.textContent = "";
      }
    });
  });

  document.getElementById("totalIn").textContent = grandIn.toLocaleString();
  document.getElementById("totalOut").textContent = grandOut.toLocaleString();
}

// -------------------------------
// 엑셀(.xlsx) 업로드
// -------------------------------
function readExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    loadData(json);
  };
  reader.readAsArrayBuffer(file);
}

// -------------------------------
// CSV 붙여넣기
// -------------------------------
function parseCSV() {
  const text = document.getElementById("csvInput").value.trim();
  if (!text) return;

  const rows = text.split("\n").map(r => r.split(","));
  loadData(rows);
}

// -------------------------------
// 표에 데이터 로드
// -------------------------------
function loadData(rows) {
  const tbody = document.querySelector("#cfTable tbody");
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    if (idx === 0) return; // 헤더 스킵

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="number" class="no" value="${r[0] || ""}"></td>
      <td><input type="date" class="inDate" value="${r[1] || ""}"></td>
      <td><input type="number" class="inAmt" value="${r[2] || ""}"></td>
      <td><input type="date" class="outDate" value="${r[3] || ""}"></td>
      <td><input type="number" class="outAmt" value="${r[4] || ""}"></td>
      <td class="days"></td>
      <td class="rate"></td>
    `;
    tbody.appendChild(tr);
  });
}

function cfExportExcel() {
  const table = document.getElementById("cfTable");
  if (!table) return;

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);

  XLSX.utils.book_append_sheet(wb, ws, "연이자율");
  XLSX.writeFile(wb, "compound_interest.xlsx");
}
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

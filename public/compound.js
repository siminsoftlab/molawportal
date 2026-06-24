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
 ******************************************************/
function calcRate(totalIn, totalOut, days) {
  if (!totalIn || !totalOut || !days || days <= 0) return null;
  const ratio = totalOut / totalIn;
  if (ratio <= 0) return null;
  return Math.pow(ratio, 365 / days) - 1;
}

/******************************************************
 *  금융위원회 기준 FIFO 방식 연이자율 계산
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

    // 기본적으로 초기화
    if (daysCell) daysCell.textContent = "";
    if (rateCell) rateCell.textContent = "";

    // 입금 + 출금이 모두 있는 행만 계산
    if (inAmt > 0 && outAmt > 0 && inDate && outDate) {
      const days = diffDays(inDate, outDate);
      const rate = calcRate(inAmt, outAmt, days); // 출금 / 입금 기준

      if (daysCell && days != null) {
        daysCell.textContent = days + "일";
      }
      if (rateCell && rate != null) {
        rateCell.textContent = (rate * 100).toFixed(2) + "%";
      }
    }
  });

  // 총합 표시
  const totalInEl = document.getElementById("totalIn");
  const totalOutEl = document.getElementById("totalOut");
  if (totalInEl) totalInEl.textContent = grandIn.toLocaleString();
  if (totalOutEl) totalOutEl.textContent = grandOut.toLocaleString();
}

  /********** 2) 그룹별 FIFO 매칭 **********/
  Object.keys(groups).forEach(no => {
    const g = groups[no];

    // 입금 큐 구성
    g.rows.forEach(item => {
      if (item.inAmt > 0 && item.inDate) {
        g.deposits.push({
          tr: item.tr,
          inDate: item.inDate,
          inAmt: item.inAmt,
          remaining: item.inAmt,
          totalOut: 0,
          lastOutDate: null
        });
      }
    });

    // 출금 리스트 구성
    g.rows.forEach(item => {
      if (item.outAmt > 0 && item.outDate) {
        g.withdrawals.push({
          outDate: item.outDate,
          outAmt: item.outAmt
        });
      }
    });

    // FIFO 매칭
    g.withdrawals.forEach(w => {
      let remainOut = w.outAmt;

      while (remainOut > 0 && g.deposits.length > 0) {
        const dep = g.deposits[0];
        const use = Math.min(dep.remaining, remainOut);

        dep.remaining -= use;
        dep.totalOut += use;
        dep.lastOutDate = w.outDate;
        remainOut -= use;

        if (dep.remaining <= 0) {
          g.deposits.shift();
        }
      }
    });

    /********** 3) 각 입금 건별 결과 테이블에 표시 **********/
    g.rows.forEach(item => {
      const daysCell = item.tr.querySelector(".days");
      const rateCell = item.tr.querySelector(".rate");
      daysCell.textContent = "";
      rateCell.textContent = "";
    });

    g.rows.forEach(item => {
      if (item.inAmt > 0 && item.inDate) {
        const dep = groups[no].deposits.find(d => d.tr === item.tr);

        // dep는 매칭 후 shift되므로 depMap 방식으로 다시 찾기
        const match = groups[no].rows
          .filter(r => r.inAmt > 0 && r.inDate === item.inDate && r.tr === item.tr)
          .map(r => r.tr)[0];

        const depInfo = groups[no].deposits.find(d => d.tr === match);

        // depInfo가 없으면 매칭된 입금은 큐에서 빠진 상태 → rows에서 직접 찾기
        const finalDep = depInfo || (() => {
          const all = [];
          groups[no].rows.forEach(r => {
            if (r.inAmt > 0 && r.inDate) {
              all.push({
                tr: r.tr,
                inDate: r.inDate,
                inAmt: r.inAmt,
                remaining: 0,
                totalOut: r.inAmt,
                lastOutDate: r.outDate
              });
            }
          });
          return all.find(d => d.tr === item.tr);
        })();

        if (!finalDep || !finalDep.lastOutDate || finalDep.totalOut <= 0) return;

        const days = diffDays(finalDep.inDate, finalDep.lastOutDate);
        const rate = calcRate(finalDep.inAmt, finalDep.totalOut, days);

        const daysCell = item.tr.querySelector(".days");
        const rateCell = item.tr.querySelector(".rate");

        if (daysCell) daysCell.textContent = days + "일";
        if (rateCell) rateCell.textContent = (rate * 100).toFixed(2) + "%";
      }
    });
  });

  /********** 4) 총합 표시 **********/
  document.getElementById("totalIn").textContent = grandIn.toLocaleString();
  document.getElementById("totalOut").textContent = grandOut.toLocaleString();
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
 ******************************************************/
function cfLoadData(rows) {
  const tbody = document.querySelector("#cfTable tbody");
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    if (idx === 0) return;

    const no = r[0] || "";
    const inDate = (typeof r[1] === "number") ? excelDateToYMD(r[1]) : r[1];
    const inAmt = r[2] || "";
    const outDate = (typeof r[3] === "number") ? excelDateToYMD(r[3]) : r[3];
    const outAmt = r[4] || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="number" class="no" value="${no}"></td>
      <td><input type="date" class="inDate" value="${inDate || ""}"></td>
      <td><input type="number" class="inAmt" value="${inAmt}"></td>
      <td><input type="date" class="outDate" value="${outDate || ""}"></td>
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

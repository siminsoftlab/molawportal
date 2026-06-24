// -------------------------------
// 행 추가
// -------------------------------
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

// -------------------------------
// 날짜 차이 계산 (입금일 → 출금일)
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
  if (ratio <= 0) return null;
  return Math.pow(ratio, 365 / days) - 1;
}

// -------------------------------
// 메인 계산 (금융위 기준 FIFO, 입금일 기준 이용기간)
// -------------------------------
function cfCalculate() {
  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"));

  // NO별 그룹
  const groups = {};

  rows.forEach((tr, idx) => {
    const no = (tr.querySelector(".no")?.value || "").toString().trim() || "1";
    const inDate = tr.querySelector(".inDate")?.value || "";
    const inAmt = Number(tr.querySelector(".inAmt")?.value || 0);
    const outDate = tr.querySelector(".outDate")?.value || "";
    const outAmt = Number(tr.querySelector(".outAmt")?.value || 0);

    if (!groups[no]) {
      groups[no] = {
        rows: [],
        deposits: [], // FIFO 큐
        withdrawals: []
      };
    }

    groups[no].rows.push({ tr, idx, inDate, inAmt, outDate, outAmt });
  });

  let grandIn = 0;
  let grandOut = 0;

  Object.keys(groups).forEach(no => {
    const g = groups[no];

    // 1) 입금·출금 데이터 수집
    g.rows.forEach(item => {
      const { tr, inDate, inAmt, outDate, outAmt } = item;

      if (inAmt > 0 && inDate) {
        g.deposits.push({
          inDate,
          inAmt,
          remaining: inAmt,
          totalOut: 0,
          lastOutDate: null,
          row: tr
        });
        grandIn += inAmt;
      }

      if (outAmt > 0 && outDate) {
        g.withdrawals.push({
          outDate,
          outAmt
        });
        grandOut += outAmt;
      }
    });

    // 입금·출금은 이미 시간 순으로 입력된다고 가정 (필요시 정렬 가능)
    // g.deposits.sort((a, b) => new Date(a.inDate) - new Date(b.inDate));
    // g.withdrawals.sort((a, b) => new Date(a.outDate) - new Date(b.outDate));

    // 2) FIFO로 입금 → 출금 매칭
    g.withdrawals.forEach(w => {
      let remainOut = w.outAmt;

      while (remainOut > 0 && g.deposits.length > 0) {
        const dep = g.deposits[0];
        const use = Math.min(dep.remaining, remainOut);

        dep.remaining -= use;
        dep.totalOut += use;
        dep.lastOutDate = w.outDate;
        remainOut -= use;

        if (dep.remaining <= 0.0000001) {
          dep.remaining = 0;
          // 완전히 상환된 입금은 큐에서 제거
          g.deposits.shift();
        }
      }
    });

    // 3) 각 입금 건별로 이용기간·연이자율 계산 (금융위 기준: 입금일 → 마지막 출금일)
    g.rows.forEach(item => {
      const { tr } = item;
      const daysCell = tr.querySelector(".days");
      const rateCell = tr.querySelector(".rate");
      if (daysCell) daysCell.textContent = "";
      if (rateCell) rateCell.textContent = "";
    });

    // 입금 큐는 일부만 상환된 것들이 남아 있을 수 있으므로,
    // 원래 입금 리스트를 다시 만들어서 처리
    const allDeposits = [];

    g.rows.forEach(item => {
      const { tr, inDate, inAmt } = item;
      if (inAmt > 0 && inDate) {
        allDeposits.push({
          tr,
          inDate,
          inAmt
        });
      }
    });

    // 매칭 과정에서 사용된 입금 정보는 g.deposits가 아니라
    // 매칭 전 상태를 기준으로 다시 계산해야 하므로,
    // 매칭 시점에 별도 맵을 만들어두는 것이 안전하다.
    // 여기서는 간단히 다시 매칭용 맵을 구성한다.
    const depMap = new Map();

    g.rows.forEach(item => {
      const { tr, inDate, inAmt } = item;
      if (inAmt > 0 && inDate) {
        const key = tr; // DOM 요소를 키로 사용
        depMap.set(key, {
          inDate,
          inAmt,
          remaining: inAmt,
          totalOut: 0,
          lastOutDate: null
        });
      }
    });

    // 다시 FIFO 매칭 (이번에는 각 행별 입금 기준으로 기록)
    const depQueue = [];
    depMap.forEach((v, k) => {
      depQueue.push({ key: k, data: v });
    });
    // 입력 순서대로 들어가 있으므로 별도 정렬은 생략

    g.withdrawals.forEach(w => {
      let remainOut = w.outAmt;

      while (remainOut > 0 && depQueue.length > 0) {
        const dep = depQueue[0].data;
        const use = Math.min(dep.remaining, remainOut);

        dep.remaining -= use;
        dep.totalOut += use;
        dep.lastOutDate = w.outDate;
        remainOut -= use;

        if (dep.remaining <= 0.0000001) {
          dep.remaining = 0;
          depQueue.shift();
        }
      }
    });

    // 각 입금 행에 결과 반영
    depMap.forEach((dep, keyTr) => {
      const { inDate, inAmt, totalOut, lastOutDate } = dep;
      if (!lastOutDate || totalOut <= 0) return;

      const days = diffDays(inDate, lastOutDate);
      const rate = calcRate(inAmt, totalOut, days);

      const daysCell = keyTr.querySelector(".days");
      const rateCell = keyTr.querySelector(".rate");

      if (daysCell && days != null) {
        daysCell.textContent = days + "일";
      }
      if (rateCell && rate != null) {
        rateCell.textContent = (rate * 100).toFixed(2) + "%";
      }
    });
  });

  // 총합 표시
  const totalInEl = document.getElementById("totalIn");
  const totalOutEl = document.getElementById("totalOut");
  if (totalInEl) totalInEl.textContent = grandIn.toLocaleString();
  if (totalOutEl) totalOutEl.textContent = grandOut.toLocaleString();
}

// -------------------------------
// 엑셀(.xlsx) 업로드
// -------------------------------
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

// -------------------------------
// CSV 붙여넣기
// -------------------------------
function cfParseCSV() {
  const text = document.getElementById("csvInput")?.value.trim();
  if (!text) return;

  const rows = text.split("\n").map(r => r.split(","));
  cfLoadData(rows);
}

// -------------------------------
// 표에 데이터 로드
// -------------------------------
function cfLoadData(rows) {
  const tbody = document.querySelector("#cfTable tbody");
  if (!tbody) return;
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

// -------------------------------
// 엑셀 다운로드
// -------------------------------
function cfExportExcel() {
  const table = document.getElementById("cfTable");
  if (!table) return;

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);

  XLSX.utils.book_append_sheet(wb, ws, "연이자율");
  XLSX.writeFile(wb, "compound_interest.xlsx");
}

// -------------------------------
// PDF 다운로드
// -------------------------------
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

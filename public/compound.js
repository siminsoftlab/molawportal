/******************************************************
 *  엑셀 날짜 변환 (Excel Serial → yyyy-MM-dd)
 ******************************************************/
function excelDateToYMD(serial) {
  if (!serial || isNaN(serial)) return "";
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  const y = dateInfo.getUTCFullYear();
  const m = String(dateInfo.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dateInfo.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/******************************************************
 *  날짜 차이 계산 (일 단위)
 ******************************************************/
function diffDays(a, b) {
  if (!a || !b) return null;
  return Math.floor((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

/******************************************************
 *  IRR 계산 (금융위 방식)
 *  cashflows: [{tYears, amount}]  tYears=경과연수, amount=현금흐름
 ******************************************************/
function calcIRR(cashflows) {
  // 모든 현금흐름이 같은 부호면 IRR 없음
  const hasPos = cashflows.some(cf => cf.amount > 0);
  const hasNeg = cashflows.some(cf => cf.amount < 0);
  if (!hasPos || !hasNeg) return null;

  function npv(r) {
    return cashflows.reduce(
      (sum, cf) => sum + cf.amount / Math.pow(1 + r, cf.tYears),
      0
    );
  }

  let low = -0.9999; // -99.99%
  let high = 10;     // 1000%
  let mid;

  for (let i = 0; i < 100; i++) {
    mid = (low + high) / 2;
    const v = npv(mid);
    if (Math.abs(v) < 1e-6) break;
    const vLow = npv(low);
    // 부호에 따라 구간 좁히기
    if (vLow * v <= 0) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return mid;
}

/******************************************************
 *  행 추가 (입력용)
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
 *  업로드/CSV 데이터 → cfTable에 로드 (원본만)
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

  const resultBody = document.querySelector("#resultTable tbody");
  if (resultBody) resultBody.innerHTML = "";
  const subtotalArea = document.getElementById("subtotalArea");
  if (subtotalArea) subtotalArea.innerHTML = "";
  const detailArea = document.getElementById("detailArea");
  if (detailArea) {
    detailArea.innerHTML = "";
    detailArea.dataset.details = "[]";
  }
  const totalIn = document.getElementById("totalIn");
  const totalOut = document.getElementById("totalOut");
  if (totalIn) totalIn.textContent = "0";
  if (totalOut) totalOut.textContent = "0";
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
 *  메인 계산 (금융위 IRR 방식)
 *  - 입금 단위로 상환 흐름 구성
 *  - IRR은 입금 → 모든 출금 흐름으로 계산
 *  - 결과테이블: 입금 단위 1행
 *  - 상세내역: 출금별 이용기간·IRR(같은 r 표시)
 ******************************************************/
function cfCalculate() {
  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"));
  const resultBody = document.querySelector("#resultTable tbody");
  if (!resultBody) return;
  resultBody.innerHTML = "";

  const detailArea = document.getElementById("detailArea");
  if (detailArea) {
    detailArea.innerHTML = "";
    detailArea.dataset.details = "[]";
  }

  const groups = {}; // NO별 그룹
  let grandIn = 0;
  let grandOut = 0;

  // 1) NO별로 행 모으기
  rows.forEach(tr => {
    const no = tr.querySelector(".no")?.value || "";
    const inDate = tr.querySelector(".inDate")?.value || "";
    const inAmt = Number(tr.querySelector(".inAmt")?.value || 0);
    const outDate = tr.querySelector(".outDate")?.value || "";
    const outAmt = Number(tr.querySelector(".outAmt")?.value || 0);

    if (!no) return;

    if (!groups[no]) {
      groups[no] = {
        rows: [],
        deposits: [],
        subtotalIn: 0,
        subtotalOut: 0
      };
    }

    groups[no].rows.push({
      inDate,
      inAmt,
      outDate,
      outAmt
    });
  });

  const allDetails = [];

  // 2) 입금 단위로 상환 흐름 구성 (레이아웃 기준)
  Object.keys(groups).forEach(no => {
    const g = groups[no];
    let currentDeposit = null;

    g.rows.forEach(r => {
      const { inDate, inAmt, outDate, outAmt } = r;

      // 새 입금 시작
      if (inAmt > 0 && inDate) {
        currentDeposit = {
          inDate,
          inAmt,
          withdrawals: []
        };
        g.deposits.push(currentDeposit);
        g.subtotalIn += inAmt;
        grandIn += inAmt;
      }

      // 출금은 현재 입금에만 붙임
      if (outAmt > 0 && outDate) {
        if (!currentDeposit) return;
        currentDeposit.withdrawals.push({
          outDate,
          outAmt
        });
        g.subtotalOut += outAmt;
        grandOut += outAmt;
      }
    });
  });

  // 3) 입금 단위로 IRR 계산 + 결과테이블/상세내역 데이터 생성
  Object.keys(groups).forEach(no => {
    const g = groups[no];

    g.deposits.forEach((dep, idx) => {
      const inDate = dep.inDate;
      const inAmt = dep.inAmt;
      const withdrawals = dep.withdrawals || [];

      if (!inDate || !inAmt || withdrawals.length === 0) return;

      // 출금별 이용기간(입금→출금), cashflows 구성
      const cashflows = [{ tYears: 0, amount: -inAmt }];
      let totalOut = 0;
      let lastOutDate = withdrawals[0].outDate;

      const detailRows = withdrawals.map(w => {
        const days = diffDays(inDate, w.outDate);
        const tYears = days / 365;
        cashflows.push({ tYears, amount: w.outAmt });
        totalOut += w.outAmt;
        if (new Date(w.outDate) > new Date(lastOutDate)) {
          lastOutDate = w.outDate;
        }
        return {
          outDate: w.outDate,
          outAmt: w.outAmt,
          days
        };
      });

      // IRR 계산 (금융위 방식)
      const irr = calcIRR(cashflows) || 0;

      // 전체 이용기간: 입금일자 → 마지막 출금일자
      const totalDays = diffDays(inDate, lastOutDate);

      // 결과테이블 행 추가
      const trRes = document.createElement("tr");
      trRes.dataset.no = no;
      trRes.innerHTML = `
        <td>${no}</td>
        <td>${inDate}</td>
        <td>${inAmt.toLocaleString()}원</td>
        <td>${lastOutDate}</td>
        <td>${totalOut.toLocaleString()}원</td>
        <td>${totalDays != null ? totalDays + "일" : ""}</td>
        <td>${(irr * 100).toFixed(2)}%</td>
        <td><button type="button" onclick="toggleDetailBlock('detail-${no}-${idx}')">상세</button></td>
      `;
      resultBody.appendChild(trRes);

      // 상세내역용 데이터 저장 (출금별 이용기간 + 동일 IRR 표시)
      allDetails.push({
        id: `detail-${no}-${idx}`,
        no,
        inDate,
        inAmt,
        totalDays,
        irr,
        withdrawals: detailRows
      });
    });
  });

  // 4) NO별 소계 + 필터링
  const subtotalArea = document.getElementById("subtotalArea");
  if (subtotalArea) {
    let html = "";
    Object.keys(groups).forEach(no => {
      const g = groups[no];
      html += `
        <div class="subtotal-box" onclick="toggleGroup('${no}', event)">
          <b>NO ${no}</b>
          <span style="margin-left:8px;">입금: ${g.subtotalIn.toLocaleString()}원</span>
          <span style="margin-left:8px;">출금: ${g.subtotalOut.toLocaleString()}원</span>
          <span style="float:right;">▼</span>
        </div>
      `;
    });
    subtotalArea.innerHTML = html;
  }

  // 5) 총합
  const totalIn = document.getElementById("totalIn");
  const totalOut = document.getElementById("totalOut");
  if (totalIn) totalIn.textContent = grandIn.toLocaleString();
  if (totalOut) totalOut.textContent = grandOut.toLocaleString();

  // 6) 상세내역 데이터 저장
  if (detailArea) {
    detailArea.dataset.details = JSON.stringify(allDetails);
  }
}

/******************************************************
 *  NO별 필터링 (소계 클릭)
 ******************************************************/
let currentFilterNo = null;

function toggleGroup(no, event) {
  event.stopPropagation();
  const rows = document.querySelectorAll("#resultTable tbody tr");

  if (currentFilterNo === no) {
    rows.forEach(tr => {
      tr.style.display = "";
    });
    currentFilterNo = null;
    return;
  }

  currentFilterNo = no;
  rows.forEach(tr => {
    const rowNo = tr.dataset.no || tr.querySelector("td")?.textContent.trim() || "";
    tr.style.display = rowNo === no ? "" : "none";
  });
}

/******************************************************
 *  상세내역 표시 (출금 기준, IRR 동일)
 ******************************************************/
function toggleDetailBlock(detailId) {
  const detailArea = document.getElementById("detailArea");
  if (!detailArea) return;

  // 항상 현재 상세만 표시
  detailArea.innerHTML = "";

  const details = JSON.parse(detailArea.dataset.details || "[]");
  const data = details.find(d => d.id === detailId);
  if (!data) return;

  const wrapper = document.createElement("div");
  wrapper.id = detailId;
  wrapper.className = "detail-block";

  wrapper.innerHTML = `
    <h4>상세내역 (NO ${data.no}, 입금 ${data.inAmt.toLocaleString()}원)</h4>

    <table class="detail-table">
      <thead>
        <tr>
          <th>입금일자</th>
          <th>입금금액</th>
          <th>전체 이용기간(일)</th>
          <th>연이자율(복리, IRR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${data.inDate}</td>
          <td>${data.inAmt.toLocaleString()}원</td>
          <td>${data.totalDays}일</td>
          <td>${(data.irr * 100).toFixed(2)}%</td>
        </tr>
      </tbody>
    </table>

    <table class="detail-table">
      <thead>
        <tr>
          <th>출금일자</th>
          <th>출금금액</th>
          <th>이용기간(입금→출금)</th>
          <th>연이자율(복리, IRR)</th>
        </tr>
      </thead>
      <tbody>
        ${
          data.withdrawals
            .map(
              w => `
          <tr>
            <td>${w.outDate}</td>
            <td>${w.outAmt.toLocaleString()}원</td>
            <td>${w.days}일</td>
            <td>${(data.irr * 100).toFixed(2)}%</td>
          </tr>
        `
            )
            .join("")
        }
      </tbody>
    </table>
  `;

  detailArea.appendChild(wrapper);
}

/******************************************************
 *  엑셀 다운로드 (결과테이블 기준)
 ******************************************************/
function cfExportExcel() {
  const table = document.getElementById("resultTable");
  if (!table) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, "연이자율_결과");
  XLSX.writeFile(wb, "compound_interest_result.xlsx");
}

/******************************************************
 *  PDF 다운로드 (결과테이블 기준)
 ******************************************************/
function cfExportPDF() {
  const table = document.getElementById("resultTable");
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
      row.push(td.textContent.trim());
    });
    body.push(row);
  });

  doc.autoTable({
    head: [head],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 40, 40] }
  });

  doc.save("compound_interest_result.pdf");
}

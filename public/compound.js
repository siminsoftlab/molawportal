/******************************************************
 *  날짜/이자 유틸
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

function diffDays(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  if (!a || !b || isNaN(da) || isNaN(db)) return 0;
  return Math.max(1, Math.floor((db - da) / (1000 * 60 * 60 * 24)));
}

function calcNormalInterest(principal, rate, days) {
  if (principal <= 0 || rate <= 0 || days <= 0) return 0;
  return principal * rate * (days / 365);
}

function calcLateInterest(unpaid, rate, days) {
  if (unpaid <= 0 || rate <= 0 || days <= 0) return 0;
  return unpaid * rate * (days / 365);
}

function calcYieldAnnual(inAmt, totalOut, totalDays) {
  if (inAmt <= 0 || totalOut <= 0 || totalDays <= 0) return 0;
  const periodRate = (totalOut - inAmt) / inAmt;
  return periodRate * (365 / totalDays);
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
 *  입력 테이블 로드
 ******************************************************/
function cfLoadData(rows) {
  const tbody = document.querySelector("#cfTable tbody");
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    if (idx === 0) return;

    const no = r[0] || "";
    const inDate = typeof r[1] === "number" ? excelDateToYMD(r[1]) : (r[1] || "");
    const inAmt = r[2] || "";
    const outDate = typeof r[3] === "number" ? excelDateToYMD(r[3]) : (r[3] || "");
    const outAmt = r[4] || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="number" class="no" value="${no}"></td>
      <td><input type="date" class="inDate" value="${inDate}"></td>
      <td><input type="number" class="inAmt" value="${inAmt}"></td>
      <td><input type="date" class="outDate" value="${outDate}"></td>
      <td><input type="number" class="outAmt" value="${outAmt}"></td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelector("#resultTable tbody").innerHTML = "";
  document.querySelector("#detailArea").innerHTML = "";
}

/******************************************************
 *  메인 계산 — 입금 기준 FIFO + 결과테이블
 ******************************************************/
let globalDetails = [];

function cfCalculate() {
  const normalRate = Number(document.getElementById("annualRate").value || 0) / 100;
  const lateRate = Number(document.getElementById("lateRate").value || 0) / 100;

  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"))
    .map((tr, idx) => ({
      rowId: idx,
      no: tr.querySelector(".no").value,
      inDate: tr.querySelector(".inDate").value,
      inAmt: Number(tr.querySelector(".inAmt").value || 0),
      outDate: tr.querySelector(".outDate").value,
      outAmt: Number(tr.querySelector(".outAmt").value || 0)
    }))
    .filter(r => r.no && (r.inAmt > 0 || r.outAmt > 0));

  // 입금/출금 분리
  const deposits = rows
    .filter(r => r.inAmt > 0 && r.inDate)
    .sort((a, b) => new Date(a.inDate) - new Date(b.inDate));

  const withdrawals = rows
    .filter(r => r.outAmt > 0 && r.outDate)
    .sort((a, b) => new Date(a.outDate) - new Date(b.outDate));

  const results = [];

  deposits.forEach((dep, idx) => {
    const startDate = new Date(dep.inDate);
    const nextDep = deposits[idx + 1];
    const endDate = nextDep ? new Date(nextDep.inDate) : null;

    // 이 입금이 담당하는 "날짜 구간"의 출금들
    const intervalWithdrawals = withdrawals.filter(w => {
      const dw = new Date(w.outDate);
      return dw >= startDate && (!endDate || dw < endDate);
    });

    let principal = dep.inAmt;
    let unpaid = 0;
    let lastDate = dep.inDate;

    const detailRows = [];
    let totalDays = 0;

    intervalWithdrawals.forEach(w => {
      const days = diffDays(lastDate, w.outDate);
      const normalInterest = calcNormalInterest(principal, normalRate, days);
      const lateInterest = calcLateInterest(unpaid, lateRate, days);

      // 이 입금이 이 출금에서 실제로 부담하는 금액 (원금제한 FIFO)
      const burdenAmt = Math.min(principal, w.outAmt);

      let afterOut = burdenAmt;
      afterOut -= normalInterest;
      afterOut -= lateInterest;

      principal -= Math.max(0, afterOut);
      if (principal < 0) {
        unpaid += Math.abs(principal);
        principal = 0;
      }

      detailRows.push({
        outDate: w.outDate,
        outAmtOriginal: w.outAmt, // 출금 원본 금액
        burdenAmt,                // 이 입금이 실제 부담한 금액
        days
      });

      lastDate = w.outDate;
      totalDays += days;
    });

    // 결과테이블용 출금합계: 구간 내 출금 "원본" 합계
    const totalOut = intervalWithdrawals.reduce((s, w) => s + w.outAmt, 0);

    // 전체 이용기간: 입금일 ~ 마지막 출금일 차이 (출금 없으면 0)
    let totalPeriodDays = 0;
    let lastOutDate = "-";
    if (intervalWithdrawals.length > 0) {
      lastOutDate = intervalWithdrawals[intervalWithdrawals.length - 1].outDate;
      totalPeriodDays = diffDays(dep.inDate, lastOutDate);
    }

    // 연이자율: 입금금액, 출금합계, 전체 이용기간 기준
    const annualYield = calcYieldAnnual(dep.inAmt, totalOut, totalPeriodDays);

    results.push({
      no: dep.no,
      inDate: dep.inDate,
      inAmt: dep.inAmt,
      outDate: lastOutDate,
      totalOut,
      totalDays: totalPeriodDays,
      annualYield,
      detailRows
    });
  });

  // 정렬
  results.sort((a, b) => {
    if (a.no !== b.no) return Number(a.no) - Number(b.no);
    if (a.inDate !== b.inDate) return new Date(a.inDate) - new Date(b.inDate);

    if (a.outDate === "-" && b.outDate !== "-") return 1;
    if (a.outDate !== "-" && b.outDate === "-") return -1;
    if (a.outDate !== "-" && b.outDate !== "-")
      return new Date(a.outDate) - new Date(b.outDate);

    return 0;
  });

  globalDetails = results;
  renderResults(results);
}

/******************************************************
 *  결과테이블 렌더링
 ******************************************************/
function renderResults(results) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  results.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.no}</td>
      <td>${r.inDate}</td>
      <td>${r.inAmt.toLocaleString()}원</td>
      <td>${r.outDate}</td>
      <td>${r.totalOut.toLocaleString()}원</td>
      <td>${r.totalDays ? r.totalDays + "일" : "-"}</td>
      <td>${r.totalDays ? (r.annualYield * 100).toFixed(2) + "%" : "-"}</td>
      <td><button onclick="showDetail('${r.no}','${r.inDate}')">상세</button></td>
    `;
    tbody.appendChild(tr);
  });
}

/******************************************************
 *  상세내역 렌더링 (입금 기준, 출금 원본 + 이 입금이 부담한 금액)
 ******************************************************/
function showDetail(no, inDate) {
  const data = globalDetails.find(d => d.no == no && d.inDate == inDate);
  const area = document.querySelector("#detailArea");
  area.innerHTML = "";

  if (!data) return;

  let html = `
    <h3>상세내역 (NO ${data.no}, 입금 ${data.inAmt.toLocaleString()}원)</h3>
    <table class="detail-table">
      <tr><th>입금일자</th><td>${data.inDate}</td></tr>
      <tr><th>입금금액</th><td>${data.inAmt.toLocaleString()}원</td></tr>
      <tr><th>전체 이용기간</th><td>${data.totalDays}일</td></tr>
      <tr><th>입금대비 출금 연이자율</th><td>${(data.annualYield * 100).toFixed(2)}%</td></tr>
    </table>

    <h4>출금 내역 (출금 원본 + 이 입금이 부담한 금액)</h4>
    <table class="detail-table">
      <thead>
        <tr>
          <th>출금일자</th>
          <th>출금금액(원본)</th>
          <th>이 입금이 부담한 금액</th>
          <th>이용기간(일)</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.detailRows.forEach(w => {
    html += `
      <tr>
        <td>${w.outDate}</td>
        <td>${w.outAmtOriginal.toLocaleString()}원</td>
        <td>${w.burdenAmt.toLocaleString()}원</td>
        <td>${w.days}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  area.innerHTML = html;
}

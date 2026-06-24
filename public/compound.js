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
 *  메인 계산 — 상세(FIFO) + 결과(FIFO 요약)
 ******************************************************/
function cfCalculate() {
  const normalRate = Number(document.getElementById("annualRate").value || 0) / 100;
  const lateRate = Number(document.getElementById("lateRate").value || 0) / 100;

  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"))
    .map(tr => ({
      no: tr.querySelector(".no").value,
      inDate: tr.querySelector(".inDate").value,
      inAmt: Number(tr.querySelector(".inAmt").value || 0),
      outDate: tr.querySelector(".outDate").value,
      outAmt: Number(tr.querySelector(".outAmt").value || 0)
    }))
    .filter(r => r.no && (r.inAmt > 0 || r.outAmt > 0));

  rows.sort((a, b) => {
    const da = a.inDate || a.outDate;
    const db = b.inDate || b.outDate;
    return new Date(da) - new Date(db);
  });

  const fifoQueue = [];
  const depositRecords = [];
  const detailList = [];

  /*************** 상세내역(FIFO) 생성 ***************/
  rows.forEach(r => {
    if (r.inAmt > 0 && r.inDate) {
      const dep = {
        no: r.no,
        inDate: r.inDate,
        inAmt: r.inAmt,
        principal: r.inAmt,
        unpaid: 0,
        lastDate: r.inDate,
        withdrawals: []
      };
      fifoQueue.push(dep);
      depositRecords.push(dep);
    }

    if (r.outAmt > 0 && r.outDate) {
      let remainOut = r.outAmt;

      while (remainOut > 0 && fifoQueue.length > 0) {
        const dep = fifoQueue[0];
        const assign = Math.min(remainOut, dep.principal);

        if (assign <= 0) break;

        const days = diffDays(dep.lastDate, r.outDate);
        const normalInterest = calcNormalInterest(dep.principal, normalRate, days);
        const lateInterest = calcLateInterest(dep.unpaid, lateRate, days);

        let afterOut = assign;
        afterOut -= normalInterest;
        afterOut -= lateInterest;

        dep.principal -= Math.max(0, afterOut);
        if (dep.principal < 0) {
          dep.unpaid += Math.abs(dep.principal);
          dep.principal = 0;
        }

        dep.withdrawals.push({
          outDate: r.outDate,
          outAmt: assign,
          days,
          normalInterest,
          lateInterest,
          principalAfter: dep.principal,
          unpaidAfter: dep.unpaid
        });

        dep.lastDate = r.outDate;
        remainOut -= assign;

        if (dep.principal <= 0 && dep.unpaid === 0) {
          fifoQueue.shift();
        }
      }
    }
  });

  /*************** 결과테이블 생성 (FIFO 요약) ***************/
  const results = depositRecords.map(dep => {
    const totalOut = dep.withdrawals.reduce((s, w) => s + w.outAmt, 0);
    const lastOutDate = dep.withdrawals.length > 0 ? dep.withdrawals.at(-1).outDate : "-";
    const totalDays = dep.withdrawals.reduce((s, w) => s + w.days, 0);
    const annualYield = calcYieldAnnual(dep.inAmt, totalOut, totalDays);

    detailList.push({
      no: dep.no,
      inDate: dep.inDate,
      inAmt: dep.inAmt,
      totalDays,
      annualYield,
      withdrawals: dep.withdrawals
    });

    return {
      no: dep.no,
      inDate: dep.inDate,
      inAmt: dep.inAmt,
      outDate: lastOutDate,
      totalOut,
      totalDays,
      annualYield
    };
  });

  /*************** 결과테이블 정렬 ***************/
  results.sort((a, b) => {
    if (a.no !== b.no) return Number(a.no) - Number(b.no);
    if (a.inDate !== b.inDate) return new Date(a.inDate) - new Date(b.inDate);

    if (a.outDate === "-" && b.outDate !== "-") return 1;
    if (a.outDate !== "-" && b.outDate === "-") return -1;
    if (a.outDate !== "-" && b.outDate !== "-")
      return new Date(a.outDate) - new Date(b.outDate);

    return 0;
  });

  renderResults(results);
  renderDetails(detailList);
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
 *  상세내역 렌더링 (FIFO)
 ******************************************************/
let globalDetails = [];

function renderDetails(list) {
  globalDetails = list;
}

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

    <h4>출금·이자·잔액 내역 (FIFO)</h4>
    <table class="detail-table">
      <thead>
        <tr>
          <th>출금일자</th>
          <th>출금금액</th>
          <th>이용기간(일)</th>
          <th>정상이자</th>
          <th>지연이자</th>
          <th>출금 후 잔액</th>
          <th>미납원금</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.withdrawals.forEach(w => {
    html += `
      <tr>
        <td>${w.outDate}</td>
        <td>${w.outAmt.toLocaleString()}원</td>
        <td>${w.days}</td>
        <td>${Math.round(w.normalInterest).toLocaleString()}원</td>
        <td>${Math.round(w.lateInterest).toLocaleString()}원</td>
        <td>${Math.round(w.principalAfter).toLocaleString()}원</td>
        <td>${Math.round(w.unpaidAfter).toLocaleString()}원</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  area.innerHTML = html;
}

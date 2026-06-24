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
 *  메인 계산 — FIFO(계산용) + 상세(출금원본 기준) + 결과테이블
 ******************************************************/
let globalDetails = [];

function cfCalculate() {
  const normalRate = Number(document.getElementById("annualRate").value || 0) / 100;
  const lateRate = Number(document.getElementById("lateRate").value || 0) / 100;

  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"))
    .map((tr, idx) => ({
      rowId: idx, // 출금 원본 식별용
      no: tr.querySelector(".no").value,
      inDate: tr.querySelector(".inDate").value,
      inAmt: Number(tr.querySelector(".inAmt").value || 0),
      outDate: tr.querySelector(".outDate").value,
      outAmt: Number(tr.querySelector(".outAmt").value || 0)
    }))
    .filter(r => r.no && (r.inAmt > 0 || r.outAmt > 0));

  // 전체 행 날짜 기준 정렬
  rows.sort((a, b) => {
    const da = a.inDate || a.outDate;
    const db = b.inDate || b.outDate;
    return new Date(da) - new Date(db);
  });

  const fifoQueue = [];
  const depositRecords = [];
  const detailList = [];

  // 출금 원본 목록 (출금일자/금액/rowId)
  const allWithdrawals = rows
    .filter(r => r.outAmt > 0 && r.outDate)
    .map(r => ({
      rowId: r.rowId,
      outDate: r.outDate,
      outAmt: r.outAmt
    }))
    .sort((a, b) => new Date(a.outDate) - new Date(b.outDate));

  /*************** 1) FIFO 계산 (계산용, 원금제한) ***************/
  rows.forEach(r => {
    // 입금
    if (r.inAmt > 0 && r.inDate) {
      const dep = {
        no: r.no,
        inDate: r.inDate,
        inAmt: r.inAmt,
        principal: r.inAmt,
        unpaid: 0,
        lastDate: r.inDate,
        // FIFO 배분 결과 (출금 쪼개진 단위)
        fifoAssignments: []
      };
      fifoQueue.push(dep);
      depositRecords.push(dep);
    }

    // 출금
    if (r.outAmt > 0 && r.outDate) {
      let remainOut = r.outAmt;

      while (remainOut > 0 && fifoQueue.length > 0) {
        const dep = fifoQueue[0];
        const assign = Math.min(remainOut, dep.principal); // 원금제한 FIFO

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

        // 이 입금이 이 출금(rowId)에서 부담한 금액(assign)을 기록
        dep.fifoAssignments.push({
          rowId: r.rowId,          // 출금 원본 식별자
          outDate: r.outDate,
          outAmtAssigned: assign,  // 이 입금이 부담한 금액
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

  /*************** 2) 입금 기준 상세(출금 원본 + 이 입금이 부담한 금액) 재구성 ***************/
  const detailByDeposit = depositRecords.map(dep => {
    // 이 입금이 부담한 출금들을 출금 원본(rowId) 기준으로 묶기
    const mapByRow = new Map();

    dep.fifoAssignments.forEach(a => {
      if (!mapByRow.has(a.rowId)) {
        mapByRow.set(a.rowId, {
          rowId: a.rowId,
          outDate: a.outDate,
          burdenAmt: 0,
          // 이용기간은 같은 출금에 대해 여러 번 나뉘어도 보통 동일하므로 하나만 사용
          days: a.days
        });
      }
      const item = mapByRow.get(a.rowId);
      item.burdenAmt += a.outAmtAssigned;
    });

    // 출금 원본 정보와 합치기 (출금금액은 원본 그대로)
    const detailRows = [];
    mapByRow.forEach(item => {
      const origin = allWithdrawals.find(w => w.rowId === item.rowId);
      if (!origin) return;
      detailRows.push({
        outDate: item.outDate,
        outAmtOriginal: origin.outAmt, // 출금 원본 금액
        burdenAmt: item.burdenAmt,     // 이 입금이 실제 부담한 금액
        days: item.days
      });
    });

    // 출금일자 순 정렬
    detailRows.sort((a, b) => new Date(a.outDate) - new Date(b.outDate));

    // 이 입금 기준 이용기간 합계 (FIFO days 합)
    const totalDays = detailRows.reduce((s, w) => s + w.days, 0);

    return {
      no: dep.no,
      inDate: dep.inDate,
      inAmt: dep.inAmt,
      totalDays,
      detailRows
    };
  });

  /*************** 3) 결과테이블 계산 ***************/
  // 입금 목록 정렬 (결과테이블 기준)
  const depositsForResult = [...detailByDeposit].sort(
    (a, b) => new Date(a.inDate) - new Date(b.inDate)
  );

  const results = depositsForResult.map((dep, idx) => {
    // 3-1) 입금 기준 출금합계: [입금일 ~ 다음 입금일 전] 출금 원본 합계
    const startDate = new Date(dep.inDate);
    const nextDep = depositsForResult[idx + 1];
    const endDate = nextDep ? new Date(nextDep.inDate) : null;

    const totalOutByDeposit = allWithdrawals.reduce((sum, w) => {
      const dw = new Date(w.outDate);
      if (dw >= startDate && (!endDate || dw < endDate)) {
        return sum + w.outAmt;
      }
      return sum;
    }, 0);

    // 3-2) 이용기간 = 이 입금의 FIFO 상세 days 합
    const totalDays = dep.totalDays;

    // 3-3) 연이자율 = 입금금액, 출금합계, 이용기간으로 계산
    const annualYield = calcYieldAnnual(dep.inAmt, totalOutByDeposit, totalDays);

    // 3-4) 마지막 출금일자 = 해당 구간의 마지막 출금일
    let lastOutDate = "-";
    for (let i = allWithdrawals.length - 1; i >= 0; i--) {
      const dw = new Date(allWithdrawals[i].outDate);
      if (dw >= startDate && (!endDate || dw < endDate)) {
        lastOutDate = allWithdrawals[i].outDate;
        break;
      }
    }

    return {
      no: dep.no,
      inDate: dep.inDate,
      inAmt: dep.inAmt,
      outDate: lastOutDate,
      totalOut: totalOutByDeposit,
      totalDays,
      annualYield,
      detailRows: dep.detailRows
    };
  });

  /*************** 4) 결과테이블 정렬 ***************/
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

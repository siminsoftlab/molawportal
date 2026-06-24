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
 *  전역 상세 저장
 ******************************************************/
let globalDetails = [];

/******************************************************
 *  메인 계산 — 전체 FIFO + 입금 기준 상세 + 결과테이블
 ******************************************************/
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

  if (rows.length === 0) return;

  /*************** 1) 입금/출금 분리 및 정렬 ***************/
  let depSeq = 0;
  const deposits = rows
    .filter(r => r.inAmt > 0 && r.inDate)
    .sort((a, b) => new Date(a.inDate) - new Date(b.inDate))
    .map(d => ({
      depId: depSeq++,
      no: d.no,
      inDate: d.inDate,
      inAmt: d.inAmt,
      principal: d.inAmt,
      unpaid: 0,
      lastDate: d.inDate
    }));

  const withdrawals = rows
    .filter(r => r.outAmt > 0 && r.outDate)
    .sort((a, b) => new Date(a.outDate) - new Date(b.outDate))
    .map(w => ({
      rowId: w.rowId,
      outDate: w.outDate,
      outAmt: w.outAmt
    }));

  if (deposits.length === 0) return;

  deposits.sort((a, b) => new Date(a.inDate) - new Date(b.inDate));
  for (let i = 0; i < deposits.length; i++) {
    deposits[i].nextInDate = i < deposits.length - 1 ? deposits[i + 1].inDate : null;
  }

  /*************** 2) 전체 FIFO 계산 ***************/
  const fifoAssignments = [];

  withdrawals.forEach(w => {
    let remainOut = w.outAmt;

    while (remainOut > 0) {
      const dep = deposits.find(d => d.principal > 0 || d.unpaid > 0);
      if (!dep) break;

      const days = diffDays(dep.lastDate, w.outDate);
      const normalInterest = calcNormalInterest(dep.principal, normalRate, days);
      const lateInterest = calcLateInterest(dep.unpaid, lateRate, days);

      const possible = dep.principal;
      const assign = Math.min(remainOut, possible);

      if (assign <= 0) {
        dep.lastDate = w.outDate;
        break;
      }

      let afterOut = assign;
      afterOut -= normalInterest;
      afterOut -= lateInterest;

      dep.principal -= Math.max(0, afterOut);
      if (dep.principal < 0) {
        dep.unpaid += Math.abs(dep.principal);
        dep.principal = 0;
      }

      fifoAssignments.push({
        depId: dep.depId,
        rowId: w.rowId,
        outDate: w.outDate,
        outAmtOriginal: w.outAmt,
        days,
        assign
      });

      dep.lastDate = w.outDate;
      remainOut -= assign;
    }
  });

  /*************** 3) 입금 기준 상세 재조립 ***************/
  const detailByDeposit = buildDetailByDeposit(deposits, withdrawals, fifoAssignments);

  /*************** 4) 결과테이블 계산 (첫 출금일자 + 금액 표시) ***************/
  const results = deposits.map(dep => {
    const detail = detailByDeposit.find(d => d.depId === dep.depId);
    const burdened = detail.detailRows.filter(r => r.burdenAmt > 0);

    let firstOutDate = "-";
    let firstOutAmt = 0;
    if (burdened.length > 0) {
      firstOutDate = burdened[0].outDate;
      firstOutAmt = burdened[0].burdenAmt;
    }

    const burdenDays = burdened.reduce((s, r) => s + r.days, 0);
    const annualYield = calcYieldAnnual(dep.inAmt, firstOutAmt, burdenDays);

    return {
      depId: dep.depId,
      no: dep.no,
      inDate: dep.inDate,
      inAmt: dep.inAmt,
      outDate: firstOutDate,
      totalOut: firstOutAmt,
      totalDays: burdenDays,
      annualYield,
      detailRows: detail.detailRows
    };
  });
} // ← cfCalculate 함수 닫기
// compound.js 맨 아래에 추가
window.cfReadExcel = cfReadExcel;
window.cfParseCSV = cfParseCSV;
window.cfAddRow = cfAddRow;
window.cfCalculate = cfCalculate;
window.cfExportExcel = cfExportExcel;
window.cfExportPDF = cfExportPDF;

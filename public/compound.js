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

function calcLateInterest(principal, rate, days) {
  if (principal <= 0 || rate <= 0 || days <= 0) return 0;
  return principal * rate * (days / 365);
}

// 입금이 있을 때 연이자율: (입금반영금액 - 입금금액) / 입금금액 * (365 / 이용일수)
function calcAnnualYieldDeposit(inAmt, appliedAmt, days) {
  if (inAmt <= 0 || appliedAmt <= 0 || days <= 0) return 0;
  const periodRate = (appliedAmt - inAmt) / inAmt;
  return periodRate * (365 / days) * 100;
}

// 입금 없음 구간 연이자율: (출금금액 - 초과분) / 초과분 * (365 / 이용일수)
function calcAnnualYieldExcess(excessBase, outAmt, days) {
  if (excessBase <= 0 || outAmt <= 0 || days <= 0) return 0;
  const periodRate = (outAmt - excessBase) / excessBase;
  return periodRate * (365 / days) * 100;
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
 *  업로드 열: NO, 입금일자, 입금금액, 상환일자, 출금일자, 출금금액
 ******************************************************/
function cfLoadData(rows) {
  const tbody = document.querySelector("#cfTable tbody");
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    if (idx === 0) return;

    const no = r[0] || "";
    const inDate = typeof r[1] === "number" ? excelDateToYMD(r[1]) : (r[1] || "");
    const inAmt = r[2] || "";
    const repayDate = typeof r[3] === "number" ? excelDateToYMD(r[3]) : (r[3] || "");
    const outDate = typeof r[4] === "number" ? excelDateToYMD(r[4]) : (r[4] || "");
    const outAmt = r[5] || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="number" class="no" value="${no}"></td>
      <td><input type="date" class="inDate" value="${inDate}"></td>
      <td><input type="number" class="inAmt" value="${inAmt}"></td>
      <td><input type="date" class="repayDate" value="${repayDate}"></td>
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
 *  메인 계산 — 입금/출금 매칭 + 이자 + 상세화면
 ******************************************************/
function cfCalculate() {
  const normalRate = Number(document.getElementById("annualRate")?.value || 0) / 100;
  const lateRate = Number(document.getElementById("lateRate")?.value || 0) / 100;

  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"))
    .map((tr, idx) => ({
      rowId: idx,
      no: tr.querySelector(".no")?.value || "",
      inDate: tr.querySelector(".inDate")?.value || "",
      inAmt: Number(tr.querySelector(".inAmt")?.value || 0),
      repayDate: tr.querySelector(".repayDate")?.value || "",
      outDate: tr.querySelector(".outDate")?.value || "",
      outAmt: Number(tr.querySelector(".outAmt")?.value || 0)
    }))
    .filter(r => r.no && (r.inAmt > 0 || r.outAmt > 0));

  if (!rows.length) return;

  const deposits = rows
    .filter(r => r.inAmt > 0 && r.inDate)
    .sort((a, b) => new Date(a.inDate) - new Date(b.inDate));

  const withdrawals = rows
    .filter(r => r.outAmt > 0 && r.outDate)
    .sort((a, b) => new Date(a.outDate) - new Date(b.outDate));

  if (!withdrawals.length) return;

  const detailRows = [];
  let depIdx = 0;
  let carryExcess = 0;
  let lastDepDate = null;

  withdrawals.forEach(w => {
    // 1) 초과분이 남아 있으면 입금 없음 구간 처리
    if (carryExcess > 0) {
      const totalOut = carryExcess + w.outAmt;
      const days = lastDepDate ? diffDays(lastDepDate, w.outDate) : 0;
      const annualYield = calcAnnualYieldExcess(carryExcess, totalOut, days);

      detailRows.push({
        inDate: "",
        inAmt: 0,
        outDate: w.outDate,
        outAmt: totalOut,
        normalInterest: 0,
        lateInterest: 0,
        appliedAmt: totalOut,
        appliedAfterAmt: totalOut,
        excess: 0,
        closed: "종결",
        days,
        annualYield
      });

      carryExcess = 0;
      return;
    }

    // 2) 입금이 남아 있으면 해당 입금건으로 매칭
    const dep = deposits[depIdx];
    if (dep && new Date(dep.inDate) <= new Date(w.outDate)) {
      const normalDays = dep.repayDate
        ? Math.max(0, diffDays(dep.inDate, dep.repayDate))
        : 0;
      const lateDays = dep.repayDate
        ? Math.max(0, diffDays(dep.repayDate, w.outDate))
        : 0;

      const normalInterest = calcNormalInterest(dep.inAmt, normalRate, normalDays);
      const lateInterest = calcLateInterest(dep.inAmt, lateRate, lateDays);
      const interestTotal = normalInterest + lateInterest;

      let appliedAmt = w.outAmt - interestTotal;
      if (appliedAmt < 0) appliedAmt = 0;

      const appliedAfterAmt = appliedAmt - dep.inAmt;
      const excess = appliedAfterAmt > 0 ? appliedAfterAmt : 0;

      const totalDays = diffDays(dep.inDate, w.outDate);
      const annualYield = calcAnnualYieldDeposit(dep.inAmt, appliedAmt, totalDays);

      detailRows.push({
        inDate: dep.inDate,
        inAmt: dep.inAmt,
        outDate: w.outDate,
        outAmt: w.outAmt,
        normalInterest,
        lateInterest,
        appliedAmt,
        appliedAfterAmt,
        excess,
        closed: excess > 0 ? "종결" : "미결",
        days: totalDays,
        annualYield
      });

      lastDepDate = dep.inDate;
      depIdx++;
      carryExcess = excess;
    } else {
      // 3) 더 이상 입금이 없으면 입금 없음 구간
      detailRows.push({
        inDate: "",
        inAmt: 0,
        outDate: w.outDate,
        outAmt: w.outAmt,
        normalInterest: 0,
        lateInterest: 0,
        appliedAmt: w.outAmt,
        appliedAfterAmt: w.outAmt,
        excess: 0,
        closed: "종결",
        days: 0,
        annualYield: 0
      });
    }
  });

  globalDetails = detailRows;

  /******************************************************
   *  결과 테이블 (요약)
   ******************************************************/
  const resultTbody = document.querySelector("#resultTable tbody");
  if (resultTbody) {
    resultTbody.innerHTML = "";
    detailRows.forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${r.inDate || ""}</td>
        <td>${r.inAmt ? r.inAmt.toLocaleString() : ""}</td>
        <td>${r.outDate}</td>
        <td>${r.outAmt.toLocaleString()}</td>
        <td>${r.days ? r.days + "일" : ""}</td>
        <td>${r.annualYield ? r.annualYield.toFixed(4) : ""}</td>
        <td><button type="button" onclick="showDetail(${idx})">상세</button></td>
      `;
      resultTbody.appendChild(tr);
    });
  }

  /******************************************************
   *  상세화면 테이블
   ******************************************************/
  const detailArea = document.querySelector("#detailArea");
  if (detailArea) {
    detailArea.innerHTML = `
      <table class="cf-table">
        <thead>
          <tr>
            <th>입금일자</th>
            <th>입금금액</th>
            <th>출금일자</th>
            <th>출금금액</th>
            <th>정상이자금액</th>
            <th>연체이자금액</th>
            <th>입금반영금액</th>
            <th>입금반영후금액</th>
            <th>초과분</th>
            <th>종결여부</th>
            <th>이용기간</th>
            <th>연이자율</th>
          </tr>
        </thead>
        <tbody>
          ${detailRows
            .map(r => `
              <tr>
                <td>${r.inDate || ""}</td>
                <td>${r.inAmt ? r.inAmt.toLocaleString() : ""}</td>
                <td>${r.outDate}</td>
                <td>${r.outAmt.toLocaleString()}</td>
                <td>${r.normalInterest ? Math.round(r.normalInterest).toLocaleString() : ""}</td>
                <td>${r.lateInterest ? Math.round(r.lateInterest).toLocaleString() : ""}</td>
                <td>${Math.round(r.appliedAmt).toLocaleString()}</td>
                <td>${Math.round(r.appliedAfterAmt).toLocaleString()}</td>
                <td>${r.excess ? Math.round(r.excess).toLocaleString() : ""}</td>
                <td>${r.closed}</td>
                <td>${r.days ? r.days + "일" : ""}</td>
                <td>${r.annualYield ? r.annualYield.toFixed(4) : ""}</td>
              </tr>
            `)
            .join("")}
        </tbody>
      </table>
    `;
  }
}

/******************************************************
 *  행 추가
 ******************************************************/
function cfAddRow() {
  const tbody = document.querySelector("#cfTable tbody");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><input type="number" class="no" value=""></td>
    <td><input type="date" class="inDate" value=""></td>
    <td><input type="number" class="inAmt" value=""></td>
    <td><input type="date" class="repayDate" value=""></td>
    <td><input type="date" class="outDate" value=""></td>
    <td><input type="number" class="outAmt" value=""></td>
  `;

  tbody.appendChild(tr);
}

/******************************************************
 *  상세 버튼
 ******************************************************/
function showDetail(idx) {
  const r = globalDetails[idx];
  if (!r) return;
  const msg = [
    `입금일자: ${r.inDate || "입금 없음"}`,
    `입금금액: ${r.inAmt ? r.inAmt.toLocaleString() + "원" : "-"}`,
    `출금일자: ${r.outDate}`,
    `출금금액: ${r.outAmt.toLocaleString()}원`,
    `정상이자금액: ${r.normalInterest ? Math.round(r.normalInterest).toLocaleString() + "원" : "-"}`,
    `연체이자금액: ${r.lateInterest ? Math.round(r.lateInterest).toLocaleString() + "원" : "-"}`,
    `입금반영금액: ${Math.round(r.appliedAmt).toLocaleString()}원`,
    `입금반영후금액: ${Math.round(r.appliedAfterAmt).toLocaleString()}원`,
    `초과분: ${r.excess ? Math.round(r.excess).toLocaleString() + "원" : "0원"}`,
    `종결여부: ${r.closed}`,
    `이용기간: ${r.days ? r.days + "일" : "-"}`,
    `연이자율: ${r.annualYield ? r.annualYield.toFixed(4) + "%" : "-"}`
  ].join("\n");
  alert(msg);
}

/******************************************************
 *  export to window
 ******************************************************/
window.cfReadExcel = cfReadExcel;
window.cfAddRow = cfAddRow;
window.cfCalculate = cfCalculate;
window.showDetail = showDetail;

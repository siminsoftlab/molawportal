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
 *  형식: NO,입금일자,입금금액,상환일자,출금일자,출금금액
 ******************************************************/
function cfParseCSV() {
  const text = document.getElementById("csvInput").value.trim();
  if (!text) return;

  const lines = text.split(/\r?\n/);
  const rows = [];
  lines.forEach((line, idx) => {
    const cols = line.split(",").map(c => c.trim());
    if (cols.length < 6) return;
    if (idx === 0 && cols[0] === "NO") return; // 헤더 스킵

    rows.push([
      cols[0], // NO
      cols[1], // 입금일자
      cols[2], // 입금금액
      cols[3], // 상환일자
      cols[4], // 출금일자
      cols[5]  // 출금금액
    ]);
  });

  cfLoadData([["NO","입금일자","입금금액","상환일자","출금일자","출금금액"], ...rows]);
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
 *  메인 계산 — 입금 기준 결과 + 출금 기준 상세
 ******************************************************/
function cfCalculate() {
  const normalRate = Number(document.getElementById("annualRate")?.value || 0) / 100;
  const lateRate = Number(document.getElementById("lateRate")?.value || 0) / 100;

  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"))
    .map((tr, idx) => ({
      rowId: idx,
      no: Number(tr.querySelector(".no")?.value || 0),
      inDate: tr.querySelector(".inDate")?.value || "",
      inAmt: Number(tr.querySelector(".inAmt")?.value || 0),
      repayDate: tr.querySelector(".repayDate")?.value || "",
      outDate: tr.querySelector(".outDate")?.value || "",
      outAmt: Number(tr.querySelector(".outAmt")?.value || 0)
    }))
    .filter(r => r.no && (r.inAmt > 0 || r.outAmt > 0));

  if (!rows.length) return;

  // 입금 기준 그룹
  const depositMap = new Map();
  rows.forEach(r => {
    if (!depositMap.has(r.no)) {
      depositMap.set(r.no, {
        no: r.no,
        inDate: r.inDate || "",
        inAmt: r.inAmt || 0,
        repayDate: r.repayDate || "",
        withdrawals: []
      });
    }
    const dep = depositMap.get(r.no);
    if (r.inDate && r.inAmt && !dep.inDate) {
      dep.inDate = r.inDate;
      dep.inAmt = r.inAmt;
      dep.repayDate = r.repayDate;
    }
    if (r.outDate && r.outAmt) {
      dep.withdrawals.push({
        outDate: r.outDate,
        outAmt: r.outAmt
      });
    }
  });

  // 출금 기준 상세 생성
  const detailRows = [];
  depositMap.forEach(dep => {
    const hasDeposit = dep.inAmt > 0 && dep.inDate;
    dep.withdrawals
      .sort((a, b) => new Date(a.outDate) - new Date(b.outDate))
      .forEach(w => {
        let normalDays = 0;
        let lateDays = 0;
        let totalDays = 0;
        let normalInterest = 0;
        let lateInterest = 0;
        let appliedAmt = w.outAmt;
        let appliedAfterAmt = w.outAmt;
        let excess = 0;
        let annualYield = 0;

        if (hasDeposit) {
          if (dep.repayDate) {
            normalDays = Math.max(0, diffDays(dep.inDate, dep.repayDate));
            lateDays = Math.max(0, diffDays(dep.repayDate, w.outDate));
          } else {
            normalDays = Math.max(0, diffDays(dep.inDate, w.outDate));
            lateDays = 0;
          }
          totalDays = normalDays + lateDays;

          normalInterest = calcNormalInterest(dep.inAmt, normalRate, normalDays);
          lateInterest = calcLateInterest(dep.inAmt, lateRate, lateDays);

          const interestTotal = normalInterest + lateInterest;
          appliedAmt = w.outAmt - interestTotal;
          if (appliedAmt < 0) appliedAmt = 0;

          appliedAfterAmt = appliedAmt - dep.inAmt;
          excess = appliedAfterAmt > 0 ? appliedAfterAmt : 0;

          annualYield = calcAnnualYieldDeposit(dep.inAmt, appliedAmt, totalDays);
        } else {
          totalDays = 0;
          normalInterest = 0;
          lateInterest = 0;
          appliedAmt = w.outAmt;
          appliedAfterAmt = w.outAmt;
          excess = 0;
          annualYield = 0;
        }

        detailRows.push({
          depNo: dep.no,
          inDate: hasDeposit ? dep.inDate : "",
          inAmt: hasDeposit ? dep.inAmt : 0,
          outDate: w.outDate,
          outAmt: w.outAmt,
          normalInterest,
          lateInterest,
          appliedAmt,
          appliedAfterAmt,
          excess,
          closed: hasDeposit ? (excess > 0 ? "종결" : "미결") : "종결",
          days: totalDays,
          annualYield
        });
      });
  });

  // 입금 없음인데 출금만 있는 경우(어떤 NO에도 속하지 않는 출금)는 별도 처리
  rows
    .filter(r => r.outAmt > 0 && !depositMap.has(r.no) && (!r.inAmt || !r.inDate))
    .forEach(w => {
      detailRows.push({
        depNo: w.no,
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
    });

  // 출금 기준 상세 정렬: NO → 입금일자 → 출금일자
  detailRows.sort((a, b) => {
    if (a.depNo !== b.depNo) return a.depNo - b.depNo;
    if (a.inDate !== b.inDate) {
      const ad = a.inDate || "1900-01-01";
      const bd = b.inDate || "1900-01-01";
      return new Date(ad) - new Date(bd);
    }
    return new Date(a.outDate) - new Date(b.outDate);
  });

  globalDetails = detailRows;

  /******************************************************
   *  결과 테이블 (입금 기준 1줄씩)
   ******************************************************/
  const results = [];
  depositMap.forEach(dep => {
    const hasDeposit = dep.inAmt > 0 && dep.inDate;
    if (!hasDeposit) return;

    const rowsForDep = detailRows.filter(r => r.depNo === dep.no && r.inAmt > 0);
    if (!rowsForDep.length) {
      results.push({
        no: dep.no,
        inDate: dep.inDate,
        inAmt: dep.inAmt,
        outDate: "",
        outAmt: 0,
        days: 0,
        annualYield: 0
      });
      return;
    }

    const totalOut = rowsForDep.reduce((s, r) => s + r.outAmt, 0);
    const lastOutDate = rowsForDep[rowsForDep.length - 1].outDate;
    const totalDays = rowsForDep.reduce((s, r) => s + r.days, 0);
    const avgYield =
      rowsForDep.reduce((s, r) => s + r.annualYield, 0) / rowsForDep.length;

    results.push({
      no: dep.no,
      inDate: dep.inDate,
      inAmt: dep.inAmt,
      outDate: lastOutDate,
      outAmt: totalOut,
      days: totalDays,
      annualYield: avgYield
    });
  });

  results.sort((a, b) => {
    if (a.no !== b.no) return a.no - b.no;
    if (a.inDate !== b.inDate) return new Date(a.inDate) - new Date(b.inDate);
    return new Date(a.outDate || "1900-01-01") - new Date(b.outDate || "1900-01-01");
  });

  const resultTbody = document.querySelector("#resultTable tbody");
  if (resultTbody) {
    resultTbody.innerHTML = "";
    results.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.no}</td>
        <td>${r.inDate}</td>
        <td>${r.inAmt.toLocaleString()}</td>
        <td>${r.outDate || ""}</td>
        <td>${r.outAmt ? r.outAmt.toLocaleString() : ""}</td>
        <td>${r.days ? r.days + "일" : ""}</td>
        <td>${r.annualYield ? r.annualYield.toFixed(4) : ""}</td>
        <td><button type="button" onclick="showDetail(${r.no})">상세</button></td>
      `;
      resultTbody.appendChild(tr);
    });
  }

  /******************************************************
   *  상세화면 테이블 (출금 기준 한 줄씩)
   ******************************************************/
  const detailArea = document.querySelector("#detailArea");
  if (detailArea) {
    detailArea.innerHTML = `
      <table class="cf-table">
        <thead>
          <tr>
            <th>NO</th>
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
                <td>${r.depNo}</td>
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
 *  상세 버튼 (NO 기준)
 ******************************************************/
function showDetail(no) {
  const rowsForNo = globalDetails.filter(r => r.depNo === no);
  if (!rowsForNo.length) return;

  const msgParts = rowsForNo.map(r => {
    return [
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
  });

  alert(msgParts.join("\n\n----------------------\n\n"));
}

/******************************************************
 *  엑셀/PDF 다운로드 (간단한 더미 구현)
 ******************************************************/
function cfExportExcel() {
  alert("엑셀 다운로드 기능은 추후 제공 예정입니다.");
}

function cfExportPDF() {
  alert("PDF 다운로드 기능은 추후 제공 예정입니다.");
}

/******************************************************
 *  export to window
 ******************************************************/
window.cfReadExcel = cfReadExcel;
window.cfParseCSV = cfParseCSV;
window.cfAddRow = cfAddRow;
window.cfCalculate = cfCalculate;
window.cfExportExcel = cfExportExcel;
window.cfExportPDF = cfExportPDF;
window.showDetail = showDetail;

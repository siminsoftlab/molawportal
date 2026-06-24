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

function calcAnnualYieldDeposit(inAmt, outAmt, days) {
  if (inAmt <= 0 || outAmt <= 0 || days <= 0) return 0;
  const periodRate = (outAmt - inAmt) / inAmt;
  return periodRate * (365 / days) * 100;
}

/******************************************************
 *  CSV / 엑셀 로드
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

function cfParseCSV() {
  const text = document.getElementById("csvInput").value.trim();
  if (!text) return;

  const lines = text.split(/\r?\n/);
  const rows = [];
  lines.forEach((line, idx) => {
    const cols = line.split(",").map(c => c.trim());
    if (cols.length < 6) return;
    if (idx === 0 && cols[0] === "NO") return;

    rows.push([
      cols[0], cols[1], cols[2], cols[3], cols[4], cols[5]
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
 *  메인 계산
 ******************************************************/
function cfCalculate() {

  /******************************************************
   *  1) 원본 rows 읽기
   ******************************************************/
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

  /******************************************************
   *  2) 상세(detailRows) = 원본 rows 기준 1:1 생성
   ******************************************************/
  const detailRows = rows.map(r => {
    const days = (r.inDate && r.outDate) ? diffDays(r.inDate, r.outDate) : 0;
    const annualYield = (r.inAmt > 0 && r.outAmt > 0 && days > 0)
      ? calcAnnualYieldDeposit(r.inAmt, r.outAmt, days)
      : 0;

    return {
      ...r,
      days,
      annualYield
    };
  });

  globalDetails = detailRows;

  /******************************************************
   *  3) 결과(resultTable) = 원본 rows 그대로
   *     days = 상세 days 합
   *     annualYield = 상세 annualYield 평균
   ******************************************************/
  const resultRows = rows.map(r => {
    const detailsForRow = detailRows.filter(d => d.rowId === r.rowId);

    const totalDays = detailsForRow.reduce((s, d) => s + d.days, 0);
    const avgYield = detailsForRow.reduce((s, d) => s + d.annualYield, 0)
                     / (detailsForRow.length || 1);

    return {
      ...r,
      days: totalDays,
      annualYield: avgYield
    };
  });

  /******************************************************
   *  4) 결과테이블 렌더링
   ******************************************************/
  const resultTbody = document.querySelector("#resultTable tbody");
  resultTbody.innerHTML = "";

  resultRows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.no}</td>
      <td>${r.inDate}</td>
      <td>${r.inAmt.toLocaleString()}</td>
      <td>${r.outDate}</td>
      <td>${r.outAmt.toLocaleString()}</td>
      <td>${r.days ? r.days + "일" : ""}</td>
      <td>${r.annualYield ? r.annualYield.toFixed(4) : ""}</td>
      <td><button onclick="showDetail(${r.rowId})">상세</button></td>
    `;
    resultTbody.appendChild(tr);
  });

  /******************************************************
   *  5) 상세 테이블 렌더링
   ******************************************************/
  const detailArea = document.querySelector("#detailArea");
  detailArea.innerHTML = `
    <table class="cf-table">
      <thead>
        <tr>
          <th>NO</th>
          <th>입금일자</th>
          <th>입금금액</th>
          <th>상환일자</th>
          <th>출금일자</th>
          <th>출금금액</th>
          <th>이용기간</th>
          <th>연이자율</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows.map(r => `
          <tr>
            <td>${r.no}</td>
            <td>${r.inDate}</td>
            <td>${r.inAmt.toLocaleString()}</td>
            <td>${r.repayDate}</td>
            <td>${r.outDate}</td>
            <td>${r.outAmt.toLocaleString()}</td>
            <td>${r.days ? r.days + "일" : ""}</td>
            <td>${r.annualYield ? r.annualYield.toFixed(4) : ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/******************************************************
 *  상세 팝업
 ******************************************************/
function showDetail(rowId) {
  const r = globalDetails.find(x => x.rowId === rowId);
  if (!r) return;

  alert([
    `NO: ${r.no}`,
    `입금일자: ${r.inDate}`,
    `입금금액: ${r.inAmt.toLocaleString()}원`,
    `상환일자: ${r.repayDate}`,
    `출금일자: ${r.outDate}`,
    `출금금액: ${r.outAmt.toLocaleString()}원`,
    `이용기간: ${r.days}일`,
    `연이자율: ${r.annualYield.toFixed(4)}%`
  ].join("\n"));
}

/******************************************************
 *  export
 ******************************************************/
window.cfReadExcel = cfReadExcel;
window.cfParseCSV = cfParseCSV;
window.cfLoadData = cfLoadData;
window.cfCalculate = cfCalculate;
window.showDetail = showDetail;

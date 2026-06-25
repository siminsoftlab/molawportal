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

function parseDate(str) {
  if (!str) return new Date("1900-01-01");
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(start, end) {
  const s = parseDate(start);
  const e = parseDate(end);
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
}

/******************************************************
 *  이자/연이자율
 ******************************************************/
function calcAnnualYield(basePrincipal, paid, days) {
  if (basePrincipal <= 0 || days <= 0) return 0;
  const periodRate = (paid - basePrincipal) / basePrincipal;
  return periodRate * (365 / days) * 100;
}

function calcInterest(principal, ratePercent, days) {
  if (principal <= 0 || days <= 0 || ratePercent === 0) return 0;
  return principal * (ratePercent / 100) * (days / 365);
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
 *  FIFO 상세 저장
 ******************************************************/
window._fifoDetailRows = [];

/******************************************************
 *  메인 계산 (출금일 > 입금일 && 출금일 ≤ 다음 입금일)
 ******************************************************/
function cfCalculate() {
  const annualRate = Number(document.getElementById("annualRate")?.value || 0);
  const lateRate   = Number(document.getElementById("lateRate")?.value || 0);

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
    .filter(r => r.no);

  if (!rows.length) return;

  const grouped = new Map();
  rows.forEach(r => {
    if (!grouped.has(r.no)) grouped.set(r.no, []);
    grouped.get(r.no).push(r);
  });

  const resultRows = [];
  const detailRows = [];

  grouped.forEach(list => {
    /******************************************************
     *  1) 정렬 (날짜 오름차순, 같은 날짜면 출금 → 입금)
     ******************************************************/
    list.sort((a, b) => {
      const da = parseDate(a.inDate || a.outDate);
      const db = parseDate(b.inDate || b.outDate);

      if (da.getTime() !== db.getTime()) return da - db;

      if (a.outDate && !b.outDate) return -1;
      if (!a.outDate && b.outDate) return 1;

      return 0;
    });

    /******************************************************
     *  2) 입금 리스트만 추출
     ******************************************************/
    const deposits = list.filter(r => r.inAmt > 0);

    /******************************************************
     *  3) 각 입금 구간별 출금 매칭
     *     규칙: 입금일 < 출금일 ≤ 다음 입금일
     ******************************************************/
    deposits.forEach((dep, idx) => {
      const nextDep = deposits[idx + 1];
      const start = parseDate(dep.inDate);
      const end = nextDep ? parseDate(nextDep.inDate) : null;

      const outs = list.filter(r => {
        if (!r.outDate || r.outAmt <= 0) return false;
        const od = parseDate(r.outDate);

        // 입금일과 같은 날 출금은 이전 입금건에 속하게 함
        if (od <= start) return false;
        // 다음 입금일 초과는 제외
        if (end && od > end) return false;

        return true;
      });

      /******************************************************
       *  4) FIFO 원금 소진 + 이자/연이자율 계산
       ******************************************************/
      let remain = dep.inAmt;
      let lastDate = dep.inDate;

      outs.forEach(o => {
        const days = diffDays(lastDate, o.outDate);
        const paidPrincipal = Math.min(remain, o.outAmt);
        const after = remain - paidPrincipal;

        const normalInterest = calcInterest(remain, annualRate, days);
        const lateInterest   = calcInterest(remain, lateRate, days);

        // 연이자율은 "해당 입금건의 원금" 기준으로 계산 (remain이 0이어도 dep.inAmt 사용)
        const annualYield    = calcAnnualYield(dep.inAmt, o.outAmt, days);

        detailRows.push({
          no: dep.no,
          inDate: dep.inDate,
          outDate: o.outDate,
          inAmtStart: remain,
          outAmt: o.outAmt,
          principalPaid: paidPrincipal,
          principalAfter: after,
          normalInterest,
          lateInterest,
          days,
          annualYield
        });

        remain = after;
        lastDate = o.outDate;
      });

      const totalOut = outs.reduce((s, r) => s + r.outAmt, 0);
      const lastOutDate = outs.length ? outs[outs.length - 1].outDate : "";
      const totalDays = outs.length ? diffDays(dep.inDate, lastOutDate) : 0;
      const avgYield =
        outs.length
          ? outs.reduce((s, o) => {
              const d = diffDays(dep.inDate, o.outDate);
              return s + calcAnnualYield(dep.inAmt, o.outAmt, d);
            }, 0) / outs.length
          : 0;

      resultRows.push({
        no: dep.no,
        inDate: dep.inDate,
        inAmt: dep.inAmt,
        repayDate: dep.repayDate,
        outDate: lastOutDate,
        outAmt: totalOut,
        days: totalDays,
        annualYield: avgYield
      });
    });
  });

  /******************************************************
   *  결과 테이블 렌더링
   ******************************************************/
  const resultTbody = document.querySelector("#resultTable tbody");
  resultTbody.innerHTML = "";

  resultRows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.no}</td>
      <td>${r.inDate}</td>
      <td>${r.inAmt.toLocaleString()}</td>
      <td>${r.repayDate}</td>
      <td>${r.outDate}</td>
      <td>${r.outAmt.toLocaleString()}</td>
      <td>${r.days ? r.days + "일" : ""}</td>
      <td>${r.annualYield ? r.annualYield.toFixed(2) : ""}</td>
      <td><button onclick="showDetail(${r.no}, '${r.inDate}')">상세</button></td>
    `;
    resultTbody.appendChild(tr);
  });

  /******************************************************
   *  상세내역 전체 테이블
   ******************************************************/
  const detailArea = document.querySelector("#detailArea");
  detailArea.innerHTML = `
    <table class="cf-table">
      <thead>
        <tr>
          <th>NO</th>
          <th>입금일자</th>
          <th>출금일자</th>
          <th>입금금액(당시 남은 원금)</th>
          <th>출금금액</th>
          <th>이번 출금으로 상환된 원금</th>
          <th>상환 후 남은 원금</th>
          <th>정상이자</th>
          <th>연체이자</th>
          <th>이용기간(일)</th>
          <th>연이자율(%)</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows.map(r => `
          <tr>
            <td>${r.no}</td>
            <td>${r.inDate}</td>
            <td>${r.outDate}</td>
            <td>${r.inAmtStart.toLocaleString()}</td>
            <td>${r.outAmt.toLocaleString()}</td>
            <td>${r.principalPaid.toLocaleString()}</td>
            <td>${r.principalAfter.toLocaleString()}</td>
            <td>${r.normalInterest.toLocaleString()}</td>
            <td>${r.lateInterest.toLocaleString()}</td>
            <td>${r.days}일</td>
            <td>${r.annualYield.toFixed(2)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  window._fifoDetailRows = detailRows;
}

/******************************************************
 *  상세 모달
 ******************************************************/
function showDetail(no, inDate) {
  const rows = (window._fifoDetailRows || []).filter(
    r => r.no === no && r.inDate === inDate
  );

  if (!rows.length) {
    alert("해당 입금건의 상세내역이 없습니다.");
    return;
  }

  const html = `
    <table class="cf-table">
      <thead>
        <tr>
          <th>NO</th>
          <th>입금일자</th>
          <th>출금일자</th>
          <th>입금금액(당시 남은 원금)</th>
          <th>출금금액</th>
          <th>이번 출금으로 상환된 원금</th>
          <th>상환 후 남은 원금</th>
          <th>정상이자</th>
          <th>연체이자</th>
          <th>이용기간(일)</th>
          <th>연이자율(%)</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.no}</td>
            <td>${r.inDate}</td>
            <td>${r.outDate}</td>
            <td>${r.inAmtStart.toLocaleString()}</td>
            <td>${r.outAmt.toLocaleString()}</td>
            <td>${r.principalPaid.toLocaleString()}</td>
            <td>${r.principalAfter.toLocaleString()}</td>
            <td>${r.normalInterest.toLocaleString()}</td>
            <td>${r.lateInterest.toLocaleString()}</td>
            <td>${r.days}일</td>
            <td>${r.annualYield.toFixed(2)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  document.getElementById("detailModalContent").innerHTML = html;
  document.getElementById("detailModal").style.display = "block";
}

/******************************************************
 *  export
 ******************************************************/
window.cfReadExcel = cfReadExcel;
window.cfParseCSV = cfParseCSV;
window.cfLoadData = cfLoadData;
window.cfCalculate = cfCalculate;
window.showDetail = showDetail;

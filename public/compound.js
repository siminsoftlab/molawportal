/******************************************************
 *  날짜/이자 유틸 (중복 제거된 최종본)
 ******************************************************/

// 엑셀 날짜 → YYYY-MM-DD
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

// 문자열 날짜 → Date 객체
function parseDate(str) {
  if (!str) return new Date("1900-01-01");
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 날짜 차이(일수)
function diffDays(start, end) {
  const s = parseDate(start);
  const e = parseDate(end);
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
}

// 실질 연이자율
function calcAnnualYield(principal, paid, days) {
  if (principal <= 0 || days <= 0) return 0;
  const periodRate = (paid - principal) / principal;
  return periodRate * (365 / days) * 100;
}

// 정상/연체 이자 계산
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
 *  전역 상세 저장 (FIFO 상세내역)
 ******************************************************/
let globalDetails = [];
window._fifoDetailRows = [];

/******************************************************
 *  메인 계산 (법원 제출용 FIFO 완전 적용 + 출금일 ≤ 다음 입금일)
 ******************************************************/
function cfCalculate() {
  const annualRate = Number(document.getElementById("annualRate").value || 0); // 정상
  const lateRate   = Number(document.getElementById("lateRate").value || 0);   // 연체

  // 1) 입력 테이블에서 행 읽기
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

  // 2) NO별 그룹화
  const grouped = new Map();
  rows.forEach(r => {
    if (!grouped.has(r.no)) grouped.set(r.no, []);
    grouped.get(r.no).push(r);
  });

  const resultRows = [];   // 결과 테이블용
  const detailRows = [];   // 상세내역 (원금 소진 흐름)

  grouped.forEach(list => {
    // 날짜 기준 정렬
    list.sort((a, b) =>
      parseDate(a.inDate || a.outDate) - parseDate(b.inDate || b.outDate)
    );

    // 입금 행만 추출
    const deposits = list.filter(r => r.inAmt > 0);

    deposits.forEach((dep, idx) => {
      const nextDep = deposits[idx + 1];
      const startDate = dep.inDate;
      const endBoundary = nextDep ? nextDep.inDate : null;

      // 이 입금 구간 안의 출금들만 추출
      const outs = list.filter(r => {
        if (!r.outDate || r.outAmt <= 0) return false;

        const od = parseDate(r.outDate);

        // 출금일 < 입금일 → 제외
        if (od < parseDate(startDate)) return false;

        // 🔥 수정된 핵심 규칙: 출금일 ≤ 다음 입금일
        // 기존: od >= endBoundary → 제외
        // 수정: od > endBoundary → 제외
        if (endBoundary && od > parseDate(endBoundary)) return false;

        return true;
      });

      // FIFO 원금 소진 흐름
      let remainingPrincipal = dep.inAmt;
      let lastDate = dep.inDate;

      outs.forEach(o => {
        if (remainingPrincipal <= 0) return; // 이미 원금 소진

        const days = diffDays(lastDate, o.outDate); // 직전 이벤트 기준 기간
        const principalPaid = Math.min(remainingPrincipal, o.outAmt); // 이번 출금으로 상환된 원금
        const afterPrincipal = remainingPrincipal - principalPaid;

        const normalInterest = calcInterest(remainingPrincipal, annualRate, days);
        const lateInterest   = calcInterest(remainingPrincipal, lateRate, days);
        const annualYield    = calcAnnualYield(remainingPrincipal, o.outAmt, days);

        detailRows.push({
          no: dep.no,
          inDate: dep.inDate,
          inAmtStart: remainingPrincipal,   // 출금 직전 남은 원금
          repayDate: dep.repayDate,
          outDate: o.outDate,
          outAmt: o.outAmt,
          principalPaid,
          principalAfter: afterPrincipal,
          days,
          normalInterest,
          lateInterest,
          annualYield
        });

        remainingPrincipal = afterPrincipal;
        lastDate = o.outDate;
      });

      // 결과 테이블용 집계 (이 입금 구간 전체)
      const totalOut = outs.reduce((s, r) => s + r.outAmt, 0);
      const lastOutDate = outs.length
        ? outs.reduce((max, r) =>
            parseDate(r.outDate) > parseDate(max) ? r.outDate : max,
            outs[0].outDate
          )
        : "";

      const totalDays = outs.length
        ? diffDays(dep.inDate, lastOutDate)
        : 0;

      const avgYield =
        outs.length
          ? outs.reduce((s, o) => {
              const d = diffDays(dep.inDate, o.outDate);
              return s + calcAnnualYield(dep.inAmt, o.outAmt, d);
            }, 0) / outs.length
          : 0;

      resultRows.push({
        rowId: dep.rowId,
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
      <td>${r.annualYield ? r.annualYield.toFixed(4) : ""}</td>
      <td><button onclick="showDetail(${r.no}, '${r.inDate}')">상세</button></td>
    `;
    resultTbody.appendChild(tr);
  });

  /******************************************************
   *  상세내역 전체 테이블 (페이지 하단)
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
            <td>${r.annualYield.toFixed(4)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  // 상세 모달에서 사용
  window._fifoDetailRows = detailRows;
}


/******************************************************
 *  상세 모달 표시 (법원 제출용 FIFO 흐름)
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
            <td>${r.annualYield.toFixed(4)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  document.getElementById("detailModalContent").innerHTML = html;
  document.getElementById("detailModal").style.display = "block";
}

/******************************************************
 *  export (전역 연결)
 ******************************************************/
window.cfReadExcel = cfReadExcel;
window.cfParseCSV = cfParseCSV;
window.cfLoadData = cfLoadData;
window.cfCalculate = cfCalculate;
window.showDetail = showDetail;

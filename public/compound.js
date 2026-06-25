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

  // 1) 원본 rows 읽기
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

  const resultRows = [];
  const detailRows = [];

  grouped.forEach(list => {

    // 날짜 순 정렬
    list.sort((a, b) =>
      new Date(a.inDate || a.outDate) - new Date(b.inDate || b.outDate)
    );

    // 입금 있는 행만 구간 시작점
    const deposits = list.filter(r => r.inAmt > 0);

    deposits.forEach((dep, idx) => {
      const nextDep = deposits[idx + 1];
      const startDate = dep.inDate;
      const endBoundary = nextDep ? nextDep.inDate : null;

      // 이 입금 이후 ~ 다음 입금 전까지 출금들
      const outs = list.filter(r => {
        if (!r.outDate || r.outAmt <= 0) return false;
        if (new Date(r.outDate) < new Date(startDate)) return false;

        // ⭐ 핵심 수정: 다음 입금일자와 같은 날짜의 출금은 포함해야 함
        if (endBoundary && new Date(r.outDate) > new Date(endBoundary)) return false;

        return true;
      });

      // 상세(detailRows) 생성
      outs.forEach(o => {
        const days = (dep.inDate && o.outDate) ? diffDays(dep.inDate, o.outDate) : 0;
        const annualYield = (dep.inAmt > 0 && o.outAmt > 0 && days > 0)
          ? calcAnnualYieldDeposit(dep.inAmt, o.outAmt, days)
          : 0;

        detailRows.push({
          rowId: dep.rowId,   // ⭐ 반드시 추가
          no: dep.no,
          inDate: dep.inDate,
          inAmt: dep.inAmt,
          repayDate: dep.repayDate,
          outDate: o.outDate,
          outAmt: o.outAmt,
          days,
          annualYield,
          normalInterest: 0,
          lateInterest: 0
        });
      });

      // 출금 합산
      const totalOut = outs.reduce((s, r) => s + r.outAmt, 0);

      // 마지막 출금일
      const lastOutDate = outs.length
        ? outs.reduce((max, r) =>
            new Date(r.outDate) > new Date(max) ? r.outDate : max,
            outs[0].outDate
          )
        : "";

      // 상세 합산/평균
      const detailsForDep = detailRows.filter(d =>
        d.depNo === dep.no &&
        new Date(d.outDate) >= new Date(startDate) &&
        (!endBoundary || new Date(d.outDate) <= new Date(endBoundary))
      );

      const totalDays = detailsForDep.reduce((s, d) => s + d.days, 0);
      const avgYield =
        detailsForDep.length
          ? detailsForDep.reduce((s, d) => s + d.annualYield, 0) / detailsForDep.length
          : 0;

      // 결과테이블 1줄 생성
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

  // 3) 결과테이블 렌더링 (⭐ 상환일자 포함)
  const resultTbody = document.querySelector("#resultTable tbody");
  resultTbody.innerHTML = "";

  resultRows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.no}</td>
      <td>${r.inDate}</td>
      <td>${r.inAmt.toLocaleString()}</td>
      <td>${r.repayDate}</td>   <!-- ⭐ 상환일자 표시 -->
      <td>${r.outDate}</td>
      <td>${r.outAmt.toLocaleString()}</td>
      <td>${r.days ? r.days + "일" : ""}</td>
      <td>${r.annualYield ? r.annualYield.toFixed(4) : ""}</td>
      <td><button onclick="showDetail(${r.rowId})">상세</button></td>
    `;
    resultTbody.appendChild(tr);
  });

  // 4) 상세 테이블 렌더링 (⭐ 2025-11-27 상세 포함됨)
  const detailArea = document.querySelector("#detailArea");
  detailArea.innerHTML = `
    <table class="cf-table">
      <thead>
        <tr>
          <th>NO</th>
          <th>입금일자</th>
          <th>입금금액</th>
          <th>출금일자</th>
          <th>출금금액</th>
          <th>이용기간</th>
          <th>연이자율</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows.map(r => `
          <tr>
            <td>${r.depNo}</td>
            <td>${r.inDate}</td>
            <td>${r.inAmt.toLocaleString()}</td>
            <td>${r.outDate}</td>
            <td>${r.outAmt.toLocaleString()}</td>
            <td>${r.days}일</td>
            <td>${r.annualYield.toFixed(4)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}


/******************************************************
 *  export
 ******************************************************/
window.cfReadExcel = cfReadExcel;
window.cfParseCSV = cfParseCSV;
window.cfLoadData = cfLoadData;
window.cfCalculate = cfCalculate;
window.showDetail = function(rowId) {
  // 해당 입금건의 상세만 필터링
  const details = globalDetails.filter(d => d.rowId === rowId);

  if (!details.length) {
    alert("상세내역이 없습니다.");
    return;
  }

  // 상세 테이블 HTML 생성
  const html = `
    <table class="cf-table">
      <thead>
        <tr>
          <th>NO</th>
          <th>입금일자</th>
          <th>입금금액</th>
          <th>상환일자</th>
          <th>출금일자</th>
          <th>출금금액</th>
          <th>정상이자</th>
          <th>연체이자</th>
          <th>이용기간</th>
          <th>연이자율</th>
        </tr>
      </thead>
      <tbody>
        ${details.map(r => `
          <tr>
            <td>${r.no}</td>
            <td>${r.inDate}</td>
            <td>${r.inAmt.toLocaleString()}</td>
            <td>${r.repayDate || ""}</td>
            <td>${r.outDate}</td>
            <td>${r.outAmt.toLocaleString()}</td>
            <td>${(r.normalInterest || 0).toLocaleString()}</td>
            <td>${(r.lateInterest || 0).toLocaleString()}</td>
            <td>${r.days}일</td>
            <td>${r.annualYield.toFixed(4)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  // 모달에 삽입
  document.getElementById("detailModalContent").innerHTML = html;

  // 모달 표시
  document.getElementById("detailModal").style.display = "block";
};


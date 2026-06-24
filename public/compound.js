/******************************************************
 *  날짜 변환 및 계산 유틸
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
  return Math.max(1, Math.floor((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24)));
}

function annualRateSimple(inAmt, outAmt, days) {
  const periodRate = (outAmt - inAmt) / inAmt;
  return periodRate * (365 / days);
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
 *  CSV/엑셀 데이터 테이블 로드
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
 *  메인 계산 — FIFO + 총출금 기준 연이자율 + 입금 1행 출력
 ******************************************************/
function cfCalculate() {
  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"))
    .map(tr => ({
      no: tr.querySelector(".no").value,
      inDate: tr.querySelector(".inDate").value,
      inAmt: Number(tr.querySelector(".inAmt").value || 0),
      outDate: tr.querySelector(".outDate").value,
      outAmt: Number(tr.querySelector(".outAmt").value || 0)
    }))
    .filter(r => r.no);

  // 날짜순 정렬
  rows.sort((a, b) => {
    const da = a.inDate || a.outDate;
    const db = b.inDate || b.outDate;
    return new Date(da) - new Date(db);
  });

  const fifoQueue = [];          // FIFO 매칭용 큐
  const depositRecords = [];     // 결과테이블용 전체 입금 목록
  const detailList = [];

  rows.forEach(r => {
    if (r.inAmt > 0 && r.inDate) {
      const dep = {
        no: r.no,
        inDate: r.inDate,
        inAmt: r.inAmt,
        remaining: r.inAmt,
        withdrawals: []
      };
      fifoQueue.push(dep);
      depositRecords.push(dep); // ← 결과테이블용으로 반드시 저장
    }

    if (r.outAmt > 0 && r.outDate) {
      let amt = r.outAmt;

      while (amt > 0 && fifoQueue.length > 0) {
        const dep = fifoQueue[0];
        const assign = Math.min(dep.remaining, amt);

        dep.withdrawals.push({
          outDate: r.outDate,
          outAmt: assign
        });

        dep.remaining -= assign;
        amt -= assign;

        if (dep.remaining <= 0) {
          fifoQueue.shift();
        }
      }
    }
  });

  // 결과 생성 (모든 입금 1행씩 출력)
  const results = depositRecords.map(dep => {
    const totalOut = dep.withdrawals.reduce((s, w) => s + w.outAmt, 0);
    const lastOutDate = dep.withdrawals.length > 0 ? dep.withdrawals.at(-1).outDate : dep.inDate;
    const days = diffDays(dep.inDate, lastOutDate);
    const annual = annualRateSimple(dep.inAmt, totalOut, days);

    detailList.push({
      id: `detail-${dep.no}-${dep.inDate}`,
      no: dep.no,
      inDate: dep.inDate,
      inAmt: dep.inAmt,
      days,
      annual,
      withdrawals: dep.withdrawals
    });

    return {
      no: dep.no,
      inDate: dep.inDate,
      inAmt: dep.inAmt,
      outDate: lastOutDate,
      totalOut,
      days,
      annual
    };
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
      <td>${r.days}일</td>
      <td>${(r.annual * 100).toFixed(2)}%</td>
      <td><button onclick="showDetail('${r.no}','${r.inDate}')">상세</button></td>
    `;
    tbody.appendChild(tr);
  });
}

/******************************************************
 *  상세내역 렌더링
 ******************************************************/
let globalDetails = [];

function renderDetails(list) {
  globalDetails = list;
}

function showDetail(no, inDate) {
  const data = globalDetails.find(d => d.no == no && d.inDate == inDate);
  const area = document.querySelector("#detailArea");
  area.innerHTML = "";

  let html = `
    <h3>상세내역 (NO ${data.no}, 입금 ${data.inAmt.toLocaleString()}원)</h3>
    <table class="detail-table">
      <tr><th>입금일자</th><td>${data.inDate}</td></tr>
      <tr><th>입금금액</th><td>${data.inAmt.toLocaleString()}원</td></tr>
      <tr><th>전체 이용기간</th><td>${data.days}일</td></tr>
      <tr><th>연이자율</th><td>${(data.annual * 100).toFixed(2)}%</td></tr>
    </table>

    <h4>출금내역</h4>
    <table class="detail-table">
      <thead>
        <tr>
          <th>출금일자</th>
          <th>출금금액</th>
          <th>이용기간</th>
          <th>연이자율</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.withdrawals.forEach(w => {
    const days = diffDays(data.inDate, w.outDate);
    const annual = annualRateSimple(data.inAmt, w.outAmt, days);

    html += `
      <tr>
        <td>${w.outDate}</td>
        <td>${w.outAmt.toLocaleString()}원</td>
        <td>${days}일</td>
        <td>${(annual * 100).toFixed(2)}%</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  area.innerHTML = html;
}

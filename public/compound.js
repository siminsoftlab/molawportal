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
  return Math.max(1, Math.floor((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24)));
}

function calcNormalInterest(principal, rate, days) {
  return principal * rate * (days / 365);
}

function calcLateInterest(unpaid, rate, days) {
  return unpaid * rate * (days / 365);
}

function calcYieldAnnual(inAmt, totalOut, totalDays) {
  if (totalDays <= 0 || inAmt <= 0) return 0;
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
 *  메인 계산 — FIFO + 정상/지연이자 + 상세/결과 일치
 ******************************************************/
function cfCalculate() {
  const normalRateEl = document.getElementById("annualRate");
  const lateRateEl = document.getElementById("lateRate");
  const normalRate = normalRateEl ? Number(normalRateEl.value || 0) / 100 : 0;
  const lateRate = lateRateEl ? Number(lateRateEl.value || 0) / 100 : 0;

  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"))
    .map(tr => ({
      no: tr.querySelector(".no").value,
      inDate: tr.querySelector(".inDate").value,
      inAmt: Number(tr.querySelector(".inAmt").value || 0),
      outDate: tr.querySelector(".outDate").value,
      outAmt: Number(tr.querySelector(".outAmt").value || 0)
    }))
    .filter(r => r.no && (r.inAmt > 0 || r.outAmt > 0));

  // 날짜 기준 정렬
  rows.sort((a, b) => {
    const da = a.inDate || a.outDate;
    const db = b.inDate || b.outDate;
    return new Date(da) - new Date(db);
  });

  const fifoQueue = [];      // 매칭용
  const depositRecords = []; // 결과/상세 공통 기준
  const detailList = [];

  // 1) 입금/출금 FIFO 매칭 + 기간별 이자/잔액 계산
  rows.forEach(r => {
    // 입금
    if (r.inAmt > 0 && r.inDate) {
      const dep = {
        no: r.no,
        inDate: r.inDate,
        inAmt: r.inAmt,
        principal: r.inAmt,   // 현재 원금
        unpaid: 0,            // 미납원금
        lastDate: r.inDate,   // 마지막 이자 계산 기준일
        withdrawals: []       // 상세내역용
      };
      fifoQueue.push(dep);
      depositRecords.push(dep);
    }

    // 출금
    if (r.outAmt > 0 && r.outDate) {
      let remainOut = r.outAmt;

      while (remainOut > 0 && fifoQueue.length > 0) {
        const dep = fifoQueue[0];

        // 이 입금에서 실제로 사용할 출금액 (원금 한도 내)
        const useOut = Math.min(remainOut, dep.principal + dep.unpaid || remainOut);

        // 기간 계산 (출금 전 잔액 기준)
        const days = diffDays(dep.lastDate, r.outDate);

        // 정상이자: 출금 전 원금 기준
        const normalInterest = calcNormalInterest(dep.principal, normalRate, days);

        // 지연이자: 미납원금 기준
        const lateInterest = dep.unpaid > 0 ? calcLateInterest(dep.unpaid, lateRate, days) : 0;

        // 출금금액에서 이자 먼저 차감
        let afterOut = useOut;
        afterOut -= normalInterest;
        afterOut -= lateInterest;

        // 남은 금액으로 원금 차감 (0보다 작으면 0으로)
        dep.principal -= Math.max(0, afterOut);

        // 원금이 음수면 미납원금으로 전환
        if (dep.principal < 0) {
          dep.unpaid = Math.abs(dep.principal);
          dep.principal = 0;
        }

        // 상세내역 기록
        dep.withdrawals.push({
          outDate: r.outDate,
          outAmt: useOut,
          days,
          normalInterest,
          lateInterest,
          principalAfter: dep.principal,
          unpaidAfter: dep.unpaid
        });

        // 다음 기간 기준일 갱신
        dep.lastDate = r.outDate;

        // 전체 출금에서 사용한 만큼 차감
        remainOut -= useOut;

        // 이 입금이 완전히 정리(원금 0, 미납 0)되면 큐에서 제거
        if (dep.principal <= 0 && dep.unpaid === 0) {
          fifoQueue.shift();
        } else {
          // 아직 남아 있으면 다음 출금에서 다시 사용
          break;
        }
      }
    }
  });

  // 2) 결과테이블/상세내역 공통 데이터 생성
  const results = depositRecords.map(dep => {
    const totalOut = dep.withdrawals.reduce((s, w) => s + w.outAmt, 0);
    const totalDays = dep.withdrawals.reduce((s, w) => s + w.days, 0);
    const lastOutDate = dep.withdrawals.length > 0 ? dep.withdrawals[dep.withdrawals.length - 1].outDate : "";

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
      outDate: lastOutDate || "-",
      totalOut,
      totalDays,
      annualYield
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
      <td>${r.totalDays ? r.totalDays + "일" : "-"}</td>
      <td>${r.totalDays ? (r.annualYield * 100).toFixed(2) + "%" : "-"}</td>
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

  if (!data) return;

  let html = `
    <h3>상세내역 (NO ${data.no}, 입금 ${data.inAmt.toLocaleString()}원)</h3>
    <table class="detail-table">
      <tr><th>입금일자</th><td>${data.inDate}</td></tr>
      <tr><th>입금금액</th><td>${data.inAmt.toLocaleString()}원</td></tr>
      <tr><th>전체 이용기간 합</th><td>${data.totalDays}일</td></tr>
      <tr><th>입금대비 출금 연이자율</th><td>${(data.annualYield * 100).toFixed(2)}%</td></tr>
    </table>

    <h4>출금·이자·잔액 내역</h4>
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

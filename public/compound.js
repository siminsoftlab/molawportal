/******************************************************
 *  엑셀 업로드 기능 (엑셀 → JSON → 테이블 로드)
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

    // 기존 테이블 로딩 함수 호출
    cfLoadData(json);
  };
  reader.readAsArrayBuffer(file);
}

/******************************************************
 *  엑셀 날짜 변환 (Excel Serial → yyyy-MM-dd)
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

/******************************************************
 *  날짜 차이 계산 (일 단위)
 ******************************************************/
function diffDays(a, b) {
  if (!a || !b) return null;
  return Math.floor((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

/******************************************************
 *  법적 연 단리 이율 계산
 *  periodRate = (outAmt - inAmt) / inAmt
 *  annualRate = periodRate * (365 / days)
 ******************************************************/
function calcAnnualSimpleRate(inAmt, outAmt, days) {
  if (!inAmt || !outAmt || !days || days <= 0) return 0;
  const periodRate = (outAmt - inAmt) / inAmt;
  return periodRate * (365 / days);
}

/******************************************************
 *  행 추가 (입력용)
 ******************************************************/
function cfAddRow() {
  const tbody = document.querySelector("#cfTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="number" class="no"></td>
    <td><input type="date" class="inDate"></td>
    <td><input type="number" class="inAmt"></td>
    <td><input type="date" class="outDate"></td>
    <td><input type="number" class="outAmt"></td>
    <td class="days"></td>
    <td class="rate"></td>
  `;
  tbody.appendChild(tr);
}

/******************************************************
 *  업로드/CSV 데이터 → cfTable에 로드 (원본만)
 ******************************************************/
function cfLoadData(rows) {
  const tbody = document.querySelector("#cfTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  rows.forEach((r, idx) => {
    if (idx === 0) return;

    const no = r[0] || "";
    const rawInDate = r[1];
    const rawOutDate = r[3];

    const inDate =
      typeof rawInDate === "number" ? excelDateToYMD(rawInDate) : (rawInDate || "");
    const outDate =
      typeof rawOutDate === "number" ? excelDateToYMD(rawOutDate) : (rawOutDate || "");

    const inAmt = r[2] || "";
    const outAmt = r[4] || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="number" class="no" value="${no}"></td>
      <td><input type="date" class="inDate" value="${inDate}"></td>
      <td><input type="number" class="inAmt" value="${inAmt}"></td>
      <td><input type="date" class="outDate" value="${outDate}"></td>
      <td><input type="number" class="outAmt" value="${outAmt}"></td>
      <td class="days"></td>
      <td class="rate"></td>
    `;
    tbody.appendChild(tr);
  });

  const resultBody = document.querySelector("#resultTable tbody");
  if (resultBody) resultBody.innerHTML = "";
  const subtotalArea = document.getElementById("subtotalArea");
  if (subtotalArea) subtotalArea.innerHTML = "";
  const detailArea = document.getElementById("detailArea");
  if (detailArea) {
    detailArea.innerHTML = "";
    detailArea.dataset.details = "[]";
  }
  const totalIn = document.getElementById("totalIn");
  const totalOut = document.getElementById("totalOut");
  if (totalIn) totalIn.textContent = "0";
  if (totalOut) totalOut.textContent = "0";
}

/******************************************************
 *  메인 계산 (법적 연 단리 이율 방식)
 ******************************************************/
function cfCalculate() {
  const rows = Array.from(document.querySelectorAll("#cfTable tbody tr"));
  const resultBody = document.querySelector("#resultTable tbody");
  if (!resultBody) return;
  resultBody.innerHTML = "";

  const detailArea = document.getElementById("detailArea");
  if (detailArea) {
    detailArea.innerHTML = "";
    detailArea.dataset.details = "[]";
  }

  const groups = {};
  let grandIn = 0;
  let grandOut = 0;

  rows.forEach(tr => {
    const no = tr.querySelector(".no")?.value || "";
    const inDate = tr.querySelector(".inDate")?.value || "";
    const inAmt = Number(tr.querySelector(".inAmt")?.value || 0);
    const outDate = tr.querySelector(".outDate")?.value || "";
    const outAmt = Number(tr.querySelector(".outAmt")?.value || 0);

    if (!no) return;

    if (!groups[no]) {
      groups[no] = {
        rows: [],
        deposits: [],
        subtotalIn: 0,
        subtotalOut: 0
      };
    }

    groups[no].rows.push({ inDate, inAmt, outDate, outAmt });
  });

  const allDetails = [];

  Object.keys(groups).forEach(no => {
    const g = groups[no];
    let currentDeposit = null;

    g.rows.forEach(r => {
      const { inDate, inAmt, outDate, outAmt } = r;

      if (inAmt > 0 && inDate) {
        currentDeposit = {
          inDate,
          inAmt,
          withdrawals: []
        };
        g.deposits.push(currentDeposit);
        g.subtotalIn += inAmt;
        grandIn += inAmt;
      }

      if (outAmt > 0 && outDate) {
        if (!currentDeposit) return;
        currentDeposit.withdrawals.push({ outDate, outAmt });
        g.subtotalOut += outAmt;
        grandOut += outAmt;
      }
    });
  });

  Object.keys(groups).forEach(no => {
    const g = groups[no];

    g.deposits.forEach((dep, idx) => {
      const inDate = dep.inDate;
      const inAmt = dep.inAmt;
      const withdrawals = dep.withdrawals || [];

      if (!inDate || !inAmt || withdrawals.length === 0) return;

      let totalOut = 0;
      let lastOutDate = withdrawals[0].outDate;

      const detailRows = withdrawals.map(w => {
        const days = diffDays(inDate, w.outDate);
        const periodRate = (w.outAmt - inAmt) / inAmt;
        const annualRate = calcAnnualSimpleRate(inAmt, w.outAmt, days);

        totalOut += w.outAmt;
        if (new Date(w.outDate) > new Date(lastOutDate)) {
          lastOutDate = w.outDate;
        }

        return {
          outDate: w.outDate,
          outAmt: w.outAmt,
          days,
          periodRate,
          annualRate
        };
      });

      const last = detailRows[detailRows.length - 1];
      const finalDays = last.days;
      const finalAnnualRate = last.annualRate;

      const trRes = document.createElement("tr");
      trRes.dataset.no = no;
      trRes.innerHTML = `
        <td>${no}</td>
        <td>${inDate}</td>
        <td>${inAmt.toLocaleString()}원</td>
        <td>${lastOutDate}</td>
        <td>${totalOut.toLocaleString()}원</td>
        <td>${finalDays}일</td>
        <td>${(finalAnnualRate * 100).toFixed(2)}%</td>
        <td><button type="button" onclick="toggleDetailBlock('detail-${no}-${idx}')">상세</button></td>
      `;
      resultBody.appendChild(trRes);

      allDetails.push({
        id: `detail-${no}-${idx}`,
        no,
        inDate,
        inAmt,
        finalDays,
        finalAnnualRate,
        withdrawals: detailRows
      });
    });
  });

  const subtotalArea = document.getElementById("subtotalArea");
  if (subtotalArea) {
    let html = "";
    Object.keys(groups).forEach(no => {
      const g = groups[no];
      html += `
        <div class="subtotal-box" onclick="toggleGroup('${no}', event)">
          <b>NO ${no}</b>
          <span style="margin-left:8px;">입금: ${g.subtotalIn.toLocaleString()}원</span>
          <span style="margin-left:8px;">출금: ${g.subtotalOut.toLocaleString()}원</span>
          <span style="float:right;">▼</span>
        </div>
      `;
    });
    subtotalArea.innerHTML = html;
  }

  const totalIn = document.getElementById("totalIn");
  const totalOut = document.getElementById("totalOut");
  if (totalIn) totalIn.textContent = grandIn.toLocaleString();
  if (totalOut) totalOut.textContent = grandOut.toLocaleString();

  if (detailArea) {
    detailArea.dataset.details = JSON.stringify(allDetails);
  }
}

/******************************************************
 *  상세내역 표시
 ******************************************************/
function toggleDetailBlock(detailId) {
  const detailArea = document.getElementById("detailArea");
  if (!detailArea) return;

  detailArea.innerHTML = "";

  const details = JSON.parse(detailArea.dataset.details || "[]");
  const data = details.find(d => d.id === detailId);
  if (!data) return;

  const wrapper = document.createElement("div");
  wrapper.id = detailId;
  wrapper.className = "detail-block";

  wrapper.innerHTML = `
    <h4>상세내역 (NO ${data.no}, 입금 ${data.inAmt.toLocaleString()}원)</h4>

    <table class="detail-table">
      <thead>
        <tr>
          <th>입금일자</th>
          <th>입금금액</th>
          <th>전체 이용기간(일)</th>
          <th>연 단리 이율(법 기준)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${data.inDate}</td>
          <td>${data.inAmt.toLocaleString()}원</td>
          <td>${data.finalDays}일</td>
          <td>${(data.finalAnnualRate * 100).toFixed(2)}%</td>
        </tr>
      </tbody>
    </table>

    <table class="detail-table">
      <thead>
        <tr>
          <th>출금일자</th>
          <th>출금금액</th>
          <th>이용기간(일)</th>
          <th>기간 수익률</th>
          <th>연 단리 이율</th>
        </tr>
      </thead>
      <tbody>
        ${
          data.withdrawals
            .map(
              w => `
          <tr>
            <td>${w.outDate}</td>
            <td>${w.outAmt.toLocaleString()}원</td>
            <td>${w.days}일</td>
            <td>${(w.periodRate * 100).toFixed(2)}%</td>
            <td>${(w.annualRate * 100).toFixed(2)}%</td>
          </tr>
        `
            )
            .join("")
        }
      </tbody>
    </table>
  `;

  detailArea.appendChild(wrapper);
}

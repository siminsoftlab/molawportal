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
 *  날짜 차이 계산
 ******************************************************/
function diffDays(a, b) {
  if (!a || !b) return null;
  return Math.floor((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

/******************************************************
 *  복리 연이자율 계산
 ******************************************************/
function calcRate(inAmt, outAmt, days) {
  if (!inAmt || !outAmt || !days || days <= 0) return null;
  const ratio = outAmt / inAmt;
  if (ratio <= 0) return null;
  return Math.pow(ratio, 365 / days) - 1;
}

/******************************************************
 *  행 추가 (업로드 테이블용)
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
 *  업로드 데이터 → cfTable에 로드 (원본만)
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

  // 업로드 시에는 결과/상세/소계 모두 초기화
  const resultBody = document.querySelector("#resultTable tbody");
  if (resultBody) resultBody.innerHTML = "";
  const resultSubtotalArea = document.getElementById("resultSubtotalArea");
  if (resultSubtotalArea) resultSubtotalArea.innerHTML = "";
  const detailArea = document.getElementById("detailArea");
  if (detailArea) detailArea.innerHTML = "";
  const totalIn = document.getElementById("totalIn");
  const totalOut = document.getElementById("totalOut");
  if (totalIn) totalIn.textContent = "0";
  if (totalOut) totalOut.textContent = "0";
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
 ******************************************************/
function cfParseCSV() {
  const text = document.getElementById("csvInput")?.value.trim();
  if (!text) return;
  const rows = text.split("\n").map(r => r.split(","));
  cfLoadData(rows);
}

/******************************************************
 *  메인 계산 (FIFO B2: 결과는 resultTable에만)
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
  const allDetails = [];

  // 1) NO별 그룹 구성
  rows.forEach(tr => {
    const no = tr.querySelector(".no")?.value || "";
    const inDate = tr.querySelector(".inDate")?.value || "";
    const inAmt = Number(tr.querySelector(".inAmt")?.value || 0);
    const outDate = tr.querySelector(".outDate")?.value || "";
    const outAmt = Number(tr.querySelector(".outAmt")?.value || 0);

    if (!no) return;

    if (!groups[no]) {
      groups[no] = {
        deposits: [],
        withdrawals: [],
        subtotalIn: 0,
        subtotalOut: 0
      };
    }

    if (inAmt > 0 && inDate) {
      groups[no].deposits.push({
        inDate,
        remaining: inAmt
      });
      groups[no].subtotalIn += inAmt;
      grandIn += inAmt;
    }

    if (outAmt > 0 && outDate) {
      groups[no].withdrawals.push({
        outDate,
        outAmt
      });
      groups[no].subtotalOut += outAmt;
      grandOut += outAmt;
    }
  });

  // 2) FIFO 매칭 + 출금 단위 연이자율 + 상세내역 계산 → resultTable에 행 생성
  Object.keys(groups).forEach(no => {
    const g = groups[no];

    g.deposits.sort((a, b) => new Date(a.inDate) - new Date(b.inDate));
    g.withdrawals.sort((a, b) => new Date(a.outDate) - new Date(b.outDate));

    g.withdrawals.forEach(w => {
      let remainOut = w.outAmt;
      const allocations = [];

      for (let dep of g.deposits) {
        if (remainOut <= 0) break;
        if (dep.remaining <= 0) continue;

        const use = Math.min(dep.remaining, remainOut);
        dep.remaining -= use;
        remainOut -= use;

        allocations.push({
          inDate: dep.inDate,
          principal: use
        });
      }

      const totalPrincipal = allocations.reduce((s, a) => s + a.principal, 0);
      if (totalPrincipal <= 0) return;

      const interestTotal = Math.max(0, w.outAmt - totalPrincipal);
      let weightedRateSum = 0;
      let weightedOutSum = 0;

      const detailRows = allocations.map(a => {
        const share = a.principal / totalPrincipal;
        const interest = interestTotal * share;
        const outAmt = a.principal + interest;
        const days = diffDays(a.inDate, w.outDate);
        const rate = calcRate(a.principal, outAmt, days) || 0;

        weightedRateSum += rate * outAmt;
        weightedOutSum += outAmt;

        return {
          inDate: a.inDate,
          principal: a.principal,
          interest,
          outAmt,
          days,
          rate
        };
      });

      const finalRate = weightedOutSum > 0 ? weightedRateSum / weightedOutSum : 0;
      const earliestIn = allocations[0]?.inDate;
      const displayDays = diffDays(earliestIn, w.outDate);

      const detailId = `detail-${no}-${w.outDate}-${w.outAmt}`;

      allDetails.push({
        id: detailId,
        no,
        outDate: w.outDate,
        outAmt: w.outAmt,
        finalRate,
        rows: detailRows
      });

      const trRes = document.createElement("tr");
      trRes.innerHTML = `
        <td>${no}</td>
        <td></td>
        <td></td>
        <td>${w.outDate}</td>
        <td>${w.outAmt.toLocaleString()}원</td>
        <td>${displayDays != null ? displayDays + "일" : ""}</td>
        <td>${(finalRate * 100).toFixed(2)}%</td>
        <td><button type="button" onclick="toggleDetailBlock('${detailId}')">상세보기</button></td>
      `;
      resultBody.appendChild(trRes);
    });
  });

  // 3) NO별 소계 (결과 기준)
  const resultSubtotalArea = document.getElementById("resultSubtotalArea");
  if (resultSubtotalArea) {
    let html = "";
    Object.keys(groups).forEach(no => {
      const g = groups[no];
      html += `
        <div class="subtotal-box">
          <b>NO ${no}</b>
          <span style="margin-left:8px;">입금: ${g.subtotalIn.toLocaleString()}원</span>
          <span style="margin-left:8px;">출금: ${g.subtotalOut.toLocaleString()}원</span>
        </div>
      `;
    });
    resultSubtotalArea.innerHTML = html;
  }

  // 4) 총합 (기존 footer에 표시)
  const totalIn = document.getElementById("totalIn");
  const totalOut = document.getElementById("totalOut");
  if (totalIn) totalIn.textContent = grandIn.toLocaleString();
  if (totalOut) totalOut.textContent = grandOut.toLocaleString();

  // 5) 상세내역 데이터 저장
  if (detailArea) {
    detailArea.dataset.details = JSON.stringify(allDetails);
  }
}

/******************************************************
 *  상세내역 아코디언 블록 토글
 ******************************************************/
function toggleDetailBlock(detailId) {
  const detailArea = document.getElementById("detailArea");
  if (!detailArea) return;

  const details = JSON.parse(detailArea.dataset.details || "[]");
  const data = details.find(d => d.id === detailId);
  if (!data) return;

  const existing = document.getElementById(detailId);
  if (existing) {
    existing.remove();
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.id = detailId;
  wrapper.className = "detail-block";
  wrapper.innerHTML = `
    <h4>상세내역 (NO ${data.no}, 출금 ${data.outAmt.toLocaleString()}원)</h4>

    <table class="detail-table">
      <thead>
        <tr>
          <th>출금일</th>
          <th>출금금액</th>
          <th>가중평균 연이자율</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${data.outDate}</td>
          <td>${data.outAmt.toLocaleString()}원</td>
          <td>${(data.finalRate * 100).toFixed(2)}%</td>
        </tr>
      </tbody>
    </table>

    <table class="detail-table">
      <thead>
        <tr>
          <th>입금일</th>
          <th>배정원금</th>
          <th>배정이자</th>
          <th>배정출금합계</th>
          <th>이용기간(일)</th>
          <th>개별 연이자율</th>
        </tr>
      </thead>
      <tbody>
        ${data.rows
          .map(r => `
          <tr>
            <td>${r.inDate}</td>
            <td>${r.principal.toLocaleString()}원</td>
            <td>${r.interest.toLocaleString()}원</td>
            <td>${r.outAmt.toLocaleString()}원</td>
            <td>${r.days != null ? r.days + "일" : ""}</td>
            <td>${(r.rate * 100).toFixed(2)}%</td>
          </tr>
        `)
          .join("")}
      </tbody>
    </table>
  `;

  detailArea.appendChild(wrapper);
}

/******************************************************
 *  엑셀 다운로드 (결과 테이블 기준)
 ******************************************************/
function cfExportExcel() {
  const table = document.getElementById("resultTable");
  if (!table) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, "연이자율_결과");
  XLSX.writeFile(wb, "compound_interest_result.xlsx");
}

/******************************************************
 *  PDF 다운로드 (결과 테이블 기준)
 ******************************************************/
function cfExportPDF() {
  const table = document.getElementById("resultTable");
  if (!table) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const head = [];
  table.querySelectorAll("thead th").forEach(th => {
    head.push(th.textContent.trim());
  });

  const body = [];
  table.querySelectorAll("tbody tr").forEach(tr => {
    const row = [];
    tr.querySelectorAll("td").forEach(td => {
      row.push(td.textContent.trim());
    });
    body.push(row);
  });

  doc.autoTable({
    head: [head],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 40, 40] }
  });

  doc.save("compound_interest_result.pdf");
}

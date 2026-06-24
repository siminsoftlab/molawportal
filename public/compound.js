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
 *  복리 연이자율 계산
 *  inAmt: 입금원금, outAmt: 상환총액, days: 이용기간(일)
 ******************************************************/
function calcRate(inAmt, outAmt, days) {
  if (!inAmt || !outAmt || !days || days <= 0) return null;
  const ratio = outAmt / inAmt;
  if (ratio <= 0) return null;
  return Math.pow(ratio, 365 / days) - 1;
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
    if (idx === 0) return; // 헤더 스킵

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

  // 업로드 시 결과/상세/소계 초기화
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
 *  메인 계산
 *  - 입금 단위
 *  - 이용기간: 입금일자 ~ 다음 입금일자까지
 *  - 하나의 입금은 하나 또는 여러 출금으로 상환
 *  - 출금은 여러 입금에 나눠 배정하지 않음 (레이아웃 기준)
 *  - 결과는 resultTable에만 표시
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

  const groups = {}; // NO별 그룹
  let grandIn = 0;
  let grandOut = 0;

  // 1) NO별로 행을 모으고, 입력 순서대로 처리 (엑셀처럼)
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
        deposits: [], // { inDate, inAmt, withdrawals: [{outDate,outAmt}], nextInDate }
        subtotalIn: 0,
        subtotalOut: 0
      };
    }

    groups[no].rows.push({
      tr,
      inDate,
      inAmt,
      outDate,
      outAmt
    });
  });

  const allDetails = [];

  // 2) NO별로 "입금 단위"로 묶기 (레이아웃 기준)
  Object.keys(groups).forEach(no => {
    const g = groups[no];

    // 같은 NO 안에서, 입력 순서대로 처리
    let currentDeposit = null;

    g.rows.forEach((r, idx) => {
      const { inDate, inAmt, outDate, outAmt } = r;

      // 새 입금이 있으면 새로운 deposit 시작
      if (inAmt > 0 && inDate) {
        // 이전 deposit의 nextInDate 설정
        if (currentDeposit) {
          currentDeposit.nextInDate = inDate;
        }

        currentDeposit = {
          inDate,
          inAmt,
          withdrawals: [],
          nextInDate: null
        };
        g.deposits.push(currentDeposit);
        g.subtotalIn += inAmt;
        grandIn += inAmt;
      }

      // 출금이 있으면 현재 deposit에 붙임
      if (outAmt > 0 && outDate) {
        if (!currentDeposit) {
          // 입금 없이 출금만 있는 경우는 스킵(또는 별도 처리 가능)
          return;
        }
        currentDeposit.withdrawals.push({
          outDate,
          outAmt
        });
        g.subtotalOut += outAmt;
        grandOut += outAmt;
      }
    });

    // 마지막 deposit의 nextInDate는 없음 → 나중에 마지막 출금일로 처리
  });

  // 3) 입금 단위로 이용기간/연이자율 계산 + 결과테이블 행 생성
  Object.keys(groups).forEach(no => {
    const g = groups[no];

    g.deposits.forEach((dep, idx) => {
      const inDate = dep.inDate;
      const inAmt = dep.inAmt;
      const withdrawals = dep.withdrawals || [];

      if (!inDate || !inAmt || withdrawals.length === 0) {
        return; // 상환이 없는 입금은 결과에서 제외
      }

      // 이 입금에 대한 상환총액, 마지막 출금일자
      let totalOut = 0;
      let lastOutDate = withdrawals[0].outDate;
      withdrawals.forEach(w => {
        totalOut += w.outAmt;
        if (new Date(w.outDate) > new Date(lastOutDate)) {
          lastOutDate = w.outDate;
        }
      });

      // 이용기간: 입금일자 ~ 다음 입금일자까지
      // nextInDate가 있으면 그 날짜까지, 없으면 마지막 출금일자까지
      let endDate = dep.nextInDate || lastOutDate;
      const days = diffDays(inDate, endDate);

      const rate = calcRate(inAmt, totalOut, days) || 0;

      // 결과 테이블에 한 줄 추가 (입금 단위 1행)
      const trRes = document.createElement("tr");
      trRes.dataset.no = no;
      trRes.innerHTML = `
        <td>${no}</td>
        <td>${inDate}</td>
        <td>${inAmt.toLocaleString()}원</td>
        <td>${lastOutDate}</td>
        <td>${totalOut.toLocaleString()}원</td>
        <td>${days != null ? days + "일" : ""}</td>
        <td>${(rate * 100).toFixed(2)}%</td>
        <td><button type="button" onclick="toggleDetailBlock('detail-${no}-${idx}')">상세</button></td>
      `;
      resultBody.appendChild(trRes);

      // 상세내역용 데이터 저장
      allDetails.push({
        id: `detail-${no}-${idx}`,
        no,
        inDate,
        inAmt,
        endDate,
        totalOut,
        days,
        rate,
        withdrawals
      });
    });
  });

  // 4) NO별 소계 (결과 기준) + 아코디언 클릭 시 필터링
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

  // 5) 총합 (기존 footer에 표시)
  const totalIn = document.getElementById("totalIn");
  const totalOut = document.getElementById("totalOut");
  if (totalIn) totalIn.textContent = grandIn.toLocaleString();
  if (totalOut) totalOut.textContent = grandOut.toLocaleString();

  // 6) 상세내역 데이터 저장
  if (detailArea) {
    detailArea.dataset.details = JSON.stringify(allDetails);
  }
}

/******************************************************
 *  NO별 필터링 (소계 아코디언 클릭)
 *  - 같은 NO만 보이기 / 다시 클릭 시 전체 보이기
 ******************************************************/
let currentFilterNo = null;

function toggleGroup(no, event) {
  event.stopPropagation();
  const rows = document.querySelectorAll("#resultTable tbody tr");

  if (currentFilterNo === no) {
    // 이미 이 NO로 필터링 중이면 → 전체 표시로 복귀
    rows.forEach(tr => {
      tr.style.display = "";
    });
    currentFilterNo = null;
    return;
  }

  currentFilterNo = no;
  rows.forEach(tr => {
    const rowNo = tr.dataset.no || tr.querySelector("td")?.textContent.trim() || "";
    tr.style.display = rowNo === no ? "" : "none";
  });
}

/******************************************************
 *  상세내역 아코디언 블록 토글 (입금 단위)
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
    <h4>상세내역 (NO ${data.no}, 입금 ${data.inAmt.toLocaleString()}원)</h4>

    <table class="detail-table">
      <thead>
        <tr>
          <th>입금일자</th>
          <th>입금금액</th>
          <th>이용기간(일)</th>
          <th>상환총액</th>
          <th>연이자율(복리)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${data.inDate}</td>
          <td>${data.inAmt.toLocaleString()}원</td>
          <td>${data.days != null ? data.days + "일" : ""}</td>
          <td>${data.totalOut.toLocaleString()}원</td>
          <td>${(data.rate * 100).toFixed(2)}%</td>
        </tr>
      </tbody>
    </table>

    <table class="detail-table">
      <thead>
        <tr>
          <th>출금일자</th>
          <th>출금금액</th>
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

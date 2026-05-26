/****************************************************
 * 연이자 계산기 — 표형 UI 적용 최종본
 ****************************************************/

function calcInterest() {
  const principal = Number(document.getElementById("principal").value || 0);
  const rate      = Number(document.getElementById("rate").value || 0);
  const days      = Number(document.getElementById("days").value || 0);

  const interest = Math.floor(principal * (rate / 100) * (days / 365));
  const total = principal + interest;

  /****************************************************
   * 요약 카드 (표형 UI)
   ****************************************************/
  const summary = document.getElementById("interestSummary");
  summary.innerHTML = `
  <div class="repay-highlight-box">

    <div class="row"><div class="label">원금</div>
      <div class="value">${principal.toLocaleString()}원</div></div>

    <div class="row"><div class="label">연 이자율</div>
      <div class="value">${rate}%</div></div>

    <div class="row"><div class="label">기간(일수)</div>
      <div class="value">${days}일</div></div>

    <div class="row"><div class="label">총 이자</div>
      <div class="value">${interest.toLocaleString()}원</div></div>

    <div class="row"><div class="label">총 상환금액</div>
      <div class="value">${total.toLocaleString()}원</div></div>

  </div>
`;
  summary.style.display = "block";

  /****************************************************
   * 상세 계산 (표형 UI)
   ****************************************************/
  const acc = document.getElementById("interestAccordion");
  acc.innerHTML = `
  <div class="repay-highlight-box-red">

    <div class="row"><div class="label">원금</div>
      <div class="value">${principal.toLocaleString()}원</div></div>

    <div class="row"><div class="label">연 이자율</div>
      <div class="value">${rate}%</div></div>

    <div class="row"><div class="label">기간(일수)</div>
      <div class="value">${days}일</div></div>

    <div class="row"><div class="label">총 이자</div>
      <div class="value">${interest.toLocaleString()}원</div></div>

    <div class="row"><div class="label">총 상환금액</div>
      <div class="value">${total.toLocaleString()}원</div></div>

  </div>
`;

  /****************************************************
   * 설명 div 표시
   ****************************************************/
  const explain = document.getElementById("interestExplain");
  explain.style.display = "block";
  explain.innerHTML = `
    <h3>📌 연이자 계산기 계산 설명</h3>
    <p>
      원금 ${principal.toLocaleString()}원에 연이율 ${rate}%를 적용하고 
      ${days}일 동안 계산한 이자는 <strong>${interest.toLocaleString()}원</strong>이며,
      최종 상환액은 <strong>${total.toLocaleString()}원</strong>입니다.
    </p>
    <p>
      연이자 계산 공식:<br>
      <strong>원금 × (연이율 ÷ 100) × (일수 ÷ 365)</strong>
    </p>
  `;

  setTimeout(() => explain.classList.add("visible"), 50);

  /****************************************************
   * 아코디언 초기화
   ****************************************************/
  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const btn = document.querySelector(".interest-accordion-btn");
  btn.textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 상세보기 토글
 ****************************************************/
function toggleAccordion() {
  const box = document.getElementById("interestAccordion");
  const btn = document.querySelector(".interest-accordion-btn");

  const isOpen = box.classList.contains("open");

  if (isOpen) {
    box.classList.remove("open");
    box.style.maxHeight = null;
    btn.textContent = "계산 상세 보기 ▼";
  } else {
    box.classList.add("open");
    box.style.maxHeight = box.scrollHeight + "px";
    btn.textContent = "계산 상세 접기 ▲";
  }
}

/****************************************************
 * 초기화
 ****************************************************/
function resetInterestInputs() {
  document.getElementById("principal").value = "";
  document.getElementById("rate").value = 20;
  document.getElementById("days").value = "";

  document.getElementById("interestSummary").style.display = "none";

  const acc = document.getElementById("interestAccordion");
  acc.innerHTML = "";
  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const explain = document.getElementById("interestExplain");
  explain.innerHTML = "";
  explain.style.display = "none";
  explain.classList.remove("visible");

  const btn = document.querySelector(".interest-accordion-btn");
  btn.textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 날짜 선택 시 자동으로 일수 계산
 ****************************************************/
function updateDays() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  if (!from || !to) return;

  const start = new Date(from);
  const end = new Date(to);

  const diffTime = end - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 0) {
    document.getElementById("days").value = diffDays;
  }
}

document.getElementById("fromDate").addEventListener("change", updateDays);
document.getElementById("toDate").addEventListener("change", updateDays);

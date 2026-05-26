/****************************************************
 * 법원 생계비 계산기 — 순수 생계비 계산 전용 버전
 ****************************************************/

/* 숫자 처리 */
function getInt(id) {
  return parseInt(
    (document.getElementById(id).value || "0").replace(/[^\d]/g, "")
  ) || 0;
}

/* 반올림 */
function preciseRound(num) {
  return Math.round((num + Number.EPSILON));
}

/* 가구수 텍스트 */
function getHouseholdLabel(household) {
  return `${household}인`;
}

/****************************************************
 * 가구 수 선택 시 법원 생계비 자동 계산
 ****************************************************/
function updateCourtLiving() {
  const household = getInt('la_household') || 1;

  const baseLiving1 = 1538523;
  const weights = {1:1.0, 2:1.5, 3:2.1, 4:2.6, 5:3.1};

  const courtLiving = preciseRound(baseLiving1 * (weights[household] || 1));

  document.getElementById('la_court_living').value = courtLiving;
}

/****************************************************
 * 상세 계산 아코디언
 ****************************************************/
function toggleLivingAccordion() {
  const box = document.getElementById("la_accordion");
  const btn = document.querySelector(".la-acc-btn");

  if (!box || !btn) return;

  if (box.classList.contains("open")) {
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
function resetLivingAdjust() {
  ["la_income","la_extra","la_months"].forEach(id=>{
    document.getElementById(id).value = id === "la_months" ? "36" : "";
  });

  document.getElementById("la_summary").style.display = "none";

  const acc = document.getElementById("la_accordion");
  acc.innerHTML = "";
  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const explain = document.getElementById("la_explain");
  explain.innerHTML = "";
  explain.style.display = "none";

  const btn = document.querySelector(".la-acc-btn");
  if (btn) btn.textContent = "계산 상세 보기 ▼";

  updateCourtLiving();
}

/****************************************************
 * 계산 (법원 생계비 계산기)
 ****************************************************/
function calcLivingAdjust() {
  const income      = getInt('la_income');
  const household   = getInt('la_household');
  const courtLiving = getInt('la_court_living');
  const extraInput  = getInt('la_extra');
  const months      = getInt('la_months');

  /* 추가 생계비 인정 */
  const extraLimit   = preciseRound(courtLiving * 0.3);
  const allowedExtra = Math.min(extraInput, extraLimit);

  /* 총 생계비 */
  const totalLiving  = courtLiving + allowedExtra;

  /* 월 변제 가능 금액 */
  const disposable   = Math.max(income - totalLiving, 0);

  /* 총 변제예정액 */
  const totalRepay   = disposable * months;

  /****************************************************
   * 요약 카드
   ****************************************************/
  const summary = document.getElementById("la_summary");
  summary.style.display = "block";
  summary.innerHTML = `
    <div class="repay-highlight-box">

      <div class="row"><div class="label">월 소득</div>
        <div class="value">${income.toLocaleString()}원</div></div>

      <div class="row"><div class="label">법원 기준 생계비 (${getHouseholdLabel(household)})</div>
        <div class="value">${courtLiving.toLocaleString()}원</div></div>

      <div class="row"><div class="label">추가 생계비(입력)</div>
        <div class="value">${extraInput.toLocaleString()}원</div></div>

      <div class="row"><div class="label">추가 생계비(인정)</div>
        <div class="value">${allowedExtra.toLocaleString()}원</div></div>

      <div class="row"><div class="label">총 인정 생계비</div>
        <div class="value">${totalLiving.toLocaleString()}원</div></div>

      <div class="row"><div class="label">월 변제 가능 금액</div>
        <div class="value">${disposable.toLocaleString()}원</div></div>

      <div class="row"><div class="label">총 변제예정액 (${months}개월)</div>
        <div class="value">${totalRepay.toLocaleString()}원</div></div>

    </div>
  `;

  /****************************************************
   * 자동 설명
   ****************************************************/
  const explain = document.getElementById("la_explain");
  explain.style.display = "block";
  explain.innerHTML = `
    <h3>📌 법원 인정 생계비 계산 설명</h3>
    <p>선택한 가구 수는 <strong>${getHouseholdLabel(household)}</strong>이며,  
    이에 따른 법원 기준 생계비는 <strong>${courtLiving.toLocaleString()}원</strong>입니다.</p>

    <p>추가 생계비는 입력값 <strong>${extraInput.toLocaleString()}원</strong> 중  
    법원에서 인정되는 금액은 <strong>${allowedExtra.toLocaleString()}원</strong>입니다.</p>

    <p>따라서 최종 인정 생계비는 <strong>${totalLiving.toLocaleString()}원</strong>이며,  
    월 소득 <strong>${income.toLocaleString()}원</strong> 기준  
    월 변제 가능 금액은 <strong>${disposable.toLocaleString()}원</strong>입니다.</p>

    <p>${months}개월 동안 납부 가능한 총 변제예정액은  
    <strong>${totalRepay.toLocaleString()}원</strong>입니다.</p>
  `;

  /****************************************************
   * 상세 계산
   ****************************************************/
  const acc = document.getElementById("la_accordion");
 acc.innerHTML = `
  <div class="repay-highlight-box-red">

    <div class="row">
      <div class="label">월 소득</div>
      <div class="value">${income.toLocaleString()}원</div>
    </div>

    <div class="row">
      <div class="label">법원 기준 생계비 (${getHouseholdLabel(household)})</div>
      <div class="value">${courtLiving.toLocaleString()}원</div>
    </div>

    <div class="row">
      <div class="label">추가 생계비(입력)</div>
      <div class="value">${extraInput.toLocaleString()}원</div>
    </div>

    <div class="row">
      <div class="label">추가 생계비(인정)</div>
      <div class="value">${allowedExtra.toLocaleString()}원</div>
    </div>

    <div class="row">
      <div class="label">총 인정 생계비</div>
      <div class="value">${totalLiving.toLocaleString()}원</div>
    </div>

    <div class="row">
      <div class="label">월 변제 가능 금액</div>
      <div class="value">${disposable.toLocaleString()}원</div>
    </div>

    <div class="row">
      <div class="label">총 변제예정액 (${months}개월)</div>
      <div class="value">${totalRepay.toLocaleString()}원</div>
    </div>

  </div>
`;


  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const btn = document.querySelector(".la-acc-btn");
  if (btn) btn.textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 이벤트 연결
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  updateCourtLiving();
  document.getElementById('la_household').addEventListener('change', updateCourtLiving);
  document.querySelector(".la-acc-btn").addEventListener("click", toggleLivingAccordion);
});

/****************************************************
 * 법원 생계비 계산기 — 오류 없는 완성본
 ****************************************************/

/* 숫자 처리 */
function getInt(id) {
  return parseInt(
    (document.getElementById(id).value || "0").replace(/[^\d]/g, "")
  ) || 0;
}

/* 오차 제거 */
function preciseRound(num) {
  return Math.round((num + Number.EPSILON));
}

/* 가구수 텍스트 */
function getHouseholdLabel(household) {
  return `${household}인`;
}

document.addEventListener("DOMContentLoaded", () => {

  /****************************************************
   * 법원 생계비 자동 계산 (가구수 기준)
   ****************************************************/
  function getCourtLiving(household) {
    const baseLiving1 = 1538523;
    const weights = {1:1.0, 2:1.5, 3:2.1, 4:2.6, 5:3.1};
    return preciseRound(baseLiving1 * (weights[household] || 1));
  }

  /* 가구 수 선택 시 living 자동 입력 */
  function updateLivingByHousehold() {
    const household = getInt("la_household") || 1;
    const courtLiving = getCourtLiving(household);
    document.getElementById("living").value = courtLiving;
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
  window.resetLivingAdjust = function () {
    ["la_income","la_living_user","la_extra"].forEach(id=>{
      document.getElementById(id).value = "";
    });

    document.getElementById("la_months").value = "36";
    document.getElementById("la_summary").innerHTML = "";
    document.getElementById("la_accordion").innerHTML = "";
    document.getElementById("la_explain").innerHTML = "";

    const acc = document.getElementById("la_accordion");
    acc.classList.remove("open");
    acc.style.maxHeight = null;

    const explain = document.getElementById("la_explain");
    explain.style.display = "none";

    const btn = document.querySelector(".la-acc-btn");
    if (btn) btn.textContent = "계산 상세 보기 ▼";

    updateLivingByHousehold();
  };

  /****************************************************
   * 계산 (법원 생계비 계산기)
   ****************************************************/
  window.calcLivingAdjust = function () {
    const income       = getInt('la_income');
    const household    = getInt('la_household');
    const userLiving   = getInt('la_living_user');
    const extraInput   = getInt('la_extra');
    const months       = getInt('la_months');

    /* living 값이 비어 있으면 자동 보정 */
    let courtLiving = getInt('living');
    if (!courtLiving) {
      courtLiving = getCourtLiving(household);
      document.getElementById("living").value = courtLiving;
    }

    /* 추가 생계비 인정 */
    const extraLimit   = preciseRound(courtLiving * 0.3);
    const allowedExtra = Math.min(extraInput, extraLimit);

    /* 총 생계비 */
    const totalLiving  = courtLiving + allowedExtra;

    /* 변제 가능 금액 */
    const disposable   = Math.max(income - totalLiving, 0);
    const totalRepay   = disposable * months;

    /****************************************************
     * 요약 카드
     ****************************************************/
    const summary = document.getElementById("la_summary");
    summary.innerHTML = `
      <div class="repay-highlight-box">

        <div class="row"><div class="label">월 소득</div>
          <div class="value">${income.toLocaleString()}원</div></div>

        <div class="row"><div class="label">법원 생계비(${getHouseholdLabel(household)})</div>
          <div class="value">${courtLiving.toLocaleString()}원</div></div>

        <div class="row"><div class="label">사용자 입력 생계비</div>
          <div class="value">${userLiving.toLocaleString()}원</div></div>

        <div class="row"><div class="label">추가 생계비(입력)</div>
          <div class="value">${extraInput.toLocaleString()}원</div></div>

        <div class="row"><div class="label">추가 생계비(인정)</div>
          <div class="value">${allowedExtra.toLocaleString()}원</div></div>

        <div class="row"><div class="label">총 생계비</div>
          <div class="value">${totalLiving.toLocaleString()}원</div></div>

        <div class="row"><div class="label">월 변제 가능 금액</div>
          <div class="value">${disposable.toLocaleString()}원</div></div>

        <div class="row"><div class="label">총 변제예정액</div>
          <div class="value">${totalRepay.toLocaleString()}원</div></div>

      </div>
    `;

    /****************************************************
     * 자동 설명
     ****************************************************/
    /****************************************************
     * 상세 계산
     ****************************************************/
    const acc = document.getElementById("la_accordion");
    acc.innerHTML = `
      <p>입력한 생계비는 <strong>${userLiving.toLocaleString()}원</strong>이며,  
      법원 기준(${getHouseholdLabel(household)}) 생계비는 <strong>${courtLiving.toLocaleString()}원</strong>입니다.</p>

      <p>추가 생계비는 입력값 <strong>${extraInput.toLocaleString()}원</strong> 중  
      법원에서 인정되는 금액은 <strong>${allowedExtra.toLocaleString()}원</strong>입니다.</p>

      <p>따라서 총 생계비는 <strong>${totalLiving.toLocaleString()}원</strong>이고,  
      월 변제 가능 금액은 <strong>${disposable.toLocaleString()}원</strong>입니다.</p>

      <p>변제기간 ${months}개월 기준 총 변제예정액은  
      <strong>${totalRepay.toLocaleString()}원</strong>으로 계산되었습니다.</p>
    `;

    acc.classList.remove("open");
    acc.style.maxHeight = null;

    const btn = document.querySelector(".la-acc-btn");
    if (btn) btn.textContent = "계산 상세 보기 ▼";
  };

  /****************************************************
   * 이벤트 연결
   ****************************************************/
  document.getElementById("la_household")
    .addEventListener("change", updateLivingByHousehold);

  updateLivingByHousehold();

  document.querySelector(".la-acc-btn").addEventListener("click", toggleLivingAccordion);
});

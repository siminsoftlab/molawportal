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

      <div class="row"><div class="label">PV 충족 최소 변제금</div>
        <div class="value">${requiredFinalPay.toLocaleString()}원</div></div>

      <div class="row"><div class="label">최종 변제금</div>
        <div class="value">${finalPay.toLocaleString()}원</div></div>

      <div class="row"><div class="label">현재가치(PV)</div>
        <div class="value">${presentValue.toLocaleString()}원</div></div>

      <div class="row"><div class="label">청산가치 충족 여부</div>
        <div class="value" style="color:${meetsPV ? '#008000' : '#d60000'};">
          ${meetsPV ? "✔ 충족" : "✘ 미충족"}
        </div>
      </div>

    </div>
  `;

  /****************************************************
   * 자동 설명 (개인회생 계산기 스타일)
   ****************************************************/
  const explain = document.getElementById("la_explain");
  explain.style.display = "block";
  explain.innerHTML = `
    <p>입력한 생계비 기준으로 계산된 월 변제 가능 금액은 <strong>${disposable.toLocaleString()}원</strong>입니다.</p>

    <p>총 변제예정액은 <strong>${totalRepay.toLocaleString()}원</strong>이며,  
    최종 변제금은 <strong>${finalPay.toLocaleString()}원</strong>입니다.</p>

    <p>현재가치(PV)는 <strong>${presentValue.toLocaleString()}원</strong>이며,  
    청산가치 <strong>${asset.toLocaleString()}원</strong>을  
    ${meetsPV ? "<strong>충족합니다.</strong>" : "<strong>충족하지 못합니다.</strong>"}</p>
  `;

  /****************************************************
   * 상세 계산
   ****************************************************/
  const acc = document.getElementById("la_accordion");
  acc.innerHTML = `
  <p><strong>월 소득</strong>은 ${income.toLocaleString()}원입니다.</p>

  <p><strong>법원 생계비(${getHouseholdLabel(household)})</strong>는  
  ${courtLiving.toLocaleString()}원이며,  
  <strong>추가 생계비(인정)</strong>은 ${allowedExtra.toLocaleString()}원입니다.</p>

  <p>따라서 <strong>총 생계비</strong>는  
  ${totalLiving.toLocaleString()}원입니다.</p>

  <p><strong>월 변제 가능 금액</strong>은  
  ${disposable.toLocaleString()}원이며,  
  <strong>총 변제예정액</strong>은  
  ${totalRepay.toLocaleString()}원입니다.</p>

  <p><strong>PV 충족 최소 변제금</strong>은  
  ${requiredFinalPay.toLocaleString()}원이며,  
  <strong>최종 변제금</strong>은  
  ${finalPay.toLocaleString()}원입니다.</p>

  <p><strong>현재가치(PV)</strong>는  
  ${presentValue.toLocaleString()}원이며,  
  청산가치 <strong>${asset.toLocaleString()}원</strong>을  
  ${meetsPV ? "<span style='color:#008000;'>충족합니다.</span>" : "<span style='color:#d60000;'>충족하지 못합니다.</span>"}</p>
`;

  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const btn = document.querySelector(".la-acc-btn");
  if (btn) btn.textContent = "계산 상세 보기 ▼";
}

  /****************************************************
   * 이벤트 연결
   ****************************************************/
  document.getElementById("la_household")
    .addEventListener("change", updateLivingByHousehold);

  updateLivingByHousehold();

  document.querySelector(".la-acc-btn").addEventListener("click", toggleLivingAccordion);
});

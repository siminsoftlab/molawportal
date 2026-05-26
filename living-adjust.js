/****************************************************
 * 법원 생계비 계산기 — 오차 제거 버전 (2026 최종)
 * - 정규식 숫자 처리
 * - 법원 생계비 자동 계산
 * - 법원 생계비(가구수) 표기
 * - 추가 생계비 입력값 보존 + 인정값 별도 계산
 * - PV·청산가치 충족
 * - 부동소수점 오차 제거 (preciseRound)
 * - 개인회생 계산기 항목 완전 제거
 ****************************************************/

/* 정규식 기반 숫자 처리 */
function getInt(id) {
  return parseInt(
    (document.getElementById(id).value || "0").replace(/[^\d]/g, "")
  ) || 0;
}

/* 부동소수점 오차 제거용 */
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
  ["la_income","la_extra","la_debt","la_asset"].forEach(id=>{
    document.getElementById(id).value = "";
  });

  document.getElementById("la_months").value = "36";

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
 * 계산 (법원 생계비 계산기 전용)
 ****************************************************/
function calcLivingAdjust() {
  const income       = getInt('la_income');
  const household    = getInt('la_household');
  const courtLiving  = getInt('la_court_living');
  const extraInput   = getInt('la_extra');   // 입력값 그대로 유지
  const months       = getInt('la_months');
  const asset        = getInt('la_asset');

  /****************************************************
   * 추가 생계비 인정 한도 (법원 기준)
   ****************************************************/
  const extraLimit   = preciseRound(courtLiving * 0.3);
  const allowedExtra = Math.min(extraInput, extraLimit);

  const totalLiving  = courtLiving + allowedExtra;
  const disposable   = Math.max(income - totalLiving, 0);
  const totalRepay   = disposable * months;

  /****************************************************
   * PV·청산가치 충족 (법원 필수 기준)
   ****************************************************/
  const discountRate = 0.03;
  const years        = months / 12;

  const requiredFinalPay = asset > 0
    ? preciseRound(asset * Math.pow(1 + discountRate, years))
    : 0;

  const finalPay = Math.max(totalRepay, requiredFinalPay, asset);

  const presentValue = finalPay > 0
    ? preciseRound(finalPay / Math.pow(1 + discountRate, years))
    : 0;

  const meetsPV = asset > 0 ? presentValue >= asset : true;

  /****************************************************
   * 요약 카드
   ****************************************************/
  const summary = document.getElementById("la_summary");
  summary.style.display = "block";
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
   * 설명 박스
   ****************************************************/
  const explain = document.getElementById("la_explain");
  explain.style.display = "block";
  explain.innerHTML = `
    <h3>📌 법원 생계비 계산 설명</h3>
    <p>월 소득: ${income.toLocaleString()}원</p>
    <p>법원 생계비(${getHouseholdLabel(household)}): ${courtLiving.toLocaleString()}원</p>
    <p>추가 생계비(입력): ${extraInput.toLocaleString()}원</p>
    <p>추가 생계비(인정): ${allowedExtra.toLocaleString()}원</p>
    <p>총 생계비: ${totalLiving.toLocaleString()}원</p>
    <p>월 변제 가능 금액: ${disposable.toLocaleString()}원</p>
    <p>총 변제예정액: ${totalRepay.toLocaleString()}원</p>
    <p>PV 충족 최소 변제금: ${requiredFinalPay.toLocaleString()}원</p>
    <p>최종 변제금: ${finalPay.toLocaleString()}원</p>
    <p>현재가치(PV): ${presentValue.toLocaleString()}원</p>
    <p style="color:${meetsPV ? '#008000' : '#d60000'};">
      ${meetsPV ? "✔ PV가 청산가치를 충족합니다." : "✘ PV가 청산가치를 충족하지 못합니다."}
    </p>
  `;

  /****************************************************
   * 상세 계산
   ****************************************************/
  const acc = document.getElementById("la_accordion");
  acc.innerHTML = `
    <div class="calc-step"><strong>월 소득</strong><br>${income.toLocaleString()}원</div>
    <div class="calc-step"><strong>법원 생계비(${getHouseholdLabel(household)})</strong><br>${courtLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>추가 생계비(입력)</strong><br>${extraInput.toLocaleString()}원</div>
    <div class="calc-step"><strong>추가 생계비(인정)</strong><br>${allowedExtra.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 생계비</strong><br>${totalLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>월 변제 가능 금액</strong><br>${disposable.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 변제예정액</strong><br>${totalRepay.toLocaleString()}원</div>
    <div class="calc-step"><strong>PV 충족 최소 변제금</strong><br>${requiredFinalPay.toLocaleString()}원</div>
    <div class="calc-step"><strong>최종 변제금</strong><br>${finalPay.toLocaleString()}원</div>
    <div class="calc-step"><strong>현재가치(PV)</strong><br>${presentValue.toLocaleString()}원</div>
    <div class="calc-step"><strong>청산가치 충족 여부</strong><br>
      <span style="color:${meetsPV ? '#008000' : '#d60000'};">
        ${meetsPV ? "✔ 충족" : "✘ 미충족"}
      </span>
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
  const hh = document.getElementById('la_household');
  if (hh) hh.addEventListener('change', updateCourtLiving);

  const accBtn = document.querySelector(".la-acc-btn");
  if (accBtn) accBtn.addEventListener("click", toggleLivingAccordion);

  /* 설명 아코디언 */
  document.querySelectorAll(".toggle-arrow").forEach(btn => {
    btn.addEventListener("click", function () {
      const answer = this.nextElementSibling;
      if (!answer) return;
      const isOpen = answer.style.display === "block";
      answer.style.display = isOpen ? "none" : "block";
      this.textContent = isOpen
        ? this.textContent.replace("▲", "▼")
        : this.textContent.replace("▼", "▲");
    });
  });

  /* FAQ 아코디언 */
  document.querySelectorAll(".faq-question").forEach(btn => {
    btn.addEventListener("click", function () {
      const answer = this.nextElementSibling;
      if (!answer) return;
      const isOpen = answer.style.display === "block";
      answer.style.display = isOpen ? "none" : "block";
    });
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const explainBtn = document.querySelector(".toggle-arrow");
  const explainBox = document.querySelector(".explain-answer");

  explainBtn.addEventListener("click", () => {
    const isOpen = explainBox.style.display === "block";
    explainBox.style.display = isOpen ? "none" : "block";

    explainBtn.textContent = isOpen
      ? "법원 생계비 계산기 설명 보기 ▼"
      : "법원 생계비 계산기 설명 접기 ▲";
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const explainBtn = document.querySelector(".explain-toggle");
  const explainBox = document.querySelector(".explain-answer");

  explainBtn.addEventListener("click", () => {
    const isOpen = explainBox.style.display === "block";

    explainBox.style.display = isOpen ? "none" : "block";

    explainBtn.textContent = isOpen
      ? "법원 생계비 계산기 설명 보기 ▼"
      : "법원 생계비 계산기 설명 접기 ▲";
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".explain-question");
  const box = document.querySelector(".explain-answer");

  btn.addEventListener("click", () => {
    const isOpen = box.style.display === "block";

    box.style.display = isOpen ? "none" : "block";

    btn.textContent = isOpen
      ? "법원 생계비 계산기 설명 보기 ▼"
      : "법원 생계비 계산기 설명 접기 ▲";
  });
});


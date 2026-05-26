/****************************************************
 * 개인회생 변제금 계산기 — 최종 통합본 (2026)
 * - PV 충족 자동조정
 * - 자동조정 안내
 * - 상세 계산 자동조정 사유
 * - FAQ 아코디언
 * - 설명 아코디언
 * - 콤마 자동포맷
 ****************************************************/

/* 공통 유틸 */
function $(id) {
  return document.getElementById(id);
}

function toNumber(v) {
  if (typeof v === "string") {
    v = v.replace(/,/g, "");
  }
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/****************************************************
 * 숫자 입력 콤마 자동 포맷
 ****************************************************/
function formatNumberInput(el) {
  let val = el.value.replace(/,/g, "").replace(/[^\d]/g, "");
  if (val === "") {
    el.value = "";
    return;
  }
  el.value = Number(val).toLocaleString();
}

/****************************************************
 * 법원 생계비 자동 계산 (가구 수 기반)
 ****************************************************/
function calcCourtLiving(household) {
  const baseLiving1 = 1538523; // 1인 기준
  const weights = { 1:1.0, 2:1.5, 3:2.1, 4:2.6, 5:3.1 };
  return Math.round(baseLiving1 * (weights[household] || 1));
}

function updateLivingCost() {
  const household = Number($("household").value || 1);
  $("living").value = calcCourtLiving(household).toLocaleString();
}

/****************************************************
 * 계산하기
 ****************************************************/
function calcRepay() {

  const debt   = toNumber($("debt").value);
  const income = toNumber($("income").value);
  const living = toNumber($("living").value);
  const extra  = toNumber($("extra").value);
  const months = toNumber($("months").value);
  const asset  = toNumber($("asset").value);

  // 가용소득
  const disposable = income - living - extra;
  const monthlyPay = Math.max(disposable, 0);

  // 총 변제예정액
  const totalPay = monthlyPay * months;

  /****************************************************
   * ⭐ PV 충족을 위한 최소 변제금 계산
   ****************************************************/
  const discountRate = 0.03;
  const years = months / 12;

  const requiredFinalPay = Math.round(asset * Math.pow(1 + discountRate, years));

  /****************************************************
   * ⭐ 최종 변제금 = 유보액, 청산가치, requiredFinalPay 중 가장 큰 값
   ****************************************************/
  const finalPay = Math.max(totalPay, asset, requiredFinalPay);

  // 자동 조정 여부
  const autoAdjusted = finalPay === requiredFinalPay;

  // 변제율
  const repayRate = debt > 0 ? ((finalPay / debt) * 100).toFixed(1) : "0.0";

  // 탕감률
  const reliefRate = (100 - Number(repayRate)).toFixed(1);

  // PV 계산
  const presentValue = Math.round(finalPay / Math.pow(1 + discountRate, years));

  // PV ≥ 청산가치 → 항상 충족
  const meetsAssetRequirement = presentValue >= asset;

  /****************************************************
   * 요약 카드
   ****************************************************/
  const summary = $("repaySummary");
  summary.style.display = "block";

  summary.innerHTML = `
    <div class="repay-highlight-box">

      <div class="row"><div class="label">총 부채</div>
        <div class="value">${debt.toLocaleString()}원</div></div>

      <div class="row"><div class="label">월 변제 가능 금액</div>
        <div class="value">${monthlyPay.toLocaleString()}원</div></div>

      <div class="row"><div class="label">총 변제예정액(유보액)</div>
        <div class="value">${totalPay.toLocaleString()}원</div></div>

      <div class="row"><div class="label">최종 변제금</div>
        <div class="value">${finalPay.toLocaleString()}원</div></div>

      ${autoAdjusted ? `
        <div class="auto-adjust-msg">
          ⚙️ PV(현재가치) 충족을 위해 변제금이 자동 조정되었습니다.
        </div>
      ` : ""}

      <div class="row"><div class="label">변제율</div>
        <div class="value">${repayRate}%</div></div>

      <div class="rate-big">
        탕감률 ${reliefRate}%<br>
        <span style="font-size:0.9rem; font-weight:600;">(법원에서 탕감되는 비율)</span>
      </div>

      <div class="row"><div class="label">현재가치(PV)</div>
        <div class="value">${presentValue.toLocaleString()}원</div></div>

      <div class="row"><div class="label">청산가치 충족 여부</div>
        <div class="value" style="color:#008000;">✔ 충족</div></div>

    </div>
  `;

  /****************************************************
   * 상세 계산 (아코디언)
   ****************************************************/
  const acc = $("repayAccordion");
  acc.innerHTML = `
    <div class="calc-step"><strong>1) 총 부채</strong><br>${debt.toLocaleString()}원</div>

    <div class="calc-step"><strong>2) 월 소득</strong><br>${income.toLocaleString()}원</div>

    <div class="calc-step"><strong>3) 법원 생계비</strong><br>${living.toLocaleString()}원</div>

    <div class="calc-step"><strong>4) 추가 생계비</strong><br>${extra.toLocaleString()}원</div>

    <div class="calc-step"><strong>5) 가용소득</strong><br>
      ${income.toLocaleString()} − ${living.toLocaleString()}
      ${extra > 0 ? ` − ${extra.toLocaleString()}` : ""}
      <br>= <strong>${monthlyPay.toLocaleString()}원</strong>
    </div>

    <div class="calc-step"><strong>6) 변제기간</strong><br>${months}개월</div>

    <div class="calc-step"><strong>7) 총 변제예정액(유보액)</strong><br>
      ${monthlyPay.toLocaleString()} × ${months} = <strong>${totalPay.toLocaleString()}원</strong>
    </div>

    <div class="calc-step"><strong>8) PV 충족을 위한 최소 변제금(FV)</strong><br>
      <strong>${requiredFinalPay.toLocaleString()}원</strong>
    </div>

    <div class="calc-step"><strong>9) 현재가치(PV)</strong><br>
      <strong>${presentValue.toLocaleString()}원</strong>
    </div>

    <div class="calc-step"><strong>10) 청산가치 비교</strong><br>
      청산가치: ${asset.toLocaleString()}원<br>
      PV: ${presentValue.toLocaleString()}원<br>
      <strong style="color:#008000;">✔ 청산가치 충족</strong>
    </div>

    <div class="calc-step"><strong>11) 변제율·탕감률</strong><br>
      변제율: ${repayRate}%<br>
      탕감률: ${reliefRate}%
    </div>

    ${autoAdjusted ? `
      <div class="calc-step"><strong>12) 자동 조정 사유</strong><br>
        ⚙️ PV ≥ 청산가치를 충족하기 위해 변제금이 자동으로 상향 조정되었습니다.
      </div>
    ` : ""}
  `;

  /****************************************************
   * 자동 설명
   ****************************************************/
  const explain = $("repayExplain");
  explain.style.display = "block";
  explain.innerHTML = `
    <h3>📌 변제율·탕감률 자동 설명</h3>
    <p>
      총 부채 중 <strong>${repayRate}%</strong>는 실제로 갚아야 하는 금액이며,<br>
      <strong>${reliefRate}%</strong>는 법원에서 탕감되는 금액입니다.
    </p>
    <p>
      최종 변제금의 현재가치(PV)는 <strong>${presentValue.toLocaleString()}원</strong>이며,<br>
      청산가치 <strong>${asset.toLocaleString()}원</strong>을 충족합니다.
    </p>

    ${autoAdjusted ? `
      <p style="color:#2a5f9e; font-weight:600;">
        ⚙️ 이번 계산에서는 PV 충족을 위해 변제금이 자동으로 조정되었습니다.
      </p>
    ` : ""}
  `;

  setTimeout(() => explain.classList.add("visible"), 50);

  acc.classList.remove("open");
  acc.style.maxHeight = null;

  document.querySelector(".repay-accordion-btn").textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 초기화
 ****************************************************/
function resetRepayInputs() {
  $("debt").value = "";
  $("income").value = "";
  $("extra").value = "";
  $("months").value = "36";
  $("asset").value = "";
  $("household").value = "1";

  updateLivingCost();

  $("repaySummary").style.display = "none";
  $("repayAccordion").innerHTML = "";
  $("repayExplain").innerHTML = "";
  $("repayExplain").style.display = "none";
  $("repayExplain").classList.remove("visible");

  document.querySelector(".repay-accordion-btn").textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 상세보기 토글
 ****************************************************/
function toggleAccordionRepay() {
  const box = $("repayAccordion");
  const btn = document.querySelector(".repay-accordion-btn");

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
 * FAQ + 설명 아코디언 + 콤마 자동포맷
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {

  /* 법원 생계비 자동 계산 */
  updateLivingCost();
  $("household").addEventListener("change", updateLivingCost);

  /* 숫자 입력 콤마 자동 포맷 */
  const numberInputs = ["debt", "income", "living", "extra", "asset"];
  numberInputs.forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => formatNumberInput(el));
    el.addEventListener("blur", () => formatNumberInput(el));
  });

  /* FAQ 아코디언 */
  const faqButtons = document.querySelectorAll(".faq-question");

  faqButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const answer = btn.nextElementSibling;
      const isOpen = answer.style.display === "block";

      if (isOpen) {
        answer.style.display = "none";
        btn.innerHTML = btn.innerHTML.replace("▲", "▼");
      } else {
        answer.style.display = "block";
        btn.innerHTML = btn.innerHTML.replace("▼", "▲");
      }
    });
  });

  /* 설명 아코디언 */
  const toggleBtn = document.querySelector(".toggle-arrow");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const answer = toggleBtn.nextElementSibling;
      const isOpen = answer.style.display === "block";

      if (isOpen) {
        answer.style.display = "none";
        toggleBtn.innerHTML = "개인회생 변제금 계산기 설명 보기 ▼";
      } else {
        answer.style.display = "block";
        toggleBtn.innerHTML = "개인회생 변제금 계산기 설명 접기 ▲";
      }
    });
  }
});

/****************************************************
 * 법원 생계비 계산기 — 최종 안정화 버전 (2026)
 * - 가구 수 선택 시 법원 생계비 자동 표시
 * - 법원 생계비 textbox는 readonly
 * - 계산은 textbox 값만 사용
 * - 설명/FAQ/상세보기 아코디언 정상화
 ****************************************************/

/****************************************************
 * 법원 생계비 자동 계산 (가구 수 변경 시)
 ****************************************************/
function updateCourtLiving() {
  const household = Number(document.getElementById('la_household').value || 1);

  const baseLiving1 = 1538523;
  const weights = {1:1.0, 2:1.5, 3:2.1, 4:2.6, 5:3.1};

  const courtLiving = Math.round(baseLiving1 * (weights[household] || 1));

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
  ["la_income","la_living_user","la_extra","la_debt","la_asset"].forEach(id=>{
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

  document.querySelector(".la-acc-btn").textContent = "계산 상세 보기 ▼";

  updateCourtLiving();
}

/****************************************************
 * 계산
 ****************************************************/
function calcLivingAdjust() {
  const income    = Number(document.getElementById('la_income').value || 0);
  const household = Number(document.getElementById('la_household').value || 1);

  // 🔥 법원 생계비 textbox 값만 사용
  const courtLiving = Number(document.getElementById('la_court_living').value || 0);

  const extra     = Number(document.getElementById('la_extra').value || 0);
  const months    = Number(document.getElementById('la_months').value || 0);
  const debt      = Number(document.getElementById('la_debt').value || 0);
  const asset     = Number(document.getElementById('la_asset').value || 0);

  // 최종 인정 생계비 = 법원 생계비 그대로 사용
  const finalLiving = courtLiving;

  // 총 생계비
  const totalLiving = finalLiving + extra;

  // 가용소득
  const disposable = Math.max(income - totalLiving, 0);

  // 총 변제예정액
  const totalRepay = disposable * months;

  // 최종 변제금
  const finalPay = Math.max(totalRepay, asset);

  // 변제율·탕감률
  const repayRate = debt > 0 ? ((finalPay / debt) * 100).toFixed(1) : "0.0";
  const reliefRate = (100 - Number(repayRate)).toFixed(1);

  // PV 계산
  const discountRate = 0.03;
  const years = months / 12;
  const presentValue = finalPay > 0 ? finalPay / Math.pow(1 + discountRate, years) : 0;
  const presentValueRounded = Math.round(presentValue);

  const meetsAssetRequirement = presentValueRounded >= asset && asset > 0;

  /****************************************************
   * 요약 카드
   ****************************************************/
  const summary = document.getElementById("la_summary");
  summary.style.display = "block";
  summary.innerHTML = `
    <div class="repay-highlight-box">
      <div class="row"><div class="label">법원 생계비</div>
        <div class="value">${courtLiving.toLocaleString()}원</div></div>

      <div class="row"><div class="label">총 생계비</div>
        <div class="value">${totalLiving.toLocaleString()}원</div></div>

      <div class="row"><div class="label">월 변제 가능 금액</div>
        <div class="value">${disposable.toLocaleString()}원</div></div>

      <div class="row"><div class="label">총 변제예정액</div>
        <div class="value">${totalRepay.toLocaleString()}원</div></div>

      <div class="row"><div class="label">최종 변제금</div>
        <div class="value">${finalPay.toLocaleString()}원</div></div>

      ${debt > 0 ? `
      <div class="row"><div class="label">변제율</div>
        <div class="value">${repayRate}%</div></div>
      <div class="rate-big">탕감률 ${reliefRate}%</div>
      ` : ``}

      ${asset > 0 ? `
      <div class="row"><div class="label">현재가치(PV)</div>
        <div class="value">${presentValueRounded.toLocaleString()}원</div></div>
      ` : ``}
    </div>
  `;

  /****************************************************
   * 설명 박스
   ****************************************************/
  const explain = document.getElementById("la_explain");
  explain.style.display = "block";
  explain.innerHTML = `
    <h3>📌 법원 생계비 자동 계산 설명</h3>
    <p>가구 수 ${household}인 기준 법원 생계비는 <strong>${courtLiving.toLocaleString()}원</strong>입니다.</p>
    <p>총 생계비는 <strong>${totalLiving.toLocaleString()}원</strong>이며,</p>
    <p>월 변제 가능 금액은 <strong>${disposable.toLocaleString()}원</strong>입니다.</p>
    <p>총 변제예정액은 <strong>${totalRepay.toLocaleString()}원</strong>입니다.</p>
  `;

  /****************************************************
   * 상세 계산 아코디언 내용 생성
   ****************************************************/
  const acc = document.getElementById("la_accordion");
  acc.innerHTML = `
    <div class="calc-step"><strong>법원 생계비</strong><br>${courtLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>추가 생계비</strong><br>${extra.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 생계비</strong><br>${totalLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>월 변제 가능 금액</strong><br>${disposable.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 변제예정액</strong><br>${totalRepay.toLocaleString()}원</div>
    <div class="calc-step"><strong>최종 변제금</strong><br>${finalPay.toLocaleString()}원</div>
    ${asset > 0 ? `
    <div class="calc-step"><strong>현재가치(PV)</strong><br>${presentValueRounded.toLocaleString()}원</div>
    ` : ``}
    ${debt > 0 ? `
    <div class="calc-step"><strong>변제율·탕감률</strong><br>
      변제율: ${repayRate}%<br>
      탕감률: ${reliefRate}%
    </div>
    ` : ``}
  `;

  acc.classList.remove("open");
  acc.style.maxHeight = null;

  document.querySelector(".la-acc-btn").textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 이벤트 연결
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {

  updateCourtLiving(); // 초기 자동 계산
  document.getElementById('la_household').addEventListener('change', updateCourtLiving);

  const btn = document.querySelector(".la-acc-btn");
  if (btn) btn.addEventListener("click", toggleLivingAccordion);

  /* 설명보기 아코디언 */
  document.querySelectorAll(".toggle-arrow").forEach(btn => {
    btn.addEventListener("click", function () {
      const answer = this.nextElementSibling;
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
      const isOpen = answer.style.display === "block";
      answer.style.display = isOpen ? "none" : "block";
    });
  });
});

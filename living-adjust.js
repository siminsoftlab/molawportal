/****************************************************
 * 법원 생계비 계산기 — 최종 안정화 버전
 ****************************************************/

/* 상세 계산 아코디언 */
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
}

/****************************************************
 * 계산
 ****************************************************/
function calcLivingAdjust() {
  const income    = Number(document.getElementById('la_income').value || 0);
  const household = Number(document.getElementById('la_household').value || 1);
  const livingUser= Number(document.getElementById('la_living_user').value || 0);
  const extra     = Number(document.getElementById('la_extra').value || 0);
  const months    = Number(document.getElementById('la_months').value || 0);
  const debt      = Number(document.getElementById('la_debt').value || 0);
  const asset     = Number(document.getElementById('la_asset').value || 0);

  const baseLiving1 = 1538523;
  const weights = {1:1.0,2:1.5,3:2.1,4:2.6,5:3.1};
  const courtLiving = Math.round(baseLiving1 * (weights[household] || 1));

  const finalLiving = Math.min(livingUser || courtLiving, courtLiving);
  const totalLiving = finalLiving + extra;

  const disposable = Math.max(income - totalLiving, 0);
  const totalRepay = disposable * months;

  const finalPay = Math.max(totalRepay, asset);

  const repayRate = debt > 0 ? ((finalPay / debt) * 100).toFixed(1) : "0.0";
  const reliefRate = (100 - Number(repayRate)).toFixed(1);

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
      <div class="row"><div class="label">조정 후 총 생계비</div>
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
    <h3>📌 법원 생계비 자동 조정 설명</h3>
    <p>법원 기준 생계비: ${courtLiving.toLocaleString()}원</p>
    <p>최종 인정 생계비: ${finalLiving.toLocaleString()}원</p>
    <p>총 생계비: ${totalLiving.toLocaleString()}원</p>
    <p>월 변제 가능 금액: ${disposable.toLocaleString()}원</p>
    <p>총 변제예정액: ${totalRepay.toLocaleString()}원</p>
  `;

  /****************************************************
   * 상세 계산 아코디언 내용 생성
   ****************************************************/
  const acc = document.getElementById("la_accordion");
  acc.innerHTML = `
    <div class="calc-step"><strong>법원 기준 생계비</strong><br>${courtLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>최종 인정 생계비</strong><br>${finalLiving.toLocaleString()}원</div>
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
 * 이벤트 연결 (중복 제거)
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {

  /* 상세 계산 아코디언 */
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

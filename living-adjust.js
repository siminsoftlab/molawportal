/****************************************************
 * 법원 생계비 계산기 — 최종 안정화 버전 (정규식 숫자 처리 + PV 충족 로직)
 ****************************************************/

/* 정규식 기반 숫자 처리 */
function getInt(id) {
  return parseInt(
    (document.getElementById(id).value || "0").replace(/[^\d]/g, "")
  ) || 0;
}

/****************************************************
 * 가구 수 선택 시 법원 생계비 자동 계산
 ****************************************************/
function updateCourtLiving() {
  const household = getInt('la_household');

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

  document.querySelector(".la-acc-btn").textContent = "계산 상세 보기 ▼";

  updateCourtLiving();
}

/****************************************************
 * 계산
 ****************************************************/
function calcLivingAdjust() {
  const income       = getInt('la_income');
  const courtLiving  = getInt('la_court_living');
  const extra        = getInt('la_extra');
  const months       = getInt('la_months');
  const debt         = getInt('la_debt');
  const asset        = getInt('la_asset');

  const totalLiving = courtLiving + extra;
  const disposable = Math.max(income - totalLiving, 0);
  const totalRepay = disposable * months;

  /****************************************************
   * PV 충족을 위한 최소 변제금 계산
   ****************************************************/
  const discountRate = 0.03;
  const years = months / 12;

  // PV 충족을 위한 최소 변제금(FV)
  const requiredFinalPay = Math.round(asset * Math.pow(1 + discountRate, years));

  // 최종 변제금 = 총 변제예정액, 청산가치, PV 충족금 중 가장 큰 값
  const finalPay = Math.max(totalRepay, asset, requiredFinalPay);

  // 현재가치(PV)
  const presentValue = Math.round(finalPay / Math.pow(1 + discountRate, years));

  // 변제율·탕감률
  const repayRate = debt > 0 ? ((finalPay / debt) * 100).toFixed(1) : "0.0";
  const reliefRate = (100 - Number(repayRate)).toFixed(1);

  const meetsPV = presentValue >= asset;

  /******** 요약 카드 ********/
  const summary = document.getElementById("la_summary");
  summary.style.display = "block";
  summary.innerHTML = `
    <div class="repay-highlight-box">

      <div class="row"><div class="label">총 부채</div>
        <div class="value">${debt.toLocaleString()}원</div></div>

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

      <div class="row"><div class="label">현재가치(PV)</div>
        <div class="value">${presentValue.toLocaleString()}원</div></div>

      <div class="row"><div class="label">변제율</div>
        <div class="value">${repayRate}%</div></div>

      <div class="rate-big">탕감률 ${reliefRate}%</div>

      <div class="row"><div class="label">청산가치 충족 여부</div>
        <div class="value" style="color:${meetsPV ? '#008000' : '#d60000'};">
          ${meetsPV ? "✔ 충족" : "✘ 미충족"}
        </div>
      </div>

    </div>
  `;

  /******** 설명 박스 ********/
  const explain = document.getElementById("la_explain");
  explain.style.display = "block";
  explain.innerHTML = `
    <h3>📌 법원 생계비 계산 설명</h3>
    <p>총 부채: ${debt.toLocaleString()}원</p>
    <p>법원 생계비: ${courtLiving.toLocaleString()}원</p>
    <p>총 생계비: ${totalLiving.toLocaleString()}원</p>
    <p>월 변제 가능 금액: ${disposable.toLocaleString()}원</p>
    <p>총 변제예정액: ${totalRepay.toLocaleString()}원</p>
    <p>PV 충족 최소 변제금: ${requiredFinalPay.toLocaleString()}원</p>
    <p>최종 변제금: ${finalPay.toLocaleString()}원</p>
    <p>현재가치(PV): ${presentValue.toLocaleString()}원</p>
    <p>청산가치: ${asset.toLocaleString()}원</p>
    <p style="color:${meetsPV ? '#008000' : '#d60000'};">
      ${meetsPV ? "✔ PV가 청산가치를 충족합니다." : "✘ PV가 청산가치를 충족하지 못합니다."}
    </p>
  `;

  /******** 상세 계산 ********/
  const acc = document.getElementById("la_accordion");
  acc.innerHTML = `
    <div class="calc-step"><strong>총 부채</strong><br>${debt.toLocaleString()}원</div>
    <div class="calc-step"><strong>법원 생계비</strong><br>${courtLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>추가 생계비</strong><br>${extra.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 생계비</strong><br>${totalLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>월 변제 가능 금액</strong><br>${disposable.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 변제예정액</strong><br>${totalRepay.toLocaleString()}원</div>
    <div class="calc-step"><strong>PV 충족 최소 변제금</strong><br>${requiredFinalPay.toLocaleString()}원</div>
    <div class="calc-step"><strong>최종 변제금</strong><br>${finalPay.toLocaleString()}원</div>
    <div class="calc-step"><strong>현재가치(PV)</strong><br>${presentValue.toLocaleString()}원</div>
    <div class="calc-step"><strong>변제율·탕감률</strong><br>
      변제율: ${repayRate}%<br>
      탕감률: ${reliefRate}%
    </div>
    <div class="calc-step"><strong>청산가치 충족 여부</strong><br>
      <span style="color:${meetsPV ? '#008000' : '#d60000'};">
        ${meetsPV ? "✔ 충족" : "✘ 미충족"}
      </span>
    </div>
  `;

  acc.classList.remove("open");
  acc.style.maxHeight = null;

  document.querySelector(".la-acc-btn").textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 이벤트 연결
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {

  updateCourtLiving();
  document.getElementById('la_household').addEventListener('change', updateCourtLiving);

  const accBtn = document.querySelector(".la-acc-btn");
  if (accBtn) accBtn.addEventListener("click", toggleLivingAccordion);

  /* 설명 아코디언 */
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

  /* FAQ */
  document.querySelectorAll(".faq-question").forEach(btn => {
    btn.addEventListener("click", function () {
      const answer = this.nextElementSibling;
      const isOpen = answer.style.display === "block";
      answer.style.display = isOpen ? "none" : "block";
    });
  });
});

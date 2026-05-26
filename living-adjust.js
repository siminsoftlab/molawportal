/****************************************************
 * 법원 생계비 계산기 — 유사 페이지와 동일한 동작
 * 법원 생계비 계산기 — 확장본 (가용소득 + PV + 청산가치 + 변제율)
****************************************************/

let livingCalcResult = null;
@@ -14,23 +14,17 @@ function toggleLivingAccordion() {
const isOpen = box.classList.contains("open");

if (isOpen) {
    // 닫기
box.style.maxHeight = "0px";

setTimeout(() => {
box.classList.remove("open");
box.style.padding = "0px";
}, 200);

btn.textContent = "계산 상세 보기 ▼";

} else {
    // 열기 (계산결과 표시)
    box.innerHTML = livingCalcResult;
    box.innerHTML = livingCalcResult || "";
box.classList.add("open");
box.style.padding = "15px";
box.style.maxHeight = box.scrollHeight + "px";

btn.textContent = "계산 상세 접기 ▲";
}
}
@@ -44,71 +38,161 @@ function resetLivingAdjust() {
document.getElementById('la_living_user').value = "";
document.getElementById('la_extra').value = "";
document.getElementById('la_months').value = "36";
  document.getElementById('la_debt').value = "";
  document.getElementById('la_asset').value = "";

document.getElementById('la_summary').style.display = "none";

  // 계산결과 초기화
const acc = document.getElementById('la_accordion');
acc.innerHTML = "";
acc.style.maxHeight = null;
acc.style.padding = "0px";
acc.classList.remove("open");

  // 설명 초기화
const explain = document.getElementById('la_explain');
explain.innerHTML = "";
  explain.style.display = "block";
  explain.style.display = "none";

const btn = document.querySelector(".la-acc-btn");
btn.textContent = "계산 상세 보기 ▼";

livingCalcResult = null;
}

/****************************************************
 * 계산
 ****************************************************/
/****************************************************
* 계산
****************************************************/
function calcLivingAdjust() {
  const income = Number(document.getElementById('la_income').value || 0);
  const household = Number(document.getElementById('la_household').value || 1);
  const income     = Number(document.getElementById('la_income').value || 0);
  const household  = Number(document.getElementById('la_household').value || 1);
const livingUser = Number(document.getElementById('la_living_user').value || 0);
  const extra = Number(document.getElementById('la_extra').value || 0);
  const months = Number(document.getElementById('la_months').value || 0);
  const extra      = Number(document.getElementById('la_extra').value || 0);
  const months     = Number(document.getElementById('la_months').value || 0);
  const debt       = Number(document.getElementById('la_debt').value || 0);
  const asset      = Number(document.getElementById('la_asset').value || 0);

  // 법원 기준 생계비 (1인 기준 × 가중치)
const baseLiving1 = 1538523;
const weights = {1:1.0, 2:1.5, 3:2.1, 4:2.6, 5:3.1};
const courtLiving = Math.round(baseLiving1 * (weights[household] || 1));

  // 최종 인정 생계비 = (사용자 입력 vs 법원 기준) 중 더 낮은 값
const finalLiving = Math.min(livingUser || courtLiving, courtLiving);

  // 총 생계비 = 최종 인정 생계비 + 추가 생계비
const totalLiving = finalLiving + extra;

  // 가용소득 = 소득 - 총 생계비
const disposable = Math.max(income - totalLiving, 0);

  // 총 변제예정액(유보액)
const totalRepay = disposable * months;

  // 최종 변제금 = 총 변제예정액 vs 청산가치 중 큰 값
  const finalPay = Math.max(totalRepay, asset);

  // 변제율·탕감률
  const repayRate = debt > 0 ? ((finalPay / debt) * 100).toFixed(1) : "0.0";
  const reliefRate = (100 - Number(repayRate)).toFixed(1);

  // 현재가치(PV) 계산 (할인율 3%)
  const discountRate = 0.03;
  const years = months / 12;
  const presentValue = finalPay > 0
    ? (finalPay / Math.pow(1 + discountRate, years))
    : 0;
  const presentValueRounded = Math.round(presentValue);

  // 청산가치 충족 여부 (PV 기준)
  const meetsAssetRequirement = presentValueRounded >= asset && asset > 0;

/****************************************************
  * 요약 카드
  ****************************************************/
const summary = document.getElementById('la_summary');
summary.innerHTML = `
    조정 후 총 생계비: ${totalLiving.toLocaleString()}원<br>
    월 변제 가능 금액: ${disposable.toLocaleString()}원<br>
    총 변제금: ${totalRepay.toLocaleString()}원
    <div class="repay-highlight-box">
      <div class="row">
        <div class="label">조정 후 총 생계비</div>
        <div class="value">${totalLiving.toLocaleString()}원</div>
      </div>
      <div class="row">
        <div class="label">월 변제 가능 금액(가용소득)</div>
        <div class="value">${disposable.toLocaleString()}원</div>
      </div>
      <div class="row">
        <div class="label">총 변제예정액(유보액)</div>
        <div class="value">${totalRepay.toLocaleString()}원</div>
      </div>
      <div class="row">
        <div class="label">최종 변제금(청산가치 반영)</div>
        <div class="value">${finalPay.toLocaleString()}원</div>
      </div>
      ${debt > 0 ? `
      <div class="row">
        <div class="label">변제율</div>
        <div class="value">${repayRate}%</div>
      </div>
      <div class="rate-big">
        탕감률 ${reliefRate}%<br>
        <span style="font-size:0.9rem; font-weight:600;">(법원에서 탕감되는 비율)</span>
      </div>
      ` : ``}
      ${asset > 0 ? `
      <div class="row">
        <div class="label">현재가치(PV)</div>
        <div class="value">${presentValueRounded.toLocaleString()}원</div>
      </div>
      ` : ``}
    </div>
 `;
summary.style.display = "block";

/****************************************************
   * 설명 div 표시 (핵심 수정)
   * 설명 div
  ****************************************************/
const explain = document.getElementById('la_explain');
  explain.style.display = "block";   // ← 이것만 있으면 설명이 무조건 보임
  explain.style.display = "block";
explain.innerHTML = `
    <h3>📌 법원 생계비 자동 조정 설명</h3>
    <p>가구 수 ${household}인 기준 법원 생계비는 ${courtLiving.toLocaleString()}원입니다.</p>
    <p>입력한 생계비와 비교하여 더 낮은 금액인 ${finalLiving.toLocaleString()}원이 최종 인정됩니다.</p>
    <p>월 변제 가능 금액은 ${disposable.toLocaleString()}원이며, 총 변제금은 ${totalRepay.toLocaleString()}원입니다.</p>
    <h3>📌 법원 생계비·가용소득·변제금 구조 설명</h3>
    <p>
      가구 수 <strong>${household}인</strong> 기준 법원 생계비는 
      <strong>${courtLiving.toLocaleString()}원</strong>입니다.<br>
      입력하신 생계비와 비교하여 더 낮은 금액인 
      <strong>${finalLiving.toLocaleString()}원</strong>이 최종 인정 생계비로 적용됩니다.
    </p>
    <p>
      여기에 추가 생계비 <strong>${extra.toLocaleString()}원</strong>을 더해<br>
      최종 총 생계비는 <strong>${totalLiving.toLocaleString()}원</strong>이 됩니다.
    </p>
    <p>
      월 소득 <strong>${income.toLocaleString()}원</strong>에서 총 생계비를 제외하면<br>
      월 변제 가능 금액(가용소득)은 
      <strong>${disposable.toLocaleString()}원</strong>입니다.
    </p>
    <p>
      변제기간 <strong>${months}개월</strong> 동안 납부 가능한 총 변제예정액(유보액)은<br>
      <strong>${totalRepay.toLocaleString()}원</strong>이며,
      청산가치가 <strong>${asset.toLocaleString()}원</strong>인 경우<br>
      법원은 이 중 더 큰 금액인 <strong>${finalPay.toLocaleString()}원</strong>을 기준으로 판단하게 됩니다.
    </p>
    ${debt > 0 ? `
    <p>
      총 부채 <strong>${debt.toLocaleString()}원</strong> 대비 실제 변제 비율은<br>
      <strong>${repayRate}%</strong>이며, 나머지 
      <strong>${reliefRate}%</strong>는 탕감 대상이 될 수 있는 금액입니다.
    </p>
    ` : ``}
    ${asset > 0 ? `
    <p>
      최종 변제금의 현재가치(PV)는 할인율 3% 기준<br>
      <strong>${presentValueRounded.toLocaleString()}원</strong>으로 계산되며,<br>
      이는 청산가치 <strong>${asset.toLocaleString()}원</strong>을
      <strong style="color:${meetsAssetRequirement ? '#008000' : '#d60000'};">
        ${meetsAssetRequirement ? "충족하는 수준입니다." : "충족하지 못하는 수준입니다."}
      </strong>
    </p>
    ` : ``}
 `;

/****************************************************
@@ -120,11 +204,21 @@ function calcLivingAdjust() {
   <div class="calc-step"><strong>최종 인정 생계비</strong><br>${finalLiving.toLocaleString()}원</div>
   <div class="calc-step"><strong>추가 생계비</strong><br>${extra.toLocaleString()}원</div>
   <div class="calc-step"><strong>총 생계비</strong><br>${totalLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>월 변제 가능 금액</strong><br>${disposable.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 변제금</strong><br>${totalRepay.toLocaleString()}원</div>
    <div class="calc-step"><strong>월 변제 가능 금액(가용소득)</strong><br>${disposable.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 변제예정액(유보액)</strong><br>${totalRepay.toLocaleString()}원</div>
    <div class="calc-step"><strong>청산가치</strong><br>${asset.toLocaleString()}원</div>
    <div class="calc-step"><strong>최종 변제금</strong><br>${finalPay.toLocaleString()}원</div>
    ${asset > 0 ? `
    <div class="calc-step"><strong>현재가치(PV, 3% 할인율)</strong><br>${presentValueRounded.toLocaleString()}원</div>
    ` : ``}
    ${debt > 0 ? `
    <div class="calc-step"><strong>변제율·탕감률</strong><br>
      변제율: ${repayRate}%<br>
      탕감률: ${reliefRate}%
    </div>
    ` : ``}
 `;

  // 계산 후 아코디언은 닫힌 상태 유지
const acc = document.getElementById('la_accordion');
acc.innerHTML = "";
acc.classList.remove("open");
@@ -136,47 +230,32 @@ function calcLivingAdjust() {
}

/****************************************************
 * 버튼 이벤트 연결
 * 버튼 이벤트 연결 + FAQ/토글 화살표
****************************************************/
document.addEventListener("DOMContentLoaded", () => {
const btn = document.querySelector(".la-acc-btn");
if (btn) btn.addEventListener("click", toggleLivingAccordion);
});
// ▼ ↔ ▲ 자동 전환 기능
document.querySelectorAll('.toggle-arrow').forEach(btn => {
  btn.addEventListener('click', function () {
    if (this.classList.contains('active')) {
      this.textContent = this.textContent.replace('▲', '▼');
      this.classList.remove('active');
    } else {
      this.textContent = this.textContent.replace('▼', '▲');
      this.classList.add('active');
    }
  });
});
// FAQ 열림/닫힘 기능
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', function () {
    const answer = this.nextElementSibling;

    // 열림/닫힘 토글
    if (answer.style.display === "block") {
      answer.style.display = "none";
    } else {
      answer.style.display = "block";
    }

  document.querySelectorAll('.toggle-arrow').forEach(b => {
    b.addEventListener('click', function () {
      if (this.classList.contains('active')) {
        this.textContent = this.textContent.replace('▲', '▼');
        this.classList.remove('active');
      } else {
        this.textContent = this.textContent.replace('▼', '▲');
        this.classList.add('active');
      }
    });
});
});
// ▼ ↔ ▲ 자동 전환 기능
document.querySelectorAll('.toggle-arrow').forEach(btn => {
  btn.addEventListener('click', function () {
    if (this.classList.contains('active')) {
      this.textContent = this.textContent.replace('▲', '▼');
      this.classList.remove('active');
    } else {
      this.textContent = this.textContent.replace('▼', '▲');
      this.classList.add('active');
    }

  document.querySelectorAll('.faq-question').forEach(b => {
    b.addEventListener('click', function () {
      const answer = this.nextElementSibling;
      if (answer.style.display === "block") {
        answer.style.display = "none";
      } else {
        answer.style.display = "block";
      }
    });
});
});

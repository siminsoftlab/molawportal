/****************************************************
 * 법원 생계비 계산기 — 유사 페이지와 동일한 동작
 ****************************************************/

let livingCalcResult = null;

/****************************************************
 * 아코디언 토글 (계산결과만 열고 닫음)
 ****************************************************/
function toggleLivingAccordion() {
  const box = document.getElementById("la_accordion");
  const btn = document.querySelector(".la-acc-btn");

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
    box.classList.add("open");
    box.style.padding = "15px";
    box.style.maxHeight = box.scrollHeight + "px";

    btn.textContent = "계산 상세 접기 ▲";
  }
}

/****************************************************
 * 초기화
 ****************************************************/
function resetLivingAdjust() {
  document.getElementById('la_income').value = "";
  document.getElementById('la_household').value = "1";
  document.getElementById('la_living_user').value = "";
  document.getElementById('la_extra').value = "";
  document.getElementById('la_months').value = "36";

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
  const livingUser = Number(document.getElementById('la_living_user').value || 0);
  const extra = Number(document.getElementById('la_extra').value || 0);
  const months = Number(document.getElementById('la_months').value || 0);

  const baseLiving1 = 1538523;
  const weights = {1:1.0, 2:1.5, 3:2.1, 4:2.6, 5:3.1};
  const courtLiving = Math.round(baseLiving1 * (weights[household] || 1));

  const finalLiving = Math.min(livingUser || courtLiving, courtLiving);
  const totalLiving = finalLiving + extra;

  const disposable = Math.max(income - totalLiving, 0);
  const totalRepay = disposable * months;

  /****************************************************
   * 요약 카드
   ****************************************************/
  const summary = document.getElementById('la_summary');
  summary.innerHTML = `
    조정 후 총 생계비: ${totalLiving.toLocaleString()}원<br>
    월 변제 가능 금액: ${disposable.toLocaleString()}원<br>
    총 변제금: ${totalRepay.toLocaleString()}원
  `;
  summary.style.display = "block";

  /****************************************************
   * 설명 div 표시 (핵심 수정)
   ****************************************************/
  const explain = document.getElementById('la_explain');
  explain.style.display = "block";   // ← 이것만 있으면 설명이 무조건 보임
  explain.innerHTML = `
    <h3>📌 법원 생계비 자동 조정 설명</h3>
    <p>가구 수 ${household}인 기준 법원 생계비는 ${courtLiving.toLocaleString()}원입니다.</p>
    <p>입력한 생계비와 비교하여 더 낮은 금액인 ${finalLiving.toLocaleString()}원이 최종 인정됩니다.</p>
    <p>월 변제 가능 금액은 ${disposable.toLocaleString()}원이며, 총 변제금은 ${totalRepay.toLocaleString()}원입니다.</p>
  `;

  /****************************************************
   * 계산결과 HTML (아코디언 내부)
   ****************************************************/
  livingCalcResult = `
    <div class="calc-step"><strong>법원 기준 생계비</strong><br>${courtLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>입력 생계비</strong><br>${livingUser.toLocaleString()}원</div>
    <div class="calc-step"><strong>최종 인정 생계비</strong><br>${finalLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>추가 생계비</strong><br>${extra.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 생계비</strong><br>${totalLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>월 변제 가능 금액</strong><br>${disposable.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 변제금</strong><br>${totalRepay.toLocaleString()}원</div>
  `;

  // 계산 후 아코디언은 닫힌 상태 유지
  const acc = document.getElementById('la_accordion');
  acc.innerHTML = "";
  acc.classList.remove("open");
  acc.style.maxHeight = null;
  acc.style.padding = "0px";

  const btn = document.querySelector(".la-acc-btn");
  btn.textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 버튼 이벤트 연결
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".la-acc-btn");
  if (btn) btn.addEventListener("click", toggleLivingAccordion);
});

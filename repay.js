/****************************************************
 * 개인회생 변제금 계산기 — 독립 repay.js
 ****************************************************/

/* 공통 유틸 */
function $(id) {
  return document.getElementById(id);
}
function toNumber(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
function setHTMLSafe(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

/****************************************************
 * 계산하기
 ****************************************************/
function calcRepay() {
  const income = toNumber($("income").value);
  const living = toNumber($("living").value);
  const extra  = toNumber($("extra").value);
  const months = toNumber($("months").value);
  const asset  = toNumber($("asset").value);

  const disposable = income - living - extra;
  const monthlyPay = Math.max(disposable, 0);
  const totalPay = monthlyPay * months;
  const finalPay = Math.max(totalPay, asset);

  /****************************************************
   * 요약 카드 표시
   ****************************************************/
  const summary = $("repaySummary");
  summary.style.display = "block";
  summary.innerHTML = `
    <strong>총 변제금:</strong> ${finalPay.toLocaleString()}원
  `;

  /****************************************************
   * 상세 계산 (아코디언 내부)
   ****************************************************/
  const acc = $("repayAccordion");
  acc.innerHTML = `
    <div class="calc-step"><strong>1) 월 소득</strong><br>${income.toLocaleString()}원</div>
    <div class="calc-step"><strong>2) 생계비</strong><br>${living.toLocaleString()}원</div>
    <div class="calc-step"><strong>3) 추가 생계비</strong><br>${extra.toLocaleString()}원</div>
    <div class="calc-step"><strong>4) 가용소득</strong><br>
      ${income.toLocaleString()} − ${living.toLocaleString()} − ${extra.toLocaleString()}<br>
      = <strong>${monthlyPay.toLocaleString()}원</strong>
    </div>
    <div class="calc-step"><strong>5) 변제기간</strong><br>${months}개월</div>
    <div class="calc-step"><strong>6) 총 변제금</strong><br>
      ${monthlyPay.toLocaleString()} × ${months} = ${totalPay.toLocaleString()}원
    </div>
    <div class="calc-step"><strong>7) 청산가치 비교</strong><br>
      청산가치: ${asset.toLocaleString()}원<br>
      최종 변제금: <strong>${finalPay.toLocaleString()}원</strong>
    </div>
  `;

  /****************************************************
   * 설명 div 표시 (아코디언 밖)
   ****************************************************/
  const explain = $("repayExplain");
  explain.style.display = "block";
  explain.innerHTML = `
    <h3>📌 개인회생 변제금 자동 설명</h3>
    <p>
      월 소득 ${income.toLocaleString()}원에서 생계비와 추가 생계비를 제외한 
      가용소득은 ${monthlyPay.toLocaleString()}원이며,
      ${months}개월 동안 변제하면 총 ${totalPay.toLocaleString()}원이 됩니다.
      청산가치와 비교하여 최종 변제금은 
      <strong>${finalPay.toLocaleString()}원</strong>입니다.
    </p>
  `;

  /****************************************************
   * 설명 애니메이션
   ****************************************************/
  setTimeout(() => explain.classList.add("visible"), 50);

  /****************************************************
   * 계산 후 아코디언은 닫힌 상태 유지
   ****************************************************/
  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const btn = document.querySelector(".repay-accordion-btn");
  btn.textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 상세보기 토글
 ****************************************************/
function toggleAccordionRepay() {
  const box = $("repayAccordion");
  const btn = document.querySelector(".repay-accordion-btn");

  const isOpen = box.classList.contains("open");

  if (isOpen) {
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
function resetRepayInputs() {
  $("income").value = "";
  $("living").value = "1538523";
  $("extra").value = "";
  $("months").value = "36";
  $("asset").value = "";

  $("repaySummary").style.display = "none";

  const acc = $("repayAccordion");
  acc.innerHTML = "";
  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const explain = $("repayExplain");
  explain.innerHTML = "";
  explain.style.display = "none";
  explain.classList.remove("visible");

  const btn = document.querySelector(".repay-accordion-btn");
  btn.textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 개인회생 변제금 계산기 — PV 포함 최신본 repay.js
 ****************************************************/

/* 공통 유틸 */
function $(id) {
  return document.getElementById(id);
}
function toNumber(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/****************************************************
 * 계산하기
 ****************************************************/
function calcRepay() {

  const debt   = toNumber($("debt").value);   // 총 부채
  const income = toNumber($("income").value);
  const living = toNumber($("living").value);
  const extra  = toNumber($("extra").value);
  const months = toNumber($("months").value);
  const asset  = toNumber($("asset").value);

  const disposable = income - living - extra;
  const monthlyPay = Math.max(disposable, 0);
  const totalPay = monthlyPay * months;

  // ⭐ 최종 변제금 = 총 변제금 vs 청산가치 중 큰 값
  const finalPay = Math.max(totalPay, asset);

  // ⭐ 변제율 = 최종 변제금 ÷ 총 부채 × 100
  const repayRate = debt > 0 
    ? ((finalPay / debt) * 100).toFixed(1)
    : 0;

  // ⭐ 탕감률 = 100 - 변제율
  const reliefRate = (100 - repayRate).toFixed(1);

  /****************************************************
   * ⭐ 현재가치(PV) 계산
   ****************************************************/
  const discountRate = 0.03; // 3% 할인율
  const years = months / 12;

  const presentValue = (finalPay / Math.pow(1 + discountRate, years)).toFixed(0);

  // ⭐ 청산가치 충족 여부
  const meetsAssetRequirement = presentValue >= asset;

  /****************************************************
   * 요약 카드
   ****************************************************/
  const summary = $("repaySummary");
  summary.style.display = "block";

  summary.innerHTML = `
    <div class="repay-highlight-box">
      <div class="row">
        <div class="label">총 부채</div>
        <div class="value">${debt.toLocaleString()}원</div>
      </div>

      <div class="row">
        <div class="label">총 변제금</div>
        <div class="value">${finalPay.toLocaleString()}원</div>
      </div>

      <div class="row">
        <div class="label">변제율</div>
        <div class="value">${repayRate}% (실제로 갚는 비율)</div>
      </div>

      <div class="rate-big">
        탕감률 ${reliefRate}%<br>
        <span style="font-size:0.9rem; font-weight:600;">(법원에서 탕감되는 비율)</span>
      </div>
    </div>
  `;

  /****************************************************
   * 상세 계산 (아코디언)
   ****************************************************/
  const acc = $("repayAccordion");
  acc.innerHTML = `
    <div class="calc-step"><strong>1) 총 부채</strong><br>${debt.toLocaleString()}원</div>

    <div class="calc-step"><strong>2) 월 소득</strong><br>${income.toLocaleString()}원</div>

    <div class="calc-step"><strong>3) 생계비</strong><br>${living.toLocaleString()}원</div>

    <div class="calc-step"><strong>4) 추가 생계비</strong><br>${extra.toLocaleString()}원</div>

    <div class="calc-step"><strong>5) 가용소득</strong><br>
      ${income.toLocaleString()} − ${living.toLocaleString()}
      ${extra > 0 ? ` − ${extra.toLocaleString()}` : ""}
      <br>
      = <strong>${monthlyPay.toLocaleString()}원</strong>
    </div>

    <div class="calc-step"><strong>6) 변제기간</strong><br>${months}개월</div>

    <div class="calc-step"><strong>7) 총 변제예정액(유보액)</strong><br>
      ${monthlyPay.toLocaleString()} × ${months} = <strong>${totalPay.toLocaleString()}원</strong>
    </div>

    <div class="calc-step"><strong>8) 현재가치(PV)</strong><br>
      할인율 3% 적용 → <strong>${Number(presentValue).toLocaleString()}원</strong>
    </div>

    <div class="calc-step"><strong>9) 청산가치 비교</strong><br>
      청산가치: ${asset.toLocaleString()}원<br>
      현재가치(PV): ${Number(presentValue).toLocaleString()}원<br>
      <strong style="color:${meetsAssetRequirement ? '#008000' : '#d60000'};">
        ${meetsAssetRequirement ? "✔ 청산가치 충족" : "✘ 청산가치 미충족 → 변제금 상향 필요"}
      </strong>
    </div>

    <div class="calc-step"><strong>10) 변제율·탕감률</strong><br>
      변제율: ${repayRate}%<br>
      탕감률: ${reliefRate}%
    </div>
  `;

  /****************************************************
   * 자동 설명
   ****************************************************/
  const explain = $("repayExplain");
  explain.style.display = "block";
  explain.innerHTML = `
    <h3>📌 변제율·탕감률 자동 설명</h3>
    <p>
      총 부채 중 <strong>${repayRate}%는 실제로 갚아야 하는 금액</strong>이며,<br>
      나머지 <strong>${reliefRate}%는 법원에서 탕감받게 되는 금액</strong>입니다.<br><br>

      현재가치(PV)는 <strong>${Number(presentValue).toLocaleString()}원</strong>이며,<br>
      청산가치 <strong>${asset.toLocaleString()}원</strong>과 비교했을 때<br>
      <strong>${meetsAssetRequirement ? "충족합니다." : "충족하지 못합니다."}</strong>
    </p>
  `;

  setTimeout(() => explain.classList.add("visible"), 50);

  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const btn = document.querySelector(".repay-accordion-btn");
  btn.textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 초기화
 ****************************************************/
function resetRepayInputs() {
  $("debt").value = "";
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

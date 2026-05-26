/****************************************************
 * 개인회생 변제금 계산기 — 법원 생계비 UI 버전
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

  const debt   = toNumber($("debt").value);
  const income = toNumber($("income").value);
  const living = toNumber($("living").value);
  const extra  = toNumber($("extra").value);
  const months = toNumber($("months").value);
  const asset  = toNumber($("asset").value);

  const disposable = income - living - extra;
  const monthlyPay = Math.max(disposable, 0);
  const totalPay = monthlyPay * months;

  // 최종 변제금 = 총 변제금 vs 청산가치 중 큰 값
  const finalPay = Math.max(totalPay, asset);

  // 변제율·탕감률
  const repayRate = debt > 0 ? ((finalPay / debt) * 100).toFixed(1) : "0.0";
  const reliefRate = (100 - Number(repayRate)).toFixed(1);

  // 현재가치(PV)
  const discountRate = 0.03;
  const years = months / 12;
  const presentValue = finalPay > 0
    ? (finalPay / Math.pow(1 + discountRate, years))
    : 0;
  const presentValueRounded = Math.round(presentValue);

  const meetsAssetRequirement = presentValueRounded >= asset && asset > 0;

  /****************************************************
   * 요약 카드 — 법원 생계비 UI 스타일
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
        <div class="label">월 변제 가능 금액(가용소득)</div>
        <div class="value">${monthlyPay.toLocaleString()}원</div>
      </div>

      <div class="row">
        <div class="label">총 변제예정액(유보액)</div>
        <div class="value">${totalPay.toLocaleString()}원</div>
      </div>

      <div class="row">
        <div class="label">최종 변제금(청산가치 반영)</div>
        <div class="value">${finalPay.toLocaleString()}원</div>
      </div>

      <div class="row">
        <div class="label">변제율</div>
        <div class="value">${repayRate}%</div>
      </div>

      <div class="rate-big">
        탕감률 ${reliefRate}%<br>
        <span style="font-size:0.9rem; font-weight:600;">(법원에서 탕감되는 비율)</span>
      </div>

      <div class="row">
        <div class="label">현재가치(PV)</div>
        <div class="value">${presentValueRounded.toLocaleString()}원</div>
      </div>

      <div class="row">
        <div class="label">청산가치 충족 여부</div>
        <div class="value" style="color:${meetsAssetRequirement ? '#008000' : '#d60000'};">
          ${meetsAssetRequirement ? "✔ 충족" : "✘ 미충족"}
        </div>
      </div>

    </div>
  `;

  /****************************************************
   * 상세 계산 — 법원 생계비 calc-step 스타일
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
      <br>= <strong>${monthlyPay.toLocaleString()}원</strong>
    </div>

    <div class="calc-step"><strong>6) 변제기간</strong><br>${months}개월</div>

    <div class="calc-step"><strong>7) 총 변제예정액(유보액)</strong><br>
      ${monthlyPay.toLocaleString()} × ${months} = ${totalPay.toLocaleString()}원
    </div>

    <div class="calc-step"><strong>8) 청산가치 비교</strong><br>
      청산가치: ${asset.toLocaleString()}원<br>
      최종 변제금: <strong>${finalPay.toLocaleString()}원</strong>
    </div>

    <div class="calc-step"><strong>9) 현재가치(PV)</strong><br>
      ${presentValueRounded.toLocaleString()}원
    </div>

    <div class="calc-step"><strong>10) 변제율·탕감률</strong><br>
      변제율: ${repayRate}%<br>
      탕감률: ${reliefRate}%
    </div>
  `;

  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const btn = document.querySelector(".repay-accordion-btn");
  btn.textContent = "계산 상세 보기 ▼";

  /****************************************************
   * 자동 설명 — 법원 생계비 스타일
   ****************************************************/
  const explain = $("repayExplain");
  explain.style.display = "block";

  explain.innerHTML = `
    <h3>📌 변제금·변제율·탕감률 자동 설명</h3>

    <p>
      총 부채 <strong>${debt.toLocaleString()}원</strong> 중<br>
      <strong>${repayRate}%</strong>는 실제로 갚아야 하는 금액이며,<br>
      나머지 <strong>${reliefRate}%</strong>는 법원에서 탕감받게 되는 금액입니다.
    </p>

    <p>
      최종 변제금의 현재가치(PV)는<br>
      <strong>${presentValueRounded.toLocaleString()}원</strong>이며,<br>
      이는 청산가치 <strong>${asset.toLocaleString()}원</strong>을<br>
      <strong style="color:${meetsAssetRequirement ? '#008000' : '#d60000'};">
        ${meetsAssetRequirement ? "충족합니다." : "충족하지 못합니다."}
      </strong>
    </p>
  `;

  setTimeout(() => explain.classList.add("visible"), 50);
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

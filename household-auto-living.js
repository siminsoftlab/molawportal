/****************************************************
 * 가구수 생계비 계산기 — 청산가치 제거 최종 버전
 ****************************************************/

/* 전역 변수: 상세 계산 결과 저장 */
let householdCalcResult = null;

/****************************************************
 * 아코디언 토글
 ****************************************************/
function toggleHouseholdAccordion() {
  const box = document.getElementById("hl_accordion");
  const btn = document.querySelector(".hl-acc-btn");

  if (!householdCalcResult) return;

  const isOpen = box.classList.contains("open");

  if (isOpen) {
    box.style.maxHeight = "0px";
    setTimeout(() => {
      box.classList.remove("open");
      box.style.padding = "0px";
    }, 200);
    btn.textContent = "계산 상세 보기 ▼";
  } else {
    box.innerHTML = householdCalcResult;
    box.classList.add("open");
    box.style.padding = "15px";
    box.style.maxHeight = box.scrollHeight + "px";
    btn.textContent = "계산 상세 접기 ▲";
  }
}

/****************************************************
 * 초기화
 ****************************************************/
function resetHouseholdLiving() {
  document.getElementById('hl_income').value = "";
  document.getElementById('hl_household').value = "1";
  document.getElementById('hl_extra').value = "";
  document.getElementById('hl_months').value = "36";
  document.getElementById('hl_court_living').value = "";

  document.getElementById('hl_summary').style.display = "none";

  const acc = document.getElementById('hl_accordion');
  acc.innerHTML = "";
  acc.style.maxHeight = null;
  acc.style.padding = "0px";
  acc.classList.remove("open");

  const btn = document.querySelector(".hl-acc-btn");
  if (btn) btn.textContent = "계산 상세 보기 ▼";

  const seo = document.getElementById('hl_seo');
  seo.classList.remove('visible');
  seo.innerHTML = "";

  householdCalcResult = null;
}

/****************************************************
 * 가구 수 선택 시 법원 기준 생계비 자동 계산
 ****************************************************/
function updateCourtLiving() {
  const household = Number(document.getElementById('hl_household').value || 1);

  const baseLiving1 = 1538523;
  const weights = {1:1.0, 2:1.5, 3:2.1, 4:2.6, 5:3.1};
  const living = Math.round(baseLiving1 * (weights[household] || 1));

  document.getElementById("hl_court_living").value = living;
}

document.getElementById("hl_household").addEventListener("change", updateCourtLiving);

/****************************************************
 * 계산
 ****************************************************/
function calcHouseholdLiving() {

  const incomeInput = document.getElementById('hl_income').value.trim();
  const livingInput = document.getElementById('hl_court_living').value.trim();
  const monthsInput = document.getElementById('hl_months').value.trim();

  if (incomeInput === "" || livingInput === "" || monthsInput === "") {
    alert("월 소득, 최저 생계비, 변제기간을 모두 입력해주세요.");
    return;
  }

  const income = Number(incomeInput);
  const household = Number(document.getElementById('hl_household').value || 1);
  const extra = Number(document.getElementById('hl_extra').value || 0);
  const months = Number(monthsInput);

  const living = Number(livingInput);

  /****************************************************
   * 추가 생계비 인정 로직 (법원 기준 동일)
   ****************************************************/
  const extraLimit = Math.round(living * 0.3);
  const extraAllowed = Math.min(extra, extraLimit);

  const totalLiving = living + extraAllowed;
  const disposable = Math.max(income - totalLiving, 0);

  const totalByIncome = disposable * months;
  const finalTotal = totalByIncome;   // ✔ 청산가치 제거됨
  const monthly = months > 0 ? Math.ceil(finalTotal / months) : 0;

  /****************************************************
   * 요약 카드 — 핵심만 표시
   ****************************************************/
  const summary = document.getElementById('hl_summary');
  summary.innerHTML = `
  <div class="repay-highlight-box">

    <div class="row">
      <div class="label">월 소득</div>
      <div class="value">${income.toLocaleString()}원</div>
    </div>

    <div class="row">
      <div class="label">법원 기준 생계비 (${household}인 가구)</div>
      <div class="value">${living.toLocaleString()}원</div>
    </div>

    <div class="row">
      <div class="label">추가 생계비</div>
      <div class="value">입력 ${extra.toLocaleString()}원 → 인정 ${extraAllowed.toLocaleString()}원</div>
    </div>

    <div class="row">
      <div class="label">월 변제 가능 금액</div>
      <div class="value">${disposable.toLocaleString()}원</div>
    </div>

    <div class="row">
      <div class="label">최종 변제금 / 월 변제금</div>
      <div class="value">${finalTotal.toLocaleString()}원 / ${monthly.toLocaleString()}원</div>
    </div>

  </div>
`;
  summary.style.display = "block";

  /****************************************************
   * 상세 계산 (전체 과정)
   ****************************************************/
  householdCalcResult = `
  <div class="repay-highlight-box-red">

    <div class="row"><div class="label">가구 수</div>
      <div class="value">${household}인 가구</div></div>

    <div class="row"><div class="label">법원 기준 생계비</div>
      <div class="value">${living.toLocaleString()}원</div></div>

    <div class="row"><div class="label">추가 생계비 (입력)</div>
      <div class="value">${extra.toLocaleString()}원</div></div>

    <div class="row"><div class="label">추가 생계비 (인정)</div>
      <div class="value">${extraAllowed.toLocaleString()}원</div></div>

    <div class="row"><div class="label">총 인정 생계비</div>
      <div class="value">${totalLiving.toLocaleString()}원</div></div>

    <div class="row"><div class="label">월 변제 가능 금액</div>
      <div class="value">${disposable.toLocaleString()}원</div></div>

    <div class="row"><div class="label">소득 기준 총 변제금</div>
      <div class="value">${totalByIncome.toLocaleString()}원</div></div>

    <div class="row"><div class="label">최종 변제금</div>
      <div class="value">${finalTotal.toLocaleString()}원</div></div>

    <div class="row"><div class="label">월 변제금</div>
      <div class="value">${monthly.toLocaleString()}원</div></div>

  </div>
`;

  const acc = document.getElementById('hl_accordion');
  acc.innerHTML = "";
  acc.classList.remove("open");
  acc.style.maxHeight = null;
  acc.style.padding = "0px";

  const btn = document.querySelector(".hl-acc-btn");
  btn.textContent = "계산 상세 보기 ▼";

  /****************************************************
   * SEO 설명문
   ****************************************************/
  const seo = document.getElementById('hl_seo');
  seo.innerHTML = `
    <div class="explain-box">
      <h3>📌 가구수 생계비 계산 설명</h3>
      <p>${household}인 가구 기준 법원 생계비는 ${living.toLocaleString()}원입니다.</p>
      <p>추가 생계비 인정액은 ${extraAllowed.toLocaleString()}원이며, 총 생계비는 ${totalLiving.toLocaleString()}원입니다.</p>
      <p>월 변제 가능 금액은 ${disposable.toLocaleString()}원이며, 최종 변제금은 ${finalTotal.toLocaleString()}원입니다.</p>
    </div>
  `;
  setTimeout(() => seo.classList.add('visible'), 50);
}

/****************************************************
 * 페이지 로드시 자동 실행
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".hl-acc-btn");
  if (btn) btn.addEventListener("click", toggleHouseholdAccordion);

  updateCourtLiving();
});

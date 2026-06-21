/****************************************************
 * 숫자 처리
 ****************************************************/
function getInt(id) {
  return parseInt(
    (document.getElementById(id).value || "0").replace(/[^\d]/g, "")
  ) || 0;
}

/* 반올림 */
function preciseRound(num) {
  return Math.round((num + Number.EPSILON));
}

/* 가구수 텍스트 */
function getHouseholdLabel(household) {
  return `${household}인 가구`;
}

/****************************************************
 * 가구 수 선택 시 법원 기준 생계비 자동 계산
 ****************************************************/
function updateCourtLiving() {
  const household = getInt('hl_household') || 1;

  const baseLiving1 = 1538523;
  const weights = {1:1.0, 2:1.5, 3:2.1, 4:2.6, 5:3.1};

  const courtLiving = preciseRound(baseLiving1 * (weights[household] || 1));

  document.getElementById('hl_court_living').value = courtLiving;
}

/****************************************************
 * 계산하기 버튼 → checkAccess 후 실행될 함수
 ****************************************************/
function handleLivingCalc() {
  calcHouseholdLiving();
}
window.handleLivingCalc = handleLivingCalc;

/****************************************************
 * 계산 (가구수 생계비 계산기)
 ****************************************************/
function calcHouseholdLiving() {
  const incomeInput = document.getElementById('hl_income').value.trim();
  const livingInput = document.getElementById('hl_court_living').value.trim();
  const monthsInput = document.getElementById('hl_months').value.trim();

  if (incomeInput === "" || livingInput === "" || monthsInput === "") {
    alert("월 소득, 최저 생계비, 변제기간(개월)을 모두 입력해주세요.");
    return;
  }

  const income      = getInt('hl_income');
  const household   = getInt('hl_household');
  const courtLiving = getInt('hl_court_living');
  const extraInput  = getInt('hl_extra');
  const months      = getInt('hl_months');

  const extraLimit   = preciseRound(courtLiving * 0.3);
  const allowedExtra = Math.min(extraInput, extraLimit);

  const totalLiving  = courtLiving + allowedExtra;
  const disposable   = Math.max(income - totalLiving, 0);
  const totalRepay   = disposable * months;
  const monthly      = months > 0 ? Math.ceil(totalRepay / months) : 0;

  // 요약 카드
  const summary = document.getElementById("hl_summary");
  summary.style.display = "block";
  summary.innerHTML = `
  <div class="repay-highlight-box">
    <div class="row"><div class="label">월 소득</div><div class="value">${income.toLocaleString()}원</div></div>
    <div class="row"><div class="label">법원 기준 생계비 (${getHouseholdLabel(household)})</div><div class="value">${courtLiving.toLocaleString()}원</div></div>
    <div class="row"><div class="label">추가 생계비</div><div class="value">입력 ${extraInput.toLocaleString()}원 → 인정 ${allowedExtra.toLocaleString()}원</div></div>
    <div class="row"><div class="label">월 변제 가능 금액</div><div class="value">${disposable.toLocaleString()}원</div></div>
    <div class="row"><div class="label">최종 변제금 / 월 변제금</div><div class="value">${totalRepay.toLocaleString()}원 / ${monthly.toLocaleString()}원</div></div>
  </div>
`;

  // 상세 계산 결과
  const acc = document.getElementById("hl_accordion");
  acc.innerHTML = `
  <div class="repay-highlight-box-red">
    <div class="row"><div class="label">가구 수</div><div class="value">${getHouseholdLabel(household)}</div></div>
    <div class="row"><div class="label">법원 기준 생계비</div><div class="value">${courtLiving.toLocaleString()}원</div></div>
    <div class="row"><div class="label">추가 생계비 (입력)</div><div class="value">${extraInput.toLocaleString()}원</div></div>
    <div class="row"><div class="label">추가 생계비 (인정)</div><div class="value">${allowedExtra.toLocaleString()}원</div></div>
    <div class="row"><div class="label">총 인정 생계비</div><div class="value">${totalLiving.toLocaleString()}원</div></div>
    <div class="row"><div class="label">월 변제 가능 금액</div><div class="value">${disposable.toLocaleString()}원</div></div>
    <div class="row"><div class="label">최종 변제금</div><div class="value">${totalRepay.toLocaleString()}원</div></div>
    <div class="row"><div class="label">월 변제금</div><div class="value">${monthly.toLocaleString()}원</div></div>
  </div>
`;

  // SEO 설명문
  const seo = document.getElementById("hl_seo");
  seo.innerHTML = `
    <div class="explain-box">
      <h3>📌 가구수 생계비 계산 설명</h3>
      <p>${getHouseholdLabel(household)} 기준 법원 생계비는 ${courtLiving.toLocaleString()}원입니다.</p>
      <p>추가 생계비 인정액은 ${allowedExtra.toLocaleString()}원이며, 총 생계비는 ${totalLiving.toLocaleString()}원입니다.</p>
      <p>월 변제 가능 금액은 ${disposable.toLocaleString()}원이며, 최종 변제금은 ${totalRepay.toLocaleString()}원입니다.</p>
    </div>
  `;
  seo.classList.add("visible");

  // 버튼 초기화
  const btn = document.querySelector(".hl-acc-btn");
  if (btn) btn.textContent = "계산 상세 보기 ▼";
}

/****************************************************
 * 상세 계산 아코디언
 ****************************************************/
function toggleHouseholdAccordion() {
  const box = document.getElementById("hl_accordion");
  const btn = document.querySelector(".hl-acc-btn");

  if (!box || !btn) return;

  if (box.classList.contains("open")) {
    box.classList.remove("open");
    box.style.maxHeight = "0px";
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
function resetHouseholdLiving() {
  ["hl_income","hl_extra","hl_months"].forEach(id=>{
    document.getElementById(id).value = id === "hl_months" ? "36" : "";
  });
  document.getElementById("hl_household").value = "1";
  document.getElementById("hl_court_living").value = "";

  document.getElementById("hl_summary").style.display = "none";

  const acc = document.getElementById("hl_accordion");
  acc.innerHTML = "";
  acc.classList.remove("open");
  acc.style.maxHeight = null;

  const seo = document.getElementById("hl_seo");
  seo.innerHTML = "";
  seo.classList.remove("visible");

  const btn = document.querySelector(".hl-acc-btn");
  if (btn) btn.textContent = "계산 상세 보기 ▼";

  updateCourtLiving();
}

/****************************************************
 * DOM 로드 후 초기 세팅
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  updateCourtLiving();
  document.getElementById('hl_household').addEventListener('change', updateCourtLiving);
  document.querySelector(".hl-acc-btn").addEventListener("click", toggleHouseholdAccordion);
});

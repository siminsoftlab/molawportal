/****************************************************
 * 가구수 생계비 계산기 — 최종 안정 버전
 ****************************************************/

/* 전역 변수: 상세 계산 결과 저장 */
let householdCalcResult = null;

/****************************************************
 * 아코디언 토글
 ****************************************************/
function toggleHouseholdAccordion() {
  const box = document.getElementById("hl_accordion");
  const btn = document.querySelector(".hl-acc-btn");

  if (!householdCalcResult) return; // 계산 전에는 열리지 않음

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
    // 열기 + 내용 삽입
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
  document.getElementById('hl_asset').value = "";
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
document.getElementById("hl_household").addEventListener("change", () => {
  const household = Number(document.getElementById('hl_household').value || 1);

  const baseLiving1 = 1538523;
  const weights = {1:1.0, 2:1.5, 3:2.1, 4:2.6, 5:3.1};
  const living = Math.round(baseLiving1 * (weights[household] || 1));

  document.getElementById("hl_court_living").value = living;
});

/****************************************************
 * 계산
 ****************************************************/
function calcHouseholdLiving() {
  const income = Number(document.getElementById('hl_income').value || 0);
  const household = Number(document.getElementById('hl_household').value || 1);
  const extra = Number(document.getElementById('hl_extra').value || 0);
  const months = Number(document.getElementById('hl_months').value || 0);
  const asset = Number(document.getElementById('hl_asset').value || 0);

  // 🔥 법원 기준 생계비는 입력창에서 직접 가져옴
  const living = Number(document.getElementById('hl_court_living').value || 0);

  const totalLiving = living + extra;
  const disposable = Math.max(income - totalLiving, 0);
  const totalByIncome = disposable * months;
  const finalTotal = Math.max(totalByIncome, asset);
  const monthly = months > 0 ? Math.ceil(finalTotal / months) : 0;

  /****************************************************
   * 요약 카드 (법원생계비 스타일)
   ****************************************************/
  const summary = document.getElementById('hl_summary');
  summary.innerHTML = `
    <p><strong>월 소득:</strong> ${income.toLocaleString()}원</p>
    <p><strong>가구 수:</strong> ${household}인</p>
    <p><strong>법원 기준 생계비:</strong> ${living.toLocaleString()}원</p>
    <p><strong>추가 생계비:</strong> ${extra.toLocaleString()}원</p>
    <p><strong>총 생계비:</strong> ${totalLiving.toLocaleString()}원</p>
    <p><strong>가용소득:</strong> ${disposable.toLocaleString()}원</p>
    <p><strong>월 변제금:</strong> ${monthly.toLocaleString()}원</p>
    <p><strong>총 변제금:</strong> ${finalTotal.toLocaleString()}원</p>
  `;
  summary.style.display = "block";

  /****************************************************
   * 상세 계산 HTML (저장만 하고 표시하지 않음)
   ****************************************************/
  householdCalcResult = `
    <div class="calc-step"><strong>법원 기준 생계비</strong><br>${living.toLocaleString()}원</div>
    <div class="calc-step"><strong>추가 생계비</strong><br>${extra.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 생계비</strong><br>${totalLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>월 변제 가능 금액</strong><br>${disposable.toLocaleString()}원</div>
    <div class="calc-step"><strong>소득 기준 총 변제금</strong><br>${totalByIncome.toLocaleString()}원</div>
    <div class="calc-step"><strong>청산가치</strong><br>${asset.toLocaleString()}원</div>
    <div class="calc-step"><strong>최종 변제금</strong><br>${finalTotal.toLocaleString()}원</div>
    <div class="calc-step"><strong>월 변제금</strong><br>${monthly.toLocaleString()}원</div>
  `;

  // 아코디언 초기화
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
      <h3>📌 가구수 생계비 자동 계산 설명</h3>
      <p>${household}인 가구 기준 법원 생계비는 ${living.toLocaleString()}원입니다.</p>
      <p>추가 생계비를 포함한 총 생계비는 ${totalLiving.toLocaleString()}원입니다.</p>
      <p>월 변제 가능 금액은 ${disposable.toLocaleString()}원이며, 최종 변제금은 ${finalTotal.toLocaleString()}원입니다.</p>
    </div>
  `;
  setTimeout(() => seo.classList.add('visible'), 50);
}

/****************************************************
 * 버튼 이벤트 연결
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".hl-acc-btn");
  if (btn) btn.addEventListener("click", toggleHouseholdAccordion);
});

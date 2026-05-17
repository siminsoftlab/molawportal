/****************************************************
 * 법원 생계비 계산기 — 독립형 아코디언 시스템
 ****************************************************/

/* 아코디언 토글 */
function toggleLivingAccordion() {
  const box = document.getElementById("la_accordion");
  const btn = document.querySelector(".calc-acc-btn");

  const isOpen = box.classList.contains("open");

  if (isOpen) {
    // 닫기
    box.classList.remove("open");
    box.style.maxHeight = null;
    btn.textContent = "계산 상세 보기 ▼";
    btn.classList.remove("active");
  } else {
    // 열기
    box.classList.add("open");
    box.style.maxHeight = box.scrollHeight + "px";
    btn.textContent = "계산 상세 접기 ▲";
    btn.classList.add("active");
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

  const acc = document.getElementById('la_accordion');
  acc.innerHTML = "";
  acc.style.maxHeight = null;
  acc.classList.remove("open");

  const btn = document.querySelector(".calc-acc-btn");
  if (btn) btn.textContent = "계산 상세 보기 ▼";

  const seo = document.getElementById('la_seo');
  seo.classList.remove('visible');
  seo.innerHTML = "";
}

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

  /* 요약 */
  const summary = document.getElementById('la_summary');
  summary.innerHTML = `
    조정 후 총 생계비: ${totalLiving.toLocaleString()}원<br>
    월 변제 가능 금액: ${disposable.toLocaleString()}원<br>
    총 변제금: ${totalRepay.toLocaleString()}원
  `;
  summary.style.display = "block";

  /* 상세 계산 */
  const acc = document.getElementById('la_accordion');
  acc.innerHTML = `
    <div class="calc-step"><strong>법원 기준 생계비</strong><br>${courtLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>입력 생계비</strong><br>${livingUser.toLocaleString()}원</div>
    <div class="calc-step"><strong>최종 인정 생계비</strong><br>${finalLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>추가 생계비</strong><br>${extra.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 생계비</strong><br>${totalLiving.toLocaleString()}원</div>
    <div class="calc-step"><strong>월 변제 가능 금액</strong><br>${disposable.toLocaleString()}원</div>
    <div class="calc-step"><strong>총 변제금</strong><br>${totalRepay.toLocaleString()}원</div>
  `;

  /* 계산 후 자동으로 아코디언 열기 */
  acc.classList.add("open");
  acc.style.maxHeight = acc.scrollHeight + "px";
  
  const btn = document.querySelector(".calc-acc-btn");
  btn.textContent = "계산 상세 접기 ▲";
  btn.classList.add("active");

  /* SEO */
  const seo = document.getElementById('la_seo');
  seo.innerHTML = `
    <h3>📌 법원 생계비 자동 조정 설명</h3>
    <p>가구 수 ${household}인 기준 법원 생계비는 ${courtLiving.toLocaleString()}원입니다.</p>
    <p>입력한 생계비와 비교하여 더 낮은 금액인 ${finalLiving.toLocaleString()}원이 최종 인정됩니다.</p>
    <p>월 변제 가능 금액은 ${disposable.toLocaleString()}원이며, 총 변제금은 ${totalRepay.toLocaleString()}원입니다.</p>
  `;
  setTimeout(() => seo.classList.add('visible'), 50);
}

/****************************************************
 * 버튼 클릭 이벤트 연결
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".calc-acc-btn");
  if (btn) btn.addEventListener("click", toggleLivingAccordion);
});

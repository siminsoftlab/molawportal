document.addEventListener("DOMContentLoaded", () => {

  /* ============================
     ⭐ FAQ 토글 (기존 toggle-btn)
  ============================ */
  const faqToggles = document.querySelectorAll(".toggle-btn, .toggle-arrow");

  faqToggles.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.nextElementSibling;
      if (!target) return;

      const isVisible = target.style.display === "block";
      target.style.display = isVisible ? "none" : "block";

      btn.innerHTML = isVisible
        ? btn.innerHTML.replace("▲", "▼")
        : btn.innerHTML.replace("▼", "▲");
    });
  });


  /* ============================
     ⭐ 계산기 상세 토글
  ============================ */
  const accBtn = document.querySelector(".calc-acc-btn");
  const accBox = document.getElementById("hl_accordion");

  if (accBtn && accBox) {
    accBtn.addEventListener("click", () => {
      const isOpen = accBox.style.display === "block";

      accBox.style.display = isOpen ? "none" : "block";
      accBtn.innerHTML = isOpen
        ? "계산 상세 보기 ▼"
        : "계산 상세 닫기 ▲";
    });
  }

});


/* ============================
   ⭐ 계산하기 실행 후 결과 표시
============================ */
function handleLivingCalc() {
  // 기존 계산 함수 실행
  calculateHouseholdLiving(); // ← 기존 함수 그대로 유지

  // 요약 결과 표시
  document.getElementById("hl_summary").style.display = "block";

  // 상세 결과 자동 표시
  const accBox = document.getElementById("hl_accordion");
  const accBtn = document.querySelector(".calc-acc-btn");

  accBox.style.display = "block";
  accBtn.innerHTML = "계산 상세 닫기 ▲";
}


/* ============================
   ⭐ 초기화 버튼
============================ */
function resetHouseholdLiving() {
  document.getElementById("hl_income").value = "";
  document.getElementById("hl_household").value = "1";
  document.getElementById("hl_court_living").value = "";
  document.getElementById("hl_extra").value = "";
  document.getElementById("hl_months").value = "36";

  document.getElementById("hl_summary").style.display = "none";
  document.getElementById("hl_accordion").style.display = "none";

  document.querySelector(".calc-acc-btn").innerHTML = "계산 상세 보기 ▼";
}

document.addEventListener("DOMContentLoaded", () => {

  /* ============================
     ⭐ FAQ 토글
  ============================ */
  const faqToggles = document.querySelectorAll(".toggle-arrow, .faq-question");

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
   ⭐ 기존 handleLivingCalc() 흐름을 유지하면서
      UI만 제어하는 후처리 함수
============================ */
function afterLivingCalcUI() {
  const summary = document.getElementById("hl_summary");
  const accBox = document.getElementById("hl_accordion");
  const accBtn = document.querySelector(".calc-acc-btn");

  // 요약 결과 표시
  if (summary) summary.style.display = "block";

  // 상세 결과 표시
  if (accBox) accBox.style.display = "block";

  // 버튼 텍스트 변경
  if (accBtn) accBtn.innerHTML = "계산 상세 닫기 ▲";
}

document.addEventListener("DOMContentLoaded", () => {

  // ⭐ 계산 상세 보기 토글
  const toggleButtons = document.querySelectorAll(".calc-template .toggle-btn");

  toggleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.nextElementSibling;
      if (!target) return;

      const isVisible = target.style.display === "block";
      target.style.display = isVisible ? "none" : "block";

      btn.innerHTML = isVisible
        ? "계산 상세 보기 ▼"
        : "계산 상세 닫기 ▲";
    });
  });

});

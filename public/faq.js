document.addEventListener("DOMContentLoaded", () => {
  const questions = document.querySelectorAll(".faq-question");

  questions.forEach((btn) => {
    btn.addEventListener("click", () => {
      const answer = btn.nextElementSibling;
      const isOpen = answer.style.display === "block";

      // 모든 FAQ 닫기 (원하면 제거 가능)
      document.querySelectorAll(".faq-answer").forEach(a => a.style.display = "none");

      // 클릭한 FAQ만 토글
      answer.style.display = isOpen ? "none" : "block";
    });
  });
});

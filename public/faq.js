document.addEventListener("DOMContentLoaded", () => {
  const questions = document.querySelectorAll(".faq-question");

  questions.forEach((btn) => {
    btn.addEventListener("click", () => {
      const answer = btn.nextElementSibling;
      const isOpen = answer.classList.contains("open");

      // 여러 FAQ 동시 열기 허용 → 전체 닫기 제거
      // 만약 한 번에 하나만 열리게 하려면 아래 주석 해제:
      // document.querySelectorAll(".faq-answer").forEach(a => {
      //   a.classList.remove("open");
      //   a.style.maxHeight = null;
      //   a.previousElementSibling.textContent =
      //     a.previousElementSibling.textContent.replace("▲", "▼");
      // });

      if (isOpen) {
        // 닫기
        answer.classList.remove("open");
        answer.style.maxHeight = null;
        btn.textContent = btn.textContent.replace("▲", "▼");
      } else {
        // 열기
        answer.classList.add("open");
        answer.style.maxHeight = answer.scrollHeight + "px";
        btn.textContent = btn.textContent.replace("▼", "▲");
      }
    });
  });
});

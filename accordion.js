// accordion.js

document.addEventListener("DOMContentLoaded", () => {
  const accButtons = document.querySelectorAll(".acc-btn");
  const toggleAllBtn = document.getElementById("toggle-all");

  // 개별 아코디언 열기/닫기
  accButtons.forEach(btn => {
    btn.addEventListener("click", function () {
      this.classList.toggle("active");

      const content = this.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });

  // 전체 펼치기 / 접기
  toggleAllBtn.addEventListener("click", () => {
    const isOpen = toggleAllBtn.classList.contains("open");

    accButtons.forEach(btn => {
      const content = btn.nextElementSibling;

      if (isOpen) {
        // 전체 접기
        btn.classList.remove("active");
        content.style.maxHeight = null;
      } else {
        // 전체 펼치기
        btn.classList.add("active");
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });

    // 버튼 텍스트 변경
    if (isOpen) {
      toggleAllBtn.textContent = "전체 펼치기 ▼";
      toggleAllBtn.classList.remove("open");
    } else {
      toggleAllBtn.textContent = "전체 접기 ▲";
      toggleAllBtn.classList.add("open");
    }
  });
});

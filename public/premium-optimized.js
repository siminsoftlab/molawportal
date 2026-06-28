// premium-optimized.js

// 헤더 로드 + 메뉴 이벤트 연결
function loadHeader() {
  fetch("/header.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("header").innerHTML = html;

      // 요소 로드 후 이벤트 연결
      const menuBtn = document.querySelector(".menu-btn");
      const menuClose = document.querySelector(".menu-close");
      const menuPanel = document.getElementById("globalMenu");

      function toggleMenu() {
        menuPanel.classList.toggle("active");
      }

      // 전역 등록
      window.toggleMenu = toggleMenu;

      menuBtn.addEventListener("click", toggleMenu);
      menuClose.addEventListener("click", toggleMenu);
    });
}

// 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", loadHeader);

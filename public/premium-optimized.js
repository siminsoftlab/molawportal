// /premium-optimized.js

document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.querySelector(".menu-btn");
  const menuClose = document.querySelector(".menu-close");
  const menuPanel = document.getElementById("globalMenu");
  const searchInput = document.getElementById("menuSearchInput");

  function toggleMenu() {
    if (!menuPanel) return;
    menuPanel.classList.toggle("active");
  }

  if (menuBtn) menuBtn.addEventListener("click", toggleMenu);
  if (menuClose) menuClose.addEventListener("click", toggleMenu);

  // 검색: 메뉴 텍스트 필터링
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const keyword = searchInput.value.trim();
      const items = document.querySelectorAll(".mobile-menu-grid .menu-item span");
      items.forEach(span => {
        const parent = span.parentElement;
        if (!keyword) {
          parent.style.display = "";
        } else {
          parent.style.display = span.textContent.includes(keyword) ? "" : "none";
        }
      });
    });
  }

  loadRecentCalcs();
});

// 계산기 열기 + 최근 사용한 계산기 저장
function openCalc(url) {
  saveRecentCalc(url);
  location.href = url;
}

function saveRecentCalc(url) {
  let list = JSON.parse(localStorage.getItem("recentCalcs") || "[]");
  list = list.filter(item => item !== url);
  list.unshift(url);
  if (list.length > 5) list.pop();
  localStorage.setItem("recentCalcs", JSON.stringify(list));
}

function loadRecentCalcs() {
  const ul = document.getElementById("recentCalcList");
  if (!ul) return;

  const list = JSON.parse(localStorage.getItem("recentCalcs") || "[]");
  if (list.length === 0) {
    ul.innerHTML = "<li>최근 사용한 계산기가 없습니다</li>";
    return;
  }

  ul.innerHTML = list
    .map(url => `<li onclick="location.href='${url}'">${convertCalcName(url)}</li>`)
    .join("");
}

// URL → 계산기 이름 변환
function convertCalcName(url) {
  if (url.includes("compound")) return "연이자율 계산기";
  if (url.includes("interest")) return "연이자 계산기";
  if (url.includes("repay")) return "개인회생 변제금 계산기";
  if (url.includes("living-adjust")) return "법원 생계비 계산기";
  if (url.includes("household-auto-living")) return "가구수 생계비 계산기";
  return "계산기";
}

// 개인회생·파산 탭 전환
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("law-tab-btn")) {
    document.querySelectorAll(".law-tab-btn").forEach(btn => btn.classList.remove("active"));
    e.target.classList.add("active");

    const tab = e.target.dataset.tab;
    document.querySelectorAll(".law-panel").forEach(panel => panel.classList.remove("active"));
    const target = document.getElementById(tab);
    if (target) target.classList.add("active");
  }
});

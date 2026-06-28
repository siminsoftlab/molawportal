/* =========================================================
   ⭐ 전체메뉴 열기/닫기
========================================================= */
const openGlobalMenuBtn = document.getElementById("openGlobalMenu");
const closeGlobalMenuBtn = document.getElementById("closeGlobalMenu");
const globalMenu = document.getElementById("globalMenu");

if (openGlobalMenuBtn && globalMenu) {
  openGlobalMenuBtn.addEventListener("click", () => {
    globalMenu.classList.add("active");
  });
}

if (closeGlobalMenuBtn && globalMenu) {
  closeGlobalMenuBtn.addEventListener("click", () => {
    globalMenu.classList.remove("active");
  });
}

function initGlobalMenu() {
  const openBtn = document.getElementById("openGlobalMenu");
  const closeBtn = document.getElementById("closeGlobalMenu");
  const menu = document.getElementById("globalMenu");

  if (!openBtn || !closeBtn || !menu) return;

  openBtn.onclick = () => menu.classList.add("active");
  closeBtn.onclick = () => menu.classList.remove("active");
}

/* =========================================================
   ⭐ 전체메뉴 검색 필터링
========================================================= */
const menuSearchInput = document.getElementById("menuSearchInput");
const menuSearchBtn = document.getElementById("menuSearchBtn");
const menuGrid = document.getElementById("menuGrid");

function filterMenu() {
  const keyword = (menuSearchInput.value || "").trim().toLowerCase();
  const items = menuGrid.querySelectorAll(".menu-item");

  items.forEach(item => {
    const k = (item.dataset.keywords || "").toLowerCase();
    item.style.display = keyword && !k.includes(keyword) ? "none" : "flex";
  });
}

if (menuSearchInput) {
  menuSearchInput.addEventListener("input", filterMenu);
}
if (menuSearchBtn) {
  menuSearchBtn.addEventListener("click", filterMenu);
}

/* =========================================================
   ⭐ 상단 검색
========================================================= */
function initTopSearch() {
  const input = document.getElementById("topSearchInput");
  const btn = document.getElementById("topSearchBtn");

  if (!input || !btn) return;

  btn.onclick = () => {
    const q = (input.value || "").trim().toLowerCase();
    if (!q) return;

    // 검색 결과 페이지로 이동
    location.href = "/search.html?q=" + encodeURIComponent(q);
  };
}

/* =========================================================
   ⭐ 최근 사용한 계산기 (localStorage)
========================================================= */
const RECENT_KEY = "recentCalculators";

function getRecentCalculators() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentCalculator(path, label) {
  const list = getRecentCalculators();
  const existingIndex = list.findIndex(item => item.path === path);

  if (existingIndex !== -1) list.splice(existingIndex, 1);

  list.unshift({ path, label });

  if (list.length > 5) list.pop();

  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  renderRecentCalculators();
}

function renderRecentCalculators() {
  const list = getRecentCalculators();
  const ulMenu = document.getElementById("recentCalcList");
  const ulSidebar = document.getElementById("recentCalcListSidebar");

  if (ulMenu) {
    ulMenu.innerHTML = "";
    list.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.label;
      li.style.cursor = "pointer";
      li.addEventListener("click", () => location.href = item.path);
      ulMenu.appendChild(li);
    });
  }

  if (ulSidebar) {
    ulSidebar.innerHTML = "";
    list.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.label;
      li.style.cursor = "pointer";
      li.style.fontSize = "12px";
      li.addEventListener("click", () => location.href = item.path);
      ulSidebar.appendChild(li);
    });
  }
}

renderRecentCalculators();

/* 계산기 열기 공통 함수 */
function openCalc(path) {
  const labelMap = {
    "/calculators/repay.html": "개인회생 변제금",
    "/calculators/living-adjust.html": "법원 생계비",
    "/calculators/household-auto-living.html": "가구수 생계비",
    "/calculators/interest.html": "연이자",
    "/calculators/compound.html": "연이자율"
  };

  const label = labelMap[path] || "계산기";
  saveRecentCalculator(path, label);
  location.href = path;
}

/* =========================================================
   ⭐ 자동 슬라이드 배너
========================================================= */
const sliderWrapper = document.getElementById("sliderWrapper");
const sliderDots = document.querySelectorAll("#sliderDots .dot");
let currentSlide = 0;

function goToSlide(index) {
  if (!sliderWrapper) return;
  currentSlide = index;
  sliderWrapper.style.transform = `translateX(-${index * 100}%)`;

  sliderDots.forEach(dot => dot.classList.remove("active"));
  const activeDot = document.querySelector(`#sliderDots .dot[data-index="${index}"]`);
  if (activeDot) activeDot.classList.add("active");
}

sliderDots.forEach(dot => {
  dot.addEventListener("click", () => {
    goToSlide(parseInt(dot.dataset.index, 10));
  });
});

setInterval(() => {
  const next = (currentSlide + 1) % sliderDots.length;
  goToSlide(next);
}, 5000);

/* =========================================================
   ⭐ 개인회생·파산 탭
========================================================= */
const tabButtons = document.querySelectorAll(".law-tab-btn");
const tabPanels = document.querySelectorAll(".law-panel");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;

    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    tabPanels.forEach(panel => {
      panel.classList.toggle("active", panel.id === target);
    });
  });
});

/* =========================================================
   ⭐ 상담 신청 (프론트 검증)
========================================================= */
const consultName = document.getElementById("consultName");
const consultPhone = document.getElementById("consultPhone");
const consultContent = document.getElementById("consultContent");
const consultSubmitBtn = document.getElementById("consultSubmitBtn");
const consultStatus = document.getElementById("consultStatus");

if (consultSubmitBtn) {
  consultSubmitBtn.addEventListener("click", () => {
    const name = (consultName.value || "").trim();
    const phone = (consultPhone.value || "").trim();
    const content = (consultContent.value || "").trim();

    if (!name || !phone || !content) {
      consultStatus.textContent = "이름·연락처·상담 내용을 모두 입력해주세요.";
      return;
    }

    consultStatus.textContent = "상담 신청이 접수되었습니다. 담당자가 확인 후 연락드립니다.";
  });
}

/* =========================================================
   ⭐ 전국 법원 카카오맵 + 마커
========================================================= */
const courts = [
  { name: "서울회생법원", lat: 37.4937, lng: 127.0070 },
  { name: "수원지방법원", lat: 37.2635, lng: 127.0286 },
  { name: "대전지방법원", lat: 36.3504, lng: 127.3845 },
  { name: "대구지방법원", lat: 35.8599, lng: 128.6267 },
  { name: "부산지방법원", lat: 35.1767, lng: 129.0740 },
  { name: "광주지방법원", lat: 35.1595, lng: 126.8526 }
];

window.addEventListener("load", () => {
  const container = document.getElementById("courtMap");
  if (!container || typeof kakao === "undefined") return;

  const map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(36.5, 127.8),
    level: 13
  });

  courts.forEach(court => {
    const marker = new kakao.maps.Marker({
      map,
      position: new kakao.maps.LatLng(court.lat, court.lng)
    });

    const infowindow = new kakao.maps.InfoWindow({
      content: `<div style="padding:6px 10px;font-size:13px;">${court.name}</div>`
    });

    kakao.maps.event.addListener(marker, "mouseover", () => infowindow.open(map, marker));
    kakao.maps.event.addListener(marker, "mouseout", () => infowindow.close());
  });
});

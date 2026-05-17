/****************************************************
 *  안전한 선택자 / 공통 함수
 ****************************************************/
function $(id) {
  return document.getElementById(id);
}

function toNumber(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function setHTMLSafe(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

/****************************************************
 *  WebView 처리
 ****************************************************/
function isWebView() {
  const ua = navigator.userAgent || "";
  return ua.includes("wv") || ua.includes("Version/4.0");
}

function fixTargetsForWebView() {
  if (!isWebView()) return;

  const links = document.querySelectorAll('a[target="_blank"]');
  links.forEach((link) => {
    link.removeAttribute("target");
    link.removeAttribute("rel");
  });
}

/****************************************************
 *  실시간 시계
 ****************************************************/
function updateClock() {
  const el = $('live-clock');
  if (!el) return;

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");

  el.textContent = `${y}-${m}-${d} ${h}:${mi}:${s}`;
}

/****************************************************
 *  배너 슬라이더
 ****************************************************/
function initBannerSlider() {
  try {
    const banners = document.querySelectorAll(".banner");
    if (!banners.length) return;

    const prevBtn = document.querySelector(".prev");
    const nextBtn = document.querySelector(".next");

    let current = 0;

    function showBanner(i) {
      banners.forEach((b) => b.classList.remove("active"));
      banners[i].classList.add("active");
    }

    function next() {
      current = (current + 1) % banners.length;
      showBanner(current);
    }

    function prev() {
      current = (current - 1 + banners.length) % banners.length;
      showBanner(current);
    }

    let auto = setInterval(next, 3000);

    function resetAuto() {
      clearInterval(auto);
      auto = setInterval(next, 3000);
    }

    if (nextBtn) nextBtn.addEventListener("click", () => { next(); resetAuto(); });
    if (prevBtn) prevBtn.addEventListener("click", () => { prev(); resetAuto(); });

    banners.forEach((banner) => {
      banner.addEventListener("click", () => {
        const url = banner.getAttribute("data-link");
        if (url) location.href = url;
      });
    });

    showBanner(0);
  } catch (e) {
    console.log("banner error:", e);
  }
}

/****************************************************
 *  숫자 천 단위 구분자
 ****************************************************/
function formatNumberComma(num) {
  return Number(num).toLocaleString();
}

/****************************************************
 *  방문자 수 표시
 ****************************************************/
function updateVisitors(today, total) {
  $("visitor-today").textContent = formatNumberComma(today);
  $("visitor-total").textContent = formatNumberComma(total);
}

/****************************************************
 *  아코디언
 ****************************************************/
function initAccordionGroup(buttonSelector, contentSelector, toggleSelector) {
  const buttons = document.querySelectorAll(buttonSelector);
  const contents = document.querySelectorAll(contentSelector);
  const toggleAllBtn = toggleSelector ? document.getElementById(toggleSelector) : null;

  if (!buttons.length || !contents.length) return;

  // 개별 아코디언
  buttons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      const content = contents[index];
      const isOpen = content.style.maxHeight;

      contents.forEach((c) => {
        c.style.maxHeight = null;
        c.classList.remove("open");
      });
      buttons.forEach((b) => b.classList.remove("active"));

      if (!isOpen) {
        content.style.maxHeight = content.scrollHeight + "px";
        content.classList.add("open");
        btn.classList.add("active");
      }
    });
  });

  // 전체 펼치기 / 접기 (버튼 있을 때만)
  if (!toggleAllBtn) return;

  let allOpen = false;

  toggleAllBtn.addEventListener("click", () => {
    allOpen = !allOpen;

    if (allOpen) {
      contents.forEach((c, i) => {
        c.style.maxHeight = c.scrollHeight + "px";
        c.classList.add("open");
        buttons[i].classList.add("active");
      });
      toggleAllBtn.textContent = "전체 접기 ▲";
    } else {
      contents.forEach((c) => {
        c.style.maxHeight = null;
        c.classList.remove("open");
      });
      buttons.forEach((b) => b.classList.remove("active"));
      toggleAllBtn.textContent = "전체 펼치기 ▼";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);

  initBannerSlider();

  const hasHomeCalcToggle = document.getElementById("toggle-all");
  const hasSiteToggle = document.getElementById("toggle-all-site");

  // 홈 페이지: 계산기 소개 + 사이트 소개
  if (hasHomeCalcToggle) {
    initAccordionGroup(".calc-acc-btn", ".calc-acc-content", "toggle-all");
  } else {
    // 서브 페이지(법원생계비 / 가구수생계비): 전체펼치기 없이 개별만
    initAccordionGroup(".calc-acc-btn", ".calc-acc-content", null);
  }

  if (hasSiteToggle) {
    initAccordionGroup(".site-acc-btn", ".site-acc-content", "toggle-all-site");
  }
});


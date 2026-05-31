/****************************************************
 * 공통 함수
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
 * WebView 처리
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
 * 실시간 시계 (롤링 애니메이션)
 ****************************************************/
function rollingClock() {
  const clock = document.getElementById("live-clock");
  if (!clock) return;

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");

  const timeString = `${y}-${m}-${d}  ${h}:${mi}:${s}`;

  if (!clock.dataset.initialized) {
    clock.innerHTML = "";

    [...timeString].forEach(char => {
      const wrap = document.createElement("span");
      wrap.className = "clock-digit-wrap";

      const digit = document.createElement("span");
      digit.className = "clock-digit";

      digit.innerHTML = (char === " ") ? "&nbsp;" : char;

      wrap.appendChild(digit);
      clock.appendChild(wrap);
    });

    clock.dataset.initialized = "1";
    return;
  }

  const oldDigits = clock.querySelectorAll(".clock-digit");

  [...timeString].forEach((char, i) => {
    const digit = oldDigits[i];
    const newChar = (char === " ") ? "\u00A0" : char;

    if (digit.textContent !== newChar && digit.innerHTML !== "&nbsp;") {
      digit.classList.add("roll");

      setTimeout(() => {
        digit.innerHTML = (char === " ") ? "&nbsp;" : char;
        digit.classList.remove("roll");
      }, 350);
    }
  });
}

/****************************************************
 * 배너 슬라이더
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
 * 아코디언 (홈/서브 공통)
 ****************************************************/
function initAccordionGroup(buttonSelector, contentSelector, toggleSelector) {
  const buttons = document.querySelectorAll(buttonSelector);
  const contents = document.querySelectorAll(contentSelector);
  const toggleAllBtn = toggleSelector ? document.getElementById(toggleSelector) : null;

  if (!buttons.length || !contents.length) return;

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

/****************************************************
 * 방문자 수 표시
 ****************************************************/
function updateVisitors(today, total) {
  $("visitor-today").textContent = Number(today).toLocaleString();
  $("visitor-total").textContent = Number(total).toLocaleString();
}

/****************************************************
 * DOM 로드 후 실행
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  rollingClock();
  setInterval(rollingClock, 1000);

  initBannerSlider();

  // ⭐ 홈/서브 정확 판별
  const isHome = document.body.classList.contains("homepage");

  if (isHome) {
    initAccordionGroup(".calc-acc-btn", ".calc-acc-content", "toggle-all");
    initAccordionGroup(".site-acc-btn", ".site-acc-content", "toggle-all-site");
    initAccordionGroup(".info-acc-btn", ".info-acc-content", "toggle-all-info");
  } else {
    initAccordionGroup(".calc-acc-btn", ".calc-acc-content", null);
  }
});

/****************************************************
 * 섹션 등장 애니메이션
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".section-animate");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.2 }
  );

  sections.forEach((sec) => observer.observe(sec));
});

/****************************************************
 * 타이핑 효과
 ****************************************************/
document.addEventListener("DOMContentLoaded", function () {
  const text = "아이콘을 클릭하면 해당 계산기를 바로 이용할 수 있습니다.";
  const typingTarget = document.getElementById("typing-text");
  const bubble = document.querySelector(".calc-greeting-bubble");

  let isTyping = false;

  function startTyping() {
    if (isTyping) return;
    isTyping = true;

    typingTarget.textContent = "";
    let index = 0;

    function typing() {
      if (index < text.length) {
        typingTarget.textContent += text.charAt(index);
        index++;
        setTimeout(typing, 60);
      }
    }
    typing();
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isTyping = false;
          startTyping();
        }
      });
    },
    { threshold: 0.6 }
  );

  observer.observe(bubble);
});
/****************************************************
 * 보기 모달
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const openBtn  = document.getElementById("openPrivacyModal");
  const modal    = document.getElementById("privacyModal");
  const closeBtn = modal ? modal.querySelector(".close-modal") : null;

  if (!openBtn || !modal) return;

  // [보기] 클릭 → 모달 열기
  openBtn.addEventListener("click", () => {
    modal.style.display = "block";
  });

  // 닫기 버튼(X) → 모달 닫기
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  // 모달 바깥 클릭 → 모달 닫기
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});
/****************************************************
 * 온라인 상담 말풍선 타이핑 효과 (확정 작동 버전)
 ****************************************************/
document.addEventListener("DOMContentLoaded", function () {
  const text2 = "1분이면 상담 신청이 가능합니다.";
  const typingTarget2 = document.getElementById("consult-typing");

  if (!typingTarget2) return;

  let index = 0;

  function typing2() {
    if (index < text2.length) {
      typingTarget2.textContent += text2.charAt(index);
      index++;
      setTimeout(typing2, 60);
    }
  }

  // 페이지 로드 후 바로 타이핑 시작
  typing2();
});


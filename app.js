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
 *  실시간 시계 (롤링 애니메이션 적용)
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

  // 날짜와 시간 사이 공백 2칸
  const timeString = `${y}-${m}-${d}  ${h}:${mi}:${s}`;

  // 최초 생성
  if (!clock.dataset.initialized) {
    clock.innerHTML = "";

    [...timeString].forEach(char => {
      const wrap = document.createElement("span");
      wrap.className = "clock-digit-wrap";

      const digit = document.createElement("span");
      digit.className = "clock-digit";

      // 공백은 &nbsp;로 처리하여 실제 간격 확보
      if (char === " ") {
        digit.innerHTML = "&nbsp;";
      } else {
        digit.textContent = char;
      }

      wrap.appendChild(digit);
      clock.appendChild(wrap);
    });

    clock.dataset.initialized = "1";
    return;
  }

  // 기존 숫자 가져오기
  const oldDigits = clock.querySelectorAll(".clock-digit");

  [...timeString].forEach((char, i) => {
    const digit = oldDigits[i];

    const newChar = (char === " ") ? "\u00A0" : char; // 공백 처리

    if (digit.textContent !== newChar && digit.innerHTML !== "&nbsp;") {
      digit.classList.add("roll");

      setTimeout(() => {
        if (char === " ") {
          digit.innerHTML = "&nbsp;";
        } else {
          digit.textContent = char;
        }
        digit.classList.remove("roll");
      }, 350);
    }
  });
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

function calcRepay() {
  const income = toNumber($("income").value);
  const living = toNumber($("living").value);
  const extra = toNumber($("extra").value);
  const months = toNumber($("months").value);
  const asset = toNumber($("asset").value);

  const disposable = income - living - extra;
  const monthlyPay = Math.max(disposable, 0);
  const totalPay = monthlyPay * months;

  const finalPay = Math.max(totalPay, asset);

  // 요약 카드 표시
  $("repaySummary").style.display = "block";
  setHTMLSafe(
    "repaySummary",
    `<strong>총 변제금:</strong> ${finalPay.toLocaleString()}원`
  );

  // 상세 계산 표시
  $("repayAccordion").style.display = "block";
  setHTMLSafe(
    "repayAccordion",
    `
      <div class="calc-step">
        <strong>1) 월 소득</strong><br>${income.toLocaleString()}원
      </div>

      <div class="calc-step">
        <strong>2) 생계비</strong><br>${living.toLocaleString()}원
      </div>

      <div class="calc-step">
        <strong>3) 추가 생계비</strong><br>${extra.toLocaleString()}원
      </div>

      <div class="calc-step">
        <strong>4) 가용소득</strong><br>
        ${income.toLocaleString()} − ${living.toLocaleString()} − ${extra.toLocaleString()}<br>
        = <strong>${monthlyPay.toLocaleString()}원</strong>
      </div>

      <div class="calc-step">
        <strong>5) 변제기간</strong><br>${months}개월
      </div>

      <div class="calc-step">
        <strong>6) 총 변제금</strong><br>
        ${monthlyPay.toLocaleString()} × ${months} = ${totalPay.toLocaleString()}원
      </div>

      <div class="calc-step">
        <strong>7) 청산가치 비교</strong><br>
        청산가치: ${asset.toLocaleString()}원<br>
        최종 변제금: <strong>${finalPay.toLocaleString()}원</strong>
      </div>
    `
  );

  // SEO 설명문
  const seo = $("repaySEO");
  seo.innerHTML = `
    <h3>📌 개인회생 변제금 자동 설명</h3>
    <p>
      월 소득 ${income.toLocaleString()}원에서 생계비와 추가 생계비를 제외한 
      가용소득은 ${monthlyPay.toLocaleString()}원이며, 
      ${months}개월 동안 변제하면 총 ${totalPay.toLocaleString()}원이 됩니다.
      청산가치와 비교하여 최종 변제금은 
      <strong>${finalPay.toLocaleString()}원</strong>입니다.
    </p>
  `;

  setTimeout(() => seo.classList.add("visible"), 50);
}
function resetRepayInputs() {
  $("income").value = "";
  $("living").value = "1538523";
  $("extra").value = "";
  $("months").value = "36";
  $("asset").value = "";

  $("repaySummary").style.display = "none";
  $("repayAccordion").style.display = "none";
  $("repaySEO").innerHTML = "";
  $("repaySEO").classList.remove("visible");
}
function toggleAccordionRepay() {
  const box = document.getElementById("repayAccordion");
  const btn = document.querySelector(".repay-accordion-btn");

  const isOpen = box.classList.contains("open");

  if (isOpen) {
    box.classList.remove("open");
    box.style.maxHeight = null;
    btn.textContent = "계산 상세 보기 ▼";
  } else {
    box.classList.add("open");
    box.style.maxHeight = box.scrollHeight + "px";
    btn.textContent = "계산 상세 접기 ▲";
  }
}


// ========== 이자 계산 (실제 계산 과정 표시) ==========
function toggleAccordion() {
  const box = document.getElementById("interestAccordion");
  const btn = document.querySelector(".interest-accordion-btn");

  const isOpen = box.classList.contains("open");

  if (isOpen) {
    box.classList.remove("open");
    box.style.maxHeight = null;
    btn.textContent = "계산 상세 보기 ▼";
  } else {
    box.classList.add("open");
    box.style.maxHeight = box.scrollHeight + "px";
    btn.textContent = "계산 상세 접기 ▲";
  }
}

function calcInterest() {
  try {
    const principal = toNumber($('principal')?.value);
    const rate      = toNumber($('rate')?.value);
    const days      = toNumber($('days')?.value);

    const interest = Math.floor(principal * (rate / 100) * (days / 365));
    const total = principal + interest;

    /* ⭐ 총 상환액 강조 카드 */
    setHTMLSafe("interestSummary", `
      총 상환액: ${total.toLocaleString()}원
    `);
    $('interestSummary').style.display = "block";

    /* ⭐ 아코디언 상세 계산 결과 */
    setHTMLSafe("interestAccordion", `
      <div class="calc-step">
        <strong>1) 원금</strong><br>
        ${principal.toLocaleString()}원
      </div>

      <div class="calc-step">
        <strong>2) 연이율</strong><br>
        ${rate}%
      </div>

      <div class="calc-step">
        <strong>3) 이자 계산 기간</strong><br>
        ${days}일
      </div>

      <div class="calc-step">
        <strong>4) 이자 계산식</strong><br>
        ${principal.toLocaleString()} × (${rate}/100) × (${days}/365)<br>
        = <strong>${interest.toLocaleString()}원</strong>
      </div>
    `);

    /* ⭐ 자동 설명문 */
const seoBox = document.getElementById("interestSEO");
seoBox.innerHTML = `
  <h3>📌 연이자 계산기 자동 설명</h3>
  <p>
    원금 ${principal.toLocaleString()}원에 연이율 ${rate}%를 적용하고 
    ${days}일 동안 계산한 이자는 ${interest.toLocaleString()}원이며,
    최종 상환액은 ${total.toLocaleString()}원입니다.
  </p>
  <p>
    연이자 계산 공식:<br>
    <strong>원금 × (연이율 ÷ 100) × (일수 ÷ 365)</strong>
  </p>
`;
    /* ⭐ 애니메이션 등장 */
    setTimeout(() => {
      seoBox.classList.add("visible");
    }, 50);

  } catch (e) {
    console.log("calcInterest error:", e);
  }
}

// ========== SEO 자동 설명문 생성 ==========
function generateInterestSEO(principal, rate, days, interest, total) {
  return `
    <div class="seo-box">
      <h3>📌 연이자 계산기 자동 설명</h3>
      <p>
        본 페이지는 연이자 계산기를 통해 원금, 연이율, 기간을 입력하면 
        자동으로 이자를 계산해주는 기능을 제공합니다. 
        예를 들어 원금 ${principal.toLocaleString()}원에 연이율 ${rate}%를 적용하고 
        ${days}일 동안의 이자를 계산하면 
        총 이자는 ${interest.toLocaleString()}원이며 
        최종 상환액은 ${total.toLocaleString()}원이 됩니다.
      </p>

      <p>
        연이자 계산 공식은 다음과 같습니다.<br>
        <strong>원금 × (연이율 ÷ 100) × (일수 ÷ 365)</strong><br>
        이 공식은 금융기관, 대출, 연체이자, 손해배상 이자 계산 등 
        다양한 상황에서 사용되는 표준 방식입니다.
      </p>

      <p>
        연이자 계산기, 이자 계산기, 대출이자 계산, 
        원리금 계산 등 관련 키워드로 검색 시 
        본 계산기는 빠르고 정확한 계산 결과를 제공합니다.
      </p>
    </div>
  `;
}

// ========== 이자 리셋 ==========
function resetInterestInputs() {
  try {
    const inputs = document.querySelectorAll("input[type='number']");
    for (let i = 0; i < inputs.length; i++) inputs[i].value = "";

    $('principal').value = "";
    $('rate').value = 20;
    $('days').value = "";

    setHTMLSafe("interestResult", "");
  } catch (e) {
    console.log("resetInterest error:", e);
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
 *  아코디언 (홈/서브페이지 통합 안정판)
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

      // 모두 닫기
      contents.forEach((c) => {
        c.style.maxHeight = null;
        c.classList.remove("open");
      });
      buttons.forEach((b) => b.classList.remove("active"));

      // 클릭한 것만 열기
      if (!isOpen) {
        content.style.maxHeight = content.scrollHeight + "px";
        content.classList.add("open");
        btn.classList.add("active");
      }
    });
  });

  // 전체펼치기 버튼이 없으면 종료 (서브페이지)
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
 *  DOM 로드 후 실행 (홈/서브 완전 분리)
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  rollingClock();
  setInterval(rollingClock, 1000);

  initBannerSlider();

  const isHome = document.getElementById("toggle-all") !== null;

  if (isHome) {
    // ⭐ 홈 페이지
    initAccordionGroup(".calc-acc-btn", ".calc-acc-content", "toggle-all");
    initAccordionGroup(".site-acc-btn", ".site-acc-content", "toggle-all-site");
  } else {
    // ⭐ 서브 페이지 (변제금/연이자/법원생계비/가구수생계비)
    initAccordionGroup(".calc-acc-btn", ".calc-acc-content", null);
  }
});
/****************************************************
 *  섹션 등장 애니메이션 (서브페이지용)
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
document.addEventListener("DOMContentLoaded", function () {
  const text = "안녕하세요! 찾으시는 계산기가 있으신가요?";
  const typingTarget = document.getElementById("typing-text");
  const bubble = document.querySelector(".calc-greeting-bubble");

  let isTyping = false;

  function startTyping() {
    if (isTyping) return; // 중복 실행 방지
    isTyping = true;

    typingTarget.textContent = ""; // 초기화
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

  // 스크롤 감지 → 화면에 보이면 타이핑 재생
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isTyping = false; // 재실행 허용
          startTyping();
        }
      });
    },
    { threshold: 0.6 } // 60% 보이면 실행
  );

  observer.observe(bubble);
});


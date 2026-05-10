// ========== 안전한 선택자 ==========
function $(id) {
  return document.getElementById(id);
}

// ========== 숫자 변환 ==========
function toNumber(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ========== 안전한 innerHTML ==========
function setHTMLSafe(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

// WebView 감지
function isWebView() {
  const ua = navigator.userAgent || "";
  return ua.includes("wv") || ua.includes("Version/4.0");
}

// WebView에서는 target="_blank" 제거
function fixTargetsForWebView() {
  if (!isWebView()) return;

  const links = document.querySelectorAll('a[target="_blank"]');
  for (let i = 0; i < links.length; i++) {
    links[i].removeAttribute("target");
    links[i].removeAttribute("rel");
  }
}

// ========== 실시간 시계 ==========
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

// ========== 배너 슬라이더 ==========
function initBannerSlider() {
  try {
    const banners = document.querySelectorAll(".banner");
    if (!banners || banners.length === 0) return; // 배너 없으면 종료

    const prevBtn = document.querySelector(".prev");
    const nextBtn = document.querySelector(".next");

    let current = 0;

    function showBanner(i) {
      for (let x = 0; x < banners.length; x++) {
        banners[x].classList.remove("active");
      }
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

    for (let i = 0; i < banners.length; i++) {
      banners[i].addEventListener("click", () => {
        const url = banners[i].getAttribute("data-link");
        if (url) location.href = url;
      });
    }

    showBanner(0);
  } catch (e) {
    console.log("banner error:", e);
  }
}

// ========== 변제금 계산 ==========
function calcRepay() {
  try {
    const income = toNumber($('income')?.value);
    const living = toNumber($('living')?.value);
    const extra  = toNumber($('extra')?.value);
    const months = toNumber($('months')?.value);
    const asset  = toNumber($('asset')?.value);

    const disposable = Math.max(income - (living + extra), 0);
    const totalByIncome = disposable * months;
    const finalTotal = Math.max(totalByIncome, asset);
    const monthly = Math.ceil(finalTotal / months);

    setHTMLSafe("repayResult", `
      <div class="result-title">📌 계산 결과</div>
      <div class="result-item">
        <div class="result-label">월 변제금</div>
        <div class="result-value highlight">${monthly.toLocaleString()}원</div>
      </div>
      <div class="result-item">
        <div class="result-label">총 변제액</div>
        <div class="result-value">${finalTotal.toLocaleString()}원</div>
      </div>
    `);
  } catch (e) {
    console.log("calcRepay error:", e);
  }
}

// ========== 변제금 리셋 ==========
function resetRepayInputs() {
  try {
    const inputs = document.querySelectorAll("input[type='number']");
    for (let i = 0; i < inputs.length; i++) inputs[i].value = "";

    $('income').value = "";
    $('extra').value = "";
    $('months').value = 36;
    $('asset').value = "";

    const living = $('living');
    if (living) living.selectedIndex = 0;

    setHTMLSafe("repayResult", "");
  } catch (e) {
    console.log("resetRepay error:", e);
  }
}

// ========== 이자 계산 ==========
function calcInterest() {
  try {
    const principal = toNumber($('principal')?.value);
    const rate      = toNumber($('rate')?.value);
    const days      = toNumber($('days')?.value);

    const interest = Math.floor(principal * (rate / 100) * (days / 365));
    const total = principal + interest;

    setHTMLSafe("interestResult", `
      <div class="result-title">📌 계산 결과</div>
      <div class="result-item">
        <div class="result-label">이자 금액</div>
        <div class="result-value highlight">${interest.toLocaleString()}원</div>
      </div>
      <div class="result-item">
        <div class="result-label">총 상환액</div>
        <div class="result-value">${total.toLocaleString()}원</div>
      </div>
    `);
  } catch (e) {
    console.log("calcInterest error:", e);
  }
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

// ========== DOM 로드 ==========
document.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);

  initBannerSlider();
});

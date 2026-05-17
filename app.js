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

    const totalLiving = living + extra;
    const disposable = Math.max(income - totalLiving, 0);
    const totalByIncome = disposable * months;
    const finalTotal = Math.max(totalByIncome, asset);
    const monthly = Math.ceil(finalTotal / months);

    // 결과 HTML 삽입
    setHTMLSafe("repayResult", `
      <div class="result-title">📌 계산 결과</div>

      <div class="calc-step">
        <strong>1) 월 소득</strong><br>
        ${income.toLocaleString()}원
      </div>

      <div class="calc-step">
        <strong>2) 생계비 계산</strong><br>
        기본 생계비: ${living.toLocaleString()}원<br>
        추가 생계비: ${extra.toLocaleString()}원<br>
        👉 총 생계비 = ${totalLiving.toLocaleString()}원
      </div>

      <div class="calc-step">
        <strong>3) 월 변제 가능 금액</strong><br>
        ${income.toLocaleString()} − ${totalLiving.toLocaleString()}  
        = <strong>${disposable.toLocaleString()}원</strong>
      </div>

      <div class="calc-step">
        <strong>4) 총 변제금(소득 기준)</strong><br>
        ${disposable.toLocaleString()} × ${months}개월  
        = <strong>${totalByIncome.toLocaleString()}원</strong>
      </div>

      ${asset ? `
      <div class="calc-step">
        <strong>5) 청산가치</strong><br>
        ${asset.toLocaleString()}원 (소득 기준과 비교하여 더 큰 금액 적용)
      </div>
      ` : ""}

      <div class="calc-step">
        <strong>6) 최종 총 변제금</strong><br>
        <strong>${finalTotal.toLocaleString()}원</strong>
      </div>

      <div class="calc-step highlight-box">
        <strong>7) 최종 월 변제금</strong><br>
        ${finalTotal.toLocaleString()} ÷ ${months}개월  
        = <strong class="highlight">${monthly.toLocaleString()}원</strong>
      </div>
     
      ${generateRepaySEO(income, living, extra, months, asset, monthly, finalTotal)}
    `);

    // 🔥 계산 결과 박스를 강제로 표시 (핵심 수정)
    const box = $('repayResult');
    if (box) {
      box.style.display = "block";
    }

  } catch (e) {
    console.log("calcRepay error:", e);
  }
}
// ========== 변제금 계산기 SEO 자동 설명문 ==========
function generateRepaySEO(income, living, extra, months, asset, monthly, finalTotal) {
  return `
    <div class="seo-box">
      <h3>📌 개인회생 변제금 계산 자동 설명</h3>

      <p>
        본 계산기는 개인회생 신청 시 필요한 변제금을 자동으로 계산해주는 도구입니다.
        입력하신 월 소득 ${income.toLocaleString()}원에서 
        기본 생계비 ${living.toLocaleString()}원과 
        추가 생계비 ${extra.toLocaleString()}원을 제외하여 
        월 변제 가능 금액을 산출합니다.
      </p>

      <p>
        변제기간은 ${months}개월로 설정되었으며, 
        이에 따라 총 변제금은 ${finalTotal.toLocaleString()}원,
        월 변제금은 ${monthly.toLocaleString()}원으로 계산되었습니다.
        ${asset ? `또한 청산가치 ${asset.toLocaleString()}원이 반영되었습니다.` : ""}
      </p>

      <p>
        개인회생 변제금 계산 공식은 다음과 같습니다.<br>
        <strong>월 소득 − 생계비 = 월 변제 가능 금액</strong><br>
        <strong>월 변제 가능 금액 × 변제기간 = 총 변제금</strong>
      </p>

      <p>
        개인회생 변제금 계산기, 개인회생 생계비, 변제금 산정 기준, 
        법원 변제금 계산 등 관련 키워드 검색 시 
        본 계산기는 빠르고 정확한 자동 계산 기능을 제공합니다.
      </p>
    </div>
  `;
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

// ========== 이자 계산 (실제 계산 과정 표시) ==========
function calcInterest() {
  try {
    const principal = toNumber($('principal')?.value); // 원금
    const rate      = toNumber($('rate')?.value);      // 연이율(%)
    const days      = toNumber($('days')?.value);      // 일수

    // 계산식
    const interest = Math.floor(principal * (rate / 100) * (days / 365));
    const total = principal + interest;

    // 🔥 실제 계산 과정 출력
    setHTMLSafe("interestResult", `
      <div class="result-title">📌 계산 결과</div>

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
        원금 × (연이율 ÷ 100) × (일수 ÷ 365)<br>
        = ${principal.toLocaleString()} × (${rate}/100) × (${days}/365)<br>
        = <strong>${interest.toLocaleString()}원</strong>
      </div>

      <div class="calc-step highlight-box">
        <strong>5) 총 상환액</strong><br>
        원금 + 이자 =  
        ${principal.toLocaleString()} + ${interest.toLocaleString()}  
        = <strong class="highlight">${total.toLocaleString()}원</strong>
      </div>

     ${generateInterestSEO(principal, rate, days, interest, total)}
    `);

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

// ========== DOM 로드 ==========
document.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);

  initBannerSlider();
});

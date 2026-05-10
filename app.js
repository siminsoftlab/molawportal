// ========== 공통 유틸 ==========

// id로 요소 가져오기 (없으면 null)
function $(id) {
  return document.getElementById(id);
}

// 숫자 변환 (NaN 방지)
function toNumber(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// 안전하게 innerHTML 설정
function setHTMLSafe(id, html) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = html;
}

// ========== 실시간 시계 ==========

function updateClock() {
  const clockEl = $('live-clock');
  if (!clockEl) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');

  clockEl.textContent = `${year}-${month}-${day} ${hour}:${min}:${sec}`;
}

// ========== 배너 슬라이더 (메인 페이지) ==========

function initBannerSlider() {
  try {
    const banners = document.querySelectorAll('.banner');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');

    if (!banners || banners.length === 0) return; // 배너 없으면 그냥 종료

    let current = 0;

    function showBanner(index) {
      for (var i = 0; i < banners.length; i++) {
        banners[i].classList.remove('active');
      }
      banners[index].classList.add('active');
    }

    function showNextBanner() {
      current = (current + 1) % banners.length;
      showBanner(current);
    }

    function showPrevBanner() {
      current = (current - 1 + banners.length) % banners.length;
      showBanner(current);
    }

    // 자동 슬라이드
    let autoSlide = setInterval(showNextBanner, 3000);

    function resetAutoSlide() {
      clearInterval(autoSlide);
      autoSlide = setInterval(showNextBanner, 3000);
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        showNextBanner();
        resetAutoSlide();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        showPrevBanner();
        resetAutoSlide();
      });
    }

    // 배너 클릭 시 data-link로 이동
    for (var i = 0; i < banners.length; i++) {
      (function (banner) {
        banner.addEventListener('click', function () {
          var url = banner.getAttribute('data-link');
          if (url) {
            window.location.href = url;
          }
        });
      })(banners[i]);
    }

    // 초기 표시
    showBanner(0);
  } catch (e) {
    console.log('initBannerSlider error:', e);
  }
}

// ========== 변제금 계산기 ==========

function calcRepay() {
  try {
    const income = toNumber($('income') && $('income').value);
    const living = toNumber($('living') && $('living').value);
    const extra  = toNumber($('extra') && $('extra').value);
    const months = toNumber($('months') && $('months').value);
    const asset  = toNumber($('asset') && $('asset').value);

    if (!months || months <= 0) {
      setHTMLSafe('repayResult', `
        <div class="result-title">⚠ 입력 오류</div>
        <div class="result-item">
          <div class="result-label">안내</div>
          <div class="result-value">개월 수는 1개월 이상이어야 합니다.</div>
        </div>
      `);
      return;
    }

    const disposable = Math.max(income - (living + extra), 0);
    const totalByIncome = disposable * months;
    const finalTotal = Math.max(totalByIncome, asset);
    const monthly = Math.ceil(finalTotal / months);

    setHTMLSafe('repayResult', `
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
    console.log('calcRepay error:', e);
    setHTMLSafe('repayResult', `
      <div class="result-title">⚠ 오류</div>
      <div class="result-item">
        <div class="result-label">안내</div>
        <div class="result-value">계산 중 오류가 발생했습니다. 입력값을 다시 확인해주세요.</div>
      </div>
    `);
  }
}

function resetRepayInputs() {
  try {
    var inputs = document.querySelectorAll('input[type="number"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].value = '';
    }

    if ($('income'))  $('income').value = 0;
    if ($('extra'))   $('extra').value = 0;
    if ($('months'))  $('months').value = 36;
    if ($('asset'))   $('asset').value = 0;

    var livingEl = $('living');
    if (livingEl && typeof livingEl.selectedIndex === 'number') {
      livingEl.selectedIndex = 0;
    }

    setHTMLSafe('repayResult', '');
  } catch (e) {
    console.log('resetRepayInputs error:', e);
  }
}

// ========== 이자 계산기 ==========

function calcInterest() {
  try {
    const principal = toNumber($('principal') && $('principal').value);
    const rate      = toNumber($('rate') && $('rate').value);
    const days      = toNumber($('days') && $('days').value);

    if (!principal || !rate || !days) {
      setHTMLSafe('interestResult', `
        <div class="result-title">⚠ 입력 오류</div>
        <div class="result-item">
          <div class="result-label">안내</div>
          <div class="result-value">모든 값을 입력해주세요.</div>
        </div>
      `);
      return;
    }

    const interest = Math.floor(principal * (rate / 100) * (days / 365));
    const total = principal + interest;

    setHTMLSafe('interestResult', `
      <div class="result-title">📌 계산 결과</div>

      <div class="result-item">
        <div class="result-label">이자 금액</div>
        <div class="result-value highlight">${interest.toLocaleString()}원</div>
      </div>

      <div class="result-item">
        <div class="result-label">총 상환액(원금+이자)</div>
        <div class="result-value">${total.toLocaleString()}원</div>
      </div>
    `);
  } catch (e) {
    console.log('calcInterest error:', e);
    setHTMLSafe('interestResult', `
      <div class="result-title">⚠ 오류</div>
      <div class="result-item">
        <div class="result-label">안내</div>
        <div class="result-value">계산 중 오류가 발생했습니다. 입력값을 다시 확인해주세요.</div>
      </div>
    `);
  }
}

function resetInterestInputs() {
  try {
    var inputs = document.querySelectorAll('input[type="number"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].value = '';
    }

    if ($('principal')) $('principal').value = 0;
    if ($('rate'))      $('rate').value = 20;
    if ($('days'))      $('days').value = 1;

    setHTMLSafe('interestResult', '');
  } catch (e) {
    console.log('resetInterestInputs error:', e);
  }
}

// ========== DOM 로드 후 바인딩 ==========

function safeBind(id, event, handler) {
  var el = $(id);
  if (!el) return;
  el.addEventListener(event, handler);
}

window.addEventListener('DOMContentLoaded', function () {
  // 시계
  updateClock();
  setInterval(updateClock, 1000);

  // 배너 슬라이더 (메인에만 있으면 자동으로 거기서만 동작)
  initBannerSlider();

  // 변제금 계산기 버튼 (repay.html에서만 존재)
  safeBind('btnCalcRepay', 'click', calcRepay);
  safeBind('btnResetRepay', 'click', resetRepayInputs);

  // 이자 계산기 버튼 (interest.html에서만 존재)
  safeBind('btnCalcInterest', 'click', calcInterest);
  safeBind('btnResetInterest', 'click', resetInterestInputs);
});

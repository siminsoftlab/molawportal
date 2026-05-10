// ========== 공통 유틸 ==========

// 안전하게 요소 가져오기
function $(id) {
  return document.getElementById(id);
}

// 숫자 변환 (빈 값, NaN 방지)
function toNumber(value) {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

// 결과 영역에 안전하게 HTML 넣기
function setHTMLSafe(id, html) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = html;
}

// ========== 변제금 계산 ==========

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

    // 1) 가용소득 계산
    const disposable = Math.max(income - (living + extra), 0);

    // 2) 가용소득 기준 총 변제액
    const totalByIncome = disposable * months;

    // 3) 청산가치와 비교하여 더 큰 값 선택
    const finalTotal = Math.max(totalByIncome, asset);

    // 4) 최종 월 변제금
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

// ========== 이자 계산 ==========

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

    // 연이자 계산: (원금 × 연이율 × 일수 / 365)
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

// ========== 입력값 리셋 (이자) ==========

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

// ========== 입력값 리셋 (변제금) ==========

function resetInputs() {
  try {
    var inputs = document.querySelectorAll('input[type="number"]');
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      // living은 select라서 여기선 건드리지 않음
      if (input.id !== 'income' &&
          input.id !== 'extra' &&
          input.id !== 'months' &&
          input.id !== 'asset') {
        input.value = '';
      }
    }

    if ($('income'))  $('income').value = 0;
    if ($('extra'))   $('extra').value = 0;
    if ($('months'))  $('months').value = 36;
    if ($('asset'))   $('asset').value = 0;

    // living이 select라면 기본값으로
    var livingEl = $('living');
    if (livingEl && typeof livingEl.selectedIndex === 'number') {
      livingEl.selectedIndex = 0;
    }

    setHTMLSafe('repayResult', '');
  } catch (e) {
    console.log('resetInputs error:', e);
  }
}

// ========== DOM 로드 후 이벤트 바인딩 ==========

function safeBind(id, event, handler) {
  var el = $(id);
  if (!el) return;
  el.addEventListener(event, handler);
}

window.addEventListener('DOMContentLoaded', function () {
  // 버튼에 직접 onclick을 안 쓰고 JS에서 바인딩하면 WebView에서도 더 안정적
  safeBind('btnCalcRepay', 'click', calcRepay);
  safeBind('btnResetRepay', 'click', resetInputs);

  safeBind('btnCalcInterest', 'click', calcInterest);
  safeBind('btnResetInterest', 'click', resetInterestInputs);
});

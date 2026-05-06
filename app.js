
/*
function calcRepay() {
  const income = Number(document.getElementById('income').value);
  const living = Number(document.getElementById('living').value);
  const extra  = Number(document.getElementById('extra').value);
  const months = Number(document.getElementById('months').value);
  const asset  = Number(document.getElementById('asset').value);

  const totalSpend = living + extra;
  let avail = income - totalSpend;
  if (avail < 0) avail = 0;

  let monthly = avail;
  let total = monthly * months;

  if (asset > 0 && total < asset) {
    monthly = Math.ceil(asset / months);
    total = monthly * months;
  }

  document.getElementById('repayResult').innerHTML =
    `<strong>월 변제금:</strong> ${monthly.toLocaleString()}원<br>
     <strong>총 변제액:</strong> ${total.toLocaleString()}원`;
}
*/

function calcRepay() {
  const income = Number(document.getElementById('income').value);
  const living = Number(document.getElementById('living').value);
  const extra  = Number(document.getElementById('extra').value);
  const months = Number(document.getElementById('months').value);
  const asset  = Number(document.getElementById('asset').value);

  // 1) 가용소득 계산
  const disposable = Math.max(income - (living + extra), 0);

  // 2) 가용소득 기준 총 변제액
  const totalByIncome = disposable * months;

  // 3) 청산가치와 비교하여 더 큰 값 선택
  const finalTotal = Math.max(totalByIncome, asset);

  // 4) 최종 월 변제금
  const monthly = Math.ceil(finalTotal / months);

  document.getElementById('repayResult').innerHTML = `
    <div class="result-title">📌 계산 결과</div>

    <div class="result-item">
      <div class="result-label">월 변제금</div>
      <div class="result-value highlight">${monthly.toLocaleString()}원</div>
    </div>

    <div class="result-item">
      <div class="result-label">총 변제액</div>
      <div class="result-value">${finalTotal.toLocaleString()}원</div>
    </div>
  `;
}
/*
function calcInterest() {
  const principal = Number(document.getElementById('principal').value);
  const rate      = Number(document.getElementById('rate').value) / 100;
  const days      = Number(document.getElementById('days').value);

  const years = days / 365;
  const interest = Math.floor(principal * rate * years);
  const total = principal + interest;

  document.getElementById('interestResult').innerHTML =
    `<strong>이자:</strong> ${interest.toLocaleString()}원<br>
     <strong>총액:</strong> ${total.toLocaleString()}원`;
}
*/

function calcInterest() {
  const principal = Number(document.getElementById('principal').value);
  const rate = Number(document.getElementById('rate').value);
  const days = Number(document.getElementById('days').value);

  if (!principal || !rate || !days) {
    document.getElementById('interestResult').innerHTML = `
      <div class="result-title">⚠ 입력 오류</div>
      <div class="result-item">
        <div class="result-label">안내</div>
        <div class="result-value">모든 값을 입력해주세요.</div>
      </div>
    `;
    return;
  }

  // 연이자 계산: (원금 × 연이율 × 일수 / 365)
  const interest = Math.floor(principal * (rate / 100) * (days / 365));
  const total = principal + interest;

  document.getElementById('interestResult').innerHTML = `
    <div class="result-title">📌 계산 결과</div>

    <div class="result-item">
      <div class="result-label">이자 금액</div>
      <div class="result-value highlight">${interest.toLocaleString()}원</div>
    </div>

    <div class="result-item">
      <div class="result-label">총 상환액(원금+이자)</div>
      <div class="result-value">${total.toLocaleString()}원</div>
    </div>
  `;
}

function resetinterestInputs() {
  document.getElementById('principal').value = 0;
  document.getElementById('rate').value = 20;
  document.getElementById('days').value = 1;
  document.getElementById('interestResult').innerHTML = '';
}

function resetInputs() {
  // 모든 입력 요소를 선택
  const inputs = document.querySelectorAll('input[type="number"]:not(#living)');

  // 각 입력값 초기화
  inputs.forEach(input => {
    input.value = ''; // 기본적으로 빈 값으로 초기화
  });

  // 결과창도 초기화
  document.getElementById('repayResult').innerHTML = '';

  // 필요 시 기본값 복원 (예: months, extra, asset)
  document.getElementById('income').value = 0;
  document.getElementById('living').selectedIndex = 0; //dropdown 초기화
  document.getElementById('extra').value = 0;
  document.getElementById('months').value = 36;
  document.getElementById('asset').value = 0;
}

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
function resetInputs() {
  // 모든 입력 요소를 선택
  const inputs = document.querySelectorAll('input[type="number"]');

  // 각 입력값 초기화
  inputs.forEach(input => {
    input.value = ''; // 기본적으로 빈 값으로 초기화
  });

  // 결과창도 초기화
  document.getElementById('repayResult').innerHTML = '';

  // 필요 시 기본값 복원 (예: months, extra, asset)
  document.getElementById('extra').value = 0;
  document.getElementById('months').value = 36;
  document.getElementById('asset').value = 0;
}

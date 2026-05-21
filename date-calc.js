// 날짜 차이 자동 계산 함수
function autoCalculateDays() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  if (!from || !to) return;

  const start = new Date(from);
  const end = new Date(to);

  // 날짜 차이 계산 (일수)
  const diffTime = end - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // 종료일이 시작일보다 빠르면 초기화
  if (diffDays < 0) {
    document.getElementById("days").value = "";
    return;
  }

  document.getElementById("days").value = diffDays;
}

// 이벤트 리스너 등록
window.addEventListener("DOMContentLoaded", () => {
  const fromInput = document.getElementById("fromDate");
  const toInput = document.getElementById("toDate");

  if (fromInput && toInput) {
    fromInput.addEventListener("change", autoCalculateDays);
    toInput.addEventListener("change", autoCalculateDays);
  }
});

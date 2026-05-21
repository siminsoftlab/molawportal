// 날짜 차이 자동 계산 함수 (UTC 기반, -1 오류 완전 해결)
function autoCalculateDays() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  if (!from || !to) return;

  const start = new Date(from);
  const end = new Date(to);

  // 날짜만 비교하도록 UTC 기준 변환
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  // 정확한 날짜 차이 계산
  const diffDays = (utcEnd - utcStart) / (1000 * 60 * 60 * 24);

  // 음수면 잘못된 입력 → 빈칸 처리
  document.getElementById("days").value = diffDays >= 0 ? diffDays : "";
}

// DOM 로드 후 이벤트 연결
window.addEventListener("DOMContentLoaded", () => {
  const fromInput = document.getElementById("fromDate");
  const toInput = document.getElementById("toDate");

  if (fromInput && toInput) {
    fromInput.addEventListener("change", autoCalculateDays);
    toInput.addEventListener("change", autoCalculateDays);
  }
});

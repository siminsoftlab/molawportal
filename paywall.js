/* ============================
   페이월 표시 함수
============================ */
function showPaywall() {
  const accordion = document.getElementById("repayAccordion");
  const overlay = document.getElementById("paywallOverlay");

  // 상세 결과 블러 처리
  accordion.classList.add("paywall-blur");

  // 페이월 표시
  overlay.style.display = "flex";
}

/* ============================
   결제 버튼 클릭 이벤트
============================ */
document.addEventListener("DOMContentLoaded", () => {
  const payBtn = document.querySelector(".pay-btn");
  const consultBtn = document.querySelector(".consult-btn");

  if (payBtn) {
    payBtn.addEventListener("click", () => {
      window.location.href = "/admin/payment.html"; // 결제 페이지로 이동
    });
  }

  if (consultBtn) {
    consultBtn.addEventListener("click", () => {
      window.location.href = "http://pf.kakao.com/_wAqxen/chat"; // 상담 연결
    });
  }
});

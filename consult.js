document.addEventListener("DOMContentLoaded", () => {

  // EmailJS 초기화
  emailjs.init("YOUR_PUBLIC_KEY");

  // 요소 가져오기
  const agree = document.getElementById("agree");
  const submitBtn = document.getElementById("submitBtn");
  const form = document.getElementById("consultForm");

  const privacyModal = document.getElementById("privacyModal");
  const openPrivacyModal = document.getElementById("openPrivacyModal");
  const closeModalBtn = document.querySelector(".close-modal");

  console.log("consult.js loaded", {
    agree,
    submitBtn,
    form,
    privacyModal,
    openPrivacyModal,
    closeModalBtn
  });

  // 체크박스 체크 시 버튼 활성화
  agree.addEventListener("change", () => {
    submitBtn.disabled = !agree.checked;
    submitBtn.classList.toggle("active", agree.checked);
  });

  // [보기] 클릭 → 모달 열기
  openPrivacyModal.addEventListener("click", () => {
    privacyModal.style.display = "block";
  });

  // 닫기 버튼 → 모달 닫기
  closeModalBtn.addEventListener("click", () => {
    privacyModal.style.display = "none";
  });

  // 모달 바깥 클릭 → 닫기
  window.addEventListener("click", (e) => {
    if (e.target === privacyModal) {
      privacyModal.style.display = "none";
    }
  });

  // 폼 제출 이벤트
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!agree.checked) {
      alert("개인정보 수집·이용에 동의해야 상담 신청이 가능합니다.");
      return;
    }

    emailjs.sendForm("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", this)
      .then(() => {
        alert("상담 신청이 접수되었습니다.");
        form.reset();
        submitBtn.disabled = true;
        submitBtn.classList.remove("active");
      })
      .catch(() => {
        alert("전송 중 오류가 발생했습니다.");
      });
  });

});

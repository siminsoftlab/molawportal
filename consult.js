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

  // 요소 확인 로그
  console.log({
    agree,
    submitBtn,
    form,
    privacyModal,
    openPrivacyModal,
    closeModalBtn
  });

  // 요소가 없으면 실행 중단
  if (!agree || !submitBtn || !form || !privacyModal || !openPrivacyModal || !closeModalBtn) {
    console.error("❌ 필수 요소를 찾을 수 없습니다.");
    return;
  }

  // 체크박스 체크 시 버튼 활성화
  agree.addEventListener("change", () => {
    if (agree.checked) {
      submitBtn.disabled = false;
      submitBtn.classList.add("active");
    } else {
      submitBtn.disabled = true;
      submitBtn.classList.remove("active");
    }
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
        alert("상담 신청이 접수되었습니다. 빠르게 연락드리겠습니다.");
        form.reset();
        submitBtn.disabled = true;
        submitBtn.classList.remove("active");
      })
      .catch(() => {
        alert("전송 중 오류가 발생했습니다. 다시 시도해주세요.");
      });
  });

});

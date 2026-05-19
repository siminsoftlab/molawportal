document.addEventListener("DOMContentLoaded", () => {

  emailjs.init("5YL9lX5-PVDgImnkv"); // ← Public Key

  const agree = document.getElementById("agree");
  const submitBtn = document.getElementById("submitBtn");
  const form = document.getElementById("consultForm");

  const privacyModal = document.getElementById("privacyModal");
  const openPrivacyModal = document.getElementById("openPrivacyModal");
  const closeModalBtn = document.querySelector(".close-modal");

  // 체크박스 체크 시 버튼 활성화
  agree.addEventListener("change", () => {
    submitBtn.disabled = !agree.checked;
    submitBtn.classList.toggle("active", agree.checked);
  });

  // 모달 열기
  openPrivacyModal.addEventListener("click", () => {
    privacyModal.style.display = "block";
  });

  // 모달 닫기
  closeModalBtn.addEventListener("click", () => {
    privacyModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === privacyModal) {
      privacyModal.style.display = "none";
    }
  });

  // 폼 제출
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!agree.checked) {
      alert("개인정보 수집·이용에 동의해야 상담 신청이 가능합니다.");
      return;
    }

    emailjs.sendForm("service_wrskjfa", "template_m3qahy8", this) // ← Service ID / Template ID
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

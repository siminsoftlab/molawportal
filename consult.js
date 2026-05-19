document.addEventListener("DOMContentLoaded", () => {

  emailjs.init("5YL9lX5-PVDgImnkv");

  const agree = document.getElementById("agree");
  const submitBtn = document.getElementById("submitBtn");
  const form = document.getElementById("consultForm");

  const privacyModal = document.getElementById("privacyModal");
  const openPrivacyModal = document.getElementById("openPrivacyModal");
  const closeModalBtn = document.querySelector(".close-modal");

  // ✔ 체크박스는 validateForm()만 호출하도록 변경
  agree.addEventListener("change", () => {
    validateForm();
  });

  openPrivacyModal.addEventListener("click", () => {
    privacyModal.style.display = "block";
  });

  closeModalBtn.addEventListener("click", () => {
    privacyModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === privacyModal) {
      privacyModal.style.display = "none";
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!agree.checked) {
      alert("개인정보 수집·이용에 동의해야 상담 신청이 가능합니다.");
      return;
    }

    emailjs.sendForm("service_wrskjfa", "template_m3qahy8", this)
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

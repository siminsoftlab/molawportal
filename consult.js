document.addEventListener("DOMContentLoaded", () => {

  emailjs.init("5YL9lX5-PVDgImnkv");

  const form = document.getElementById("consultForm");
  const submitBtn = document.getElementById("submitBtn");

  const nameInput = form.elements["name"];
  const phoneInput = form.elements["phone"];
  const emailInput = form.elements["email"];
  const messageInput = document.getElementById("message");

  // 에러 표시 함수
  function setError(input, errorId, message) {
    document.getElementById(errorId).textContent = message;
    input.style.border = "1px solid red";
  }

  function clearError(input, errorId) {
    document.getElementById(errorId).textContent = "";
    input.style.border = "1px solid #ddd";
  }

  // 제출 시 검증
  function validateForm() {
    let valid = true;

    // 이름
    if (nameInput.value.trim().length < 2) {
      setError(nameInput, "nameError", "이름은 2글자 이상 입력해주세요.");
      valid = false;
    } else {
      clearError(nameInput, "nameError");
    }

    // 연락처
    const phoneDigits = phoneInput.value.replace(/[^0-9]/g, "");
    if (!/^010\d{8}$/.test(phoneDigits)) {
      setError(phoneInput, "phoneError", "연락처는 010으로 시작하는 숫자 11자리여야 합니다.");
      valid = false;
    } else {
      clearError(phoneInput, "phoneError");
    }

    // 이메일
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
    if (!emailValid) {
      setError(emailInput, "emailError", "올바른 이메일 형식이 아닙니다.");
      valid = false;
    } else {
      clearError(emailInput, "emailError");
    }

    // 상담 내용
    if (messageInput.value.trim().length === 0) {
      setError(messageInput, "messageError", "상담 내용을 입력해주세요.");
      valid = false;
    } else {
      clearError(messageInput, "messageError");
    }

    return valid;
  }

  // 제출 이벤트
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!validateForm()) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    // 이메일 전송
    emailjs.sendForm("service_wrskjfa", "template_m3qahy8", this)
      .then(() => {
        alert("상담 신청이 접수되었습니다. 빠르게 연락드리겠습니다.");
        form.reset();
      })
      .catch(() => {
        alert("전송 중 오류가 발생했습니다. 다시 시도해주세요.");
      });
  });

});

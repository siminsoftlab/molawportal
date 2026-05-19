document.addEventListener("DOMContentLoaded", () => {

  emailjs.init("5YL9lX5-PVDgImnkv"); // Public Key

  const form = document.getElementById("consultForm");

  const nameInput = form.elements["name"];
  const phoneInput = form.elements["phone"];
  const emailInput = form.elements["email"];
  const typeInput = form.elements["type"];
  const messageInput = document.getElementById("message");
  const agree = document.getElementById("agree");

  function setError(input, errorId, message) {
    document.getElementById(errorId).textContent = message;
    input.style.border = "1px solid red";
  }

  function clearError(input, errorId) {
    document.getElementById(errorId).textContent = "";
    input.style.border = "1px solid #ddd";
  }

  function setAgreeError(message) {
    document.getElementById("agreeError").textContent = message;
  }

  function clearAgreeError() {
    document.getElementById("agreeError").textContent = "";
  }

  function validateForm() {
    let valid = true;

    if (nameInput.value.trim().length < 2) {
      setError(nameInput, "nameError", "이름은 2글자 이상 입력해주세요.");
      valid = false;
    } else {
      clearError(nameInput, "nameError");
    }

    const phoneDigits = phoneInput.value.replace(/[^0-9]/g, "");
    if (!/^010\d{8}$/.test(phoneDigits)) {
      setError(phoneInput, "phoneError", "연락처는 010으로 시작하는 숫자 11자리여야 합니다.");
      valid = false;
    } else {
      clearError(phoneInput, "phoneError");
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
    if (!emailValid) {
      setError(emailInput, "emailError", "올바른 이메일 형식이 아닙니다.");
      valid = false;
    } else {
      clearError(emailInput, "emailError");
    }

    if (messageInput.value.trim().length === 0) {
      setError(messageInput, "messageError", "상담 내용을 입력해주세요.");
      valid = false;
    } else {
      clearError(messageInput, "messageError");
    }

    if (!agree.checked) {
      setAgreeError("개인정보 수집·이용에 동의해야 합니다.");
      valid = false;
    } else {
      clearAgreeError();
    }

    return valid;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!validateForm()) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    const params = {
      name: nameInput.value,
      phone: phoneInput.value,
      email: emailInput.value,
      type: typeInput.value,
      message: messageInput.value
    };

    emailjs.send("service_wrskjfa", "template_m3qahy8", params)
      .then(() => {
        alert("상담 신청이 접수되었습니다. 빠르게 연락드리겠습니다.");
        form.reset();
      })
      .catch(() => {
        alert("전송 중 오류가 발생했습니다. 관리자에게 문의해주세요.");
      });
  });

});

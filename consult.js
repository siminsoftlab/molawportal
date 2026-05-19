//console.log("consult.js loaded");

document.addEventListener("DOMContentLoaded", () => {

  emailjs.init("5YL9lX5-PVDgImnkv");

  const form = document.getElementById("consultForm");
  const submitBtn = document.getElementById("submitBtn");
  const agree = document.getElementById("agree");

  const nameInput = form.elements["name"];
  const phoneInput = form.elements["phone"];
  const emailInput = form.elements["email"];
  const messageInput = document.getElementById("message");
  const messageCount = document.getElementById("messageCount");

  const MAX_LENGTH = 300;

  // 테두리 색상 표시
  function markValidation(input, isValid) {
    if (input.value.trim() === "") {
      input.style.border = "1px solid #ccc";
      return;
    }
    input.style.border = isValid ? "1px solid #28a745" : "1px solid red";
  }

  function showError(id, message) {
    document.getElementById(id).textContent = message;
  }

  function clearError(id) {
    document.getElementById(id).textContent = "";
  }

  // 연락처 자동 하이픈
  phoneInput.addEventListener("input", () => {
    let value = phoneInput.value.replace(/[^0-9]/g, "");
    if (value.length > 11) value = value.substring(0, 11);

    if (value.length < 4) {
      phoneInput.value = value;
    } else if (value.length < 8) {
      phoneInput.value = value.replace(/(\d{3})(\d{1,4})/, "$1-$2");
    } else {
      phoneInput.value = value.replace(/(\d{3})(\d{4})(\d{1,4})/, "$1-$2-$3");
    }
  });

  // 상담 내용 글자 수 카운터
  messageInput.addEventListener("input", () => {
    if (messageInput.value.length > MAX_LENGTH) {
      messageInput.value = messageInput.value.substring(0, MAX_LENGTH);
    }
    messageCount.textContent = `${messageInput.value.length} / ${MAX_LENGTH}자`;
  });

  // ⭐ 제출 시 검증하는 방식
  function validateForm() {
    const nameValid = nameInput.value.trim().length >= 2;
    const phoneDigits = phoneInput.value.replace(/[^0-9]/g, "");
    const phoneValid = /^010\d{8}$/.test(phoneDigits);
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
    const messageValid = messageInput.value.trim().length > 0;
    const agreeChecked = agree.checked;

    // 이름
    if (!nameValid) {
      showError("nameError", "이름은 2글자 이상 입력해주세요.");
      markValidation(nameInput, false);
    } else {
      clearError("nameError");
      markValidation(nameInput, true);
    }

    // 연락처
    if (!phoneValid) {
      showError("phoneError", "연락처는 010으로 시작하는 숫자 11자리여야 합니다.");
      markValidation(phoneInput, false);
    } else {
      clearError("phoneError");
      markValidation(phoneInput, true);
    }

    // 이메일
    if (!emailValid) {
      showError("emailError", "올바른 이메일 형식이 아닙니다.");
      markValidation(emailInput, false);
    } else {
      clearError("emailError");
      markValidation(emailInput, true);
    }

    // 상담 내용
    if (!messageValid) {
      showError("messageError", "상담 내용을 입력해주세요.");
      markValidation(messageInput, false);
    } else {
      clearError("messageError");
      markValidation(messageInput, true);
    }

    // 체크박스
    if (!agreeChecked) {
      alert("개인정보 수집·이용에 동의해야 상담 신청이 가능합니다.");
      return false;
    }

    // 모든 항목 통과
    return nameValid && phoneValid && emailValid && messageValid && agreeChecked;
  }

  // 제출 시 실행
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

//console.log("validateForm 존재 여부:", typeof validateForm);

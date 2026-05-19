// 요소 선택
const form = document.getElementById("consultForm");
const submitBtn = document.getElementById("submitBtn");
const agree = document.getElementById("agree");

const nameInput = form.elements["name"];
const phoneInput = form.elements["phone"];
const emailInput = form.elements["email"];
const typeSelect = form.elements["type"];
const messageInput = document.getElementById("message");
const messageCount = document.getElementById("messageCount");

const MAX_LENGTH = 300;

// 테두리 색상 표시
function markValidation(input, isValid) {
  if (input.value.trim() === "") {
    input.style.border = "1px solid #ccc";
    return;
  }

  if (isValid) {
    input.style.border = "1px solid #28a745"; // 초록색
  } else {
    input.style.border = "1px solid red"; // 빨간색
  }
}

// 오류 메시지 표시
function showError(id, message) {
  document.getElementById(id).textContent = message;
}

function clearError(id) {
  document.getElementById(id).textContent = "";
}

// 연락처 자동 하이픈
phoneInput.addEventListener("input", () => {
  let value = phoneInput.value.replace(/[^0-9]/g, "");

  if (value.length < 4) {
    phoneInput.value = value;
  } else if (value.length < 8) {
    phoneInput.value = value.replace(/(\d{3})(\d{1,4})/, "$1-$2");
  } else {
    phoneInput.value = value.replace(/(\d{3})(\d{4})(\d{1,4})/, "$1-$2-$3");
  }

  validateForm();
});

// 상담 내용 글자 수 카운터
messageInput.addEventListener("input", () => {
  const length = messageInput.value.length;

  if (length > MAX_LENGTH) {
    messageInput.value = messageInput.value.substring(0, MAX_LENGTH);
  }

  messageCount.textContent = `${messageInput.value.length} / ${MAX_LENGTH}자`;
});

// 전체 유효성 검사
function validateForm() {
  const nameValid = nameInput.value.trim().length >= 2;
  const phoneValid = phoneInput.value.replace(/[^0-9]/g, "").length >= 10;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
  const agreeChecked = agree.checked;

  // 이름
  if (!nameValid && nameInput.value.trim() !== "") {
    showError("nameError", "이름은 2글자 이상 입력해주세요.");
    markValidation(nameInput, false);
  } else {
    clearError("nameError");
    markValidation(nameInput, nameValid);
  }

  // 연락처
  if (!phoneValid && phoneInput.value.trim() !== "") {
    showError("phoneError", "올바른 연락처를 입력해주세요.");
    markValidation(phoneInput, false);
  } else {
    clearError("phoneError");
    markValidation(phoneInput, phoneValid);
  }

  // 이메일
  if (!emailValid && emailInput.value.trim() !== "") {
    showError("emailError", "올바른 이메일 형식이 아닙니다.");
    markValidation(emailInput, false);
  } else {
    clearError("emailError");
    markValidation(emailInput, emailValid);
  }

  submitBtn.disabled = !(nameValid && phoneValid && emailValid && agreeChecked);
}

// 입력 이벤트 등록
[nameInput, phoneInput, emailInput, typeSelect, agree].forEach(el => {
  el.addEventListener("input", validateForm);
  el.addEventListener("change", validateForm);
});

// 제출 시 최종 체크
form.addEventListener("submit", function (e) {
  if (submitBtn.disabled) {
    e.preventDefault();
    alert("입력값을 다시 확인해주세요.");
  }
});

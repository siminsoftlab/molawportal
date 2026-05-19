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

  input.style.border = isValid
    ? "1px solid #28a745"
    : "1px solid red";
}

// 오류 메시지 표시
function showError(id, message) {
  document.getElementById(id).textContent = message;
}

function clearError(id) {
  document.getElementById(id).textContent = "";
}

// 연락처 자동 하이픈 + 숫자만 입력 + 최대 11자리 제한
phoneInput.addEventListener("input", () => {
  let value = phoneInput.value.replace(/[^0-9]/g, "");

  // 최대 11자리 제한
  if (value.length > 11) {
    value = value.substring(0, 11);
  }

  // 하이픈 자동 삽입
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
  validateForm();
});

// 전체 유효성 검사
function validateForm() {
  const nameValid = nameInput.value.trim().length >= 2;

  // 연락처는 정확히 010 + 8자리 = 11자리
  const phoneDigits = phoneInput.value.replace(/[^0-9]/g, "");
  const phoneValid = /^010\d{8}$/.test(phoneDigits);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());

  // 상담 내용은 공백 포함 모든 whitespace 제거 후 검사
  const messageValid = messageInput.value.replace(/\s/g, "").length > 0;

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
    showError("phoneError", "연락처는 010으로 시작하는 숫자 11자리여야 합니다.");
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

  // 상담 내용
  if (!messageValid && messageInput.value.trim() !== "") {
    showError("messageError", "상담 내용을 입력해주세요.");
    markValidation(messageInput, false);
  } else {
    clearError("messageError");
    markValidation(messageInput, messageValid);
  }

  //

import { auth } from "/firebase-init.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

export function initSidebarLogin() {
  const loginBtn = document.getElementById("login-btn-sidebar");
  const emailInput = document.getElementById("login-email");
  const pwInput = document.getElementById("login-password");
  const statusBox = document.getElementById("login-status");

  if (!loginBtn || !emailInput || !pwInput || !statusBox) return;

  // 🔵 비밀번호 박스에서 Enter 키로 로그인 실행
  pwInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      loginBtn.click();
    }
  });

  // 🔵 로그인 버튼 클릭
  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const pw = pwInput.value.trim();

    if (!email || !pw) {
      statusBox.textContent = "이메일과 비밀번호를 입력하세요.";
      statusBox.style.color = "red";
      return;
    }

    try {
      statusBox.textContent = "로그인 중...";
      statusBox.style.color = "#666";

      await signInWithEmailAndPassword(auth, email, pw);

      statusBox.textContent = "로그인 성공!";
      statusBox.style.color = "#4a6fff";

      // 🔵 성공 후 메시지 자동 초기화
      setTimeout(() => {
        statusBox.textContent = "";
      }, 1200);

      window.location.href = "/main.html";

    } catch (err) {
      console.error(err);

      let message = "로그인 실패: ";

      switch (err.code) {
        case "auth/wrong-password":
        case "auth/invalid-login-credentials":
          message += "이메일 또는 비밀번호가 잘못되었습니다.";
          break;
        case "auth/user-not-found":
          message += "등록되지 않은 이메일입니다.";
          break;
        case "auth/invalid-email":
          message += "올바른 이메일 형식이 아닙니다.";
          break;
        default:
          message += "오류가 발생했습니다.";
      }

      statusBox.textContent = message;
      statusBox.style.color = "red";
    }
  });
}

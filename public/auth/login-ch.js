// login-ch.js — 사이드바 로그인 전용 안정화 버전
import { auth } from "/firebase-init.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

/**
 * 사이드바 로그인 초기화
 * side.html이 DOM에 로드된 후 실행해야 정상 작동함
 */
export function initSidebarLogin() {
  const loginBtn = document.getElementById("login-btn-sidebar");
  if (!loginBtn) return; // 버튼이 없으면 종료

  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("login-email")?.value.trim();
    const pw = document.getElementById("login-password")?.value.trim();

    if (!email || !pw) {
      alert("이메일과 비밀번호를 입력하세요.");
      return;
    }

    try {
      // Firebase 로그인
      await signInWithEmailAndPassword(auth, email, pw);

      // 로그인 성공 → main.html로 이동
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
          message += "오류가 발생했습니다. 다시 시도해주세요.";
      }

      alert(message);
    }
  });
}

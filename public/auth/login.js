import { auth, db } from "/firebase-init.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  if (!email || !password) {
    msg.textContent = "이메일과 비밀번호를 입력해주세요.";
    return;
  }

  try {
    msg.textContent = "로그인 중...";

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    msg.textContent = "로그인 성공!";

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    setTimeout(() => {
      window.location.href = "/index.html";
    }, 1000);

  } catch (error) {
    console.error(error);
    let message = "";

    switch (error.code) {
      case "auth/wrong-password":
      case "auth/invalid-login-credentials":
        message = "이메일 또는 비밀번호가 잘못되었습니다.";
        break;

      case "auth/user-not-found":
        message = "등록되지 않은 이메일입니다.";
        break;

      case "auth/invalid-email":
        message = "올바른 이메일 형식이 아닙니다.";
        break;

      default:
        message = "로그인 중 오류가 발생했습니다.";
    }

    msg.textContent = message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (btn) btn.addEventListener("click", login);
});

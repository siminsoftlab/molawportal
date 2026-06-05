/* ============================================================
   Firebase 초기화
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyACfN4_r2hUAn1NQPWRZzpegjyIESYGK3I",
  authDomain: "molawcounter.firebaseapp.com",
  projectId: "molawcounter",
  storageBucket: "molawcounter.firebasestorage.app",
  messagingSenderId: "989958208701",
  appId: "1:989958208701:web:16bd53eed95276f5d4cbd4",
  measurementId: "G-D4W34NBWKT"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ============================================================
   로그인 처리
============================================================ */
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

    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    msg.textContent = "로그인 성공!";

    // Firestore에서 사용자 정보 가져오기
    const userDoc = await db.collection("users").doc(user.uid).get();

    // 로그인 후 메인 페이지로 이동
    setTimeout(() => {
      window.location.href = "/index.html";
    }, 1000);

  } catch (error) {
     let message = "";
   
      switch (error.code) {
      case "auth/wrong-password":
        message = "비밀번호가 일치하지 않습니다.";
        break;

      case "auth/invalid-credential":   // 🔥 Firebase 실제 반환 코드
        message = "비밀번호가 일치하지 않습니다.";
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

/* ============================================================
   이벤트 바인딩
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (btn) {
    btn.addEventListener("click", login);
  }
});

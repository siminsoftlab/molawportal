import { auth, db } from "/firebase-init.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const pw = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("error");

  errorBox.textContent = "";

  try {
    const result = await signInWithEmailAndPassword(auth, email, pw);
    const user = result.user;

    // 🔥 역할(role) 확인
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      errorBox.textContent = "권한 정보가 없습니다.";
      return;
    }

    const role = snap.data().role;

    if (role === "admin" || role === "manager") {
      // ⭐ 매니저/관리자만 접근 허용
      location.href = "/manager/dashboard.html";
    } else {
      errorBox.textContent = "접근 권한이 없습니다.";
    }

  } catch (err) {
    errorBox.textContent = "로그인 실패: " + err.message;
  }
});

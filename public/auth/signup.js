// firebase-init.js에서 auth, db 가져오기
import { auth, db } from "/firebase-init.js";

// Firebase v9 모듈 import
import { 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import { 
  doc, setDoc 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ============================================================
   웰컴쿠폰 7일 이용권 발급
============================================================ */
async function issueWelcomeCoupon(userId) {
  const now = Date.now();
  const expire = now + (7 * 24 * 60 * 60 * 1000);
  const token = crypto.randomUUID();

  await setDoc(doc(db, "access_tokens", token), {
    user_id: userId,
    token: token,
    type: "WELCOME_7D",
    created_at: now,
    expire_at: expire,
    is_active: true
  });

  return token;
}

/* ============================================================
   회원가입 처리
============================================================ */
async function signup() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value.trim();
  const passwordConfirm = document.getElementById("signup-password-confirm").value.trim();
  const msg = document.getElementById("msg");
  const agreeTerms = document.getElementById("agreeTerms").checked;
  const agreePrivacy = document.getElementById("agreePrivacy").checked;

  if (!name) return msg.textContent = "이름을 입력해주세요.";
  if (!email) return msg.textContent = "이메일을 입력해주세요.";
  if (!phone) return msg.textContent = "휴대전화번호를 입력해주세요.";
  if (!password) return msg.textContent = "비밀번호를 입력해주세요.";
  if (password.length < 6) return msg.textContent = "비밀번호는 6자리 이상이어야 합니다.";
  if (!passwordConfirm) return msg.textContent = "비밀번호 확인을 입력해주세요.";
  if (password !== passwordConfirm) return msg.textContent = "비밀번호가 일치하지 않습니다.";
  if (!agreeTerms) return msg.textContent = "이용약관에 동의해야 회원가입이 가능합니다.";
  if (!agreePrivacy) return msg.textContent = "개인정보 제3자 제공에 동의해야 회원가입이 가능합니다.";

  try {
    msg.textContent = "회원가입 중...";

    // Firebase Auth v9 문법
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Firestore v9 문법
    await setDoc(doc(db, "users", user.uid), {
      email,
      name,
      phone,
      welcome_coupon_used: true,
      created_at: Date.now()
    });

    const token = await issueWelcomeCoupon(user.uid);

    msg.textContent = "회원가입 완료! 7일 이용권이 발급되었습니다.";

    setTimeout(() => {
      window.location.href = "/index.html";
    }, 1500);

  } catch (error) {
    console.error(error);
    msg.textContent = "오류: " + error.message;
  }
}

/* ============================================================
   이벤트 바인딩
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("signupBtn");
  if (btn) btn.addEventListener("click", signup);
});

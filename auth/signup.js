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
   웰컴쿠폰 30일 이용권 발급
============================================================ */
async function issueWelcomeCoupon(userId) {
  const now = Date.now();
  const expire = now + (30 * 24 * 60 * 60 * 1000); // 30일
  const token = crypto.randomUUID();

  await db.collection("access_tokens").doc(token).set({
    user_id: userId,
    token: token,
    type: "WELCOME_30D",
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
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  if (!name || !email || !password) {
    msg.textContent = "모든 항목을 입력해주세요.";
    return;
  }

  try {
    msg.textContent = "회원가입 중...";

    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await db.collection("users").doc(user.uid).set({
      email,
      name,
      welcome_coupon_used: true,
      created_at: Date.now()
    });

    const token = await issueWelcomeCoupon(user.uid);

    msg.textContent = "회원가입 완료! 30일 이용권이 발급되었습니다.";

    setTimeout(() => {
      window.location.href = `/calculators/repay.html?token=${token}`;
    }, 1500);

  } catch (error) {
    msg.textContent = "오류: " + error.message;
  }
}

/* ============================================================
   이벤트 바인딩
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("signupBtn");
  if (btn) {
    btn.addEventListener("click", signup);
  }
});

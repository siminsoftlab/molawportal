/* ============================================================
   Firebase 인스턴스 사용 (초기화는 signup.html에서 수행)
============================================================ */
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
  const passwordConfirm = document.getElementById("signup-password-confirm").value.trim();
  const msg = document.getElementById("msg");
  const agreeTerms = document.getElementById("agreeTerms").checked;
  const agreePrivacy = document.getElementById("agreePrivacy").checked;

  /* ⭐ 이름 체크 */
  if (!name) {
    msg.textContent = "이름을 입력해주세요.";
    return;
  }

  /* ⭐ 이메일 체크 */
  if (!email) {
    msg.textContent = "이메일을 입력해주세요.";
    return;
  }

  /* ⭐ 비밀번호 체크 */
  if (!password) {
    msg.textContent = "비밀번호를 입력해주세요.";
    return;
  }

  /* ⭐ 비밀번호 6자리 이상 체크 */
  if (password.length < 6) {
    msg.textContent = "비밀번호는 6자리 이상이어야 합니다.";
    return;
  }

  /* ⭐ 비밀번호 확인 체크 */
  if (!passwordConfirm) {
    msg.textContent = "비밀번호 확인을 입력해주세요.";
    return;
  }

  /* ⭐ 비밀번호 일치 체크 */
  if (password !== passwordConfirm) {
    msg.textContent = "비밀번호가 일치하지 않습니다.";
    return;
  }

  /* ⭐ 이용약관 동의 체크 */
  if (!agreeTerms) {
    msg.textContent = "이용약관에 동의해야 회원가입이 가능합니다.";
    return;
  }

  /* ⭐ 개인정보 제3자 제공 동의 체크 */
  if (!agreePrivacy) {
    msg.textContent = "개인정보 제3자 제공에 동의해야 회원가입이 가능합니다.";
    return;
  }

  /* ⭐ 모든 조건 통과 → 회원가입 진행 */
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
      window.location.href = `/index.html`;
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

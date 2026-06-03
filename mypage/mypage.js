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
   남은 일수 계산
============================================================ */
function getRemainingDays(expireAt) {
  const now = Date.now();
  const diff = expireAt - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ============================================================
   이용권 정보 불러오기
============================================================ */
async function loadTicket(userId) {
  const ticketBox = document.getElementById("ticketBox");

  const snap = await db.collection("access_tokens")
    .where("user_id", "==", userId)
    .where("is_active", "==", true)
    .get();

  if (snap.empty) {
    ticketBox.innerHTML = `
      <p>현재 활성화된 이용권이 없습니다.</p>
      <p><a href="/payment.html">이용권 구매하기</a></p>
    `;
    return;
  }

  // 여러 개의 이용권이 있을 경우 가장 늦게 만료되는 것 선택
  let best = null;

  snap.forEach(doc => {
    const data = doc.data();
    if (!best || data.expire_at > best.expire_at) {
      best = data;
    }
  });

  const remaining = getRemainingDays(best.expire_at);

  if (remaining <= 0) {
    ticketBox.innerHTML = `
      <p>이용권이 만료되었습니다.</p>
      <p><a href="/payment.html">새 이용권 구매하기</a></p>
    `;
    return;
  }

  const expireDate = new Date(best.expire_at).toLocaleDateString("ko-KR");

  ticketBox.innerHTML = `
    <p><strong>유형:</strong> ${best.type}</p>
    <p><strong>만료일:</strong> ${expireDate}</p>
    <p><strong>남은 기간:</strong> ${remaining}일</p>
  `;
}

/* ============================================================
   로그인된 사용자 정보 불러오기
============================================================ */
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "/auth/login.html";
    return;
  }

  const userDoc = await db.collection("users").doc(user.uid).get();
  const data = userDoc.data();

  document.getElementById("userName").textContent = data.name;
  document.getElementById("userEmail").textContent = data.email;

  loadTicket(user.uid);
});

/* ============================================================
   로그아웃
============================================================ */
document.getElementById("logoutBtn").addEventListener("click", () => {
  auth.signOut().then(() => {
    window.location.href = "/auth/login.html";
  });
});
async function checkExpireAlert(userId) {
  const snap = await db.collection("access_tokens")
    .where("user_id", "==", userId)
    .where("is_active", "==", true)
    .get();

  if (snap.empty) return;

  let best = null;
  snap.forEach(doc => {
    const data = doc.data();
    if (!best || data.expire_at > best.expire_at) {
      best = data;
    }
  });

  const now = Date.now();
  const diffDays = Math.ceil((best.expire_at - now) / (1000 * 60 * 60 * 24));

  if (diffDays === 3) {
    showExpireBanner(diffDays);
  }
}

function showExpireBanner(days) {
  const box = document.createElement("div");
  box.className = "expire-banner";
  box.innerHTML = `
    <p>📢 이용권 만료까지 <strong>${days}일</strong> 남았습니다.</p>
    <a href="/payment.html">지금 연장하기</a>
  `;
  document.body.prepend(box);
}

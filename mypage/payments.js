/* ============================================================
   Firebase 초기화

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
============================================================ */
/* ============================================================
   결제내역 불러오기
============================================================ */
async function loadPayments(userId) {
  const list = document.getElementById("paymentList");

  const snap = await db.collection("payments")
    .where("user_id", "==", userId)
    .orderBy("created_at", "desc")
    .get();

  if (snap.empty) {
    list.innerHTML = `
      <p>결제내역이 없습니다.</p>
      <p><a href="/payment.html">이용권 구매하기</a></p>
    `;
    return;
  }

  let html = "";

  snap.forEach(doc => {
    const p = doc.data();

    const created = new Date(p.created_at).toLocaleString("ko-KR");
    const confirmed = p.confirmed_at
      ? new Date(p.confirmed_at).toLocaleString("ko-KR")
      : "-";

    html += `
      <div class="payment-item">
        <p><strong>결제방법:</strong> ${p.method}</p>
        <p><strong>금액:</strong> ${p.amount.toLocaleString()}원</p>
        <p><strong>입금자명:</strong> ${p.depositor_name}</p>
        <p><strong>상태:</strong> <span class="status ${p.status}">${p.status}</span></p>
        <p><strong>신청일:</strong> ${created}</p>
        <p><strong>확인일:</strong> ${confirmed}</p>
      </div>
    `;
  });

  list.innerHTML = html;
}

/* ============================================================
   로그인 확인 후 결제내역 로딩
============================================================ */
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "/auth/login.html";
    return;
  }

  loadPayments(user.uid);
});

/* ============================================================
   뒤로가기 버튼
============================================================ */
document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "/mypage/mypage.html";
});

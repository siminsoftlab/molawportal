// firebase-init.js에서 이미 auth, db 생성됨
// 여기서는 추가 선언 필요 없음

/* ============================================================
   결제내역 불러오기
============================================================ */
async function loadPayments(userId) {
  const list = document.getElementById("paymentList");

  try {
    const snap = await db.collection("payments")
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc")
      .get();

    if (snap.empty) {
      list.innerHTML = `
        <p>결제내역이 없습니다.</p>
        <p><a href="/mypage/payments.html">이용권 결제 신청</a></p>
      `;
      return;
    }

    let html = "";

    snap.forEach(doc => {
      const p = doc.data();

      const created = p.created_at
        ? new Date(p.created_at).toLocaleString("ko-KR")
        : "-";

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

  } catch (error) {
    console.error("결제내역 불러오기 오류:", error);
    list.innerHTML = `<p>결제내역을 불러오는 중 오류가 발생했습니다.</p>`;
  }
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

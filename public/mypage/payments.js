// firebase-init.js에서 auth, db 가져오기
import { auth, db } from "/firebase-init.js";

// Firebase v9 모듈 import
import { 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import { 
  collection, addDoc, query, where, orderBy, getDocs 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ============================================================
   금액 계산 함수
============================================================ */
function calculatePrice(months) {
  const base = months * 30000;
  let discount = 0;

  if (months === 3) discount = 0.10;
  else if (months === 6) discount = 0.15;
  else if (months === 12) discount = 0.30;
  else if (months === 24) discount = 0.40;
  else if (months === 36) discount = 0.50;

  return Math.round(base * (1 - discount));
}

/* ============================================================
   금액 자동 업데이트
============================================================ */
const ticketSelect = document.getElementById("ticket");
const amountInput = document.getElementById("amount");

if (ticketSelect && amountInput) {
  function updateAmount() {
    const months = Number(ticketSelect.value);
    amountInput.value = calculatePrice(months);
  }

  updateAmount();
  ticketSelect.addEventListener("change", updateAmount);
}

/* ============================================================
   결제 신청 생성
============================================================ */
async function createPayment(user) {
  const method = document.getElementById("method").value;
  const amount = Number(amountInput.value);
  const depositor = document.getElementById("depositor").value.trim();
  const msg = document.getElementById("msg");

  if (!depositor) {
    msg.textContent = "입금자명을 입력해주세요.";
    return;
  }

  try {
    await addDoc(collection(db, "payments"), {
      user_id: user.uid,
      method,
      amount,
      depositor_name: depositor,
      status: "pending",
      created_at: Date.now(),
      confirmed_at: null
    });

    msg.textContent = "결제 신청이 완료되었습니다. 관리자 확인 후 이용권이 활성화됩니다.";

  } catch (e) {
    msg.textContent = "오류: " + e.message;
  }
}

/* ============================================================
   결제내역 불러오기
============================================================ */
async function loadPayments(userId) {
  const list = document.getElementById("paymentList");
  if (!list) return; // 결제 신청 페이지에서는 없음

  try {
    const q = query(
      collection(db, "payments"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = `
        <p>결제내역이 없습니다.</p>
        <p><a href="/mypage/payments.html">이용권 결제 신청</a></p>
      `;
      return;
    }

    let html = "";

    snap.forEach(docSnap => {
      const p = docSnap.data();

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
   로그인 확인 후 기능 실행
============================================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/auth/login.html";
    return;
  }

  // 결제 신청 버튼이 있는 경우
  const payBtn = document.getElementById("payBtn");
  if (payBtn) {
    payBtn.addEventListener("click", () => createPayment(user));
  }

  // 결제내역 페이지인 경우
  loadPayments(user.uid);
});

/* ============================================================
   뒤로가기 버튼
============================================================ */
const backBtn = document.getElementById("backBtn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "/mypage/mypage.html";
  });
}

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
   🔥 무통장입금 선택 시 계좌번호 표시
============================================================ */
const methodSelect = document.getElementById("method");
const bankInfo = document.getElementById("bankInfo");

if (methodSelect && bankInfo) {
  methodSelect.addEventListener("change", () => {
    if (methodSelect.value === "무통장입금") {
      bankInfo.style.display = "block";
    } else {
      bankInfo.style.display = "none";
    }
  });
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

  // 🔥 ticketSelect가 존재하는 페이지에서만 값 가져오기
  let periodMonths = null;
  const ticketSelect = document.getElementById("ticket");
  if (ticketSelect) {
    periodMonths = Number(ticketSelect.value);
  }

  try {
  await addDoc(collection(db, "payments"), {
    user_id: user.uid,
    method,
    amount,
    depositor_name: depositor,
    ...(periodMonths !== null ? { period_months: periodMonths } : {}),
    status: "pending",
    created_at: Date.now(),
    confirmed_at: null
  });

  msg.textContent = "결제 신청이 완료되었습니다. 관리자 확인 후 이용권이 활성화됩니다.";

    /* 🔥 무통장입금일 경우 계좌번호 안내 */
    if (method === "무통장입금") {
      alert(
        "입금 계좌번호 안내\n\n" +
        "은행: 국민은행\n" +
        "계좌번호: 123456-78-987654\n" +
        "예금주: 송영욱\n\n" +
        "입금 후 관리자 확인까지 시간이 소요될 수 있습니다."
      );
    }
  
  } catch (e) {
    console.error("결제 생성 오류:", e);
    msg.textContent = "오류: " + e.message;
  }
}

/* ============================================================
   결제내역 불러오기
============================================================ */
async function loadPayments(userId) {
   const list = document.getElementById("paymentList");
  if (!list) return;

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

    for (const docSnap of snap.docs) {
      const p = docSnap.data();

      const created = p.created_at
        ? new Date(p.created_at).toLocaleString("ko-KR")
        : "-";

      const confirmed = p.confirmed_at
        ? new Date(p.confirmed_at).toLocaleString("ko-KR")
        : "-";

      /* ============================
         🔍 해당 결제의 토큰 조회
      ============================ */
      let tokenInfo = "발급되지 않음";

      if (p.status === "CONFIRMED") {
        const tokenQ = query(
          collection(db, "access_tokens"),
          where("user_id", "==", userId),
          where("created_at", ">=", p.confirmed_at - 2000), // 2초 오차 허용
          where("created_at", "<=", p.confirmed_at + 2000)
        );

        const tokenSnap = await getDocs(tokenQ);

        if (!tokenSnap.empty) {
          const t = tokenSnap.docs[0].data();
          tokenInfo = `
            <div class="token-box">
              <p><strong>토큰:</strong> ${t.token}</p>
              <p><strong>유형:</strong> ${t.type}</p>
              <p><strong>만료일:</strong> ${new Date(t.expire_at).toLocaleDateString("ko-KR")}</p>
            </div>
          `;
        }
      }

      html += `
        <div class="payment-item">
          <p><strong>결제방법:</strong> ${p.method}</p>
          <p><strong>이용권 종류:</strong> ${p.period_months}개월</p>
          <p><strong>금액:</strong> ${p.amount.toLocaleString()}원</p>
          <p><strong>입금자명:</strong> ${p.depositor_name}</p>
          <p><strong>상태:</strong> <span class="status ${p.status}">${p.status}</span></p>
          <p><strong>신청일:</strong> ${created}</p>
          <p><strong>확인일:</strong> ${confirmed}</p>

          <div class="token-info">
            <h4>🔑 이용권 토큰 정보</h4>
            ${tokenInfo}
          </div>
        </div>
      `;
    }

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

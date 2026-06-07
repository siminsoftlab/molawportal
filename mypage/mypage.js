/* ============================================================
   남은 일수 계산
============================================================ */
function getRemainingDays(expireAt) {
  const now = Date.now();
  const diff = expireAt - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ============================================================
   이용권 정보 불러오기 + 활성 여부 표시
============================================================ */
async function loadTicket(userId) {
  const ticketBox = document.getElementById("mypage-ticket");

  const snap = await db.collection("access_tokens")
    .where("user_id", "==", userId)
    .get();

  if (snap.empty) {
    ticketBox.innerHTML = `
      <p>현재 활성화된 이용권이 없습니다.</p>
      <p><a href="/mypage/payments.html">이용권 결제 신청</a></p>
    `;
    return;
  }

  // 가장 늦게 만료되는 이용권 선택
  let best = null;
  snap.forEach(doc => {
    const data = doc.data();
    if (!best || data.expire_at > best.expire_at) {
      best = data;
    }
  });

  // expire_at 타입 처리 (Timestamp 또는 number)
  const expireAt = best.expire_at instanceof Date
    ? best.expire_at.getTime()
    : best.expire_at;

  const remaining = getRemainingDays(expireAt);
  const expireDate = new Date(expireAt).toLocaleDateString("ko-KR");

  // 활성 여부 판단
  const now = Date.now();
  let statusText = "";
  let statusColor = "";

  if (!best.is_active) {
    statusText = "❌ 비활성화됨";
    statusColor = "red";
  } else if (expireAt < now) {
    statusText = "⛔ 만료됨";
    statusColor = "gray";
  } else {
    statusText = "✔ 활성화됨";
    statusColor = "green";
  }

  ticketBox.innerHTML = `
    <p><strong>유형:</strong> ${best.type}</p>
    <p><strong>만료일:</strong> ${expireDate}</p>
    <p><strong>남은 기간:</strong> ${remaining}일</p>
    <p><strong>상태:</strong> <span style="color:${statusColor}; font-weight:700;">${statusText}</span></p>
  `;
}

/* ============================================================
   현재 결제 신청 상태 표시 (pending)
============================================================ */
async function loadPendingPayment(userId) {
  const box = document.getElementById("pendingPayment");

  const snap = await db.collection("payments")
    .where("user_id", "==", userId)
    .where("status", "==", "pending")
    .orderBy("created_at", "desc")
    .limit(1)
    .get();

  if (snap.empty) {
    box.innerHTML = "";
    return;
  }

  const p = snap.docs[0].data();
  const created = new Date(p.created_at).toLocaleString("ko-KR");

  box.innerHTML = `
    <div class="pending-box">
      <p><strong>결제방법:</strong> ${p.method}</p>
      <p><strong>금액:</strong> ${p.amount.toLocaleString()}원</p>
      <p><strong>입금자명:</strong> ${p.depositor_name}</p>
      <p><strong>상태:</strong> 승인 대기중</p>
      <p><strong>신청일:</strong> ${created}</p>
    </div>
  `;
}

/* ============================================================
   만료 3일 전 배너 표시
============================================================ */
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

  const remaining = getRemainingDays(best.expire_at);

  if (remaining === 3) {
    const box = document.createElement("div");
    box.className = "expire-banner";
    box.innerHTML = `
      <p>📢 이용권 만료까지 <strong>${remaining}일</strong> 남았습니다.</p>
      <a href="/mypage/payments.html">지금 연장하기</a>
    `;
    document.body.prepend(box);
  }
}

/* ============================================================
   Push 알림 권한 요청 배너
============================================================ */
function showPushPermissionBanner() {
  if (Notification.permission === "granted") return;

  const banner = document.getElementById("pushBanner");
  banner.style.display = "flex";

  document.getElementById("pushAllow").onclick = async () => {
    await requestPushPermission();
    banner.style.display = "none";
  };

  document.getElementById("pushLater").onclick = () => {
    banner.style.display = "none";
  };
}

/* ============================================================
   Push 알림 권한 요청 + Service Worker 등록
============================================================ */
async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.register("/sw.js");
  }
}

async function requestPushPermission() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: "<VAPID_PUBLIC_KEY>"
  });

  const user = auth.currentUser;

  await db.collection("push_subscriptions").doc(user.uid).set({
    subscription: JSON.parse(JSON.stringify(subscription)),
    updated_at: Date.now()
  });
}

/* ============================================================
   로그인 확인 후 실행
============================================================ */
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "/auth/login.html";
    return;
  }

  await registerServiceWorker();

  const userDoc = await db.collection("users").doc(user.uid).get();
  const data = userDoc.data();

  document.getElementById("mypage-name").textContent = data.name;
  document.getElementById("mypage-email").textContent = data.email;

  loadTicket(user.uid);
  loadPendingPayment(user.uid);
  checkExpireAlert(user.uid);
  showPushPermissionBanner();
});

/* ============================================================
   버튼 기능
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const editBtn = document.getElementById("editInfoBtn");
  const payBtn = document.getElementById("paymentHistoryBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const buyBtn = document.getElementById("buyTicketBtn");
  const homeBtn = document.getElementById("homeBtn");

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      window.location.href = "/auth/password-change.html";
    });
  }

  if (payBtn) {
    payBtn.addEventListener("click", () => {
      window.location.href = "/mypage/payment-history.html";
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      firebase.auth().signOut().then(() => {
        window.location.href = "/index.html";
      });
    });
  }

  if (buyBtn) {
    buyBtn.addEventListener("click", () => {
      window.location.href = "/mypage/payments.html";
    });
  }

 if (homeBtn) {
    homeBtn.addEventListener("click", () => {
      window.location.href = "/index.html";
    });
  }
});

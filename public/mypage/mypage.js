// firebase-init.js에서 auth, db 가져오기
import { auth, db } from "/firebase-init.js";

// Firebase v9 CDN 모듈 import
import { 
  onAuthStateChanged, 
  signOut,
  deleteUser
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import { 
  collection, query, where, orderBy, limit, getDocs, doc, getDoc, setDoc,
  deleteDoc, addDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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
  const ticketBox = document.getElementById("mypage-ticket");

  const q = query(
    collection(db, "access_tokens"),
    where("user_id", "==", userId)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    ticketBox.innerHTML = `
      <p>현재 활성화된 이용권이 없습니다.</p>
      <p><a href="/mypage/payments.html">이용권 결제 신청</a></p>
    `;
    return;
  }

  let best = null;
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (!best || data.expire_at > best.expire_at) {
      best = data;
    }
  });

  const expireAt = best.expire_at instanceof Date
    ? best.expire_at.getTime()
    : best.expire_at;

  const remaining = getRemainingDays(expireAt);
  const expireDate = new Date(expireAt).toLocaleDateString("ko-KR");

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
   결제 신청 상태 표시
============================================================ */
async function loadPendingPayment(userId) {
  const box = document.getElementById("pendingPayment");

  const q = query(
    collection(db, "payments"),
    where("user_id", "==", userId),
    where("status", "==", "pending"),
    orderBy("created_at", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);

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
   만료 3일 전 배너
============================================================ */
async function checkExpireAlert(userId) {
  const q = query(
    collection(db, "access_tokens"),
    where("user_id", "==", userId),
    where("is_active", "==", true)
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  let best = null;
  snap.forEach(docSnap => {
    const data = docSnap.data();
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
   Push 알림 배너 (하루 1번만 표시)
============================================================ */
function showPushPermissionBanner() {
  if (Notification.permission !== "default") return;

  const lastShown = localStorage.getItem("pushBannerLastShown");
  const today = new Date().toISOString().slice(0, 10);

  if (lastShown === today) return;

  const banner = document.getElementById("pushBanner");
  banner.style.display = "flex";

  document.getElementById("pushAllow").onclick = async () => {
    await requestPushPermission();
    banner.style.display = "none";
    localStorage.setItem("pushBannerLastShown", today);
  };

  document.getElementById("pushLater").onclick = () => {
    banner.style.display = "none";
    localStorage.setItem("pushBannerLastShown", today);
  };
}

/* ============================================================
   Push 권한 요청 + SW 등록
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

  await setDoc(doc(db, "push_subscriptions", user.uid), {
    subscription: JSON.parse(JSON.stringify(subscription)),
    updated_at: Date.now()
  });
}

/* ============================================================
   🔥 회원탈퇴 기능
============================================================ */
async function handleDeleteAccount() {
  const confirmDelete = confirm(
    "정말 회원탈퇴 하시겠습니까?\n모든 데이터가 삭제되며 복구할 수 없습니다."
  );

  if (!confirmDelete) return;

  const user = auth.currentUser;
  if (!user) {
    alert("로그인이 필요합니다.");
    return;
  }

  try {
    const uid = user.uid;

    /* -----------------------------
       1) Firestore 데이터 조회
    ----------------------------- */
    const userDoc = await getDoc(doc(db, "users", uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    const tokenSnap = await getDocs(
      query(collection(db, "access_tokens"), where("user_id", "==", uid))
    );
    const accessTokens = tokenSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const paySnap = await getDocs(
      query(collection(db, "payments"), where("user_id", "==", uid))
    );
    const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let coupons = [];
    try {
      const couponSnap = await getDocs(
        query(collection(db, "coupons"), where("user_id", "==", uid))
      );
      coupons = couponSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.log("쿠폰 컬렉션 없음 또는 오류:", e);
    }

    /* -----------------------------
       2) deleted_users 기록 저장
    ----------------------------- */
    await addDoc(collection(db, "deleted_users"), {
      uid: uid,
      email: userData.email || null,
      name: userData.name || null,
      deleted_at: Date.now(),
      payments: payments,
      access_tokens: accessTokens,
      coupons: coupons
    });

    /* -----------------------------
       3) 원본 데이터 삭제
    ----------------------------- */
    await deleteDoc(doc(db, "users", uid));
    await deleteDoc(doc(db, "push_subscriptions", uid));

    for (const d of tokenSnap.docs) {
      await deleteDoc(doc(db, "access_tokens", d.id));
    }

    for (const d of paySnap.docs) {
      await deleteDoc(doc(db, "payments", d.id));
    }

    for (const d of coupons) {
      await deleteDoc(doc(db, "coupons", d.id));
    }

    /* -----------------------------
       4) Firebase Auth 계정 삭제
    ----------------------------- */
    await deleteUser(user);

    alert("회원탈퇴가 완료되었습니다.");
    window.location.href = "/index.html";

  } catch (error) {
    console.error("회원탈퇴 오류:", error);

    if (error.code === "auth/requires-recent-login") {
      alert("보안을 위해 다시 로그인 후 회원탈퇴를 진행해주세요.");
      window.location.href = "/auth/login.html";
    } else {
      alert("회원탈퇴 중 오류가 발생했습니다.");
    }
  }
}

/* ============================================================
   로그인 후 실행 (버튼 이벤트도 여기서 연결)
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/auth/login.html";
      return;
    }

    await registerServiceWorker();

    /* 🔥 userDoc가 없을 때도 절대 오류 안 나도록 보호 */
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const data = userDoc.exists() ? userDoc.data() : {};

    const nameEl = document.getElementById("mypage-name");
    const emailEl = document.getElementById("mypage-email");

    if (nameEl) nameEl.textContent = data.name || "사용자";
    if (emailEl) emailEl.textContent = data.email || user.email;

    loadTicket(user.uid);
    loadPendingPayment(user.uid);
    checkExpireAlert(user.uid);

    showPushPermissionBanner();

    /* ============================================================
       🔥 버튼 이벤트 연결
    ============================================================ */
    document.getElementById("editInfoBtn")?.addEventListener("click", () => {
      window.location.href = "/auth/password-change.html";
    });

    document.getElementById("paymentHistoryBtn")?.addEventListener("click", () => {
      window.location.href = "/mypage/payment-history.html";
    });

    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "/index.html";
    });

    document.getElementById("buyTicketBtn")?.addEventListener("click", () => {
      window.location.href = "/mypage/payments.html";
    });

    document.getElementById("homeBtn")?.addEventListener("click", () => {
      window.location.href = "/index.html";
    });

    document.getElementById("deleteAccountBtn")?.addEventListener("click", handleDeleteAccount);
  });
});

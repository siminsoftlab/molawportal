/* ============================================================
   Firebase v9 기반 공통 인증 + 이용권 체크 (access_tokens 버전)
============================================================ */

import { auth, db } from "/firebase-init.js";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ============================================================
   이용권 체크
============================================================ */
export async function checkAccess(onSuccess) {
  try {
    const user = auth.currentUser;

    if (!user) {
      openModal("login");
      return;
    }

    const uid = user.uid;

    const q = query(
      collection(db, "access_tokens"),
      where("user_id", "==", uid),
      where("is_active", "==", true),
      orderBy("expire_at", "desc"),
      limit(1)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      openModal("purchase");
      return;
    }

    const data = snap.docs[0].data();

    /* -----------------------------
       expire_at 안전 변환
    ----------------------------- */
    let expireDate;

    if (data.expire_at instanceof Date) {
      expireDate = data.expire_at;
    }
    else if (data.expire_at?.toDate) {
      expireDate = data.expire_at.toDate();
    }
    else if (typeof data.expire_at === "string" || typeof data.expire_at === "number") {
      expireDate = new Date(data.expire_at);
    }
    else if (typeof data.expire_at === "object" && data.expire_at.seconds) {
      expireDate = new Date(data.expire_at.seconds * 1000);
    }
    else {
      expireDate = null;
    }

    const now = new Date();

    if (!expireDate || isNaN(expireDate.getTime())) {
      console.error("⚠ expire_at 값 오류:", data.expire_at);
      openModal("purchase");
      return;
    }

    if (expireDate < now) {
      openModal("expired");
      return;
    }

    onSuccess();

  } catch (err) {
    console.error("checkAccess 오류:", err);
    alert("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
}

/* ============================================================
   모달 열기 (안전 버전)
============================================================ */
function openModal(type) {
  const overlay = document.getElementById("paywallOverlay");
  const loginModal = document.getElementById("loginRequiredModal");

  const titleEl = overlay?.querySelector("h3");
  const textEl = overlay?.querySelector(".app-modal-text");

  switch (type) {
    case "login":
      if (loginModal) loginModal.style.display = "flex";
      break;

    case "purchase":
      if (titleEl) titleEl.textContent = "🔒 이용권이 필요합니다";
      if (textEl) textEl.textContent =
        "전체 계산 결과는 이용권 활성화 후 이용 가능합니다.";
      overlay.style.display = "flex";
      break;

    case "expired":
      if (titleEl) titleEl.textContent = "🔒 이용권 사용기간이 종료되었습니다";
      if (textEl) textEl.textContent =
        "이용권 사용기간이 종료되었습니다. 이용권을 신청하시겠습니까?";
      overlay.style.display = "flex";
      break;
  }
}

window.checkAccess = checkAccess;

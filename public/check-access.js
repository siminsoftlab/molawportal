/* ============================================================
   Firebase v9 기반 공통 인증 + 이용권 체크 (access_tokens 버전)
============================================================ */

// firebase-init.js에서 auth, db 가져오기
import { auth, db } from "/firebase-init.js";

// Firestore v9 모듈
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ============================================================
   이용권 체크
============================================================ */
export async function checkAccess(onSuccess) {
  try {
    /* -----------------------------
       1) 로그인 체크
    ----------------------------- */
    const user = auth.currentUser;

    if (!user) {
      openModal("login");
      return;
    }

    const uid = user.uid;

    /* -----------------------------
       2) access_tokens 조회 (v9 방식)
    ----------------------------- */
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

    const expireDate = data.expire_at?.toDate
      ? data.expire_at.toDate()
      : new Date(data.expire_at);

    const now = new Date();

    if (expireDate < now) {
      openModal("expired");
      return;
    }

    /* -----------------------------
       3) 모든 조건 충족 → 계산 실행
    ----------------------------- */
    onSuccess();

  } catch (err) {
    console.error("checkAccess 오류:", err);
    alert("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
}

/* ============================================================
   모달 열기
============================================================ */
function openModal(type) {
  switch (type) {
    case "login":
      document.getElementById("loginRequiredModal").style.display = "flex";
      break;

    case "purchase":
    case "expired":
      document.getElementById("paywallOverlay").style.display = "flex";
      break;
  }
}

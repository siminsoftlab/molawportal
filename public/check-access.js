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
  getDocs
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
       2) access_tokens 조회
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

    /* -----------------------------
       3) expire_at 안전 변환
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

    // expire_at이 잘못된 경우 → 구매 필요로 처리
    if (!expireDate || isNaN(expireDate.getTime())) {
      console.error("⚠ expire_at 값 오류:", data.expire_at);
      openModal("purchase");
      return;
    }

    /* -----------------------------
       4) 만료 체크
    ----------------------------- */
    if (expireDate < now) {
      openModal("expired");
      return;
    }

    /* -----------------------------
       5) 모든 조건 충족 → 계산 실행
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
      document.querySelector("#paywallOverlay h3").textContent = "🔒 이용권이 필요합니다";
      document.querySelector("#paywallOverlay .app-modal-text").textContent =
        "전체 계산 결과는 이용권 활성화 후 이용 가능합니다.";
      document.getElementById("paywallOverlay").style.display = "flex";
      break;

    case "expired":
      document.querySelector("#paywallOverlay h3").textContent =
        "🔒 이용권 사용기간이 종료되었습니다";
      document.querySelector("#paywallOverlay .app-modal-text").textContent =
        "이용권 사용기간이 종료되었습니다. 이용권을 신청하시겠습니까?";
      document.getElementById("paywallOverlay").style.display = "flex";
      break;
  }
}

/* HTML onclick에서도 사용 가능하도록 전역 등록 */
window.checkAccess = checkAccess;

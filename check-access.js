/* ============================================================
   Firebase 기반 공통 인증 + 이용권 체크 (access_tokens 버전)
============================================================ */

async function checkAccess(onSuccess) {
  try {
    const user = firebase.auth().currentUser;

    /* -----------------------------
       1) 로그인 체크
    ----------------------------- */
    if (!user) {
      openModal("login");
      return;
    }

    const uid = user.uid;

    /* -----------------------------
       2) access_tokens에서 이용권 조회
          - user_id == uid
          - is_active == true
          - expire_at 최신순
    ----------------------------- */
    const snap = await db.collection("access_tokens")
      .where("user_id", "==", uid)
      .where("is_active", "==", true)
      .orderBy("expire_at", "desc")
      .limit(1)
      .get();

    // 이용권 없음
    if (snap.empty) {
      openModal("purchase");
      return;
    }

    const data = snap.docs[0].data();

    const expireDate = data.expire_at?.toDate
      ? data.expire_at.toDate()
      : new Date(data.expire_at);

    const now = new Date();

    // 만료된 경우
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
      document.getElementById("paywallOverlay").style.display = "flex";
      break;

    case "expired":
      document.getElementById("paywallOverlay").style.display = "flex";
      break;
  }
}

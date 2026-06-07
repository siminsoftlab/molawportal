/* ============================================================
   이용권 남은 기간 불러오기
============================================================ */
async function loadTicketRemaining(uid) {
  const box = document.getElementById("ticket-remaining");
  if (!box) return; // index.html에 없으면 무시

  const snap = await firebase.firestore()
    .collection("access_tokens")
    .where("user_id", "==", uid)
    .get();

  if (snap.empty) {
    box.textContent = "· 이용권 없음";
    box.style.color = "#999";
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

  // 활성 여부 체크
  if (!best.is_active) {
    box.textContent = "· 비활성화됨";
    box.style.color = "red";
    return;
  }

  // expire_at 타입 처리
  let expireAt = best.expire_at;
  let expireDate;

  if (expireAt instanceof Date) {
    expireDate = expireAt;
  } else if (expireAt?.toDate) {
    expireDate = expireAt.toDate();
  } else {
    expireDate = new Date(expireAt);
  }

  const now = new Date();
  const diff = expireDate - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    box.textContent = "· 만료됨";
    box.style.color = "gray";
    return;
  }

  box.textContent = `· 이용권 ${days}일 남음`;
  box.style.color = "#4a6fff";
}

/* ============================================================
   로그인 상태 감지
============================================================ */
firebase.auth().onAuthStateChanged(async (user) => {
  const before = document.getElementById("auth-before");
  const after = document.getElementById("auth-after");
  const username = document.getElementById("auth-username");

  if (user) {
    before.style.display = "none";
    after.style.display = "flex";

    const doc = await firebase.firestore()
      .collection("users")
      .doc(user.uid)
      .get();

    if (doc.exists) {
      username.textContent = doc.data().name;
    }

    // 🔥 이용권 남은 기간 표시
    loadTicketRemaining(user.uid);

  } else {
    before.style.display = "flex";
    after.style.display = "none";
  }
});

/* ============================================================
   로그아웃
============================================================ */
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  firebase.auth().signOut().then(() => {
    window.location.reload();
  });
});

console.log("auth-state.js loaded");

document.addEventListener("DOMContentLoaded", () => {

  /* 로그인 상태 감지 */
  firebase.auth().onAuthStateChanged(async (user) => {
    console.log("Auth state changed:", user);

    const before = document.getElementById("auth-before");
    const after = document.getElementById("auth-after");
    const username = document.getElementById("auth-username");

    if (!before || !after) {
      console.log("auth DOM 요소 없음");
      return;
    }

    if (user) {
      before.style.display = "none";
      after.style.display = "flex";

      const doc = await firebase.firestore()
        .collection("users")
        .doc(user.uid)
        .get();

      if (doc.exists && username) {
        username.textContent = doc.data().name;
      }

      loadTicketRemaining(user.uid);

    } else {
      before.style.display = "flex";
      after.style.display = "none";
    }
  });

  /* 이용권 남은 기간 */
  async function loadTicketRemaining(uid) {
    const box = document.getElementById("ticket-remaining");
    if (!box) return;

    const snap = await firebase.firestore()
      .collection("access_tokens")
      .where("user_id", "==", uid)
      .get();

    if (snap.empty) {
      box.textContent = "· 이용권 없음";
      box.style.color = "#999";
      return;
    }

    let best = null;
    snap.forEach(doc => {
      const data = doc.data();
      if (!best || data.expire_at > best.expire_at) {
        best = data;
      }
    });

    let expireDate = best.expire_at?.toDate
      ? best.expire_at.toDate()
      : new Date(best.expire_at);

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

  /* ⭐ 로그아웃 버튼 이벤트 추가 (핵심) */
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await firebase.auth().signOut();
      window.location.reload();
    });
  }

});



console.log("auth-state.js loaded");

// firebase-init.js에서 export한 모듈 불러오기
import { auth, db } from "../firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  /* 로그인 상태 감지 */
  onAuthStateChanged(auth, async (user) => {
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

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && username) {
        username.textContent = userSnap.data().name;
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

    const q = query(
      collection(db, "access_tokens"),
      where("user_id", "==", uid)
    );

    const snap = await getDocs(q);

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

  /* 로그아웃 버튼 */
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.reload();
    });
  }

});

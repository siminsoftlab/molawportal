// auth-state-ch.js — side.html 전용 로그인 UI 관리
import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

export function initAuthStateSidebar() {
  onAuthStateChanged(auth, async (user) => {
    console.log("Auth state changed:", user);

    // ⭐ side.html 기준 요소들
    const before = document.getElementById("auth-before-sidebar");
    const after = document.getElementById("auth-after-sidebar");
    const username = document.getElementById("auth-username-sidebar");
    const ticketBox = document.getElementById("ticket-remaining-sidebar");

    // side.html이 아직 로드되지 않은 경우
    if (!before || !after) {
      console.warn("side.html UI 요소 없음 — auth-state-ch.js 대기");
      return;
    }

    if (user) {
      // 로그인 상태 UI
      before.style.display = "none";
      after.style.display = "flex";

      // 사용자 이름 표시
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && username) {
          username.textContent = userSnap.data().name + "님";
        } else if (username) {
          username.textContent = user.email + "님";
        }
      } catch (err) {
        console.error("Firestore 조회 오류:", err);
        if (username) username.textContent = user.email + "님";
      }

      // 이용권 표시
      loadTicketRemaining(user.uid, ticketBox);

    } else {
      // 로그아웃 상태 UI
      before.style.display = "flex";
      after.style.display = "none";
    }
  });

  // ⭐ 로그아웃 버튼
  const logoutBtn = document.getElementById("logout-btn-sidebar");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.reload();
    });
  }
}

/**
 * 이용권 남은 기간 계산
 */
async function loadTicketRemaining(uid, box) {
  if (!box) return;

  try {
    const q = query(collection(db, "access_tokens"), where("user_id", "==", uid));
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

  } catch (err) {
    console.error("이용권 조회 오류:", err);
    box.textContent = "· 조회 오류";
    box.style.color = "red";
  }
}

/* ============================================================
   Firebase 초기화
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyACfN4_r2hUAn1NQPWRZzpegjyIESYGK3I",
  authDomain: "molawcounter.firebaseapp.com",
  projectId: "molawcounter",
  storageBucket: "molawcounter.firebasestorage.app",
  messagingSenderId: "989958208701",
  appId: "1:989958208701:web:16bd53eed95276f5d4cbd4",
  measurementId: "G-D4W34NBWKT"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ============================================================
   알림 기록 불러오기
============================================================ */
async function loadNotifications() {
  const list = document.getElementById("list");
  list.innerHTML = "<p>불러오는 중...</p>";

  const usersSnap = await db.collection("notifications").get();

  if (usersSnap.empty) {
    list.innerHTML = "<p>알림 기록이 없습니다.</p>";
    return;
  }

  let html = "";

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;

    const alertsSnap = await db.collection("notifications")
      .doc(userId)
      .collection("alerts")
      .get();

    for (const alertDoc of alertsSnap.docs) {
      const alert = alertDoc.data();

      const userInfo = await db.collection("users").doc(userId).get();
      const user = userInfo.data();

      const date = new Date(alert.timestamp).toLocaleString("ko-KR");

      html += `
        <div class="item">
          <p><strong>사용자:</strong> ${user.name} (${user.email})</p>
          <p><strong>알림 종류:</strong> ${alertDoc.id}</p>
          <p><strong>발송일:</strong> ${date}</p>
        </div>
      `;
    }
  }

  list.innerHTML = html;
}

/* ============================================================
   실행
============================================================ */
loadNotifications();

document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "/admin/index.html";
});

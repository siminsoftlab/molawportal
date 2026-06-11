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

async function loadFailures() {
  const list = document.getElementById("list");

  const snap = await db.collection("match_failures")
    .orderBy("created_at", "desc")
    .get();

  if (snap.empty) {
    list.innerHTML = "<p>매칭 실패 내역이 없습니다.</p>";
    return;
  }

  let html = "";

  snap.forEach(doc => {
    const f = doc.data();

    html += `
      <div class="item">
        <p><strong>입금자명:</strong> ${f.depositor_name}</p>
        <p><strong>금액:</strong> ${f.amount.toLocaleString()}원</p>
        <p><strong>입금 시간:</strong> ${new Date(f.timestamp).toLocaleString("ko-KR")}</p>
        <p><strong>기록 시간:</strong> ${new Date(f.created_at).toLocaleString("ko-KR")}</p>
      </div>
    `;
  });

  list.innerHTML = html;
}

loadFailures();

document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "/admin/index.html";
});

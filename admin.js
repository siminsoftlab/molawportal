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
   날짜 (KST)
   ============================================================ */
function getTodayString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/* ============================================================
   시간대별 방문자 그래프
   ============================================================ */
let hourChart = null;

async function loadHourlyStats() {
  const today = getTodayString();
  const ref = db.collection("visitors").doc("hourly").collection(today);

  const snap = await ref.get();
  const hours = Array(24).fill(0);

  snap.forEach(doc => {
    const h = parseInt(doc.id);
    hours[h] = doc.data().count || 0;
  });

  if (hourChart) hourChart.destroy();

  hourChart = new Chart(document.getElementById("hourChart"), {
    type: "line",
    data: {
      labels: [...Array(24).keys()].map(h => `${h}시`),
      datasets: [{
        label: "방문자 수",
        data: hours,
        borderColor: "#007bff",
        fill: false
      }]
    }
  });
}

/* ============================================================
   실시간 방문자 수 + 샤드 상태
   ============================================================ */
function adminListenVisitorCount() {
  const shardsRef = db
    .collection("visitors")
    .doc("counter_shards")
    .collection("shards");

  shardsRef.onSnapshot((snapshot) => {
    let todaySum = 0;
    let totalSum = 0;
    const today = getTodayString();

    let html = "";

    snapshot.forEach((doc) => {
      const d = doc.data();
      if (!d) return;

      if (d.date === today) todaySum += d.today || 0;
      totalSum += d.total || 0;

      html += `
        <div>
          <b>Shard ${doc.id}</b> — today: ${d.today}, total: ${d.total}, date: ${d.date}
        </div>
      `;
    });

    document.getElementById("admin-today").textContent = todaySum;
    document.getElementById("admin-total").textContent = totalSum;
    document.getElementById("shard-list").innerHTML = html;
  });
}

/* ============================================================
   Daily 방문자 로그 조회
   ============================================================ */
async function loadDaily() {
  const date = document.getElementById("daily-date").value;
  if (!date) return;

  const ref = db
    .collection("visitors")
    .doc("daily")
    .collection("days")
    .doc(date);

  const snap = await ref.get();

  if (!snap.exists) {
    document.getElementById("daily-log").textContent = "데이터 없음";
    return;
  }

  const data = snap.data();
  const keys = Object.keys(data).filter(k => k !== "_init");

  let text = `📅 ${date} 방문자 수: ${keys.length}\n\n`;
  text += keys.join("\n");

  document.getElementById("daily-log").textContent = text;
}

/* ============================================================
   실행
   ============================================================ */
window.onload = () => {
  adminListenVisitorCount();
  loadHourlyStats();
  document.getElementById("daily-btn").onclick = loadDaily;
};

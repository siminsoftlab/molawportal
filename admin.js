document.addEventListener("DOMContentLoaded", () => {

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
   
//firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ============================================================
   날짜
   ============================================================ */
function getTodayString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 3600000).toISOString().slice(0, 10);
}

/* ============================================================
   ⭐ 오늘 방문자 (샤드 합산)
   ============================================================ */
async function loadToday() {
  const today = getTodayString();
  const ref = db.collection("visitors").doc("daily_shards").collection(today);

  const snap = await ref.get();
  let total = 0;

  snap.forEach(doc => {
    total += doc.data().count || 0;
  });

  document.getElementById("admin-today").textContent = total.toLocaleString();
}

/* ============================================================
   ⭐ 전체 방문자 (샤드 합산)
   ============================================================ */
async function loadTotal() {
  const ref = db.collection("visitors").doc("counter_shards").collection("shards");
  const snap = await ref.get();

  let total = 0;
  snap.forEach(doc => {
    total += doc.data().count || 0;
  });

  document.getElementById("admin-total").textContent = total.toLocaleString();
}

/* ============================================================
   ⭐ 샤드 상태 보기
   ============================================================ */
async function loadShards() {
  const ref = db.collection("visitors").doc("counter_shards").collection("shards");
  const snap = await ref.get();

  let text = "";
  snap.forEach(doc => {
    const d = doc.data();
    text += `Shard ${doc.id} — count: ${d.count || 0}\n`;
  });

  document.getElementById("shard-list").textContent = text;
}

/* ============================================================
   ⭐ 브라우저/OS 통계
   ============================================================ */
async function loadBrowserOSStats() {

  /* 브라우저 */
  const browserSnap = await db
    .collection("visitors")
    .doc("stats")
    .collection("browser")
    .get();

  let browserCount = {};

  for (const doc of browserSnap.docs) {
    const browser = doc.id;
    const shardSnap = await doc.ref.collection("shards").get();

    let sum = 0;
    shardSnap.forEach(s => sum += s.data().count || 0);

    browserCount[browser] = sum;
  }

  /* OS */
  const osSnap = await db
    .collection("visitors")
    .doc("stats")
    .collection("os")
    .get();

  let osCount = {};

  for (const doc of osSnap.docs) {
    const os = doc.id;
    const shardSnap = await doc.ref.collection("shards").get();

    let sum = 0;
    shardSnap.forEach(s => sum += s.data().count || 0);

    osCount[os] = sum;
  }

  drawPieChart("browserChart", browserCount);
  drawPieChart("osChart", osCount);
}

/* 파이차트 */
function drawPieChart(canvasId, dataObj) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(dataObj),
      datasets: [{
        data: Object.values(dataObj),
        backgroundColor: [
          "#4a90e2", "#50e3c2", "#f5a623",
          "#e74c3c", "#9b59b6", "#2ecc71"
        ]
      }]
    }
  });
}

/* ============================================================
   ⭐ GeoIP 상세 정보
   ============================================================ */
async function loadIPDetails(date) {
  const ref = db.collection("visitors").doc("geoip").collection(date);
  const snap = await ref.get();

  let text = "";

  snap.forEach(doc => {
    const d = doc.data();

    text += `
IP: ${d.ip}
국가: ${d.country}
도시: ${d.city}
브라우저: ${d.browser}
OS: ${d.os}
위치: ${d.lat}, ${d.lon}
방문횟수: ${d.count}
----------------------------------------
`;
  });

  document.getElementById("ip-detail-log").textContent = text || "데이터 없음";
}

/* ============================================================
   ⭐ Daily 조회 버튼 (hourly 제거됨)
   ============================================================ */
document.getElementById("daily-btn").onclick = async () => {
  const date = document.getElementById("daily-date").value;
  if (!date) return;

  loadBrowserOSStats();
  loadIPDetails(date);
};

/* ============================================================
   ⭐ 초기 실행
   ============================================================ */
loadToday();
loadTotal();
loadShards();
loadBrowserOSStats();

});

document.addEventListener("DOMContentLoaded", () => {

/* Firebase 초기화 */
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

/* ⭐ 오늘 방문자 */
async function loadToday() {
  const today = new Date().toISOString().slice(0, 10);

  const ref = db.collection("visitors").doc("daily").collection("days").doc(today);
  const snap = await ref.get();

  if (!snap.exists) {
    document.getElementById("admin-today").textContent = 0;
    return;
  }

  const data = snap.data();
  const count = Object.keys(data).filter(k => k !== "_init").length;

  document.getElementById("admin-today").textContent = count;
}

/* ⭐ 전체 방문자 */
async function loadTotal() {
  const ref = db.collection("visitors").doc("counter_shards").collection("shards");
  const snap = await ref.get();

  let total = 0;
  snap.forEach(doc => total += doc.data().total || 0);

  document.getElementById("admin-total").textContent = total;
}

/* ⭐ 샤드 상태 */
async function loadShards() {
  const ref = db.collection("visitors").doc("counter_shards").collection("shards");
  const snap = await ref.get();

  let text = "";
  snap.forEach(doc => {
    const d = doc.data();
    text += `Shard ${doc.id} — today: ${d.today}, total: ${d.total}, date: ${d.date}\n`;
  });

  document.getElementById("shard-list").textContent = text;
}

/* ⭐ 시간대별 그래프 */
async function loadHourChart(date) {
  const ref = db.collection("visitors").doc("hourly").collection(date);
  const snap = await ref.get();

  const hours = Array(24).fill(0);

  snap.forEach(doc => {
    const h = parseInt(doc.id);
    hours[h] = doc.data().count || 0;
  });

  const ctx = document.getElementById("hourChart").getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: [...Array(24).keys()].map(h => `${h}시`),
      datasets: [{
        label: "방문자 수",
        data: hours,
        borderColor: "#4a90e2",
        fill: false
      }]
    }
  });
}

/* ⭐ 브라우저/OS 통계 */
async function loadBrowserOSStats() {

  // 브라우저 통계
  const browserSnap = await db
    .collection("visitors")
    .doc("stats")
    .collection("browser")
    .get();

  let browserCount = {};
  browserSnap.forEach(doc => {
    browserCount[doc.id] = doc.data().count || 0;
  });

  // OS 통계
  const osSnap = await db
    .collection("visitors")
    .doc("stats")
    .collection("os")
    .get();

  let osCount = {};
  osSnap.forEach(doc => {
    osCount[doc.id] = doc.data().count || 0;
  });

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

/* ⭐ Daily 로그 */
async function loadDailyLog(date) {
  const ref = db.collection("visitors").doc("daily").collection("days").doc(date);
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

/* ⭐ IP 상세 정보 */
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

/* Daily 조회 버튼 */
document.getElementById("daily-btn").onclick = async () => {
  const date = document.getElementById("daily-date").value;
  if (!date) return;

  loadDailyLog(date);
  loadHourChart(date);
  loadBrowserOSStats();
  loadIPDetails(date);
};

/* 초기 실행 */
loadToday();
loadTotal();
loadShards();
loadBrowserOSStats();

});

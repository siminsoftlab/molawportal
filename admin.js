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

/* 🔍 관리자 접근 로그 기록 */
async function logAdminAccess() {
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const ip = (await ipRes.json()).ip;

    const now = new Date();
    const time = now.toISOString().replace("T", " ").slice(0, 19);

    await db.collection("admin_logs")
      .doc(String(Date.now()))
      .set({
        ip: ip,
        time: time,
        user: "admin"
      });

  } catch (e) {
    console.log("관리자 로그 기록 실패:", e);
  }
}

logAdminAccess();

/* 로그아웃 */
document.getElementById("logout-btn").onclick = () => {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_token_time");
  window.location.href = "admin-login.html";
};

/* 비밀번호 변경 */
document.getElementById("change-pw-btn").onclick = () => {
  window.location.href = "admin-password.html";
};

/* 오늘 방문자 */
async function loadToday() {
  const today = new Date().toISOString().slice(0, 10);
  const ref = db.collection("visitors").doc("daily").collection(today);
  const snap = await ref.get();

  let total = 0;
  snap.forEach(doc => total += doc.data().count);

  document.getElementById("admin-today").textContent = total;
}

/* 전체 방문자 */
async function loadTotal() {
  const ref = db.collection("visitors").doc("total");
  const snap = await ref.get();
  document.getElementById("admin-total").textContent = snap.exists ? snap.data().count : 0;
}

/* 시간대별 그래프 */
async function loadHourChart(date) {
  const ref = db.collection("visitors").doc("hourly").collection(date);
  const snap = await ref.get();

  let hours = Array(24).fill(0);

  snap.forEach(doc => {
    const h = Number(doc.id);
    hours[h] = doc.data().count;
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
        backgroundColor: "rgba(74,144,226,0.2)",
        fill: true
      }]
    }
  });
}

/* 브라우저/OS 통계 */
async function loadBrowserOSStats(date) {
  const ref = db.collection("visitors").doc("geoip").collection(date);
  const snap = await ref.get();

  let browserCount = {};
  let osCount = {};

  snap.forEach(doc => {
    const d = doc.data();

    if (d.browser) browserCount[d.browser] = (browserCount[d.browser] || 0) + d.count;
    if (d.os) osCount[d.os] = (osCount[d.os] || 0) + d.count;
  });

  drawPieChart("browserChart", browserCount, "브라우저 통계");
  drawPieChart("osChart", osCount, "OS 통계");
}

/* 파이차트 */
function drawPieChart(canvasId, dataObj, label) {
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

/* IP 상세 정보 */
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
접속시간: ${d.time}
브라우저: ${d.browser}
OS: ${d.os}
위치: ${d.lat}, ${d.lon}
방문횟수: ${d.count}
----------------------------------------
`;
  });

  document.getElementById("ip-detail-log").textContent = text || "데이터 없음";
}

/* Daily 로그 */
async function loadDailyLog(date) {
  const ref = db.collection("visitors").doc("daily").collection(date);
  const snap = await ref.get();

  let text = "";
  snap.forEach(doc => {
    text += `${doc.id}: ${doc.data().count}\n`;
  });

  document.getElementById("daily-log").textContent = text || "데이터 없음";
}

/* 샤드 상태 */
async function loadShards() {
  const ref = db.collection("visitors").doc("shards").collection("list");
  const snap = await ref.get();

  let text = "";
  snap.forEach(doc => {
    text += `${doc.id}: ${doc.data().count}\n`;
  });

  document.getElementById("shard-list").textContent = text;
}

/* Daily 조회 버튼 */
document.getElementById("daily-btn").onclick = async () => {
  const date = document.getElementById("daily-date").value;
  if (!date) return;

  loadDailyLog(date);
  loadHourChart(date);
  loadBrowserOSStats(date);
  loadIPDetails(date);
};

/* 초기 실행 */
loadToday();
loadTotal();
loadShards();

});

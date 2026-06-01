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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ============================================================
   관리자 접근 로그 기록
   ============================================================ */
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

/* ============================================================
   버튼 기능
   ============================================================ */
document.getElementById("logout-btn").onclick = () => {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_token_time");
  window.location.href = "admin-login.html";
};

document.getElementById("change-pw-btn").onclick = () => {
  window.location.href = "admin-password.html";
};

/* ============================================================
   오늘 방문자
   ============================================================ */
async function loadToday() {
  const today = new Date().toISOString().slice(0, 10);

  const ref = db
    .collection("visitors")
    .doc("daily")
    .collection("days")
    .doc(today);

  const snap = await ref.get();

  if (!snap.exists) {
    document.getElementById("admin-today").textContent = 0;
    return;
  }

  const data = snap.data();
  const count = Object.keys(data).filter(k => k !== "_init").length;

  document.getElementById("admin-today").textContent = count;
}

/* ============================================================
   전체 방문자
   ============================================================ */
async function loadTotal() {
  const snap = await db
    .collection("visitors")
    .doc("total")
    .collection("visitors")
    .get();

  document.getElementById("admin-total").textContent = snap.size;
}

/* ============================================================
   샤드 상태 (페이징)
   ============================================================ */
let shardData = [];
let shardPage = 0;
const shardPageSize = 10;

async function loadShards() {
  const ref = db
    .collection("visitors")
    .doc("counter_shards")
    .collection("shards");

  const snap = await ref.get();

  shardData = [];

  snap.forEach(doc => {
    const d = doc.data();
    shardData.push(`Shard ${doc.id} — total: ${d.total || 0}`);
  });

  shardPage = 0;
  renderShardPage();
}

function renderShardPage() {
  const start = shardPage * shardPageSize;
  const end = start + shardPageSize;

  const slice = shardData.slice(start, end);

  document.getElementById("shard-list").textContent =
    slice.join("\n") || "데이터 없음";

  renderShardButtons();
}

function renderShardButtons() {
  const container = document.getElementById("shard-buttons");
  container.innerHTML = "";

  if (shardPage > 0) {
    const prev = document.createElement("button");
    prev.textContent = "이전";
    prev.className = "btn-secondary";
    prev.onclick = () => {
      shardPage--;
      renderShardPage();
    };
    container.appendChild(prev);
  }

  if ((shardPage + 1) * shardPageSize < shardData.length) {
    const next = document.createElement("button");
    next.textContent = "다음";
    next.className = "btn-secondary";
    next.onclick = () => {
      shardPage++;
      renderShardPage();
    };
    container.appendChild(next);
  }
}

/* ============================================================
   Daily 방문자 로그 (페이징)
   ============================================================ */
let dailyData = [];
let dailyPage = 0;
const dailyPageSize = 10;

async function loadDailyLog(date) {
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
  dailyData = Object.keys(data).filter(k => k !== "_init");

  dailyPage = 0;
  renderDailyPage(date);
}

function renderDailyPage(date) {
  const start = dailyPage * dailyPageSize;
  const end = start + dailyPageSize;

  const slice = dailyData.slice(start, end);

  let text = `📅 ${date} 방문자 수: ${dailyData.length}\n\n`;
  text += slice.join("\n") || "데이터 없음";

  document.getElementById("daily-log").textContent = text;

  renderDailyButtons();
}

function renderDailyButtons() {
  const container = document.getElementById("daily-buttons");
  container.innerHTML = "";

  if (dailyPage > 0) {
    const prev = document.createElement("button");
    prev.textContent = "이전";
    prev.className = "btn-secondary";
    prev.onclick = () => {
      dailyPage--;
      renderDailyPage(document.getElementById("daily-date").value);
    };
    container.appendChild(prev);
  }

  if ((dailyPage + 1) * dailyPageSize < dailyData.length) {
    const next = document.createElement("button");
    next.textContent = "다음";
    next.className = "btn-secondary";
    next.onclick = () => {
      dailyPage++;
      renderDailyPage(document.getElementById("daily-date").value);
    };
    container.appendChild(next);
  }
}

/* ============================================================
   브라우저 통계
   ============================================================ */
async function loadBrowserStats() {
  const ref = db.collection("visitors").doc("stats").collection("browser");
  const snap = await ref.get();

  let browserCount = {};

  for (const doc of snap.docs) {
    const data = doc.data();
    const keys = Object.keys(data);
    browserCount[doc.id] = keys.length;
  }

  drawPieChart("browserChart", browserCount);
}

/* ============================================================
   OS 통계
   ============================================================ */
async function loadOSStats() {
  const ref = db.collection("visitors").doc("stats").collection("os");
  const snap = await ref.get();

  let osCount = {};

  for (const doc of snap.docs) {
    const data = doc.data();
    const keys = Object.keys(data);
    osCount[doc.id] = keys.length;
  }

  drawPieChart("osChart", osCount);
}

/* ============================================================
   파이차트 공통 함수
   ============================================================ */
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
   IP 상세 정보 (페이징 + 접속시간)
   ============================================================ */
let ipData = [];
let ipPage = 0;
const ipPageSize = 10;

async function loadIPDetails(date) {
  const ref = db.collection("visitors").doc("geoip").collection(date);
  const snap = await ref.get();

  ipData = [];

  snap.forEach(doc => {
    const d = doc.data();

    ipData.push({
      ip: d.ip,
      country: d.country,
      city: d.city,
      time: d.timestamp ? new Date(d.timestamp).toLocaleString() : "-"
    });
  });

  ipPage = 0;
  renderIPPage();
}

function renderIPPage() {
  const start = ipPage * ipPageSize;
  const end = start + ipPageSize;

  const slice = ipData.slice(start, end);

  let text = "";

  slice.forEach(d => {
    text += `${d.ip} / ${d.country} / ${d.city} / ${d.time}\n`;
  });

  if (text === "") text = "데이터 없음";

  document.getElementById("ip-detail-log").textContent = text;

  renderIPButtons();
}

function renderIPButtons() {
  const container = document.getElementById("ip-buttons");
  container.innerHTML = "";

  if (ipPage > 0) {
    const prev = document.createElement("button");
    prev.textContent = "이전";
    prev.className = "btn-secondary";
    prev.onclick = () => {
      ipPage--;
      renderIPPage();
    };
    container.appendChild(prev);
  }

  if ((ipPage + 1) * ipPageSize < ipData.length) {
    const next = document.createElement("button");
    next.textContent = "다음";
    next.className = "btn-secondary";
    next.onclick = () => {
      ipPage++;
      renderIPPage();
    };
    container.appendChild(next);
  }
}

/* ============================================================
   Daily 조회 버튼
   ============================================================ */
document.getElementById("daily-btn").onclick = async () => {
  const date = document.getElementById("daily-date").value;
  if (!date) return;

  await loadDailyLog(date);
  await loadIPDetails(date);
  await loadBrowserStats();
  await loadOSStats();
};

/* ============================================================
   페이지 로드시 자동으로 오늘 날짜 선택 + 자동 조회
   ============================================================ */
function setTodayDate() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("daily-date").value = today;
}

async function autoLoadDaily() {
  const today = new Date().toISOString().slice(0, 10);
  await loadDailyLog(today);
  await loadIPDetails(today);
  await loadBrowserStats();
  await loadOSStats();
}

/* ============================================================
   초기 실행
   ============================================================ */
loadToday();
loadTotal();
loadShards();
setTodayDate();
autoLoadDaily();

});

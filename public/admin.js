/****************************************************
 * Firebase v9 import
 ****************************************************/
import { db } from "/firebase-init.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/****************************************************
 * 관리자 페이지 스크립트
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {

  let browserChartInstance = null;
  let osChartInstance = null;

  /* ============================================================
     관리자 접근 로그 기록
     ============================================================ */
  async function logAdminAccess() {
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ip = (await ipRes.json()).ip;

      const now = new Date();
      const time = now.toISOString().replace("T", " ").slice(0, 19);

      const logsCol = collection(db, "admin_logs");
      const logRef = doc(logsCol, String(Date.now()));

      await setDoc(logRef, {
        ip,
        time,
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
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_token_time");
      window.location.href = "/admin-login.html";
    };
  }

  const changePwBtn = document.getElementById("change-pw-btn");
  if (changePwBtn) {
    changePwBtn.onclick = () => {
      window.location.href = "/admin-password.html";
    };
  }

  const homeBtn = document.getElementById("home-btn");
  if (homeBtn) {
    homeBtn.onclick = () => {
      window.location.href = "/index.html";
    };
  }

  /* ============================================================
     오늘 방문자
     ============================================================ */
  async function loadToday() {
    const today = new Date().toISOString().slice(0, 10);

    const visitorsCol = collection(db, "visitors");
    const dailyDoc = doc(visitorsCol, "daily");
    const daysCol = collection(dailyDoc, "days");
    const todayRef = doc(daysCol, today);

    const snap = await getDoc(todayRef);

    const el = document.getElementById("visitor-today");
    if (!el) return;

    if (!snap.exists()) {
      el.textContent = 0;
      return;
    }

    const data = snap.data();
    const count = Object.keys(data).filter(k => k !== "_init").length;

    el.textContent = count;
  }

  /* ============================================================
     전체 방문자
     ============================================================ */
  async function loadTotal() {
    const visitorsCol = collection(db, "visitors");
    const totalDoc = doc(visitorsCol, "total");
    const totalVisitorsCol = collection(totalDoc, "visitors");

    const snap = await getDocs(totalVisitorsCol);

    const el = document.getElementById("visitor-total");
    if (!el) return;

    el.textContent = snap.size;
  }

  /* ============================================================
     ⭐ 상담신청 통계 추가
     ============================================================ */
  async function loadConsultStats() {
    const consultCol = collection(db, "consult_requests");
    const snap = await getDocs(consultCol);

    let total = 0;
    let todayCount = 0;

    const todayStr = new Date().toISOString().slice(0, 10);

    snap.forEach(d => {
      const data = d.data();
      total++;

      if (data.createdAt?.seconds) {
        const created = new Date(data.createdAt.seconds * 1000)
          .toISOString()
          .slice(0, 10);

        if (created === todayStr) todayCount++;
      }
    });

    const totalEl = document.getElementById("consult-total-count");
    const todayEl = document.getElementById("consult-today-count");

    if (totalEl) totalEl.textContent = total;
    if (todayEl) todayEl.textContent = todayCount;
  }

  /* 상담신청 목록 버튼 */
  const consultManageBtn = document.getElementById("consult-manage-btn");
  if (consultManageBtn) {
    consultManageBtn.onclick = () => {
      window.location.href = "/admin/admin-consult.html";
    };
  }

  /* ============================================================
     샤드 상태 (페이징)
     ============================================================ */
  let shardData = [];
  let shardPage = 0;
  const shardPageSize = 10;

  async function loadShards() {
    const visitorsCol = collection(db, "visitors");
    const counterDoc = doc(visitorsCol, "counter_shards");
    const shardsCol = collection(counterDoc, "shards");

    const snap = await getDocs(shardsCol);

    shardData = [];

    snap.forEach(d => {
      const data = d.data();
      shardData.push(`Shard ${d.id} — total: ${data.total || 0}`);
    });

    shardPage = 0;
    renderShardPage();
  }

  function renderShardPage() {
    const start = shardPage * shardPageSize;
    const end = start + shardPageSize;

    const slice = shardData.slice(start, end);

    const listEl = document.getElementById("shard-list");
    if (!listEl) return;

    listEl.textContent = slice.join("\n") || "데이터 없음";

    renderShardButtons();
  }

  function renderShardButtons() {
    const container = document.getElementById("shard-buttons");
    if (!container) return;

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
     Daily 방문자 로그
     ============================================================ */
  let dailyData = [];
  let dailyPage = 0;
  const dailyPageSize = 10;

  async function loadDailyLog(date) {
    const visitorsCol = collection(db, "visitors");
    const dailyDoc = doc(visitorsCol, "daily");
    const daysCol = collection(dailyDoc, "days");
    const dateRef = doc(daysCol, date);

    const snap = await getDoc(dateRef);

    const logEl = document.getElementById("daily-log");
    if (!logEl) return;

    if (!snap.exists()) {
      logEl.textContent = "데이터 없음";
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

    const logEl = document.getElementById("daily-log");
    if (!logEl) return;

    logEl.textContent = text;

    renderDailyButtons();
  }

  function renderDailyButtons() {
    const container = document.getElementById("daily-buttons");
    if (!container) return;

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
     브라우저 / OS 통계
     ============================================================ */
  async function loadBrowserStats() {
    const visitorsCol = collection(db, "visitors");
    const statsDoc = doc(visitorsCol, "stats");
    const browserCol = collection(statsDoc, "browser");

    const snap = await getDocs(browserCol);

    const browserCount = {};

    snap.forEach(d => {
      const data = d.data();
      const keys = Object.keys(data);
      browserCount[d.id] = keys.length;
    });

    drawPieChart("browserChart", browserCount);
  }

  async function loadOSStats() {
    const visitorsCol = collection(db, "visitors");
    const statsDoc = doc(visitorsCol, "stats");
    const osCol = collection(statsDoc, "os");

    const snap = await getDocs(osCol);

    const osCount = {};

    snap.forEach(d => {
      const data = d.data();
      const keys = Object.keys(data);
      osCount[d.id] = keys.length;
    });

    drawPieChart("osChart", osCount);
  }

  /* ============================================================
     파이차트 공통 함수
     ============================================================ */
  function drawPieChart(canvasId, dataObj) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (typeof Chart === "undefined") return;

    const ctx = canvas.getContext("2d");

    if (canvasId === "browserChart" && browserChartInstance) {
      browserChartInstance.destroy();
    }
    if (canvasId === "osChart" && osChartInstance) {
      osChartInstance.destroy();
    }

    const newChart = new Chart(ctx, {
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

    if (canvasId === "browserChart") browserChartInstance = newChart;
    if (canvasId === "osChart") osChartInstance = newChart;
  }

  /* ============================================================
     IP 상세 정보
     ============================================================ */
  let ipData = [];
  let ipPage = 0;
  const ipPageSize = 10;

  async function loadIPDetails(date) {
    const visitorsCol = collection(db, "visitors");
    const geoDoc = doc(visitorsCol, "geoip");
    const dateCol = collection(geoDoc, date);

    const snap = await getDocs(dateCol);

    ipData = [];

    snap.forEach(d => {
      const data = d.data();

      ipData.push({
        ip: data.ip,
        country: data.country,
        city: data.city,
        time: data.timestamp ? new Date(data.timestamp).toLocaleString() : "-",
        rawTime: data.timestamp || 0
      });
    });

    ipData.sort((a, b) => b.rawTime - a.rawTime);

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

    const el = document.getElementById("ip-detail-log");
    if (!el) return;

    el.textContent = text;

    renderIPButtons();
  }

  function renderIPButtons() {
    const container = document.getElementById("ip-buttons");
    if (!container) return;

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
  const dailyBtn = document.getElementById("daily-btn");
  if (dailyBtn) {
    dailyBtn.onclick = async () => {
      const dateInput = document.getElementById("daily-date");
      if (!dateInput || !dateInput.value) return;

      const date = dateInput.value;

      await loadDailyLog(date);
      await loadIPDetails(date);
      await loadBrowserStats();
      await loadOSStats();
    };
  }

  /* ============================================================
     페이지 로드시 자동 조회
     ============================================================ */
  function setTodayDate() {
    const dateInput = document.getElementById("daily-date");
    if (!dateInput) return;

    const today = new Date().toISOString().slice(0, 10);
    dateInput.value = today;
  }

  async function autoLoadDaily() {
    const today = new Date().toISOString().slice(0, 10);
    await loadDailyLog(today);
    await loadIPDetails(today);
    await loadBrowserStats();
    await loadOSStats();
  }

  /* ============================================================
     결제 / 이용권 통계
     ============================================================ */
  async function loadPaymentStats() {
    const paymentsCol = collection(db, "payments");

    const pendingQ = query(paymentsCol, where("status", "==", "pending"));
    const pendingSnap = await getDocs(pendingQ);
    const pendingEl = document.getElementById("payment-pending-count");
    if (pendingEl) pendingEl.textContent = pendingSnap.size;

    const tokensCol = collection(db, "access_tokens");

    const activeQ = query(tokensCol, where("is_active", "==", true));
    const activeSnap = await getDocs(activeQ);
    const activeEl = document.getElementById("token-active-count");
    if (activeEl) activeEl.textContent = activeSnap.size;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayQ = query(tokensCol, where("created_at", ">=", startOfDay.getTime()));
    const todaySnap = await getDocs(todayQ);
    const todayEl = document.getElementById("token-today-count");
    if (todayEl) todayEl.textContent = todaySnap.size;
  }

  const paymentManageBtn = document.getElementById("payment-manage-btn");
  if (paymentManageBtn) {
    paymentManageBtn.addEventListener("click", () => {
      window.location.href = "/admin/payments.html";
    });
  }

  const tokenManageBtn = document.getElementById("token-manage-btn");
  if (tokenManageBtn) {
    tokenManageBtn.addEventListener("click", () => {
      window.location.href = "/admin/tokens.html";
    });
  }
const userManageBtn = document.getElementById("user-manage-btn");
if (userManageBtn) {
  userManageBtn.addEventListener("click", () => {
    window.location.href = "/admin/admin-users.html";
  });
}
const deluserManageBtn = document.getElementById("deluser-manage-btn");
if (deluserManageBtn) {
  deluserManageBtn.addEventListener("click", () => {
    window.location.href = "/admin/admin-deleted-users.html";
  });
}

  /* ============================================================
     회원 통계
     ============================================================ */
  async function loadUserStats() {
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);

    let total = 0;
    let todayCount = 0;

    const todayStr = new Date().toISOString().slice(0, 10);

    snapshot.forEach(d => {
      if (d.id === "_schema") return;

      const data = d.data();
      if (!data.created_at) return;

      total++;

      let createdAt = data.created_at;

      if (createdAt?.seconds) {
        createdAt = createdAt.seconds * 1000;
      }

      const created = new Date(createdAt).toISOString().slice(0, 10);
      if (created === todayStr) todayCount++;
    });

    const totalEl = document.getElementById("user-total-count");
    const todayEl = document.getElementById("user-today-count");

    if (totalEl) totalEl.textContent = total;
    if (todayEl) todayEl.textContent = todayCount;
  }

  /* ============================================================
     초기 실행
     ============================================================ */
  loadToday();
  loadTotal();
  loadShards();
  setTodayDate();
  autoLoadDaily();
  loadPaymentStats();
  loadUserStats();
  loadConsultStats();   // ⭐ 상담신청 통계 추가
});

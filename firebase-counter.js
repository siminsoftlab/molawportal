/* ============================================================
   UUID 기반 고유 방문자 키 생성
   ============================================================ */
function getVisitorKey() {
  let uuid = localStorage.getItem("visitor_uuid");
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem("visitor_uuid", uuid);
  }
  return uuid;  // 해시 제거 → 안정적 고유값
}

/* ============================================================
   날짜/시간
   ============================================================ */
function getTodayString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 3600000).toISOString().slice(0, 10);
}

function getHour() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 3600000).getHours();
}

/* ============================================================
   브라우저/OS
   ============================================================ */
function getBrowserInfo() {
  const ua = navigator.userAgent;

  let browser = "Unknown";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";

  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "MacOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone")) os = "iOS";

  return { browser, os };
}

/* ============================================================
   GeoIP
   ============================================================ */
async function getGeoIP() {
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const ip = (await ipRes.json()).ip;

    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
    const geo = await geoRes.json();

    return {
      ip,
      country: geo.country || "Unknown",
      city: geo.city || "Unknown",
      lat: geo.latitude || null,
      lon: geo.longitude || null
    };
  } catch {
    return null;
  }
}

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
   방문자 업데이트 (고유 방문자 기반)
   ============================================================ */
async function updateVisitorCount() {
  const today = getTodayString();
  const hour = getHour();
  const visitorKey = getVisitorKey();
  const info = getBrowserInfo();

  /* ⭐ 1) 오늘 방문자 기록 (고유 방문자) */
  await db.collection("visitors")
    .doc("daily")
    .collection("days")
    .doc(today)
    .set({ [visitorKey]: true, _init: true }, { merge: true });

  /* ⭐ 2) 전체 방문자 기록 (고유 방문자) */
  await db.collection("visitors")
    .doc("total")
    .collection("visitors")
    .doc(visitorKey)
    .set({ visited: true }, { merge: true });

  /* ⭐ 3) 시간대별 통계 */
  await db.collection("visitors")
    .doc("hourly")
    .collection(today)
    .doc(String(hour))
    .set({ [visitorKey]: true }, { merge: true });

  /* ⭐ 4) 브라우저/OS 통계 */
  await db.collection("visitors")
    .doc("stats")
    .collection("browser")
    .doc(info.browser)
    .set({ [visitorKey]: true }, { merge: true });

  await db.collection("visitors")
    .doc("stats")
    .collection("os")
    .doc(info.os)
    .set({ [visitorKey]: true }, { merge: true });

  /* ⭐ 5) GeoIP 저장 */
  const geo = await getGeoIP();
  if (geo && geo.ip) {
    db.collection("visitors")
      .doc("geoip")
      .collection(today)
      .doc(geo.ip)
      .set({
        ...geo,
        browser: info.browser,
        os: info.os,
        visited: true
      }, { merge: true });
  }
}

/* ============================================================
   실시간 방문자 수 표시
   ============================================================ */
function listenVisitorCount() {
  const today = getTodayString();

  /* ⭐ 오늘 방문자 (고유 방문자 수) */
  db.collection("visitors")
    .doc("daily")
    .collection("days")
    .doc(today)
    .onSnapshot((snap) => {
      if (!snap.exists) {
        document.getElementById("visitor-today").textContent = 0;
        return;
      }
      const data = snap.data();
      const count = Object.keys(data).filter(k => k !== "_init").length;
      document.getElementById("visitor-today").textContent = count;
    });

  /* ⭐ 전체 방문자 (고유 방문자 수) */
  db.collection("visitors")
    .doc("total")
    .collection("visitors")
    .onSnapshot((snap) => {
      document.getElementById("visitor-total").textContent = snap.size;
    });
}

/* ============================================================
   실행
   ============================================================ */
window.onload = async () => {
  await updateVisitorCount();   // 고유 방문자 기록
  listenVisitorCount();         // 실시간 표시
};

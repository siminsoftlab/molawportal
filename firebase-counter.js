/* ============================================================
   SHA-256 해시
   ============================================================ */
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ============================================================
   UUID 생성
   ============================================================ */
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 0xf;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ============================================================
   visitorKey 생성 (중복 방문 방지)
   ============================================================ */
async function getVisitorKey() {
  let uuid = localStorage.getItem("visitor_uuid");
  if (!uuid) {
    uuid = generateUUID();
    localStorage.setItem("visitor_uuid", uuid);
  }
  return (await sha256(uuid + navigator.userAgent)).slice(0, 32);
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
   샤드 개수
   ============================================================ */
const NUM_SHARDS = 20;

/* ============================================================
   샤드 증가 함수 (전체 방문자, 브라우저/OS 등)
   ============================================================ */
function incrementShard(refBase) {
  const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
  return refBase.collection("shards").doc(shardId).set({
    total: firebase.firestore.FieldValue.increment(1)
  }, { merge: true });
}

/* ============================================================
   방문자 업데이트 (최종 안정화)
   ============================================================ */
async function updateVisitorCount() {
  const today = getTodayString();
  const hour = getHour();
  const visitorKey = await getVisitorKey();
  const info = getBrowserInfo();

  /* ⭐ 1) 오늘 방문자 기록 (admin.js와 동일 구조) */
  await db.collection("visitors")
    .doc("daily")
    .collection("days")
    .doc(today)
    .set({ [visitorKey]: true, _init: true }, { merge: true });

  /* ⭐ 2) 전체 방문자 샤드 증가 */
  await incrementShard(
    db.collection("visitors").doc("counter_shards")
  );

  /* ⭐ 3) 시간대별 샤드 증가 */
  await incrementShard(
    db.collection("visitors").doc("hourly_shards").collection(today).doc(String(hour))
  );

  /* ⭐ 4) 브라우저/OS 샤드 증가 */
  await incrementShard(
    db.collection("visitors").doc("stats").collection("browser").doc(info.browser)
  );

  await incrementShard(
    db.collection("visitors").doc("stats").collection("os").doc(info.os)
  );

  /* ⭐ 5) GeoIP 저장 */
  const geo = await getGeoIP();
  if (geo && geo.ip) {
    db.collection("visitors").doc("geoip").collection(today).doc(geo.ip).set({
      ...geo,
      browser: info.browser,
      os: info.os,
      count: firebase.firestore.FieldValue.increment(1)
    }, { merge: true });
  }
}

/* ============================================================
   실시간 방문자 수 합산 (최종 안정화)
   ============================================================ */
function listenVisitorCount() {

  /* ⭐ 전체 방문자 (total 필드 기반) */
  db.collection("visitors")
    .doc("counter_shards")
    .collection("shards")
    .onSnapshot((snap) => {
      let total = 0;
      snap.forEach(doc => {
        total += doc.data().total || 0;
      });
      document.getElementById("visitor-total").textContent = total.toLocaleString();
    });

  /* ⭐ 오늘 방문자 (daily/days 기반 — admin.js와 동일) */
  const today = getTodayString();

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

      document.getElementById("visitor-today").textContent = count.toLocaleString();
    });
}

/* ============================================================
   실행
   ============================================================ */
window.onload = async () => {
  await updateVisitorCount();   // ⭐ 반드시 먼저 실행
  listenVisitorCount();         // ⭐ 그 다음 실시간 리스너
};

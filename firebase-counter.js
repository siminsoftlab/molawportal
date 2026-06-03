/* ============================================================
   고유 방문자 키 생성 (localStorage + cookie)
   ============================================================ */
function getVisitorKey() {
  let key = localStorage.getItem("visitor_uuid");

  if (!key) {
    const cookieMatch = document.cookie.match(/visitor_uuid=([^;]+)/);
    if (cookieMatch) {
      key = cookieMatch[1];
      localStorage.setItem("visitor_uuid", key);
    }
  }

  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem("visitor_uuid", key);
    document.cookie = `visitor_uuid=${key}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return key;
}

/* ============================================================
   날짜 (KST 기준)
   ============================================================ */
function getTodayString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 3600000).toISOString().slice(0, 10);
}

/* ============================================================
   Firebase 초기화
  
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
============================================================ */
const db = firebase.firestore();

/* ============================================================
   방문자 업데이트 (고유 방문자 기반)
   ============================================================ */
async function updateVisitorCount() {
  const today = getTodayString();
  const visitorKey = getVisitorKey();

  /* ⭐ 오늘 방문자 기록 */
  await db.collection("visitors")
    .doc("daily")
    .collection("days")
    .doc(today)
    .collection("visitors")
    .doc(visitorKey)
    .set({ visited: true, timestamp: Date.now() }, { merge: true });

  /* ⭐ 전체 방문자 기록 */
  await db.collection("visitors")
    .doc("total")
    .collection("visitors")
    .doc(visitorKey)
    .set({ visited: true, firstVisit: Date.now() }, { merge: true });

  /* ⭐ 조회수 샤드 증가 */
  const shardId = Math.floor(Math.random() * 20).toString();
  await db.collection("visitors")
    .doc("counter_shards")
    .collection("shards")
    .doc(shardId)
    .set({ total: firebase.firestore.FieldValue.increment(1) }, { merge: true });
}

/* ============================================================
   실시간 방문자 표시 (Listen 자동 재연결 적용)
   ============================================================ */
function listenVisitorCount() {
  const today = getTodayString();

  const dailyRef = db.collection("visitors")
    .doc("daily")
    .collection("days")
    .doc(today)
    .collection("visitors");

  const totalRef = db.collection("visitors")
    .doc("total")
    .collection("visitors");

  /* ⭐ 자동 재연결 기능 포함 */
  function attachDailyListener() {
    return dailyRef.onSnapshot(
      (snap) => {
        const count = snap.size;

        const el1 = document.getElementById("visitor-today");
        if (el1) el1.textContent = count;

        const el2 = document.getElementById("admin-today");
        if (el2) el2.textContent = count;
      },
      (error) => {
        console.error("🔥 Daily Listen Error:", error);
        setTimeout(attachDailyListener, 2000); // 자동 재연결
      }
    );
  }

  function attachTotalListener() {
    return totalRef.onSnapshot(
      (snap) => {
        const count = snap.size;

        const el1 = document.getElementById("visitor-total");
        if (el1) el1.textContent = count;

        const el2 = document.getElementById("admin-total");
        if (el2) el2.textContent = count;
      },
      (error) => {
        console.error("🔥 Total Listen Error:", error);
        setTimeout(attachTotalListener, 2000); // 자동 재연결
      }
    );
  }

  attachDailyListener();
  attachTotalListener();
}

/* ============================================================
   방문자 GeoIP 저장
   ============================================================ */
async function saveVisitorGeoIP() {
  const today = getTodayString();
  const visitorKey = getVisitorKey();

  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();

    const { browser, os } = getBrowserInfo();

    await db.collection("visitors")
      .doc("geoip")
      .collection(today)
      .doc(visitorKey)
      .set({
        ip: data.ip || null,
        country: data.country_name || null,
        city: data.city || null,
        browser,
        os,
        timestamp: Date.now()
      }, { merge: true });

  } catch (e) {
    console.error("GeoIP 저장 실패:", e);
  }
}

/* ============================================================
   브라우저/OS 감지 함수
   ============================================================ */
function getBrowserInfo() {
  const ua = navigator.userAgent;

  let browser = "Unknown";
  if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";

  let os = "Unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return { browser, os };
}

/* ============================================================
   실행
   ============================================================ */
window.onload = async () => {
  await updateVisitorCount();
  await saveVisitorGeoIP();
  listenVisitorCount();
};

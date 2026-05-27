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
   모바일에서도 절대 변하지 않는 visitorKey 생성
   ============================================================ */
async function getVisitorKey() {
  let uuid = null;

  try {
    uuid = localStorage.getItem("visitor_uuid");
    if (!uuid) {
      uuid = generateUUID();
      localStorage.setItem("visitor_uuid", uuid);
    }
  } catch {
    uuid = null;
  }

  if (!uuid) {
    const cookieMatch = document.cookie.match(/visitor_uuid=([^;]+)/);
    if (cookieMatch) uuid = cookieMatch[1];
    else {
      uuid = generateUUID();
      document.cookie = `visitor_uuid=${uuid}; path=/; max-age=31536000`;
    }
  }

  if (!uuid) {
    try {
      uuid = sessionStorage.getItem("visitor_uuid");
      if (!uuid) {
        uuid = generateUUID();
        sessionStorage.setItem("visitor_uuid", uuid);
      }
    } catch {
      uuid = null;
    }
  }

  if (!uuid) uuid = "fallback-" + navigator.userAgent;

  return (await sha256(uuid + "|" + navigator.userAgent)).slice(0, 32);
}

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
   시간대 (0~23)
   ============================================================ */
function getHour() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 60 * 60 * 1000);
  return kst.getHours();
}

/* ============================================================
   브라우저/OS 정보
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
   IP + GeoIP
   ============================================================ */
async function getGeoIP() {
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const ipData = await ipRes.json();
    const ip = ipData.ip;

    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
    const geo = await geoRes.json();

    return {
      ip: ip,
      country: geo.country || "Unknown",
      city: geo.city || "Unknown",
      lat: geo.latitude || null,
      lon: geo.longitude || null
    };
  } catch (e) {
    console.error("GeoIP 오류:", e);
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
   Sharded Counter
   ============================================================ */
const NUM_SHARDS = 20;

/* ============================================================
   방문자 카운트 업데이트 (hourly + browser + os + geoip)
   ============================================================ */
async function updateVisitorCount() {
  const today = getTodayString();
  const hour = getHour();
  const visitorKey = await getVisitorKey();
  const info = getBrowserInfo();

  const dailyRef = db.collection("visitors").doc("daily").collection("days").doc(today);
  const shardRef = db.collection("visitors").doc("counter_shards").collection("shards")
    .doc(String(Math.floor(Math.random() * NUM_SHARDS)));

  /* ⭐ hourly 상위 문서(today) 자동 생성 */
  const hourlyDayRef = db.collection("visitors").doc("hourly").collection(today).doc("_init");
  await hourlyDayRef.set({ created: true }, { merge: true });

  /* ⭐ 시간대별 문서 */
  const hourlyRef = db.collection("visitors").doc("hourly").collection(today).doc(String(hour));

  const browserRef = db.collection("visitors").doc("stats").collection("browser").doc(info.browser);
  const osRef = db.collection("visitors").doc("stats").collection("os").doc(info.os);

  try {
    await db.runTransaction(async (tx) => {
      const dailySnap = await tx.get(dailyRef);
      const shardSnap = await tx.get(shardRef);

      let daily = dailySnap.exists ? dailySnap.data() : {};
      if (!daily || typeof daily !== "object") daily = {};
      if (Object.keys(daily).length === 0) daily = { _init: true };

      if (daily[visitorKey]) return;

      daily[visitorKey] = true;
      tx.set(dailyRef, daily, { merge: true });

      let shardData = shardSnap.exists ? shardSnap.data() : null;
      if (!shardData || shardData.date !== today) {
        shardData = { today: 0, total: shardData ? shardData.total : 0, date: today };
      }

      tx.set(shardRef, {
        today: shardData.today + 1,
        total: shardData.total + 1,
        date: today
      }, { merge: true });

      /* ⭐ 시간대별 증가 */
      tx.set(hourlyRef, {
        count: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });

      /* ⭐ 브라우저 증가 */
      tx.set(browserRef, {
        count: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });

      /* ⭐ OS 증가 */
      tx.set(osRef, {
        count: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });
    });
  } catch (e) {
    console.error("updateVisitorCount 오류:", e);
  }

  /* ============================================================
     GeoIP 저장
     ============================================================ */
  const geo = await getGeoIP();

  if (geo && geo.ip) {
    const geoRef = db.collection("visitors").doc("geoip").collection(today).doc(geo.ip);

    geoRef.set({
      ip: geo.ip,
      country: geo.country,
      city: geo.city,
      lat: geo.lat,
      lon: geo.lon,
      browser: info.browser,
      os: info.os,
      count: firebase.firestore.FieldValue.increment(1)
    }, { merge: true });
  }
}

/* ============================================================
   실시간 방문자 수 합산
   ============================================================ */
function listenVisitorCount() {
  const shardsRef = db.collection("visitors").doc("counter_shards").collection("shards");

  shardsRef.onSnapshot((snapshot) => {
    if (snapshot.empty) return;

    let todaySum = 0;
    let totalSum = 0;
    const today = getTodayString();

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data) return;

      if (data.date === today) todaySum += data.today || 0;
      totalSum += data.total || 0;
    });

    document.getElementById("visitor-today").textContent = todaySum.toLocaleString();
    document.getElementById("visitor-total").textContent = totalSum.toLocaleString();
  });
}

/* ============================================================
   실행
   ============================================================ */
window.onload = () => {
  updateVisitorCount();
  listenVisitorCount();
};

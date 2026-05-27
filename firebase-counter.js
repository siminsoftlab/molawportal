/* ============================================================
   SHA-256 해시
   ============================================================ */
async function sha256(text) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "fallback-" + Math.random().toString(36).slice(2);
  }
}

/* ============================================================
   모바일에서도 절대 실패하지 않는 visitorKey 생성
   ============================================================ */
async function getVisitorKey() {
  let uuid = null;

  try {
    uuid = localStorage.getItem("visitor_uuid");
    if (!uuid) {
      uuid = crypto.randomUUID();
      localStorage.setItem("visitor_uuid", uuid);
    }
  } catch {
    // localStorage 실패 → 쿠키 사용
    try {
      const match = document.cookie.match(/visitor_uuid=([^;]+)/);
      if (match) uuid = match[1];
      else {
        uuid = crypto.randomUUID();
        document.cookie = `visitor_uuid=${uuid}; path=/; max-age=31536000`;
      }
    } catch {
      // 쿠키도 실패 → sessionStorage
      try {
        uuid = sessionStorage.getItem("visitor_uuid");
        if (!uuid) {
          uuid = crypto.randomUUID();
          sessionStorage.setItem("visitor_uuid", uuid);
        }
      } catch {
        // 모든 저장 실패 → userAgent 기반 fallback
        uuid = "fallback-" + navigator.userAgent + "-" + Math.random();
      }
    }
  }

  return (await sha256(uuid)).slice(0, 32);
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
   GeoIP (실패해도 전체 중단되지 않도록)
   ============================================================ */
async function getGeoIP() {
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const ipData = await ipRes.json();
    const ip = ipData.ip;

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
    return null; // 실패해도 방문자 카운트는 정상 증가
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
   방문자 카운트 업데이트 (모바일 완전 대응)
   ============================================================ */
async function updateVisitorCount() {
  try {
    const today = getTodayString();
    const hour = getHour();
    const visitorKey = await getVisitorKey();
    const info = getBrowserInfo();

    const dailyRef = db.collection("visitors").doc("daily").collection("days").doc(today);
    const shardRef = db.collection("visitors").doc("counter_shards").collection("shards")
      .doc(String(Math.floor(Math.random() * NUM_SHARDS)));

    const hourlyDayRef = db.collection("visitors").doc("hourly").collection(today).doc("_init");
    await hourlyDayRef.set({ created: true }, { merge: true });

    const hourlyRef = db.collection("visitors").doc("hourly").collection(today).doc(String(hour));

    const browserRef = db.collection("visitors").doc("stats").collection("browser").doc(info.browser);
    const osRef = db.collection("visitors").doc("stats").collection("os").doc(info.os);

    await browserRef.set({ count: 0 }, { merge: true });
    await osRef.set({ count: 0 }, { merge: true });

    await db.runTransaction(async (tx) => {
      const dailySnap = await tx.get(dailyRef);
      const shardSnap = await tx.get(shardRef);

      let daily = dailySnap.exists ? dailySnap.data() : {};
      if (!daily || typeof daily !== "object") daily = {};
      if (!daily._init) daily._init = true;

      if (!daily[visitorKey]) {
        daily[visitorKey] = true;
        tx.set(dailyRef, daily, { merge: true });

        let shardData = shardSnap.exists ? shardSnap.data() : {};
        if (shardData.date !== today) {
          shardData = { today: 0, total: shardData.total || 0, date: today };
        }

        tx.set(shardRef, {
          today: shardData.today + 1,
          total: shardData.total + 1,
          date: today
        }, { merge: true });

        tx.set(hourlyRef, {
          count: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });

        tx.set(browserRef, {
          count: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });

        tx.set(osRef, {
          count: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
      }
    });

    /* GeoIP 저장 (실패해도 무시) */
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

  } catch (e) {
    console.error("🔥 모바일 대응 updateVisitorCount 오류:", e);
  }
}

/* ============================================================
   실행 (모바일 캐시 방지)
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  updateVisitorCount();
});

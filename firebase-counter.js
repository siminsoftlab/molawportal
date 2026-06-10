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
   방문자 업데이트 (고유 방문자 기반)
============================================================ */
async function updateVisitorCount() {
  const today = getTodayString();
  const visitorKey = getVisitorKey();

  try {
    // 오늘 방문자 기록
    await db.collection("visitors")
      .doc("daily")
      .collection("days")
      .doc(today)
      .collection("visitors")
      .doc(visitorKey)
      .set({ visited: true, timestamp: Date.now() }, { merge: true });

    // 전체 방문자 기록
    await db.collection("visitors")
      .doc("total")
      .collection("visitors")
      .doc(visitorKey)
      .set({ visited: true, firstVisit: Date.now() }, { merge: true });

    // 조회수 샤드 증가
    const shardId = Math.floor(Math.random() * 20).toString();
    await db.collection("visitors")
      .doc("counter_shards")
      .collection("shards")
      .doc(shardId)
      .set(
        { total: firebase.firestore.FieldValue.increment(1) },
        { merge: true }
      );
  } catch (err) {
    console.error("방문자 업데이트 실패:", err);
  }
}

/* ============================================================
   방문자 GeoIP 저장 (ipwho.is 사용 — CORS 문제 없음)
============================================================ */
async function saveVisitorGeoIP() {
  const today = getTodayString();
  const visitorKey = getVisitorKey();

  try {
    const geoipFn = firebase.functions().httpsCallable("geoip");
    const result = await geoipFn();

    if (!result.data.success) {
      console.error("GeoIP 서버 오류:", result.data.error);
      return;
    }

    const { ip, country, city } = result.data;
    const { browser, os } = getBrowserInfo();

    await db.collection("visitors")
      .doc("geoip")
      .collection(today)
      .doc(visitorKey)
      .set(
        {
          ip,
          country,
          city,
          browser,
          os,
          timestamp: Date.now()
        },
        { merge: true }
      );

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
  try {
    await updateVisitorCount();
  } catch (e) {
    console.error("updateVisitorCount 실행 오류:", e);
  }

  try {
    await saveVisitorGeoIP();
  } catch (e) {
    console.error("saveVisitorGeoIP 실행 오류:", e);
  }

  try {
    listenVisitorCount();
  } catch (e) {
    console.error("listenVisitorCount 실행 오류:", e);
  }
};
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

  dailyRef.onSnapshot((snap) => {
    const el = document.getElementById("visitor-today");
    if (el) el.textContent = snap.size;
  });

  totalRef.onSnapshot((snap) => {
    const el = document.getElementById("visitor-total");
    if (el) el.textContent = snap.size;
  });
}

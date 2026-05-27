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
   날짜/시간
   ============================================================ */
function getTodayString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 3600000).toISOString().slice(0, 10);
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
  const visitorKey = getVisitorKey();

  /* ⭐ 오늘 방문자 기록 */
  await db.collection("visitors")
    .doc("daily")
    .collection("days")
    .doc(today)
    .set({ [visitorKey]: true, _init: true }, { merge: true });

  /* ⭐ 전체 방문자 기록 (고유 방문자) */
  await db.collection("visitors")
    .doc("total")
    .collection("visitors")
    .doc(visitorKey)
    .set({ visited: true }, { merge: true });

  /* ⭐ 샤드는 조회수용으로 유지 (증가) */
  const shardId = Math.floor(Math.random() * 20).toString();
  await db.collection("visitors")
    .doc("counter_shards")
    .collection("shards")
    .doc(shardId)
    .set({ total: firebase.firestore.FieldValue.increment(1) }, { merge: true });
}

/* ============================================================
   실시간 방문자 표시
   ============================================================ */
function listenVisitorCount() {
  const today = getTodayString();

  /* 오늘 방문자 */
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

  /* 전체 방문자 */
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
  await updateVisitorCount();
  listenVisitorCount();
};

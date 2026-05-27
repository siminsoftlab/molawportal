/* ============================================================
   🔥 Firebase 방문자 카운터 — visitors/daily/날짜 구조 자동 생성 버전
   ============================================================ */

// SHA-256 해시 생성
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
// 방문자 식별자 생성 (UUID + UA 기반)
async function getVisitorKey() {
  try {
    // 1) localStorage에서 기존 UUID 가져오기
    let uuid = localStorage.getItem("visitor_uuid");

    // 2) 없으면 새로 생성해서 저장
    if (!uuid) {
      uuid = generateUUID();
      localStorage.setItem("visitor_uuid", uuid);
    }

    // 3) UA와 결합해서 해시 (선택: UA 안 써도 됨)
    const raw = uuid + "|" + navigator.userAgent;

    // 기존 sha256 재사용
    return (await sha256(raw)).slice(0, 32);
  } catch (e) {
    console.error("getVisitorKey 오류:", e);

    // localStorage가 막힌 환경 대비: UA만으로라도 생성
    const fallbackRaw = navigator.userAgent + "|FALLBACK";
    return (await sha256(fallbackRaw)).slice(0, 32);
  }
}

// 방문자 식별자 생성 (IP + UA)
/*
async function getVisitorKey() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    const raw = data.ip + "|" + navigator.userAgent;
    return (await sha256(raw)).slice(0, 32);
  } catch {
    const raw = "NOIP|" + navigator.userAgent;
    return (await sha256(raw)).slice(0, 32);
  }
}*/

// 오늘 날짜 (KST)
function getTodayString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// Firebase 설정
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

// 🔥 캐시 최소값 + 오프라인 저장 비활성화
firebase.firestore().settings({ cacheSizeBytes: 1048576 });
firebase.firestore().clearPersistence().catch(() => {});

const db = firebase.firestore();

/* ============================================================
   🔥 visitors/daily/날짜 구조로 정확히 생성되는 트랜잭션
   ============================================================ */
async function updateVisitorCount() {
  const today = getTodayString();
  const visitorKey = await getVisitorKey();

  const counterRef = db.collection("visitors").doc("counter");

  // 🔥 daily 컬렉션을 visitors 안에 정확히 생성
  const dailyRef = db
    .collection("visitors")
    .doc("daily")
    .collection("days")
    .doc(today);

  try {
    await db.runTransaction(async (tx) => {
      const counterSnap = await tx.get(counterRef);
      const dailySnap = await tx.get(dailyRef);

      let counter = counterSnap.exists
        ? counterSnap.data()
        : null;

      let daily = dailySnap.exists ? dailySnap.data() : {};

      // 날짜 변경 시 초기화
      if (!counter || counter.date !== today) {
        counter = {
          today: 0,
          total: counter ? counter.total : 0,
          date: today
        };
      }

      // 중복 방문자 체크
      if (daily[visitorKey]) return;

      // daily 기록
      daily[visitorKey] = true;

      // 쓰기
      tx.set(dailyRef, daily, { merge: true });
      tx.set(
        counterRef,
        {
          today: counter.today + 1,
          total: counter.total + 1,
          date: today
        },
        { merge: true }
      );
    });
  } catch (e) {
    console.error("🔥 updateVisitorCount 오류:", e);
  }
}

/* ============================================================
   🔥 실시간 반영
   ============================================================ */
function listenVisitorCount() {
  db.collection("visitors")
    .doc("counter")
    .onSnapshot((doc) => {
      if (!doc.exists) return;

      const data = doc.data();
      const todayEl = document.getElementById("visitor-today");
      const totalEl = document.getElementById("visitor-total");

      if (todayEl) todayEl.textContent = data.today.toLocaleString();
      if (totalEl) totalEl.textContent = data.total.toLocaleString();
    });
}
// RFC4122 버전4 UUID 생성
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ============================================================
   🔥 실행
   ============================================================ */
updateVisitorCount();
listenVisitorCount();

/* ============================================================
   🔥 Firebase 방문자 카운터 — 최종 안정화 통합본
   ============================================================ */

// SHA-256 해시 생성
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// 방문자 식별자 생성 (IP + UA)
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
}

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
const db = firebase.firestore();

/* ============================================================
   🔥 방문자 증가 + 날짜 자동 초기화 (트랜잭션 기반)
   ============================================================ */
async function updateVisitorCount() {
  const today = getTodayString();
  const visitorKey = await getVisitorKey();

  const counterRef = db.collection("visitors").doc("counter");
  const dailyRef = db.collection("daily").doc(today);

  try {
    await db.runTransaction(async (tx) => {
      // 1) 모든 읽기 먼저
      const counterSnap = await tx.get(counterRef);
      const dailySnap = await tx.get(dailyRef);

      // counter 초기값 설정 (문서가 없으면 생성하지 않음)
      let counter = counterSnap.exists
        ? counterSnap.data()
        : null;

      // daily 초기값 설정
      let daily = dailySnap.exists ? dailySnap.data() : {};

      // 날짜 변경 시 초기화
      if (!counter || counter.date !== today) {
        counter = { today: 0, total: counter ? counter.total : 0, date: today };
      }

      // 중복 방문자 체크
      if (daily[visitorKey]) return;

      // daily 기록
      daily[visitorKey] = true;

      // 2) 모든 쓰기
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

/* ============================================================
   🔥 실행
   ============================================================ */
updateVisitorCount();
listenVisitorCount();

/* ============================================================
   🔥 Firebase 방문자 카운터 최종 완성본 (안정화 버전)
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
   🔥 counter 문서 자동 복구 (NaN/문자열/undefined 방지)
   ============================================================ */
async function restoreCounter(counterRef, today) {
  const snap = await counterRef.get();

  if (!snap.exists) {
    const init = { today: 0, total: 0, date: today };
    await counterRef.set(init);
    return init;
  }

  const data = snap.data();

  const fixed = {
    today: typeof data.today === "number" ? data.today : 0,
    total: typeof data.total === "number" ? data.total : 0,
    date: typeof data.date === "string" ? data.date : today
  };

  await counterRef.set(fixed, { merge: true });
  return fixed;
}

/* ============================================================
   🔥 daily 문서 자동 생성
   ============================================================ */
async function ensureDaily(today) {
  const dailyRef = db.collection("daily").doc(today);
  const snap = await dailyRef.get();

  if (!snap.exists) {
    await dailyRef.set({ init: true });
    console.log("🔥 daily 문서 자동 생성:", today);
  }

  return dailyRef;
}

/* ============================================================
   🔥 방문자 증가 + 날짜 자동 초기화
   ============================================================ */
async function updateVisitorCount() {
  const today = getTodayString();
  const visitorKey = await getVisitorKey();

  const counterRef = db.collection("visitors").doc("counter");
  const dailyRef = await ensureDaily(today);

  try {
    // 1) counter 자동 복구
    let counter = await restoreCounter(counterRef, today);

    // 2) 날짜 자동 초기화
    if (counter.date !== today) {
      counter.today = 0;
      counter.date = today;
      await counterRef.update({ today: 0, date: today });
    }

    // 3) daily 데이터 가져오기
    const dailySnap = await dailyRef.get();
    const todayData = dailySnap.exists ? dailySnap.data() : {};

    // 4) 중복 방문자 체크
    if (todayData[visitorKey]) return;

    // 5) daily에 방문자 기록
    todayData[visitorKey] = true;
    await dailyRef.set(todayData, { merge: true });

    // 6) counter 증가
    await counterRef.update({
      today: counter.today + 1,
      total: counter.total + 1,
      date: today
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

// 🔥 SHA-256 해시 생성 함수
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// 🔥 방문자 식별자 생성 (IP + UA → 해시)
async function getVisitorKey() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    const ip = data.ip;
    const ua = navigator.userAgent;
    const raw = ip + "|" + ua;
    const hash = await sha256(raw);
    return hash.slice(0, 32);
  } catch (e) {
    const ua = navigator.userAgent;
    const hash = await sha256("NOIP|" + ua);
    return hash.slice(0, 32);
  }
}

// 🔥 Firebase 설정
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

// 🔥 오늘 날짜 (KST 기준)
function getTodayString() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 60 * 60 * 1000));
  return kst.toISOString().slice(0, 10);
}

// 🔥 날짜 자동 초기화 + 방문자 증가
async function updateVisitorCount() {
  const today = getTodayString();
  const visitorKey = await getVisitorKey();

  const dailyRef = db.collection("daily").doc(today);
  const counterRef = db.collection("visitors").doc("counter");

  try {
    let counterSnap = await counterRef.get();

    // counter 문서 없으면 생성
    if (!counterSnap.exists) {
      await counterRef.set({
        today: 0,
        total: 0,
        date: today
      });
      counterSnap = await counterRef.get();
    }

    let counter = counterSnap.data();

    // 🔥 날짜 자동 초기화 (가장 먼저)
    if (counter.date !== today) {
      await counterRef.update({
        today: 0,
        date: today
      });
      counter = { ...counter, today: 0, date: today };
    }

    // 🔥 daily 문서 생성 (날짜 초기화 후)
    const dailySnap = await dailyRef.get();
    const todayData = dailySnap.exists ? dailySnap.data() : {};

    // 🔥 방문자 중복 체크 (가장 마지막)
    if (todayData[visitorKey]) return;

    // 새 방문자 저장
    todayData[visitorKey] = true;
    await dailyRef.set(todayData, { merge: true });

    // counter 증가
    await counterRef.update({
      today: counter.today + 1,
      total: counter.total + 1,
      date: today
    });

  } catch (e) {
    console.error("🔥 방문자 증가 오류:", e);
  }
}


// 🔥 실시간 방문자 수 반영
function listenVisitorCount() {
  const docRef = db.collection("visitors").doc("counter");

  docRef.onSnapshot((doc) => {
    if (!doc.exists) return;

    const data = doc.data();

    const todayEl = document.getElementById("visitor-today");
    const totalEl = document.getElementById("visitor-total");

    if (todayEl && totalEl) {
      todayEl.textContent = data.today.toLocaleString();
      totalEl.textContent = data.total.toLocaleString();
    }
  });
}

updateVisitorCount();
listenVisitorCount();

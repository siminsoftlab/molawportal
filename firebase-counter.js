// 🔥 Firestore 필드명에서 사용할 수 없는 문자 제거
function sanitize(str) {
  return str.replace(/[\/\.\#\$

\[\]

\s]/g, "_");
}

// 🔥 방문자 식별자 생성 (IP + UA)
async function getVisitorKey() {
  const res = await fetch("https://api.ipify.org?format=json");
  const data = await res.json();
  const ip = data.ip;

  const ua = navigator.userAgent;
  const safeUA = sanitize(ua);

  return `${ip}_${safeUA}`;
}

// 🔥 숫자 카운트업 애니메이션
function animateCount(el, target) {
  let start = 0;
  const duration = 800;
  const step = Math.ceil(target / (duration / 16));

  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      start = target;
      clearInterval(timer);
    }
    el.textContent = start.toLocaleString();
  }, 16);
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

// 🔥 Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 🔥 오늘 날짜
function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

// 🔥 방문자 증가 (IP + UA 기반)
async function updateVisitorCount() {
  const today = getTodayString();
  const visitorKey = await getVisitorKey(); // "IP_UA" 형태

  const dailyRef = db.collection("daily").doc(today);
  const counterRef = db.collection("visitors").doc("counter");

  try {
    const dailySnap = await dailyRef.get();
    const counterSnap = await counterRef.get();

    if (!counterSnap.exists) return;

    const counter = counterSnap.data();
    const todayData = dailySnap.exists ? dailySnap.data() : {};

    // 이미 방문한 사용자면 today 증가 X
    if (todayData[visitorKey]) {
      return;
    }

    // 새 방문자 → daily에 저장
    todayData[visitorKey] = true;
    await dailyRef.set(todayData, { merge: true });

    // counter 업데이트
    await counterRef.update({
      today: counter.today + 1,
      total: counter.total + 1,
      date: today
    });

  } catch (e) {
    console.error("🔥 방문자 증가 오류:", e);
  }
}

// 🔥 실시간 방문자 수 반영 + 카운트업
function listenVisitorCount() {
  const docRef = db.collection("visitors").doc("counter");

  docRef.onSnapshot((doc) => {
    console.log("counter snapshot:", doc.exists, doc.data());  // ← 추가
    if (!doc.exists) return;

    const data = doc.data();

    const todayEl = document.getElementById("visitor-today");
    const totalEl = document.getElementById("visitor-total");

    if (todayEl && totalEl) {
      animateCount(todayEl, data.today);
      animateCount(totalEl, data.total);
    }
  });
}

// 🔥 실행 (sessionStorage 방식 제거)
updateVisitorCount();   // IP + UA 기반 방문자 체크
listenVisitorCount();   // 실시간 반영 + 카운트업

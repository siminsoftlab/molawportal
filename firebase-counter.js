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
  const res = await fetch("https://api.ipify.org?format=json");
  const data = await res.json();
  const ip = data.ip;

  const ua = navigator.userAgent;
  const raw = ip + "|" + ua;

  const hash = await sha256(raw);
  return hash.slice(0, 32);   // Firestore 필드명으로 안전한 32자리 해시
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

// 🔥 방문자 증가 (해시 기반)
async function updateVisitorCount() {
  const today = getTodayString();
  const visitorKey = await getVisitorKey();

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

// 🔥 실행
updateVisitorCount();   // 해시 기반 방문자 체크
listenVisitorCount();   // 실시간 반영 + 카운트업

/****************************************************
 *  Firebase Firestore 방문자 카운트 전용 JS
 *  - GitHub Pages에서 사용 가능
 *  - Firestore 컬렉션: visitors
 *  - 문서: counter
 *  - 필드: today(number), total(number), date(string)
 ****************************************************/
function hasVisitedToday() {
  const today = new Date().toISOString().slice(0, 10);
  const saved = sessionStorage.getItem("visited-date");
  return saved === today;
}

function setVisitedToday() {
  const today = new Date().toISOString().slice(0, 10);
  sessionStorage.setItem("visited-date", today);
}
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


// 🔥 1. Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyACfN4_r2hUAn1NQPWRZzpegjyIESYGK3I",
  authDomain: "molawcounter.firebaseapp.com",
  projectId: "molawcounter",
  storageBucket: "molawcounter.firebasestorage.app",
  messagingSenderId: "989958208701",
  appId: "1:989958208701:web:16bd53eed95276f5d4cbd4",
  measurementId: "G-D4W34NBWKT"
};

// 🔥 2. Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 🔥 3. 오늘 날짜 문자열 생성
function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

// 🔥 4. 방문자 증가 (1회 실행)
async function updateVisitorCount() {
  const docRef = db.collection("visitors").doc("counter");

  try {
    const docSnap = await docRef.get();
    if (!docSnap.exists) return;

    const data = docSnap.data();
    const todayStr = getTodayString();

    let newToday = data.today;
    let newTotal = data.total + 1;
    let newDate = data.date;

    if (data.date !== todayStr) {
      newToday = 1;
      newDate = todayStr;
    } else {
      newToday += 1;
    }

    await docRef.update({
      today: newToday,
      total: newTotal,
      date: newDate
    });

  } catch (e) {
    console.error("🔥 방문자 증가 오류:", e);
  }
}

// 🔥 5. 실시간 방문자 수 반영
function listenVisitorCount() {
  const docRef = db.collection("visitors").doc("counter");

  docRef.onSnapshot((doc) => {
    if (!doc.exists) return;

    const data = doc.data();

    const todayEl = document.getElementById("visitor-today");
    const totalEl = document.getElementById("visitor-total");

    if (todayEl) todayEl.textContent = data.today.toLocaleString();
    if (totalEl) totalEl.textContent = data.total.toLocaleString();
  });
}

// 🔥 6. 실행
if (!hasVisitedToday()) {
  updateVisitorCount();   // 방문자 1 증가
  setVisitedToday();
}

listenVisitorCount();   // 실시간 반영
animateCount(document.getElementById("visitor-today"), data.today);
animateCount(document.getElementById("visitor-total"), data.total);

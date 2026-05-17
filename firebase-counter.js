/****************************************************
 *  Firebase Firestore 방문자 카운트 전용 JS
 *  - GitHub Pages에서 사용 가능
 *  - Firestore 컬렉션: visitors
 *  - 문서: counter
 *  - 필드: today(number), total(number), date(string)
 ****************************************************/

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

// 🔥 4. 방문자 카운트 업데이트
async function updateVisitorCount() {
  const docRef = db.collection("visitors").doc("counter");

  try {
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.error("❌ Firestore 문서가 존재하지 않습니다.");
      return;
    }

    const data = docSnap.data();
    const todayStr = getTodayString();

    let newToday = data.today;
    let newTotal = data.total + 1;
    let newDate = data.date;

    // 날짜 변경 시 today 초기화
    if (data.date !== todayStr) {
      newToday = 1;
      newDate = todayStr;
    } else {
      newToday += 1;
    }

    // Firestore 업데이트
    await docRef.update({
      today: newToday,
      total: newTotal,
      date: newDate
    });

    // ⭐ 화면 표시 — 천 단위 구분자 적용
    const todayEl = document.getElementById("visitor-today");
    const totalEl = document.getElementById("visitor-total");

    if (todayEl) todayEl.textContent = newToday.toLocaleString();
    if (totalEl) totalEl.textContent = newTotal.toLocaleString();

  } catch (error) {
    console.error("🔥 방문자 카운트 업데이트 오류:", error);
  }
}

// 🔥 5. 페이지 로드 시 실행
updateVisitorCount();

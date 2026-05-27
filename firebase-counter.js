/* ============================================================
   🔥 Firebase 방문자 카운터 — 최종 통합본 (모바일 완전 대응)
   ============================================================ */

// SHA-256 해시 생성
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// RFC4122 버전4 UUID 생성
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 0xf;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ============================================================
   🔥 모바일에서도 절대 변하지 않는 visitorKey 생성
   ============================================================ */
async function getVisitorKey() {
  let uuid = null;

  /* 1) localStorage 시도 */
  try {
    uuid = localStorage.getItem("visitor_uuid");
    if (!uuid) {
      uuid = generateUUID();
      localStorage.setItem("visitor_uuid", uuid);
    }
  } catch {
    uuid = null;
  }

  /* 2) localStorage 실패 → 쿠키 시도 */
  if (!uuid) {
    const cookieMatch = document.cookie.match(/visitor_uuid=([^;]+)/);
    if (cookieMatch) {
      uuid = cookieMatch[1];
    } else {
      uuid = generateUUID();
      document.cookie = `visitor_uuid=${uuid}; path=/; max-age=31536000`;
    }
  }

  /* 3) 쿠키도 실패 → sessionStorage */
  if (!uuid) {
    try {
      uuid = sessionStorage.getItem("visitor_uuid");
      if (!uuid) {
        uuid = generateUUID();
        sessionStorage.setItem("visitor_uuid", uuid);
      }
    } catch {
      uuid = null;
    }
  }

  /* 4) 그래도 실패 → UA 기반 fallback */
  if (!uuid) {
    uuid = "fallback-" + navigator.userAgent;
  }

  // 🔥 Math.random 제거 → visitorKey 고정
  const raw = uuid + "|" + navigator.userAgent;
  return (await sha256(raw)).slice(0, 32);
}

/* ============================================================
   🔥 날짜 (KST)
   ============================================================ */
function getTodayString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/* ============================================================
   🔥 Firebase 초기화
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
firebase.firestore().settings({ cacheSizeBytes: 1048576 });
firebase.firestore().clearPersistence().catch(() => {});
const db = firebase.firestore();

/* ============================================================
   🔥 Sharded Counter 설정
   ============================================================ */
const NUM_SHARDS = 20;

// 최초 1회만 실행
// initCounterShards();
async function initCounterShards() {
  const batch = db.batch();
  const today = getTodayString();

  for (let i = 0; i < NUM_SHARDS; i++) {
    const shardRef = db
      .collection("visitors")
      .doc("counter_shards")
      .collection("shards")
      .doc(String(i));

    batch.set(
      shardRef,
      { today: 0, total: 0, date: today },
      { merge: true }
    );
  }

  await batch.commit();
  console.log("Sharded counter 초기화 완료");
}

/* ============================================================
   🔥 방문자 카운트 업데이트 (daily + shard)
   ============================================================ */
async function updateVisitorCount() {
  const today = getTodayString();
  const visitorKey = await getVisitorKey();

  const dailyRef = db
    .collection("visitors")
    .doc("daily")
    .collection("days")
    .doc(today);

  const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
  const shardRef = db
    .collection("visitors")
    .doc("counter_shards")
    .collection("shards")
    .doc(shardId);

  try {
    await db.runTransaction(async (tx) => {
      const dailySnap = await tx.get(dailyRef);
      const shardSnap = await tx.get(shardRef);

      /* 🔥 daily 문서를 항상 정상 객체로 강제 초기화 */
      let daily = dailySnap.exists && typeof dailySnap.data() === "object"
        ? dailySnap.data()
        : {};

      if (daily === null || Array.isArray(daily)) {
        daily = {};
      }

      // 빈 객체면 merge 실패하므로 기본 필드 추가
      if (Object.keys(daily).length === 0) {
        daily = { _init: true };
      }

      // 이미 방문한 사용자면 종료
      if (daily[visitorKey]) return;

      // daily 기록
      daily[visitorKey] = true;
      tx.set(dailyRef, daily, { merge: true });

      /* 🔥 샤드 업데이트 */
      let shardData = shardSnap.exists ? shardSnap.data() : null;

      if (!shardData || shardData.date !== today) {
        shardData = {
          today: 0,
          total: shardData ? shardData.total : 0,
          date: today
        };
      }

      tx.set(
        shardRef,
        {
          today: shardData.today + 1,
          total: shardData.total + 1,
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
   🔥 실시간 방문자 수 합산
   ============================================================ */
function listenVisitorCount() {
  const shardsRef = db
    .collection("visitors")
    .doc("counter_shards")
    .collection("shards");

  shardsRef.onSnapshot((snapshot) => {
    if (snapshot.empty) return;

    let todaySum = 0;
    let totalSum = 0;
    const today = getTodayString();

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data) return;

      if (data.date === today) {
        todaySum += data.today || 0;
      }
      totalSum += data.total || 0;
    });

    document.getElementById("visitor-today").textContent =
      todaySum.toLocaleString();
    document.getElementById("visitor-total").textContent =
      totalSum.toLocaleString();
  });
}

/* ============================================================
   🔥 실행
   ============================================================ */
window.onload = () => {
  updateVisitorCount();
  listenVisitorCount();
};

/* ============================================================
   Firebase v9 모듈 import
============================================================ */
import { db } from "/firebase-init.js";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  increment
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* ============================================================
   고유 방문자 키 생성
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
   날짜 (KST 기준)
============================================================ */
function getTodayString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 3600000).toISOString().slice(0, 10);
}

/* ============================================================
   방문자 업데이트 (admin.js와 호환되는 구조)
============================================================ */
async function updateVisitorCount() {
  const today = getTodayString();
  const visitorKey = getVisitorKey();

  try {
    /* ------------------------------
       1) Daily 방문자 로그 저장
       admin.js가 읽을 수 있는 구조:
       visitors / daily / days / {date}
         ├── uuid1: true
         ├── uuid2: true
         └── _init: true
    ------------------------------ */
    await setDoc(
      doc(db, "visitors", "daily", "days", today),
      { [visitorKey]: true, _init: true },
      { merge: true }
    );

    /* ------------------------------
       2) 전체 방문자 기록
    ------------------------------ */
    await setDoc(
      doc(db, "visitors", "total", "visitors", visitorKey),
      { visited: true, firstVisit: Date.now() },
      { merge: true }
    );

    /* ------------------------------
       3) 샤드 증가
    ------------------------------ */
    const shardId = Math.floor(Math.random() * 20).toString();
    await setDoc(
      doc(db, "visitors", "counter_shards", "shards", shardId),
      { total: increment(1) },
      { merge: true }
    );

  } catch (err) {
    console.error("방문자 업데이트 실패:", err);
  }
}

/* ============================================================
   GeoIP 저장 (admin.js와 호환되는 구조)
============================================================ */
async function saveVisitorGeoIP() {
  try {
    const response = await fetch("https://molawcounter.web.app/api/geoip");

    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log("GeoIP 응답:", data);

    const today = getTodayString();

    // 저장 경로:
    // visitors / geoip / {date} / {timestamp}
    await setDoc(
      doc(db, "visitors", "geoip", today, String(Date.now())),
      {
        ip: data.ip || null,
        country: data.country || null,
        city: data.city || null,
        timestamp: Date.now()
      }
    );

  } catch (err) {
    console.error("GeoIP 저장 실패:", err);
  }
}

/* ============================================================
   실시간 방문자 표시
============================================================ */
function listenVisitorCount() {
  const today = getTodayString();

  // Daily 문서 참조
  const dailyDocRef = doc(db, "visitors", "daily", "days", today);

  // 전체 방문자 컬렉션
  const totalRef = collection(db, "visitors", "total", "visitors");

  // Daily 실시간
  onSnapshot(dailyDocRef, (snap) => {
    const data = snap.data() || {};
    const count = Object.keys(data).filter(k => k !== "_init").length;

    const el = document.getElementById("visitor-today");
    if (el) el.textContent = count;
  });

  // Total 실시간
  onSnapshot(totalRef, (snap) => {
    const el = document.getElementById("visitor-total");
    if (el) el.textContent = snap.size;
  });
}

/* ============================================================
   실행
============================================================ */
window.onload = async () => {
  try {
    await updateVisitorCount();
  } catch (e) {
    console.error("updateVisitorCount 실행 오류:", e);
  }

  try {
    await saveVisitorGeoIP();
  } catch (e) {
    console.error("saveVisitorGeoIP 실행 오류:", e);
  }

  try {
    listenVisitorCount();
  } catch (e) {
    console.error("listenVisitorCount 실행 오류:", e);
  }
};

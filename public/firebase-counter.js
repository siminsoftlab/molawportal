/* ============================================================
   Firebase v9 모듈 import
============================================================ */
import { db } from "./firebase-init.js";
import {
  collection,
  doc,
  setDoc,
  getFirestore,
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
   방문자 업데이트
============================================================ */
async function updateVisitorCount() {
  const today = getTodayString();
  const visitorKey = getVisitorKey();

  try {
    // 오늘 방문자 기록
    await setDoc(
      doc(db, "visitors", "daily", "days", today, "visitors", visitorKey),
      { visited: true, timestamp: Date.now() },
      { merge: true }
    );

    // 전체 방문자 기록
    await setDoc(
      doc(db, "visitors", "total", "visitors", visitorKey),
      { visited: true, firstVisit: Date.now() },
      { merge: true }
    );

    // 샤드 증가
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
   GeoIP 저장 (Firebase Hosting 필요)
============================================================ */
async function saveVisitorGeoIP() {
  try {
    const response = await fetch("https://molawcounter.web.app/api/geoip");

    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log("GeoIP 응답:", data);
  } catch (err) {
    console.error("GeoIP 저장 실패:", err);
  }
}

/* ============================================================
   실시간 방문자 표시
============================================================ */
function listenVisitorCount() {
  const today = getTodayString();

  const dailyRef = collection(db, "visitors", "daily", "days", today, "visitors");
  const totalRef = collection(db, "visitors", "total", "visitors");

  onSnapshot(dailyRef, (snap) => {
    const el = document.getElementById("visitor-today");
    if (el) el.textContent = snap.size;
  });

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

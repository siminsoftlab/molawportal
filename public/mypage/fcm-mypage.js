// fcm-mypage.js
import { app, db, auth } from "/firebase-init.js";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// HTML 요소
const banner = document.getElementById("pushBanner");
const allowBtn = document.getElementById("pushAllow");
const laterBtn = document.getElementById("pushLater");

const pushStatus = document.getElementById("pushStatus");
const pushSettingBtn = document.getElementById("pushSettingBtn");

// VAPID KEY
const vapidKey =
  "BFr4O61FjxX4rvg9O6OV7_SZ0gHyEyHn8UwF0SvYD1OEcMTQ4IbQ5q1ytU4OEOzB_sKdY0tHX0-Qi1C0gMTBD7M";

// Firestore 저장
async function saveTokenToFirestore(token) {
  const user = auth.currentUser;
  if (!user) return;

  const tokenRef = doc(db, `users/${user.uid}/fcmTokens/${token}`);

  await setDoc(tokenRef, {
    token,
    createdAt: serverTimestamp()
  });
}

// 권한 요청 + 토큰 발급
async function requestPermissionAndGetToken(messaging) {
  try {
    const permission = await Notification.requestPermission();

    updateStatusText();

    if (permission !== "granted") return;

    // 서비스워커 준비될 때까지 대기
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (token) {
      await saveTokenToFirestore(token);
      banner.style.display = "none";
    }
  } catch (err) {
    console.error("FCM 오류:", err);
  }
}

// 상태 텍스트 업데이트
function updateStatusText() {
  const perm = Notification.permission;

  if (perm === "granted") {
    pushStatus.textContent = "알림 상태: 허용됨 ✔";
  } else if (perm === "denied") {
    pushStatus.textContent = "알림 상태: 차단됨 ❌ (브라우저 설정에서 변경 필요)";
  } else {
    pushStatus.textContent = "알림 상태: 미요청 ⚠️";
  }
}

// 초기화
async function initFCM() {
  const supported = await isSupported();
  if (!supported) return;

  // 서비스워커 등록
  await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const messaging = getMessaging(app);

  // 상태 표시
  updateStatusText();

  // FCM 미허용 상태일 때만 배너 표시
  if (Notification.permission === "default") {
    banner.style.display = "block";
  }

  // 배너 버튼
  allowBtn.addEventListener("click", () => {
    requestPermissionAndGetToken(messaging);
  });

  laterBtn.addEventListener("click", () => {
    banner.style.display = "none";
  });

  // 전체 알림 설정 버튼
  pushSettingBtn.addEventListener("click", () => {
    requestPermissionAndGetToken(messaging);
  });

  // 포그라운드 메시지
  onMessage(messaging, (payload) => {
    console.log("포그라운드 메시지:", payload);
  });
}

initFCM();

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

    if (permission !== "granted") {
      banner.style.display = "none";
      return;
    }

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

// 초기화
async function initFCM() {
  const supported = await isSupported();
  if (!supported) return;

  const messaging = getMessaging(app);

  // 서비스워커 등록
  await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  // 권한 상태에 따라 배너 표시
  if (Notification.permission === "default") {
    banner.style.display = "block";
  }

  // 버튼 이벤트
  allowBtn.addEventListener("click", () => {
    requestPermissionAndGetToken(messaging);
  });

  laterBtn.addEventListener("click", () => {
    banner.style.display = "none";
  });

  // 포그라운드 메시지
  onMessage(messaging, (payload) => {
    console.log("포그라운드 메시지:", payload);
  });
}

initFCM();

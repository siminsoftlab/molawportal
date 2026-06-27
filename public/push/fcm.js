// /fcm.js
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

// ⭐ Firebase 콘솔에서 발급한 VAPID KEY 입력
const vapidKey =
  "BFr4O61FjxX4rvg9O6OV7_SZ0gHyEyHn8UwF0SvYD1OEcMTQ4IbQ5q1ytU4OEOzB_sKdY0tHX0-Qi1C0gMTBD7M";

// HTML 요소
const statusEl = document.getElementById("fcm-status");
const permissionBtn = document.getElementById("fcm-permission-btn");
const tokenTextarea = document.getElementById("fcm-token");
const messageLogEl = document.getElementById("fcm-message-log");

// -------------------------------------------------------------
// 🔥 Firestore에 FCM 토큰 저장
// -------------------------------------------------------------
async function saveTokenToFirestore(token) {
  const user = auth.currentUser;
  if (!user) {
    console.warn("로그인된 사용자가 없어 토큰 저장을 건너뜀");
    return;
  }

  const tokenRef = doc(db, `users/${user.uid}/fcmTokens/${token}`);

  await setDoc(tokenRef, {
    token,
    createdAt: serverTimestamp()
  });

  console.log("토큰 Firestore 저장 완료:", token);
}

// -------------------------------------------------------------
// 🔥 알림 권한 상태 업데이트
// -------------------------------------------------------------
function updatePermissionStatus() {
  const perm = Notification.permission;

  if (perm === "granted") {
    statusEl.textContent = "알림 권한: 허용됨 ✅";
  } else if (perm === "denied") {
    statusEl.textContent =
      "알림 권한: 거부됨 ❌ (브라우저 설정에서 변경 필요)";
  } else {
    statusEl.textContent = "알림 권한: 미요청 ⚠️";
  }
}

// -------------------------------------------------------------
// 🔥 알림 권한 요청 + FCM 토큰 발급
// -------------------------------------------------------------
async function requestPermissionAndGetToken(messaging) {
  try {
    const permission = await Notification.requestPermission();
    updatePermissionStatus();

    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;

    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      tokenTextarea.value = currentToken;
      console.log("FCM token:", currentToken);

      // Firestore 저장
      await saveTokenToFirestore(currentToken);
    } else {
      tokenTextarea.value = "토큰을 가져오지 못했습니다.";
    }
  } catch (err) {
    console.error("토큰 요청 오류:", err);
    tokenTextarea.value = "토큰 요청 중 오류 발생";
  }
}

// -------------------------------------------------------------
// 🔥 FCM 초기화
// -------------------------------------------------------------
async function initFCM() {
  try {
    const supported = await isSupported();
    if (!supported) {
      statusEl.textContent =
        "이 브라우저는 FCM 웹 푸시를 지원하지 않습니다.";
      permissionBtn.disabled = true;
      return;
    }

    const messaging = getMessaging(app);

    // 서비스 워커 등록
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );
    console.log("Service Worker registered:", registration);

    updatePermissionStatus();

    // 버튼 클릭 → 권한 요청 + 토큰 발급
    permissionBtn.addEventListener("click", async () => {
      await requestPermissionAndGetToken(messaging);
    });

    // ---------------------------------------------------------
    // 🔥 포그라운드 메시지 수신
    // ---------------------------------------------------------
    onMessage(messaging, (payload) => {
      console.log("FCM foreground message:", payload);

      const { notification } = payload;

      const text = `[${new Date().toLocaleString()}]
title: ${notification?.title || ""}
body: ${notification?.body || ""}
data: ${JSON.stringify(payload.data || {}, null, 2)}

`;

      messageLogEl.textContent = text + messageLogEl.textContent;
    });
  } catch (err) {
    console.error("FCM 초기화 오류:", err);
    statusEl.textContent = "FCM 초기화 중 오류 발생";
  }
}

// -------------------------------------------------------------
// 실행
// -------------------------------------------------------------
initFCM();

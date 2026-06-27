// /fcm.js
import { getMessaging, getToken, onMessage, isSupported } 
  from "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging.js";
import { app } from "/firebase-init.js";  // ⭐ 이미 초기화된 Firebase 앱 사용

const vapidKey = "⭐여기에_본인_WEB_PUSH_키_입력⭐";

const statusEl = document.getElementById("fcm-status");
const permissionBtn = document.getElementById("fcm-permission-btn");
const tokenTextarea = document.getElementById("fcm-token");
const messageLogEl = document.getElementById("fcm-message-log");

async function initFCM() {
  try {
    const supported = await isSupported();
    if (!supported) {
      statusEl.textContent = "이 브라우저는 FCM 웹 푸시를 지원하지 않습니다.";
      permissionBtn.disabled = true;
      return;
    }

    const messaging = getMessaging(app);

    // 서비스 워커 등록
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("Service Worker registered:", registration);

    updatePermissionStatus();

    permissionBtn.addEventListener("click", async () => {
      await requestPermissionAndGetToken(messaging);
    });

    // 포그라운드 메시지 수신
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

function updatePermissionStatus() {
  const perm = Notification.permission;
  if (perm === "granted") {
    statusEl.textContent = "알림 권한: 허용됨 ✅";
  } else if (perm === "denied") {
    statusEl.textContent = "알림 권한: 거부됨 ❌ (브라우저 설정에서 변경 필요)";
  } else {
    statusEl.textContent = "알림 권한: 미요청 ⚠️";
  }
}

async function requestPermissionAndGetToken(messaging) {
  try {
    const permission = await Notification.requestPermission();
    updatePermissionStatus();

    if (permission !== "granted") return;

    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.ready
    });

    if (currentToken) {
      tokenTextarea.value = currentToken;
      console.log("FCM token:", currentToken);
    } else {
      tokenTextarea.value = "토큰을 가져오지 못했습니다.";
    }

  } catch (err) {
    console.error("토큰 요청 오류:", err);
    tokenTextarea.value = "토큰 요청 중 오류 발생";
  }
}

initFCM();

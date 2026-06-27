// firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyACfN4_r2hUAn1NQPWRZzpegjyIESYGK3I",
  authDomain: "molawcounter.firebaseapp.com",
  projectId: "molawcounter",
  storageBucket: "molawcounter.firebasestorage.app",
  messagingSenderId: "989958208701",
  appId: "1:989958208701:web:16bd53eed95276f5d4cbd4",
  measurementId: "G-D4W34NBWKT"
});

const messaging = firebase.messaging();

// 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] 백그라운드 메시지:", payload);

  // FCM v1은 data.*가 정식 전달됨
  const title =
    payload.data?.title ||
    payload.notification?.title ||
    "알림";

  const body =
    payload.data?.body ||
    payload.notification?.body ||
    "새로운 알림이 있습니다.";

  const url = payload.data?.url || "/";

  const notificationOptions = {
    body,
    icon: "/images/icon-192.png",
    badge: "/images/icon-192.png",
    data: { url }
  };

  self.registration.showNotification(title, notificationOptions);
});

// 알림 클릭 시 URL로 이동
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data.url || "/";
  event.waitUntil(clients.openWindow(url));
});

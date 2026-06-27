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

  // FCM v1에서는 data 안에 title/body가 들어옴
  const title =
    payload.data?.title ||
    payload.notification?.title ||
    "딱요만큼변제 알림";

  const body =
    payload.data?.body ||
    payload.notification?.body ||
    "새로운 알림이 있습니다.";

  const notificationOptions = {
    body,
    icon: "/images/icon-192.png",   // 모바일에서 필수
    badge: "/images/icon-192.png",
    data: payload.data || {}
  };

  self.registration.showNotification(title, notificationOptions);
});

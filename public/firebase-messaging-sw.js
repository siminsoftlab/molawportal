// /firebase-messaging-sw.js

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

  const notificationTitle = payload.notification?.title || "딱요만큼변제 알림";
  const notificationOptions = {
    body: payload.notification?.body || "더 이상 혼자 고민하지 마세요.",
    icon: "/images/favicon.ico",
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

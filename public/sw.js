// ===============================
// 캐시 설정 (리뉴얼 중에는 기존 서비스만 캐싱)
// ===============================
const CACHE_NAME = "molaw-cache-v1";

// 기존 서비스(index.html)만 캐싱
// 리뉴얼 파일(main.html, -ch.js 등)은 절대 캐싱 금지
const urlsToCache = [
  "/",
  "/index.html"
];

// ===============================
// 설치 단계: 캐시 저장
// ===============================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// ===============================
// 네트워크 요청 가로채기
// ===============================
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // 🔥 Firebase 요청은 절대 캐싱 금지 (로그인 문제 해결 핵심)
  if (
    url.includes("firebase") ||
    url.includes("googleapis") ||
    url.includes("gstatic")
  ) {
    return; // 네트워크로 직접 보내기
  }

  // 🔥 리뉴얼 파일은 캐싱 금지
  if (
    url.includes("-ch.js") ||
    url.includes("-ch.css") ||
    url.includes("main.html")
  ) {
    return; // 네트워크로 직접 보내기
  }

  // 기본 캐싱 전략
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// ===============================
// 푸시 알림 수신
// ===============================
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const title = data.title || "알림";
  const options = {
    body: data.body || "새로운 알림이 있습니다.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ===============================
// 알림 클릭 시 동작
// ===============================
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("/")
  );
});

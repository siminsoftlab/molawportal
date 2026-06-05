// ===============================
// 기본 캐시 설정
// ===============================
const CACHE_NAME = "molaw-cache-v1";
const urlsToCache = [
  "/", 
  "/index.html",
  "/mypage/mypage.html"
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
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 캐시에 있으면 캐시 사용, 없으면 네트워크 요청
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

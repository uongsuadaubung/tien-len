const CACHE_NAME = 'tien-len-pwa-v1';

// Sự kiện cài đặt: Caching ban đầu
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './icon.svg'
      ]).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Sự kiện kích hoạt: Dọn dẹp cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Chiến lược Fetch: Network First with Cache Fallback (hoặc Cache First cho assets tĩnh)
self.addEventListener('fetch', (event) => {
  // Chỉ cache các request GET
  if (event.request.method !== 'GET') return;

  // Bỏ qua GitHub API và external API requests
  const url = new URL(event.request.url);
  if (url.hostname.includes('github.com') || url.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Tải ngầm bản mới nhất để cập nhật cache (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback về trang chủ nếu offline
          return caches.match('./') || caches.match('./index.html');
        });
    })
  );
});

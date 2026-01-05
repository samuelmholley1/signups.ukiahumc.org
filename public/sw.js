const CACHE_NAME = 'uumc-NO-CACHE-v33';

self.addEventListener('install', (event) => {
  // FORCE activation immediately - don't wait for old service worker
  console.log('[SW v33] Installing - forcing immediate activation');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete ALL caches and take control immediately
  console.log('[SW v33] Activating - taking control of all clients');
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW v33] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Take control of ALL clients immediately without waiting for page reload
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // NEVER cache ANYTHING - always fetch fresh from network
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return new Response('Network error', { status: 503 });
      })
  );
});
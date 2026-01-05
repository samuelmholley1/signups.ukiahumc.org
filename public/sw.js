const CACHE_NAME = 'uumc-NO-CACHE-v32';

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
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

self.addEventListener('activate', (event) => {
  // Delete ALL caches - we don't cache anything anymore
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      self.clients.claim()
    ])
  );
});
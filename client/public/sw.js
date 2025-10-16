// Service Worker for IntakeAI Health PWA
const CACHE_NAME = 'intakeai-health-v2';
const RUNTIME_CACHE = 'intakeai-runtime-v2';

// Assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests and chrome extensions
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // API requests - network first, no cache (always fresh data)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If API fails and offline, return offline message
          return new Response(
            JSON.stringify({
              success: false,
              error: 'You are offline. Please check your internet connection.'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Static assets - cache first, fallback to network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version, but update cache in background
          event.waitUntil(
            fetch(event.request).then((response) => {
              return caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(event.request, response.clone());
                return response;
              });
            }).catch(() => {
              // Fetch failed, but we already have cached version
            })
          );
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request).then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Service Worker for IntakeAI Health PWA
// Version: 2025-10-18-v6-debug - Add API error logging
const CACHE_NAME = 'intakeai-health-v6';
const RUNTIME_CACHE = 'intakeai-runtime-v6';

// Assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// Install event - cache essential assets and force update
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing v6 - debug API errors...');
  // Skip waiting immediately to force activation
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_URLS).catch(err => {
          console.warn('[Service Worker] Failed to precache some assets:', err);
          // Don't fail the installation if precaching fails
          return Promise.resolve();
        });
      })
  );
});

// Activate event - clean up ALL caches aggressively
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating and clearing ALL caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete ALL caches to force fresh fetch
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[Service Worker] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[Service Worker] All caches cleared, claiming clients');
      return self.clients.claim();
    })
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
        .catch((error) => {
          console.error('[Service Worker] API fetch failed:', {
            url: event.request.url,
            method: event.request.method,
            error: error.message,
            online: navigator.onLine
          });

          // Only return offline message if truly offline (not just a network error)
          // Check if the browser is actually offline
          if (!navigator.onLine) {
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
          }

          // For other fetch errors (like CORS, network issues), let them propagate
          // so the real error can be seen
          throw error;
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

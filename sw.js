/**
 * Spiritual Seasons PWA - Service Worker
 * Handles caching and offline functionality
 */

// VERSION CONFIGURATION
const VERSION = '1.0.1';
const BUILD_TIME = '20260904a';
const CACHE_NAME = `spiritual-seasons-v${VERSION}-${BUILD_TIME}`;
const FONT_CACHE = `spiritual-seasons-fonts-v${VERSION}`;

// Use relative paths - works whether app is at root or subfolder
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  // CSS Files
  './css/variables.css',
  './css/reset.css',
  './css/layout.css',
  './css/components.css',
  './css/app.css',
  './css/seasonal.css',
  './css/utilities.css',
  './css/ui-polish.css',
  // Core Infrastructure
  './js/state-manager.js',
  './js/event-manager.js',
  './js/module-lifecycle.js',
  './js/blob-manager.js',
  './js/undo-manager.js',
  './js/search-engine.js',
  './js/sync-queue.js',
  './js/loading-manager.js',
  // Core Utilities
  './js/config.js',
  './js/utils.js',
  './js/store.js',
  './js/router.js',
  // UI Components
  './js/ui/toast.js',
  './js/ui/modal.js',
  './js/ui/theme-manager.js',
  // Feature Modules - ALL modules now included
  './js/modules/error-handler.js',
  './js/modules/error-boundary.js',
  './js/modules/haptics.js',
  './js/modules/keyboard-shortcuts.js',
  './js/modules/tts.js',
  './js/modules/ambient-sound.js',
  './js/modules/audio.js',
  './js/modules/intro-pages.js',
  './js/modules/quiz.js',
  './js/modules/devotional.js',
  './js/modules/toc.js',
  './js/modules/settings.js',
  './js/modules/notifications.js',
  './js/modules/sharing.js',
  './js/modules/progress.js',
  './js/modules/weekly-reflection.js',
  './js/modules/search.js',
  './js/modules/privacy.js',
  './js/modules/verse-images.js',
  './js/modules/meditation-timer.js',
  './js/modules/guided-breathing.js',
  './js/modules/calendar-integration.js',
  './js/modules/onboarding-tour.js',
  './js/modules/data-export.js',
  './js/modules/page-transitions.js',
  './js/modules/pdf-export.js',
  // Bundled libraries
  './js/lib/jspdf.umd.min.js',
  // Main App
  './js/app.js',
  // Content
  './content/book.json',
  './content/quiz.json',
  // Assets — all icon sizes referenced in manifest.webmanifest
  './assets/icons/icon.svg',
  './assets/icons/icon-simple.svg',
  './assets/icons/icon-72.png',
  './assets/icons/icon-96.png',
  './assets/icons/icon-128.png',
  './assets/icons/icon-144.png',
  './assets/icons/icon-152.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-384.png',
  './assets/icons/icon-512.png',
  './assets/images/book-cover.webp'
];

// Google Fonts to cache
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@300;400;500;600;700&display=swap'
];

// Install event
self.addEventListener('install', (event) => {
  console.log(`[ServiceWorker] Installing version ${VERSION}...`);
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[ServiceWorker] Some assets failed to cache:', err);
          // Continue even if some assets fail
          return Promise.resolve();
        });
      }),
      // Pre-cache fonts
      caches.open(FONT_CACHE).then((cache) => {
        console.log('[ServiceWorker] Caching fonts');
        return Promise.all(
          FONT_URLS.map(url => 
            fetch(url, { mode: 'cors' })
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(err => {
                console.warn('[ServiceWorker] Font cache failed:', err);
              })
          )
        );
      })
    ])
    .then(() => {
      console.log(`[ServiceWorker] Install complete - ${CACHE_NAME}`);
      return self.skipWaiting();
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete all caches that don't match current version
              const isCurrentCache = name === CACHE_NAME || name === FONT_CACHE;
              if (!isCurrentCache) {
                console.log('[ServiceWorker] Deleting old cache:', name);
              }
              return !isCurrentCache;
            })
            .map((name) => caches.delete(name))
        );
      })
      .then(() => {
        console.log(`[ServiceWorker] Activate complete - ${CACHE_NAME}`);
        // Notify clients about the new version
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: VERSION,
              cacheName: CACHE_NAME
            });
          });
        });
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle Google Fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return empty response for fonts - page will use fallback
            return new Response('', { status: 200 });
          });
        });
      })
    );
    return;
  }

  // Skip other cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first strategy for JSON content files (to get updates)
  if (url.pathname.includes('/content/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first strategy for everything else
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.error('[ServiceWorker] Fetch failed:', error);
            
            // Return offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            throw error;
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Time for your daily devotional!',
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/icon-72.png',
    vibrate: [100, 50, 100],
    tag: 'devotional-reminder',
    renotify: true,
    data: {
      url: './#devotional'
    },
    actions: [
      { action: 'open', title: 'Open Devotional' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Spiritual Seasons', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (event.notification.data?.url) {
              client.navigate(event.notification.data.url);
            }
            return;
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data?.url || './');
        }
      })
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Allow app to query current version
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: VERSION,
      cacheName: CACHE_NAME,
      buildTime: BUILD_TIME
    });
  }
});

console.log(`[ServiceWorker] Loaded - Version ${VERSION} (${BUILD_TIME})`);

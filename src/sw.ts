/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: PrecacheEntry[] };

/** Hand-written service worker — not vite-plugin-pwa's generated `generateSW`
 * runtime. That runtime (Workbox 7.4 bundled via vite-plugin-pwa 1.3.0)
 * fails ServiceWorker script evaluation entirely under this project's Vite 8
 * toolchain (confirmed by isolating a hand-written minimal SW, which
 * installs and caches correctly, against the generated one, which doesn't —
 * see PROGRESS.md). `injectManifest` still gives us the precache file list
 * at build time via self.__WB_MANIFEST; everything else here is plain
 * Cache API, no Workbox dependency. */

interface PrecacheEntry {
  url: string;
  revision: string | null;
}

// Replaced at build time by vite-plugin-pwa's injectManifest transform.
const PRECACHE_MANIFEST = self.__WB_MANIFEST as PrecacheEntry[];

const CACHE_VERSION = 'v1';
const PRECACHE_NAME = `precache-${CACHE_VERSION}`;
const CONTENT_CACHE_NAME = 'content';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE_NAME);
      // The manifest can list the same URL twice (e.g. an icon referenced
      // both by content hash from the JS bundle and separately via
      // includeAssets) — Cache.addAll() rejects outright on duplicate
      // requests, so dedupe first. We don't need per-entry revisions:
      // PRECACHE_NAME is bumped and the old cache dropped on every deploy.
      const urls = [...new Set(PRECACHE_MANIFEST.map((entry) => entry.url))];
      await cache.addAll(urls);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== PRECACHE_NAME && key !== CONTENT_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isContentRequest(url: URL): boolean {
  return url.pathname.startsWith('/content/') && url.pathname.endsWith('.json');
}

// ignoreVary: true everywhere below — some dev/preview servers (this
// project's included) send `Vary: Origin` on static assets. A same-origin
// request made *from the service worker* during install has no Origin
// header, but the real runtime request for a `crossorigin` <script>/<link>
// does — so without ignoreVary, a spec-correct-but-unwanted Vary check
// treats those as different cache entries and misses on every single
// crossorigin asset. Confirmed via direct SW-side debugging (see
// PROGRESS.md) that the URL was an exact match in cache.keys() while
// caches.match() still missed, before this fix.
const MATCH_OPTIONS: CacheQueryOptions = { ignoreVary: true };

async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CONTENT_CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, MATCH_OPTIONS);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request, MATCH_OPTIONS);
  if (cached) return cached;
  const response = await fetch(request);
  return response;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  if (isContentRequest(url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // SPA navigations: always serve the precached shell so client-side hash
  // routing works offline regardless of which path was requested.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html', MATCH_OPTIONS).then((cached) => cached ?? fetch(event.request))
    );
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const day = (event.notification.data as { day?: number } | undefined)?.day;
  const targetUrl = day ? `/#read/${day}` : '/#home';

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clients[0];
      if (existing) {
        // navigate() re-requests index.html (served from cache by the
        // fetch handler above) with the new hash, so the app boots fresh
        // and the router picks the target day straight up — simpler than
        // a postMessage round trip to a client that may not be listening.
        await existing.navigate(targetUrl);
        await existing.focus();
        return;
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});

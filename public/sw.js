/**
 * Minimal service worker — its only job is to make the app installable as a
 * desktop/standalone PWA. It is intentionally a network passthrough: the app
 * is auth-gated and data is live, so we do NOT cache an app shell (that would
 * risk serving a stale, signed-out shell). The presence of a fetch handler is
 * what satisfies the install criteria.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass through to the network. On hard failure, just let it error — we keep
  // no cache. (Required so the browser registers an active fetch handler.)
  event.respondWith(fetch(event.request));
});

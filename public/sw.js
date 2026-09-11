/* ============================================================
   MOUSOURI service worker — offline is a feature, not a garnish.
   Strategy:
   · navigations  → network-first, cache fallback to "/"
   · static GETs  → cache-first (immutable _next/static, covers,
                    icons, fonts), runtime-cached otherwise
   · never touches non-GET, /api/, or cross-origin requests
   ============================================================ */
const VERSION = "nr-v4";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // page navigations — network first, fall back to the cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // immutable build assets — cache first, they never change
  const immutable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/covers/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/");

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(immutable ? SHELL_CACHE : RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
    })
  );
});

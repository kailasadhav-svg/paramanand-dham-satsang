/* Paramanand Dham — PWA installability without stale Next.js shells */
const CACHE = "paramanand-shell-v9";
const PRECACHE = [
  "/manifest.webmanifest",
  "/manifests/samvadak.webmanifest",
  "/manifests/software.webmanifest",
  "/manifests/charansevak.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/samvadak/icon-192.png",
  "/icons/samvadak/apple-touch-icon.png",
  "/icons/software/icon-192.png",
  "/icons/software/apple-touch-icon.png",
  "/icons/charansevak/icon-192.png",
  "/icons/charansevak/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          PRECACHE.map((url) =>
            cache.add(url).catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isHashedNextAsset(pathname) {
  return pathname.startsWith("/_next/static/");
}

function isStaticAsset(pathname) {
  if (pathname.startsWith("/icons/") || pathname.startsWith("/manifests/")) return true;
  if (pathname.endsWith(".webmanifest")) return true;
  return /\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations + RSC/data: always network. Stale HTML pointing at old
  // /_next/static/*.js hashes causes "client-side exception" white screens.
  const isDocument =
    req.mode === "navigate" ||
    req.destination === "document" ||
    req.headers.get("rsc") === "1" ||
    url.pathname.startsWith("/_next/data/");

  if (isDocument || (url.pathname.startsWith("/_next/") && !isHashedNextAsset(url.pathname))) {
    return;
  }

  if (isHashedNextAsset(url.pathname) || isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) {
            cache.put(req, res.clone());
          }
          return res;
        } catch (err) {
          if (hit) return hit;
          throw err;
        }
      }),
    );
  }
});

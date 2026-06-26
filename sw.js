// Spark Repair Estimator — service worker.
// Precaches the app shell so the app works fully offline after first load, and
// runtime-caches CDN assets (Tesseract OCR, SheetJS, JSZip) the first time they
// are fetched so OCR and export keep working offline on later visits.
const CACHE = 'spark-v1';

const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/app.js', './js/data.js', './js/store.js', './js/db.js', './js/views.js',
  './js/export.js', './js/ocr.js', './js/deal.js',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      // Runtime-cache successful GETs (same-origin and CORS-enabled CDN libs)
      // so OCR/export assets are available offline next time.
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => {
      // Offline and not cached: fall back to the app shell for navigations.
      if (req.mode === 'navigate') return caches.match('./index.html');
    }))
  );
});

const CACHE = 'weather-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// 앱 파일과 Chart.js만 캐시 (네트워크 우선, 오프라인이면 캐시). 날씨 API 등은 건드리지 않음
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  const mine = u.origin === location.origin || u.hostname === 'cdnjs.cloudflare.com';
  if (e.request.method !== 'GET' || !mine) return;
  e.respondWith(
    fetch(e.request)
      .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request))
  );
});

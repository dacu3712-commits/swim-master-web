// 오프라인 실행용 서비스 워커: 게임 파일은 캐시 우선, 글꼴은 받아 두었다가 오프라인에서 재사용
const CACHE = 'swim-master-76e32f7a43';
const ASSETS = ['./', './index.html', './app.js', './styles.css', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  // 게임 파일(페이지·스크립트·스타일)은 온라인이면 항상 최신을 먼저 받고(캐시에도 갱신), 오프라인일 때만 캐시를 쓴다
  // → 업데이트 후 새로고침 한 번이면 바로 새 버전이 뜬다 (예전엔 캐시 우선이라 두 번 이상 새로고침해야 했다)
  const app = own && (req.mode === 'navigate' || /\/(app\.js|styles\.css|index\.html|manifest\.webmanifest)?$/.test(url.pathname));
  if (app) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (own || req.url.includes('fonts.g'))) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

// 🔔 알림을 누르면 열려 있는 게임 창으로(없으면 새로 연다)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => { for (const c of list) if ('focus' in c) return c.focus(); return self.clients.openWindow ? self.clients.openWindow('./') : null; }));
});

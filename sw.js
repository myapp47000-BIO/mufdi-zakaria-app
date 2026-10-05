// عدّل رقم الإصدار عند كل تحديث للتطبيق ليُحدَّث الكاش
const VERSION = 'mufdi-v8';
const CORE = [
  './', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // لا نخزّن الصوت/الفيديو (طلبات Range)
  if (req.destination === 'audio' || req.destination === 'video' || req.headers.has('range')) return;
  const url = new URL(req.url);

  // يوتيوب وروابط البحث: مباشرة من الشبكة
  if (/youtube\.com|google\.com\/search/.test(url.href)) return;

  // التنقل بين الصفحات: الشبكة أولاً ثم الكاش
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copy));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // باقي الملفات (ومنها الخطوط ومكتبة QR): الكاش أولاً مع التحديث بالخلفية
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) {
          const copy = r.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return r;
      }).catch(() => cached);
      return cached || net;
    })
  );
});

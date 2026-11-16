/* Hola: zapisuje aplikację na urządzeniu, żeby działała bez internetu.
   Strona i lista słówek są pobierane z sieci, a gdy jej nie ma, z zapisanej kopii. */
const CACHE = 'hola-v2';
const ASSETS = ['./', './index.html', './slowka.txt', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin) return;
  const fresh = request.mode === 'navigate' || /\/(index\.html|slowka\.txt)?$/.test(url.pathname);
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(request, { ignoreSearch: true });
    const network = fetch(request).then(response => { if (response.ok) cache.put(request, response.clone()); return response; });
    event.waitUntil(network.catch(() => {}));
    if (!cached) return network;
    if (!fresh) { return cached; }
    const timeout = new Promise(resolve => setTimeout(() => resolve(cached), 3000));
    return Promise.race([network.catch(() => cached), timeout]);
  }));
});

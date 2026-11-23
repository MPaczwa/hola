/* Zachowaj cały pakiet aplikacji i listę słówek do nauki offline. */
const scope = new URL(self.registration.scope);
const prefix = 'hola:' + scope.pathname + ':';
const CACHE = prefix + 'v3';
const ASSETS = [
  './', './index.html', './study.js', './themes.css', './numbers.css', './slowka.txt',
  './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'
].map(path => new URL(path, scope).href);
const files = new Set(ASSETS);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(ASSETS.map(url => new Request(url, {cache:'reload'}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith(prefix) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const asset = url.origin + url.pathname;
  if (request.method !== 'GET' || !files.has(asset)) return;

  const store = caches.open(CACHE);
  const network = fetch(request);
  event.waitUntil(network.then(async response => {
    if (response.ok) {
      const copy = response.clone();
      const cache = await store;
      await cache.put(asset, copy);
    }
  }).catch(() => {}));
  event.respondWith(withFallback(network, store.then(cache => cache.match(asset)).catch(() => undefined)));
});

async function withFallback(network, cached) {
  const fallback = await cached;
  if (!fallback) return network;
  let timer;
  try {
    const timeout = new Promise(resolve => { timer = setTimeout(resolve, 2500); });
    const response = await Promise.race([network, timeout]);
    return response?.ok ? response : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

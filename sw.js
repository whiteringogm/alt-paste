const CACHE = 'alt-paste-v1.0.0';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './core.js', './manifest.webmanifest', './icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('alt-paste-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && ASSETS.some(path => new URL(path, self.registration.scope).href === event.request.url)) {
      const clone = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, clone)));
    }
    return response;
  }).catch(async () => (await caches.match(event.request, { ignoreSearch: true })) || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});

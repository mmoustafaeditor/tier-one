// The Gaffer's service worker (served from /the-gaffer/sw.js, scope /the-gaffer/). It makes the game installable as a
// desktop or phone app and playable offline, without ever holding an update back:
//   - the page and version.json always come from the network first; the cached copy is only used offline;
//   - every fresh page replaces the cached one, so the installed app runs whatever build the site serves;
//   - icons and the manifest come from the cache.
// The game itself shows "Update now" when /the-gaffer/version.json has a newer build (src/update.ts).
const CACHE = 'gaffer-pwa-v1';
const PAGE = '/the-gaffer/index.html';
const STATIC = ['/the-gaffer/manifest.webmanifest', '/the-gaffer/icons/icon-192.png', '/the-gaffer/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([PAGE, ...STATIC])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('gaffer-pwa-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/the-gaffer')) return;
  if (url.pathname.endsWith('/version.json')) return; // always the network: that's how updates are found
  if (req.mode === 'navigate' || url.pathname === PAGE || url.pathname === '/the-gaffer/') {
    e.respondWith(fetch(req, { cache: 'no-store' })
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(PAGE, copy)); }
        return res;
      })
      .catch(() => caches.match(PAGE).then((r) => r || Response.error())));
    return;
  }
  if (STATIC.includes(url.pathname)) e.respondWith(caches.match(url.pathname).then((r) => r || fetch(req)));
});

// Tier One's service worker (GOTY.md §8.2). Hand-rolled, no Workbox: four caches and four rules.
//   shell   the page, the play loop's route chunks, styles, icons and the Latin fonts, precached on install (the list is injected by
//           vite.config.ts as __PRECACHE__; one cache per build, old ones dropped on activate).
//   runtime hashed assets (Arabic/extended fonts, art, later chunks): cache-first, filled on first use.
//   films   films/<stem>-<p|l>.mp4 and .jpg: cached whole the first time they play (or when lib/perf.ts prefetches
//           them), then served with Range support so <video> seeks from the cache.
//   daily   today's API reads (daily.start, the boards, the tables): network-first; offline, the last good answer for
//           today comes back with `offline: true`, so the board opens and Home shows the five. Writes (daily.act…)
//           are never replayed blind: the Daily is server-scored, so offline they fail like a dropped connection and
//           the player retries when back. A successful act refreshes the cached board, so a reopen shows the
//           latest state.
// Update flow: a new build means a new sw.js; it installs its shell in the background, waits, and the page (lib/perf.ts)
// shows "New edition ready"; tapping Reload posts SKIP_WAITING and reloads on controllerchange.
// Push: `push` shows the notification the server sent ({ title, body, url, tag }); a tap focuses the game at `url`.
// Typechecked on its own (tsconfig.sw.json: the WebWorker lib, not DOM) by `npm run build:web`.
const sw = self as unknown as ServiceWorkerGlobalScope;
declare const __PRECACHE__: { url: string; rev: string | null }[];
declare const __SW_BUILD__: string;

const SHELL = 't1-shell-' + __SW_BUILD__;
const RUNTIME = 't1-runtime-v1';
const FILMS = 't1-films-v1';
const DAILY = 't1-daily-v1';
const KEEP = new Set([SHELL, RUNTIME, FILMS, DAILY]);
const SCOPE = new URL(sw.registration.scope);
const abs = (p: string) => new URL(p, SCOPE).href;
const ymd = () => new Date().toISOString().slice(0, 10);
const json = (o: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json', ...headers } });

// ---------- install / activate
sw.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await Promise.all(__PRECACHE__.map(async ({ url, rev }) => {
      // Unhashed files (index.html, manifest, icons) are fetched past the HTTP cache; hashed ones are immutable anyway.
      const r = await fetch(abs(url), rev ? { cache: 'reload' } : {});
      if (!r.ok) throw new Error('precache ' + url + ' ' + r.status);
      await c.put(abs(url), r);
    }));
  })());
});
sw.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('t1-') && !KEEP.has(k)) await caches.delete(k);
    await pruneDaily();
    await sw.clients.claim();
  })());
});
/** Yesterday's board is nobody's business: keep only today's API answers. */
async function pruneDaily() {
  const c = await caches.open(DAILY);
  const today = ymd();
  for (const req of await c.keys()) if (!new URL(req.url).searchParams.get('day')?.startsWith(today)) await c.delete(req);
}

// ---------- fetch
sw.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== SCOPE.origin) return;
  if (req.method === 'POST' && /\/api\/tier-one\/v[34]$/.test(url.pathname)) { e.respondWith(api(req)); return; }
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') { e.respondWith(page(req)); return; }
  if (!url.href.startsWith(SCOPE.href)) return;
  const rel = url.href.slice(SCOPE.href.length);
  if (rel.startsWith('films/')) { e.respondWith(film(req)); return; }
  if (rel === 'version.json' || rel === 'sw.js') return; // always fresh
  if (rel.startsWith('assets/')) { e.respondWith(cacheFirst(req)); return; }
  e.respondWith(staleWhileRevalidate(req));
});

/** The page: the precached shell first (instant, offline), else the network, else a plain offline note. */
async function page(req: Request): Promise<Response> {
  const hit = await caches.match(abs('index.html'), { cacheName: SHELL });
  if (hit) return hit;
  try { return await fetch(req); } catch {
    return new Response('<!doctype html><meta charset=utf-8><title>Tier One</title><p style="font:16px system-ui;padding:24px">Offline. Open Tier One again when you\'re back on the network.', { status: 503, headers: { 'content-type': 'text/html' } });
  }
}
async function cacheFirst(req: Request): Promise<Response> {
  const hit = await caches.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok) { const c = await caches.open(RUNTIME); c.put(req, r.clone()).catch(() => {}); }
  return r;
}
async function staleWhileRevalidate(req: Request): Promise<Response> {
  const c = await caches.open(RUNTIME);
  const hit = await c.match(req);
  const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()).catch(() => {}); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}

// ---------- films: whole files in the cache, Range answered from them
const inflight = new Map<string, Promise<void>>();
/** Fetch a clip whole and keep it (used by prefetch, CACHE_FILM messages and the first playback). */
function cacheFilm(url: string): Promise<void> {
  let p = inflight.get(url);
  if (p) return p;
  p = (async () => {
    const c = await caches.open(FILMS);
    if (await c.match(url)) return;
    const r = await fetch(url, { cache: 'no-store' });
    if (r.ok && r.status === 200) await c.put(url, r);
  })().catch(() => {}).finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}
async function film(req: Request): Promise<Response> {
  const url = req.url.split('#')[0];
  const c = await caches.open(FILMS);
  const full = await c.match(url);
  const range = req.headers.get('range');
  if (full) return range ? partial(full, range) : full;
  if (!range) {
    const r = await fetch(req);
    if (r.ok && r.status === 200) c.put(url, r.clone()).catch(() => {});
    return r;
  }
  // A Range request for a clip we don't have: let the network answer it, and pull the whole file in behind it.
  cacheFilm(url);
  return fetch(req);
}
async function partial(full: Response, range: string): Promise<Response> {
  const buf = await full.clone().arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const size = buf.byteLength;
  let start = m && m[1] ? Number(m[1]) : 0;
  let end = m && m[2] ? Number(m[2]) : size - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  if (start >= size || end < start) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  end = Math.min(end, size - 1);
  const h = new Headers(full.headers);
  h.set('Content-Range', `bytes ${start}-${end}/${size}`);
  h.set('Content-Length', String(end - start + 1));
  h.set('Accept-Ranges', 'bytes');
  return new Response(buf.slice(start, end + 1), { status: 206, headers: h });
}

// ---------- the API: today's reads, offline
const READS = new Set(['daily.start', 'daily.dd', 'daily.seed', 'lb.top', 'wire.board', 'wire.mine', 'league.me', 'room.get']);
/** A successful act returns the whole board, which is also the freshest answer to `daily.start`. */
const REFRESHES: Record<string, string> = { 'daily.act': 'daily.start', 'daily.dd': 'daily.start', 'daily.finish': 'daily.start' };
function apiKey(path: string, action: string, body: Record<string, unknown>): string {
  const q = new URLSearchParams({ action, day: ymd() });
  for (const k of ['dev', 'period', 'code', 'day']) if (typeof body[k] === 'string') q.set(k === 'day' ? 'd' : k, body[k] as string);
  return abs(`__api${path}?${q}`);
}
async function api(req: Request): Promise<Response> {
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(await req.clone().text()); } catch { /* not ours to judge */ }
  const action = typeof body.action === 'string' ? body.action : '';
  const path = new URL(req.url).pathname;
  const key = READS.has(action) ? apiKey(path, action, body) : REFRESHES[action] ? apiKey(path, REFRESHES[action], body) : null;
  try {
    const r = await fetch(req);
    if (key && r.ok) {
      const copy = r.clone();
      copy.json().then(async (j) => { if (j && j.ok) { const c = await caches.open(DAILY); await c.put(key, json(j, { 'x-t1-cached': String(Date.now()) })); } }).catch(() => {});
    }
    return r;
  } catch {
    if (key && READS.has(action)) {
      const c = await caches.open(DAILY);
      const hit = await c.match(key);
      if (hit) { const j = await hit.json(); return json({ ...j, offline: true, cachedAt: Number(hit.headers.get('x-t1-cached')) || 0 }); }
    }
    return json({ ok: false, error: 'net', offline: true });
  }
}

// ---------- messages from the page (lib/perf.ts)
sw.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') sw.skipWaiting();
  else if (d.type === 'CACHE_FILM' && typeof d.url === 'string') e.waitUntil(cacheFilm(d.url));
  else if (d.type === 'PRUNE_DAILY') e.waitUntil(pruneDaily());
  else if (d.type === 'VERSION' && e.ports[0]) e.ports[0].postMessage({ build: __SW_BUILD__ });
});

// ---------- push (lib/push.ts subscribes; the server sends { title, body, url?, tag?, topic? })
sw.addEventListener('push', (e) => {
  let d: { title?: string; body?: string; url?: string; tag?: string; topic?: string } = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() }; }
  e.waitUntil(sw.registration.showNotification(d.title || 'Tier One', {
    body: d.body || '', tag: d.tag || d.topic || 't1', icon: abs('icons/icon-192.png'), badge: abs('icons/badge-96.png'), data: { url: abs(d.url || './') },
  }));
});
sw.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url: string = e.notification.data?.url || SCOPE.href;
  e.waitUntil((async () => {
    const all = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = all.find((c) => c.url.startsWith(SCOPE.href));
    if (w) { await w.focus(); try { await w.navigate(url); } catch { /* cross-origin or not allowed: leave it focused */ } return; }
    await sw.clients.openWindow(url);
  })());
});

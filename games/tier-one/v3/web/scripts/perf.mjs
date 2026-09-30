// Smoothness numbers (GOTY.md §8.2): boot timings on slow 4G with a 4× CPU slowdown, frame traces on Home, the
// window, results and a film, layout/style counts (thrash), and how fast a cached clip starts.
//   npm run perf -- [pageUrl] [outDir]      default http://localhost:5178/  (needs playwright-core + a Chromium;
//   PW_CHROMIUM=/path/to/chrome, PERF_CPU=4, PERF_NET=slow4g|none, PERF_ONLY=boot,home,window,results,film,filmstart,
//   PERF_PROFILE=1 for a CPU profile per trace (top self-time functions; pair it with `T1_NOMIN=1 vite build --mode web`
//   for readable names), PERF_TRACE=1 for a devtools-timeline summary per trace (ms of Layout, Paint, Raster, script…),
//   PERF_SETTLE=ms before sampling Home). Writes <outDir>/perf.json and prints a table.
// The page must serve the live API at /api (scripts/dev-server.mjs does; so does a static server with a proxy).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.argv[2] || 'http://localhost:5178/').replace(/\/?$/, '/');
const OUT = process.argv[3] || 'perf-out';
const CPU = Number(process.env.PERF_CPU || 4);
const NET = process.env.PERF_NET || 'slow4g';
const SLOW4G = { offline: false, downloadThroughput: (1.6e6 / 8) * 0.9, uploadThroughput: (750e3 / 8) * 0.9, latency: 150 };
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--disable-gpu'] });
const results = { base: BASE, cpu: CPU, net: NET, at: new Date().toISOString() };

// A finished practice window (six nights slept, the deadline-day clock long expired): the window screen settles it
// and shows Results straight away. A fresh one has an empty log.
const SEED = 'PERFLANE';
// Films already seen, so the traces measure the screens (the season opener and today's morning paper would play otherwise).
const today = new Date().toISOString().slice(0, 10);
const seasonId = (() => { const n = new Date(), y = n.getFullYear(), md = (n.getMonth() + 1) * 100 + n.getDate(); return (md >= 902 ? 'rumour' : md <= 202 ? 'winter' : md <= 615 ? 'spring' : 'summer') + '-' + y; })();
const saveFor = (kind) => ({
  onboarded: true, film: ['coldopen', 'coldopen-career', 'season:' + seasonId, 'paper@' + today, 'deadline@' + today], dev: 'PerfLaneTestDev01', nick: 'perf', reduced: false, sound: false,
  practice: { coach: false, live: kind === 'none' ? null : { seed: SEED, mode: 'practice', log: kind === 'done' ? [['e'], ['e'], ['e'], ['e'], ['e'], ['e']] : [], started: Date.now(), ...(kind === 'done' ? { ddAt: Date.now() - 3600e3 } : {}) }, played: 3, day: '', today: 0 },
  tut: { done: true },
});
async function newPage(kind = 'none', { throttle = true } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.addInitScript((s) => { const cur = JSON.parse(localStorage.getItem('tierone_v3') || '{}'); localStorage.setItem('tierone_v3', JSON.stringify({ ...cur, ...s })); localStorage.setItem('tierone_perf', JSON.stringify({ visits: 1 })); }, saveFor(kind));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Performance.enable');
  if (throttle) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    if (NET === 'slow4g') { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', SLOW4G); }
  }
  return { ctx, p, cdp };
}
const metrics = async (cdp) => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));

// ---------- boot
async function boot(label, url, kind = 'none') {
  const { ctx, p, cdp } = await newPage(kind);
  const t0 = Date.now();
  await p.goto(url, { waitUntil: 'commit' });
  await p.waitForSelector('.g-tabs', { timeout: 60000 });
  const tabsAt = Date.now() - t0;
  // first interaction: a tab tap that opens a lazy screen (Story), measured to the route flip
  const t1 = Date.now();
  await p.click('.g-tabs a[href="?tab=story"]');
  await p.waitForSelector('html[data-route="story"]', { timeout: 60000 });
  const tapMs = Date.now() - t1;
  const marks = await p.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const m = (n) => { const e = performance.getEntriesByName('t1:' + n)[0]; return e ? Math.round(e.startTime) : null; };
    const fp = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
    const res = performance.getEntriesByType('resource').map((r) => ({ n: r.name.split('/').pop().slice(0, 40), kb: Math.round((r.transferSize || 0) / 1024), at: Math.round(r.responseEnd) })).filter((r) => r.kb);
    return { dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), fcp: fp ? Math.round(fp.startTime) : null, render: m('render'), bootDone: m('boot-done'), transfer: Math.round(performance.getEntriesByType('resource').reduce((n, r) => n + (r.transferSize || 0), nav.transferSize || 0) / 1024), res };
  });
  const { res, ...rest } = marks;
  const r = { ...rest, tabsVisible: tabsAt, firstTapToStory: tapMs };
  results['resources:' + label] = res;
  results['boot:' + label] = r;
  console.log('boot', label, r);
  await ctx.close();
}

// ---------- frames
/** Samples requestAnimationFrame for `ms` while `act` runs; long tasks and layout counts alongside. */
const PROFILE = !!process.env.PERF_PROFILE;
/** Top self-time functions of a CDP CPU profile, as "self ms  function (file:line)". */
function topSelf(profile, n = 14) {
  const dt = new Map(); const { nodes, samples, timeDeltas } = profile;
  const byId = new Map(nodes.map((x) => [x.id, x]));
  for (let i = 0; i < samples.length; i++) dt.set(samples[i], (dt.get(samples[i]) || 0) + (timeDeltas[i] || 0));
  const agg = new Map();
  for (const [id, us] of dt) { const cf = byId.get(id).callFrame; const k = `${cf.functionName || '(anon)'} (${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1})`; agg.set(k, (agg.get(k) || 0) + us); }
  return [...agg].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, us]) => `${String(Math.round(us / 1000)).padStart(5)} ms  ${k}`);
}
const TRACE = !!process.env.PERF_TRACE;
/** Sum of complete-event durations by name from a devtools.timeline trace, as "ms  Name (count)". */
function traceSummary(events, n = 12) {
  const agg = new Map();
  for (const e of events) if (e.ph === 'X' && e.dur) { const k = e.name; const a = agg.get(k) || [0, 0]; a[0] += e.dur; a[1]++; agg.set(k, a); }
  return [...agg].sort((a, b) => b[1][0] - a[1][0]).slice(0, n).map(([k, [us, c]]) => `${String(Math.round(us / 1000)).padStart(5)} ms  ${k} (${c})`);
}
async function frames(label, p, cdp, ms, act) {
  let traceEvents = [];
  if (TRACE) {
    cdp.on('Tracing.dataCollected', (d) => { traceEvents = traceEvents.concat(d.value); });
    await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing'], excludedCategories: ['*'] }, transferMode: 'ReportEvents' });
  }
  if (PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
  const m0 = await metrics(cdp);
  const sampler = p.evaluate((ms) => new Promise((res) => {
    const d = []; let last = performance.now(); const t0 = last; let longs = 0, longMs = 0;
    let po = null;
    try { po = new PerformanceObserver((l) => { for (const e of l.getEntries()) { longs++; longMs += e.duration; } }); po.observe({ type: 'longtask', buffered: false }); } catch { /* */ }
    const tick = (t) => { d.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(tick); else { po?.disconnect(); d.shift(); d.sort((a, b) => a - b); const s = d.reduce((a, x) => a + x, 0); res({ frames: d.length, fps: Math.round((d.length / s) * 1000), p50: Math.round(d[Math.floor(d.length * .5)] || 0), p95: Math.round(d[Math.floor(d.length * .95)] || 0), worst: Math.round(d[d.length - 1] || 0), dropped: d.filter((x) => x > 34).length, longTasks: longs, longMs: Math.round(longMs) }); } };
    requestAnimationFrame(tick);
  }), ms);
  await act?.();
  const r = await sampler;
  const m1 = await metrics(cdp);
  if (PROFILE) { const { profile } = await cdp.send('Profiler.stop'); const top = topSelf(profile); results['profile:' + label] = top; console.log('profile', label, '\n  ' + top.join('\n  ')); }
  if (TRACE) { const done = new Promise((res) => cdp.once('Tracing.tracingComplete', res)); await cdp.send('Tracing.end'); await done; const top = traceSummary(traceEvents); results['trace:' + label] = top; console.log('trace', label, '\n  ' + top.join('\n  ')); }
  Object.assign(r, { layouts: m1.LayoutCount - m0.LayoutCount, styleRecalcs: m1.RecalcStyleCount - m0.RecalcStyleCount, layoutMs: Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000), styleMs: Math.round((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000), scriptMs: Math.round((m1.ScriptDuration - m0.ScriptDuration) * 1000) });
  results['fps:' + label] = r;
  console.log('fps', label, r);
  return r;
}
const scroll = (p, steps = 12, dy = 240, pause = 120) => (async () => { for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, i < steps / 2 ? dy : -dy); await p.waitForTimeout(pause); } })();
async function open(kind, url) {
  const { ctx, p, cdp } = await newPage(kind, { throttle: false });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await p.goto(url + (url.includes('?') ? '&' : '?') + 'session_id=1');
  await p.waitForSelector('#root *', { timeout: 60000 });
  return { ctx, p, cdp };
}
async function home() {
  const { ctx, p, cdp } = await open('none', BASE);
  await p.waitForSelector('.home', { timeout: 30000 }); await p.waitForTimeout(Number(process.env.PERF_SETTLE || 1200));
  await frames('home-scroll', p, cdp, 2600, () => scroll(p));
  await p.screenshot({ path: path.join(OUT, 'home.png') });
  await ctx.close();
}
async function windowScreen() {
  const { ctx, p, cdp } = await open('fresh', BASE + '?tab=practice');
  await p.waitForSelector('.g-btn', { timeout: 30000 });
  await p.getByRole('button', { name: /resume practice/i }).first().click();
  await p.waitForSelector('.sagas .scard', { timeout: 30000 });
  await frames('window-deal', p, cdp, 1600, async () => {}); // the five cards dealt (hero beat)
  await frames('window-scroll', p, cdp, 2000, () => scroll(p, 8, 200));
  await p.click('.sagas .scard');
  await p.waitForSelector('.srcs .src:not([disabled])', { timeout: 15000 });
  await frames('saga-open', p, cdp, 1200, async () => {});
  const call = frames('call-scene', p, cdp, 3600, async () => { await p.click('.srcs .src:not([disabled])'); });
  await call;
  await p.screenshot({ path: path.join(OUT, 'call.png') });
  await ctx.close();
}
async function resultsScreen() {
  const { ctx, p, cdp } = await open('done', BASE + '?tab=practice');
  await p.waitForSelector('.g-btn', { timeout: 30000 });
  await p.getByRole('button', { name: /resume practice/i }).first().click();
  await p.waitForSelector('.results2', { timeout: 30000 });
  await frames('results-reveal', p, cdp, 4000, async () => {});
  await frames('results-scroll', p, cdp, 2000, () => scroll(p, 8, 260));
  await p.screenshot({ path: path.join(OUT, 'results.png') });
  await ctx.close();
}
async function film() {
  const { ctx, p, cdp } = await open('none', BASE + '?scene=paper');
  await p.waitForSelector('.film', { timeout: 30000 });
  await frames('film-paper', p, cdp, 3000, async () => {});
  await p.screenshot({ path: path.join(OUT, 'film.png') });
  await ctx.close();
}
/** A clip cached by the worker (or the HTTP cache) must start within 200 ms: films/<stem>-p.mp4 next to the page. */
async function filmStart(stem = process.env.PERF_FILM || 'moment-test') {
  const url = BASE + 'films/' + stem + '-p.mp4';
  const head = await fetch(url, { method: 'HEAD' }).catch(() => null);
  if (!head || !head.ok) { console.log('film start: no', url, '(skipped)'); return; }
  const { ctx, p } = await newPage('none', { throttle: false });
  await p.goto(BASE + '?session_id=1'); await p.waitForSelector('.g-tabs');
  await p.evaluate(async () => { try { await navigator.serviceWorker?.ready; } catch { /* */ } });
  const play = () => p.evaluate((url) => new Promise((res) => {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.style.cssText = 'position:fixed;width:2px;height:2px;opacity:0';
    const t0 = performance.now();
    v.addEventListener('playing', () => res(Math.round(performance.now() - t0)), { once: true });
    v.addEventListener('error', () => res(-1), { once: true });
    setTimeout(() => res(-2), 8000);
    document.body.appendChild(v); v.src = url; v.play().catch(() => res(-3));
  }), url);
  const cold = await play();
  await p.evaluate(async (url) => { await (await fetch(url)).arrayBuffer(); await new Promise((r) => setTimeout(r, 400)); }, url); // what prefetchFilm does
  const warm = await play(); const warm2 = await play();
  results['film-start'] = { coldMs: cold, cachedMs: Math.min(warm, warm2), stem };
  console.log('film start', results['film-start']);
  await ctx.close();
}

const only = process.env.PERF_ONLY ? process.env.PERF_ONLY.split(',') : null;
const step = async (n, f) => { if (only && !only.includes(n)) return; try { await f(); } catch (e) { console.log(n, 'failed:', String(e).split('\n')[0]); results['error:' + n] = String(e).split('\n')[0]; } };
await step('boot', () => boot('intro', BASE));
await step('boot', () => boot('no-intro', BASE + '?session_id=1'));
await step('home', home);
await step('window', windowScreen);
await step('results', resultsScreen);
await step('film', film);
await step('filmstart', filmStart);
await b.close();
fs.writeFileSync(path.join(OUT, 'perf.json'), JSON.stringify(results, null, 2));
console.log('\n| trace | fps | p95 ms | worst ms | dropped | long tasks | layouts | style recalcs | layout ms | script ms |\n|---|---|---|---|---|---|---|---|---|---|');
for (const [k, v] of Object.entries(results)) if (k.startsWith('fps:')) console.log(`| ${k.slice(4)} | ${v.fps} | ${v.p95} | ${v.worst} | ${v.dropped}/${v.frames} | ${v.longTasks} (${v.longMs} ms) | ${v.layouts} | ${v.styleRecalcs} | ${v.layoutMs} | ${v.scriptMs} |`);

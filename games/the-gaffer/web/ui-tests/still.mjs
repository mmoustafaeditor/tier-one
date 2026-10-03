// Freezes a viewer would notice: plays a match in the built game (dist/) and logs every spell of over 350 ms in which
// neither the ball nor the players move (with the match clock, the minute's beats and set piece), plus frames over
// 100 ms. Full match (MODE=4) should show none: dead time is squeezed and players keep moving (2026-10-02: 0 in 150 s).
//   npm run build && MODE=4 SECONDS=150 node ui-tests/still.mjs
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let pw;
try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const html = readFileSync(fileURLToPath(new URL('../dist/index.html', import.meta.url)));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const MODE = Number(process.env.MODE ?? 2), SECONDS = Number(process.env.SECONDS ?? 60), CPU = Number(process.env.CPU ?? 1);
const VIDEO = process.env.VIDEO, SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await pw.chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...(VIDEO ? { recordVideo: { dir: VIDEO, size: { width: 390, height: 844 } } } : {}) });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const tap = async (t) => {
  const r = await p.evaluate((t) => { const css = t.startsWith('css:'); const b = css ? document.querySelector(t.slice(4)) : [...document.querySelectorAll('button, a')].find((b) => b.getBoundingClientRect().width && b.innerText.trim().replace(/\s+/g, ' ').startsWith(t)); if (!b) return null; b.scrollIntoView({ block: 'center' }); const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; }, t);
  if (!r) throw new Error(`not found: ${t}`); await p.mouse.click(r[0], r[1]); await p.waitForTimeout(900);
};
await p.goto(`http://localhost:${server.address().port}/?pitchdebug`); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
await tap('Start a 2026/27 career'); await tap('🇪🇬'); await tap('AHL Al Ahly'); await p.waitForTimeout(800);
await tap('css:button.btn--accent.big'); await p.waitForTimeout(1500);
await tap('The usual split'); await tap('Our target is right');
await tap('Continue'); if (await p.evaluate(() => /Take the staff calls/.test(document.body.innerText))) await tap('Take the staff calls');
await tap('Walk out'); await p.waitForTimeout(1500);
await p.selectOption('select.hlsel', String(MODE));
await p.evaluate(() => {
  const S = (window.__still = { frames: 0, runs: [], cur: null, last: null, long: [] });
  let prev = performance.now();
  const loop = (now) => {
    const dt = now - prev; prev = now; S.frames++;
    const g = window.__gafferPitch; const a = g?.a;
    if (a) {
      const snap = { b: { ...a.ball }, p: a.pos.flat().filter(Boolean).map((q) => [q.x, q.y]) };
      if (S.last) {
        const bm = Math.hypot(snap.b.x - S.last.b.x, snap.b.y - S.last.b.y);
        let pm = 0; const n = Math.min(snap.p.length, S.last.p.length); for (let i = 0; i < n; i++) pm += Math.hypot(snap.p[i][0] - S.last.p[i][0], snap.p[i][1] - S.last.p[i][1]); pm /= Math.max(1, n);
        const still = bm < 0.02 && pm < 0.01;
        const info = () => ({ clock: document.querySelector('.clock')?.textContent ?? '', banner: !!document.querySelector('.varbanner, .goalbanner, .refbanner, [class*=banner]'), go: a.go, beat: a.beat, beats: a.beats.length, clk: Math.round(a.clock), msPM: Math.round(a.msPM), carrier: a.carrier, flight: !!a.flight, sp: a.sp?.kind ?? '' });
        if (still) { if (!S.cur) S.cur = { at: now, start: info() }; }
        else if (S.cur) { const d = now - S.cur.at; if (d > 350) S.runs.push({ ms: Math.round(d), ...S.cur.start, end: info() }); S.cur = null; }
      }
      S.last = snap;
    }
    if (dt > 100) S.long.push([Math.round(dt), document.querySelector('.clock')?.textContent ?? '']);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
await p.waitForTimeout(SECONDS * 1000);
const S = await p.evaluate(() => window.__still);
console.log(`frames ${S.frames}; long frames (>100 ms): ${JSON.stringify(S.long.slice(0, 12))}`);
console.log(`still spells over 350 ms: ${S.runs.length}`);
for (const r of S.runs.slice(0, 25)) console.log(' ', JSON.stringify(r));
await ctx.close(); await browser.close(); server.close();

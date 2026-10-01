// Watching a match as a player would: plays a match in the built game (dist/) in one highlight mode and reports how
// smooth the pitch is (frames a second, frames over 50 ms), optionally on a slowed-down CPU like a cheap phone, and can
// record a video and screenshots of the pitch for a human look.
//   npm run build && MODE=2 SECONDS=60 CPU=4 VIDEO=dir SHOTS=dir node ui-tests/watch.mjs
//   MODE: 1 key, 2 extended, 3 comprehensive, 4 full match. CPU: slowdown factor (Chrome DevTools throttling), 1 = none.
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
await p.goto(`http://localhost:${server.address().port}/`); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
await tap('Start a 2026/27 career'); await tap('🇪🇬'); await tap('A Al Ahly'); await p.waitForTimeout(800);
await tap('css:button.btn--accent.big'); await p.waitForTimeout(1500);
await tap('The usual split'); await tap('Our target is right');
await tap('Continue'); if (await p.evaluate(() => /Take the staff calls/.test(document.body.innerText))) await tap('Take the staff calls');
await tap('Walk out'); await p.waitForTimeout(1500);
await p.selectOption('select.hlsel', String(MODE));
if (CPU > 1) await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: CPU });
// Frames: count them and the long ones while the pitch is on screen; a screenshot of the pitch every few seconds.
await p.evaluate(() => { const f = (window.__frames = { n: 0, long: 0, worst: 0, last: performance.now() }); const loop = (now) => { const d = now - f.last; f.last = now; f.n++; if (d > 50) f.long++; if (d > 300) (f.big ??= []).push([Math.round(d), document.querySelector('.clock')?.textContent ?? '', document.querySelector('.goalbanner, .varbanner') ? 'banner' : '']); f.worst = Math.max(f.worst, d); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
const t0 = Date.now(); let shot = 0;
while (Date.now() - t0 < SECONDS * 1000) {
  await p.waitForTimeout(SHOTS ? 4000 : 1000);
  if (SHOTS) { const el = process.env.FULL ? p : await p.$(".pitchwrap"); if (el) await el.screenshot({ path: `${SHOTS}/m${MODE}-${String(shot++).padStart(2, "0")}.png` }).catch(() => {}); }
}
const f = await p.evaluate(() => ({ ...window.__frames, clock: document.querySelector('.clock')?.textContent ?? '' }));
if (f.big?.length) console.log('  slow frames (ms, clock, on screen):', JSON.stringify(f.big));
console.log(`mode ${MODE}, cpu ${CPU}×: ${(f.n / SECONDS).toFixed(0)} fps, ${f.long} frames over 50 ms, worst ${f.worst.toFixed(0)} ms, match clock ${f.clock} after ${SECONDS} s${errs.length ? `, errors: ${errs[0]}` : ''}`);
await ctx.close(); await browser.close(); server.close();

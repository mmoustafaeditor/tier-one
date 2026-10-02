// The match saved on its own during play (slots.ts writeLive): plays a Full match at x6 for 70 s in the built game
// (dist/), logs every write of the live record (ms, size) and frames over 80 ms, reloads, continues the career and
// prints the clock it resumed at (2026-10-02: writes 0-1 ms of ~10-12 KB, no long frames, resumed at the minute left).
//   npm run build && node ui-tests/resume.mjs
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
await p.selectOption('select.hlsel', '4');
await p.evaluate(() => { const r = document.querySelector('.spdbar input'); const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(r, '6'); r.dispatchEvent(new Event('input', { bubbles: true })); });
await p.evaluate(() => { const f = (window.__frames = { long: [], last: performance.now() }); const loop = (now) => { const d = now - f.last; f.last = now; if (d > 80) f.long.push([Math.round(d), document.querySelector('.clock')?.textContent]); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
const t = Date.now(); let wr = 0;
await p.evaluate(() => { const o = localStorage.setItem.bind(localStorage); window.__lw = []; localStorage.setItem = (k, v) => { const t0 = performance.now(); o(k, v); if (k.startsWith('gaffer.live.')) window.__lw.push([Math.round(performance.now() - t0), v.length]); }; });
await p.waitForTimeout(70000);
const before = await p.evaluate(() => ({ clock: document.querySelector('.clock')?.textContent, rec: JSON.parse(localStorage.getItem('gaffer.live.1') || 'null')?.minute, lw: window.__lw, long: window.__frames.long }));
console.log('before reload: clock', before.clock, 'live record minute', before.rec, 'live writes [ms, chars]', JSON.stringify(before.lw), 'long frames', JSON.stringify(before.long));
await p.reload(); await p.waitForTimeout(3000);
await tap('Continue'); await p.waitForTimeout(1200);
await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter((b) => /Continue/.test(b.innerText)); bs[bs.length - 1].click(); }); await p.waitForTimeout(3500);
console.log('clock after resume:', await p.evaluate(() => document.querySelector('.clock')?.textContent));
console.log('after reload: clock', await p.evaluate(() => document.querySelector('.clock')?.textContent), errs.length ? errs.join(' | ') : 'no errors');
await ctx.close(); await browser.close(); server.close();

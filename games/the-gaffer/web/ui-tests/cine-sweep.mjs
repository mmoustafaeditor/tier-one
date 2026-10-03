// Cinematic UI rebuild: a screenshot of every office page and tab of the running game (desktop 1440×900, phone 390×844),
// for review against the reference pack. A fresh career (CLUB/FLAG, default Al Ahly); LANG_UI=ar for Arabic.
//   npm run build && OUT=… node ui-tests/cine-sweep.mjs
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
let pw; try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const dist = process.env.DIST ?? fileURLToPath(new URL('../dist', import.meta.url));
const OUT = process.env.OUT ?? 'shots'; mkdirSync(OUT, { recursive: true });
const CLUB = process.env.CLUB ?? 'Al Ahly', FLAG = process.env.FLAG ?? '🇪🇬', LANG = process.env.LANG_UI ?? 'en';
const VPS = (process.env.VPS ?? 'desktop,mobile').split(',');
const html = readFileSync(join(dist, 'index.html'));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;
const browser = await pw.chromium.launch();
for (const vp of VPS) {
  const size = vp === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  const p = await (await browser.newContext({ viewport: size })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const cT = (s) => p.evaluate((s) => { const b = [...document.querySelectorAll('button')].find((x) => x.getBoundingClientRect().width && new RegExp(s).test(x.innerText)); b?.click(); return !!b; }, s);
  const shot = async (n) => { await p.waitForTimeout(600); await p.screenshot({ path: join(OUT, `${n}-${vp}${LANG === 'ar' ? '-ar' : ''}.png`) }); };
  await p.goto(URL0); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
  if (LANG === 'ar') { await cT('^عربي$'); await p.waitForTimeout(300); }
  await shot('01-title');
  await p.evaluate(() => document.querySelector('.btn--primary')?.click()); await p.waitForTimeout(600); await shot('02-league');
  await cT(FLAG); await p.waitForTimeout(500); await shot('03-club');
  await cT(CLUB); await p.waitForTimeout(600); await shot('03b-job');
  await p.evaluate(() => document.querySelector('button.btn--accent.big, .btn--accent')?.click()); await p.waitForTimeout(1500);
  const nav = (id) => p.evaluate((id) => document.querySelector(`a[href="#${id}"]`)?.click(), id);
  const tabs = (sel) => p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((b) => b.getBoundingClientRect().width).length, sel);
  const tabAt = (sel, i) => p.evaluate(([sel, i]) => [...document.querySelectorAll(sel)].filter((b) => b.getBoundingClientRect().width)[i]?.click(), [sel, i]);
  await nav('today'); await shot('04-today');
  await nav('news'); await shot('05-news');
  await nav('squad'); await shot('07-squad');
  await tabAt('.pg-tabs button', 1); await shot('09-depth');
  await tabAt('.pg-tabs button', 2); await shot('07b-contracts');
  await tabAt('.pg-tabs button', 0); await p.evaluate(() => document.querySelector('.sq-r')?.click()); await shot('08-player');
  for (const [r, n] of [['room', '10-room'], ['train', '11-training'], ['medical', '12-medical'], ['academy', '13-academy']]) {
    await nav('squad'); await p.waitForTimeout(300);
    await p.evaluate((r) => { const i = { room: 0, train: 1, medical: 2, academy: 3 }[r]; document.querySelectorAll('.sq-tiles button')[i]?.click(); }, r); await shot(n);
  }
  await nav('match');
  const mt = await tabs('.page .seg button');
  for (let i = 0; i < mt; i++) { await tabAt('.page .seg button', i); await shot(`14-match-${i}`); }
  await nav('transfers');
  for (let i = 0; i < 4; i++) { await tabAt('.rc-funnel .stage', i); await shot(`18-transfers-${i}`); }
  await nav('club');
  const ct = await tabs('.page .seg button, .o-tabs button');
  for (let i = 0; i < ct; i++) { await tabAt('.page .seg button, .o-tabs button', i); await shot(`24-club-${i}`); }
  for (const [r, n] of [['career', '29-career'], ['pass', '30-pass'], ['settings', '31-settings']]) { await nav(r); await shot(n); }
  if (errs.length) console.log(vp, 'page errors:', errs.slice(0, 3));
}
await browser.close(); server.close();
console.log('sweep in', OUT);

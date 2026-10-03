// Cinematic UI rebuild: screenshots of the running game for side-by-side comparison with the reference pack.
// A fresh career (CLUB, default Al Ahly; LANG en|ar), desktop 1440×900 and phone 390×844; SHOTS picks screens.
//   npm run build && OUT=… CLUB='Al Ahly' node ui-tests/cine-shots.mjs
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
let pw; try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const dist = process.env.DIST ?? fileURLToPath(new URL('../dist', import.meta.url));
const OUT = process.env.OUT ?? 'shots'; mkdirSync(OUT, { recursive: true });
const CLUB = process.env.CLUB ?? 'Al Ahly';
const FLAG = process.env.FLAG ?? '🇪🇬';
const LANG = process.env.LANG_UI ?? 'en';
const SHOTS = (process.env.SHOTS ?? 'today,squad,transfers,match,club,pre,live').split(',');
const VPS = (process.env.VPS ?? 'desktop,mobile').split(',');
const html = readFileSync(join(dist, 'index.html'));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;
const browser = await pw.chromium.launch();
const tag = CLUB.toLowerCase().replace(/[^a-z]+/g, '-');
for (const vp of VPS) {
  const size = vp === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: vp === 'desktop' ? 1 : 2 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const cT = (s) => p.evaluate((s) => { const b = [...document.querySelectorAll('button')].find((x) => x.getBoundingClientRect().width && new RegExp(s).test(x.innerText)); b?.click(); return !!b; }, s);
  await p.goto(URL0); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
  if (LANG === 'ar') { await cT('^عربي$'); await p.waitForTimeout(300); }
  await cT('2026/27'); await p.waitForTimeout(400); await cT(FLAG); await p.waitForTimeout(400);
  await cT(CLUB); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('button.btn--accent.big, .btn--accent')?.click()); await p.waitForTimeout(1500);
  const nav = (id) => p.evaluate((id) => document.querySelector(`nav.nav a[href="#${id}"], a[href="#${id}"]`)?.click(), id);
  const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: join(OUT, `${name}-${vp}-${tag}${LANG === 'ar' ? '-ar' : ''}.png`) }); };
  for (const s of SHOTS) {
    if (['today', 'squad', 'transfers', 'match', 'club'].includes(s)) { await nav(s); await shot(s); }
    if (s === 'pre' || s === 'live') {
      for (let k = 0; k < 2; k++) { await p.evaluate(() => document.querySelector('button.choice.pick')?.click()); await p.waitForTimeout(300); }
      await nav('today'); await p.waitForTimeout(500);
      for (let i = 0; i < 6 && !(await p.$('.sc-pre')); i++) {
        await p.evaluate(() => document.querySelector('button.continue')?.click()); await p.waitForTimeout(900);
        await p.evaluate(() => document.querySelector('[role=dialog] .btn--accent')?.click()); await p.waitForTimeout(900);
      }
      if (s === 'pre') await shot('pre');
      if (s === 'live') { await p.evaluate(() => document.querySelector('.sc-pre .go .btn--accent')?.click()); await p.waitForTimeout(6000); await shot('live'); }
    }
  }
  if (errs.length) console.log(vp, 'page errors:', errs.slice(0, 3));
  await ctx.close();
}
await browser.close(); server.close();
console.log('shots in', OUT);

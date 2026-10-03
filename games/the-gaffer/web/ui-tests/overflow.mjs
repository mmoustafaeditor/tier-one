// Rework gate (handoff: "test 320/360/390/412 widths"): no screen is wider than the phone. Opens every area and tab at
// four phone widths in English and Arabic and fails when the page scrolls sideways.
//   npm run build && node ui-tests/overflow.mjs
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
let pw; try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const dist = process.env.DIST ?? fileURLToPath(new URL('../dist', import.meta.url));
const html = readFileSync(join(dist, 'index.html'));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;
const b = await pw.chromium.launch();
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
for (const lang of ['en', 'ar']) for (const W of [320, 360, 390, 412]) {
  const p = await (await b.newContext({ viewport: { width: W, height: 800 } })).newPage();
  await p.goto(URL0); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
  const clickT = (re) => p.evaluate((s) => [...document.querySelectorAll('button')].find((x) => new RegExp(s).test(x.innerText))?.click(), re);
  if (lang === 'ar') { await clickT('^عربي$'); await p.waitForTimeout(400); }
  await clickT('2026/27'); await p.waitForTimeout(400); await clickT('🇪🇬'); await p.waitForTimeout(400);
  await clickT('Al Ahly|الأهلي'); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('button.btn--accent.big')?.click()); await p.waitForTimeout(1200);
  const wide = () => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: innerWidth, el: [...document.querySelectorAll('.page *, header *')].filter((e) => { const r = e.getBoundingClientRect(); if (r.right <= innerWidth + 1 && r.left >= -1) return false; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o !== 'visible') return false; } return true; }).slice(0, 3).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`) }));
  const bad = [];
  const check = async (where) => { await p.waitForTimeout(500); const r = await wide(); if (r.sw > r.cw + 1) bad.push(`${where} ${r.sw}px (${r.el.join(', ')})`); };
  await check('today');
  for (const area of ['squad', 'match', 'transfers', 'club']) {
    await p.evaluate((id) => document.querySelector(`nav.nav a[href="#${id}"]`)?.click(), area); await p.waitForTimeout(700);
    const n = await p.evaluate(() => document.querySelectorAll('.page .seg button, .page [role=tablist] button, .rc-funnel .stage').length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((i) => (document.querySelectorAll('.page .seg button, .page [role=tablist] button, .rc-funnel .stage')[i])?.click(), i);
      await check(`${area}#${i}`);
    }
  }
  ok(!bad.length, `${lang} ${W}px: nothing wider than the screen${bad.length ? ' — ' + bad.join('; ') : ''}`);
}
await b.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

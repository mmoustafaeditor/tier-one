// Rework evidence: the same path through a build at phone (390) and desktop (1440) width, English and Arabic.
//   DIST=../path/to/dist OUT=/tmp/shots/after node ui-tests/rework-shots.mjs
// DIST defaults to this build (dist/, `npm run build` first). Prints the files it wrote.
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

let pw;
try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const dist = process.env.DIST ?? fileURLToPath(new URL('../dist', import.meta.url));
const OUT = process.env.OUT ?? 'shots';
const LANGS = (process.env.LANGS ?? 'en,ar').split(',');
mkdirSync(OUT, { recursive: true });
const html = readFileSync(join(dist, 'index.html'));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;
const browser = await pw.chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

const click = (p, re) => p.evaluate((src) => { const r = new RegExp(src); const b = [...document.querySelectorAll('button, a, [role=button]')].find((x) => x.getBoundingClientRect().width && r.test(x.innerText.trim())); b?.click(); return b ? b.innerText.trim().slice(0, 40) : null; }, re.source);
const nav = (p, id) => p.evaluate((id) => document.querySelector(`nav.nav a[href="#${id}"]`)?.click(), id);
const seg = (p, i) => p.evaluate((i) => { const s = document.querySelector('.page .seg, .page [role=tablist]'); s?.querySelectorAll('button, [role=tab]')[i]?.click(); }, i);

for (const lang of LANGS) {
  for (const [W, H, tag] of [[390, 844, 'phone'], [1440, 900, 'desktop']]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: W < 500 ? 2 : 1 });
    const p = await ctx.newPage();
    const shot = async (name, full = false) => {
      await p.waitForTimeout(600); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(150);
      const h = await p.evaluate(() => document.documentElement.scrollHeight);
      const file = join(OUT, `${name}-${tag}-${lang}.png`);
      await p.screenshot({ path: file, fullPage: full, clip: full ? { x: 0, y: 0, width: W, height: Math.min(h, W < 500 ? 2400 : 1600) } : undefined });
      console.log(file);
    };
    await p.goto(URL0);
    await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1000);
    if (lang === 'ar') { await click(p, /^عربي$/); await p.waitForTimeout(500); }
    await click(p, /2026\/27/); await p.waitForTimeout(600);
    await click(p, /🇪🇬/); await p.waitForTimeout(600);
    await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Al Ahly|الأهلي/.test(b.innerText))?.click()); await p.waitForTimeout(700);
    await p.evaluate(() => document.querySelector('button.btn--accent.big')?.click()); await p.waitForTimeout(1500);
    await shot('01-today-first-decisions', true);            // board meeting card (F04), header date (F02)
    await nav(p, 'news'); await p.waitForTimeout(700);
    await shot('02-inbox-dates');                            // F02: message dated vs header
    await nav(p, 'match'); await p.waitForTimeout(800); await seg(p, 0); await p.waitForTimeout(800);
    await shot('03-tactics', true);                          // F01: whose XI
    await nav(p, 'today'); await p.waitForTimeout(700);
    await ctx.close();
  }
}
await browser.close(); server.close();

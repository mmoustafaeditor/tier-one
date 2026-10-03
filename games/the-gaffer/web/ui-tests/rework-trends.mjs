// Rework M4: "What keeps happening" on Match › Fixtures (ui2/Trends.tsx): after a few matches it shows the record, xG a
// match and the analysts' findings that came back, each bad one with a link to the screen that acts on it.
//   DIST=… OUT=… node ui-tests/rework-trends.mjs        (CHECK=0 to only take screenshots)
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
let pw; try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const dist = process.env.DIST ?? fileURLToPath(new URL('../dist', import.meta.url));
const OUT = process.env.OUT ?? 'shots'; mkdirSync(OUT, { recursive: true });
const CHECK = process.env.CHECK !== '0';
const html = readFileSync(join(dist, 'index.html'));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;
const browser = await pw.chromium.launch();
let fails = 0;
const ok = (c, msg) => { if (!CHECK) return; console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const click = (re) => p.evaluate((src) => { const r = new RegExp(src); const b = [...document.querySelectorAll('button, a, [role=button]')].find((x) => x.getBoundingClientRect().width && r.test(x.innerText.trim())); b?.click(); return b ? b.innerText.trim().slice(0, 50) : null; }, re.source);
const boot = async () => { await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1200); };
await p.goto(URL0); await boot();
await click(/2026\/27/); await p.waitForTimeout(500); await click(/🇪🇬/); await p.waitForTimeout(500);
await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Al Ahly/.test(b.innerText))?.click()); await p.waitForTimeout(600);
await p.evaluate(() => document.querySelector('button.btn--accent.big')?.click()); await p.waitForTimeout(1500);
await click(/^Our target is right/); await p.waitForTimeout(400); await click(/^The usual split/); await p.waitForTimeout(600);
const nav = (id) => p.evaluate((id) => document.querySelector(`nav.nav a[href="#${id}"]`)?.click(), id);
for (let i = 0; i < 9; i++) {
  await click(/^Continue/); await p.waitForTimeout(900);
  if (await click(/^Take the staff calls/)) await p.waitForTimeout(1200);
  if ((await click(/^Just give me the result/)) ?? (await click(/^Sim to the next decision/))) await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('.mbar .btn--accent')?.click()); await p.waitForTimeout(800);
}
await nav('match'); await p.waitForTimeout(800);
await p.evaluate(() => document.querySelectorAll('.match-tabs .seg button')[1]?.click()); await p.waitForTimeout(800);
const txt = await p.evaluate(() => document.querySelector('.trends')?.innerText.replace(/\n+/g, ' | ') ?? '');
console.log('  ', txt);
ok(/What keeps happening \| Last \d+ match/i.test(txt), 'Match › Fixtures opens with "What keeps happening" over the last matches');
ok(/W\d+ D\d+ L\d+/.test(txt) && /xG \d+\.\d for, \d+\.\d against/.test(txt), 'it gives the record and xG a match');
const pats = await p.evaluate(() => [...document.querySelectorAll('.trend-list li')].map((li) => ({ t: li.innerText.replace(/\n+/g, ' | '), bad: li.classList.contains('bad'), act: !!li.querySelector('button') })));
ok(pats.length > 0 || /No pattern yet/.test(txt), `patterns, or an honest "no pattern yet" (${pats.length} patterns)`);
ok(pats.every((x) => / \| \d+ of \d+/.test(x.t)), 'each pattern says how often it came up');
const bad = pats.find((x) => x.bad && x.act);
if (bad) {
  const where = await p.evaluate(() => { const b = document.querySelector('.trend-list li.bad button'); const t = b?.innerText; b?.click(); return t; }); await p.waitForTimeout(900);
  const page = await p.evaluate(() => document.querySelector('.page')?.className ?? '');
  ok(/sc-|page/.test(page), `a bad pattern's link (${where}) opens its screen`);
  await nav('match'); await p.waitForTimeout(700); await p.evaluate(() => document.querySelectorAll('.match-tabs .seg button')[1]?.click()); await p.waitForTimeout(700);
}
await p.evaluate(() => { const r = document.querySelector('.trends')?.getBoundingClientRect(); if (r) window.scrollBy(0, r.top - 90); }); await p.waitForTimeout(400);
await p.screenshot({ path: join(OUT, 'trends-phone-en.png') });
const wide = await p.evaluate(() => document.documentElement.scrollWidth); ok(wide <= 390, `no sideways scroll (${wide}px)`);
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(600);
await p.screenshot({ path: join(OUT, 'trends-desktop-en.png') });
await p.setViewportSize({ width: 390, height: 844 });
await browser.close(); server.close();
console.log(fails ? `\n${fails} failed` : CHECK ? '\nall passed' : '\nshots taken');
process.exit(fails ? 1 : 0);

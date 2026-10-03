// Rework §E/§F/§H: the academy loan sheet explains each club (playing time, level against his); Training shows the
// fitness coach's proposed week and "Use his week" applies it; after a few matchdays the dressing room has its
// timeline. Phone EN (AR for the dressing room).
//   DIST=… OUT=… node ui-tests/rework-screens3.mjs        (CHECK=0 to only take screenshots)
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
const area = async (re) => { await nav('squad'); await p.waitForTimeout(700); await p.evaluate((s) => [...document.querySelectorAll('.area-tabs .seg button')].find((b) => new RegExp(s).test(b.innerText))?.click(), re.source); await p.waitForTimeout(900); };
const top = (sel) => p.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); if (r) window.scrollBy(0, r.top - 90); }, sel);
// 1. Academy: the loan sheet for the first kid old enough.
await area(/^Academy$/);
// (a kid under 17 can't go on loan yet: the sheet says so; try the next one)
let opened = false, spots = [];
const nLoan = await p.evaluate(() => [...document.querySelectorAll('.page button')].filter((x) => /^Loan/.test(x.innerText.trim()) && !x.disabled).length);
for (let k = 0; k < nLoan && !spots.length; k++) {
  opened = await p.evaluate((k) => { const b = [...document.querySelectorAll('.page button')].filter((x) => /^Loan/.test(x.innerText.trim()) && !x.disabled)[k]; b?.click(); return !!b; }, k);
  await p.waitForTimeout(900);
  spots = await p.evaluate(() => [...document.querySelectorAll('.loan-spot')].map((r) => r.innerText.replace(/\n+/g, ' | ')));
  if (!spots.length) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
}
spots.slice(0, 2).forEach((s) => console.log('  ', s));
ok(opened && spots.length > 0, `the loan sheet lists clubs (${spots.length})`);
ok(spots.every((s) => /(Would start most weeks|Would rotate|Would mostly sit on the bench)/.test(s) && /Team level \d+, (a step up for him|around his|below his) \(\d+\)/.test(s)), 'each club says the playing time and the level against his');
await p.screenshot({ path: join(OUT, 'academy-loan-phone-en.png') });
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// 2. Training: the coach's week.
await area(/^Training$/);
const wp = await p.evaluate(() => document.querySelector('.weekplan')?.innerText.replace(/\n+/g, ' | ') ?? '');
console.log('  ', wp);
ok(/The fitness coach.s week/.test(wp) && /(Light|Normal|Heavy) intensity, .+ focus/.test(wp) && /fitness; below \d+% he calls them tired/.test(wp), 'Training shows the coach\'s proposed week with its reasons');
if (await click(/^Use his week$/)) { await p.waitForTimeout(900); }
ok(/You.re on his plan/.test(await p.evaluate(() => document.querySelector('.weekplan')?.innerText ?? '')), '"Use his week" puts you on his plan');
await top('.weekplan'); await p.waitForTimeout(300);
await p.screenshot({ path: join(OUT, 'training-weekplan-phone-en.png') });
// 3. A few matchdays, then the dressing room's timeline.
for (let i = 0; i < 8; i++) {
  await click(/^Continue/); await p.waitForTimeout(900);
  if (await click(/^Take the staff calls/)) await p.waitForTimeout(1200);
  if ((await click(/^Just give me the result/)) ?? (await click(/^Sim to the next decision/))) await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('.mbar .btn--accent')?.click()); await p.waitForTimeout(800);
}
await area(/^Dressing room$/);
const log = await p.evaluate(() => document.querySelector('.roomlog')?.innerText.replace(/\n+/g, ' | ') ?? '');
console.log('  ', log.slice(0, 300));
ok(/What happened in the dressing room/.test(log), 'the dressing room has its timeline');
ok(/Nothing yet this season/.test(log) || (await p.evaluate(() => document.querySelectorAll('.roomlog .rl-list li').length)) > 0, 'with lines from the season (or an honest "nothing yet")');
await p.waitForTimeout(800);
await (await p.$('.roomlog'))?.screenshot({ path: join(OUT, 'room-timeline-phone-en.png') });
const wide = await p.evaluate(() => document.documentElement.scrollWidth); ok(wide <= 390, `no sideways scroll (${wide}px)`);
await browser.close(); server.close();
console.log(fails ? `\n${fails} failed` : CHECK ? '\nall passed' : '\nshots taken');
process.exit(fails ? 1 : 0);

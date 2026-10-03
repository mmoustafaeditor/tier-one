// Rework title screen evidence: start a career, play a matchday, reload, and check the slot card (manager, position,
// next match, last played) and the empty slot's "New career" card. Phone (EN, AR) and desktop.
//   DIST=… OUT=… node ui-tests/rework-title.mjs        (CHECK=0 to only take screenshots, e.g. of an older build)
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
// Play two matchdays the quick way.
for (let i = 0; i < 6; i++) {
  await click(/^Continue/); await p.waitForTimeout(900);
  if (await click(/^Take the staff calls/)) await p.waitForTimeout(1200);
  if ((await click(/^Just give me the result/)) ?? (await click(/^Sim to the next decision/))) await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('.mbar .btn--accent')?.click()); await p.waitForTimeout(800);
}
await p.waitForTimeout(1500);
await p.reload(); await boot();
const card = await p.evaluate(() => [...document.querySelectorAll('.title-slots .slot-line')].map((r) => r.innerText.replace(/\s+/g, ' ').trim()));
console.log('  slots:', card.join(' || '));
ok(/Al Ahly/.test(card[0] ?? '') && /Next: .+ \((home|away)\)/.test(card[0]), 'the career card names the next match, home or away');
ok(/\d+(st|nd|rd|th) of \d+/.test(card[0] ?? ''), 'the career card shows the league position');
ok(/Last played/.test(card[0] ?? ''), 'the career card says when it was last played');
ok(/Start a 2026\/27 career/.test(card[1] ?? '') && await p.evaluate(() => !!document.querySelector('.title-slots button.slot-new')), 'the empty slot is a "New career" card');
await p.evaluate(() => document.querySelector('.title-slots')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
await p.screenshot({ path: join(OUT, 'title-slots-phone-en.png') });
await p.evaluate(() => [...document.querySelectorAll('.langs .chip')].find((b) => b.innerText === 'عربي')?.click()); await p.waitForTimeout(800);
await p.evaluate(() => document.querySelector('.title-slots')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
await p.screenshot({ path: join(OUT, 'title-slots-phone-ar.png') });
const wide = await p.evaluate(() => document.documentElement.scrollWidth); ok(wide <= 390, `no sideways scroll in Arabic (${wide}px)`);
await p.evaluate(() => [...document.querySelectorAll('.langs .chip')].find((b) => b.innerText === 'EN')?.click()); await p.waitForTimeout(500);
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(600);
await p.screenshot({ path: join(OUT, 'title-slots-desktop-en.png') });
await browser.close(); server.close();
console.log(fails ? `\n${fails} failed` : CHECK ? '\nall passed' : '\nshots taken');
process.exit(fails ? 1 : 0);

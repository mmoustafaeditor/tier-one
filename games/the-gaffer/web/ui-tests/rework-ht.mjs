// Rework F12 evidence and check: at half-time the team talk is staged with the changes; nothing restarts until
// "Start the second half". Also shoots Continue's label and the courses (F15).
//   DIST=… OUT=… node ui-tests/rework-ht.mjs      (commentary-only highlights so 45' comes quickly)
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
let pw;
try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const dist = process.env.DIST ?? fileURLToPath(new URL('../dist', import.meta.url));
const OUT = process.env.OUT ?? 'shots'; mkdirSync(OUT, { recursive: true });
const html = readFileSync(join(dist, 'index.html'));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;
const browser = await pw.chromium.launch();
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem('gaffer.prefs.v1', JSON.stringify({ hl: 0, rate: 6 })); } catch {} });
const p = await ctx.newPage();
const click = (re) => p.evaluate((src) => { const r = new RegExp(src); const b = [...document.querySelectorAll('button, a, [role=button]')].find((x) => x.getBoundingClientRect().width && r.test(x.innerText.trim())); b?.click(); return b ? b.innerText.trim().slice(0, 50) : null; }, re.source);
const nav = (id) => p.evaluate((id) => document.querySelector(`nav.nav a[href="#${id}"]`)?.click(), id);
await p.goto(URL0); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
await click(/2026\/27/); await p.waitForTimeout(500); await click(/🇪🇬/); await p.waitForTimeout(500);
await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Al Ahly/.test(b.innerText))?.click()); await p.waitForTimeout(600);
await p.evaluate(() => document.querySelector('button.btn--accent.big')?.click()); await p.waitForTimeout(1500);
const label = await p.evaluate(() => document.querySelector('.mast .continue')?.innerText.replace(/\s+/g, ' ').trim());
ok(/to decide/.test(label ?? ''), `Continue says what it does next: "${label}"`);
await p.screenshot({ path: join(OUT, 'continue-label-phone-en.png') });
await nav('career'); await p.waitForTimeout(700);
await p.evaluate(() => [...document.querySelectorAll('.eyebrow')].find((e) => /courses/i.test(e.innerText))?.scrollIntoView({ block: 'start' })); await p.waitForTimeout(300);
await p.screenshot({ path: join(OUT, 'career-courses-phone-en.png') });
await nav('today'); await p.waitForTimeout(500);
await click(/^Continue/); await p.waitForTimeout(1000);
await click(/^Take the staff calls/); await p.waitForTimeout(1500);
const brief = await p.evaluate(() => [...document.querySelectorAll('.brief-list li')].map((l) => l.innerText));
ok(brief.length >= 2, `pre-match briefing: ${brief.join(' | ')}`);
await p.evaluate(() => document.querySelector('.brief')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
await p.screenshot({ path: join(OUT, 'prematch-briefing-phone-en.png') });
await click(/^Walk out/); await p.waitForTimeout(1500);
const ht = await p.waitForSelector('.sc-ht', { timeout: 150000 }).then(() => true).catch(() => false);
ok(ht, 'the match stops at half-time for the analysts');
if (ht) {
  await p.waitForTimeout(600);
  await p.screenshot({ path: join(OUT, 'halftime-phone-en.png'), fullPage: true });
  await click(/^Team talk/); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('.talk .choice')?.click()); await p.waitForTimeout(800);
  const still = await p.evaluate(() => !!document.querySelector('.sc-ht'));
  const btn = await p.evaluate(() => [...document.querySelectorAll('.sc-ht .mbar button')].map((b) => b.innerText.trim()).join(' | '));
  ok(still, 'choosing a team talk does not restart the match (F12)');
  ok(/Team talk: /.test(btn), `the chosen talk shows on its button: ${btn}`);
  await p.screenshot({ path: join(OUT, 'halftime-talk-staged-phone-en.png') });
  await click(/Second half|second half/i); await p.waitForTimeout(1500);
  ok(!(await p.evaluate(() => !!document.querySelector('.sc-ht'))), 'Start the second half restarts the match with everything staged');
}
await browser.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

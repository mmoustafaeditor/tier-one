// Rework §Q/§R/§S/§H/§F, the last screens: the training week strip and the academy age groups at the start; after a
// few matchdays the board's "Why it moved", the forecast under a facility upgrade, the style profile on Career and the
// news sections with "Our club". Phone EN.
//   DIST=… OUT=… node ui-tests/rework-screens4.mjs        (CHECK=0 to only take screenshots)
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
const nav = (id) => p.evaluate((id) => (document.querySelector(`nav.nav a[href="#${id}"]`) ?? document.querySelector(`a[href="#${id}"]`))?.click(), id);
const area = async (re) => { await nav('squad'); await p.waitForTimeout(700); await p.evaluate((s) => [...document.querySelectorAll('.area-tabs .seg button')].find((b) => new RegExp(s).test(b.innerText))?.click(), re.source); await p.waitForTimeout(900); };
const txt = (sel) => p.evaluate((s) => document.querySelector(s)?.innerText.replace(/\n+/g, ' | ') ?? '', sel);
const shotOf = async (sel, name) => { await p.waitForTimeout(500); await (await p.$(sel))?.screenshot({ path: join(OUT, name) }); };
// Training: this week.
await area(/^Training$/);
const wk = await txt('.week'); console.log('  ', wk.slice(0, 220));
ok(/This week/.test(wk) && /Match: .+ \((H|A)\)/.test(wk) && /The game applies the week as a whole/.test(wk), 'Training: "This week" with the real match day and an honest note');
ok(await p.evaluate(() => document.querySelectorAll('.week .wd').length === 7), 'seven days');
await shotOf('.week', 'training-week-phone-en.png');
// Academy: age groups.
await area(/^Academy$/);
const coh = await p.evaluate(() => [...document.querySelectorAll('.cohort .coh-h')].map((h) => h.innerText.replace(/\n+/g, ' | ')));
console.log('  ', coh.join(' || '));
ok(coh.length >= 1 && coh.every((h) => /^Under (18|21) \| \d+ players? · average \d+/.test(h)), 'Academy: groups by age, each with its size and level');
await shotOf('.cohort', 'academy-cohorts-phone-en.png');
// A few matchdays.
for (let i = 0; i < 5; i++) {
  await click(/^Continue/); await p.waitForTimeout(900);
  if (await click(/^Take the staff calls/)) await p.waitForTimeout(1200);
  if ((await click(/^Just give me the result/)) ?? (await click(/^Sim to the next decision/))) await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('.mbar .btn--accent')?.click()); await p.waitForTimeout(800);
}
// Club › Board: why it moved.
await nav('club'); await p.waitForTimeout(800);
await p.evaluate(() => [...document.querySelectorAll('.page .seg button, .o-tabs button')].find((b) => /^Board$/.test(b.innerText.trim()))?.click()); await p.waitForTimeout(800);
const bl = await txt('.board-log'); console.log('  ', bl.slice(0, 260));
ok(/Why it moved/.test(bl) && /[+−]\d+\.\d .+ against .+: (better|worse) than they expected/.test(bl), 'Board: the trust moves with their causes (results against expectations)');
await shotOf('.board-log', 'board-why-phone-en.png');
// Facilities: the forecast.
await p.evaluate(() => [...document.querySelectorAll('.page .seg button, .o-tabs button')].find((b) => /^Facilities$/.test(b.innerText.trim()))?.click()); await p.waitForTimeout(800);
const fc = await p.evaluate(() => [...document.querySelectorAll('.fac-fc')].map((x) => x.innerText));
console.log('  ', fc[0] ?? '(none)');
ok(fc.length > 0 && fc.every((s) => /^After paying: .+ cash · \+.+ a month upkeep · lowest point this season .+ \(.+\)/.test(s)), `Facilities: a forecast under each upgrade you can afford (${fc.length})`);
await shotOf('.sc-office .fac', 'facility-forecast-phone-en.png');
// Career: the style profile.
await nav('career'); await p.waitForTimeout(900);
const sp = await txt('.style-profile'); console.log('  ', sp.slice(0, 300));
ok(/Your style, from what you.ve done/.test(sp) && /Plays “.+” in a [\d-]+/.test(sp) && /Runs \d of 7 departments himself/.test(sp), 'Career: the style profile, from the career');
await shotOf('.style-profile', 'career-style-phone-en.png');
// News: sections.
await nav('news'); await p.waitForTimeout(800);
await p.evaluate(() => [...document.querySelectorAll('.sc-news .chips .chip')].find((b) => /^News/.test(b.innerText.trim()))?.click()); await p.waitForTimeout(700);
const secs = await p.evaluate(() => [...document.querySelectorAll('.news-secs .chip')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
console.log('  ', secs.join(' | '));
ok(secs.length >= 3 && /^All \d+/.test(secs[0]) && /^Our club \d+/.test(secs[1]), 'News: sections with counts, starting with All and Our club');
const allN = await p.evaluate(() => document.querySelectorAll('.sc-news .row.news').length);
await p.evaluate(() => document.querySelectorAll('.news-secs .chip')[1]?.click()); await p.waitForTimeout(500);
const mine = await p.evaluate(() => ({ n: document.querySelectorAll('.sc-news .row.news').length, all: [...document.querySelectorAll('.sc-news .row.news')].every((r) => r.classList.contains('mine')) }));
ok(mine.n <= allN && mine.all, `"Our club" shows only our club's news (${mine.n} of ${allN})`);
await shotOf('.sc-news .panel', 'news-sections-phone-en.png');
const wide = await p.evaluate(() => document.documentElement.scrollWidth); ok(wide <= 390, `no sideways scroll (${wide}px)`);
await browser.close(); server.close();
console.log(fails ? `\n${fails} failed` : CHECK ? '\nall passed' : '\nshots taken');
process.exit(fails ? 1 : 0);

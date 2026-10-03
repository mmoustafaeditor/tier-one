// Rework §J Tactics Lab on the pre-match screen: folded until asked; the current plan shows the same win chance as the
// tunnel's odds; seven styles with the engine's odds; another shape re-works them; Use sets the plan and the tunnel's
// odds become that row's. Phone EN, then AR for layout.
//   DIST=… OUT=… node ui-tests/rework-lab.mjs        (CHECK=0 to only take screenshots)
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
// To the tunnel.
for (let i = 0; i < 4 && !(await p.$('.sc-pre')); i++) { await click(/^Continue/); await p.waitForTimeout(900); if (await click(/^Take the staff calls/)) await p.waitForTimeout(1200); }
ok(!!(await p.$('.sc-pre')), 'reached the pre-match screen');
const kpi = () => p.evaluate(() => document.querySelector('.sc-pre .facts .kpi .v')?.innerText ?? '');
ok(!(await p.$('.lab .lab-row')), 'the lab is folded until asked for');
await click(/^Try another plan$/); await p.waitForTimeout(800);
const rows = () => p.evaluate(() => [...document.querySelectorAll('.lab .lab-row')].map((r) => ({ t: r.innerText.replace(/\n+/g, ' | '), v: r.querySelector('.v')?.innerText ?? '', use: !!r.querySelector('button') })));
let r = await rows(); console.log('  ', r.map((x) => x.t).join(' || ').slice(0, 400));
ok(r.length === 8, 'the current plan and seven styles');
ok(r[0].v === (await kpi()), `the current plan's win chance is the tunnel's (${r[0].v})`);
ok(r.slice(1).filter((x) => !x.use).length === 1, 'the style in use is marked, the others can be used');
ok(new Set(r.slice(1).map((x) => x.v)).size >= 3, 'the styles give different odds');
await (await p.$('.lab'))?.screenshot({ path: join(OUT, 'lab-phone-en.png') });
// Another shape.
const before = r.slice(1).map((x) => x.v).join();
await p.selectOption('.lab select', '3-5-2'); await p.waitForTimeout(600);
r = await rows();
ok(r.slice(1).map((x) => x.v).join() !== before && r.slice(1).every((x) => x.use), 'another shape re-works the odds; every style there can be used');
// Use the best one: the tunnel's odds become its.
const best = r[1].v;
await p.evaluate(() => document.querySelectorAll('.lab .lab-row')[1].querySelector('button')?.click()); await p.waitForTimeout(1200);
ok((await kpi()) === best, `after Use the tunnel's win chance is that row's (${best})`);
const sheet = await p.evaluate(() => [...document.querySelectorAll('.sc-pre .xi-h')].map((e) => e.innerText).join(' '));
ok(/3-5-2/.test(sheet), 'and the team sheet shows the new shape');
ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'EN: no sideways scroll on the phone');
// AR on a narrow phone: the same panel fits. Started in Arabic; the onboarding answers and Continue are the first
// accent/option buttons.
for (const W of [320, 390]) {
  const q = await (await browser.newContext({ viewport: { width: W, height: 800 }, deviceScaleFactor: 2 })).newPage();
  const cT = (s) => q.evaluate((s) => [...document.querySelectorAll('button')].find((x) => new RegExp(s).test(x.innerText))?.click(), s);
  await q.goto(URL0); await q.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await q.waitForTimeout(800);
  await cT('^عربي$'); await q.waitForTimeout(400); await cT('2026/27'); await q.waitForTimeout(400); await cT('🇪🇬'); await q.waitForTimeout(400);
  await cT('الأهلي'); await q.waitForTimeout(500);
  await q.evaluate(() => document.querySelector('button.btn--accent.big')?.click()); await q.waitForTimeout(1500);
  for (let k = 0; k < 2; k++) { await q.evaluate(() => document.querySelector('button.choice.pick')?.click()); await q.waitForTimeout(500); }
  for (let i = 0; i < 6 && !(await q.$('.sc-pre')); i++) {
    await q.evaluate(() => document.querySelector('button.btn--accent.continue')?.click()); await q.waitForTimeout(1000);
    await q.evaluate(() => document.querySelector('[role=dialog] .btn--accent')?.click()); await q.waitForTimeout(1000);
  }
  ok(!!(await q.$('.sc-pre')), `AR ${W}px: reached the pre-match screen`);
  await cT('^جرّب خطة تانية$'); await q.waitForTimeout(800);
  ok((await q.$$('.lab .lab-row')).length === 8, `AR ${W}px: the lab opens with eight rows`);
  ok(!(await q.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `AR ${W}px: no sideways scroll`);
  if (W === 390) await (await q.$('.lab'))?.screenshot({ path: join(OUT, 'lab-phone-ar.png') });
}
await browser.close(); server.close();
console.log(CHECK ? (fails ? `\n${fails} FAILED` : '\nall passed') : 'screenshots taken');
process.exit(fails ? 1 : 0);

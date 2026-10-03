// Rework M3 evidence in the real build (phone width): promote a youngster through the promotion sheet, sim until the
// assistant flags his pathway promise, start him from the card, play the match, reload the page and check the XI.
//   DIST=… OUT=… node ui-tests/rework-slice.mjs
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
let pw; try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const dist = process.env.DIST ?? fileURLToPath(new URL('../dist', import.meta.url));
const OUT = process.env.OUT ?? 'shots'; mkdirSync(OUT, { recursive: true });
const html = readFileSync(join(dist, 'index.html'));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;
const browser = await pw.chromium.launch();
let fails = 0, n = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const shot = async (name) => { await p.waitForTimeout(500); await p.screenshot({ path: join(OUT, `slice-${String(++n).padStart(2, '0')}-${name}.png`) }); };
const click = (re) => p.evaluate((src) => { const r = new RegExp(src); const b = [...document.querySelectorAll('button, a, [role=button]')].find((x) => x.getBoundingClientRect().width && r.test(x.innerText.trim())); b?.click(); return b ? b.innerText.trim().slice(0, 50) : null; }, re.source);
const nav = (id) => p.evaluate((id) => document.querySelector(`nav.nav a[href="#${id}"]`)?.click(), id);
const body = () => p.evaluate(() => document.body.innerText);
await p.goto(URL0); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
await click(/2026\/27/); await p.waitForTimeout(500); await click(/🇪🇬/); await p.waitForTimeout(500);
await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Al Ahly/.test(b.innerText))?.click()); await p.waitForTimeout(600);
await p.evaluate(() => document.querySelector('button.btn--accent.big')?.click()); await p.waitForTimeout(1500);
await click(/^Our target is right/); await p.waitForTimeout(400); await click(/^The usual split/); await p.waitForTimeout(600);
// 1. Promote the first academy player old enough, through the sheet.
await nav('squad'); await p.waitForTimeout(700);
await p.evaluate(() => { const s = document.querySelector('.page .seg'); s?.querySelectorAll('button')[4]?.click(); }); await p.waitForTimeout(800);
const kid = await p.evaluate(() => { const row = [...document.querySelectorAll('.ac-row')].find((r) => !r.querySelector('.btns button')?.disabled); row?.querySelector('.btns button')?.click(); return row?.querySelector('.name')?.childNodes[0]?.textContent?.trim() ?? null; });
await p.waitForTimeout(700); await shot('promotion-sheet');
ok(!!kid && /10 appearances/.test(await body()), `1 the promotion sheet states the promise for ${kid}`);
await click(/^Promote him/); await p.waitForTimeout(1000);
// 2. Sim until the assistant's card about his pathway shows on Today.
const short = kid.split(' ').slice(-1)[0];
let found = false;
for (let i = 0; i < (+process.env.LOOPS || 25) && !found; i++) {
  await nav('today'); await p.waitForTimeout(700);
  await click(/^\+\d+ more on the desk/); await p.waitForTimeout(300);
  if (new RegExp(`Your word to [^\\n]*${short}[^\\n]*pathway`).test(await body())) { found = true; break; }
  if (process.env.DEBUG) console.log('  cards:', await p.evaluate(() => [...document.querySelectorAll('.a-dec h3, .a-dec .ttl, .a-dec h2')].map((e) => e.innerText.trim()).join(' / ')));
  const c1 = await click(/^Continue/); await p.waitForTimeout(900);
  const c2 = await click(/^Take the staff calls/); if (c2) await p.waitForTimeout(1200);
  const c3 = (await click(/^Sim to the next decision/)) ?? (await click(/^Just give me the result/));
  await p.waitForTimeout(2500);
  const c4 = await p.evaluate(() => { const b = document.querySelector('.mbar .btn--accent'); b?.click(); return b?.innerText.trim() ?? null; }); await p.waitForTimeout(800);
  const wk = await p.evaluate(() => document.querySelector('.officebar .when span')?.innerText ?? '');
  if (process.env.DEBUG) console.log('  loop', i, wk, '|', c1, '|', c2, '|', c3, '|', c4);
}
if (!found && process.env.DEBUG) {
  await nav('squad'); await p.waitForTimeout(700);
  console.log('  squad has him:', await p.evaluate((s) => document.body.innerText.includes(s), short));
  await p.evaluate((s) => [...document.querySelectorAll('.page *')].filter((b) => b.children.length < 6 && b.innerText?.includes(s)).map((b) => b.closest('button, a, [role=button]')).find(Boolean)?.click(), short); await p.waitForTimeout(1200);
  console.log('  player page:', (await body()).split('\n').filter((l) => /games|pathway|loan|Prospect|10/.test(l)).slice(0, 8).join(' | '));
}
ok(found, `2 the assistant flags ${kid}'s pathway promise on Today`);
if (found) {
  await p.evaluate((s) => [...document.querySelectorAll('.dcard, article')].find((a) => new RegExp(`Your word to [^\\n]*${s}`).test(a.innerText))?.scrollIntoView({ block: 'center' }), short); await p.waitForTimeout(300);
  await shot('promise-at-risk-card');
  ok(!!(await click(new RegExp(`^Start ${short}|^Start .*${short}`))), '3 start him from the card');
  await p.waitForTimeout(800);
  await nav('match'); await p.waitForTimeout(900); await shot('tactics-your-xi');
  ok(/Your XI/.test(await body()) && (await body()).includes(short), '4 Tactics: "Your XI", and he is in it');
  await nav('today'); await p.waitForTimeout(500);
  await click(/^Continue/); await p.waitForTimeout(900);
  if (await click(/^Take the staff calls/)) await p.waitForTimeout(1200);
  await click(/^Just give me the result/); await p.waitForTimeout(3000);
  await click(/^All \d+/); await p.waitForTimeout(400);
  await shot('full-time-he-played');
  ok((await body()).includes(short), '5 full time: he is in the ratings');
  await click(/^Continue/); await p.waitForTimeout(1000);
  // Reload the page: the career comes back from its slot.
  await p.reload(); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1500);
  await click(/^Continue$/); await p.waitForTimeout(2000); // the saved career's Continue on the title screen
  await nav('squad'); await p.waitForTimeout(700);
  await p.evaluate((s) => [...document.querySelectorAll('.page button, .page a')].find((b) => b.innerText.includes(s))?.click(), short); await p.waitForTimeout(1200);
  await shot('player-after-reload');
  ok(/of 10 games|10 games/.test(await body()), '6 after reload: his player page shows the promise progress');
}
await browser.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

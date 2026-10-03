// Rework squad planner evidence: start a career, open Squad, check the planner (four lines, roles, deals, ages, the
// scouts' needs) and that a need opens Transfers › Needs. Phone (EN, AR) and desktop.
//   DIST=… OUT=… node ui-tests/rework-planner.mjs        (CHECK=0 to only take screenshots, e.g. of an older build)
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
await nav('squad'); await p.waitForTimeout(900);
const folded = await p.evaluate(() => !!document.querySelector('.g-plan .plan-fold'));
ok(folded, 'on a phone the planner starts folded to one row, so the player list stays near the top');
await p.evaluate(() => document.querySelector('.g-plan')?.scrollIntoView({ block: 'start' })); await p.waitForTimeout(400);
await p.screenshot({ path: join(OUT, 'planner-phone-folded-en.png') });
await p.evaluate(() => document.querySelector('.g-plan .plan-fold')?.click()); await p.waitForTimeout(500);
const lines = await p.evaluate(() => [...document.querySelectorAll('.g-plan .plan-line')].map((r) => r.innerText.replace(/\s+/g, ' ').trim()));
lines.forEach((l) => console.log('  ', l));
ok(lines.length === 4, 'the planner shows four lines');
ok(lines.every((l) => /First choice \d+ · Rotation \d+ · Prospects \d+/.test(l) && /Average age/.test(l)), 'each line has roles and age');
ok(lines.every((l) => /deals? ends?|next season|No deals ending soon/.test(l)), 'each line says whose deals run out');
await p.evaluate(() => document.querySelector('.g-plan')?.scrollIntoView({ block: 'start' })); await p.waitForTimeout(400);
await p.screenshot({ path: join(OUT, 'planner-phone-en.png') });
const need = await p.evaluate(() => { const b = document.querySelector('.g-plan .plan-needs button'); b?.click(); return b?.innerText ?? null; });
if (need) { await p.waitForTimeout(900); ok(await p.evaluate(() => [...document.querySelectorAll('.rc-tabs .chip[aria-pressed=true], .stage[aria-pressed=true]')].some((b) => /Needs/.test(b.innerText))), `a need (${need}) opens Transfers › Needs`); await nav('squad'); await p.waitForTimeout(800); }
else console.log('  (no open needs in this squad)');
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(700);
await p.screenshot({ path: join(OUT, 'planner-desktop-en.png') });
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(1200); await p.reload(); await boot();
await p.evaluate(() => [...document.querySelectorAll('.langs .chip')].find((b) => b.innerText === 'عربي')?.click()); await p.waitForTimeout(700);
await p.evaluate(() => document.querySelector('.title-slots .slot-line .btn--primary')?.click()); await p.waitForTimeout(1800);
await nav('squad'); await p.waitForTimeout(900);
await p.evaluate(() => document.querySelector('.g-plan')?.scrollIntoView({ block: 'start' })); await p.waitForTimeout(400);
ok(await p.evaluate(() => document.querySelectorAll('.g-plan .plan-line').length === 4 && /الدفاع/.test(document.querySelector('.g-plan')?.innerText ?? '')), 'the planner shows in Arabic');
const wide = await p.evaluate(() => document.documentElement.scrollWidth); ok(wide <= 390, `no sideways scroll in Arabic (${wide}px)`);
await p.screenshot({ path: join(OUT, 'planner-phone-ar.png') });
await browser.close(); server.close();
console.log(fails ? `\n${fails} failed` : CHECK ? '\nall passed' : '\nshots taken');
process.exit(fails ? 1 : 0);

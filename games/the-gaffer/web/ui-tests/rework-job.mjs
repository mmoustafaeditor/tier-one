// Rework new-career evidence: the club page has "About the job" (league rank by squad strength and budget, age vs
// the league, derbies, expiring deals in the first eleven). Phone (EN, AR) and desktop.
//   DIST=… OUT=… node ui-tests/rework-job.mjs        (CHECK=0 to only take screenshots)
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
const facts = await p.evaluate(() => [...document.querySelectorAll('.job-list li')].map((l) => l.innerText));
facts.forEach((f) => console.log('  ', f));
ok(facts.length >= 4, 'the club page lists the job facts');
ok(/strongest squad of \d+/.test(facts[0] ?? '') && /transfer budget of \d+/.test(facts[1] ?? ''), 'rank by strength and budget');
ok(facts.some((f) => /^Derby: .*Zamalek/.test(f)), 'Al Ahly’s derby with Zamalek is named');
await p.evaluate(() => document.querySelector('.job')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
await p.screenshot({ path: join(OUT, 'job-phone-en.png') });
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(600); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
await p.screenshot({ path: join(OUT, 'job-desktop-en.png') });
await p.setViewportSize({ width: 390, height: 844 });
await p.goto(URL0); await boot();
await p.evaluate(() => [...document.querySelectorAll('.langs .chip')].find((b) => b.innerText === 'عربي')?.click()); await p.waitForTimeout(600);
await p.evaluate(() => document.querySelector('.title-new .btn--primary')?.click()); await p.waitForTimeout(500); await click(/🇪🇬/); await p.waitForTimeout(500);
await p.evaluate(() => [...document.querySelectorAll('.page button')].find((b) => /الأهلي/.test(b.innerText))?.click()); await p.waitForTimeout(700);
ok(await p.evaluate(() => document.querySelectorAll('.job-list li').length >= 4 && /الديربي/.test(document.querySelector('.job')?.innerText ?? '')), 'the job facts in Arabic');
const wide = await p.evaluate(() => document.documentElement.scrollWidth); ok(wide <= 390, `no sideways scroll in Arabic (${wide}px)`);
await p.evaluate(() => document.querySelector('.job')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
await p.screenshot({ path: join(OUT, 'job-phone-ar.png') });
await browser.close(); server.close();
console.log(fails ? `\n${fails} failed` : CHECK ? '\nall passed' : '\nshots taken');
process.exit(fails ? 1 : 0);

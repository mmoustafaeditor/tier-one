// Rework §I: "In your 4-3-3" on the player page (sim/planfit.ts): a starter reads as starting, a bench player is
// compared with the man in his slot, a player the scouts don't know asks to be scouted. Phone EN and AR.
//   DIST=… OUT=… node ui-tests/rework-planfit.mjs        (CHECK=0 to only take screenshots)
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
const fitText = () => p.evaluate(() => document.querySelector('.plan-fit')?.innerText.replace(/\n+/g, ' | ') ?? '');
const openNth = async (n) => { await nav('squad'); await p.waitForTimeout(800); await p.evaluate(() => document.querySelector('.sq-all')?.click()); await p.waitForTimeout(400); await p.evaluate((n) => document.querySelectorAll('.sq-r')[n]?.click(), n); await p.waitForTimeout(900); };
await openNth(0);
const t1 = await fitText(); console.log('  first player:', t1);
ok(/In your [\d-]+ \| Starts at /i.test(t1), 'a starter: "In your <shape> — Starts at <position>"');
await p.evaluate(() => { const r = document.querySelector('.plan-fit')?.getBoundingClientRect(); if (r) window.scrollBy(0, r.top - 120); }); await p.waitForTimeout(400);
await p.screenshot({ path: join(OUT, 'planfit-starter-phone-en.png') });
const n = await p.evaluate(() => { document.querySelector('nav.nav a[href="#squad"]')?.click(); return 0; });
await openNth(20);
const t2 = await fitText(); console.log('  a bench player:', t2);
ok(/(Would start at|Pushing|Behind|No natural place)/.test(t2), 'a bench player is compared with the man in his slot');
await p.evaluate(() => { const r = document.querySelector('.plan-fit')?.getBoundingClientRect(); if (r) window.scrollBy(0, r.top - 120); }); await p.waitForTimeout(400);
await p.screenshot({ path: join(OUT, 'planfit-bench-phone-en.png') });
// Someone at another club: open the league table's top scorer list? Use Transfers › Search's first result.
await nav('transfers'); await p.waitForTimeout(800);
await p.evaluate(() => [...document.querySelectorAll('.rc-funnel .stage, .stage')].find((b) => /Shortlist|search/i.test(b.innerText))?.click()); await p.waitForTimeout(600);
await p.evaluate(() => [...document.querySelectorAll('.rc-tabs .chip')].find((b) => /^Search$/.test(b.innerText.trim()))?.click()); await p.waitForTimeout(900);
const opened = await p.evaluate(() => { const b = document.querySelector('.page .pl, .page .row--btn, .page button.row'); b?.click(); return !!b; }); await p.waitForTimeout(900);
const t3 = opened ? await fitText() : ''; console.log('  a player elsewhere:', t3);
ok(!opened || /Scout him|Would start|Pushing|Behind|No natural place/.test(t3), 'a player elsewhere: scout him first, or the comparison once known');
const wide = await p.evaluate(() => document.documentElement.scrollWidth); ok(wide <= 390, `no sideways scroll (${wide}px)`);
await browser.close(); server.close();
console.log(fails ? `\n${fails} failed` : CHECK ? '\nall passed' : '\nshots taken');
process.exit(fails ? 1 : 0);

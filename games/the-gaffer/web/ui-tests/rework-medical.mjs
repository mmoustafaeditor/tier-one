// Rework §G: Medical lists players who are fit but not match-ready (below 78% fitness), with an honest return estimate
// (+12% a matchday) and the rest switch. Plays a few matchdays first so there are tired legs.
//   DIST=… OUT=… node ui-tests/rework-medical.mjs        (CHECK=0 to only take screenshots)
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
for (let i = 0; i < 4; i++) {
  await click(/^Continue/); await p.waitForTimeout(900);
  if (await click(/^Take the staff calls/)) await p.waitForTimeout(1200);
  if ((await click(/^Just give me the result/)) ?? (await click(/^Sim to the next decision/))) await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('.mbar .btn--accent')?.click()); await p.waitForTimeout(800);
}
await p.evaluate(() => document.querySelector('nav.nav a[href="#squad"]')?.click()); await p.waitForTimeout(800);
await p.evaluate(() => [...document.querySelectorAll('.area-tabs .seg button, .sq-tiles button')].find((b) => /Medical/.test(b.innerText))?.click()); await p.waitForTimeout(900);
const txt = await p.evaluate(() => document.querySelector('.sharp')?.innerText.replace(/\n+/g, ' | ') ?? '');
console.log('  ', txt.slice(0, 300));
ok(/Fit, not match-ready/.test(txt), 'Medical has "Fit, not match-ready"');
const rows = await p.evaluate(() => [...document.querySelectorAll('.sharp .row .sub')].map((s) => s.innerText));
ok(rows.length > 0 ? rows.every((r) => { const m = r.match(/^(\d+)% fit · ready in about (\d+) matchday/); return !!m && +m[1] < 78 && +m[2] === Math.max(1, Math.ceil((78 - +m[1]) / 12)); }) : /Everyone who is fit/.test(txt), `each line: fitness under 78% and matchdays at +12% a matchday (${rows.length} players)`);
await p.evaluate(() => { const r = document.querySelector('.sharp')?.getBoundingClientRect(); if (r) window.scrollBy(0, r.top - 90); }); await p.waitForTimeout(400);
await p.screenshot({ path: join(OUT, 'medical-sharp-phone-en.png') });
const wide = await p.evaluate(() => document.documentElement.scrollWidth); ok(wide <= 390, `no sideways scroll (${wide}px)`);
await browser.close(); server.close();
console.log(fails ? `\n${fails} failed` : CHECK ? '\nall passed' : '\nshots taken');
process.exit(fails ? 1 : 0);

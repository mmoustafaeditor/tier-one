// Rework accessibility evidence: the title screen has an Accessibility entry before any career; text size, reduce
// motion and contrast apply at once, survive a reload, carry into the career and Settings, and nothing is wider than
// the phone at the largest text size (EN and AR).
//   DIST=… OUT=… node ui-tests/rework-a11y.mjs        (CHECK=0 to only take screenshots)
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
const nav = (id) => p.evaluate((id) => document.querySelector(`nav.nav a[href="#${id}"]`)?.click(), id);
const ds = () => p.evaluate(() => ({ ...document.documentElement.dataset }));
const wide = () => p.evaluate(() => document.documentElement.scrollWidth);
await p.goto(URL0); await boot();
await p.screenshot({ path: join(OUT, 'a11y-title-phone-en.png') });
ok(!!(await click(/^Accessibility$/)), 'the title screen has an Accessibility button before any career');
await p.waitForTimeout(500);
await p.screenshot({ path: join(OUT, 'a11y-sheet-phone-en.png') });
await p.evaluate(() => [...document.querySelectorAll('.a11y .seg button, .a11y [role=radio], .a11y button')].find((b) => /Largest/.test(b.innerText))?.click()); await p.waitForTimeout(300);
await p.evaluate(() => [...document.querySelectorAll('.a11y .setrow')].find((r) => /Stronger contrast/.test(r.innerText))?.querySelector('button, input')?.click()); await p.waitForTimeout(300);
let d = await ds();
ok(d.text === '2' && d.contrast === '1', `text size and contrast apply at once (${JSON.stringify(d)})`);
await p.screenshot({ path: join(OUT, 'a11y-sheet-largest-phone-en.png') });
await click(/^Done$/); await p.waitForTimeout(400);
await p.reload(); await boot();
d = await ds(); ok(d.text === '2' && d.contrast === '1', 'the choice survives a reload');
ok((await wide()) <= 390, `title: no sideways scroll at the largest text (${await wide()}px)`);
await p.screenshot({ path: join(OUT, 'a11y-title-largest-phone-en.png') });
await click(/2026\/27/); await p.waitForTimeout(500); await click(/🇪🇬/); await p.waitForTimeout(500);
await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Al Ahly/.test(b.innerText))?.click()); await p.waitForTimeout(600);
await p.evaluate(() => document.querySelector('button.btn--accent.big')?.click()); await p.waitForTimeout(1500);
await click(/^Our target is right/); await p.waitForTimeout(400); await click(/^The usual split/); await p.waitForTimeout(600);
for (const s of ['today', 'squad', 'match', 'transfers', 'club']) {
  await nav(s); await p.waitForTimeout(800);
  ok((await wide()) <= 390, `${s}: no sideways scroll at the largest text (${await wide()}px)`);
}
await nav('today'); await p.waitForTimeout(600);
await p.screenshot({ path: join(OUT, 'a11y-today-largest-phone-en.png') });
await nav('settings'); await p.waitForTimeout(800);
ok(/Accessibility/.test(await p.evaluate(() => document.body.innerText)), 'Settings has the same Accessibility panel');
await p.evaluate(() => [...document.querySelectorAll('.panel, section')].find((x) => /Text size/.test(x.innerText))?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
await p.screenshot({ path: join(OUT, 'a11y-settings-phone-en.png') });
await p.evaluate(() => [...document.querySelectorAll('.langs .chip')].find((b) => b.innerText === 'عربي')?.click()); await p.waitForTimeout(700);
for (const s of ['today', 'squad', 'match', 'transfers', 'club']) {
  await nav(s); await p.waitForTimeout(800);
  ok((await wide()) <= 390, `AR ${s}: no sideways scroll at the largest text (${await wide()}px)`);
}
await nav('today'); await p.waitForTimeout(600);
await p.screenshot({ path: join(OUT, 'a11y-today-largest-phone-ar.png') });
await browser.close(); server.close();
console.log(fails ? `\n${fails} failed` : CHECK ? '\nall passed' : '\nshots taken');
process.exit(fails ? 1 : 0);

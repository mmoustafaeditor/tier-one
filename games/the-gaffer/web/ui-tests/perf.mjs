// Rework M5: performance numbers from the real build in headless Chromium, at full speed and with the CPU slowed 4×
// (a rough stand-in for a mid-range phone; not a device measurement). Prints a table; fails only past generous budgets.
//   node ui-tests/perf.mjs
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
let pw; try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const dist = process.env.DIST ?? fileURLToPath(new URL('../dist', import.meta.url));
const html = readFileSync(join(dist, 'index.html'));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;
const browser = await pw.chromium.launch();
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
console.log(`build: ${(statSync(join(dist, 'index.html')).size / 1024).toFixed(0)} KB, gzip ${(gzipSync(html).length / 1024).toFixed(0)} KB`);
const rows = [];
for (const slow of [1, 4]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: slow });
  const click = (re) => p.evaluate((src) => { const r = new RegExp(src); const b = [...document.querySelectorAll('button, a')].find((x) => x.getBoundingClientRect().width && r.test(x.innerText.trim())); b?.click(); return !!b; }, re.source);
  const time = async (fn, until) => { const t = Date.now(); await fn(); await p.waitForFunction(until, null, { timeout: 120000, polling: 50 }); return Date.now() - t; };
  const boot = await time(() => p.goto(URL0), () => window.__bootDone === true);
  await p.waitForTimeout(800);
  await click(/2026\/27/); await p.waitForTimeout(400); await click(/🇪🇬/); await p.waitForTimeout(400);
  await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Al Ahly/.test(b.innerText))?.click()); await p.waitForTimeout(600);
  const create = await time(() => p.evaluate(() => document.querySelector('button.btn--accent.big')?.click()), () => !!document.querySelector('nav.nav'));
  await p.waitForTimeout(600);
  await click(/^Our target is right/); await p.waitForTimeout(400); await click(/^The usual split/); await p.waitForTimeout(600);
  const tab = await time(() => p.evaluate(() => document.querySelector('nav.nav a[href="#squad"]')?.click()), () => !!document.querySelector('.sc-squad .plist'));
  await p.evaluate(() => document.querySelector('nav.nav a[href="#today"]')?.click()); await p.waitForTimeout(600);
  await click(/^Continue/); await p.waitForTimeout(500);
  if (await click(/^Take the staff calls/)) await p.waitForTimeout(800);
  if (process.env.DEBUG) console.log('before:', (await p.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\n/g, ' | '));
  const result = await time(() => click(/^Just give me the result/), () => !/Just give me the result/.test(document.body.innerText) && !!document.querySelector('.sc-ft, .ft'));
  const heap = await p.evaluate(() => (performance.memory?.usedJSHeapSize ?? 0) / 1048576);
  rows.push({ slow, boot, create, tab, result, heap });
  await ctx.close();
}
console.log('CPU   boot→ready  new career  open Squad  quick result  JS heap');
for (const r of rows) console.log(`${r.slow}×    ${String(r.boot).padStart(6)} ms  ${String(r.create).padStart(7)} ms  ${String(r.tab).padStart(7)} ms  ${String(r.result).padStart(9)} ms  ${r.heap.toFixed(0)} MB`);
const s4 = rows.find((r) => r.slow === 4);
ok(s4.boot < 15000, `4× slower CPU: ready in under 15 s (${s4.boot} ms; includes the intro)`);
ok(s4.tab < 1500, `4× slower CPU: a main tab opens in under 1.5 s (${s4.tab} ms)`);
ok(s4.result < 20000, `4× slower CPU: a quick result in under 20 s (${s4.result} ms)`);
await browser.close(); server.close();
console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);

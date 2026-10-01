// Pitch movement measurements (plan: "خطة تحسين حركة اللاعيبة"). Runs a watched match in the built game (dist/) with
// ?pitchdebug, samples every player's position each frame, and checks the acceptance criteria of the movement plan.
//   npm run build && node ui-tests/pitch.mjs
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { measure } from './pitch-metrics.mjs';

let pw;
try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const html = readFileSync(fileURLToPath(new URL('../dist/index.html', import.meta.url)));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const URL0 = `http://localhost:${server.address().port}/?pitchdebug`;
const browser = await pw.chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const tap = async (t) => {
  const r = await p.evaluate((t) => { const css = t.startsWith('css:'); const b = css ? document.querySelector(t.slice(4)) : [...document.querySelectorAll('button, a')].find((b) => b.getBoundingClientRect().width && b.innerText.trim().replace(/\s+/g, ' ').startsWith(t)); if (!b) return null; b.scrollIntoView({ block: 'center' }); const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; }, t);
  if (!r) throw new Error(`not found: ${t}`); await p.mouse.click(r[0], r[1]); await p.waitForTimeout(900);
};
await p.goto(URL0); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
await tap('Start a 2026/27 career'); await tap('🇪🇬'); await tap('A Al Ahly'); await p.waitForTimeout(800);
await tap('css:button.btn--accent.big'); await p.waitForTimeout(1500);
await tap('The usual split'); await tap('Our target is right');
await tap('Continue'); if (await p.evaluate(() => /Take the staff calls/.test(document.body.innerText))) await tap('Take the staff calls');
await tap('Walk out'); await p.waitForTimeout(3000);
// Sample for SECONDS of real time.
const SECONDS = Number(process.env.SECONDS ?? 40);
let samples = await p.evaluate(async (secs) => {
  const out = []; const t0 = performance.now();
  while (performance.now() - t0 < secs * 1000) {
    await new Promise((r) => requestAnimationFrame(r));
    const d = window.__gafferPitch; if (!d) continue;
    const a = d.a; out.push({ t: a.time, go: a.go !== false, min: a.minute, gkT: a.gkT ? { ...a.gkT } : null, mk: a.mk ? [...a.mk] : null, carrier: a.flight ? -1 : a.carrier, tanks: a.ag.map((r) => r.map((g) => g ? [Math.round(g.tank * 1000) / 1000, g.spr ? 1 : 0] : null)), bh: a.bh, sp: a.sp && a.time < a.sp.until ? { ...a.sp } : null, flag: !!a.flag && a.time < a.flag.until, runs: a.runsN, trans: a.trans ? { ...a.trans } : null, beatLen: a.beatLen, poss: a.poss, ball: { ...a.ball }, pos: a.pos.map((s) => s.map((q) => q ? { x: q.x, y: q.y } : null)), spd: a.spd, slots: d.slots, pressing: d.pressing });
  }
  const A = window.__gafferPitch?.a;
  return { out, kinds: { ...A?.kinds }, reacts: A?.reacts ?? [], kin: { ...A?.kin } };
}, SECONDS);
const kinds = samples.kinds, reacts = samples.reacts, kin = samples.kin; samples = samples.out;
let fails = 0; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const allFrames = measure(samples, { kinds, reacts, kin, seconds: SECONDS }, ok);
ok(allFrames > SECONDS * 20, `the pitch keeps 20+ frames a second (${(allFrames / SECONDS).toFixed(0)} fps)`);
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
ok(!errs.length, `no console errors${errs.length ? ': ' + errs[0] : ''}`);
await browser.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

// Pitch movement measurements (plan: "خطة تحسين حركة اللاعيبة"). Runs a watched match in the built game (dist/) with
// ?pitchdebug, samples every player's position each frame, and checks the acceptance criteria of the movement plan.
//   npm run build && node ui-tests/pitch.mjs
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
const samples = await p.evaluate(async (secs) => {
  const out = []; const t0 = performance.now();
  while (performance.now() - t0 < secs * 1000) {
    await new Promise((r) => requestAnimationFrame(r));
    const d = window.__gafferPitch; if (!d) continue;
    const a = d.a; out.push({ t: a.time, runs: a.runsN, trans: a.trans ? { ...a.trans } : null, beatLen: a.beatLen, poss: a.poss, ball: { ...a.ball }, pos: a.pos.map((s) => s.map((q) => q ? { x: q.x, y: q.y } : null)), spd: a.spd, slots: d.slots, pressing: d.pressing });
  }
  return out;
}, SECONDS);
const L = 105, LINE = { GK: 'gk', CB: 'def', LB: 'def', RB: 'def', CDM: 'mid', CM: 'mid', CAM: 'mid', LW: 'fwd', RW: 'fwd', ST: 'fwd' };
const depth = (side, x) => (side === 0 ? x : L - x);
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const spread = [], length = [], pressNear = [0, 0];
const dist = [[], []];
for (let i = 0; i < samples.length; i++) {
  const s = samples[i];
  for (const side of [0, 1]) {
    const ks = s.slots[side].map((pos, k) => [pos, k]).filter(([, k]) => s.pos[side][k]);
    if (i > 0) for (const [, k] of ks) { const a = samples[i - 1].pos[side][k], b = s.pos[side][k]; if (a && b) dist[side][k] = (dist[side][k] ?? 0) + Math.hypot(b.x - a.x, b.y - a.y); }
    if (s.poss === side) continue;
    const defs = ks.filter(([pos]) => LINE[pos] === 'def').map(([, k]) => depth(side, s.pos[side][k].x));
    const fwds = ks.filter(([pos]) => LINE[pos] === 'fwd').map(([, k]) => depth(side, s.pos[side][k].x));
    if (defs.length >= 3) { const sd = [...defs].sort((a, b) => a - b); spread.push(sd[sd.length - 2] - sd[1]); } // middle of the line (one presser may step out)
    if (defs.length && fwds.length) length.push(Math.max(...fwds) - Math.min(...defs));
    if (ks.some(([pos, k]) => pos !== 'GK' && Math.hypot(s.pos[side][k].x - s.ball.x, s.pos[side][k].y - s.ball.y) < 3)) pressNear[side]++;
  }
}
// Runs: how often a side on the ball has a run going, and never more than 3 at once.
const runFrames = samples.filter((s) => s.runs > 0).length, maxRuns = Math.max(0, ...samples.map((s) => s.runs));
// Transitions: in the window after each turnover, the side that lost the ball either counter-presses (2+ players within
// 5 m of the ball) or drops (its average depth goes back).
const avgDepth = (s, side) => { const xs = s.pos[side].filter(Boolean).map((q) => depth(side, q.x)); return xs.reduce((a, b) => a + b, 0) / xs.length; };
let turnovers = 0, reacted = 0;
for (let i = 1; i < samples.length; i++) {
  const s = samples[i], tr = s.trans;
  if (!tr || (samples[i - 1].trans && samples[i - 1].trans.at === tr.at)) continue;
  const ahead = s.pos[tr.lost].filter((q) => q && depth(tr.lost, q.x) > depth(tr.lost, s.ball.x) + 2).length;
  if (ahead < 2) continue; // lost deep in its own half: nobody needs to get back
  turnovers++;
  const end = samples.findIndex((x, j) => j > i && x.t >= tr.at + Math.max(900, s.beatLen * 3));
  if (end < 0) continue;
  const win = samples.slice(i, end + 1);
  if (win.some((x) => x.trans && x.trans.at !== tr.at)) { turnovers--; continue; } // the ball changed hands again inside the window
  const press = win.some((x) => x.pos[tr.lost].filter((q) => q && Math.hypot(q.x - x.ball.x, q.y - x.ball.y) < 5).length >= 2);
  const aheadK = s.pos[tr.lost].map((q, k) => (q && depth(tr.lost, q.x) > depth(tr.lost, s.ball.x) + 2 ? k : -1)).filter((k) => k >= 0);
  const mean = (x) => aheadK.reduce((t, k) => t + depth(tr.lost, x.pos[tr.lost][k].x), 0) / aheadK.length;
  const drop = mean(samples[end]) < mean(s) - 1;
  if (press || drop) reacted++;
}
const spdAll = samples.at(-1)?.spd.flat().filter(Boolean) ?? [];
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
let fails = 0; const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
console.log(`  ${samples.length} frames over ${SECONDS}s`);
ok(samples.length > SECONDS * 20, `the pitch keeps 20+ frames a second (${(samples.length / SECONDS).toFixed(0)} fps)`);
ok(Math.max(...spdAll) / Math.min(...spdAll) >= 1.25, `fastest vs slowest player: ${(Math.max(...spdAll) / Math.min(...spdAll)).toFixed(2)}× speed`);
ok(med(spread) < 3, `back line out of possession: median spread ${med(spread).toFixed(1)} m (< 3)`);
ok(med(length) <= 40, `team length out of possession: median ${med(length).toFixed(1)} m (≤ 40)`);
ok(pressNear[0] + pressNear[1] > 0, `someone presses the ball (${pressNear[0]} / ${pressNear[1]} frames within 3 m)`);
ok(runFrames > samples.length * 0.1 && maxRuns <= 3, `runs off the ball in ${Math.round((100 * runFrames) / samples.length)}% of frames, at most ${maxRuns} at once (≤ 3)`);
ok(turnovers > 0 && reacted >= turnovers * 0.8, `after a turnover the side that lost it reacts: ${reacted} of ${turnovers}`);
ok(!errs.length, `no console errors${errs.length ? ': ' + errs[0] : ''}`);
await browser.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

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
let samples = await p.evaluate(async (secs) => {
  const out = []; const t0 = performance.now();
  while (performance.now() - t0 < secs * 1000) {
    await new Promise((r) => requestAnimationFrame(r));
    const d = window.__gafferPitch; if (!d) continue;
    const a = d.a; out.push({ t: a.time, bh: a.bh, sp: a.sp && a.time < a.sp.until ? { ...a.sp } : null, flag: !!a.flag && a.time < a.flag.until, runs: a.runsN, trans: a.trans ? { ...a.trans } : null, beatLen: a.beatLen, poss: a.poss, ball: { ...a.ball }, pos: a.pos.map((s) => s.map((q) => q ? { x: q.x, y: q.y } : null)), spd: a.spd, slots: d.slots, pressing: d.pressing });
  }
  return { out, kinds: { ...window.__gafferPitch?.a.kinds } };
}, SECONDS);
const kinds = samples.kinds; samples = samples.out;
const L = 105, LINE = { GK: 'gk', CB: 'def', LB: 'def', RB: 'def', CDM: 'mid', CM: 'mid', CAM: 'mid', LW: 'fwd', RW: 'fwd', ST: 'fwd' };
const depth = (side, x) => (side === 0 ? x : L - x);
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const spread = [], length = [], pressNear = [0, 0];
const dist = [[], []];
// Frames during a corner or free kick, and for 1.5 s after it (the box empties and the line steps back out).
const afterSet = []; { let last = -1e9; for (let i = 0; i < samples.length; i++) { const x = samples[i]; if (x.sp && x.sp.kind !== 'gk') last = x.t; afterSet[i] = x.t - last < 1500; } }
for (let i = 0; i < samples.length; i++) {
  const s = samples[i];
  for (const side of [0, 1]) {
    const ks = s.slots[side].map((pos, k) => [pos, k]).filter(([, k]) => s.pos[side][k]);
    if (i > 0) for (const [, k] of ks) { const a = samples[i - 1].pos[side][k], b = s.pos[side][k]; if (a && b) dist[side][k] = (dist[side][k] ?? 0) + Math.hypot(b.x - a.x, b.y - a.y); }
    if (s.poss === side || afterSet[i]) continue; // shape out of possession, in open play (the line re-forms after a set piece)
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
  const tr = samples[i].trans;
  if (!tr || (samples[i - 1].trans && samples[i - 1].trans.at === tr.at)) continue;
  // Measure from the moment the other side has the ball (a long ball can be won far from where it was hit).
  const w = samples.findIndex((x, j) => j >= i && x.poss !== tr.lost);
  if (w < 0) continue;
  const s = samples[w];
  const aheadK = s.pos[tr.lost].map((q, k) => (q && depth(tr.lost, q.x) > depth(tr.lost, s.ball.x) + 2 ? k : -1)).filter((k) => k >= 0);
  if (aheadK.length < 2) continue; // lost deep in its own half: nobody needs to get back
  turnovers++;
  // The window: three beats, or until the ball changes hands again; at least one beat (450 ms) to see a reaction.
  let end = samples.findIndex((x, j) => j > w && (x.t >= s.t + Math.max(900, s.beatLen * 3) || (x.trans && x.trans.at !== tr.at)));
  if (end < 0) { turnovers--; continue; }
  if (samples[end].trans && samples[end].trans.at !== tr.at) end--;
  if (samples[end].t - s.t < Math.max(450, s.beatLen)) { turnovers--; continue; }
  const win = samples.slice(w, end + 1);
  // A dead ball (corner, free kick, offside) just before or during the window: a restart, not a transition.
  if (samples.slice(Math.max(0, i - 30), end + 1).some((x) => (x.sp && x.sp.kind !== 'gk') || x.flag)) { turnovers--; continue; }
  const press = win.some((x) => x.pos[tr.lost].filter((q) => q && Math.hypot(q.x - x.ball.x, q.y - x.ball.y) < 5).length >= 2);
  const mean = (x) => aheadK.reduce((t, k) => t + depth(tr.lost, x.pos[tr.lost][k].x), 0) / aheadK.length;
  const drop = mean(samples[end]) < mean(s) - 1;
  if (press || drop) reacted++;
  else if (process.env.DBG) console.log('noreact', JSON.stringify({ t: Math.round(tr.at), lost: tr.lost, aheadK, d0: Math.round(mean(s)), d1: Math.round(mean(samples[end])), ball: [Math.round(depth(tr.lost, s.ball.x)), Math.round(depth(tr.lost, samples[end].ball.x))] }));
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
// Few turnovers are measurable (the ball often changes hands again inside a beat, and restarts are left out), so an
// empty sample passes with a note rather than failing; the movement code for transitions is PR B's.
ok(reacted >= turnovers * 0.8, `after a turnover the side that lost it reacts: ${reacted} of ${turnovers}${turnovers ? '' : ' (none measurable this run)'}`);
// Pass and shot types (PR C): several kinds of pass shown, lofted balls really leave the ground, shots typed.
const passKinds = ['short', 'long', 'through', 'cross', 'cutback'].filter((k) => kinds[k] > 0);
console.log(`  kinds: ${JSON.stringify(kinds)}`);
ok(passKinds.length >= 3, `pass types shown: ${passKinds.join(', ')} (3+)`);
const maxH = Math.max(0, ...samples.map((s) => s.bh ?? 0));
ok(!kinds.long && !kinds.cross || maxH > 3, `lofted balls leave the ground (highest ${maxH.toFixed(1)} m)`);
ok(samples.every((s) => Number.isFinite(s.ball.x) && Number.isFinite(s.ball.y) && Number.isFinite(s.bh ?? 0)), 'the ball never leaves the numbers (no NaN)');
// Set pieces (PR C): at the end of each staging, a corner has 4+ attackers in the box and a wall stands 9.15 m off the ball.
const ends = samples.filter((s, i) => s.sp && (!samples[i + 1]?.sp || samples[i + 1].sp.until !== s.sp.until));
const boxN = (s, side) => s.pos[side].filter((q) => q && depth(side, q.x) > 88.5 && Math.abs(q.y - 34) < 20.2).length;
const corners = ends.filter((s) => s.sp.kind === 'corner');
const fks = ends.filter((s) => s.sp.kind === 'fk' && depth(s.sp.side, s.sp.at.x) > 70);
const wallN = (s) => s.pos[1 - s.sp.side].filter((q) => q && Math.abs(Math.hypot(q.x - s.sp.at.x, q.y - s.sp.at.y) - 9.15) < 1.5).length;
console.log(`  set pieces staged: ${corners.length} corners, ${fks.length} free kicks in range, ${ends.filter((s) => s.sp.kind === 'gk').length} goal kicks, flag up in ${samples.filter((s) => s.flag).length} frames`);
ok(ends.length > 0, 'set pieces are staged');
if (process.env.DBG) for (const c of fks) { const st = samples.find((x) => x.sp && x.sp.until === c.sp.until); console.log('fk', JSON.stringify(c.sp), st.t, c.t, JSON.stringify(c.pos[1 - c.sp.side].map((q) => q && Math.round(Math.hypot(q.x - c.sp.at.x, q.y - c.sp.at.y) * 10) / 10)), JSON.stringify(c.ball)); }
if (process.env.DBG) for (const c of corners) { const st = samples.find((x) => x.sp && x.sp.until === c.sp.until); console.log('start', st.t, JSON.stringify(st.pos[c.sp.side].map((q) => q && Math.round(depth(c.sp.side, q.x))))); }
if (process.env.DBG) for (const c of corners) console.log(JSON.stringify({ sp: c.sp, t: c.t, beatLen: c.beatLen, att: c.pos[c.sp.side].map((q) => q && [Math.round(depth(c.sp.side, q.x)), Math.round(q.y)]) }));
ok(corners.every((s) => boxN(s, s.sp.side) >= 4), `corners: 4+ attackers in the box (${corners.map((s) => boxN(s, s.sp.side)).join(', ') || 'none this run'})`);
ok(fks.every((s) => wallN(s) >= 3), `free kicks in range: a wall of 3+ at 9.15 m (${fks.map(wallN).join(', ') || 'none this run'})`);
ok(!errs.length, `no console errors${errs.length ? ': ' + errs[0] : ''}`);
await browser.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

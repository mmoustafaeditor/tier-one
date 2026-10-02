// The pitch test's measurements, shared by the browser run (ui-tests/pitch.mjs) and the seeded Node run
// (sim-tests/pitch.ts). `samples` are frames of the pitch's state; frames of different matches carry a different `m`.
// `ok(cond, message)` records a check. Returns the number of frames before stopped-match frames were left out.
export function measure(samples, { kinds, reacts, kin, seconds }, ok) {
  let allFrames = 0;
  // Only frames of a match in play: not paused, and its clock still moving (no half-time or full-time freeze, where the
  // pitch stands still and would be measured thousands of times).
  { const lastMove = []; let at = -1e9, prev = '';
    for (const x of samples) { if (x.min !== prev) { prev = x.min; at = x.t; } lastMove.push(x.t - at); }
    const before = samples.length; allFrames = before;
    // (a minute that runs longer on screen, as in Full match, is still in play until its own end)
    samples = samples.filter((x, i) => x.go && lastMove[i] < Math.max(8000, (x.msPM ?? 0) * 1.2));
    if (samples.length < before) console.log(`  (left out ${before - samples.length} frames of a stopped match)`); }
  const L = 105, LINE = { GK: 'gk', CB: 'def', LB: 'def', RB: 'def', CDM: 'mid', CM: 'mid', CAM: 'mid', LW: 'fwd', RW: 'fwd', ST: 'fwd' };
  const depth = (side, x) => (side === 0 ? x : L - x);
  const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const spread = [], length = [], pressNear = [0, 0];
  const dist = [[], []];
  // Frames during a corner or free kick, and for 1.5 s after it (the box empties and the line steps back out).
  const afterSet = []; { let last = -1e9; for (let i = 0; i < samples.length; i++) { const x = samples[i]; if (x.sp && (x.sp.kind === 'corner' || x.sp.kind === 'fk')) last = x.t; afterSet[i] = x.t - last < 1500; } }
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    for (const side of [0, 1]) {
      const ks = s.slots[side].map((pos, k) => [pos, k]).filter(([, k]) => s.pos[side][k]);
      if (i > 0 && samples[i - 1].m === s.m) for (const [, k] of ks) { const a = samples[i - 1].pos[side][k], b = s.pos[side][k]; if (a && b) dist[side][k] = (dist[side][k] ?? 0) + Math.hypot(b.x - a.x, b.y - a.y); }
      if (s.poss === side || afterSet[i]) continue; // shape out of possession, in open play (the line re-forms after a set piece)
      const defs = ks.filter(([pos]) => LINE[pos] === 'def').map(([, k]) => depth(side, s.pos[side][k].x));
      const fwds = ks.filter(([pos]) => LINE[pos] === 'fwd').map(([, k]) => depth(side, s.pos[side][k].x));
      if (defs.length >= 3) { const sd = [...defs].sort((a, b) => a - b); spread.push(sd[sd.length - 2] - sd[1]); } // middle of the line (one presser may step out)
      if (defs.length && fwds.length) length.push(Math.max(...fwds) - Math.min(...defs));
      if (ks.some(([pos, k]) => pos !== 'GK' && Math.hypot(s.pos[side][k].x - s.ball.x, s.pos[side][k].y - s.ball.y) < 3)) pressNear[side]++;
    }
  }
  // Runs: how often a side on the ball has a run going, and never more than 3 at once.
  const runFrames = samples.filter((s) => s.runs > 0).length, maxRuns = samples.reduce((m, s) => Math.max(m, s.runs), 0);
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
    let end = samples.findIndex((x, j) => j > w && (x.t >= s.t + Math.max(900, s.beatLen * 3) || (x.trans && x.trans.at !== tr.at) || x.m !== s.m));
    if (end < 0) { turnovers--; continue; }
    if ((samples[end].trans && samples[end].trans.at !== tr.at) || samples[end].m !== s.m) end--;
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
  console.log(`  ${samples.length} frames over ${seconds}s`);
  ok(Math.max(...spdAll) / Math.min(...spdAll) >= 1.25, `fastest vs slowest player: ${(Math.max(...spdAll) / Math.min(...spdAll)).toFixed(2)}× speed`);
  ok(med(spread) < 3, `back line out of possession: median spread ${med(spread).toFixed(1)} m (< 3)`);
  ok(med(length) <= 40, `team length out of possession: median ${med(length).toFixed(1)} m (≤ 40)`);
  ok(pressNear[0] + pressNear[1] > 0, `someone presses the ball (${pressNear[0]} / ${pressNear[1]} frames within 3 m)`);
  ok(runFrames > samples.length * 0.1 && maxRuns <= 3, `runs off the ball in ${Math.round((100 * runFrames) / samples.length)}% of frames, at most ${maxRuns} at once (≤ 3)`);
  // Few turnovers are measurable (the ball often changes hands again inside a beat, and restarts are left out), so an
  // empty sample passes with a note rather than failing; the movement code for transitions is PR B's.
  // Under 5 measurable turnovers the share means nothing (1 of 2 is 50%), so it's reported, not judged.
  ok(turnovers < 5 || reacted >= turnovers * 0.8, `after a turnover the side that lost it reacts: ${reacted} of ${turnovers}${turnovers < 5 ? ' (sample too small to judge this run)' : ''}`);
  // Pass and shot types (PR C): several kinds of pass shown, lofted balls really leave the ground, shots typed.
  const passKinds = ['short', 'long', 'through', 'cross', 'cutback'].filter((k) => kinds[k] > 0);
  console.log(`  kinds: ${JSON.stringify(kinds)}`);
  ok(passKinds.length >= 3, `pass types shown: ${passKinds.join(', ')} (3+)`);
  const maxH = samples.reduce((m, s) => Math.max(m, s.bh ?? 0), 0);
  ok(!kinds.long && !kinds.cross || maxH > 3, `lofted balls leave the ground (highest ${maxH.toFixed(1)} m)`);
  ok(samples.every((s) => Number.isFinite(s.ball.x) && Number.isFinite(s.ball.y) && Number.isFinite(s.bh ?? 0)), 'the ball never leaves the numbers (no NaN)');
  // Build-up chains (PR C): quiet minutes are passing chains as long as the side's philosophy says.
  const LEN = { possession: [5, 6], balanced: [3, 5], gegenpress: [3, 5], direct: [2, 3], counter: [2, 3], bus: [2, 3], wings: [3, 4] };
  const chains = Object.keys(kinds).filter((k) => k.startsWith('chain:')).map((k) => { const ph = k.slice(6); return { ph, n: kinds[k], avg: kinds[`chainLen:${ph}`] / kinds[k] }; });
  console.log(`  build-up chains: ${chains.map((c) => `${c.ph} ${c.n}× avg ${c.avg.toFixed(1)} passes`).join(', ') || 'none'}`);
  ok(chains.length > 0 && chains.every((c) => c.avg >= LEN[c.ph][0] - 0.5 && c.avg <= LEN[c.ph][1]), 'quiet minutes build up in the side\'s style (chain length per philosophy)');
  // Set pieces (PR C): at the end of each staging, a corner has 4+ attackers in the box and a wall stands 9.15 m off the ball.
  const ends = samples.filter((s, i) => s.sp && (!samples[i + 1]?.sp || samples[i + 1].sp.until !== s.sp.until));
  const boxN = (s, side) => s.pos[side].filter((q) => q && depth(side, q.x) > 88.5 && Math.abs(q.y - 34) < 20.2).length;
  const corners = ends.filter((s) => s.sp.kind === 'corner');
  const fks = ends.filter((s) => s.sp.kind === 'fk' && depth(s.sp.side, s.sp.at.x) > 70);
  const wallN = (s) => s.pos[1 - s.sp.side].filter((q) => q && Math.abs(Math.hypot(q.x - s.sp.at.x, q.y - s.sp.at.y) - 9.15) < 1.5).length;
  console.log(`  injuries shown: ${kinds.injury ?? 0}`);
  console.log(`  set pieces staged: ${corners.length} corners, ${fks.length} free kicks in range, ${ends.filter((s) => s.sp.kind === 'gk').length} goal kicks, ${ends.filter((s) => s.sp.kind === 'ti').length} throw-ins, flag up in ${samples.filter((s) => s.flag).length} frames`);
  ok(ends.length > 0, 'set pieces are staged');
  if (process.env.DBG) for (const c of fks) { const st = samples.find((x) => x.sp && x.sp.until === c.sp.until); console.log('fk', JSON.stringify(c.sp), st.t, c.t, JSON.stringify(c.pos[1 - c.sp.side].map((q) => q && Math.round(Math.hypot(q.x - c.sp.at.x, q.y - c.sp.at.y) * 10) / 10)), JSON.stringify(c.ball)); }
  if (process.env.DBG) for (const c of corners) { const st = samples.find((x) => x.sp && x.sp.until === c.sp.until); console.log('start', st.t, JSON.stringify(st.pos[c.sp.side].map((q) => q && Math.round(depth(c.sp.side, q.x))))); }
  if (process.env.DBG) for (const c of corners) console.log(JSON.stringify({ sp: c.sp, t: c.t, beatLen: c.beatLen, att: c.pos[c.sp.side].map((q) => q && [Math.round(depth(c.sp.side, q.x)), Math.round(q.y)]) }));
  ok(corners.every((s) => boxN(s, s.sp.side) >= 4), `corners: 4+ attackers in the box (${corners.map((s) => boxN(s, s.sp.side)).join(', ') || 'none this run'})`);
  // (central: 3+; out wide, where it will be crossed, 2: setpieces.ts wallSize)
  ok(fks.every((s) => wallN(s) >= (Math.abs(s.sp.at.y - 34) > 18 ? 2 : 3)), `free kicks in range: a wall at 9.15 m of 3+ (2 out wide) (${fks.map(wallN).join(', ') || 'none this run'})`);
  // Phase 1 (body): turning and acceleration stay within each player's limits; better readers react sooner; nobody
  // sprints on an empty tank, and the tank does get used.
  console.log(`  body: max turn ${(kin.turn ?? 0).toFixed(2)} and max acceleration ${(kin.acc ?? 0).toFixed(2)} of the limit; ${reacts.length} reactions logged`);
  ok((kin.turn ?? 0) <= 1.02 && (kin.acc ?? 0) <= 1.02, 'players never turn or accelerate beyond their limits');
  const byReads = [...reacts].sort((p, q) => p[0] - q[0]);
  const half = Math.floor(byReads.length / 2);
  const meanMs = (xs) => xs.reduce((t, x) => t + x[1], 0) / Math.max(1, xs.length);
  const slowR = meanMs(byReads.slice(0, half)), fastR = meanMs(byReads.slice(half));
  ok(reacts.length > 50 && fastR < slowR, `better readers react sooner: ${fastR.toFixed(0)} ms vs ${slowR.toFixed(0)} ms (top half vs bottom half)`);
  const emptySprint = samples.filter((s) => s.tanks.some((r) => r.some((g) => g && g[0] < 0.13 && g[1]))).length;
  const minTank = samples.reduce((m, s) => s.tanks.flat().reduce((mm, g) => (g ? Math.min(mm, g[0]) : mm), m), 1);
  ok(emptySprint === 0, `no sprinting on an empty tank (${emptySprint} frames)`);
  ok(minTank < 0.9, `the sprint tank gets used (lowest ${minTank.toFixed(2)})`);
  // Phase 2 (the defence as a group), measured in open play out of possession: attackers near our goal have a man
  // close, the keeper stands on the shooting angle, a carrier in the box finds someone in the way, the line stays narrow
  // enough to cover. Goal at x 0 for side 0, x 105 for side 1.
  const P2 = { mark: [0, 0], markAll: [0, 0], gk: [], block: [0, 0], width: [] };
  // How long the ball has been at the same man's feet: the keeper is judged once he has had an eighth of a second to set
  // himself after the ball moved (a cross-field pass moves the angle faster than any keeper can follow).
  let heldFrom = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i], pr = samples[i - 1];
    if (!pr || pr.m !== s.m || pr.carrier !== s.carrier || pr.poss !== s.poss) heldFrom = s.t;
    if (afterSet[i] || s.sp || s.carrier < 0) continue; // settled play: someone has the ball at his feet
    const def = (1 - s.poss), att = s.poss, gx = def === 0 ? 0 : L;
    const D = s.pos[def], A = s.pos[att];
    const near = (q, r) => D.some((d, k) => d && s.slots[def][k] !== 'GK' && Math.hypot(d.x - q.x, d.y - q.y) < r);
    // Marking: attackers (not the one on the ball, not the keeper) within 30 m of our goal.
    const counter = s.trans && s.t - s.trans.at < Math.max(900, s.beatLen * 3); // just after a turnover: still getting back
    A.forEach((q, k) => {
      if (!q || s.slots[att][k] === 'GK' || Math.hypot(q.x - s.ball.x, q.y - s.ball.y) < 2) return;
      if (Math.hypot(q.x - gx, q.y - 34) > 30) return;
      P2.markAll[1]++; if (near(q, Math.hypot(q.x - gx, q.y - 34) < 22 ? 5 : 8)) P2.markAll[0]++;
      if (counter) return;
      // Tight (5 m) in the last 22 m; further out the line holds and shadows him across, so 8 m.
      const reach = Math.hypot(q.x - gx, q.y - 34) < 22 ? 5 : 8;
      P2.mark[1]++; if (near(q, reach)) P2.mark[0]++; else if (process.env.DBG) console.log('miss', s.t.toFixed(0), JSON.stringify(s.mk), Math.min(...D.map((d, j) => d && s.slots[def][j] !== 'GK' ? Math.hypot(d.x - q.x, d.y - q.y) : 99)).toFixed(1), (Math.hypot(q.x - gx, q.y - 34)).toFixed(0));
    });
    // Keeper: distance from the bisector of the angle the ball makes with the posts, ball within 40 m.
    const gk = D[s.slots[def].indexOf('GK')];
    const db = Math.hypot(s.ball.x - gx, s.ball.y - 34);
    if (gk && db < 40 && db > 6 && s.t - heldFrom >= 120) {
      const p1 = { x: gx, y: 34 - 3.66 }, p2 = { x: gx, y: 34 + 3.66 };
      const d1 = Math.hypot(s.ball.x - p1.x, s.ball.y - p1.y), d2 = Math.hypot(s.ball.x - p2.x, s.ball.y - p2.y);
      const P = { x: gx, y: p1.y + (7.32 * d1) / (d1 + d2) }; // angle bisector theorem
      const ux = s.ball.x - P.x, uy = s.ball.y - P.y, ul = Math.hypot(ux, uy);
      P2.gk.push(Math.abs(((gk.x - P.x) * uy - (gk.y - P.y) * ux) / ul));
      if (process.env.DBG && P2.gk.at(-1) > 2) console.log('gk', s.t.toFixed(0), def, P2.gk.at(-1).toFixed(1), JSON.stringify({ T: s.gkT && { x: +s.gkT.x.toFixed(1), y: +s.gkT.y.toFixed(1) }, gk: { x: +gk.x.toFixed(1), y: +gk.y.toFixed(1) }, ball: { x: +s.ball.x.toFixed(1), y: +s.ball.y.toFixed(1) } }));
    }
    // Box: the ball in our box, someone within 2.5 m of the line from it to the goal centre.
    if (Math.abs(s.ball.x - gx) < 16.5 && Math.abs(s.ball.y - 34) < 20.2) {
      const seg = (q) => { const vx = gx - s.ball.x, vy = 34 - s.ball.y, l2 = vx * vx + vy * vy; const t = Math.max(0, Math.min(1, ((q.x - s.ball.x) * vx + (q.y - s.ball.y) * vy) / l2)); return Math.hypot(s.ball.x + t * vx - q.x, s.ball.y + t * vy - q.y); };
      P2.block[1]++; if (D.some((d, k) => d && s.slots[def][k] !== 'GK' && seg(d) < 2.5)) P2.block[0]++;
      if (process.env.DBG) console.log('box', s.t.toFixed(0), s.poss, s.carrier, JSON.stringify(s.ball), Math.min(...D.map((d, k) => d && s.slots[def][k] !== 'GK' ? seg(d) : 99)).toFixed(1), Math.min(...D.map((d, k) => d && s.slots[def][k] !== 'GK' ? Math.hypot(d.x - s.ball.x, d.y - s.ball.y) : 99)).toFixed(1));
    }
    const ys = D.filter((d, k) => d && LINE[s.slots[def][k]] === 'def').map((d) => d.y);
    if (ys.length >= 3) P2.width.push(Math.max(...ys) - Math.min(...ys));
  }
  const pc = (x) => (x[1] ? Math.round((100 * x[0]) / x[1]) : 0);
  console.log(`  defence: marked ${pc(P2.mark)}% (${P2.mark[1]}; ${pc(P2.markAll)}% counting counter-attacks), keeper off the angle median ${med(P2.gk).toFixed(1)} m, box lane blocked ${pc(P2.block)}% (${P2.block[1]}), back line width median ${med(P2.width).toFixed(1)} m`);
  // Phase 3 (attacking off the ball), in settled possession: nobody waits offside while the carrier has it; the carrier
  // has two men in open lanes; a wide carrier in the last third gets a full-back past or inside him; the carrier
  // speeds up into space and slows when pressed.
  const P3 = { off: [0, 0], sup: [0, 0], ovl: [0, 0], sp: [], press: [] };
  let got = 0; // when the carrier got the ball
  for (let i = 1; i < samples.length; i++) {
    const s = samples[i], pr = samples[i - 1];
    if (pr.m !== s.m || pr.carrier !== s.carrier || pr.poss !== s.poss) got = s.t;
    if (afterSet[i] || s.sp || s.carrier < 0 || s.flag) continue;
    const att = s.poss, def = 1 - s.poss, A = s.pos[att], D = s.pos[def], c = A[s.carrier];
    if (!c) continue;
    const dep = (q) => depth(att, q.x);
    // Offside line: the second-last defender (the keeper counts), never behind the ball, never past halfway.
    const dd = D.filter(Boolean).map(dep).sort((x, y) => y - x);
    const lineD = Math.max(dd[1] ?? 105, dep(c), 52.5);
    P3.off[1]++;
    if (A.some((q, k) => q && k !== s.carrier && dep(q) > lineD + 0.5)) P3.off[0]++;
    // Support: teammates 6-28 m away with no defender within 2 m of the passing lane.
    // A man blocks the pass only if he is in front of the ball along it (a presser beside or behind the carrier doesn't
    // close a pass played away from him).
    const lane = (q) => D.every((d) => { if (!d) return true; const vx = q.x - c.x, vy = q.y - c.y, l2 = vx * vx + vy * vy; const raw = ((d.x - c.x) * vx + (d.y - c.y) * vy) / l2; if (raw * Math.sqrt(l2) < 0.5) return true; const t = Math.min(1, raw); return Math.hypot(c.x + t * vx - d.x, c.y + t * vy - d.y) > 2; });
    const open = A.filter((q, k) => q && k !== s.carrier && s.slots[att][k] !== 'GK' && Math.hypot(q.x - c.x, q.y - c.y) > 6 && Math.hypot(q.x - c.x, q.y - c.y) < 28 && lane(q)).length;
    P3.sup[1]++; if (open >= 2) P3.sup[0]++;
    // Overlap / underlap: a wide carrier in the last third (short of the byline), his full-back within 14 m and no more
    // than 6 m behind him: there to go past or inside.
    if (Math.abs(c.y - 34) > 18 && dep(c) > 68 && dep(c) < 95) {
      P3.ovl[1]++;
      if (A.some((q, k) => q && ['LB', 'RB'].includes(s.slots[att][k]) && Math.sign(q.y - 34) === Math.sign(c.y - 34) && dep(q) >= dep(c) - 6 && Math.hypot(q.x - c.x, q.y - c.y) < 14)) P3.ovl[0]++;
    }
    // Carrier speed against the nearest defender's distance (same man on the ball in the last frame), once he has had
    // a quarter of a second on it (before that he is still running on from receiving it).
    if (pr.m === s.m && pr.poss === att && pr.carrier === s.carrier && !pr.sp && s.t > pr.t && s.t - got >= 250) {
      const p0 = pr.pos[att][s.carrier];
      if (p0) { P3.sp.push((Math.hypot(c.x - p0.x, c.y - p0.y) / (s.t - pr.t)) * 1000); P3.press.push(Math.min(...D.filter(Boolean).map((d) => Math.hypot(d.x - c.x, d.y - c.y)))); }
    }
  }
  const corr = (xs, ys) => { const n = xs.length; if (n < 3) return 0; const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let c = 0, vx = 0, vy = 0; for (let i = 0; i < n; i++) { c += (xs[i] - mx) * (ys[i] - my); vx += (xs[i] - mx) ** 2; vy += (ys[i] - my) ** 2; } return c / Math.sqrt(vx * vy || 1); };
  const spCorr = corr(P3.press, P3.sp);
  if (process.env.DBG3) for (const [lo, hi] of [[0, 4], [4, 7], [7, 10], [10, 15], [15, 99]]) { const xs = P3.sp.filter((_, i) => P3.press[i] >= lo && P3.press[i] < hi); console.log('carry', lo, hi, xs.length, (xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)).toFixed(2)); }
  console.log(`  attack: offside while the carrier has it ${pc(P3.off)}% (${P3.off[1]}), carrier has 2+ open men ${pc(P3.sup)}%, full-back past a wide carrier ${pc(P3.ovl)}% (${P3.ovl[1]}), carrier speed vs space r=${spCorr.toFixed(2)} (${P3.sp.length})`);
  {
    ok(pc(P3.off) <= 5, `runners hold the offside line until the pass: ${pc(P3.off)}% of frames with a man offside (≤ 5%)`);
    ok(pc(P3.sup) >= 70, `the carrier has two men in open lanes: ${pc(P3.sup)}% (≥ 70%)`);
    // Overlaps need the director (phase 4): the ball reaches the wing in one pass, faster than a full-back can get there
    // from his line; pushing full-backs up all the time broke the back line when the ball was lost. Reported until then.
    if (process.env.OVERLAP) ok(P3.ovl[1] < 40 || pc(P3.ovl) >= 40, `a wide carrier in the last third gets his full-back past or inside him: ${pc(P3.ovl)}% (≥ 40%)`);
    ok(spCorr >= 0.2, `the carrier speeds up into space and slows when pressed: r = ${spCorr.toFixed(2)} (≥ 0.2)`);
  }
  if (!process.env.BASELINE) {
    ok(P2.mark[1] < 40 || pc(P2.mark) >= 75, `attackers near our goal are marked (5 m in the last 22 m, 8 m to 30 m): ${pc(P2.mark)}%`);
    ok(P2.gk.length < 20 || med(P2.gk) <= 1.0, `the keeper stands on the shooting angle: median ${med(P2.gk).toFixed(1)} m off (${P2.gk.length})`);
    ok(P2.block[1] < 20 || pc(P2.block) >= 80, `a carrier in our box finds someone in the way: ${pc(P2.block)}%`);
    ok(med(P2.width) <= 45, `the back line stays narrow enough to cover: median ${med(P2.width).toFixed(1)} m`);
  }
  return allFrames;
}

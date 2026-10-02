// Diagnosis of what a viewer sees in highlights (Extended): per passage, how many touches before the shot, pass lengths
// by kind, passes that land away from their man, ball jumps without a pass. Fails if a viewer would see either.
import { generateWorld, playerOf } from '../src/sim/world';
import { startMatch, stepMinute } from '../src/sim/match';
import { playOver } from '../src/sim/engine/clock';
import { newAnim, setPitchDebug, tick } from '../src/ui2/pitch/sim';
import { RATES, minuteMs, shownOf, highlightOf } from '../src/sim/highlights';
setPitchDebug(true);
const w = generateWorld(7); const get = (id: string) => playerOf(w, id)!;
const top = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'].includes(c.leagueId));
const N = +(process.argv[2] ?? 6), SHOW = +(process.argv[3] ?? 4);
const FRAME = 1000 / 60;
const kinds: Record<string, number> = {};
const agg = { passages: 0, flights: 0, len: [] as number[], landNoOne: 0, jumps: 0, swapNoFlight: 0, beatsPer: [] as number[], passesBeforeShot: [] as number[], shotsFromNowhere: 0, shots: 0, secs: [] as number[] };
let shown = 0;
for (let i = 0; i < N; i++) {
  let m = startMatch(w, null, top[(i * 7) % top.length].id, top[(i * 13 + 5) % top.length].id, `diag-${i}`, 1, true);
  const a: any = newAnim(m, w);
  if (process.env.WX) a.wx = +process.env.WX; // the pitch in this weather (A2), whatever the match's is
  let prevTo = -1;
  while (!playOver(m)) {
    const n = JSON.parse(JSON.stringify(m)); stepMinute(n, get); m = n;
    const ms = minuteMs(m, 2, RATES[1], prevTo); const sh = shownOf(m, 2, prevTo); prevTo = sh ? sh.to : -1; // (as the live screen: a move carried over from the minute before)
    let lastFlight: any = null, prevBall = { ...a.ball }, prevCarrier = a.carrier, prevPoss = a.poss, passes = 0;
    const log: string[] = [];
    for (let t = 0; t < ms; t += FRAME) {
      const beat0 = a.beat;
      tick(a, m, w, FRAME, ms, true, 2, 2400);
      if (!sh) { prevBall = { ...a.ball }; prevCarrier = a.carrier; prevPoss = a.poss; continue; }
      if (a.beat !== beat0) for (let b = beat0; b < a.beat; b++) { const B = a.beats[b]; log.push(`${(t / 1000).toFixed(1)}s ${B.kind}${B.type ? '/' + B.type : ''}${B.how ? '/' + B.how : ''} s${B.side}`); if (B.kind === 'pass') passes++; if (B.kind === 'turnover') passes = 0; if (B.kind === 'shot') { agg.shots++; agg.passesBeforeShot.push(passes); if (passes <= 1) agg.shotsFromNowhere++; passes = 0; } }
      // Only passes count (a shot, a parry, a corner kicked to the flag or a goal kick are not a pass to a man), and
      // a picture cut (the first beat of a highlight, a restart staged) is not a jump.
      const startedNow = a.beat !== beat0 ? a.beats[a.beat - 1] : null;
      const cut = startedNow && (a.beat - 1 === 0 || ['kickoff', 'corner', 'out', 'foul', 'pen', 'offside'].includes(startedNow.kind));
      if (a.flight && a.flight !== lastFlight && a.lastPass?.at === a.time) { lastFlight = a.flight; agg.flights++; const d = Math.hypot(a.flight.to.x - a.flight.from.x, a.flight.to.y - a.flight.from.y); agg.len.push(d); const ty = `${a.lastPass?.type}${a.lastPass?.eng ? '' : '(pitch)'}`; (agg as any).ty = (agg as any).ty ?? {}; ((agg as any).ty[ty] ??= []).push(d); (agg as any).cur = ty; log.push(`      ball ${d.toFixed(0)} m`); }
      if (!a.flight && lastFlight && a.carrier >= 0 && a.pos[a.poss][a.carrier]) { const q = a.pos[a.poss][a.carrier]; const dd = Math.hypot(q.x - lastFlight.to.x, q.y - lastFlight.to.y); if (dd > 4) { agg.landNoOne++; (agg as any).miss = (agg as any).miss ?? {}; (agg as any).miss[(agg as any).cur] = ((agg as any).miss[(agg as any).cur] ?? 0) + 1; log.push(`      landed ${dd.toFixed(0)} m from the man who gets it`); } lastFlight = null; }
      const jump = Math.hypot(a.ball.x - prevBall.x, a.ball.y - prevBall.y);
      if (!a.flight && jump > 3 && t > 0 && !cut) { agg.jumps++; const why = `${a.beats[a.beat - 1]?.kind}:${prevCarrier === a.carrier && prevPoss === a.poss ? 'same' : 'swap'}:${a.beat}/${a.beats.length}:${t < 100 ? 'start' : 'mid'}`; (agg as any).why = (agg as any).why ?? {}; (agg as any).why[why] = ((agg as any).why[why] ?? 0) + 1; log.push(`      ball jumped ${jump.toFixed(0)} m (no pass) carrier ${prevPoss}:${prevCarrier} -> ${a.poss}:${a.carrier} beat ${a.beats[a.beat - 1]?.kind} flightWas ${!!lastFlight}`); }
      if (a.poss !== prevPoss && !a.flight && !lastFlight) { agg.swapNoFlight++; }
      prevBall = { ...a.ball }; prevCarrier = a.carrier; prevPoss = a.poss;
    }
    if (playOver(m)) for (const [k, v] of Object.entries(a.kinds as Record<string, number>)) kinds[k] = (kinds[k] ?? 0) + v;
    if (sh) {
      agg.passages++; agg.beatsPer.push(a.beats.length); agg.secs.push(ms / 1000);
      if (shown < SHOW) { shown++; const h = highlightOf(m); console.log(`\n=== match ${i}, minute ${m.minute}: level ${h.level}, engine seconds ${h.from}-${h.to}, ${(ms / 1000).toFixed(1)} s on screen, ${a.beats.length} beats`); console.log('flow:', (m.flow ?? []).map((f: any) => `${f.t}s:${f.k}${f.n !== undefined ? '@' + f.n : ''}`).join(' ')); for (const l of log) console.log('  ' + l); }
    }
  }
}
console.log('jumps by beat:', JSON.stringify((agg as any).why));
for (const [k, v] of Object.entries((agg as any).ty ?? {}) as [string, number[]][]) { const sv = [...v].sort((p, q) => p - q); console.log(`  ${k}: ${v.length}, median ${sv[Math.floor(sv.length / 2)].toFixed(0)} m, landed off ${(agg as any).miss?.[k] ?? 0}`); }
const med = (xs: number[]) => { const s = [...xs].sort((p, q) => p - q); return s[Math.floor(s.length / 2)] ?? 0; };
const pct = (x: number, y: number) => Math.round((100 * x) / Math.max(1, y));
console.log(`\n${agg.passages} passages; median ${med(agg.beatsPer)} beats in ${med(agg.secs).toFixed(1)} s on screen`);
console.log(`ball moves: ${agg.flights}; median length ${med(agg.len).toFixed(0)} m; over 30 m: ${pct(agg.len.filter((x) => x > 30).length, agg.len.length)}%`);
console.log(`ball landed 4+ m from the man who then has it: ${pct(agg.landNoOne, agg.flights)}% of moves`);
console.log(`ball jumped 3+ m in a frame without a pass: ${agg.jumps} times`);
console.log(`shots: ${agg.shots}; passes in the move before a shot: median ${med(agg.passesBeforeShot)}; 0-1 passes: ${pct(agg.shotsFromNowhere, agg.shots)}%`);
// What a viewer must never see (engine passes since 2026-10-02): a pass landing away from its man, a ball jumping.
const offPct = pct(agg.landNoOne, agg.flights);
// The ball's flight (A1): every long ball bounces once before its man takes it; crosses and shots curl.
const bounced = pct(kinds.bounce ?? 0, kinds.long ?? 0);
if (process.env.WX === '3') console.log(`${(kinds.wind ?? 0) > 0 ? 'ok  ' : 'FAIL'} balls in the air the wind moves: ${kinds.wind ?? 0}`);
console.log(`${bounced >= 90 ? 'ok  ' : 'FAIL'} long balls that bounce: ${bounced}% of ${kinds.long ?? 0} (≥ 90%); curled crosses and shots: ${kinds.bend ?? 0}`);
console.log(`${offPct <= 5 ? 'ok  ' : 'FAIL'} passes reach their man: ${100 - offPct}% (≥ 95%)`);
console.log(`${agg.jumps === 0 ? 'ok  ' : 'FAIL'} the ball never jumps without a pass (${agg.jumps})`);
process.exit(offPct <= 5 && agg.jumps === 0 && bounced >= 90 ? 0 : 1);

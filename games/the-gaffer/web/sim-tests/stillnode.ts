// Full match (mode 4) in Node: spells where the ball and all 22 players stand still (the browser's ui-tests/still.mjs
// rule: ball < 0.02 m and players < 0.01 m a frame on average, for over 350 ms of screen time). Seeded, quick.
//   node sim-tests/build.mjs stillnode [matches] [rate]
import { generateWorld, playerOf } from '../src/sim/world';
import { startMatch, stepMinute } from '../src/sim/match';
import { playOver } from '../src/sim/engine/clock';
import { newAnim, setPitchDebug, tick } from '../src/ui2/pitch/sim';
import { RATES, minuteMs } from '../src/sim/highlights';
setPitchDebug(true);
const w = generateWorld(7); const get = (id: string) => playerOf(w, id)!;
const top = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'].includes(c.leagueId));
const N = +(process.argv[2] ?? 4), RATE = +(process.argv[3] ?? RATES[1]);
const FRAME = 1000 / 60, scale = Math.round((2400 * RATES[1]) / RATE);
let spells = 0, total = 0;
for (let i = 0; i < N; i++) {
  let m = startMatch(w, null, top[(i * 7) % top.length].id, top[(i * 13 + 5) % top.length].id, `still-${i}`, 1, true);
  const a: any = newAnim(m, w);
  while (!playOver(m)) {
    const n = JSON.parse(JSON.stringify(m)); stepMinute(n, get); m = n;
    const ms = minuteMs(m, 4, RATE);
    let last: any = null, cur: any = null;
    for (let t = 0; t < ms; t += FRAME) {
      tick(a, m, w, FRAME, ms, true, 4, scale);
      total += FRAME;
      const snap = { b: { ...a.ball }, p: a.pos.flat().filter(Boolean).map((q: any) => [q.x, q.y]) };
      if (last) {
        const bm = Math.hypot(snap.b.x - last.b.x, snap.b.y - last.b.y);
        let pm = 0; const k = Math.min(snap.p.length, last.p.length); for (let j = 0; j < k; j++) pm += Math.hypot(snap.p[j][0] - last.p[j][0], snap.p[j][1] - last.p[j][1]); pm /= Math.max(1, k);
        const info = () => ({ min: m.minute, t: Math.round(t), beat: a.beat, of: a.beats.length, kind: a.beats[a.beat - 1]?.kind, next: a.beats[a.beat]?.kind, carrier: a.carrier, poss: a.poss, flight: !!a.flight, sp: a.sp?.kind ?? '', pm: +pm.toFixed(4), bm: +bm.toFixed(3) });
        if (bm < 0.02 && pm < 0.01) { if (!cur) cur = { at: t, start: info() }; }
        else if (cur) { if (t - cur.at > 350) { spells++; if (spells <= 12) console.log(Math.round(t - cur.at), 'ms', JSON.stringify(cur.start), '->', JSON.stringify(info())); } cur = null; }
      }
      last = snap;
    }
  }
}
console.log(`${spells === 0 ? 'ok  ' : 'FAIL'} still spells over 350 ms in ${(total / 60000).toFixed(1)} min of Full match on screen: ${spells}`);
process.exit(spells ? 1 : 0);

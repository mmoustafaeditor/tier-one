// Foundation stage, step 2: the live pitch measured without a browser. Plays seeded FULL matches minute by minute
// (stepMinute, as the Live screen does), runs the pitch (ui2/pitch/sim.ts) on a virtual 60 fps clock, and applies the
// same measurements as the browser test (ui-tests/pitch-metrics.mjs). The whole thing runs twice: both runs must print
// the same numbers (the pitch is deterministic for a given match).
// Usage: node sim-tests/build.mjs pitch [matches=10] [minutes=90]   (env SPEED = ms per match minute, default 2400;
// MARKING = 0 zonal, 1 mixed, 2 man for both sides)
import { generateWorld, playerOf } from '../src/sim/world';
import { startMatch, stepMinute, type LiveMatch } from '../src/sim/match';
import { playOver } from '../src/sim/engine/clock';
import { FORMATIONS } from '../src/sim/tactics';
import { newAnim, setPitchDebug, tick, type Anim } from '../src/ui2/pitch/sim';
// @ts-expect-error plain JS module shared with the browser test
import { measure } from '../ui-tests/pitch-metrics.mjs';

const N = +(process.argv[2] ?? 10);
const MINS = +(process.argv[3] ?? 90);
const MS = +(process.env.SPEED ?? 2400);
const FRAME = 1000 / 60;
const MARKING = process.env.MARKING ? (+process.env.MARKING as 0 | 1 | 2) : undefined;
setPitchDebug(true);

const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const top = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'].includes(c.leagueId));
const clone = <X,>(x: X): X => JSON.parse(JSON.stringify(x));

type Frame = Record<string, unknown>;
function play(i: number, out: Frame[], acc: { kinds: Record<string, number>; reacts: unknown[]; kin: { turn: number; acc: number } }) {
  const home = top[(i * 7) % top.length], away = top[(i * 13 + 5) % top.length];
  let m: LiveMatch = startMatch(w, null, home.id, away.id, `pitch-${i}`, 1, true);
  if (MARKING !== undefined) for (const s of m.sides) s.tactics = { ...s.tactics, marking: MARKING, setMark: MARKING }; // env MARKING=0|1|2
  const a: Anim = newAnim(m, w);
  const t0 = i * 1e8; // frames of different matches never share a time
  while (!playOver(m) && m.minute < MINS) {
    const n = clone(m);
    stepMinute(n, get);
    m = n;
    for (let t = 0; t < MS; t += FRAME) {
      tick(a, m, w, FRAME, MS, true);
      const x = a as unknown as Record<string, any>;
      out.push({
        m: i, t: t0 + x.time, go: true, min: x.minute, gkT: x.gkT ? { ...x.gkT } : null, mk: x.mk ? [...x.mk] : null, carrier: x.flight ? -1 : x.carrier,
        tanks: x.ag.map((r: any[]) => r.map((g) => (g ? [Math.round(g.tank * 1000) / 1000, g.spr ? 1 : 0] : null))), bh: x.bh,
        sp: x.sp && x.time < x.sp.until ? { ...x.sp, until: t0 + x.sp.until } : null, flag: !!x.flag && x.time < x.flag.until, runs: x.runsN,
        trans: x.trans ? { ...x.trans, at: t0 + x.trans.at } : null, beatLen: x.beatLen, poss: x.poss, ball: { ...x.ball },
        pos: x.pos.map((s: any[]) => s.map((q) => (q ? { x: q.x, y: q.y } : null))), spd: x.spd,
        slots: m.sides.map((sd) => FORMATIONS[sd.tactics.formation].slots.map((z) => z.pos)), pressing: m.sides.map((sd) => sd.tactics.pressing),
      });
    }
  }
  const x = a as unknown as Record<string, any>;
  for (const [k, v] of Object.entries(x.kinds as Record<string, number>)) acc.kinds[k] = (acc.kinds[k] ?? 0) + v;
  acc.reacts.push(...x.reacts);
  acc.kin.turn = Math.max(acc.kin.turn, x.kin.turn ?? 0); acc.kin.acc = Math.max(acc.kin.acc, x.kin.acc ?? 0);
}

function run(): string[] {
  const lines: string[] = [];
  const log = console.log;
  console.log = (...xs: unknown[]) => { lines.push(xs.join(' ')); };
  try {
    const out: Frame[] = [];
    const acc = { kinds: {}, reacts: [], kin: { turn: 0, acc: 0 } };
    for (let i = 0; i < N; i++) play(i, out, acc);
    measure(out, { ...acc, seconds: Math.round((out.length * FRAME) / 1000) }, (c: boolean, msg: string) => lines.push(`${c ? 'ok  ' : 'FAIL'} ${msg}`));
  } finally { console.log = log; }
  return lines;
}

const T0 = performance.now();
const r1 = run();
const T1 = performance.now();
const r2 = run();
for (const l of r1) console.log(l);
let fails = r1.filter((l) => l.startsWith('FAIL')).length;
const same = r1.join('\n') === r2.join('\n');
console.log(`${same ? 'ok  ' : 'FAIL'} the same matches give the same numbers on a second run`);
if (!same) fails++;
console.log(`  ${N} matches, ${((T1 - T0) / 1000).toFixed(1)} s a run`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

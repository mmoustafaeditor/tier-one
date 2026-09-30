// Tactics v3: the role schema's rules, and a controlled experiment. The same two clubs play N matches (the same seeds)
// per variant; each variant changes ONE instruction or ONE player's role for the home side from a balanced plan.
// Deltas are paired (same seeds), with a 2-standard-error noise band: "yes" means beyond noise.
// Usage: node sim-tests/build.mjs roles [N=500]
import { generateWorld, playerOf, strengthOf } from '../src/sim/world';
import { startMatch, simulate, expected, type LiveMatch } from '../src/sim/match';
import { PRESETS, FORMATIONS, FORMATION_IDS, fullTactics, type Tactics } from '../src/sim/tactics';
import { phaseMap, planOf, rolesArrays } from '../src/sim/engine/phases';
import { ROLES, ROLE_IDS, defaultRole, rolesFor, type RoleId } from '../src/sim/engine/roles';
import { N as NODE } from '../src/sim/engine/model';
import type { Position } from '../src/model/types';

let bad = 0;
const check = (ok: boolean, what: string) => { if (!ok) { bad++; console.log('FAIL', what); } };

// ---------- the schema ----------
const POS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
for (const pos of POS) for (const ph of ['ip', 'oop'] as const) {
  const rs = rolesFor(pos, ph);
  const defs = rs.filter((r) => ROLES[r].def?.includes(pos));
  check(defs.length === 1, `${pos} ${ph}: exactly one default role (${defs.join(',')})`);
  check(Object.keys(ROLES[defs[0]].fx).length === 0, `${pos} ${ph}: the default role is neutral`);
  const fx = rs.map((r) => JSON.stringify(ROLES[r].fx));
  check(new Set(fx).size === fx.length, `${pos} ${ph}: no two roles with the same effect`);
}
for (const r of ROLE_IDS) check(ROLES[r].pos.length > 0 && (!!ROLES[r].def?.length || Object.keys(ROLES[r].fx).length > 1), `${r}: valid somewhere and not inert`);
for (const a of FORMATION_IDS) for (const b of FORMATION_IDS) {
  const m = phaseMap(a, b);
  check(new Set(m).size === 11 && FORMATIONS[b].slots[m[FORMATIONS[a].slots.findIndex((s) => s.pos === 'GK')]].pos === 'GK', `${a}→${b}: a bijection, keeper to keeper`);
}
// An invalid role is never played: it falls back to the position's default.
{
  const t = fullTactics({ formation: '4-3-3', mentality: 0, pressing: 1, passing: 1, roles: ['target_man', 'nonsense'] });
  const p = planOf(t);
  check(p.ip[0] === defaultRole('GK', 'ip') && p.ip[1] === defaultRole(p.slots[1].pos, 'ip'), 'invalid roles fall back to defaults');
}

// ---------- the experiment ----------
const N = +(process.argv[2] ?? 500);
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const clubs = w.clubs.filter((c) => c.leagueId === 'eng1').sort((a, b) => strengthOf(w, b.id) - strengthOf(w, a.id));
const home = clubs[8], away = clubs[9];

// The home plan: 4-3-3, balanced, every role explicit at its default. Legacy (no roles) must play identically.
const m0 = startMatch(w, null, home.id, away.id, 'ctl', 0, false);
const baseT: Tactics = { formation: m0.sides[0].tactics.formation, ...PRESETS.balanced, philosophy: 'balanced' };
const explicit = { ...baseT, ...rolesArrays(fullTactics(baseT)) };
{
  const a = startMatch(w, null, home.id, away.id, 'eq', 0, false), b = startMatch(w, null, home.id, away.id, 'eq', 0, false);
  a.sides[0].tactics = baseT; b.sides[0].tactics = explicit;
  check(JSON.stringify(expected(a, get)) === JSON.stringify(expected(b, get)), 'default roles play exactly like no roles');
}
const slotOf = (pos: Position, nth = 0) => FORMATIONS[baseT.formation].slots.map((s, i) => [s.pos, i] as const).filter(([p]) => p === pos)[nth]?.[1] ?? -1;
const withRole = (ph: 'ip' | 'oop', pos: Position, role: RoleId, nth = 0): Partial<Tactics> => {
  const arr = rolesArrays(fullTactics(explicit));
  const k = slotOf(pos, nth);
  if (k < 0) return {};
  (ph === 'ip' ? arr.roles : arr.oopRoles)[k] = role;
  return arr;
};
const XI = m0.sides[0].onPitch.map(get);
const who = (pos: Position, nth = 0) => XI[slotOf(pos, nth)]?.name.en ?? '?';

const variants: [string, Partial<Tactics>][] = [
  ['baseline (balanced 4-3-3)', {}],
  ['pressing: mid-block → high', { pressing: 2 }],
  ['pressing: mid-block → low', { pressing: 0 }],
  ['width: normal → wide', { width: 2 }],
  ['defensive line: normal → high', { line: 2 }],
  ['build-up: mixed → play out', { build: 0 }],
  ['when we lose it: → counter-press', { cpress: 2 }],
  ['when we lose it: → regroup', { cpress: 0 }],
  ['shape without the ball: → 4-1-4-1', { oop: '4-1-4-1' }],
  [`role (IP) ${who('ST')}: striker → target man`, withRole('ip', 'ST', 'target_man')],
  [`role (IP) ${who('RW')}: winger → inside forward`, withRole('ip', 'RW', 'inside_forward')],
  [`role (IP) ${who('RB')}: full-back → wing-back`, withRole('ip', 'RB', 'wingback')],
  [`role (IP) ${who('CM')}: midfielder → playmaker`, withRole('ip', 'CM', 'playmaker')],
  [`role (OOP) ${who('ST')}: hold shape → lead the press`, withRole('oop', 'ST', 'press_forward')],
  [`role (OOP) ${who('CM')}: hold shape → ball winner`, withRole('oop', 'CM', 'ball_winner')],
  [`role (OOP) ${who('ST')}: hold shape → stay up`, withRole('oop', 'ST', 'outlet')],
];

type Row = { gf: number; ga: number; shots: number; xg: number; xga: number; poss: number; fouls: number; won: number; high: number; fit: number };
const KEYS: (keyof Row)[] = ['gf', 'ga', 'shots', 'xg', 'xga', 'poss', 'fouls', 'won', 'high', 'fit'];
function play(patch: Partial<Tactics>, k: number): Row {
  const m: LiveMatch = startMatch(w, null, home.id, away.id, `ctl:${k}`, 0, false);
  m.sides[0].tactics = { ...explicit, ...patch };
  for (const s of m.sides) { s.ai = false; s.autoSubs = true; } // no in-match tactical changes: only the plan decides
  // Count possessions won in play by the home side: a hand-over whose new possession starts "won in midfield" or
  // "won high up" (the engine's pressing turnovers).
  let won = 0, high = 0, flip = false;
  m.ball = new Proxy(m.ball!, {
    set(t, key, v) {
      if (key === 's' && v !== t.s) flip = true;
      if (key === 'n' && flip) { flip = false; if (t.s === 0 && (v === NODE.RMID || v === NODE.RHIGH)) { won++; if (v === NODE.RHIGH) high++; } }
      (t as unknown as Record<string, unknown>)[key as string] = v;
      return true;
    },
  });
  simulate(m, get);
  const on = m.sides[0].onPitch.filter((id) => id && get(id).position !== 'GK');
  return {
    gf: m.goals[0], ga: m.goals[1], shots: m.stats[0][1], xg: m.xg![0], xga: m.xg![1], poss: m.stats[0][0], fouls: m.stats[0][4], won, high,
    fit: on.reduce((a, id) => a + (m.fit[id] ?? 100), 0) / Math.max(1, on.length),
  };
}
const t0 = performance.now();
const base = Array.from({ length: N }, (_, k) => play({}, k));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = (v: number, d = 2) => (v >= 0 ? '+' : '') + v.toFixed(d);
console.log(`\n${home.name.en} v ${away.name.en}, ${N} matches per variant (same seeds), home side changes one thing.`);
console.log(`baseline per match: ${KEYS.map((k) => `${k} ${mean(base.map((r) => r[k])).toFixed(2)}`).join(' · ')}`);
console.log('delta vs baseline (* = beyond 2 s.e. of the paired difference); closed form = the engine\'s exact expectation (per 90)');
console.log(['variant'.padEnd(46), ...KEYS.map((k) => k.padStart(9)), '  cf:xG  cf:xGA cf:poss'].join(''));
const cf0 = (() => { const m = startMatch(w, null, home.id, away.id, 'cf', 0, false); m.sides[0].tactics = explicit; return expected(m, get); })();
for (const [name, patch] of variants.slice(1)) {
  const rows = Array.from({ length: N }, (_, k) => play(patch, k));
  const cells = KEYS.map((k) => {
    const d = rows.map((r, i) => r[k] - base[i][k]);
    const md = mean(d), sd = Math.sqrt(mean(d.map((v) => (v - md) ** 2))), se = sd / Math.sqrt(N);
    return (fmt(md, k === 'poss' || k === 'fit' || k === 'fouls' || k === 'won' ? 1 : 2) + (Math.abs(md) > 2 * se ? '*' : ' ')).padStart(9);
  });
  const m = startMatch(w, null, home.id, away.id, 'cf', 0, false); m.sides[0].tactics = { ...explicit, ...patch };
  const cf = expected(m, get);
  console.log([name.slice(0, 45).padEnd(46), ...cells, `  ${fmt(cf.xg[0] - cf0.xg[0])}  ${fmt(cf.xg[1] - cf0.xg[1])}  ${fmt(100 * (cf.poss - cf0.poss), 1)}`].join(''));
}
console.log(`\n${((performance.now() - t0) / 1000).toFixed(1)} s · schema checks: ${bad ? `${bad} FAILED` : 'all passed'}`);
if (bad) process.exitCode = 1;

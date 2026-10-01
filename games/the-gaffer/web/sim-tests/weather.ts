// Matchday weather (engine/weather.ts): how often each kind comes up, and what it does to goals, fouls, injuries and
// long balls, against the same matches played in clear weather. Weather changes how a match is played, not the totals
// of a season: overall goals stay within 3% of an all-clear season.
// Usage: node sim-tests/build.mjs weather [matches=3000]
import { generateWorld, playerOf } from '../src/sim/world';
import { simulate, startMatch, type LiveMatch } from '../src/sim/match';

const N = +(process.argv[2] ?? 3000);
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const clubs = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1', 'egy1', 'ksa1'].includes(c.leagueId));
const NAMES = ['clear', 'rain', 'heavy rain', 'wind', 'heat', 'snow'];
type Acc = { n: number; goals: number; fouls: number; inj: number; headers: number; fit: number };
const zero = (): Acc => ({ n: 0, goals: 0, fouls: 0, inj: 0, headers: 0, fit: 0 });
const by: Acc[] = NAMES.map(zero), clear: Acc[] = NAMES.map(zero);
const add = (a: Acc, m: LiveMatch) => {
  a.n++; a.goals += m.goals[0] + m.goals[1];
  for (const e of m.events) { if (e.kind === 'foul') a.fouls++; if (e.kind === 'injury') a.inj++; if ((e.kind === 'goal' || e.kind === 'save' || e.kind === 'miss') && e.how === 'header') a.headers++; }
  const ids = m.sides.flatMap((s) => s.onPitch.filter(Boolean));
  a.fit += ids.reduce((t, id) => t + (m.fit[id] ?? 100), 0) / Math.max(1, ids.length);
};
for (let i = 0; i < N; i++) {
  const h = clubs[(i * 7) % clubs.length], a = clubs[(i * 13 + 5) % clubs.length];
  if (h.id === a.id) continue;
  const m = startMatch(w, null, h.id, a.id, `wx-${i}`, 1, false);
  const k = m.wx ?? 0;
  const c = startMatch(w, null, h.id, a.id, `wx-${i}`, 1, false); c.wx = 0;
  simulate(m, get); simulate(c, get);
  add(by[k], m); add(clear[k], c);
}
let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const tot = (xs: Acc[], k: keyof Acc) => xs.reduce((t, a) => t + a[k], 0);
const n = tot(by, 'n');
for (let k = 0; k < NAMES.length; k++) {
  const a = by[k], c = clear[k];
  if (!a.n) { console.log(`  ${NAMES[k]}: none`); continue; }
  const f = (x: number, d = 2) => (x / a.n).toFixed(d);
  console.log(`  ${NAMES[k].padEnd(10)} ${String(Math.round((100 * a.n) / n)).padStart(3)}%  goals ${f(a.goals)} (clear ${f(c.goals)}), fouls ${f(a.fouls, 1)} (${f(c.fouls, 1)}), injuries ${f(a.inj, 3)} (${f(c.inj, 3)}), headed shots ${f(a.headers)} (${f(c.headers)}), fitness at the end ${f(a.fit, 1)} (${f(c.fit, 1)})`);
}
const d = tot(by, 'goals') / tot(clear, 'goals') - 1;
ok(Math.abs(d) <= 0.03, `goals over all matches within 3% of the same matches in clear weather: ${(100 * d).toFixed(1)}%`);
const fRain = (by[1].fouls + by[2].fouls) / Math.max(1, by[1].n + by[2].n), fRainC = (clear[1].fouls + clear[2].fouls) / Math.max(1, clear[1].n + clear[2].n);
ok(fRain > fRainC, 'more fouls in the wet');
ok(!by[4].n || by[4].fit / by[4].n < clear[4].fit / clear[4].n, 'players end hot matches more tired');
ok(!by[3].n || by[3].headers < clear[3].headers, 'fewer headed chances in the wind');
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

// V2.8 world & career: derbies, awards night, club legends' tally, AI managers with a board. One season.
// node sim-tests/build.mjs world [seed]
import { generateRealWorld } from '../src/sim/seed';
import { newCareer, seasonOver } from '../src/sim/season';
import { advance, endOfSeason } from '../src/sim/clock';
import { afterMatch } from '../src/sim/coach';
import { isDerby } from '../src/sim/rivalry';
import { squadOf } from '../src/sim/world';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const seed = +(process.argv[2] ?? 7);
let w = generateRealWorld(seed);
let c = newCareer(w, seed, 'egy-al-ahly', 'Test', { age: 40, nationality: 'EGY' }, 2026);

// Derbies count 1.5 times with the board.
ok(isDerby('egy-al-ahly', 'egy-zamalek') && isDerby('esp-barcelona', 'esp-real-madrid') && !isDerby('egy-al-ahly', 'eg1_haras'), 'the Cairo derby and El Clásico are derbies; Al Ahly v Haras is not');
const loss = (opp: string) => afterMatch(w, c, { mine: 0, theirs: 1, oppId: opp, home: true, myLevel: 70, oppLevel: 65, cup: false, expected: 2 }).career.board.confidence;
const d0 = c.board.confidence - loss('eg1_haras'), d1 = c.board.confidence - loss('egy-zamalek');
ok(Math.abs(d1 - d0 * 1.5) < 0.2, `a derby defeat costs 1.5x with the board (${d0.toFixed(1)} -> ${d1.toFixed(1)})`);

const managers0 = { ...(w.managers ?? {}) };
while (!seasonOver(c)) { const s = advance(w, c); w = s.world; c = s.career; }
const midChanges = Object.keys(managers0).filter((id) => w.managers![id].name.en !== managers0[id].name.en).length;
const e = endOfSeason(w, c);
const clubsWithManager = Object.keys(managers0).length;
const allChanges = Object.keys(managers0).filter((id) => e.world.managers![id].name.en !== managers0[id].name.en).length;
console.log(`  manager changes: ${midChanges} mid-season, ${allChanges} in all of ${clubsWithManager} clubs (${Math.round((100 * allChanges) / clubsWithManager)}%)`);
ok(midChanges > 0 && allChanges > midChanges, 'AI boards change managers mid-season and at the season end');
ok((e.career.news ?? []).some((n) => n.key === 'sacked' && n.club !== c.clubId) || (c.news ?? []).some((n) => n.key === 'sacked' && n.club !== c.clubId), 'the changes are in the news');

// Awards night reconciles with the stats.
const aw = e.summary.awards;
ok(aw.length >= 7 && aw[0].leagueId === 'egy1', `awards for ${aw.length} leagues, ours first`);
const lg = new Set(w.clubs.filter((x) => x.leagueId === 'egy1').map((x) => x.id));
const topGoals = Math.max(...w.players.filter((p) => lg.has(p.clubId)).map((p) => c.stats[p.id]?.[1] ?? 0));
ok(aw[0].boot?.v === topGoals, `Golden Boot = the most league goals (${aw[0].boot?.v} = ${topGoals})`);
ok(aw[0].team.length === 11 && new Set(aw[0].team.map((a) => a.id)).size === 11, 'Team of the Season: 11 different players');
const rounds = c.fixtures.egy1.length;
ok(!!aw[0].poty && (c.stats[aw[0].poty.id]?.[0] ?? 0) >= Math.floor(rounds * 0.6), 'Player of the Season played at least 60% of the league');
ok(aw[0].manager?.clubId === e.summary.record.champion, 'Manager of the Season: the champion\'s manager');

// Club legends: every player at the club has a tally now.
const squad = squadOf(w, c.clubId);
const tallied = squad.filter((p) => e.career.clubTally?.[`${c.clubId}:${p.id}`]).length;
ok(tallied === squad.length, `the season joined the legends' tally for all ${squad.length} players`);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

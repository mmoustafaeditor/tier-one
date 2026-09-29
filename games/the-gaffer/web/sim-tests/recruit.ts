// V2.5 recruitment, one quick sanity run: node sim-tests/build.mjs recruit [seed]
import { generateRealWorld } from '../src/sim/seed';
import { newCareer } from '../src/sim/season';
import { advance } from '../src/sim/clock';
import { dispatch, type Command } from '../src/sim/commands';
import { decisions } from '../src/sim/decisions';
import { checkWorld, playerOf, type World } from '../src/sim/world';
import { checkCareer } from '../src/sim/save';
import { estimateK } from '../src/sim/recruit/knowledge';
import { needs } from '../src/sim/recruit/needs';
import { scoutPicks } from '../src/sim/recruit/picks';
import { rcOf } from '../src/sim/recruit/state';
import { askOf } from '../src/sim/recruit/club';
import { spendingRoom, committed } from '../src/sim/recruit/money';
import { upgradeRecruit } from '../src/sim/recruit/save';
import type { Career } from '../src/model/types';

const seed = +(process.argv[2] ?? 7);
let w: World = generateRealWorld(seed);
let c: Career = newCareer(w, seed, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
const ok = (b: boolean, msg: string) => { console.log(`${b ? 'ok  ' : 'FAIL'} ${msg}`); if (!b) process.exitCode = 1; };
const run = (cmd: Command) => { const r = dispatch(w, c, cmd); if (r.ok) { w = r.world; c = r.career; } else console.log('  refused', cmd.type, r.reason); return r; };

// 1. Fog: monotone and honest for every player.
let bad = 0;
for (const p of w.players.slice(0, 3000)) {
  let prev: [number, number] | null = null;
  for (let k = 10; k <= 100; k++) {
    const e = estimateK(c, p, k);
    if (e.lo > p.rating || e.hi < p.rating || e.plo > p.potential || e.phi < p.potential) bad++;
    if (prev && (e.lo < prev[0] || e.hi > prev[1])) bad++;
    prev = [e.lo, e.hi];
  }
}
ok(bad === 0, `fog monotone and honest over 3000 players × K 10..100 (${bad} violations)`);

// 2. Needs follow the plan.
const n1 = needs(w, c).map((n) => `${n.pos}:${n.level}`).join(' ');
run({ type: 'tactics.patch', patch: { formation: '3-5-2' } });
const n2 = needs(w, c).map((n) => `${n.pos}:${n.level}`).join(' ');
console.log('  needs 4-3-3:', n1, '\n  needs 3-5-2:', n2);
ok(n1 !== n2, 'changing the shape changes the needs');
run({ type: 'tactics.patch', patch: { formation: '4-3-3' } });

// 3. Scouting assignment raises knowledge.
run({ type: 'delegation.set', dept: 'recruitment', level: 'me' });
run({ type: 'rc.assign', scope: 'league', key: 'esp1', pos: null });
const picks = scoutPicks(w, c, 3);
console.log('  picks:', picks.map((k) => `${k.p.name.en} ${k.need.pos} ${Math.round(k.k)}% ${k.fee}`).join(' | '));

// 4. The club stage: bid under the price, the answer comes next matchday.
const target = picks.find((k) => k.p.clubId !== 'free') ?? picks[0];
const p = target.p;
const ask = askOf(w, c, p);
const room0 = spendingRoom(w, c);
run({ type: 'rc.bid', playerId: p.id, offer: { upfront: Math.round(ask * 0.4), inst: [Math.round(ask * 0.3)], sellOn: 0.1 } });
const neg0 = rcOf(c).negs[0];
ok(!!neg0 && neg0.answerAt === c.season * 100 + c.round + 1, 'bid waits for the next matchday');
const k0 = rcOf(c).k[p.id]?.[0] ?? 0;
let s = advance(w, c); w = s.world; c = s.career;
const neg1 = rcOf(c).negs.find((n) => n.id === neg0.id)!;
console.log('  after md1:', neg1.stage, neg1.bids.map((b) => `${b.by}:${b.answer ?? ''}${b.fee ?? ''}`).join(','), 'rival', neg1.rival?.club ?? '-', 'K', k0, '→', rcOf(c).k[p.id]?.[0]);
console.log('  today:', decisions(w, c).map((d) => d.title.key).join(', '));
// Pay what they ask (or top the rival) and meet the agent's demand.
let n = rcOf(c).negs.find((x) => x.id === neg0.id)!;
if (n.stage === 'club' && n.rival) { run({ type: 'rc.topRival', negId: n.id }); s = advance(w, c); w = s.world; c = s.career; n = rcOf(c).negs.find((x) => x.id === neg0.id)!; }
if (n.stage === 'club' && n.counter !== null) run({ type: 'rc.payCounter', negId: n.id });
n = rcOf(c).negs.find((x) => x.id === neg0.id)!;
console.log('  stage now:', n.stage, n.end ?? '');
if (n.stage === 'terms') {
  // An insulting round first, then his demand.
  run({ type: 'rc.terms', negId: n.id, terms: { wage: 1000, years: 3, role: 'rotation', signOn: 0, release: null, bonus: 0 } });
  const n2x = rcOf(c).negs.find((x) => x.id === neg0.id)!;
  console.log('  insult → patience', n2x.patience, n2x.rounds.map((r) => r.reply).join(','));
  const before = { room: spendingRoom(w, c), bill: w.players.filter((x) => x.clubId === c.clubId).length };
  { const { demandOf } = await import('../src/sim/recruit/agent'); const { wageRoom } = await import('../src/sim/recruit/money'); console.log('  demand wage', demandOf(w, c, playerOf(w, p.id)!).wage, 'wage room', wageRoom(w, c)); }
  run({ type: 'rc.meet', negId: n.id, which: 'demand' });
  const done = rcOf(c).negs.find((x) => x.id === neg0.id)!;
  ok(done.stage === 'done' && playerOf(w, p.id)?.clubId === c.clubId, 'meeting the demand signs him');
  const hasInst = (rcOf(c).clauses[p.id]?.sched?.length ?? 0) > 1;
  ok(!hasInst || committed(c) > 0, `instalments committed ${committed(c)} (instalment deal: ${hasInst})`);
  ok(spendingRoom(w, c) >= 0 && spendingRoom(w, c) < before.room, `spending room ${room0} → ${spendingRoom(w, c)}`);
}
ok(checkCareer(w, c).length === 0 && checkWorld(w).length === 0, `invariants: ${checkCareer(w, c).slice(0, 3).join('; ')}`);

// 4b. An instalment deal at their price: accepted next matchday, instalments committed at signing.
{
  const q = scoutPicks(w, c, 3).find((k) => k.p.clubId !== 'free' && k.fee > 0 && k.fee * 1.3 < spendingRoom(w, c));
  if (q) {
    const a = askOf(w, c, q.p);
    run({ type: 'rc.bid', playerId: q.p.id, offer: { upfront: Math.round(a * 0.6), inst: [Math.round(a * 0.6)], sellOn: 0 } });
    s = advance(w, c); w = s.world; c = s.career;
    const nq = rcOf(c).negs.find((x) => x.playerId === q.p.id)!;
    console.log('  instalment bid:', nq.stage, nq.bids.map((b) => b.answer ?? '').join(','));
    if (nq.stage === 'terms') {
      const r0 = spendingRoom(w, c);
      const r = run({ type: 'rc.meet', negId: nq.id, which: 'demand' });
      if (r.ok) ok(committed(c) === Math.round(a * 0.6) && spendingRoom(w, c) < r0 - Math.round(a * 0.6), `instalment committed ${committed(c)}; room ${r0} → ${spendingRoom(w, c)}`);
    }
  }
}

// 5. A few more matchdays: AI bids, knowledge decay, the window closing.
for (let i = 0; i < 5; i++) { s = advance(w, c); w = s.world; c = s.career; }
console.log('  offers for us:', c.offers.map((o) => `${o.playerId}@${o.clubId} ${rcOf(c).aiWhy[o.id] ?? 'listed/star'}`).join(' | ') || 'none');
console.log('  threads:', rcOf(c).threads.map((t) => `${t.pn.en}: ${t.steps.map((x) => x.k).join('>')}`).join(' | '));
ok(checkCareer(w, c).length === 0, 'invariants after 6 matchdays');

// 6. Upgrade step from v6.
const old = { format: 'SEMBA_GAFFER_SAVE' as const, version: 6, savedAt: '', checksum: '', world: w, career: { ...c, rc: undefined, watch: { [p.id]: c.season * 100 } } as Career };
const up = upgradeRecruit(old);
ok(up.version === 7 && rcOf(up.career!).k[p.id]?.[0] === 80, 'v6 → v7: watched ≥ 2 md → K 80');

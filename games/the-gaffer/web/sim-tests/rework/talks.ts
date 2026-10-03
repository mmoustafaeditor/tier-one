// F16 (rework): players have something real to talk about after a match (scored, a homegrown debut, dropped), once:
// talking records it and the cooldown stops repeats (no morale farming). node sim-tests/build.mjs rework/talks
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer } from '../../src/sim/season';
import { advance } from '../../src/sim/clock';
import { squadOf, playerOf, type World } from '../../src/sim/world';
import { dispatch } from '../../src/sim/commands';
import { canTalk, talkWhy } from '../../src/sim/room';
import { lastMatchHere } from '../../src/sim/record';
import type { Career } from '../../src/model/types';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const seed = 7;
let w: World = generateRealWorld(seed);
let c: Career = newCareer(w, seed, 'egy-al-ahly', 'Test', { age: 40, nationality: 'EGY' }, 2026);
let scorer: string | null = null;
for (let i = 0; i < 12 && !scorer; i++) {
  const s = advance(w, c); w = s.world; c = s.career;
  const last = lastMatchHere(c);
  if (!last) continue;
  const side = last.home === c.clubId ? 0 : 1;
  const g = last.scorers.find((x) => x.side === side);
  const p = g && squadOf(w, c.clubId).find((q) => q.name.en === g.pn.en);
  if (p && last.motm?.pn.en !== p.name.en && talkWhy(w, c, p) === 'scored') scorer = p.id;
}
ok(!!scorer, 'a scorer of our last match has something to talk about: "scored"');
if (scorer) {
  const p = playerOf(w, scorer)!;
  const m0 = p.morale;
  const r = dispatch(w, c, { type: 'room.talk', playerId: p.id, tone: 'reassure' } as never);
  ok(r.ok, 'the talk happens');
  if (r.ok) {
    w = r.world; c = r.career;
    ok(playerOf(w, scorer)!.morale >= m0, `praise lifts him (${m0} → ${playerOf(w, scorer)!.morale})`);
    const again = canTalk(w, c, playerOf(w, scorer)!);
    ok(!again.ok, `and it can't be repeated straight away (${again.ok ? again.why : again.reason})`);
  }
}
// Nothing from a match that isn't ours: a player who didn't score has no "scored" to talk about.
const quiet = squadOf(w, c.clubId).find((p) => talkWhy(w, c, p) === null);
ok(!!quiet, 'players with nothing new still have nothing to talk about (no invented reasons)');
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

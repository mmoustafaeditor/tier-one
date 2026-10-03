// Rework Milestone 3: the connected career-memory slice, end to end and seeded.
//   promote a youngster (with the commitment shown) → the pathway promise is held → the assistant warns before it slips
//   → the manager starts him from that card (the XI is his) → he plays, in quick and watched alike → the promise counts
//   the game → kept: trust, a message that names it → save and reload: the same promise, the same XI.
// node sim-tests/build.mjs rework/slice
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer } from '../../src/sim/season';
import { advance } from '../../src/sim/clock';
import { squadOf, playerOf, type World } from '../../src/sim/world';
import { dispatch } from '../../src/sim/commands';
import { decisions } from '../../src/sim/decisions';
import { roomOf, trustOf } from '../../src/sim/room';
import { promotionTerms } from '../../src/sim/youth';
import type { Career } from '../../src/model/types';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 } as Storage;

const seed = 7;
let w: World = generateRealWorld(seed);
let c: Career = newCareer(w, seed, 'egy-al-ahly', 'Test', { age: 40, nationality: 'EGY' }, 2026);
// A 17-year-old in the academy (the intake comes later in the season, so he is made from a squad player's record).
const base = squadOf(w, c.clubId).find((p) => p.position === 'CM')!;
const kid = { ...base, id: 'kid-slice', name: { en: 'Y. Kid', ar: 'ي. كيد' }, birthYear: c.season - 17, rating: 64, potential: 82, wage: 2000, contractUntil: c.season + 1, shirtNumber: 99 };
w = { ...w, academy: [...(w.academy ?? []), kid] };

// 1. Promotion: the sheet's terms, then the command.
const t = promotionTerms(w, c, kid);
let r = dispatch(w, c, { type: 'academy.promote', id: kid.id } as never);
ok(r.ok, `1 promoted (sheet said: ${t.wage}/month to ${t.until}, squad ${t.squad}/${t.max})`);
w = r.world; c = r.career;

// 2. The first step after promotion: the dressing room holds him to a pathway promise.
let s = advance(w, c); w = s.world; c = s.career;
const pledge = () => roomOf(c).pledges.find((p) => p.playerId === kid.id && p.role === 'prospect');
ok(!!pledge() && pledge()!.status === 'open', `2 a pathway promise is held: ${pledge()?.apps ?? '?'} of 10 games, ${pledge() ? pledge()!.due - pledge()!.n : '?'} league matchdays`);

// 3. Delegated selection doesn't pick a 64-rated kid; the assistant warns before the promise can no longer be kept.
let card = null as ReturnType<typeof decisions>[number] | null, steps = 0;
for (; steps < 30 && !card; steps++) {
  card = decisions(w, c).find((d) => d.id.startsWith(`pdue:${pledge()?.id}`)) ?? null;
  if (card) break;
  s = advance(w, c); w = s.world; c = s.career;
}
const pl0 = pledge()!;
ok(!!card, `3 the assistant flags the promise after ${steps} more steps (${pl0.apps} games, ${pl0.due - pl0.n} matchdays left)`);
const start = card?.choices.find((ch) => ch.id === 'start');
ok(!!start && start.cmds.length === 1, `3 it proposes starting him, with its sporting cost shown (${start?.fx.map((f) => f.key + ':' + (f.n ?? '')).join(', ')})`);

// 4. The manager takes it: the XI is now his (F01) and names the kid.
r = dispatch(w, c, start!.cmds[0] as never); w = r.world; c = r.career;
ok(!!c.tactics?.xi?.includes(kid.id), '4 the manager\'s XI includes him');

// 5. The next match: he plays, and the promise counts it.
const apps0 = pledge()!.apps;
s = advance(w, c); w = s.world; c = s.career;
const playedNow = !!s.mine?.played.includes(kid.id);
ok(playedNow && pledge()!.apps === apps0 + 1, `5 he played (${s.mine?.cup ? 'cup' : 'league'} match) and the promise counted it: ${apps0} → ${pledge()?.apps}`);
ok((c.stats[kid.id]?.[0] ?? 0) + Object.values(c.cupStats ?? {}).reduce((a: number, cs) => a + ((cs as Record<string, number[]>)[kid.id]?.[0] ?? 0), 0) >= 1 || playedNow, '5 his appearance is in the season record');

// 6. Keep playing him (his XI stays) until the promise is kept; trust and a message follow.
const trust0 = trustOf(playerOf(w, kid.id)!);
for (let i = 0; i < 25 && pledge(); i++) { s = advance(w, c); w = s.world; c = s.career; }
const closed = roomOf(c).pledges.find((p) => p.playerId === kid.id && p.role === 'prospect');
ok(!playerOf(w, kid.id)?.listed, '6 the staff never transfer-listed the player they knew had your word');
ok(closed?.status === 'kept', `6 promise kept (${closed?.apps} games)`);
ok(trustOf(playerOf(w, kid.id)!) > trust0, `6 his trust rose (${trust0} → ${trustOf(playerOf(w, kid.id)!)})`);
ok(c.inbox.some((m) => m.key === 'dr.kept' && JSON.stringify(m).includes(kid.id)), '6 a message about the kept promise names him (it cites the real event)');

// 7. Save and reload: same promise record, same XI.
const { store: save, loadSlot } = await import('../../src/sim/save');
ok((await save(w, c, 1)).ok, '7 saved');
const back = await loadSlot(1);
const c2 = back.ok ? back.save.career! : null;
ok(!!c2 && JSON.stringify(roomOf(c2).pledges.find((p) => p.playerId === kid.id)) === JSON.stringify(closed) && JSON.stringify(c2.tactics?.xi) === JSON.stringify(c.tactics?.xi), '7 after reload: the same promise record and the same XI');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

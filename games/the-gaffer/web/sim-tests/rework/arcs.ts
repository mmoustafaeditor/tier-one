// Rework Milestone 3 pilot arc: the broken promise, on the same rails as the slice. Promote a youngster, let the
// assistant's warning go, never play him: the promise breaks; trust and morale fall; he asks for a word about it; the
// message and the news name it; the next talk with him is about that. node sim-tests/build.mjs rework/arcs
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer } from '../../src/sim/season';
import { advance } from '../../src/sim/clock';
import { squadOf, playerOf, type World } from '../../src/sim/world';
import { dispatch } from '../../src/sim/commands';
import { decisions } from '../../src/sim/decisions';
import { roomOf, trustOf, canTalk } from '../../src/sim/room';
import type { Career } from '../../src/model/types';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const seed = 11;
let w: World = generateRealWorld(seed);
let c: Career = newCareer(w, seed, 'egy-al-ahly', 'Test', { age: 40, nationality: 'EGY' }, 2026);
const base = squadOf(w, c.clubId).find((p) => p.position === 'CB')!;
const kid = { ...base, id: 'kid-arc', name: { en: 'Z. Kid', ar: 'ز. كيد' }, birthYear: c.season - 17, rating: 58, potential: 80, wage: 2000, contractUntil: c.season + 1, shirtNumber: 98 };
w = { ...w, academy: [...(w.academy ?? []), kid] };
let r = dispatch(w, c, { type: 'academy.promote', id: kid.id } as never); w = r.world; c = r.career;
// Keep him out: the manager's own XI never includes him (and the warning card is answered "let it go").
const pledge = () => roomOf(c).pledges.find((p) => p.playerId === kid.id && p.role === 'prospect');
let s = advance(w, c); w = s.world; c = s.career;
const trust0 = trustOf(playerOf(w, kid.id)!), morale0 = playerOf(w, kid.id)!.morale;
let warned = false;
for (let i = 0; i < 40 && pledge()?.status !== 'broken'; i++) {
  const card = decisions(w, c).find((d) => d.id.startsWith(`pdue:${pledge()?.id}`));
  if (card) { warned = true; const go = card.choices.find((ch) => ch.id === 'letgo'); if (go) { r = dispatch(w, c, { type: 'decision.done', id: card.id, choice: 'letgo' } as never); if (r.ok) { w = r.world; c = r.career; } } }
  if (c.tactics?.xi?.includes(kid.id)) c = { ...c, tactics: { ...c.tactics, xi: null } };
  s = advance(w, c); w = s.world; c = s.career;
}
const pl = roomOf(c).pledges.find((p) => p.playerId === kid.id && p.role === 'prospect');
ok(warned, '1 the assistant warned before it broke');
ok(pl?.status === 'broken', `2 the promise broke (${pl?.apps ?? '?'} of 10 games)`);
const p = playerOf(w, kid.id)!;
ok(trustOf(p) <= trust0 - 15, `3 his trust fell (${trust0} → ${trustOf(p)})`);
ok(p.morale < morale0, `3 and his morale (${morale0} → ${p.morale})`);
ok(roomOf(c).asks.some((a) => a.playerId === kid.id && a.why === 'broken') || roomOf(c).pledges.some((y) => y.playerId === kid.id && y.status === 'broken'), '4 he asks for a word about it');
ok(c.inbox.some((m) => m.key === 'dr.broken' && JSON.stringify(m).includes(kid.id)), '5 the message names him and the promise');
ok((c.news ?? []).some((n) => n.key === 'dr.broken'), '5 so does the news');
const t = canTalk(w, c, p);
ok(t.ok && t.why === 'broken', `6 the next talk with him is about the broken promise (${t.ok ? t.why : t.reason})`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

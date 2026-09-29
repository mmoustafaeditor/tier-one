// V2.4 dressing room: one quick sanity run of the chains (not a suite). node sim-tests/build.mjs room [seed]
import { generateRealWorld } from '../src/sim/seed';
import { newCareer, nextUserMatch } from '../src/sim/season';
import { advance } from '../src/sim/clock';
import { dispatch, type Command } from '../src/sim/commands';
import { decisions } from '../src/sim/decisions';
import { checkWorld, playerOf, squadOf, type World } from '../src/sim/world';
import { checkCareer } from '../src/sim/save';
import { cohesionOf, hierarchy, pledgeOf, roomOf, trustOf, unhappyPlayers } from '../src/sim/room';
import type { Career } from '../src/model/types';

const seed = +(process.argv[2] ?? 7);
let w: World = generateRealWorld(seed);
let c: Career = newCareer(w, seed, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
const run = (cmd: Command) => { const r = dispatch(w, c, cmd); if (r.ok) { w = r.world; c = r.career; } else console.log('  refused', cmd.type, r.reason); return r.ok; };
const step = () => { const s = advance(w, c); w = s.world; c = s.career; return s; };
const setP = (id: string, patch: object) => { w = { ...w, players: w.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) }; };

step();
const squad = squadOf(w, c.clubId).sort((a, b) => b.rating - a.rating);
console.log('room after md1:', roomOf(c).squad.length, 'players, cohesion', cohesionOf(w, c.clubId), 'leaders', [...hierarchy(w, c).entries()].filter(([, s]) => s.tier === 'leader').map(([id]) => playerOf(w, id)!.short).join(', '));

// 1. A promise nobody keeps: the 20th-best player is promised a starter's role, then never picked.
const fringe = squad[19];
setP(fringe.id, { morale: 40 });
run({ type: 'room.talk', playerId: fringe.id, tone: 'promise', pledge: { type: 'role', role: 'starter' } });
console.log(`promised ${fringe.short} Starter; trust ${trustOf(playerOf(w, fringe.id)!)} pledge`, pledgeOf(c, fringe.id)?.status);
let warned = -1;
for (let i = 0; i < 12 && pledgeOf(c, fringe.id); i++) {
  const ds = decisions(w, c);
  if (warned < 0 && ds.some((d) => d.kind === 'promise')) warned = c.round;
  run({ type: 'rest.set', playerId: fringe.id, rest: true });
  step();
}
const pl = roomOf(c).pledges.find((x) => x.playerId === fringe.id);
console.log(`→ ${pl?.status} after ${pl?.n} league md (${pl?.st}/${pl?.el} starts), warned at md ${warned + 1}, trust now ${trustOf(playerOf(w, fringe.id)!)}`);

// 2. The unhappy star: trust and morale gone for five matchdays → a transfer request → rivals bid in the window.
const star = squad[1];
let requested = -1, bid = -1;
for (let i = 0; i < 30 && bid < 0; i++) {
  if (playerOf(w, star.id)?.clubId !== c.clubId) break;
  setP(star.id, { trust: Math.min(trustOf(playerOf(w, star.id)!), 18), morale: Math.min(playerOf(w, star.id)!.morale, 30) });
  const s = step();
  if (requested < 0 && playerOf(w, star.id)?.req !== undefined) requested = c.round;
  if (c.offers.some((o) => o.playerId === star.id)) bid = c.round;
  void s;
}
const ev = (c.events ?? []).filter((e) => e.name === 'room.request');
console.log(`${star.short}: request at md ${requested}, rival bid at md ${bid} (${c.offers.find((o) => o.playerId === star.id)?.clubId ?? '-'}), events room.request ${ev.length}, unhappyPlayers ${unhappyPlayers(w, c.clubId).map((u) => u.player.short).join(',')}`);
const ds = decisions(w, c).filter((d) => ['talk', 'request', 'promise', 'armband', 'clause'].includes(d.kind));
console.log('room decisions now:', ds.map((d) => `${d.kind}:${d.title.key}`).join(' | '));

// 3. Cohesion into the engine: bounded ±2 levels on the user's side.
const m = nextUserMatch(w, c);
const mine = m?.sides.find((s) => s.clubId === c.clubId);
console.log('kick-off cohesion', mine?.coh, 'mods.level', mine?.mods?.level.toFixed(2), 'causes', roomOf(c).causes.slice(0, 4).map((x) => `${x.k}${x.d > 0 ? '+' : ''}${x.d}`).join(' '));
console.log('events:', ['room.ask','promise.kept','promise.broken','room.request','room.interest','room.clause','room.core','room.leader'].map((n) => `${n} ${(c.events ?? []).filter((e) => e.name === n).length}`).join(', '));
console.log('asks:', (c.events ?? []).filter((e) => e.name === 'room.ask').map((e) => `${e.t[1]}:${playerOf(w, e.refs!.p![0])?.short}:${e.data?.why}`).join(' '));
console.log('checks: world', checkWorld(w).length, 'career', checkCareer(w, c).length);

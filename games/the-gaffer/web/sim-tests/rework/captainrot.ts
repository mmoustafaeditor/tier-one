// Rework §S narrative example "the captain challenges the rotation policy": when the side keeps changing (17+ different
// starters in the last five league games) and it isn't working (≤1 win in the last five), the captain asks for a word
// ('rotation'), it shows in the room log with its reason, and he doesn't when the same rotation is winning, or when the
// side is settled. node sim-tests/build.mjs rework/captainrot
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer } from '../../src/sim/season';
import { advance } from '../../src/sim/clock';
import { squadOf, type World } from '../../src/sim/world';
import { roomDay, roomOf, talkWhy, ROT_STARTERS } from '../../src/sim/room';
import { D } from '../../src/lang-dressing-all';
import type { Career } from '../../src/model/types';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
let w: World = generateRealWorld(7);
let c: Career = newCareer(w, 7, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
for (let i = 0; i < 12 && (c.matches ?? []).filter((m) => m.home === c.clubId || m.away === c.clubId).length < 5; i++) { const s = advance(w, c); w = s.world; c = s.career; }
const squad = squadOf(w, c.clubId);
const cap = squad.find((p) => p.captain);
ok(!!cap, 'the club has a captain');
// A calm room (nobody else with something on his mind: everyone on a starter's contract, so a 60% share isn't "playing
// above his role"), then the scenario.
function scenario(starters: number, win: boolean): { world: World; career: Career } {
  const ids = new Set(squad.map((p) => p.id));
  const w1: World = { ...w, players: w.players.map((p) => (ids.has(p.id) ? { ...p, morale: 70, trust: 60, contractUntil: c.season + 3, req: undefined, injured: 0, banned: 0, role: 'starter' as const } : p)) };
  const room = roomOf(c);
  const roll: Record<string, string> = {};
  // Real rotation: eleven start each game, drawn in turn from `starters` players (the captain among them).
  const pool = [cap!, ...squad.filter((p) => p.id !== cap!.id)];
  pool.forEach((p, i) => { roll[p.id] = [0, 1, 2, 3, 4].map((g) => (i < starters && (i + g * 11) % starters < 11 ? '1' : '0')).join(''); });
  const matches = (c.matches ?? []).map((m) => { const k = m.home === c.clubId ? 0 : 1; const g: [number, number] = [0, 0]; g[k] = win ? 2 : 0; g[1 - k] = win ? 0 : 1; return { ...m, goals: g }; });
  const c1: Career = { ...c, matches, room: { ...room, roll, under: {}, asks: [], asked: {}, talks: {}, pledges: [] } };
  return roomDay(w1, w1, c1, null);
}
if (cap) {
  const lose = scenario(ROT_STARTERS + 2, false);
  const ask = roomOf(lose.career).asks.find((a) => a.playerId === cap.id);
  ok(ask?.why === 'rotation', `chopping and changing while losing: the captain asks for a word (${ask?.why ?? 'none'})`);
  const p = lose.world.players.find((q) => q.id === cap.id)!;
  ok(talkWhy(lose.world, lose.career, p) === 'rotation', 'his Talk reason is the rotation');
  ok((lose.career.events ?? []).some((e) => e.name === 'room.ask' && !!e.refs?.p?.includes(cap.id) && e.data?.why === 'rotation'), 'the room log records it');
  ok(/captain/.test(D.en.talk.why.rotation) && D.ar.talk.why.rotation.length > 0 && D.es.talk.why.rotation.length > 0 && D.fr.talk.why.rotation.length > 0, 'the reason reads in all four languages');
  const winning = scenario(ROT_STARTERS + 2, true);
  ok(!roomOf(winning.career).asks.some((a) => a.why === 'rotation'), 'the same rotation while winning: nobody asks');
  const settled = scenario(ROT_STARTERS - 4, false);
  ok(!roomOf(settled.career).asks.some((a) => a.why === 'rotation'), 'a settled side that is losing: not about rotation');
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

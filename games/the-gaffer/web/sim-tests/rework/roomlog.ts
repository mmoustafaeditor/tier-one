// Rework §E: the dressing-room timeline (ui2/RoomLog.tsx roomLine). Half a season on the clock, then a talk with a
// player who asked for one: every dressing-room event in the log reads as a line, a talk carries its tone, promises kept
// or broken and departures are lines too. node sim-tests/build.mjs rework/roomlog
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer } from '../../src/sim/season';
import { advance } from '../../src/sim/clock';
import { dispatch } from '../../src/sim/commands';
import { anyPlayer } from '../../src/sim/youth';
import { canTalk, roomOf } from '../../src/sim/room';
import { roomLine } from '../../src/ui2/RoomLog';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
let w = generateRealWorld(7);
let c = newCareer(w, 7, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
for (let i = 0; i < 30; i++) { const s = advance(w, c); w = s.world; c = s.career; }
const name = (id: string) => anyPlayer(w, id)?.name.en ?? id;
const ask = roomOf(c).asks.find((a) => { const p = anyPlayer(w, a.playerId); return !!p && canTalk(w, c, p).ok; });
ok(!!ask, `someone asked for a word (${ask ? name(ask.playerId) : '—'})`);
if (ask) {
  const r = dispatch(w, c, { type: 'room.talk', playerId: ask.playerId, tone: 'reassure' });
  ok(r.ok, 'the talk goes through');
  if (r.ok) { w = r.world; c = r.career; }
  const e = [...(c.events ?? [])].reverse().find((x) => x.type === 'cmd' && x.name === 'room.talk');
  ok(e?.data?.tone === 'reassure', 'the talk\'s event records its tone');
  ok(!!e && roomLine(e, 'en', name) === `You reassured ${name(ask.playerId)}`, `it reads "${e ? roomLine(e, 'en', name) : ''}"`);
  ok(!!e && !!roomLine(e, 'ar', name) && !!roomLine(e, 'es', name) && !!roomLine(e, 'fr', name), 'and in Arabic, Spanish and French');
}
const room = (c.events ?? []).filter((e) => e.type === 'room' && e.refs?.p?.length);
const kinds = new Map<string, number>(); for (const e of room) kinds.set(e.name, (kinds.get(e.name) ?? 0) + 1);
console.log('  dressing-room events this season:', [...kinds].map(([k, n]) => `${k} ${n}`).join(', '));
const SKIP = new Set(['room.interest', 'room.clause', 'room.refused']); // transfer interest and clause bids live in Transfers; a refusal is the manager's answer (cmd)
const unread = room.filter((e) => !SKIP.has(e.name) && !roomLine(e, 'en', name));
ok(!unread.length, `every dressing-room event reads as a line${unread.length ? ' — not: ' + [...new Set(unread.map((e) => e.name))].join(', ') : ''}`);
const fake = (n: string, data: Record<string, string>) => ({ id: 'x', t: [2026, 3] as [number, number], type: 'room' as const, name: n, refs: { p: [ask?.playerId ?? 'p'] }, data });
ok(['promise.kept', 'promise.broken', 'room.request', 'room.exit', 'room.leader', 'room.core', 'room.return', 'room.stayed', 'room.settled'].every((n) => !!roomLine(fake(n, { why: 'req' }), 'en', name)), 'promises, requests, departures and new leaders all read as lines');
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);

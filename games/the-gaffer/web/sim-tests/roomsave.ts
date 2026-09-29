// V2.4: writes a real save with a lived-in dressing room (for importing in the browser), and checks that a version-4
// save (before the dressing room) loads through the upgrade chain. node sim-tests/build.mjs roomsave <out.txt>
import { writeFileSync } from 'node:fs';
import { generateRealWorld } from '../src/sim/seed';
import { newCareer } from '../src/sim/season';
import { advance } from '../src/sim/clock';
import { dispatch, type Command } from '../src/sim/commands';
import { decisions } from '../src/sim/decisions';
import { squadOf, playerOf, type World } from '../src/sim/world';
import { parseSave, saveText, makeSave, pack } from '../src/sim/save';
import { roomOf, trustOf } from '../src/sim/room';
import type { Career } from '../src/model/types';

const out = process.argv[2] ?? '/tmp/room-save.txt';
let w: World = generateRealWorld(7);
let c: Career = newCareer(w, 7, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
const run = (cmd: Command) => { const r = dispatch(w, c, cmd); if (r.ok) { w = r.world; c = r.career; } else console.log('  refused', cmd.type, r.reason); return r.ok; };
const setP = (id: string, patch: object) => { w = { ...w, players: w.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) }; };
const staffCalls = () => {
  for (const d of decisions(w, c)) {
    if (['talk', 'request', 'promise', 'armband', 'clause'].includes(d.kind)) continue;
    const ch = d.choices.find((x) => x.pick);
    for (const cmd of ch?.cmds ?? []) run(cmd);
    run({ type: 'decision.done', id: d.id });
  }
};

// Version 4 (before the dressing room): strip the room and the new fields and load it back through parseSave.
{
  const s = await makeSave(w, c);
  const old = JSON.parse(JSON.stringify({ ...s, version: 4 }));
  delete old.career.room;
  const text = await pack(JSON.stringify(old));
  const r = await parseSave(text);
  console.log('v4 save loads:', r.ok ? `version ${r.save.version}, room ${!!r.save.career?.room}, cohesion ${r.save.world.clubs.find((x) => x.id === c.clubId)?.cohesion}, roles ${squadOf(r.save.world as World, c.clubId).filter((p) => p.role).length}` : r);
}

for (let i = 0; i < 6; i++) { staffCalls(); const s = advance(w, c); w = s.world; c = s.career; }
const squad = squadOf(w, c.clubId).sort((a, b) => b.rating - a.rating);
// A promise that is slipping: a fringe player promised regular starts four matchdays ago, not picked since.
const fringe = squad[18];
setP(fringe.id, { morale: 40 });
run({ type: 'room.talk', playerId: fringe.id, tone: 'promise', pledge: { type: 'role', role: 'starter' } });
// An unsettled star who is about to ask to leave.
const star = squad[2];
for (let i = 0; i < 5; i++) {
  setP(star.id, { trust: 18, morale: 30 });
  run({ type: 'rest.set', playerId: fringe.id, rest: true });
  staffCalls();
  const s = advance(w, c); w = s.world; c = s.career;
}
console.log('round', c.round, 'star', star.short, 'req', playerOf(w, star.id)?.req, 'trust', trustOf(playerOf(w, star.id)!), 'fringe pledge', roomOf(c).pledges.find((p) => p.playerId === fringe.id));
console.log('decisions:', decisions(w, c).map((d) => `${d.kind}:${d.title.key}`).join(' | '));
writeFileSync(out, await saveText(w, c));
console.log('wrote', out);

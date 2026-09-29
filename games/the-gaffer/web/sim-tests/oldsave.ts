// A v2 save with a match half-played by the v1 engine loads, upgrades to v3 and plays on under engine v2.
import { generateWorld, playerOf } from '../src/sim/world';
import { newCareer, userMatch } from '../src/sim/season';
import { stepMinute, simulate, derive } from '../src/sim/match';
import { UPGRADES, SAVE_VERSION } from '../src/sim/upgrade';
import type { SaveFile } from '../src/model/types';
const w = generateWorld(3);
const c = newCareer(w, 3, 'eng_bri', 'Old', { age: 40, nationality: 'ENG' }, 2026);
const m = userMatch(w, c)!;
// Shape it like a v1 match at 30': no engine fields, some v1 stats and a v1 "save" event.
const old: any = { ...m, minute: 30, goals: [1, 0], stats: [[55, 6, 3, 2, 5, 1, 0], [45, 4, 1, 1, 6, 0, 0]], xg: [0.9, 0.4], possSum: 1650,
  events: [{ min: 12, side: 0, kind: 'goal', playerId: m.sides[0].onPitch[9], how: 'corner' }, { min: 20, side: 1, kind: 'save', playerId: m.sides[1].onPitch[0] }] };
for (const k of ['v', 'full', 'ball', 'tl', 'rev', 'flow']) delete old[k];
const oldTac: any = { formation: '4-3-3', mentality: 0, pressing: 1, passing: 1, xi: null, captain: null, penalties: null, freeKicks: null, corners: null };
const save = { format: 'SEMBA_GAFFER_SAVE', version: 2, savedAt: '', checksum: '', world: w, career: { ...c, tactics: oldTac, live: old } } as unknown as SaveFile;
const up = UPGRADES[2](save);
const live = up.career!.live!;
const get = (id: string) => playerOf(w, id)!;
stepMinute(live, get); simulate(live, get); derive(live);
console.log(JSON.stringify({ SAVE_VERSION, version: up.version, tactics: up.career!.tactics, minute: live.minute, goals: live.goals, stats: live.stats, xg: live.xg, v: live.v }));

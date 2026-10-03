// V2.7 club vision (V2_DESIGN §3.6, smallest fun version): the pre-season board meeting.
// The board sets out the season's targets (league, cup, youth, finance: coach.ts objectivesOf) and you answer:
//   'expected'  the board's own league target, and its goodwill: confidence +5.
//   'ambitious' the league target one step higher, the owner puts money on the table (15% of the club's cash, into
//               the transfer budget at once), and the board is stricter all season (sack lines +5).
// Unanswered by matchday 3 the board takes it as 'expected' without the goodwill.
import type { Career, Objective, Vision, VisionLevel } from '../model/types';
import { objectiveOf, type World } from './world';
import { clamp } from './rng';

export const AMBITION_KITTY = 0.15;   // share of the club's cash the owner adds for an ambitious season
export const AMBITION_STRICT = 5;     // points added to the board's sack lines in an ambitious season
export const EXPECTED_GOODWILL = 5;   // board confidence for accepting its own targets
export const VISION_DEADLINE = 3;     // the meeting is on the desk for the season's first matchdays

// One step up the ladder of league targets, per tier. The top step stays where it is.
const LADDER_TOP: Objective[] = ['survive', 'midTable', 'topHalf', 'europe', 'title'];
const LADDER_LOWER: Objective[] = ['midTable', 'playoffs', 'promotion'];
export function raiseObjective(o: Objective): Objective {
  for (const ladder of [LADDER_TOP, LADDER_LOWER]) {
    const i = ladder.indexOf(o);
    if (i >= 0) return ladder[Math.min(ladder.length - 1, i + 1)];
  }
  return o;
}

// F09 (rework): the meeting was with one club's board; after a move it no longer applies (old saves have no club: theirs).
export const visionOf = (c: Career): Vision | null => (c.vision && c.vision.season === c.season && (!c.vision.club || c.vision.club === c.clubId) ? c.vision : null);
// F04 (rework): a higher aim exists only below the top of the club's ladder.
export const canAimHigher = (w: World, c: Career) => { const club = w.clubs.find((x) => x.id === c.clubId)!; const base = objectiveOf(w, club); return raiseObjective(base) !== base; };
export const ambitious = (c: Career) => visionOf(c)?.level === 'ambitious';
export const strictness = (c: Career) => (ambitious(c) ? AMBITION_STRICT : 0);

// The user's league target this season: the board's (objectiveOf), one step higher after an ambitious meeting.
export function userObjective(w: World, c: Career): Objective {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const base = objectiveOf(w, club);
  return ambitious(c) ? raiseObjective(base) : base;
}

// What the owner would put in for an ambitious season, rounded like every fee.
export function kittyFor(w: World, c: Career): number {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const v = Math.max(0, club.budget) * AMBITION_KITTY;
  if (v <= 0) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / p) * p;
}

export const needsMeeting = (c: Career) => !visionOf(c) && c.round < VISION_DEADLINE;

export function setVision(w: World, c: Career, level: VisionLevel): { world: World; career: Career } | null {
  if (visionOf(c) || c.round >= VISION_DEADLINE) return null;
  if (level === 'ambitious' && !canAimHigher(w, c)) return null;
  if (level === 'expected') {
    return { world: w, career: { ...c, vision: { season: c.season, level, club: c.clubId }, board: { ...c.board, confidence: clamp(c.board.confidence + EXPECTED_GOODWILL, 0, 100) } } };
  }
  const kitty = kittyFor(w, c);
  const clubs = w.clubs.map((x) => (x.id === c.clubId ? { ...x, budget: x.budget + kitty } : x));
  const ledger = { ...c.ops.ledger, owner: (c.ops.ledger.owner ?? 0) + kitty };
  return { world: { ...w, clubs }, career: { ...c, vision: { season: c.season, level, kitty, club: c.clubId }, ops: { ...c.ops, ledger } } };
}

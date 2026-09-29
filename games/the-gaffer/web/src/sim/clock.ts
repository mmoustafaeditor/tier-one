// The clock (V2_DESIGN §7.4). One call moves the calendar one step, in fixed named phases:
//   1 prep      — staff prepare the user's match (line-up, shape, report) through commands
//   2 matchday  — cup ties, then the league matchday everywhere (engine; FAST for AI matches); aftermath reducers
//                 read each MatchRecord; weekly jobs (training, medical, economy, AI market, board mood, staff week)
//   3 record    — the user's MatchRecord is kept, the pulse is written, the week's rests end
//   4 calendar  — windows opening and shutting
//   5 log       — one domain event for the step, and every card it created points at it
// `endOfSeason` is the season-end phase. Everything is pure: same state + same seed → same next state.
import type { Career, Digest } from '../model/types';
import type { LiveMatch } from './match';
import { endSeason, nextUserMatch, playDay, seasonOver, type SeasonSummary } from './season';
import { staffPrep } from './staff';
import { playerOf, squadOf, type World } from './world';
import { emit, stamp, compactEvents } from './events';
import { keepRecord, toRecord } from './record';
import { aftermath, type Aftermath } from './aftermath';
import { windowOf } from './windows';
import { roomDay } from './room';

export interface Step { world: World; career: Career; mine: LiveMatch | null; after: Aftermath | null; ev: string }

const moraleOf = (w: World, c: Career) => { const s = squadOf(w, c.clubId); return Math.round(s.reduce((a, p) => a + p.morale, 0) / Math.max(1, s.length)); };

// `played`: the user's match finished live (kick-off already had its prep). Otherwise the whole day is simulated.
export function advance(w0: World, c0: Career, played?: LiveMatch): Step {
  let world = w0, career = c0;
  // 1 prep
  if (!played) ({ world, career } = staffPrep(world, career, nextUserMatch(world, career)));
  const pre = { world, career };
  const win0 = windowOf(career);
  // 2 matchday
  const day = playDay(world, career, played);
  world = day.world; career = day.career;
  // 2b dressing room (v2.4): starts against roles and promises, cohesion, requests, asks, clauses
  ({ world, career } = roomDay(pre.world, world, career, day.mine));
  // 3 record
  let after: Aftermath | null = null;
  if (day.mine) {
    const get = (id: string) => playerOf(world, id) ?? playerOf(pre.world, id)!;
    const k = day.mine.sides[0].clubId === c0.clubId ? 0 : 1;
    career = keepRecord(career, toRecord(day.mine, get, k as 0 | 1), (id) => playerOf(world, id) ?? playerOf(pre.world, id), c0.season);
    after = aftermath(pre.world, pre.career, world, career, day.mine);
    career = { ...career, rested: [], talk: 0 };
  }
  career = { ...career, pulse: [...(career.pulse ?? []), [c0.round, Math.round(career.board.confidence), Math.round(career.board.fans), moraleOf(world, career)] as [number, number, number, number]].slice(-12) };
  // 4 calendar
  const win1 = windowOf(career);
  // 5 log
  const e = emit(career, day.mine ? 'match' : 'result', 'matchday', {
    refs: { c: day.mine ? day.mine.sides.map((s) => s.clubId) : [] },
    data: { round: c0.round, window: win1 ?? null, opened: !win0 && !!win1, shut: !!win0 && !win1, ...(day.mine ? { gf: day.mine.goals[day.mine.sides[0].clubId === c0.clubId ? 0 : 1], ga: day.mine.goals[day.mine.sides[0].clubId === c0.clubId ? 1 : 0] } : {}) },
  });
  career = stamp(c0, e.career, e.id);
  return { world, career, mine: day.mine, after, ev: e.id };
}

// The rest of the world's matchdays after the user's league is done.
export function finishSeason(w: World, c: Career): { world: World; career: Career } {
  let world = w, career = c;
  while (!seasonOver(career) && !career.sacked) ({ world, career } = advance(world, career));
  return { world, career };
}

export function endOfSeason(w: World, c: Career): { world: World; career: Career; summary: SeasonSummary } {
  const r = endSeason(w, c);
  const e = emit(compactEvents(r.career), 'season', 'season.end', { data: { season: c.season, position: r.summary.record.position, met: r.summary.record.met } });
  return { world: r.world, career: stamp(r.career, e.career, e.id), summary: r.summary };
}

// "Sim to next decision" (V2_DESIGN §5): quick results, matchweek after matchweek, until `stop` says why to stop, or
// `max` matchdays. Every skipped match still produces a MatchRecord; the digest lists what happened meanwhile.
export function simUntil(w: World, c: Career, stop: (w: World, c: Career) => string | null, max = 8): { world: World; career: Career; digest: Digest } {
  let world = w, career = c;
  const results: Digest['results'] = [];
  const seq0 = c.tickSeq ?? 0;
  let why = 'max';
  for (let i = 0; i < max; i++) {
    if (seasonOver(career) || career.sacked) { why = 'season'; break; }
    const s = advance(world, career);
    world = s.world; career = s.career;
    if (s.mine) results.push({ key: s.mine.key, home: s.mine.sides[0].clubId, away: s.mine.sides[1].clubId, goals: [s.mine.goals[0], s.mine.goals[1]], cup: s.mine.cup });
    const r = stop(world, career);
    if (r) { why = r; break; }
  }
  const staff = staffCallsSince(career, seq0);
  const digest: Digest = { from: [c.season, c.round], to: [career.season, career.round], results, staff, stopped: why };
  return { world, career: { ...career, lastDigest: digest }, digest };
}

// Commands a member of staff ran (not the manager) since event number `seq`.
export const staffCallsSince = (c: Career, seq: number) =>
  (c.events ?? []).filter((e) => e.type === 'cmd' && e.data?.by && e.data.by !== 'me' && Number(e.id.split('.n')[1]) >= seq).length;

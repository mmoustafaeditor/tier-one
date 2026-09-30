// The coach's career: board and fans, sacking, job offers, XP and level, reputation, licences, courses, milestones and the inbox.
// E2E lessons: board messages match the real situation (#19), sacking really happens (#17), offers fit the coach (#18),
// one licence at a time (#44), licences gate clubs and formations (#16), milestones only when really done (#43),
// moving club never locks the career and the new club welcomes you (#40, #49, #50, #27), the inbox trims itself (#37).
import type { Career, Club, Coach, Licence, LocalizedName, Msg, MsgKind, Objective } from '../model/types';
import { clamp } from './rng';
import { squadOf, type World } from './world';
import type { FormationId } from './tactics';
import { cupRun, cupWinner } from './cups';
import { newOps } from './economy';
import { myWorldRank } from './rankings';
import { addNews } from './news';
import { balanceOf, sackLine, seasonSackLine } from './balance';
import { strictness, userObjective } from './vision';
import { DERBY_WEIGHT, isDerby } from './rivalry';

// `board.hired` (coach days at the hire) is written by newBoard and read by sinceHire; saves from before this change have none.
type Board = Career['board'] & { hired?: number };

// ---------- licences ----------

export const LICENCES: Licence[] = ['D', 'C', 'B', 'A', 'PRO', 'ELITE'];
// Highest club reputation each licence lets you manage.
export const LICENCE_CAP: Record<Licence, number> = { D: 62, C: 70, B: 78, A: 86, PRO: 94, ELITE: 100 };
export const LICENCE_NEEDS: Record<Licence, { level: number; matches: number; fee: number; trophy?: boolean }> = {
  D: { level: 1, matches: 0, fee: 0 }, C: { level: 3, matches: 20, fee: 5_000 }, B: { level: 6, matches: 50, fee: 15_000 },
  A: { level: 10, matches: 100, fee: 40_000 }, PRO: { level: 15, matches: 180, fee: 100_000 }, ELITE: { level: 22, matches: 300, fee: 250_000, trophy: true },
};
export const LICENCE_GAP = 10; // matchdays between two licences

// v2: formation locks are retired (tactics follow the squad, not a badge). Every shape is open from day one.
export const formationNeeds = (_f: FormationId): Licence => 'D';
export const hasLicence = (have: Licence, need: Licence) => LICENCES.indexOf(have) >= LICENCES.indexOf(need);
export const licenceFor = (clubRep: number): Licence => LICENCES.find((l) => LICENCE_CAP[l] >= clubRep) ?? 'ELITE';
export const nextLicence = (l: Licence): Licence | null => LICENCES[LICENCES.indexOf(l) + 1] ?? null;

// Level curve: 60 × (level−1)² XP, so licence A (level 10) takes about three or four average seasons and PRO seven or eight.
export const XP_PER_LEVEL = 60;
export const levelOf = (xp: number) => Math.min(50, Math.floor(Math.sqrt(xp / XP_PER_LEVEL)) + 1);
export const xpForLevel = (level: number) => XP_PER_LEVEL * (level - 1) ** 2;

// v2: badges come from matches managed (V2_DESIGN §3.9), not from a quiz. C 20 · B 60 · A 120 · PRO 220; ELITE needs PRO
// and a major trophy (a top-flight title or a continental cup).
export const BADGE_MATCHES: Record<Licence, number> = { D: 0, C: 20, B: 60, A: 120, PRO: 220, ELITE: 220 };
export function awardBadge(c: Career): Career {
  const next = nextLicence(c.coach.licence);
  if (!next || c.coach.record[0] < BADGE_MATCHES[next]) return c;
  if (next === 'ELITE' && !c.coach.trophies.some((t) => t.kind === 'continental' || (t.kind === 'league' && t.id.endsWith('1')))) return c;
  const coach: Coach = { ...c.coach, licence: next, licenceAt: c.coach.days, xp: c.coach.xp + 200 };
  return checkMilestones(addMsg({ ...c, coach }, 'coach', 'licence', { s: next }), null).career;
}

// ---------- courses ----------

export const COURSES: { id: string; cost: number; xp: number; rep: number }[] = [
  { id: 'conditioning', cost: 30_000, xp: 280, rep: 3 },  // -15% match fatigue
  { id: 'psychology', cost: 35_000, xp: 300, rep: 4 },    // losses hurt morale less
  { id: 'gegenpress', cost: 25_000, xp: 250, rep: 3 },    // high pressing hits harder
  { id: 'fellowship', cost: 75_000, xp: 650, rep: 6 },    // young players develop faster
];

export function takeCourse(c: Career, id: string): { career: Career; ok: boolean } {
  const course = COURSES.find((x) => x.id === id)!;
  if (c.coach.courses.includes(id) || c.coach.wallet < course.cost) return { career: c, ok: false };
  const coach: Coach = { ...c.coach, wallet: c.coach.wallet - course.cost, courses: [...c.coach.courses, id], xp: c.coach.xp + course.xp, reputation: clamp(c.coach.reputation + course.rep, 0, 100) };
  return { career: addMsg({ ...c, coach }, 'coach', 'course', { s: id }), ok: true };
}

// ---------- inbox ----------

export function addMsg(c: Career, kind: MsgKind, key: string, ref: { club?: string; player?: string; pn?: LocalizedName; n?: number; s?: string } = {}): Career {
  const inbox = c.inbox ?? [];
  // Ids never collide, even for two messages of one tick right after the inbox was cleared.
  const base = `${c.season}.${c.round}.${key}.${ref.player ?? ref.club ?? ref.s ?? ''}`;
  let id = base;
  for (let n = 1; inbox.some((m) => m.id === id); n++) id = `${base}#${n}`;
  const msg: Msg = { id, season: c.season, round: c.round, kind, key, ...ref };
  return { ...c, inbox: [msg, ...inbox].slice(0, 60) };
}

// ---------- start, salary, moving ----------

export const salaryOf = (club: Club) => Math.max(3_000, Math.round(club.wageCap * 0.03 / 100) * 100);

export function newCoach(club: Club): Coach {
  const licence = licenceFor(club.reputation);
  return {
    xp: xpForLevel(LICENCE_NEEDS[licence].level), reputation: clamp(club.reputation - 25, 10, 70), licence, licenceAt: -LICENCE_GAP,
    courses: [], milestones: [], wallet: salaryOf(club), record: [0, 0, 0, 0, 0], goals: [0, 0], streak: 0, unbeaten: 0,
    trophies: [], clubs: [club.id], days: 0,
  };
}

// A new job starts with the board's goodwill, and the sack line stays off for the first matchdays (`hired` = coach days then).
export const BOARD_START = 65;
export const HONEYMOON = 10; // matchdays after a hire (and at the start of a season) before the board can sack
export const newBoard = (c: Career | null): Board => ({ confidence: BOARD_START, fans: 55, hired: c?.coach?.days ?? 0 });
export const sinceHire = (c: Career) => c.coach.days - ((c.board as Board).hired ?? 0);

// New club: fresh board, the tactics and transfer list start clean, and the new club says hello.
// v2: what belongs to the club stays with the club (V2_DESIGN §0.8). The old club's operations (academy, facilities,
// staff, sponsors) and its squad's familiarity with each philosophy are kept in world.clubOps / world.clubFam, and a
// club you managed before picks up where you left it.
export function moveTo(w: World, c: Career, clubId: string): { world: World; career: Career } {
  const players = w.players.map((p) => (p.listed && p.clubId === c.clubId ? { ...p, listed: undefined } : p));
  const clubOps = { ...(w.clubOps ?? {}), [c.clubId]: c.ops };
  const clubFam = { ...(w.clubFam ?? {}), [c.clubId]: c.mastery };
  const ops = clubOps[clubId] ?? newOps(w, w.clubs.find((x) => x.id === clubId)!, c.season);
  const mastery = clubFam[clubId] ?? { balanced: 100 };
  delete clubOps[clubId];
  delete clubFam[clubId];
  let career: Career = {
    ...c, clubId, tactics: undefined, planB: undefined, rested: [], pending: [], offers: [], jobs: [], sacked: false, live: null, ops, mastery,
    board: newBoard(c),
    coach: { ...c.coach, clubs: c.coach.clubs.includes(clubId) ? c.coach.clubs : [...c.coach.clubs, clubId] },
  };
  career = addMsg(career, 'club', 'welcome', { club: clubId });
  career = addNews(career, 'managers', 'appointed', { club: clubId, s: c.managerName });
  return { world: { ...w, players, clubOps, clubFam }, career };
}

// Clubs that would hire this coach: within the licence cap and near the coach's reputation. When sacked, lower clubs only.
export function jobOffers(w: World, c: Career, sacked: boolean, n = 3): string[] {
  const cap = LICENCE_CAP[c.coach.licence];
  const rep = c.coach.reputation;
  const here = w.clubs.find((x) => x.id === c.clubId);
  const pool = w.clubs.filter((x) => x.id !== c.clubId && x.reputation <= cap
    && (sacked ? x.reputation <= Math.max(58, (here?.reputation ?? 60) + 3) : x.reputation >= rep + 10 && x.reputation <= rep + 25 && x.reputation > (here?.reputation ?? 0)));
  // Clubs from the coach's own country come first, then its region, then the rest.
  const countryOf = (x: Club) => w.leagues.find((l) => l.id === x.leagueId)!.country;
  const mine = here ? countryOf(here) : '';
  const arab = ['EGY', 'KSA', 'MAR', 'TUN', 'ALG', 'UAE', 'QAT'];
  const near = (x: Club) => (countryOf(x) === mine ? 0 : arab.includes(countryOf(x)) === arab.includes(mine) ? 1 : 2);
  const sorted = pool.sort((a, b) => near(a) - near(b) || b.reputation - a.reputation);
  return sorted.slice(0, n).map((x) => x.id);
}

// ---------- board objectives ----------

export type CupAim = 'win' | 'semi' | 'round2';
export interface Objectives { league: Objective; cup: CupAim; youth: number; finance: true }

export function objectivesOf(w: World, c: Career): Objectives {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const lg = w.leagues.find((l) => l.id === club.leagueId)!;
  const country = w.clubs.filter((x) => w.leagues.find((l) => l.id === x.leagueId)?.country === lg.country).sort((a, b) => b.reputation - a.reputation);
  const rank = country.findIndex((x) => x.id === club.id);
  return { league: userObjective(w, c), cup: rank < 2 ? 'win' : rank < 8 ? 'semi' : 'round2', youth: club.reputation >= 85 ? 5 : 15, finance: true };
}

export const youthApps = (w: World, c: Career) =>
  squadOf(w, c.clubId).filter((p) => c.season - p.birthYear <= 21).reduce((s, p) => s + (c.stats[p.id]?.[0] ?? 0), 0);

export function cupAimMet(w: World, c: Career, aim: CupAim): boolean | null {
  const lg = w.leagues.find((l) => l.id === w.clubs.find((x) => x.id === c.clubId)!.leagueId)!;
  const cup = c.cups[`${lg.country.toLowerCase()}_cup`];
  if (!cup) return null;
  const run = cupRun(cup, c.clubId);
  if (!run) return null;
  const rounds = cup.days.length;
  // Still in it: not decided yet.
  const out = cup.ties[run.round].some((t) => (t[0] === c.clubId || t[1] === c.clubId) && t[6] && t[6] !== c.clubId);
  if (!out && !run.won && !cupWinner(cup)) {
    if (aim === 'round2' && run.round >= 1) return true;
    return null;
  }
  if (aim === 'win') return run.won;
  if (aim === 'semi') return run.round >= rounds - 2;
  return run.round >= 1;
}

// ---------- after each of the user's matches ----------

// `expected`: the engine's own expected points at kick-off (3·P(win) + P(draw) from predict()), the same odds the user saw.
export interface MatchOutcome { mine: number; theirs: number; oppId: string; home: boolean; myLevel: number; oppLevel: number; cup: boolean; expected?: number }
export const BOARD_PER_SURPRISE = 1.8;
export const FANS_PER_SURPRISE = 2;
export const FANS_REST = 55; // where the fans drift back to: 3% of the gap a match keeps a winning side's fans near 80 and
export const FANS_SETTLE = 0.03; // a struggling side's near 35, instead of running to 100 or 0
export const FANS_PER_TROPHY = 8; // a trophy (league, cup, promotion) lifts the fans at the season's end
export const FANS_RESULT: Record<number, number> = { 0: -1.5, 1: 0, 3: 1.5 };

export function afterMatch(w: World, c: Career, o: MatchOutcome): { world: World; career: Career } {
  const me = w.clubs.find((x) => x.id === c.clubId)!;
  const opp = w.clubs.find((x) => x.id === o.oppId)!;
  const pts = o.mine > o.theirs ? 3 : o.mine === o.theirs ? 1 : 0;
  const expected = o.expected ?? clamp(1.4 + (o.myLevel - o.oppLevel) * 0.1 + (o.home ? 0.2 : -0.2), 0.3, 2.6);
  const surprise = pts - expected;
  const k = isDerby(c.clubId, o.oppId) ? DERBY_WEIGHT : 1; // V2.8: a derby's result counts 1.5 times with the board and the fans
  const coach: Coach = {
    ...c.coach,
    record: [c.coach.record[0] + 1, c.coach.record[1] + (pts === 3 ? 1 : 0), c.coach.record[2] + (pts === 1 ? 1 : 0), c.coach.record[3] + (pts === 0 ? 1 : 0), 0],
    goals: [c.coach.goals[0] + o.mine, c.coach.goals[1] + o.theirs],
    streak: pts === 3 ? c.coach.streak + 1 : 0,
    unbeaten: pts > 0 ? c.coach.unbeaten + 1 : 0,
    xp: c.coach.xp + (pts === 3 ? 30 : pts === 1 ? 10 : 3) + (o.cup && pts === 3 ? 10 : 0),
    reputation: clamp(c.coach.reputation + (surprise > 0.8 ? 0.1 : surprise < -1.2 ? -0.1 : 0), 0, 100),
  };
  const before = c.board;
  const board = {
    confidence: clamp(Math.round((before.confidence + surprise * BOARD_PER_SURPRISE * k) * 10) / 10, 0, 100),
    // Fans enjoy winning whatever the odds said, and a surprise moves them on top: odds alone left a winning
    // favourite's fans "muttering" all season (audit GF-004).
    fans: clamp(Math.round((before.fans + (FANS_RESULT[pts] + surprise * FANS_PER_SURPRISE) * k + (o.mine >= 3 ? 1 : 0) + (FANS_REST - before.fans) * FANS_SETTLE) * 10) / 10, 0, 100),
  };
  let career: Career = { ...c, coach, board };
  // Messages that match what really happened (E2E #19).
  if (o.mine - o.theirs >= 3) career = addMsg(career, 'fans', 'bigWin', { club: opp.id, s: `${o.mine}-${o.theirs}` });
  if (o.theirs - o.mine >= 3) career = addMsg(career, 'board', 'badLoss', { club: opp.id, s: `${o.mine}-${o.theirs}` });
  if (pts === 3 && opp.reputation >= me.reputation + 15) career = addMsg(career, 'fans', 'giantKill', { club: opp.id });
  if (before.confidence >= 35 && board.confidence < 35) career = addMsg(career, 'board', 'boardWorried');
  if (before.confidence >= 20 && board.confidence < 20) career = addMsg(career, 'board', 'boardAngry');
  if (before.confidence < 75 && board.confidence >= 75) career = addMsg(career, 'board', 'boardHappy');
  if (before.fans >= 30 && board.fans < 30) career = addMsg(career, 'fans', 'fansAngry');
  if (before.fans < 80 && board.fans >= 80) career = addMsg(career, 'fans', 'fansLove');
  const ms = checkMilestones(career, { beat: pts === 3 ? opp.reputation - me.reputation : null, rank: myWorldRank(w, career) });
  career = awardBadge(ms.career);
  let world = w;
  if (ms.cash) world = { ...w, clubs: w.clubs.map((x) => (x.id === c.clubId ? { ...x, budget: x.budget + ms.cash } : x)) };
  return { world, career };
}

// Mid-season sacking: after the honeymoon (a new job's first matchdays, and the start of every season), a board below 12% lets you go.
// `onCourse`: the club meets its objective or is within touching distance of it (season.ts onCourse); a board doesn't
// sack a manager who is delivering what it asked for (audit GF-004: a Man City side 2nd with 33 wins was sacked).
export function sackCheck(w: World, c: Career, onCourse = false): Career {
  if (c.sacked || onCourse || c.round < HONEYMOON || sinceHire(c) < HONEYMOON || c.board.confidence >= sackLine(balanceOf(c)) + strictness(c)) return c;
  const career: Career = { ...c, sacked: true, jobs: jobOffers(w, c, true) };
  return addNews(addMsg(career, 'board', 'sacked', { club: c.clubId }), 'managers', 'sacked', { club: c.clubId, s: c.managerName });
}

// ---------- milestones ----------

export const MILESTONES: { id: string; cat: 'short' | 'mid' | 'long'; xp: number; rep: number; cash: number }[] = [
  { id: 'firstWin', cat: 'short', xp: 150, rep: 1, cash: 25_000 },
  { id: 'streak3', cat: 'short', xp: 250, rep: 1, cash: 50_000 },
  { id: 'unbeaten10', cat: 'mid', xp: 400, rep: 2, cash: 75_000 },
  { id: 'giantSlayer', cat: 'mid', xp: 450, rep: 3, cash: 75_000 },
  { id: 'streak5', cat: 'mid', xp: 500, rep: 2, cash: 100_000 },
  { id: 'cupGlory', cat: 'mid', xp: 800, rep: 4, cash: 150_000 },
  { id: 'promotion', cat: 'mid', xp: 700, rep: 4, cash: 150_000 },
  { id: 'leagueTitle', cat: 'long', xp: 1200, rep: 6, cash: 250_000 },
  { id: 'topFlightTitle', cat: 'long', xp: 2000, rep: 8, cash: 500_000 },
  { id: 'continental', cat: 'long', xp: 2500, rep: 10, cash: 1_000_000 },
  { id: 'matches100', cat: 'long', xp: 600, rep: 3, cash: 100_000 },
  { id: 'winRate55', cat: 'long', xp: 900, rep: 4, cash: 200_000 },
  { id: 'twoClubs', cat: 'long', xp: 1500, rep: 6, cash: 300_000 },
  { id: 'licenceA', cat: 'mid', xp: 500, rep: 3, cash: 0 },
  { id: 'licencePro', cat: 'long', xp: 1000, rep: 5, cash: 0 },
  { id: 'worldNo1', cat: 'long', xp: 3000, rep: 10, cash: 1_000_000 },
];

// Each milestone is checked against real numbers; `beat` is the reputation gap of a team just beaten.
export function checkMilestones(c: Career, ctx: { beat: number | null; rank?: number } | null): { career: Career; cash: number } {
  const k = c.coach;
  const has = (id: string) => k.milestones.includes(id);
  const clubsWithTrophy = new Set(k.trophies.filter((t) => t.kind !== 'promotion').map((t) => t.clubId));
  const done: Record<string, boolean> = {
    firstWin: k.record[1] >= 1,
    streak3: k.streak >= 3,
    streak5: k.streak >= 5,
    unbeaten10: k.unbeaten >= 10,
    giantSlayer: (ctx?.beat ?? -99) >= 15,
    cupGlory: k.trophies.some((t) => t.kind === 'cup'),
    promotion: k.trophies.some((t) => t.kind === 'promotion'),
    leagueTitle: k.trophies.some((t) => t.kind === 'league'),
    topFlightTitle: k.trophies.some((t) => t.kind === 'league' && t.id.endsWith('1')),
    continental: k.trophies.some((t) => t.kind === 'continental'),
    matches100: k.record[0] >= 100,
    winRate55: k.record[0] >= 50 && k.record[1] / k.record[0] >= 0.55,
    twoClubs: clubsWithTrophy.size >= 2,
    // Only licences earned by exam count, not the one you started with (E2E #43).
    licenceA: k.licenceAt >= 0 && hasLicence(k.licence, 'A'),
    licencePro: k.licenceAt >= 0 && hasLicence(k.licence, 'PRO'),
    worldNo1: ctx?.rank === 1,
  };
  let career = c, cash = 0;
  for (const m of MILESTONES) {
    if (has(m.id) || !done[m.id]) continue;
    const coach: Coach = { ...career.coach, milestones: [...career.coach.milestones, m.id], xp: career.coach.xp + m.xp, reputation: clamp(career.coach.reputation + m.rep / 2, 0, 100) };
    career = addMsg({ ...career, coach }, 'coach', 'milestone', { s: m.id });
    cash += m.cash;
  }
  return { career, cash };
}

// ---------- end of season (called by endSeason with the final tables, before promotion and relegation) ----------

export function coachSeasonEnd(w: World, c: Career, position: number, leagueId: string, promoted: boolean, met: boolean, short = 3):
  { career: Career; cash: number } {
  const lg = w.leagues.find((l) => l.id === leagueId)!;
  const trophies = [...c.coach.trophies];
  let rep = c.coach.reputation;
  if (position === 1) { trophies.push({ season: c.season, kind: 'league', id: leagueId, clubId: c.clubId }); rep += lg.tier === 1 ? 4 : 2; }
  if (promoted) { trophies.push({ season: c.season, kind: 'promotion', id: leagueId, clubId: c.clubId }); rep += 2; }
  for (const cup of Object.values(c.cups)) {
    if (cupWinner(cup) === c.clubId) {
      trophies.push({ season: c.season, kind: cup.kind === 'national' ? 'cup' : 'continental', id: cup.id, clubId: c.clubId });
      rep += cup.kind === 'national' ? 2 : 5;
    }
  }
  const aims = objectivesOf(w, c);
  const cupMet = cupAimMet(w, c, aims.cup);
  const youthMet = youthApps(w, c) >= aims.youth;
  const inTheBlack = w.clubs.find((x) => x.id === c.clubId)!.budget >= 0;
  // The weekly table check already moved confidence during the season, so the review weighs how far off the club finished.
  const delta = (met ? 10 : -Math.min(16, 6 + 2 * short)) + (cupMet === true ? 5 : cupMet === false ? -5 : 0) + (youthMet ? 3 : -3) + (inTheBlack ? 3 : -10);
  rep += met ? 1 : -3;
  let career: Career = {
    ...c,
    coach: { ...c.coach, trophies, reputation: clamp(rep, 0, 100), xp: c.coach.xp + (met ? 400 : 100) },
    board: { ...c.board, confidence: clamp(c.board.confidence + delta, 0, 100), fans: clamp(c.board.fans + (met ? 10 : -10) + FANS_PER_TROPHY * (trophies.length - c.coach.trophies.length), 0, 100) },
  };
  career = addMsg(career, 'board', met ? 'seasonGood' : 'seasonBad', { n: position });
  const ms = checkMilestones(career, null);
  career = ms.career;
  if (career.board.confidence < seasonSackLine(balanceOf(career)) + strictness(c)) {
    career = { ...career, sacked: true, jobs: jobOffers(w, career, true) };
    career = addMsg(career, 'board', 'sacked', { club: c.clubId });
    career = addNews(career, 'managers', 'sacked', { club: c.clubId, s: c.managerName });
  } else {
    const jobs = jobOffers(w, career, false, met ? 2 : 1);
    career = { ...career, jobs };
    for (const j of jobs) career = addMsg(career, 'job', 'jobOffer', { club: j });
  }
  return { career, cash: ms.cash };
}

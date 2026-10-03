// V2.6 Training & pathway (V2_DESIGN §3.5, §4 "Prospect becomes captain").
//
// One place for the training ground, the medical room and the academy, and ONE development function for every player
// in the world (yours, AI clubs', loanees', academy kids'). Everything here is pure and seeded.
//
//  consumes   minutes from every MatchRecord (season.ts applyMatch → addMinutes), the manager's intensity / focus /
//             individual plans (commands), facilities and staff quality, age, potential, personality (optional field)
//  triggers   the clock: `developDay` after every league matchday (all players), `pathwayDay` (preview, Intake Day,
//             loan reports, breakthroughs), `seasonEndYouth` inside endSeason; commands: training.set, medical.treat,
//             academy.promote / release / loan, pathway.recall, pathway.word
//  changes    player.load / m5 / ms / run / prog / rating / attrs / alt / inj0 / rr / rh, world.academy, career.intake,
//             career.trainRep, inbox and news
//  consumers  the engine (injury chance and who gets hurt, from load; condition), selection (risk badges, the XI picker
//             via p.alt), value (valueOf), the board's youth objective (minutes of club-trained players), Today
//             decisions (risk, rush-back, Intake Day, ready prospect, loanee report, academy full), the profile curve
import type { Career, Club, Intake, LocalizedName, Player, Position, TrainReport } from '../model/types';
import { FREE_AGENT } from '../model/types';
import { playerName, FOREIGN_NATIONS } from '../data/names';
import { bell, clamp, int, pick, rngFor, type Rng } from './rng';
import { freeShirt, makeAttrs, playerOf, shiftAttrs, squadOf, strengthOf, valueOf, wageOf, type World } from './world';
import { staffQ } from './economy';
import { addMsg } from './coach';
import { addNews } from './news';
import { roundsIn, roundFee, nextUserMatch } from './season';
import { windowOf } from './windows';
import { SQUAD_MAX, dropFromXI } from './transfers';
import { loanOf } from './loans';
import { available, xiFor, slotValue } from './tactics';
import { archetypeOf } from './room';

// ---------- numbers (V2_DESIGN §3.5, calibrated for a 46-step season) ----------

export const LOAD_PER_MIN = 0.3;          // load per minute played (a full match ≈ +27)
export const LOAD_KEEP = [0.35, 0.45, 0.45]; // share of load carried to the next matchday: light, normal, heavy (a weekly 90 settles near 49)
export const LOAD_EXTRA = [-4, 0, 4];     // light / heavy training on top
export const PLAN_LOAD = 2;               // extra work on an individual plan
// Injury risk multiplier from load: 1 up to 50, rising to ×3 at 75 and beyond (V2_DESIGN: "load above 75 triples it").
export const riskMult = (load = 0) => Math.min(3, 1 + Math.max(0, load - 50) / 12.5);
export type RiskBand = 0 | 1 | 2; // low, elevated, high
export const riskBand = (p: Pick<Player, 'load' | 'rr'>): RiskBand => ((p.rr && p.rr[1] > 0) || (p.load ?? 0) > 75 ? 2 : (p.load ?? 0) >= 50 ? 1 : 0);
// The engine's injury chance works out at about one injury per side per 7 matches: ≈1.1 % per player per 90 minutes.
export const BASE_INJURY = 1.1;
export const matchRisk = (p: Pick<Player, 'load' | 'rr'>) => Math.round(Math.min(60, BASE_INJURY * riskMult(p.load) + (p.rr && p.rr[1] > 0 ? p.rr[0] : 0)));

export const INTENSITY = [0.7, 1, 1.4];   // development × by intensity: light, normal, heavy
export const DEV_K = 4.4;                 // progress points per unit of growth (100 progress = +1 rating)
export const FOCUS_DEV = 1.25;            // the week's Development focus
export const PLANS_MAX = 5;               // individual plans at once
export const POS_WORK = 9;                // new-position progress per matchday (≈ 11 matchdays to learn one)
export const RUSH_SHARE = 0.5;            // rush-back only once half the injury has healed
export const RUSH_MATCHES = 3;            // the re-injury risk applies to his next three matches
export const ACADEMY_MINUTES = 0.65;      // academy football counts for less than first-team minutes
export const OVERFULL = 0.85;             // an academy over capacity: coaches spread thin
export const HIST_MAX = 60;

const BASE = (age: number) => (age <= 19 ? 2 : age <= 21 ? 1.6 : age <= 23 ? 1.2 : age <= 27 ? 0.5 : age <= 30 ? 0.1 : 0);
// Decline after 30, per matchday in progress points (≈ −0.9 a season at 31 … −4.6 at 35).
const DECLINE = (age: number) => (age < 31 ? 0 : Math.min(12, 2 + 2 * (age - 31)));
// Personality from the dressing room (V2.4, sim/room.ts archetypeOf): Driven players get more from training, Volatile ones less.
export const proOf = (p: Player) => { const a = archetypeOf(p); return a === 'driven' ? 1.15 : a === 'volatile' ? 0.9 : 1; };

// AI clubs have no facility screen: their training ground and coaches follow their standing.
const aiFac = (rep: number) => clamp(Math.round(rep / 22), 1, 5);
export const academyCap = (level: number) => 8 + 2 * level;

// ---------- history (real samples only) ----------

export const enc = (season: number, round: number, rating: number) => season * 10000 + Math.min(99, round) * 100 + rating;
export const dec = (v: number) => ({ season: Math.floor(v / 10000), round: Math.floor((v % 10000) / 100), rating: v % 100 });
const pushHist = (p: Player, season: number, round: number, rating: number) => {
  const h = p.rh ?? [];
  const last = h[h.length - 1];
  if (last !== undefined && dec(last).rating === rating && dec(last).season === season) return h;
  return [...h, enc(season, round, rating)].slice(-HIST_MAX);
};

// ---------- the academy as a world squad ----------

export const academyOf = (w: World, clubId: string) => (w.academy ?? []).filter((p) => p.clubId === clubId);
export const inAcademy = (w: World, id: string) => (w.academy ?? []).find((p) => p.id === id);
// Any player of the world, first team or academy.
export const anyPlayer = (w: World, id: string) => playerOf(w, id) ?? inAcademy(w, id);
export const capOf = (w: World, c: Career, clubId: string) => {
  if (clubId === c.clubId) return academyCap(c.ops.facilities.academy);
  const club = w.clubs.find((x) => x.id === clubId);
  return academyCap(aiFac(club?.reputation ?? 50));
};

const countryOfClub = (w: World, clubId: string) => w.leagues.find((l) => l.id === w.clubs.find((x) => x.id === clubId)?.leagueId)?.country ?? 'ENG';
const POSITIONS: Position[] = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST'];

// Intake quality: the academy facility, the club's pull and the Head of Youth (the chief scout runs the academy).
interface Pull { fac: number; rep: number; hoy: number }
const pullOf = (w: World, c: Career | null, clubId: string): Pull => {
  const club = w.clubs.find((x) => x.id === clubId)!;
  if (c && clubId === c.clubId) return { fac: c.ops.facilities.academy, rep: club.reputation, hoy: staffQ(c.ops, 'scout') };
  return { fac: aiFac(club.reputation), rep: club.reputation, hoy: Math.round(club.reputation * 0.7) };
};

function makeKid(w: World, clubId: string, season: number, id: string, age: number, pull: Pull, r: Rng): Player {
  const country = countryOfClub(w, clubId);
  const pos = pick(r, POSITIONS);
  const gem = r() < 0.06 ? 8 : 0;
  const potential = clamp(Math.round(42 + pull.fac * 3 + pull.rep * 0.22 + pull.hoy * 0.04 + bell(r) * 14 + gem), 48, 94);
  // Older kids (the seeded academies of a new career) are further along.
  const rating = clamp(Math.round(potential - 18 - r() * 10 + (age - 15) * 2.5), 35, Math.min(72, potential));
  const nationality = r() < 0.85 ? country : pick(r, FOREIGN_NATIONS[country] ?? ['BRA', 'SEN', 'NGA', 'MAR', 'FRA']);
  const value = valueOf(rating, age, potential);
  const lid = w.clubs.find((x) => x.id === clubId)?.leagueId ?? 'eng2';
  return {
    id, clubId, name: playerName(nationality, r), nationality, birthYear: season - age, position: pos, rating, potential,
    marketValue: value, wage: Math.max(500, roundFee(wageOf(value, lid) / 4)), contractUntil: season + 3, shirtNumber: 0,
    attrs: makeAttrs(r, rating, pos), fitness: 100, morale: 72, injured: 0, banned: 0, hg: clubId, rh: [enc(season, 0, rating)],
  };
}

// A new world (or an old save) gets a lived-in academy at every club: 4–6 kids aged 15–18.
export function seedAcademies(w: World, c: Career): World {
  const have = new Set((w.academy ?? []).map((p) => p.clubId));
  const kids: Player[] = [];
  for (const club of w.clubs) {
    if (have.has(club.id)) continue;
    const r = rngFor(c.seed, 'academy-seed', club.id, c.season);
    const n = int(r, 4, 6);
    for (let i = 0; i < n; i++) kids.push(makeKid(w, club.id, c.season, `ya${c.season}s-${club.id}-${i}`, int(r, 15, 18), pullOf(w, c, club.id), r));
  }
  return kids.length || !w.academy ? { ...w, academy: [...(w.academy ?? []), ...kids] } : w;
}

// ---------- Intake Day ----------

export const intakeDay = (c: Career) => Math.floor(roundsIn(c) * 0.7);
export const previewDay = (c: Career) => Math.max(1, intakeDay(c) - 10);
export const intakeSize = (pull: Pull, r: Rng) => clamp(3 + Math.round((pull.fac - 1) * 0.6 + r() * 2.4), 3, 7);

export function makeIntake(w: World, c: Career, clubId: string): Player[] {
  const r = rngFor(c.seed, 'intake', clubId, c.season);
  const pull = pullOf(w, c, clubId);
  const n = intakeSize(pull, r);
  return Array.from({ length: n }, (_, i) => makeKid(w, clubId, c.season, `ya${c.season}-${clubId}-${i}`, int(r, 15, 16), pull, r))
    .sort((a, b) => b.potential - a.potential);
}

// The one line the Head of Youth gives ten matchdays before: the standout's position and how good he might be.
export const standout = (kids: Player[]) => [...kids].sort((a, b) => b.potential - a.potential)[0];
export const tierOf = (potential: number): 0 | 1 | 2 | 3 => (potential >= 82 ? 3 : potential >= 74 ? 2 : potential >= 66 ? 1 : 0);

// ---------- minutes and load (called from the aftermath reducer, every match in the world) ----------

export function addMinutes(p: Player, mins: number) {
  if (!(mins > 0)) return;
  p.load = Math.min(100, Math.round((p.load ?? 0) + LOAD_PER_MIN * mins));
  p.m5 = Math.round((p.m5 ?? 0) + mins);
  p.ms = Math.round((p.ms ?? 0) + mins);
  p.lmd = (p.lmd ?? 0) + mins;
}

// ---------- the congested week ----------

// Does the club play a cup tie on this matchday (so the week holds two matches)?
export function cupOn(c: Career, clubId: string, day: number): boolean {
  for (const cup of Object.values(c.cups ?? {})) {
    const k = cup.days.indexOf(day);
    if (k >= 0 && (cup.ties[k] ?? []).some((t) => t[0] === clubId || t[1] === clubId)) return true;
    const g = cup.groups;
    if (g) {
      const gd = g.days.indexOf(day);
      if (gd >= 0 && (g.games[gd] ?? []).some((t) => t[0] === clubId || t[1] === clubId)) return true;
    }
  }
  return false;
}
export const congested = (c: Career) => cupOn(c, c.clubId, c.round);

// ---------- one development tick: every player in the world ----------

interface Ctx { season: number; round: number; qual: Map<string, number>; user: string; userQ: number; ac: number; acUser: number; over: Set<string> }

// The unified growth function (V2_DESIGN §3.5): g = base(age) × gap × quality × minutes × intensity × pro.
export function growth(p: Player, age: number, quality: number, minutes: number, intensity: number): number {
  const gap = Math.min(1, Math.max(0, (p.potential - p.rating) / 6));
  return BASE(age) * gap * quality * minutes * intensity * proOf(p) * DEV_K;
}
export const minutesFactor = (p: Player) => 0.6 + 0.4 * Math.min(1, (p.m5 ?? 0) / 300);
const qualityOf = (fac: number, coachQ: number) => (1 + 0.1 * (fac - 1)) * (1 + coachQ / 400);

// What training this club can offer, by club id (the user's from his facilities and staff).
function qualities(w: World, c: Career): Map<string, number> {
  const m = new Map<string, number>();
  for (const club of w.clubs) m.set(club.id, qualityOf(aiFac(club.reputation), club.reputation * 0.7));
  m.set(c.clubId, qualityOf(c.ops.facilities.training, staffQ(c.ops, 'assistant')));
  return m;
}

function applyProgress(q: Player, prog: number, age: number, focus: number | undefined, tracked: boolean, x: Ctx): boolean {
  let changed = false;
  while (prog >= 100 && q.rating < 99) {
    q.rating += 1; prog -= 100; changed = true;
    q.attrs = shiftAttrs(q.attrs, 1).map((a, i) => (focus === i ? Math.min(99, a + 1) : a));
  }
  while (prog <= -100 && q.rating > 35) {
    q.rating -= 1; prog += 100; changed = true;
    q.attrs = shiftAttrs(q.attrs, -1);
  }
  q.prog = Math.round(prog * 10) / 10;
  if (changed) {
    q.potential = Math.max(q.potential, q.rating);
    q.marketValue = valueOf(q.rating, age, q.potential);
    if (tracked || !q.rh) q.rh = pushHist(q, x.season, x.round, q.rating);
  }
  return changed;
}

export function developDay(w: World, c: Career): { world: World; career: Career } {
  const season = c.season;
  const round = Math.max(0, c.round - 1); // the matchday just played (playRound already moved the clock on)
  const r = rngFor(c.seed, 'develop', season, round);
  const ops = c.ops;
  const user = c.clubId;
  // The week's effective intensity: Heavy is dropped in a congested week (two matches in the step).
  const heavyDropped = ops.training.load === 2 && cupOn(c, user, round);
  const inten = heavyDropped ? 1 : ops.training.load;
  const plans = new Set([...Object.keys(ops.training.focus ?? {}), ...Object.keys(ops.training.pos ?? {})]);
  const young = c.coach.courses.includes('fellowship') ? 1.15 : 1;
  const focusDev = c.prep === 'development' ? FOCUS_DEV : 1;
  const fitQ = staffQ(ops, 'fitness');
  const qual = qualities(w, c);
  const tracked = new Set<string>([...(c.grads ?? []), ...(c.loans ?? []).filter((l) => l.from === user).map((l) => l.playerId)]);
  const x: Ctx = { season, round: round + 1, qual, user, userQ: qual.get(user)!, ac: 0, acUser: 0, over: new Set() };
  const rep: TrainReport = { round, up: [], near: [], knocks: [], high: [], heavyDropped: heavyDropped || undefined, academyUp: [] };
  const posProg = { ...(ops.training.posProg ?? {}) };
  const posPlan = { ...(ops.training.pos ?? {}) };
  let learned: Player[] = [];
  const reinjured: Player[] = [];
  const players = w.players.map((p) => {
    const q: Player = { ...p };
    const age = season - p.birthYear;
    const mine = p.clubId === user;
    const lmd = p.lmd ?? 0;
    q.lmd = undefined;
    // Load eases between matchdays; the user's intensity and extra work move it.
    const keep = mine ? LOAD_KEEP[inten] : LOAD_KEEP[1];
    const extra = mine ? LOAD_EXTRA[inten] + (plans.has(p.id) ? PLAN_LOAD : 0) : 0;
    const load = clamp(Math.round((p.load ?? 0) * keep + extra), 0, 100);
    q.load = load || undefined;
    const m5 = Math.round((p.m5 ?? 0) * 0.8);
    q.m5 = m5 || undefined;
    const run = lmd >= 80 ? (p.run ?? 0) + 1 : 0;
    q.run = run || undefined;
    if (!q.injured && q.inj0) q.inj0 = undefined;
    // After a rush-back: the stated chance he breaks down again in each of his next matches.
    if (p.rr && lmd > 0) {
      const [pct, left, len] = p.rr;
      if (!q.injured && r() < (pct / 100) * Math.min(1, lmd / 90)) { q.injured = Math.max(2, len ?? 3); q.inj0 = q.injured; q.rr = undefined; reinjured.push(q); }
      else if (left <= 1) q.rr = undefined; else q.rr = [pct, left - 1, len];
    }
    if (p.clubId === FREE_AGENT) { if (!q.rh) q.rh = [enc(season, round, p.rating)]; return q; }
    // Growth (or decline): the same function for everyone.
    const quality = qual.get(p.clubId) ?? 1;
    let g = growth(p, age, quality, minutesFactor(p), mine ? INTENSITY[inten] : 1);
    if (mine) {
      g *= focusDev * (age <= 21 ? young : 1);
      if (ops.training.focus?.[p.id] !== undefined) g *= 1.1;
      if (posPlan[p.id]) g *= 0.9;
    }
    if (p.injured) g *= 0.3;
    const prog = (p.prog ?? 0) + g - DECLINE(age);
    if (!q.rh) q.rh = [enc(season, round, p.rating)];
    const before = q.rating;
    applyProgress(q, prog, age, mine ? ops.training.focus?.[p.id] : undefined, mine || tracked.has(p.id), x);
    if (mine) {
      if (q.rating > before) rep.up.push(p.id);
      else if ((q.prog ?? 0) >= 80 && q.rating < q.potential) rep.near.push(p.id);
      if ((q.load ?? 0) > 75) rep.high.push(p.id);
      // Heavy weeks can bite: the more loaded the player, the likelier a knock (a good fitness coach spots it).
      if (inten === 2 && !q.injured && (q.load ?? 0) > 60 && r() < 0.015 * riskMult(q.load) * (1 - fitQ / 200)) {
        q.injured = int(r, 1, 2); q.inj0 = q.injured; rep.knocks.push(p.id);
      }
      // A new position, learned in about eleven matchdays of extra work.
      const want = posPlan[p.id];
      if (want && !q.injured) {
        posProg[p.id] = (posProg[p.id] ?? 0) + POS_WORK * (1 + staffQ(ops, 'assistant') / 400);
        if (posProg[p.id] >= 100) { q.alt = want; delete posPlan[p.id]; delete posProg[p.id]; learned = [...learned, q]; }
      }
    }
    return q;
  });
  // The academies: same function, academy minutes, the academy's own facility and Head of Youth.
  const acCount = new Map<string, number>();
  for (const k of w.academy ?? []) acCount.set(k.clubId, (acCount.get(k.clubId) ?? 0) + 1);
  const acQ = new Map<string, number>();
  for (const club of w.clubs) {
    const mineAc = club.id === user;
    const fac = mineAc ? ops.facilities.academy : aiFac(club.reputation);
    const over = (acCount.get(club.id) ?? 0) > (mineAc ? academyCap(ops.facilities.academy) : academyCap(aiFac(club.reputation))) ? OVERFULL : 1;
    acQ.set(club.id, qualityOf(fac, mineAc ? staffQ(ops, 'scout') : club.reputation * 0.7) * over);
  }
  const academy = (w.academy ?? []).map((k) => {
    const q: Player = { ...k };
    const age = season - k.birthYear;
    const mineAc = k.clubId === user;
    const g = growth(k, age, acQ.get(k.clubId) ?? 1, ACADEMY_MINUTES, 1) * (k.injured ? 0.3 : 1) * (mineAc && age <= 21 ? young : 1);
    if (k.injured) q.injured = Math.max(0, k.injured - 1);
    const before = q.rating;
    applyProgress(q, (k.prog ?? 0) + g, age, undefined, mineAc, x);
    if (mineAc && q.rating > before) rep.academyUp.push(k.id);
    return q;
  });
  let career: Career = { ...c, trainRep: rep, ops: { ...ops, report: { improved: rep.up, hurt: rep.knocks }, training: { ...ops.training, pos: posPlan, posProg } } };
  for (const p of learned) career = addMsg(career, 'club', 'y_learned', { player: p.id, pn: p.name, s: p.alt });
  for (const p of reinjured) if (p.clubId === user) career = addMsg(career, 'club', 'y_reinjured', { player: p.id, pn: p.name, n: p.injured });
  return { world: { ...w, players, academy }, career };
}

// ---------- the calendar: preview, Intake Day, loan reports, breakthroughs ----------

export function pathwayDay(before: Career, w0: World, c0: Career): { world: World; career: Career } {
  let w = w0, c = c0;
  if (!w.academy) w = seedAcademies(w, c);
  // Ten matchdays before Intake Day: the Head of Youth has seen the group.
  if (c.round === previewDay(c) && c.intake?.season !== c.season) {
    const kids = makeIntake(w, c, c.clubId);
    const intake: Intake = { season: c.season, club: c.clubId, day: intakeDay(c), kids };
    const s = standout(kids);
    c = { ...c, intake };
    c = addMsg(c, 'scout', 'y_preview', { pn: s.name, s: s.position, n: tierOf(s.potential) });
    c = addNews(c, 'youth', 'y_preview', { club: c.clubId, s: s.position, n: tierOf(s.potential) });
  }
  // Intake Day: every club's kids arrive. Yours are the ones previewed (a job move keeps the club's own group).
  if (c.round === intakeDay(c) && !(c.intake?.season === c.season && c.intake.arrived)) {
    const lid = w.clubs.find((x) => x.id === c.clubId)!.leagueId;
    let academy = [...(w.academy ?? [])];
    let rivalBest: Player | null = null;
    for (const club of w.clubs) {
      const kids = club.id === c.clubId && c.intake?.season === c.season && c.intake.club === club.id ? c.intake.kids : makeIntake(w, c, club.id);
      academy.push(...kids.map((k) => ({ ...k, clubId: club.id, rh: [enc(c.season, c.round, k.rating)] })));
      if (club.id !== c.clubId && club.leagueId === lid) {
        const s = standout(kids);
        if (!rivalBest || s.potential > rivalBest.potential) rivalBest = s;
      }
      // AI clubs keep their academy at capacity: the least promising older kids are let go.
      if (club.id !== c.clubId) academy = trimAcademy(academy, club.id, capOf(w, c, club.id), c.season);
    }
    const released = new Set(academy.map((p) => p.id));
    const letGo = (w.academy ?? []).filter((p) => !released.has(p.id) && p.clubId !== c.clubId);
    w = { ...w, academy, players: [...w.players, ...letGo.map((p) => toFreeAgent(p, c.season))] };
    const mineKids = c.intake?.season === c.season && c.intake.club === c.clubId ? c.intake.kids : academy.filter((p) => p.clubId === c.clubId && p.id.startsWith(`ya${c.season}-`));
    c = { ...c, intake: { season: c.season, club: c.clubId, day: c.round, kids: mineKids, arrived: true } };
    const s = mineKids.length ? standout(mineKids) : null;
    c = addNews(c, 'youth', 'y_intake', { club: c.clubId, n: mineKids.length, pn: s?.name, s: s?.position });
    if (rivalBest && tierOf(rivalBest.potential) >= 2) c = addNews(c, 'youth', 'y_rivalGem', { club: rivalBest.clubId, pn: rivalBest.name, s: rivalBest.position, n: tierOf(rivalBest.potential) });
  }
  // Monthly loan reports (every fourth matchday): minutes, form, growth.
  if (c.round > 0 && c.round % 4 === 0) {
    for (const l of (c.loans ?? []).filter((x) => x.from === c.clubId && x.season === c.season)) {
      const p = playerOf(w, l.playerId);
      if (!p) continue;
      const grown = p.rating - startRating(p, c.season);
      c = addMsg(c, 'scout', 'y_loanReport', { player: p.id, pn: p.name, n: p.ms ?? 0, s: `${grown}`, club: l.to });
    }
  }
  // Breakthroughs: a homegrown player of any club in your league reaches ten league games this season.
  const lid = w.clubs.find((x) => x.id === c.clubId)?.leagueId;
  for (const [id, st] of Object.entries(c.stats)) {
    if (st[0] !== 10 || (before.stats[id]?.[0] ?? 0) >= 10) continue;
    const p = playerOf(w, id);
    if (!p || !p.hg || p.hg !== p.clubId || c.season - p.birthYear > 21) continue;
    if (w.clubs.find((x) => x.id === p.clubId)?.leagueId !== lid) continue;
    c = addNews(c, 'youth', 'y_breakthrough', { player: p.id, pn: p.name, club: p.clubId, n: c.season - p.birthYear });
  }
  return { world: w, career: c };
}

// Rating at the start of this season (or when history begins), from the real samples.
export function startRating(p: Player, season: number): number {
  const h = (p.rh ?? []).map(dec);
  const before = h.filter((s) => s.season < season).pop();
  const first = h.find((s) => s.season === season);
  return before?.rating ?? first?.rating ?? p.rating;
}

function trimAcademy(all: Player[], clubId: string, cap: number, season: number): Player[] {
  const mine = all.filter((p) => p.clubId === clubId);
  if (mine.length <= cap) return all;
  const drop = new Set([...mine].sort((a, b) => (a.potential - (season - a.birthYear) * 1.5) - (b.potential - (season - b.birthYear) * 1.5)).slice(0, mine.length - cap).map((p) => p.id));
  return all.filter((p) => !drop.has(p.id));
}

function toFreeAgent(p: Player, season: number): Player {
  return { ...p, clubId: FREE_AGENT, shirtNumber: 0, contractUntil: season, listed: undefined };
}

// ---------- season end ----------

// No yearly rating jump any more (players grew match by match); potential moves with a season's football for the
// young (a regular's ceiling can rise, a kid who never plays loses a little), and it settles at 28.
export function seasonDev(p: Player, season: number, r: Rng): { potential: number } {
  const age = season + 1 - p.birthYear;
  if (age >= 28) return { potential: p.rating };
  let potential = p.potential;
  if (age <= 22) {
    const ms = p.ms ?? 0;
    if (ms >= 1800) potential += r() < 0.15 ? 2 : r() < 0.6 ? 1 : 0;
    else if (ms < 300 && p.clubId !== FREE_AGENT) potential -= r() < 0.5 ? 1 : 0;
  }
  return { potential: clamp(Math.max(potential, p.rating), p.rating, 95) };
}

// Academy loans end first: the kid goes back to the academy, not the first team.
export function returnAcademyLoans(w: World, c: Career): { world: World; career: Career } {
  const live = (c.loans ?? []).filter((l) => l.ya && l.season === c.season);
  if (!live.length) return { world: w, career: c };
  const ids = new Set(live.map((l) => l.playerId));
  const back = w.players.filter((p) => ids.has(p.id)).map((p) => { const l = live.find((x) => x.playerId === p.id)!; return { ...p, clubId: l.from, shirtNumber: 0, listed: undefined }; });
  return {
    world: { ...w, players: w.players.filter((p) => !ids.has(p.id)), academy: [...(w.academy ?? []), ...back] },
    career: { ...c, loans: (c.loans ?? []).filter((l) => !ids.has(l.playerId)) },
  };
}

// The academies at season end: AI clubs promote the ready ones (and fill thin squads), kids who never made it by 20 are
// released into the free-agent pool. Your academy is yours to run: nothing moves without you (or your Head of Youth).
export function academySeasonEnd(w: World, c: Career, players: Player[], clubs: Club[], season: number, minSquad: number): { players: Player[]; academy: Player[]; mine: Player[] } {
  const r = rngFor(c.seed, 'academy-end', season);
  const byClub = new Map<string, Player[]>();
  for (const p of players) (byClub.get(p.clubId) ?? byClub.set(p.clubId, []).get(p.clubId)!).push(p);
  const out: Player[] = [];
  const keep: Player[] = [];
  const mine: Player[] = [];
  const academy = w.academy ?? [];
  const byAc = new Map<string, Player[]>();
  for (const k of academy) (byAc.get(k.clubId) ?? byAc.set(k.clubId, []).get(k.clubId)!).push(k);
  for (const club of clubs) {
    const kids = (byAc.get(club.id) ?? []).map((k) => ({ ...k, rh: pushHist(k, season - 1, 99, k.rating) }));
    const squad = byClub.get(club.id) ?? [];
    const sorted = squad.map((p) => p.rating).sort((a, b) => b - a);
    const bar = sorted[Math.min(17, sorted.length - 1)] ?? 0;
    const lg = club.leagueId;
    const used = new Set(squad.map((p) => p.shirtNumber));
    const shirt = () => { let n = 2; while (used.has(n)) n++; used.add(n); return n; };
    const up = (k: Player) => {
      const value = valueOf(k.rating, season - k.birthYear, k.potential);
      const p: Player = { ...k, shirtNumber: shirt(), marketValue: value, wage: Math.max(k.wage, wageOf(value, lg)), contractUntil: season + 3 };
      out.push(p); squad.push(p);
      if (club.id === c.clubId) mine.push(p);
    };
    const ready = [...kids].sort((a, b) => b.rating - a.rating);
    const rest: Player[] = [];
    for (const k of ready) {
      const age = season - k.birthYear;
      const thin = squad.length < minSquad && age >= 17;
      const good = club.id !== c.clubId && age >= 17 && k.rating >= bar - 1 && squad.length < 25;
      if (thin || good) up(k); else rest.push(k);
    }
    for (const k of rest) {
      const age = season - k.birthYear;
      if (club.id !== c.clubId && age >= 20) out.push(toFreeAgent(k, season));
      else keep.push({ ...k, fitness: 100, injured: 0 });
    }
  }
  void r;
  return { players: [...players, ...out], academy: keep, mine };
}

// ---------- commands (validated here, dispatched from commands.ts) ----------

export type YouthNo = 'gone' | 'squadFull' | 'window' | 'club' | 'young' | 'congested' | 'plans' | 'notYet' | 'budget' | 'retired' | 'wait' | 'limit';

// F05 (rework): what promotion commits the club to, shown before the manager says yes (the sheet reads this, the command
// applies it): his first-team contract and wage, the squad place, and the prospect promise the dressing room then holds.
export function promotionTerms(w: World, c: Career, kid: Player) {
  const lid = w.clubs.find((x) => x.id === c.clubId)!.leagueId;
  const value = valueOf(kid.rating, c.season - kid.birthYear, kid.potential);
  return { value, wage: Math.max(kid.wage, roundFee(wageOf(value, lid) / 2)), until: Math.max(kid.contractUntil, c.season + 3), squad: squadOf(w, c.clubId).length + 1, max: SQUAD_MAX };
}

export function promoteKid(w: World, c: Career, id: string): { world: World; career: Career } | YouthNo {
  const kid = inAcademy(w, id);
  if (!kid || kid.clubId !== c.clubId) return 'gone';
  if (squadOf(w, c.clubId).length >= SQUAD_MAX) return 'squadFull';
  if (c.season - kid.birthYear < 16) return 'young';
  const t = promotionTerms(w, c, kid);
  const p: Player = { ...kid, shirtNumber: freeShirt(w, c.clubId, kid.position), marketValue: t.value, wage: t.wage, contractUntil: t.until };
  const world = { ...w, players: [...w.players, p], academy: (w.academy ?? []).filter((k) => k.id !== id) };
  let career: Career = { ...c, grads: [...new Set([...(c.grads ?? []), kid.id])] };
  career = addNews(career, 'youth', 'promoted', { player: kid.id, pn: kid.name, club: c.clubId });
  return { world, career };
}

export function releaseKid(w: World, c: Career, id: string): { world: World; career: Career } | YouthNo {
  const kid = inAcademy(w, id);
  if (!kid || kid.clubId !== c.clubId) return 'gone';
  return { world: { ...w, academy: (w.academy ?? []).filter((k) => k.id !== id), players: [...w.players, toFreeAgent(kid, c.season)] }, career: c };
}

// Where an academy kid could go on loan, with the role he'd have there (his rank among that club's players at his
// position): a club where he starts gives real minutes, and real minutes are what grow him.
export interface LoanSpot { clubId: string; role: 0 | 1 | 2; strength: number }
export function academyLoanSpots(w: World, c: Career, kid: Player, n = 4): LoanSpot[] {
  const country = countryOfClub(w, c.clubId);
  const r = rngFor(c.seed, 'loanspots', kid.id, c.season, c.round);
  const spots: LoanSpot[] = [];
  for (const club of w.clubs) {
    if (club.id === c.clubId) continue;
    const s = strengthOf(w, club.id);
    if (s > kid.rating + 6 || s < kid.rating - 12) continue;
    const same = squadOf(w, club.id).filter((p) => p.position === kid.position || (p.position !== 'GK') === (kid.position !== 'GK') && slotValue(p, kid.position) >= slotValue(kid, kid.position) - 2);
    const better = same.filter((p) => slotValue(p, kid.position) > slotValue(kid, kid.position)).length;
    const slots = kid.position === 'GK' ? 1 : kid.position === 'CB' || kid.position === 'CM' || kid.position === 'ST' ? 2 : 1;
    const role: 0 | 1 | 2 = better < slots ? 0 : better < slots * 2 ? 1 : 2;
    spots.push({ clubId: club.id, role, strength: s });
    void country;
  }
  const home = (id: string) => (countryOfClub(w, id) === country ? 0 : 1);
  return spots.sort((a, b) => home(a.clubId) - home(b.clubId) || a.role - b.role || b.strength - a.strength || r() - 0.5).slice(0, n);
}

export const ACADEMY_LOANS_MAX = 6;
export function loanKid(w: World, c: Career, id: string, to: string): { world: World; career: Career } | YouthNo {
  const kid = inAcademy(w, id);
  if (!kid || kid.clubId !== c.clubId) return 'gone';
  if (!windowOf(c)) return 'window';
  if (c.season - kid.birthYear < 17) return 'young';
  if (to === c.clubId || !w.clubs.some((x) => x.id === to)) return 'club';
  if ((c.loans ?? []).filter((l) => l.ya && l.season === c.season).length >= ACADEMY_LOANS_MAX) return 'limit';
  const p: Player = { ...kid, clubId: to, shirtNumber: freeShirt(w, to, kid.position) };
  const world = { ...w, academy: (w.academy ?? []).filter((k) => k.id !== id), players: [...w.players, p] };
  const career: Career = { ...c, loans: [...(c.loans ?? []), { playerId: id, pn: kid.name, from: c.clubId, to, fee: 0, share: 1, season: c.season, ya: true, at: c.round }], grads: [...new Set([...(c.grads ?? []), id])] };
  return { world, career: addNews(career, 'youth', 'y_loaned', { player: id, pn: kid.name, club: to }) };
}

// Bring a loanee home in an open window: an academy loanee goes back to the academy, a squad player to the squad.
export function recallLoan(w: World, c: Career, playerId: string): { world: World; career: Career } | YouthNo {
  const l = (c.loans ?? []).find((x) => x.playerId === playerId && x.from === c.clubId && x.season === c.season);
  const p = playerOf(w, playerId);
  if (!l || !p || p.clubId !== l.to) return 'gone';
  if (!windowOf(c)) return 'window';
  const loans = (c.loans ?? []).filter((x) => x !== l);
  if (l.ya) return { world: { ...w, players: w.players.filter((x) => x.id !== playerId), academy: [...(w.academy ?? []), { ...p, clubId: c.clubId, shirtNumber: 0 }] }, career: { ...c, loans } };
  if (squadOf(w, c.clubId).length >= SQUAD_MAX) return 'squadFull';
  return { world: { ...w, players: w.players.map((x) => (x.id === playerId ? { ...x, clubId: c.clubId, shirtNumber: freeShirt(w, c.clubId, x.position) } : x)) }, career: { ...c, loans } };
}

// A word for a prospect or a loanee: "you're in our plans". Once every four matchdays per player.
export function wordFor(w: World, c: Career, playerId: string): { world: World; career: Career } | YouthNo {
  const p = anyPlayer(w, playerId);
  const ours = p && (p.clubId === c.clubId || (c.loans ?? []).some((l) => l.playerId === playerId && l.from === c.clubId && l.season === c.season));
  if (!p || !ours) return 'gone';
  const last = (c.events ?? []).filter((e) => e.name === 'pathway.word' && e.refs?.p?.includes(playerId)).pop();
  if (last && last.t[0] === c.season && c.round - last.t[1] < 4) return 'wait';
  const lift = (x: Player) => (x.id === playerId ? { ...x, morale: Math.min(100, x.morale + 5) } : x);
  return { world: { ...w, players: w.players.map(lift), academy: (w.academy ?? []).map(lift) }, career: c };
}

export type Treat = 'rehab' | 'specialist' | 'rush';
export const rushRisk = (c: Career) => clamp(Math.round(35 - staffQ(c.ops, 'doctor') / 5 - (c.ops.facilities.medical - 1) * 3), 8, 35);
export const canRush = (p: Player) => p.injured > 0 && p.injured <= Math.floor((p.inj0 ?? p.injured) * RUSH_SHARE + 0.5) && p.injured >= 1 && (p.inj0 ?? 0) >= 2;
export const rushGain = (p: Player) => Math.max(1, Math.ceil(p.injured / 2));
// The return window the doctor gives, fogged by his quality: ±0 for a top doctor, ±2 for none.
export const returnWindow = (c: Career, p: Player): [number, number] => {
  const e = Math.round((100 - staffQ(c.ops, 'doctor')) / 45);
  return [Math.max(1, p.injured - e), p.injured + e];
};

export function rushBack(c: Career, p: Player): { player: Player } | YouthNo {
  if (!canRush(p)) return 'notYet';
  const len = p.inj0 ?? p.injured * 2;
  return { player: { ...p, injured: Math.max(0, p.injured - rushGain(p)), rr: [rushRisk(c), RUSH_MATCHES, Math.max(2, Math.round(len * 0.8))] } };
}

// Individual plans: at most five players, each an attribute or a new position (not both).
export function setPlan(c: Career, playerId: string, plan: { attr?: number | null; pos?: Position | null }): Career | YouthNo {
  const t = c.ops.training;
  const focus = { ...(t.focus ?? {}) };
  const pos = { ...(t.pos ?? {}) };
  const posProg = { ...(t.posProg ?? {}) };
  delete focus[playerId]; delete pos[playerId];
  if (plan.pos === null || plan.pos) delete posProg[playerId];
  if (plan.attr !== undefined && plan.attr !== null) focus[playerId] = plan.attr;
  if (plan.pos) pos[playerId] = plan.pos;
  const n = new Set([...Object.keys(focus), ...Object.keys(pos)]).size;
  if (n > PLANS_MAX) return 'plans';
  return { ...c, ops: { ...c.ops, training: { ...t, focus, pos, posProg } } };
}
export const plansOf = (c: Career) => [...new Set([...Object.keys(c.ops.training.focus ?? {}), ...Object.keys(c.ops.training.pos ?? {})])];

// ---------- helpers for screens and decisions ----------

export const risky = (w: World, c: Career) => squadOf(w, c.clubId).filter((p) => available(p) && riskBand(p) > 0).sort((a, b) => (b.load ?? 0) - (a.load ?? 0));
export const readyBar = (w: World, c: Career) => { const s = squadOf(w, c.clubId).map((p) => p.rating).sort((a, b) => b - a); return s[Math.min(17, s.length - 1)] ?? 60; };
export const loaneesOf = (w: World, c: Career) => (c.loans ?? []).filter((l) => l.from === c.clubId && l.season === c.season).map((l) => ({ l, p: playerOf(w, l.playerId) })).filter((x): x is { l: typeof x.l; p: Player } => !!x.p);
// Graduates: homegrown players of this club in the first team (promoted by you or from before).
export const gradsOf = (w: World, c: Career) => squadOf(w, c.clubId).filter((p) => p.hg === c.clubId || (c.grads ?? []).includes(p.id));

export { dropFromXI, loanOf, xiFor, nextUserMatch };
export type { LocalizedName };

// The Head of Youth's read on a young player's ceiling: a band, never exact before 24 (V2_DESIGN §3.4), narrower with a
// better Head of Youth, always containing the truth.
export function potBand(c: Career, p: Player): [number, number] {
  if (c.season - p.birthYear >= 24) return [p.potential, p.potential];
  const width = 2 + Math.round((100 - staffQ(c.ops, 'scout')) / 20);
  const off = rngFor(c.seed, 'potband', p.id)() * (width + 1) | 0;
  const lo = Math.max(p.rating, p.potential - off);
  return [lo, Math.min(99, lo + width)];
}
export const roundsOf = (c: Career) => roundsIn(c);

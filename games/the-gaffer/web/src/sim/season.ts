// Fixtures, match simulation, league tables and the end of a season.
// Every league plays the same matchday together; leagues with fewer clubs finish earlier.
import { FREE_AGENT, type Career, type Club, type Deal, type Fixture, type LocalizedName, type Offer, type Player, type PlayerStats, type Position, type SeasonRecord } from '../model/types';
import { bell, clamp, int, makeRng, pick, type Rng } from './rng';
import { predict, sideLevel, simulate, startMatch, winnerOf, type LiveMatch } from './match';
import { cupRun, cupWinner, groupTable, playCupDay, tiesOn, userCupMatch, userTie, makeCups } from './cups';
import { addNews, newsRound, rumoursRound } from './news';
import { addMsg, afterMatch, coachSeasonEnd, newBoard, newCoach, sackCheck, salaryOf } from './coach';
import { available } from './tactics';
import { aiEconomyWeek, economyWeek, newOps, sponsorBonus } from './economy';
import { applyElo } from './rankings';
import { FOCUS_TACTICAL, earnDev, resetExams } from './training';
import { academySeasonEnd, addMinutes, developDay, enc, pathwayDay, returnAcademyLoans, seasonDev } from './youth';
import { makeAttrs, makeFreeAgents, objectiveOf, playerOf, shiftAttrs, squadOf, squadStrength, valueOf, wageOf, type World } from './world';
import { playerName } from '../data/names';
import { toRecord, type MatchRecord } from './record';
import { recordMatch, recordSeason } from './records';
import { returnLoans, loanOf } from './loans';
import { isDeadlineDay, windowOf } from './windows';
import { staffWeek } from './staff';
import { SQUAD_SELL_MIN } from './transfers';
import { roomPull } from './room';
import { facilityNorm, staffEdge } from './norms';
import { userObjective } from './vision';
import { awardLeagues, awardWinners, leagueAwards, type AwardSet } from './awards';
import { tallySeason } from './legends';
import { aiCheckpoint, aiSeasonEnd, type Change } from './managers';

// V2.8: AI manager changes in the papers (sacked, then who takes over).
function managerNews(c: Career, changes: Change[]): Career {
  let out = c;
  for (const ch of changes) {
    out = addNews(out, 'managers', 'sacked', { club: ch.clubId, pn: ch.out, s: ch.out.en });
    out = addNews(out, 'managers', 'appointed', { club: ch.clubId, pn: ch.in, s: ch.in.en });
  }
  return out;
}
import { applyCards, serveCupBans } from './discipline';

// ---------- fixtures ----------

// Double round robin by the circle method: n-1 rounds, then the same rounds with home and away swapped.
export function makeFixtures(clubIds: string[], r: Rng): Fixture[][] {
  const ids = [...clubIds].sort(() => r() - 0.5);
  if (ids.length % 2) ids.push('BYE');
  const n = ids.length;
  const first: Fixture[][] = [];
  // Home or away: whoever was away last time plays at home, so clubs alternate (ties go to whoever has hosted less).
  const lastHome = new Map<string, boolean>();
  const homes = new Map<string, number>();
  for (let round = 0; round < n - 1; round++) {
    const games: Fixture[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i], b = ids[n - 1 - i];
      if (a === 'BYE' || b === 'BYE') continue;
      const la = lastHome.get(a), lb = lastHome.get(b);
      let aHome: boolean;
      if (la !== lb && la !== undefined && lb !== undefined) aHome = la === false;
      else if (la === undefined && lb !== undefined) aHome = lb;
      else if (lb === undefined && la !== undefined) aHome = !la;
      else aHome = (homes.get(a) ?? 0) !== (homes.get(b) ?? 0) ? (homes.get(a) ?? 0) < (homes.get(b) ?? 0) : r() < 0.5;
      const [h, aw] = aHome ? [a, b] : [b, a];
      lastHome.set(h, true); lastHome.set(aw, false);
      homes.set(h, (homes.get(h) ?? 0) + 1);
      games.push([h, aw, -1, -1]);
    }
    first.push(games);
    ids.splice(1, 0, ids.pop()!);
  }
  const second = first.map((g) => g.map(([h, a]): Fixture => [a, h, -1, -1]));
  return [...first, ...second];
}

export function seasonFixtures(w: World, seed: number, season: number): Record<string, Fixture[][]> {
  const r = makeRng(seed ^ (season * 7919));
  const out: Record<string, Fixture[][]> = {};
  for (const l of w.leagues) out[l.id] = makeFixtures(w.clubs.filter((c) => c.leagueId === l.id).map((c) => c.id), r);
  return out;
}

export const roundsIn = (c: Career) => Math.max(...Object.values(c.fixtures).map((f) => f.length));
export const seasonOver = (c: Career) => c.round >= roundsIn(c);
export const leagueOf = (w: World, clubId: string) => w.clubs.find((x) => x.id === clubId)!.leagueId;

// The user's next match, or null when their league has finished.
export function nextFixture(w: World, c: Career): { round: number; fixture: Fixture } | null {
  const rounds = c.fixtures[leagueOf(w, c.clubId)];
  for (let i = c.round; i < rounds.length; i++) {
    const f = rounds[i].find((x) => x[0] === c.clubId || x[1] === c.clubId);
    if (f) return { round: i, fixture: f };
  }
  return null;
}

// ---------- a matchday ----------

export { available, formOf } from './tactics';
export type { LiveMatch, MatchEvent } from './match';

const emptyStats = (): PlayerStats => [0, 0, 0, 0, 0];
export const matchKey = (c: Career, leagueId: string, i: number) => `${c.seed}:${c.season}:${c.round}:${leagueId}:${i}`;

// The user's match for this matchday, ready to kick off (null when the user's league has finished).
export function userMatch(w: World, c: Career): LiveMatch | null {
  const lid = leagueOf(w, c.clubId);
  const rounds = c.fixtures[lid];
  if (c.round >= rounds.length) return null;
  const i = rounds[c.round].findIndex((f) => f[0] === c.clubId || f[1] === c.clubId);
  if (i < 0) return null;
  const f = rounds[c.round][i];
  return startMatch(w, c, f[0], f[1], matchKey(c, lid, i), c.round);
}

// Between matchdays morale settles a share of the way back to its normal level (at least one point), the same rule
// for every squad. A fixed ±1 a matchday could not keep up with ±6 a result, so a side losing more than a third of its
// games sank to the floor and lost ~2.5 on every attribute (audit GF-003). With a 20% pull a poor side settles in the
// mid-40s and a dominant one in the high 70s.
export const MORALE_SETTLE = 0.2;
export function settleMorale(morale: number, target: number): number {
  const gap = target - morale;
  if (!gap) return morale;
  return morale + Math.sign(gap) * Math.max(1, Math.round(Math.abs(gap) * MORALE_SETTLE));
}

// The leaders' pull for every club but the user's: 0.25 × (mean morale of its three best players − 60), rounded.
export function aiRoomPulls(w: World, userClub: string): Map<string, number> {
  const best = new Map<string, Player[]>();
  for (const p of w.players) {
    if (p.clubId === userClub || p.clubId === FREE_AGENT) continue;
    const top = best.get(p.clubId) ?? best.set(p.clubId, []).get(p.clubId)!;
    top.push(p); top.sort((a, b) => b.rating - a.rating); if (top.length > 3) top.pop();
  }
  const out = new Map<string, number>();
  for (const [id, top] of best) out.set(id, Math.round(0.25 * (top.reduce((s, p) => s + p.morale, 0) / top.length - 60)));
  return out;
}

// Applies one finished match to the players: condition, morale, cards, injuries, and (league games only) season stats.
// `care`: the user's club, where the doctor and medical centre shorten injuries.
type Rate = (id: string, v: number, motm: boolean) => void;
// Aftermath reducer (V2.2): reads only the MatchRecord.
function applyMatch(rec: MatchRecord, get: (id: string) => Player, byClub: Map<string, Player[]>, stat: ((id: string) => PlayerStats) | null, r: Rng, calm: string | null,
  care: { clubId: string; cut: number } | null = null, rate: Rate | null = null) {
  if (rate) for (const [id, v] of Object.entries(rec.ratings)) rate(id, v, id === rec.motm);
  for (const id of rec.played) { const p = get(id); if (stat) stat(id)[0]++; p.fitness = Math.round(rec.condition[id] ?? p.fitness); addMinutes(p, rec.minutes[id] ?? 0); }
  const on = new Set(rec.played);
  rec.clubs.forEach((clubId, k) => {
    const diff = rec.goals[k] - rec.goals[1 - k];
    // The psychology course takes the sting out of defeats for the user's squad.
    const swing = diff > 0 ? 6 : diff < 0 ? (clubId === calm ? -4 : -6) : 0;
    for (const p of byClub.get(clubId) ?? []) p.morale = clamp(p.morale + (on.has(p.id) ? swing : swing / 2 - 1), 5, 100);
  });
  // gf-ref: suspensions per competition, from its own rules (sim/discipline.ts, sim/competitions.ts).
  const comp = rec.comp ?? rec.cup;
  if (comp) {
    serveCupBans(comp, rec.clubs, byClub, on);
    applyCards(rec, get, comp, rec.round + 1);
  }
  void r;
  for (const e of rec.events) {
    const p = get(e.playerId);
    if (e.kind === 'goal' && stat) { stat(e.playerId)[1]++; if (e.assistId) stat(e.assistId)[2]++; }
    if (e.kind === 'yellow' && stat) stat(e.playerId)[3]++;
    if (e.kind === 'red' && stat) stat(e.playerId)[4]++;
    if (e.kind === 'injury') {
      const out = care && p.clubId === care.clubId ? Math.max(1, Math.round((e.out ?? 1) * (1 - care.cut))) : e.out ?? 1;
      p.injured = Math.max(p.injured, out);
      p.inj0 = Math.max(p.inj0 ?? 0, p.injured); // v2.6: the injury's full length (return window, rush-back rule)
    }
  }
}
const recordFor = (m: LiveMatch, get: (id: string) => Player, userClub: string | null) =>
  toRecord(m, get, userClub === m.sides[0].clubId ? 0 : userClub === m.sides[1].clubId ? 1 : -1);

// The doctor and medical centre shorten (or, below the club's norm, lengthen) the user's injuries against what a club
// this size normally has; AI clubs heal at that norm (norms.ts, audit GF-002).
const careOf = (w: World, c: Career) => {
  const club = w.clubs.find((x) => x.id === c.clubId);
  return c.ops && club ? { clubId: c.clubId, cut: clamp(staffEdge(c.ops, club, 'doctor') / 300 + (c.ops.facilities.medical - facilityNorm(club)) * 0.05, -0.3, 0.5) } : null;
};

const mutable = (w: World) => {
  const players = w.players.map((p) => ({ ...p }));
  const byId = new Map(players.map((p) => [p.id, p]));
  const byClub = new Map<string, Player[]>();
  for (const p of players) (byClub.get(p.clubId) ?? byClub.set(p.clubId, []).get(p.clubId)!).push(p);
  return { players, get: (id: string) => byId.get(id)!, byClub };
};

// Plays the next league matchday everywhere: results, player stats, fitness, morale, injuries and bans, and offers
// for the user's players. The user's match can be passed in finished (played live); otherwise it's simulated too.
// Returns a new world and career (the old ones are left untouched) and the user's match. Cups: see playDay.
export function playRound(w: World, c: Career, played?: LiveMatch): { world: World; career: Career; mine: LiveMatch | null } {
  const r = makeRng((c.seed ^ (c.season * 7919)) + c.round * 104729);
  const { players, get, byClub } = mutable(w);
  const sidelined = new Set(players.filter((p) => !available(p)).map((p) => p.id));
  const stats: Record<string, PlayerStats> = { ...c.stats };
  const touched = new Set<string>();
  const stat = (id: string) => {
    if (!touched.has(id)) { stats[id] = stats[id] ? [...stats[id]] as PlayerStats : emptyStats(); touched.add(id); }
    return stats[id];
  };
  const ratings = { ...(c.ratings ?? {}) };
  const rate: Rate = (id, v, motm) => { const o = ratings[id] ?? [0, 0, 0]; ratings[id] = [Math.round((o[0] + v) * 10) / 10, o[1] + 1, o[2] + (motm ? 1 : 0)]; };
  const next: Career = { ...c, fixtures: { ...c.fixtures }, stats, ratings, round: c.round + 1, live: null, cupDay: Math.max(c.cupDay ?? -1, c.round) };
  const calm = c.coach?.courses.includes('psychology') ? c.clubId : null;
  // The user's squad settles at a higher morale with the psychology course and a good psychologist.
  // v2.4: the leaders pull the room's settle point with their own mood (sim/room.ts roomPull).
  const moraleTarget = 60 + (calm ? 5 : 0) + Math.round(staffEdge(c.ops, w.clubs.find((x) => x.id === c.clubId), 'psychologist') / 20) + Math.round(roomPull(w, c));
  // Every other club's room is pulled by its leaders too, the same 0.25 × (their morale − 60) as roomPull, with its three
  // best players standing in for the leaders (AI clubs keep no dressing-room state). Without it only the user's squad had
  // this lift, and user-managed clubs ran hotter than the same club under the AI (audit GF-002).
  const aiPull = aiRoomPulls(w, c.clubId);
  let mine: LiveMatch | null = null;

  for (const [lid, rounds] of Object.entries(c.fixtures)) {
    if (c.round >= rounds.length) continue;
    const results = rounds[c.round].map((f, i): Fixture => {
      const isMine = f[0] === c.clubId || f[1] === c.clubId;
      let m: LiveMatch;
      if (isMine && played) m = played;
      else {
        m = startMatch(w, isMine ? c : null, f[0], f[1], matchKey(c, lid, i), c.round);
        if (isMine) { m.sides.forEach((s) => (s.autoSubs = true)); }
        simulate(m, get);
      }
      if (isMine) mine = m;
      applyMatch(recordFor(m, get, null), get, byClub, stat, r, calm, careOf(w, c), rate);
      return [f[0], f[1], m.goals[0], m.goals[1]];
    });
    next.fixtures[lid] = rounds.map((g, i) => (i === c.round ? results : g));
  }

  // Between matchdays: sidelined players count down, everyone recovers, morale drifts back to normal.
  for (const p of players) {
    if (sidelined.has(p.id)) {
      if (p.injured > 0) p.injured--;
      if (p.banned > 0) p.banned--;
    }
    p.fitness = Math.min(100, p.fitness + 12);
    p.morale = settleMorale(p.morale, p.clubId === c.clubId ? moraleTarget : 60 + (aiPull.get(p.clubId) ?? 0));
  }

  const world: World = { ...w, players, clubs: applyElo(w.clubs, Object.values(next.fixtures).map((rs) => rs[c.round] ?? []).flat()) };
  next.offers = makeOffers(world, next, r);
  return { world, career: next, mine };
}

// A brand-new career at a club: fixtures, cups, a coach profile, a board and a welcome message.
export function newCareer(w: World, seed: number, clubId: string, managerName: string, manager: { age: number; nationality: string; nationality2?: string }, season: number): Career {
  const club = w.clubs.find((x) => x.id === clubId)!;
  const fixtures = seasonFixtures(w, seed, season);
  const c: Career = {
    managerName, clubId, season, seed, round: 0, fixtures, stats: {}, history: [], offers: [], deals: [], manager,
    cups: makeCups(w, { seed, season, fixtures }, null), cupDay: -1, coach: newCoach(club), board: newBoard(null), inbox: [], jobs: [],
    ops: newOps(w, club, season), mastery: { balanced: 100 },
    // v2: the event log, delegation at its defaults (sim/delegation.ts), the world it was made with
    events: [], tickSeq: 0, pending: [], done: {}, matches: [], pulse: [], rested: [], prep: 'tactical',
    data: w.data ?? 'generated', names: w.names ?? (w.data === 'real2026' ? 'real' : 'fictional'),
  };
  return addMsg(c, 'club', 'welcome', { club: clubId });
}

// Every game played with a philosophy adds mastery; the others fade a little (never below 20).
function practise(c: Career): Career {
  const ph = c.tactics?.philosophy ?? 'balanced';
  const mastery: Career['mastery'] = { ...(c.mastery ?? {}) };
  for (const k of Object.keys(mastery) as (keyof typeof mastery)[]) if (k !== ph && k !== 'balanced') mastery[k] = Math.max(20, (mastery[k] ?? 30) - 0.5);
  mastery[ph] = Math.min(100, (mastery[ph] ?? 30) + 2 + (c.prep === 'tactical' ? FOCUS_TACTICAL : 0));
  return { ...c, mastery };
}

// The user's next match: a cup tie first if there is one today, then the league.
export const nextUserMatch = (w: World, c: Career): LiveMatch | null => userCupMatch(w, c) ?? userMatch(w, c);

// What the user's match meant for the coach, board and fans. The board judges the result against the odds at
// kick-off (`pre`: the world and career before the match), the same prediction the match screen showed.
function userAfter(pre: { world: World; career: Career }, w: World, c: Career, m: LiveMatch): { world: World; career: Career } {
  const k = m.sides[0].clubId === c.clubId ? 0 : 1;
  const get = (id: string) => playerOf(w, id)!;
  return afterMatch(w, c, {
    mine: m.goals[k], theirs: m.goals[1 - k], oppId: m.sides[1 - k].clubId, home: k === 0,
    myLevel: sideLevel(m, k as 0 | 1, get), oppLevel: sideLevel(m, (1 - k) as 0 | 1, get), cup: !!m.cup,
    expected: expectedPoints(pre.world, pre.career, m, k as 0 | 1),
  });
}

// Expected points for the user's side from the engine's own odds at kick-off: 3·P(win) + P(draw).
export function expectedPoints(w: World, c: Career, m: LiveMatch, k: 0 | 1): number {
  const get = (id: string) => playerOf(w, id)!;
  if (!m.sides.every((s) => [...s.onPitch, ...s.bench].every((id) => !id || get(id)))) return 1.4;
  const kickOff = startMatch(w, c, m.sides[0].clubId, m.sides[1].clubId, m.key, m.round);
  const p = predict(kickOff, get);
  const [win, draw] = k === 0 ? [p[0], p[1]] : [p[2], p[1]];
  return 3 * win + draw;
}

// One step of the calendar. On a cup day the cup ties go first; if the user is in one, that's all for this step
// (the league match comes next). Otherwise the league matchday is played too.
export function playDay(w: World, c: Career, played?: LiveMatch): { world: World; career: Career; mine: LiveMatch | null } {
  let world = w, career = c;
  const cupPre = { world: w, career: c };
  if ((c.cupDay ?? -1) < c.round && tiesOn(c, c.round).length) {
    const inCup = !!userTie(c);
    const cd = playCupDay(w, c, played?.cup ? played : undefined);
    const r = makeRng((c.seed ^ c.season) + c.round * 31);
    const { players, get, byClub } = mutable(w);
    const calm = c.coach?.courses.includes('psychology') ? c.clubId : null;
    const ratings = { ...(cd.career.ratings ?? {}) };
    const rate: Rate = (id, v, motm) => { const o = ratings[id] ?? [0, 0, 0]; ratings[id] = [Math.round((o[0] + v) * 10) / 10, o[1] + 1, o[2] + (motm ? 1 : 0)]; };
    for (const m of cd.matches) applyMatch(recordFor(m, get, null), get, byClub, null, r, calm, careOf(w, c), rate);
    const clubs = w.clubs.map((x) => (cd.prizes.has(x.id) ? { ...x, budget: x.budget + cd.prizes.get(x.id)! } : x));
    const cupResults = cd.matches.map((m): [string, string, number, number] => [m.sides[0].clubId, m.sides[1].clubId, m.goals[0], m.goals[1]]);
    world = { ...w, players, clubs: applyElo(clubs, cupResults) };
    career = { ...cd.career, ratings };
    const mine = cd.matches.find((m) => m.sides.some((s) => s.clubId === c.clubId)) ?? null;
    if (career.ops && cd.prizes.has(c.clubId)) career = { ...career, ops: { ...career.ops, ledger: { ...career.ops.ledger, prizes: (career.ops.ledger.prizes ?? 0) + cd.prizes.get(c.clubId)! } } };
    if (mine) {
      ({ world, career } = userAfter(cupPre, world, career, mine));
      career = recordMatch(career, mine);
      career = practise(career);
      const k = mine.sides[0].clubId === c.clubId ? 0 : 1;
      const cup = career.cups[mine.cup!];
      if (mine.group) {
        // Group game: points like the league; the verdict comes after the last group matchday.
        const d = mine.goals[k] - mine.goals[1 - k];
        if (career.ops) career = earnDev(career, d > 0 ? 2 : d === 0 ? 1 : 0);
      } else {
        const won = winnerOf(mine) === k;
        const final = cup.days.indexOf(c.round) === cup.days.length - 1;
        career = addMsg(career, 'cup', won ? (final ? 'cupWon' : 'cupThrough') : 'cupOut', { s: mine.cup, club: mine.sides[1 - k].clubId });
        if (career.ops) career = earnDev(career, won ? (final ? 30 : 3) : 0);
        if (won && final && career.ops) ({ world, career } = sponsorBonus(world, career, 'cup'));
      }
    }
    for (const id of cd.groupsDone) {
      const cup = career.cups[id];
      const g = cup.groups!.clubs.findIndex((x) => x.includes(c.clubId));
      if (g < 0) continue;
      const pos = groupTable(cup.groups!, g).findIndex((x) => x.clubId === c.clubId);
      career = addMsg(career, 'cup', pos < 2 ? 'groupThrough' : 'groupOut', { s: id, n: pos + 1 });
      if (pos < 2 && career.ops) career = earnDev(career, 5);
    }
    // Finals played today make the papers.
    for (const cup of Object.values(career.cups)) {
      const k = cup.days.indexOf(c.round);
      const w0 = cupWinner(cup);
      if (k === cup.days.length - 1 && w0) {
        const f = cup.ties[k][0];
        career = addNews(career, 'results', 'cupFinal', { club: w0, club2: f[0] === w0 ? f[1] : f[0], s: cup.id });
      }
    }
    if (inCup) return { world, career: { ...career, live: null }, mine };
  }
  const before = career;
  const pre = { world, career };
  const res = playRound(world, career, played && !played.cup ? played : undefined);
  world = res.world;
  career = res.career;
  // The papers and the rumour mill (rumours grow all season; deals go through on deadline day).
  career = newsRound(before, world, career);
  ({ world, career } = rumoursRound(world, career));
  if (res.mine) ({ world, career } = userAfter(pre, world, career, res.mine));
  if (res.mine) career = recordMatch(career, res.mine);
  if (res.mine) career = practise(career);
  // V2.8 AI boards: at a third and two thirds of the league, a club far below its standing may change its manager.
  { const ai = aiCheckpoint(world, career, career.round, (lid) => table(world, career, lid)); world = ai.world; career = managerNews(career, ai.changes); }
  // Every other club pays its wages and upkeep too, so treasuries don't just pile up.
  world = aiEconomyWeek(world, career);
  // The club's week: money, training, academy; development points from the result.
  if (career.ops) {
    const home = res.mine ? res.mine.sides[0].clubId === career.clubId : false;
    ({ world, career } = economyWeek(world, career, home));
    // v2.6: one development tick for every player in the world, then the pathway calendar (Intake Day, loan reports).
    ({ world, career } = developDay(world, career));
    ({ world, career } = pathwayDay(before, world, career));
    // Duties handed to the staff.
    ({ world, career } = staffWeek(world, career));
    if (res.mine) {
      const k = res.mine.sides[0].clubId === career.clubId ? 0 : 1;
      const d = res.mine.goals[k] - res.mine.goals[1 - k];
      career = earnDev(career, d > 0 ? 2 : d === 0 ? 1 : 0);
    }
    // Spending into the red worries the board every week it lasts.
    if (world.clubs.find((x) => x.id === career.clubId)!.budget < 0) career = { ...career, board: { ...career.board, confidence: Math.max(0, career.board.confidence - 2) } };
  }
  // Salary, reminders, new offers, and the board's patience.
  const club = world.clubs.find((x) => x.id === career.clubId)!;
  career = { ...career, coach: { ...career.coach, wallet: career.coach.wallet + Math.round(salaryOf(club) / 4), days: career.coach.days + 1 } };
  if (c.round === 5 || c.round === 25) {
    const n = squadOf(world, career.clubId).filter((p) => p.contractUntil <= career.season + 1).length;
    if (n) career = addMsg(career, 'contract', 'contractsEnding', { n });
  }
  for (const o of career.offers) if (!c.offers.some((x) => x.id === o.id)) career = addMsg(career, 'offer', 'offerIn', { player: o.playerId, pn: playerOf(world, o.playerId)?.name, club: o.clubId });
  // The board also reads the table: it counts the points between the club and its objective, so a favourite a win
  // off the top is left alone, a club clear of its target builds trust and one far adrift loses it (±1 a week at most).
  if (c.round >= 5) {
    const delta = tableMood(world, career, club);
    career = { ...career, board: { ...career.board, confidence: clamp(Math.round((career.board.confidence + delta) * 10) / 10, 0, 100) } };
  }
  career = sackCheck(world, career, onCourse(world, career, club));
  return { world, career, mine: res.mine };
}

// Weekly board term from the table: points clear of the objective's line (+), or points short of it (−).
export const MOOD_PER_POINT = 0.05;
export function tableMood(w: World, c: Career, club: Club): number {
  const rows = table(w, c, club.leagueId);
  const pos = rows.findIndex((x) => x.clubId === c.clubId) + 1;
  const obj = userObjective(w, c); // V2.7: one step higher after an ambitious board meeting
  const mine = rows[pos - 1].pts;
  if (objectiveMet(obj, pos, rows.length)) {
    // On course: the first place that misses the objective is the line to stay clear of.
    let edge = pos;
    while (edge < rows.length && objectiveMet(obj, edge + 1, rows.length)) edge++;
    const lead = edge < rows.length ? mine - rows[edge].pts : 3;
    return clamp(0.3 + MOOD_PER_POINT * lead, 0, 1);
  }
  let target = pos;
  while (target > 1 && !objectiveMet(obj, target, rows.length)) target--;
  const short = rows[target - 1].pts - mine;
  // A title race is close for longer: 2nd a few points off the top is not failing the objective yet (GF-004).
  const grace = obj === 'title' ? 6 : 3;
  return short <= grace ? 0 : clamp(-MOOD_PER_POINT * (short - grace), -1, 0);
}

// On course for the objective: meeting it now, or within 3 points of the place that would (6 in a title race).
export function onCourse(w: World, c: Career, club: Club): boolean {
  const rows = table(w, c, club.leagueId);
  const pos = rows.findIndex((x) => x.clubId === c.clubId) + 1;
  const obj = userObjective(w, c); // V2.7: one step higher after an ambitious board meeting
  if (objectiveMet(obj, pos, rows.length)) return true;
  let target = pos;
  while (target > 1 && !objectiveMet(obj, target, rows.length)) target--;
  return rows[target - 1].pts - rows[pos - 1].pts <= (obj === 'title' ? 6 : 3);
}

// Offers for the user's players: often for listed ones, now and then for a star. Offers last 3 matchdays.
// Bids only arrive while a transfer window is open (more of them on deadline day); open bids lapse when it shuts.
function makeOffers(w: World, c: Career, r: Rng): Offer[] {
  if (!windowOf(c)) return [];
  const offers = c.offers.filter((o) => c.round - o.round < 3 && w.players.find((p) => p.id === o.playerId)?.clubId === c.clubId);
  const squad = w.players.filter((p) => p.clubId === c.clubId && !loanOf(c, p.id));
  const dd = isDeadlineDay(c) ? 2 : 1;
  const buyers = w.clubs.filter((x) => x.id !== c.clubId);
  const country = new Map(w.leagues.map((l) => [l.id, l.country]));
  const myCountry = country.get(w.clubs.find((x) => x.id === c.clubId)!.leagueId);
  let strength: Map<string, number> | null = null;
  const tryOffer = (p: Player, lo: number, hi: number) => {
    if (offers.some((o) => o.playerId === p.id)) return;
    const fee = roundFee(p.marketValue * (lo + r() * (hi - lo)));
    // Buyers are clubs at the player's level (he'd get games there), mostly from the same country.
    strength ??= new Map(buyers.map((b) => [b.id, squadStrength(squadOf(w, b.id))]));
    const fit = buyers.filter((b) => b.budget >= fee && Math.abs(strength!.get(b.id)! - p.rating) <= 6);
    const local = fit.filter((b) => country.get(b.leagueId) === myCountry);
    const able = local.length && r() < 0.75 ? local : fit;
    if (!able.length) return;
    const buyer = able[Math.floor(r() * able.length)];
    offers.push({ id: `o${c.season}_${c.round}_${p.id}`, playerId: p.id, clubId: buyer.id, fee, round: c.round });
  };
  for (const p of squad) if (p.listed && r() < 0.35 * dd) tryOffer(p, 0.8, 1.15);
  if (r() < 0.12 * dd && squad.length) tryOffer([...squad].sort((a, b) => b.rating - a.rating)[int(r, 0, Math.min(4, squad.length - 1))], 1.1, 1.45);
  return offers;
}

export const roundFee = (v: number) => {
  if (v <= 0) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / p) * p;
};

// ---------- tables ----------

export interface Row { clubId: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; form: ('W' | 'D' | 'L')[] }

export function table(w: World, c: Career, leagueId: string): Row[] {
  const rows = new Map<string, Row>();
  for (const club of w.clubs) if (club.leagueId === leagueId) rows.set(club.id, { clubId: club.id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] });
  for (const round of c.fixtures[leagueId] ?? []) {
    for (const [h, a, hg, ag] of round) {
      if (hg < 0) continue;
      const H = rows.get(h)!, A = rows.get(a)!;
      H.p++; A.p++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
      if (hg > ag) { H.w++; A.l++; H.pts += 3; H.form.push('W'); A.form.push('L'); }
      else if (hg < ag) { A.w++; H.l++; A.pts += 3; A.form.push('W'); H.form.push('L'); }
      else { H.d++; A.d++; H.pts++; A.pts++; H.form.push('D'); A.form.push('D'); }
    }
  }
  const rep = new Map(w.clubs.map((x) => [x.id, x.reputation]));
  return [...rows.values()].sort((x, y) =>
    y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || (rep.get(y.clubId)! - rep.get(x.clubId)!));
}

// League leaders by one stat: 1 = goals, 2 = assists.
export function leaders(w: World, c: Career, leagueId: string, stat: 1 | 2, n = 10): { player: Player; value: number }[] {
  const inLeague = new Set(w.clubs.filter((x) => x.leagueId === leagueId).map((x) => x.id));
  const byId = new Map(w.players.map((p) => [p.id, p]));
  return Object.entries(c.stats)
    .map(([id, st]) => ({ player: byId.get(id)!, value: st[stat] }))
    .filter((x) => x.player && x.value > 0 && inLeague.has(x.player.clubId))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

// ---------- promotion zones and the board ----------

export const MOVERS = 3; // clubs that go up and down between tiers each season

export function zones(w: World, leagueId: string): { up: number; down: number; top: number } {
  const lg = w.leagues.find((l) => l.id === leagueId)!;
  const lower = w.leagues.some((l) => l.country === lg.country && l.tier === lg.tier + 1);
  return { up: lg.tier > 1 ? MOVERS : 0, down: lower ? MOVERS : 0, top: lg.tier === 1 ? 5 : 0 };
}

export function objectiveMet(objective: ReturnType<typeof objectiveOf>, position: number, clubs: number): boolean {
  switch (objective) {
    case 'title': return position === 1;
    case 'europe': return position <= 5;
    case 'topHalf': return position <= Math.ceil(clubs / 2);
    case 'survive': return position <= clubs - MOVERS;
    case 'promotion': return position <= MOVERS;
    case 'playoffs': return position <= 8;
    case 'midTable': return position <= clubs - 4;
  }
}

// ---------- end of season ----------

export interface SeasonSummary {
  record: SeasonRecord; promoted: string[]; relegated: string[]; retired: number;
  topScorer: { player: Player; value: number } | null;
  left: Player[];      // the user's players whose contracts ran out
  academy: Player[];   // kids promoted into the user's squad
  cups: { id: string; name: LocalizedName; round: number; rounds: number; won: boolean }[]; // the user's cup runs, from the real brackets (E2E #3)
  awards: AwardSet[];  // V2.8 awards night: the user's league first, then every top flight with real squads
}

// Clubs promote academy kids up to SQUAD_SELL_MIN (the same floor selling stops at). Read inside functions only: season
// and transfers import each other, so a top-level copy would hit the temporal dead zone.
const AI_SQUAD = 22;               // AI clubs sign free agents up to this
// League prize money: a pot of PRIZE_POT months of the league's summed wage caps, shared by final place and size:
// weight = own wage cap × (clubs below + 1)^PRIZE_STEEPNESS. The champion takes the most, the bottom next to nothing,
// and a small club's cheque is measured against its own wages (a mid-table finish is worth about half a month's cap,
// a title about two), not against the giants' budgets.
export const PRIZE_POT = 1.0;
export const PARACHUTE_MONTHS = 6;
export const PRIZE_STEEPNESS = 1.5;

// Closes the season: records the result, moves clubs up and down, ages and develops players, retires veterans,
// ends contracts (AI clubs renew most; the user's expiring players leave), fills squads from the academy and the
// free-agent pool, pays prize money and draws next season's fixtures.
export function endSeason(w0: World, c0: Career): { world: World; career: Career; summary: SeasonSummary } {
  // Loaned players go back to their clubs before contracts are looked at.
  const ya = returnAcademyLoans(w0, c0);
  const { world: w, career: c } = returnLoans(ya.world, ya.career);
  const r = makeRng(c.seed ^ (c.season * 31337));
  const myLeague = leagueOf(w, c.clubId);
  const tables = new Map(w.leagues.map((l) => [l.id, table(w, c, l.id)]));
  const myTable = tables.get(myLeague)!;
  // V2.8 AI boards at the season's end: a club that missed its objective by 4+ places changes its manager.
  const aiEnd = aiSeasonEnd(w, c, (lid) => tables.get(lid)!, objectiveMet);
  const objective = userObjective(w, c);
  const position = myTable.findIndex((x) => x.clubId === c.clubId) + 1;
  const record: SeasonRecord = {
    season: c.season, clubId: c.clubId, leagueId: myLeague, position, objective,
    met: objectiveMet(objective, position, myTable.length), champion: myTable[0].clubId,
  };
  const topScorer = leaders(w, c, myLeague, 1, 1)[0] ?? null;
  // Coach, board and job offers look at the season before clubs move up and down.
  const userPromoted = w.leagues.some((l) => l.country === w.leagues.find((x) => x.id === myLeague)!.country && l.tier === w.leagues.find((x) => x.id === myLeague)!.tier - 1)
    && position <= MOVERS;
  let short = 0; // places between the final position and the objective
  while (!record.met && position - short > 1 && !objectiveMet(objective, position - short, myTable.length)) short++;
  const coachEnd = c.coach ? coachSeasonEnd(w, c, position, myLeague, userPromoted, record.met, short) : null;

  // Clubs: prize money by final place, reputation drift, then promotion and relegation.
  const clubs: Club[] = w.clubs.map((x) => ({ ...x }));
  const byId = new Map(clubs.map((x) => [x.id, x]));
  const promoted: string[] = [], relegated: string[] = [];
  let parachute = 0;
  for (const lg of w.leagues) {
    const t = tables.get(lg.id)!;
    const pot = PRIZE_POT * clubs.filter((x) => x.leagueId === lg.id).reduce((s, x) => s + x.wageCap, 0);
    const weights = t.map((row, i) => byId.get(row.clubId)!.wageCap * (t.length - i) ** PRIZE_STEEPNESS);
    const wsum = weights.reduce((s, x) => s + x, 0);
    const byRep = [...t].sort((a, b) => byId.get(b.clubId)!.reputation - byId.get(a.clubId)!.reputation);
    t.forEach((row, i) => {
      const club = byId.get(row.clubId)!;
      club.budget = Math.round(club.budget + pot * weights[i] / wsum);
      const expected = byRep.findIndex((x) => x.clubId === row.clubId);
      club.reputation = clamp(club.reputation + Math.sign(expected - i) * Math.min(3, Math.round(Math.abs(expected - i) / 3)) + (i === 0 ? 2 : 0), 30, 99);
    });
    const lower = w.leagues.find((l) => l.country === lg.country && l.tier === lg.tier + 1);
    if (lower) {
      const down = t.slice(-MOVERS).map((x) => x.clubId);
      const up = tables.get(lower.id)!.slice(0, MOVERS).map((x) => x.clubId);
      // V2.7 parachute: a relegated club gets PARACHUTE_MONTHS of its wage cap to soften the drop.
      for (const id of down) { const x = byId.get(id)!; x.leagueId = lower.id; relegated.push(id); x.budget += roundFee(x.wageCap * PARACHUTE_MONTHS); if (id === c.clubId) parachute = roundFee(x.wageCap * PARACHUTE_MONTHS); }
      for (const id of up) { byId.get(id)!.leagueId = lg.id; promoted.push(id); }
    }
  }
  // League swaps queued in the world editor take effect now, before next season's fixtures (league sizes stay the same).
  for (const [a, b] of c.pendingSwaps ?? []) {
    const A = byId.get(a), B = byId.get(b);
    if (A && B && A.leagueId !== B.leagueId) [A.leagueId, B.leagueId] = [B.leagueId, A.leagueId];
  }

  // V2.8 awards night, read from the season just played (before anyone ages or moves).
  const awards = awardLeagues(w, c).map((lid) => leagueAwards(w, c, lid, tables.get(lid)![0].clubId, (c.fixtures[lid] ?? []).length));
  const winners = awardWinners(awards);
  // V2.8 club legends: the season's league apps and goals (and trophies) join each player's tally at the club.
  const tallied = tallySeason(w, coachEnd?.career ?? c, (coachEnd?.career.coach.trophies.length ?? 0) - (c.coach?.trophies.length ?? 0));

  // Players: a year older, develop or decline, veterans retire, contracts end or get renewed.
  const season = c.season + 1;
  let retired = 0;
  const players: Player[] = [];
  const left: Player[] = [];
  const deals: Deal[] = [];
  const strength = new Map<string, number>();
  for (const club of w.clubs) strength.set(club.id, squadStrength(squadOf(w, club.id)));
  for (const p of w.players) {
    const age = season - p.birthYear;
    const free = p.clubId === FREE_AGENT;
    if (age >= 37 || (age >= 34 && r() < (age - 33) * 0.25) || (free && age >= 34)) { retired++; continue; }
    const lid = free ? 'eng2' : byId.get(p.clubId)!.leagueId;
    // v2.6: every player grew (or declined) match by match in the unified development function (sim/youth.ts); the
    // season end only settles the ceiling, writes the season's line in his history and gives the legs a summer off.
    const rating = p.rating;
    const { potential } = seasonDev(p, c.season, r);
    const value = Math.round(valueOf(rating, age, potential) * (winners.has(p.id) ? 1.1 : 1)); // award winners +10%
    const q: Player = {
      // GF-015: a contract's wage holds until the player renews or moves (no summer ratchet); AI renewals below re-price it.
      ...p, rating, potential, marketValue: value, wage: p.wage, attrs: shiftAttrs(p.attrs, 0),
      fitness: 100, morale: 65, injured: 0, banned: p.banned, yc: undefined, listed: undefined, // gf-ref: bans carry over, yellow counts start again
      rh: [...(p.rh ?? []), enc(c.season, 99, rating)].slice(-60), ms: undefined, run: undefined, load: undefined, m5: p.m5 ? Math.round(p.m5 * 0.3) : undefined, inj0: undefined, rr: undefined,
    };
    if (!free && p.contractUntil <= season) {
      if (p.clubId === c.clubId || r() < 0.15) {
        // Contract over: he leaves for free. The user's players only stay if the user renewed them.
        if (p.clubId === c.clubId) {
          left.push(q);
          deals.push({ season: c.season, playerId: p.id, name: p.name, from: p.clubId, to: FREE_AGENT, fee: 0, kind: 'free' });
        }
        players.push({ ...q, clubId: FREE_AGENT, shirtNumber: 0, contractUntil: season });
        continue;
      }
      q.contractUntil = season + int(r, 2, 4);
      q.wage = wageOf(value, lid); // an AI club's new deal is priced at today's value
    }
    players.push(q);
  }

  // v2.6: the academies first: AI clubs promote their ready kids (and fill thin squads); kids who never made it leave.
  const acEnd = academySeasonEnd(w, c, players, clubs, season, SQUAD_SELL_MIN);
  players.splice(0, players.length, ...acEnd.players);
  // Fill squads: academy kids up to SQUAD_SELL_MIN, then AI clubs sign the best free agents they can afford up to AI_SQUAD.
  const count = new Map<string, number>();
  for (const p of players) count.set(p.clubId, (count.get(p.clubId) ?? 0) + 1);
  const academy: Player[] = [...acEnd.mine];
  const shirtsUsed = new Map<string, Set<number>>();
  for (const p of players) (shirtsUsed.get(p.clubId) ?? shirtsUsed.set(p.clubId, new Set()).get(p.clubId)!).add(p.shirtNumber);
  const nextShirt = (clubId: string) => {
    const used = shirtsUsed.get(clubId) ?? shirtsUsed.set(clubId, new Set()).get(clubId)!;
    let n = 2;
    while (used.has(n)) n++;
    used.add(n);
    return n;
  };
  for (const club of clubs) {
    const lg = w.leagues.find((l) => l.id === club.leagueId)!;
    const have = players.filter((p) => p.clubId === club.id);
    // Promote kids for the thinnest positions first.
    const need: Position[] = ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CDM', 'CAM', 'LW', 'RW', 'ST', 'ST', 'CB', 'CM', 'GK'];
    for (let i = count.get(club.id) ?? 0; i < SQUAD_SELL_MIN; i++) {
      const pos = need.find((ps) => have.filter((p) => p.position === ps).length < need.filter((x) => x === ps).length) ?? pick(r, need);
      const kidAge = int(r, 17, 19);
      const rating = clamp(Math.round((strength.get(club.id) ?? 60) - 9 + bell(r) * 5), 40, 80);
      const potential = clamp(Math.round(rating + 8 + r() * 16), rating, 95);
      const value = valueOf(rating, kidAge, potential);
      const kid: Player = {
        id: `${club.id}_y${season}_${i}`, clubId: club.id, name: playerName(lg.country, r), nationality: lg.country,
        birthYear: season - kidAge, position: pos, rating, potential, marketValue: value, wage: wageOf(value, lg.id),
        contractUntil: season + 3, shirtNumber: nextShirt(club.id), attrs: makeAttrs(r, rating, pos), fitness: 100, morale: 70, injured: 0, banned: 0,
        hg: club.id, rh: [enc(season, 0, rating)],
      };
      players.push(kid);
      have.push(kid);
      if (club.id === c.clubId) academy.push(kid);
      count.set(club.id, i + 1);
    }
  }
  const pool = players.filter((p) => p.clubId === FREE_AGENT).sort((a, b) => b.rating - a.rating);
  for (const club of clubs) {
    if (club.id === c.clubId) continue;
    const lg = w.leagues.find((l) => l.id === club.leagueId)!;
    const level = strength.get(club.id) ?? 60;
    while ((count.get(club.id) ?? 0) < AI_SQUAD) {
      const i = pool.findIndex((p) => p.rating <= level + 3 && p.rating >= level - 18);
      if (i < 0) break;
      const p = pool.splice(i, 1)[0];
      p.clubId = club.id;
      p.shirtNumber = nextShirt(club.id);
      p.contractUntil = season + int(r, 1, 3);
      p.wage = wageOf(p.marketValue, lg.id);
      count.set(club.id, (count.get(club.id) ?? 0) + 1);
    }
  }
  // Keep the free-agent pool at about 160 players.
  const freeNow = players.filter((p) => p.clubId === FREE_AGENT).length;
  if (freeNow < 160) players.push(...makeFreeAgents(r, season, 160 - freeNow));

  // Wage caps follow the new wage bills, down as well as up: room that was never used is not carried over.
  for (const club of clubs) {
    const bill = players.filter((p) => p.clubId === club.id).reduce((s, p) => s + p.wage, 0);
    club.wageCap = roundFee(bill * 1.05);
  }

  // Award winners at the user's club gain trust (+3).
  for (const p of players) if (winners.has(p.id) && p.clubId === c.clubId) p.trust = Math.min(100, (p.trust ?? 50) + 3);
  if (coachEnd?.cash) { const mc = clubs.find((x) => x.id === c.clubId)!; mc.budget += coachEnd.cash; }
  // League prize money and milestone cash go in the user's ledger; the ledger then starts over.
  let ops = c.ops;
  if (ops) {
    const mine = clubs.find((x) => x.id === c.clubId)!;
    const prize = mine.budget - (coachEnd?.cash ?? 0) - parachute - w.clubs.find((x) => x.id === c.clubId)!.budget;
    const ledger = { ...ops.ledger, prizes: (ops.ledger.prizes ?? 0) + prize, milestones: (ops.ledger.milestones ?? 0) + (coachEnd?.cash ?? 0), ...(parachute ? { parachute } : {}) };
    const titles = (coachEnd?.career.coach.trophies.length ?? 0) - (c.coach?.trophies.length ?? 0);
    ops = resetExams({ ...ops, lastLedger: ledger, ledger: {}, devPoints: 0 });
    void titles;
    if (position === 1) {
      const bonus = ops.sponsors.reduce((s, d) => s + d.bonusLeague, 0);
      mine.budget += bonus;
      ops = { ...ops, lastLedger: { ...ops.lastLedger, bonusSponsor: (ops.lastLedger?.bonusSponsor ?? 0) + bonus } };
    }
  }
  const world: World = { ...w, clubs, players, academy: acEnd.academy, managers: aiEnd.world.managers };
  const fixtures = seasonFixtures(world, c.seed, season);
  // Continental places come from this season's final tables.
  const finals = new Map([...tables.entries()].map(([lid, t]) => [lid, t.map((x) => x.clubId)]));
  const myRow = myTable[position - 1];
  const clubGoals = Object.entries(c.stats).map(([id, st]) => ({ p: w.players.find((x) => x.id === id), g: st[1] }))
    .filter((x) => x.p && x.p.clubId === c.clubId).sort((a, b) => b.g - a.g)[0];
  const base = recordSeason({ ...(coachEnd?.career ?? c), clubTally: tallied.clubTally, legends: tallied.legends }, myRow, position, myLeague, w.leagues.find((l) => l.id === myLeague)!.tier,
    clubGoals ? { pn: clubGoals.p!.name, goals: clubGoals.g } : null);
  // Rumours waiting for next summer's deadline day carry over, counted from the new season's first matchday.
  const rounds = roundsIn(c);
  const rumours = (c.rumours ?? []).filter((ru) => ru.until >= rounds).map((ru) => ({ ...ru, until: ru.until - rounds }));
  const career: Career = managerNews({
    ...base, season, round: 0, stats: {}, ratings: {}, loans: [], offers: [], deals: [...deals, ...c.deals], ops: ops!, rumours,
    fixtures, history: [...c.history, record], awards: [...awards, ...(c.awards ?? [])].slice(0, 30), cups: makeCups(world, { seed: c.seed, season, fixtures }, finals), cupDay: -1, live: null, pendingSwaps: undefined,
  }, aiEnd.changes);
  const cupRuns = Object.values(c.cups ?? {}).map((cup) => ({ cup, run: cupRun(cup, c.clubId) })).filter((x) => x.run)
    .map(({ cup, run }) => ({ id: cup.id, name: cup.name, round: run!.round, rounds: cup.days.length, won: run!.won }));
  return { world, career, summary: { record, promoted, relegated, retired, topScorer, left, academy, cups: cupRuns, awards } };
}

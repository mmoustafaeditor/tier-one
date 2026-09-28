// Cups: a national cup in every country (single-match knockouts with penalties) and four continental cups
// (a group stage of fours, home and away, then knockouts).
// E2E lessons: the continental cups are really played (#12), and cup results come from the real bracket (#3).
import type { Career, Cup, CupGroups, LocalizedName, Tie } from '../model/types';
import { makeRng, type Rng } from './rng';
import { indexOf, squadOf, type World } from './world';
import { simulate, startMatch, winnerOf, type LiveMatch } from './match';

const NATIONAL: Record<string, LocalizedName> = {
  ENG: { en: 'English Cup', ar: 'كأس إنجلترا' }, ESP: { en: 'Spanish Cup', ar: 'كأس إسبانيا' }, ITA: { en: 'Italian Cup', ar: 'كأس إيطاليا' },
  GER: { en: 'German Cup', ar: 'كأس ألمانيا' }, FRA: { en: 'French Cup', ar: 'كأس فرنسا' }, EGY: { en: 'Egypt Cup', ar: 'كأس مصر' },
  KSA: { en: 'King’s Cup', ar: 'كأس الملك' }, MAR: { en: 'Throne Cup', ar: 'كأس العرش' }, TUN: { en: 'Tunisian Cup', ar: 'كأس تونس' },
  ALG: { en: 'Algerian Cup', ar: 'كأس الجزائر' }, UAE: { en: 'President’s Cup', ar: 'كأس رئيس الدولة' }, QAT: { en: 'Emir Cup', ar: 'كأس الأمير' },
};

export const CONTINENTAL: Record<string, { name: LocalizedName; prize: number; from: [string, number, number][] }> = {
  // [league, first place taken, how many]
  ucl: { name: { en: 'European Champions Cup', ar: 'كأس أبطال أوروبا' }, prize: 60e6, from: [['eng1', 0, 3], ['esp1', 0, 3], ['ita1', 0, 3], ['ger1', 0, 3], ['fra1', 0, 3], ['eng1', 3, 1]] },
  uel: { name: { en: 'European League', ar: 'الدوري الأوروبي' }, prize: 25e6, from: [['eng1', 4, 3], ['esp1', 3, 3], ['ita1', 3, 3], ['ger1', 3, 3], ['fra1', 3, 3], ['esp1', 6, 1]] },
  ccl: { name: { en: 'African Champions Cup', ar: 'كأس أبطال إفريقيا' }, prize: 5e6, from: [['egy1', 0, 2], ['mar1', 0, 2], ['tun1', 0, 2], ['alg1', 0, 2]] },
  acl: { name: { en: 'Asian Champions Cup', ar: 'كأس أبطال آسيا' }, prize: 10e6, from: [['ksa1', 0, 4], ['uae1', 0, 2], ['qat1', 0, 2]] },
};

// Spread `n` rounds evenly between two matchdays.
const spread = (n: number, first: number, last: number) =>
  Array.from({ length: n }, (_, i) => Math.round(first + ((last - first) * i) / Math.max(1, n - 1)));

const shuffle = <T,>(r: Rng, a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// First round: the strongest clubs get byes so the second round is a power of two.
function firstRound(r: Rng, seeded: string[]): Tie[] {
  let size = 1;
  while (size < seeded.length) size *= 2;
  const byes = size - seeded.length;
  const ties: Tie[] = seeded.slice(0, byes).map((id): Tie => [id, '', -1, -1, -1, -1, id]);
  const rest = shuffle(r, seeded.slice(byes));
  for (let i = 0; i + 1 < rest.length; i += 2) ties.push([rest[i], rest[i + 1], -1, -1, -1, -1, '']);
  return shuffle(r, ties);
}

const roundsFor = (n: number) => { let k = 0; while ((1 << k) < n) k++; return k; };

// Leagues play `length` matchdays; cups fit between matchday 2 and the last few.
export function makeCups(w: World, c: Pick<Career, 'seed' | 'season' | 'fixtures'>, tables: Map<string, string[]> | null, from = 0): Record<string, Cup> {
  const r = makeRng(c.seed ^ (c.season * 4099));
  const rep = new Map(w.clubs.map((x) => [x.id, x.reputation]));
  const byRep = (ids: string[]) => [...ids].sort((a, b) => rep.get(b)! - rep.get(a)!);
  const len = (lid: string) => c.fixtures[lid]?.length ?? 30;
  const cups: Record<string, Cup> = {};

  for (const country of Object.keys(NATIONAL)) {
    const leagues = w.leagues.filter((l) => l.country === country);
    if (!leagues.length) continue;
    const clubs = byRep(w.clubs.filter((x) => leagues.some((l) => l.id === x.leagueId)).map((x) => x.id));
    const n = roundsFor(clubs.length);
    const last = len(leagues.find((l) => l.tier === 1)!.id) - 2; // the final comes before the top flight ends
    const days = spread(n, Math.max(from, 2), Math.max(from + n, last));
    const top = leagues.find((l) => l.tier === 1)!;
    cups[`${country.toLowerCase()}_cup`] = {
      id: `${country.toLowerCase()}_cup`, kind: 'national', name: NATIONAL[country], days,
      ties: [firstRound(r, clubs)], prize: roundTo(w, top.id),
    };
  }

  // Continental nights never share a matchday with a national cup round.
  const countryOf = (cid: string) => w.leagues.find((l) => l.id === w.clubs.find((x) => x.id === cid)!.leagueId)!.country.toLowerCase();
  const free = (days: number[], clubs: string[]) => {
    const busy = new Set(clubs.flatMap((cid) => cups[`${countryOf(cid)}_cup`]?.days ?? []));
    const used = new Set<number>();
    return days.map((d) => { while (busy.has(d) || used.has(d)) d++; used.add(d); return d; });
  };
  const taken = new Set<string>(); // a club plays in one continental cup at most
  for (const [id, def] of Object.entries(CONTINENTAL)) {
    const picked: string[] = [];
    for (const [lid, start, count] of def.from) {
      const order = tables?.get(lid) ?? byRep(w.clubs.filter((x) => x.leagueId === lid).map((x) => x.id));
      let got = 0;
      for (const cid of order.slice(start)) {
        if (got >= count) break;
        if (taken.has(cid)) continue;
        picked.push(cid);
        taken.add(cid);
        got++;
      }
    }
    if (picked.length < 2) continue;
    const last = Math.min(...def.from.map(([lid]) => len(lid))) - 3;
    if (picked.length >= 8 && picked.length % 4 === 0) {
      // Group stage: 6 matchdays, then knockouts for the top two of each group.
      const groups = drawGroups(r, byRep(picked), w);
      const n = roundsFor(groups.length * 2);
      const all = free(spread(6 + n, Math.max(from, 3), Math.max(from + 6 + n, last)), picked);
      cups[id] = { id, kind: 'continental', name: def.name, days: all.slice(6), ties: [], prize: def.prize, groups: { clubs: groups, days: all.slice(0, 6), games: groupGames(groups) } };
      continue;
    }
    const n = roundsFor(picked.length);
    const days = free(spread(n, Math.max(from, 4), Math.max(from + n, last)), picked);
    cups[id] = { id, kind: 'continental', name: def.name, days, ties: [firstRound(r, byRep(picked))], prize: def.prize };
  }
  return cups;
}

// Pots by reputation (pot 1 = the best), one club from each pot per group; clubs from the same league are kept apart when possible.
function drawGroups(r: Rng, seeded: string[], w: World): string[][] {
  const g = seeded.length / 4;
  const league = new Map(w.clubs.map((x) => [x.id, x.leagueId]));
  const groups: string[][] = Array.from({ length: g }, () => []);
  for (let pot = 0; pot < 4; pot++) {
    const clubs = shuffle(r, seeded.slice(pot * g, pot * g + g));
    for (const cid of clubs) {
      const open = groups.filter((x) => x.length === pot);
      const clean = open.filter((x) => !x.some((o) => league.get(o) === league.get(cid)));
      (clean[0] ?? open[0]).push(cid);
    }
  }
  return groups;
}

// Everyone plays everyone twice: three matchdays, then the same games the other way round.
const PAIRS: [number, number][][] = [[[0, 1], [2, 3]], [[2, 0], [1, 3]], [[0, 3], [1, 2]]];
function groupGames(groups: string[][]): Tie[][] {
  const legs = [...PAIRS, ...PAIRS.map((d) => d.map(([a, b]): [number, number] => [b, a]))];
  return legs.map((day) => groups.flatMap((g) => day.map(([a, b]): Tie => [g[a], g[b], -1, -1, -1, -1, ''])));
}

export interface GroupRow { clubId: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }

export function groupTable(gr: CupGroups, g: number): GroupRow[] {
  const rows = new Map(gr.clubs[g].map((id) => [id, { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const day of gr.games) for (const t of day) {
    const a = rows.get(t[0]), b = rows.get(t[1]);
    if (!a || !b || t[2] < 0) continue;
    a.p++; b.p++; a.gf += t[2]; a.ga += t[3]; b.gf += t[3]; b.ga += t[2];
    if (t[2] > t[3]) { a.w++; b.l++; a.pts += 3; } else if (t[2] < t[3]) { b.w++; a.l++; b.pts += 3; } else { a.d++; b.d++; a.pts++; b.pts++; }
  }
  const seed = gr.clubs[g];
  return [...rows.values()].sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || seed.indexOf(x.clubId) - seed.indexOf(y.clubId));
}

// Group winners play runners-up from another group (A1–B2, B1–A2, C1–D2 …), at the winner's ground.
function knockoutFromGroups(gr: CupGroups): Tie[] {
  const tables = gr.clubs.map((_, g) => groupTable(gr, g));
  const ties: Tie[] = [];
  for (let g = 0; g < tables.length; g += 2) {
    const h = tables[g], o = tables[g + 1] ?? tables[0];
    ties.push([h[0].clubId, o[1].clubId, -1, -1, -1, -1, '']);
    ties.push([o[0].clubId, h[1].clubId, -1, -1, -1, -1, '']);
  }
  return ties;
}

// National cup prize: a tenth of the league's richest club budget.
function roundTo(w: World, leagueId: string) {
  const top = Math.max(...w.clubs.filter((x) => x.leagueId === leagueId).map((x) => x.budget));
  return Math.round(top / 10 / 1e5) * 1e5;
}

// ---------- playing a cup day ----------

export const cupKey = (c: Career, cupId: string, round: number, i: number) => `${c.seed}:${c.season}:${cupId}:${round}:${i}`;

// Round index k >= 0 is a knockout round; k < 0 is group matchday -1 - k.
export const tieOf = (cup: Cup, k: number, i: number): Tie => (k < 0 ? cup.groups!.games[-1 - k][i] : cup.ties[k][i]);
export const groupDayOf = (cup: Cup, day: number) => cup.groups?.days.indexOf(day) ?? -1;

// Cup ties scheduled on a matchday: [cupId, round index, tie index].
export function tiesOn(c: Career, day: number): [string, number, number][] {
  const out: [string, number, number][] = [];
  for (const cup of Object.values(c.cups ?? {})) {
    const gd = groupDayOf(cup, day);
    if (gd >= 0) cup.groups!.games[gd].forEach((t, i) => { if (t[2] < 0) out.push([cup.id, -1 - gd, i]); });
    const k = cup.days.indexOf(day);
    if (k < 0 || !cup.ties[k]) continue;
    cup.ties[k].forEach((t, i) => { if (t[1] && t[2] < 0) out.push([cup.id, k, i]); });
  }
  return out;
}

export function userTie(c: Career): { cupId: string; k: number; i: number; tie: Tie } | null {
  if (c.cupDay >= c.round) return null;
  for (const [cupId, k, i] of tiesOn(c, c.round)) {
    const tie = tieOf(c.cups[cupId], k, i);
    if (tie[0] === c.clubId || tie[1] === c.clubId) return { cupId, k, i, tie };
  }
  return null;
}

export function userCupMatch(w: World, c: Career): LiveMatch | null {
  const u = userTie(c);
  if (!u) return null;
  const m = startMatch(w, c, u.tie[0], u.tie[1], cupKey(c, u.cupId, u.k, u.i), c.round);
  m.cup = u.cupId;
  if (u.k < 0) m.group = true;
  return m;
}

export interface CupDayResult { career: Career; matches: LiveMatch[]; prizes: Map<string, number>; groupsDone: string[] }

// Plays every cup tie of today's matchday (the user's can be passed in, played live), draws the next rounds,
// and pays prize money for finals. Doesn't touch league fixtures; playRound applies player effects from `matches`.
export function playCupDay(w: World, c: Career, played?: LiveMatch): CupDayResult {
  const cups: Record<string, Cup> = {};
  const matches: LiveMatch[] = [];
  const prizes = new Map<string, number>();
  const groupsDone: string[] = [];
  const get = (id: string) => indexOf(w).byId.get(id)!;
  const play = (cup: Cup, t: Tie, k: number, i: number): LiveMatch | null => {
    const mine = t[0] === c.clubId || t[1] === c.clubId;
    if (mine && played && played.key === cupKey(c, cup.id, k, i)) return played;
    const m = startMatch(w, mine ? c : null, t[0], t[1], cupKey(c, cup.id, k, i), c.round);
    m.cup = cup.id;
    if (k < 0) m.group = true;
    if (mine) m.sides.forEach((s) => (s.autoSubs = true));
    // A club with too few players can't field a side.
    if (squadOf(w, t[0]).length < 11 || squadOf(w, t[1]).length < 11) return null;
    simulate(m, get);
    return m;
  };
  for (const cup0 of Object.values(c.cups)) {
    let cup = cup0;
    // Group matchday.
    const gd = groupDayOf(cup, c.round);
    if (gd >= 0 && cup.groups!.games[gd].some((t) => t[2] < 0)) {
      const games = cup.groups!.games[gd].map((t, i): Tie => {
        if (t[2] >= 0) return t;
        const m = play(cup, t, -1 - gd, i);
        if (!m) { const fit = squadOf(w, t[0]).length >= 11; return [t[0], t[1], fit ? 3 : 0, fit ? 0 : 3, -1, -1, fit ? t[0] : t[1]]; }
        matches.push(m);
        return [t[0], t[1], m.goals[0], m.goals[1], -1, -1, m.goals[0] > m.goals[1] ? t[0] : m.goals[0] < m.goals[1] ? t[1] : '='];
      });
      const groups = { ...cup.groups!, games: cup.groups!.games.map((x, j) => (j === gd ? games : x)) };
      cup = { ...cup, groups };
      // Last group matchday: the knockouts are drawn.
      if (gd === groups.days.length - 1) { cup = { ...cup, ties: [knockoutFromGroups(groups)] }; groupsDone.push(cup.id); }
    }
    const k = cup.days.indexOf(c.round);
    if (k < 0 || !cup.ties[k] || cup.ties[k].every((t) => t[6])) { cups[cup.id] = cup; continue; }
    const ties = cup.ties[k].map((t, i): Tie => {
      if (t[6]) return t;
      const m = play(cup, t, k, i);
      // A club with too few players can't field a side: it goes out.
      if (!m) return [t[0], t[1], 0, 0, -1, -1, squadOf(w, t[0]).length >= 11 ? t[0] : t[1]];
      matches.push(m);
      return [t[0], t[1], m.goals[0], m.goals[1], m.pens?.[0] ?? -1, m.pens?.[1] ?? -1, m.sides[winnerOf(m)].clubId];
    });
    const next: Tie[][] = cup.ties.map((x, j) => (j === k ? ties : x));
    const winners = ties.map((t) => t[6]);
    if (winners.length > 1) {
      // Draw the next round now, so the bracket shows who plays whom.
      const r = makeRng((c.seed ^ c.season) + k * 7717 + cup.id.length);
      const pool = shuffle(r, winners);
      const round: Tie[] = [];
      for (let i = 0; i + 1 < pool.length; i += 2) round.push([pool[i], pool[i + 1], -1, -1, -1, -1, '']);
      next[k + 1] = round;
    } else {
      prizes.set(winners[0], (prizes.get(winners[0]) ?? 0) + cup.prize);
      const final = ties[0];
      const runnerUp = final[0] === winners[0] ? final[1] : final[0];
      prizes.set(runnerUp, (prizes.get(runnerUp) ?? 0) + Math.round(cup.prize / 2));
    }
    cups[cup.id] = { ...cup, ties: next };
  }
  return { career: { ...c, cups, cupDay: c.round }, matches, prizes, groupsDone };
}

export const cupWinner = (cup: Cup) => {
  const last = cup.ties[cup.days.length - 1];
  return last?.length === 1 && last[0][6] ? last[0][6] : null;
};

// How far a club went: the last round index it played in (and whether it won the final).
// Round -1: out in the group stage.
export function cupRun(cup: Cup, clubId: string): { round: number; won: boolean } | null {
  let reached = cup.groups?.clubs.some((g) => g.includes(clubId)) ? -1 : -2;
  cup.ties.forEach((ts, k) => { if (ts.some((t) => t[0] === clubId || t[1] === clubId)) reached = k; });
  if (reached < -1) return null;
  return { round: reached, won: cupWinner(cup) === clubId };
}

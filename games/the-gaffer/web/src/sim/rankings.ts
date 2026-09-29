// World rankings for clubs and coaches. One formula everywhere (E2E #13), regions that are really regions (E2E #57).
import type { Career, Club, CountryCode } from '../model/types';
import { playerName } from '../data/names';
import { COACH_NAMES } from '../data/stars';
import { makeRng } from './rng';
import type { World } from './world';

export const eloOf = (c: Club) => c.elo ?? 1000 + c.reputation * 10;

// Elo after a list of results [home, away, homeGoals, awayGoals]; the home side gets a small edge in the expectation.
export function applyElo(clubs: Club[], results: [string, string, number, number][]): Club[] {
  const elo = new Map(clubs.map((c) => [c.id, eloOf(c)]));
  for (const [h, a, hg, ag] of results) {
    const eh = elo.get(h), ea = elo.get(a);
    if (eh === undefined || ea === undefined || hg < 0) continue;
    const exp = 1 / (1 + 10 ** ((ea - eh - 60) / 400));
    const score = hg > ag ? 1 : hg === ag ? 0.5 : 0;
    const k = 20 * (1 + Math.min(2, Math.abs(hg - ag)) * 0.25);
    elo.set(h, eh + k * (score - exp));
    elo.set(a, ea - k * (score - exp));
  }
  return clubs.map((c) => (elo.get(c.id) !== eloOf(c) ? { ...c, elo: Math.round(elo.get(c.id)! * 10) / 10 } : c));
}

export type Region = 'world' | 'country' | 'europe' | 'africa' | 'asia';
const REGION: Record<CountryCode, Exclude<Region, 'world' | 'country'>> = {
  ENG: 'europe', ESP: 'europe', ITA: 'europe', GER: 'europe', FRA: 'europe',
  EGY: 'africa', MAR: 'africa', TUN: 'africa', ALG: 'africa', KSA: 'asia', UAE: 'asia', QAT: 'asia',
};
export const countryOf = (w: World, clubId: string) => w.leagues.find((l) => l.id === w.clubs.find((c) => c.id === clubId)!.leagueId)!.country;
export const inRegion = (w: World, clubId: string, region: Region, home: CountryCode) =>
  region === 'world' || (region === 'country' ? countryOf(w, clubId) === home : REGION[countryOf(w, clubId)] === region);

// Coaches of famous clubs (fictional) or generated names for everyone else.
export function coachName(w: World, clubId: string) {
  const [en, ar] = COACH_NAMES[clubId] ?? (() => { const n = playerName(countryOf(w, clubId), makeRng([...clubId].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7) >>> 0)); return [n.en, n.ar]; })();
  return { en, ar };
}

// Coach points: the club's ranking plus what the coach built himself. The user's coach is scored the same way.
export const coachPoints = (club: Club, reputation: number, trophies: number) => Math.round(eloOf(club) + reputation * 5 + trophies * 25);

export interface CoachRow { clubId: string; name: { en: string; ar: string }; points: number; you: boolean }
export function coachTable(w: World, c: Career): CoachRow[] {
  return w.clubs.map((club) => club.id === c.clubId
    ? { clubId: club.id, name: { en: c.managerName, ar: c.managerName }, points: coachPoints(club, c.coach.reputation, c.coach.trophies.filter((t) => t.kind !== 'promotion').length), you: true }
    : { clubId: club.id, name: coachName(w, club.id), points: coachPoints(club, Math.min(95, (eloOf(club) - 1000) / 12), 0), you: false })
    .sort((a, b) => b.points - a.points);
}
export const clubTable = (w: World) => [...w.clubs].sort((a, b) => eloOf(b) - eloOf(a));
export const myWorldRank = (w: World, c: Career) => coachTable(w, c).findIndex((r) => r.you) + 1;

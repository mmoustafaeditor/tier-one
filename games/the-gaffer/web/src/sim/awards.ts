// V2.8 awards night (V2_DESIGN §3.10, smallest fun version): per league, from the season's own numbers.
//   Player of the Season  best average match rating (at least 60% of the league's matchdays played)
//   Young Player          the same, 21 or under
//   Golden Boot           most league goals (assists break a tie)
//   Goalkeeper            best average rating among keepers (same minimum)
//   Manager of the Season the champion's manager
//   Team of the Season    the best-rated player for each spot of a 4-3-3
// Winners gain 10% in value; at the user's club they also gain trust (+3).
import type { Career, LocalizedName, Player, Position } from '../model/types';
import { squadOf, type World } from './world';

export interface AwardPick { id: string; pn: LocalizedName; clubId: string; v: number }
export interface AwardSet {
  season: number; leagueId: string;
  poty?: AwardPick; young?: AwardPick; boot?: AwardPick; keeper?: AwardPick;
  manager?: { clubId: string; name: LocalizedName; user: boolean };
  team: AwardPick[];
}

const MIN_SHARE = 0.6;
const TEAM: Position[][] = [['GK'], ['RB'], ['CB'], ['CB'], ['LB'], ['CDM', 'CM'], ['CM', 'CDM', 'CAM'], ['CAM', 'CM'], ['RW'], ['ST'], ['LW']];

const avgOf = (c: Career, id: string) => { const r = c.ratings?.[id]; return r && r[1] ? r[0] / r[1] : 0; };
const round1 = (v: number) => Math.round(v * 10) / 10;

export function leagueAwards(w: World, c: Career, leagueId: string, champion: string, rounds: number): AwardSet {
  const clubs = new Set(w.clubs.filter((x) => x.leagueId === leagueId).map((x) => x.id));
  const players = w.players.filter((p) => clubs.has(p.clubId));
  const min = Math.max(1, Math.floor(rounds * MIN_SHARE));
  const apps = (p: Player) => c.stats[p.id]?.[0] ?? 0;
  const regular = players.filter((p) => apps(p) >= min && avgOf(c, p.id) > 0);
  const pick = (p: Player | undefined, v: number): AwardPick | undefined => (p ? { id: p.id, pn: p.name, clubId: p.clubId, v } : undefined);
  const bestBy = (xs: Player[]) => [...xs].sort((a, b) => avgOf(c, b.id) - avgOf(c, a.id) || apps(b) - apps(a))[0];
  const poty = bestBy(regular.filter((p) => p.position !== 'GK'));
  const young = bestBy(regular.filter((p) => p.position !== 'GK' && c.season - p.birthYear <= 21));
  const keeper = bestBy(regular.filter((p) => p.position === 'GK'));
  const goals = (p: Player) => c.stats[p.id]?.[1] ?? 0;
  const boot = [...players].sort((a, b) => goals(b) - goals(a) || (c.stats[b.id]?.[2] ?? 0) - (c.stats[a.id]?.[2] ?? 0) || apps(a) - apps(b))[0];
  const used = new Set<string>();
  const team: AwardPick[] = [];
  for (const spot of TEAM) {
    const p = bestBy(regular.filter((x) => !used.has(x.id) && spot.includes(x.position)));
    if (p) { used.add(p.id); team.push(pick(p, round1(avgOf(c, p.id)))!); }
  }
  const user = champion === c.clubId;
  const mgr = user ? { en: c.managerName, ar: c.managerName } : w.managers?.[champion]?.name;
  return {
    season: c.season, leagueId,
    poty: pick(poty, round1(poty ? avgOf(c, poty.id) : 0)), young: pick(young, round1(young ? avgOf(c, young.id) : 0)),
    boot: boot && goals(boot) > 0 ? pick(boot, goals(boot)) : undefined, keeper: pick(keeper, round1(keeper ? avgOf(c, keeper.id) : 0)),
    manager: mgr ? { clubId: champion, name: mgr, user } : undefined,
    team,
  };
}

// The season's award winners: value +10% for everyone, trust +3 at the user's club (applied to the season-end player list).
export function awardWinners(sets: AwardSet[]): Set<string> {
  const ids = new Set<string>();
  for (const s of sets) for (const a of [s.poty, s.young, s.boot, s.keeper]) if (a) ids.add(a.id);
  return ids;
}

// Which leagues get an awards night: the user's, and every top flight with real squads.
export const awardLeagues = (w: World, c: Career) => {
  const mine = w.clubs.find((x) => x.id === c.clubId)!.leagueId;
  const real = w.leagues.filter((l) => l.tier === 1 && w.clubs.some((x) => x.leagueId === l.id && x.real)).map((l) => l.id);
  return [mine, ...real.filter((id) => id !== mine)];
};
export const squadIds = (w: World, clubId: string) => new Set(squadOf(w, clubId).map((p) => p.id));

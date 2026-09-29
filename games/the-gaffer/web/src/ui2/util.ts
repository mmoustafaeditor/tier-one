// Read-only helpers the screens share (projections of the state; nothing here changes it).
import type { Strings } from '../i18n';
import type { Career, Cup, Player } from '../model/types';
import type { LiveMatch } from '../sim/match';
import { nextUserMatch, table, leagueOf, type Row } from '../sim/season';
import { squadOf, type World } from '../sim/world';
import { dateOf } from '../sim/calendar';
import { tiesOn } from '../sim/cups';

export type { LiveMatch };

export function cupOfDay(t: Strings, cup: Cup, day: number, group: boolean): string {
  const gd = cup.groups?.days.indexOf(day) ?? -1;
  if (group && gd >= 0) return t.groupDay(gd + 1);
  return t.roundName(cup.days.indexOf(day), cup.days.length);
}

// The user's upcoming matches (league and cup) from the current matchday, in calendar order.
export interface Upcoming { round: number; cup?: string; home: string; away: string; date: Date; group?: boolean }
export function upcoming(w: World, c: Career, n = 7): Upcoming[] {
  const out: Upcoming[] = [];
  const lid = leagueOf(w, c.clubId);
  const rounds = c.fixtures[lid] ?? [];
  const last = Math.max(...Object.values(c.fixtures).map((f) => f.length));
  for (let r = c.round; r < last && out.length < n; r++) {
    for (const [cupId, k, i] of tiesOn(c, r)) {
      const cup = c.cups[cupId];
      const tie = k < 0 ? cup.groups!.games[-1 - k][i] : cup.ties[k][i];
      if (!tie || (tie[0] !== c.clubId && tie[1] !== c.clubId) || !tie[1]) continue;
      if (r === c.round && (c.cupDay ?? -1) >= r) continue;
      out.push({ round: r, cup: cupId, home: tie[0], away: tie[1], date: dateOf(c.season, r, true), group: k < 0 });
    }
    const f = rounds[r]?.find((x) => x[0] === c.clubId || x[1] === c.clubId);
    if (f) out.push({ round: r, home: f[0], away: f[1], date: dateOf(c.season, r) });
  }
  return out.slice(0, n);
}

export const nextMatch = (w: World, c: Career) => nextUserMatch(w, c);

export function formOf(rows: Row[], clubId: string, n = 5): ('W' | 'D' | 'L')[] {
  return (rows.find((r) => r.clubId === clubId)?.form ?? []).slice(-n);
}

export function leagueRows(w: World, c: Career) {
  return table(w, c, leagueOf(w, c.clubId));
}

export const avgMorale = (w: World, c: Career) => { const s = squadOf(w, c.clubId); return Math.round(s.reduce((a, p) => a + p.morale, 0) / Math.max(1, s.length)); };
export const moodOf = (p: Player) => (p.morale >= 75 ? 4 : p.morale >= 62 ? 3 : p.morale >= 50 ? 2 : p.morale >= 38 ? 1 : 0);
export const ageOf = (p: Player, season: number) => season - p.birthYear;

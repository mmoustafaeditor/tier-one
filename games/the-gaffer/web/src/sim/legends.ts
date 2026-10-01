// V2.8 club legends (V2_DESIGN §3.10): a running tally of league apps, goals and trophies for every player at the
// user's club, kept across seasons; a player who reaches 200 apps, or 80 goals, or 100 apps and 2 trophies becomes a
// legend of that club and stays listed after he leaves or retires. Updated once a season, at the season's end.
import type { Career, Legend } from '../model/types';
import { squadOf, type World } from './world';

export const LEGEND = { apps: 200, goals: 80, appsWithTrophies: 100, trophies: 2 };
export const TROPHY_MIN_APPS = 10; // a season's trophies count for the players who played at least this many league games
const key = (clubId: string, id: string) => `${clubId}:${id}`;
export const isLegend = (t: [number, number, number]) => t[0] >= LEGEND.apps || t[1] >= LEGEND.goals || (t[0] >= LEGEND.appsWithTrophies && t[2] >= LEGEND.trophies);

export function tallySeason(w: World, c: Career, trophiesWon: number): Career {
  const tally = { ...(c.clubTally ?? {}) };
  const legends = [...(c.legends ?? [])];
  for (const p of squadOf(w, c.clubId)) {
    const st = c.stats[p.id];
    const k = key(c.clubId, p.id);
    const t0 = tally[k] ?? [0, 0, 0];
    const t: [number, number, number] = [t0[0] + (st?.[0] ?? 0), t0[1] + (st?.[1] ?? 0), t0[2] + ((st?.[0] ?? 0) >= TROPHY_MIN_APPS ? trophiesWon : 0)];
    tally[k] = t;
    const i = legends.findIndex((l) => l.clubId === c.clubId && l.id === p.id);
    if (i >= 0) legends[i] = { ...legends[i], apps: t[0], goals: t[1], trophies: t[2] };
    else if (isLegend(t)) legends.push({ clubId: c.clubId, id: p.id, pn: p.name, apps: t[0], goals: t[1], trophies: t[2], season: c.season });
  }
  return { ...c, clubTally: tally, legends };
}

export const legendsOf = (c: Career, clubId: string): Legend[] => (c.legends ?? []).filter((l) => l.clubId === clubId).sort((a, b) => b.apps - a.apps);
// The players closest to it at the club now (at least halfway there), for the museum's "on the way" list.
export function onTheWay(w: World, c: Career, n = 3) {
  return squadOf(w, c.clubId).map((p) => ({ p, t: c.clubTally?.[key(c.clubId, p.id)] ?? [0, 0, 0] as [number, number, number] }))
    .filter((x) => !isLegend(x.t) && (x.t[0] >= LEGEND.apps / 2 || x.t[1] >= LEGEND.goals / 2))
    .sort((a, b) => b.t[0] - a.t[0]).slice(0, n);
}

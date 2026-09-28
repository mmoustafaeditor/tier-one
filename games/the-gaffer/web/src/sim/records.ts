// Club and manager records across the whole career: biggest win, best season, top scorer, record deals.
import type { Career, Deal, LocalizedName, RecordEntry, Records } from '../model/types';
import type { LiveMatch } from './match';

const better = (old: RecordEntry | undefined, v: number, lower = false) => !old || (lower ? v < old.v : v > old.v);

function set(c: Career, key: keyof Records, e: RecordEntry, lower = false): Career {
  const rec = c.records ?? {};
  return better(rec[key], e.v, lower) ? { ...c, records: { ...rec, [key]: e } } : c;
}

// After each of the user's matches.
export function recordMatch(c: Career, m: LiveMatch): Career {
  const idx = m.sides[0].clubId === c.clubId ? 0 : m.sides[1].clubId === c.clubId ? 1 : -1;
  if (idx < 0) return c;
  const k = idx as 0 | 1;
  const d = m.goals[k] - m.goals[(1 - k) as 0 | 1];
  let next = c;
  // Only wins by 3+ and runs of 5+ count, so the first weeks don't fill the book with trivial "records".
  if (d >= 3) next = set(next, 'bigWin', { v: d, season: c.season, s: `${m.goals[k]}-${m.goals[(1 - k) as 0 | 1]}`, club: m.sides[(1 - k) as 0 | 1].clubId });
  if (c.coach && c.coach.unbeaten >= 5) next = set(next, 'unbeaten', { v: c.coach.unbeaten, season: c.season });
  return next;
}

// At the end of a season, from the final table row and the club's top scorer.
export function recordSeason(c: Career, row: { pts: number; gf: number }, position: number, leagueId: string, tier: number,
  scorer: { pn: LocalizedName; goals: number } | null): Career {
  let next = set(c, 'mostPoints', { v: row.pts, season: c.season });
  next = set(next, 'mostGoals', { v: row.gf, season: c.season });
  // Best finish counts top-flight places ahead of second-tier ones.
  next = set(next, 'bestFinish', { v: (tier - 1) * 100 + position, season: c.season, s: leagueId }, true);
  if (scorer && scorer.goals > 0) next = set(next, 'scorer', { v: scorer.goals, season: c.season, pn: scorer.pn });
  return next;
}

export function recordDeal(c: Career, d: Deal): Career {
  if (!d.fee) return c;
  if (d.to === c.clubId) return set(c, 'bestBuy', { v: d.fee, season: d.season, pn: d.name, club: d.from });
  if (d.from === c.clubId) return set(c, 'bestSale', { v: d.fee, season: d.season, pn: d.name, club: d.to });
  return c;
}

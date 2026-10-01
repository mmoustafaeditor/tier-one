// Seasons follow the real calendar (GOTY.md §3). This is a local copy of the date ranges so the scenes lane doesn't
// depend on lib/season.ts. INTEGRATOR: once the season lane's currentSeason() lands, make seasonOf() delegate to it
// (keep the ids stable: `<key>-<year the season starts>`, e.g. "rumour-2026").
export type SeasonKey = 'rumour' | 'winter' | 'spring' | 'summer';
export type SeasonInfo = { id: string; key: SeasonKey; start: number; end: number; accent: string };
export const SEASON_ACCENT: Record<SeasonKey, string> = { rumour: '#FF9A1F', winter: '#35C3E6', spring: '#2FBF71', summer: '#F7B928' };

export function seasonOf(now = new Date()): SeasonInfo {
  const y = now.getFullYear(), md = (now.getMonth() + 1) * 100 + now.getDate();
  const d = (yy: number, m: number, day: number, end = false) => new Date(yy, m - 1, day, end ? 23 : 0, end ? 59 : 0).getTime();
  const mk = (key: SeasonKey, yy: number, s: number[], e: number[]): SeasonInfo => ({ id: `${key}-${yy}`, key, start: d(s[0], s[1], s[2]), end: d(e[0], e[1], e[2], true), accent: SEASON_ACCENT[key] });
  if (md >= 902) return mk('rumour', y, [y, 9, 2], [y, 12, 31]);
  if (md <= 202) return mk('winter', y, [y, 1, 1], [y, 2, 2]);
  if (md <= 615) return mk('spring', y, [y, 2, 3], [y, 6, 15]);
  return mk('summer', y, [y, 6, 16], [y, 9, 1]);
}

// The calendar the screens show. Matchday r of season s is a Saturday: the first is the third Saturday of August,
// then one a week. Cup ties on a matchday are played in the week before it (shown on the Wednesday).
export function dateOf(season: number, round: number, cup = false): Date {
  const aug1 = new Date(Date.UTC(season, 7, 1));
  const firstSat = 1 + ((6 - aug1.getUTCDay() + 7) % 7) + 14;
  return new Date(Date.UTC(season, 7, firstSat + 7 * round - (cup ? 3 : 0), 12));
}
const LOCALE: Record<string, string> = { en: 'en-GB', ar: 'ar-EG', es: 'es-ES', fr: 'fr-FR' };
const fmt = (lang: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE[lang] ?? 'en-GB', { timeZone: 'UTC', ...o });
export const dayName = (d: Date, lang: string) => fmt(lang, { weekday: 'short' }).format(d);
export const dayNum = (d: Date, lang: string) => fmt(lang, { day: 'numeric' }).format(d);
export const shortDate = (d: Date, lang: string) => fmt(lang, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
export const longDate = (d: Date, lang: string) => fmt(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
export const monthName = (d: Date, lang: string) => fmt(lang, { month: 'short' }).format(d);

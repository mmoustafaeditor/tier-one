// Strings for "What keeps happening" (ui2/Trends.tsx), the analysts' findings across the last matches. EN is the
// reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

interface TrendStrings {
  title: string;
  last: (n: number) => string;
  record: (w: number, d: number, l: number) => string;
  xg: (f: string, a: string) => string;
  of: (n: number, m: number) => string;
  none: string;
  cohesion: [string, string];
}
const en: TrendStrings = {
  title: 'What keeps happening',
  last: (n) => `Last ${n} ${n === 1 ? 'match' : 'matches'}`,
  record: (w, d, l) => `W${w} D${d} L${l}`,
  xg: (f, a) => `xG ${f} for, ${a} against, a match`,
  of: (n, m) => `${n} of ${m}`,
  none: 'No pattern yet: nothing the analysts found has come up twice.',
  cohesion: ['The team is clicking', 'The new faces haven’t settled'],
};
const ar: TrendStrings = {
  title: 'الحاجات اللي بتتكرر',
  last: (n) => `آخر ${n} ${n === 1 ? 'ماتش' : 'ماتشات'}`,
  record: (w, d, l) => `ف${w} ت${d} خ${l}`,
  xg: (f, a) => `xG ‏${f} لينا و${a} علينا في الماتش`,
  of: (n, m) => `${n} من ${m}`,
  none: 'لسه مفيش نمط: ولا حاجة من اللي المحللين لقوها اتكررت مرتين.',
  cohesion: ['الفريق متفاهم', 'الوجوه الجديدة لسه ما اتأقلمتش'],
};
const es: TrendStrings = {
  title: 'Lo que se repite',
  last: (n) => `Últimos ${n} ${n === 1 ? 'partido' : 'partidos'}`,
  record: (w, d, l) => `V${w} E${d} D${l}`,
  xg: (f, a) => `xG ${f} a favor y ${a} en contra por partido`,
  of: (n, m) => `${n} de ${m}`,
  none: 'Aún no hay patrón: nada de lo que vieron los analistas se ha repetido.',
  cohesion: ['El equipo se entiende', 'Los nuevos aún no se han adaptado'],
};
const fr: TrendStrings = {
  title: 'Ce qui revient',
  last: (n) => `${n} dernier${n > 1 ? 's' : ''} match${n > 1 ? 's' : ''}`,
  record: (w, d, l) => `V${w} N${d} D${l}`,
  xg: (f, a) => `xG ${f} pour, ${a} contre, par match`,
  of: (n, m) => `${n} sur ${m}`,
  none: 'Pas encore de tendance : rien de ce qu’ont vu les analystes n’est revenu deux fois.',
  cohesion: ['L’équipe tourne bien', 'Les recrues ne se sont pas encore adaptées'],
};

export const TR: Record<UiLang, TrendStrings> = { en, ar, es, fr };

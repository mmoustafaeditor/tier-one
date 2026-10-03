// Strings for "This week" on Training (ui2/Training.tsx): the next seven days around the real fixtures. EN is the
// reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

interface WeekStrings {
  title: string; note: string; match: (opp: string, home: boolean) => string; recovery: string; light: string;
  work: (intensity: string, focus: string) => string; two: string; twoHeavy: string;
}
const en: WeekStrings = {
  title: 'This week', note: 'The game applies the week as a whole; the days show where the work fits around the matches.',
  match: (o, h) => `Match: ${o} ${h ? '(H)' : '(A)'}`, recovery: 'Recovery', light: 'Light: shape and set pieces',
  work: (i, f) => `${i} · ${f}`, two: 'Two matches this week.', twoHeavy: 'Two matches this week: the heavy session is dropped.',
};
const ar: WeekStrings = {
  title: 'الأسبوع ده', note: 'اللعبة بتحسب الأسبوع كله مرة واحدة؛ الأيام بتوريك الشغل بيتوزع إزاي حوالين الماتشات.',
  match: (o, h) => `ماتش: ${o} ${h ? '(أرضنا)' : '(بره)'}`, recovery: 'استشفاء', light: 'خفيف: الشكل والكرات الثابتة',
  work: (i, f) => `${i} · ${f}`, two: 'ماتشين الأسبوع ده.', twoHeavy: 'ماتشين الأسبوع ده: التمرين التقيل اتلغى.',
};
const es: WeekStrings = {
  title: 'Esta semana', note: 'El juego aplica la semana entera; los días muestran dónde encaja el trabajo entre partidos.',
  match: (o, h) => `Partido: ${o} ${h ? '(L)' : '(V)'}`, recovery: 'Recuperación', light: 'Suave: sistema y balón parado',
  work: (i, f) => `${i} · ${f}`, two: 'Dos partidos esta semana.', twoHeavy: 'Dos partidos esta semana: se quita la sesión intensa.',
};
const fr: WeekStrings = {
  title: 'Cette semaine', note: 'Le jeu applique la semaine en bloc ; les jours montrent où le travail se place autour des matchs.',
  match: (o, h) => `Match : ${o} ${h ? '(D)' : '(E)'}`, recovery: 'Récupération', light: 'Léger : organisation et coups de pied arrêtés',
  work: (i, f) => `${i} · ${f}`, two: 'Deux matchs cette semaine.', twoHeavy: 'Deux matchs cette semaine : la séance intense saute.',
};
export const WK: Record<UiLang, WeekStrings> = { en, ar, es, fr };

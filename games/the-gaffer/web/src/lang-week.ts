// Strings for "This week" on Training (ui2/Training.tsx): the next seven days around the real fixtures. EN is the
// reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

interface WeekStrings {
  title: string; note: string; match: (opp: string, home: boolean) => string; recovery: string; light: string;
  work: (intensity: string, focus: string) => string; two: string; twoHeavy: string;
  rest: string; session: (focus: string) => string; sessions: (n: number, intensity: string) => string; dayOff: string; extra: string;
}
const en: WeekStrings = {
  rest: 'Day off', session: (f) => `Session: ${f.toLowerCase()}`, sessions: (n, i) => `${n} sessions this week = ${i.toLowerCase()} intensity (light 2, normal 3, heavy 4).`, dayOff: 'Give them a day off', extra: 'Extra session',
  title: 'This week', note: 'The game applies the week as a whole: the number of sessions sets the intensity.',
  match: (o, h) => `Match: ${o} ${h ? '(H)' : '(A)'}`, recovery: 'Recovery', light: 'Light: shape and set pieces',
  work: (i, f) => `${i} · ${f}`, two: 'Two matches this week.', twoHeavy: 'Two matches this week: the heavy session is dropped.',
};
const ar: WeekStrings = {
  rest: 'راحة', session: (f) => `تمرين: ${f}`, sessions: (n, i) => `${n} تمرينات الأسبوع ده = شدة ${i} (خفيف 2، عادي 3، تقيل 4).`, dayOff: 'اديهم يوم راحة', extra: 'تمرين زيادة',
  title: 'الأسبوع ده', note: 'اللعبة بتحسب الأسبوع كله مرة واحدة: عدد التمرينات هو اللي بيحدد الشدة.',
  match: (o, h) => `ماتش: ${o} ${h ? '(أرضنا)' : '(بره)'}`, recovery: 'استشفاء', light: 'خفيف: الشكل والكرات الثابتة',
  work: (i, f) => `${i} · ${f}`, two: 'ماتشين الأسبوع ده.', twoHeavy: 'ماتشين الأسبوع ده: التمرين التقيل اتلغى.',
};
const es: WeekStrings = {
  rest: 'Descanso', session: (f) => `Sesión: ${f.toLowerCase()}`, sessions: (n, i) => `${n} sesiones esta semana = intensidad ${i.toLowerCase()} (suave 2, normal 3, intensa 4).`, dayOff: 'Darles un día libre', extra: 'Sesión extra',
  title: 'Esta semana', note: 'El juego aplica la semana entera: el número de sesiones fija la intensidad.',
  match: (o, h) => `Partido: ${o} ${h ? '(L)' : '(V)'}`, recovery: 'Recuperación', light: 'Suave: sistema y balón parado',
  work: (i, f) => `${i} · ${f}`, two: 'Dos partidos esta semana.', twoHeavy: 'Dos partidos esta semana: se quita la sesión intensa.',
};
const fr: WeekStrings = {
  rest: 'Repos', session: (f) => `Séance : ${f.toLowerCase()}`, sessions: (n, i) => `${n} séances cette semaine = intensité ${i.toLowerCase()} (légère 2, normale 3, forte 4).`, dayOff: 'Leur donner un jour de repos', extra: 'Séance en plus',
  title: 'Cette semaine', note: 'Le jeu applique la semaine en bloc : le nombre de séances fixe l’intensité.',
  match: (o, h) => `Match : ${o} ${h ? '(D)' : '(E)'}`, recovery: 'Récupération', light: 'Léger : organisation et coups de pied arrêtés',
  work: (i, f) => `${i} · ${f}`, two: 'Deux matchs cette semaine.', twoHeavy: 'Deux matchs cette semaine : la séance intense saute.',
};
export const WK: Record<UiLang, WeekStrings> = { en, ar, es, fr };

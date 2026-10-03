// Strings for "Fit, not match-ready" on Medical (ui2/Pathway.tsx MedicalScreen). EN is the reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

interface SharpStrings { title: string; sub: string; line: (fit: number, days: number) => string; none: string }
const en: SharpStrings = {
  title: 'Fit, not match-ready',
  sub: 'Not injured, but below 78% fitness',
  line: (f, d) => `${f}% fit · ready in about ${d} ${d === 1 ? 'matchday' : 'matchdays'} (+12% a matchday)`,
  none: 'Everyone who is fit is also match-ready.',
};
const ar: SharpStrings = {
  title: 'سليم بس مش جاهز للماتش',
  sub: 'مش مصاب، بس لياقته أقل من 78%',
  line: (f, d) => `لياقة ${f}% · هيبقى جاهز بعد حوالي ${d} ${d === 1 ? 'جولة' : 'جولات'} (+12% كل جولة)`,
  none: 'كل اللي سليم جاهز للماتش كمان.',
};
const es: SharpStrings = {
  title: 'Sano, sin ritmo de partido',
  sub: 'Sin lesión, pero por debajo del 78% de forma',
  line: (f, d) => `${f}% de forma · listo en unas ${d} ${d === 1 ? 'jornada' : 'jornadas'} (+12% por jornada)`,
  none: 'Todos los que están sanos también están listos para jugar.',
};
const fr: SharpStrings = {
  title: 'Apte, pas encore prêt',
  sub: 'Pas blessé, mais sous 78 % de forme',
  line: (f, d) => `${f} % de forme · prêt dans environ ${d} journée${d > 1 ? 's' : ''} (+12 % par journée)`,
  none: 'Tous les joueurs aptes sont aussi prêts à jouer.',
};
export const SH: Record<UiLang, SharpStrings> = { en, ar, es, fr };

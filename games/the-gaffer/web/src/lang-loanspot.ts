// Strings for the academy loan sheet's rows (ui2/Pathway.tsx LoanSheet; sim/youth.ts academyLoanSpots). EN is the
// reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

interface SpotStrings {
  role: [string, string, string];
  up: (team: number, him: number) => string; level: (team: number, him: number) => string; down: (team: number, him: number) => string;
  best: string;
}
const en: SpotStrings = {
  role: ['Would start most weeks', 'Would rotate: some starts, some from the bench', 'Would mostly sit on the bench'],
  up: (t, h) => `Team level ${t}, a step up for him (${h})`, level: (t, h) => `Team level ${t}, around his (${h})`, down: (t, h) => `Team level ${t}, below his (${h})`,
  best: 'Best fit',
};
const ar: SpotStrings = {
  role: ['هيلعب أساسي أغلب الأسابيع', 'هيتبادل: شوية أساسي وشوية من الدكة', 'غالباً هيقعد على الدكة'],
  up: (t, h) => `مستوى الفريق ${t}، خطوة لفوق ليه (${h})`, level: (t, h) => `مستوى الفريق ${t}، قريب من مستواه (${h})`, down: (t, h) => `مستوى الفريق ${t}، أقل من مستواه (${h})`,
  best: 'الأنسب',
};
const es: SpotStrings = {
  role: ['Sería titular casi siempre', 'Rotaría: unas de titular, otras desde el banquillo', 'Estaría casi siempre en el banquillo'],
  up: (t, h) => `Nivel del equipo ${t}, un paso adelante para él (${h})`, level: (t, h) => `Nivel del equipo ${t}, parecido al suyo (${h})`, down: (t, h) => `Nivel del equipo ${t}, por debajo del suyo (${h})`,
  best: 'El mejor encaje',
};
const fr: SpotStrings = {
  role: ['Serait titulaire la plupart du temps', 'Tournerait : titulaire parfois, remplaçant parfois', 'Serait surtout sur le banc'],
  up: (t, h) => `Niveau de l’équipe ${t}, un cran au-dessus pour lui (${h})`, level: (t, h) => `Niveau de l’équipe ${t}, proche du sien (${h})`, down: (t, h) => `Niveau de l’équipe ${t}, sous le sien (${h})`,
  best: 'Meilleur choix',
};
export const LS: Record<UiLang, SpotStrings> = { en, ar, es, fr };

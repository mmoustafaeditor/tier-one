// Strings for "In your plan" on the player page (sim/planfit.ts). EN is the reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

interface FitStrings {
  title: (formation: string) => string;
  starts: (pos: string) => string;
  open: (pos: string) => string;
  ahead: (pos: string, who: string, d: number) => string;
  close: (pos: string, who: string, d: number) => string;
  behind: (pos: string, who: string, d: number) => string;
  none: (pos: string, d: number) => string;
  scout: string;
}
const en: FitStrings = {
  title: (f) => `In your ${f}`,
  starts: (pos) => `Starts at ${pos}.`,
  open: (pos) => `Would start at ${pos}: nobody plays there now.`,
  ahead: (pos, who, d) => `Would start at ${pos}, ahead of ${who} (+${d}).`,
  close: (pos, who, d) => `Pushing ${who} at ${pos} (${d === 0 ? 'level' : d}).`,
  behind: (pos, who, d) => `Behind ${who} at ${pos} (${d}).`,
  none: (pos, d) => `No natural place in it: best at ${pos}, ${d} below his level.`,
  scout: 'Scout him to see where he would fit.',
};
const ar: FitStrings = {
  title: (f) => `في خطتك ${f}`,
  starts: (pos) => `أساسي في مركز ${pos}.`,
  open: (pos) => `هيلعب أساسي في مركز ${pos}: مفيش حد بيلعب هناك دلوقتي.`,
  ahead: (pos, who, d) => `هيلعب أساسي في مركز ${pos} بدل ${who} (+${d}).`,
  close: (pos, who, d) => `بينافس ${who} على مركز ${pos} (${d === 0 ? 'نفس المستوى' : d}).`,
  behind: (pos, who, d) => `ورا ${who} في مركز ${pos} (${d}).`,
  none: (pos, d) => `ملوش مكان طبيعي فيها: أحسن مركز ليه ${pos}، أقل من مستواه بـ${d}.`,
  scout: 'ابعت الكشافين عليه عشان تعرف هيتركّب فين.',
};
const es: FitStrings = {
  title: (f) => `En tu ${f}`,
  starts: (pos) => `Titular de ${pos}.`,
  open: (pos) => `Sería titular de ${pos}: ahora no juega nadie ahí.`,
  ahead: (pos, who, d) => `Sería titular de ${pos}, por delante de ${who} (+${d}).`,
  close: (pos, who, d) => `Aprieta a ${who} de ${pos} (${d === 0 ? 'igualados' : d}).`,
  behind: (pos, who, d) => `Por detrás de ${who} de ${pos} (${d}).`,
  none: (pos, d) => `Sin sitio natural: lo mejor, de ${pos}, ${d} por debajo de su nivel.`,
  scout: 'Hazlo ojear para ver dónde encajaría.',
};
const fr: FitStrings = {
  title: (f) => `Dans ton ${f}`,
  starts: (pos) => `Titulaire au poste de ${pos}.`,
  open: (pos) => `Serait titulaire au poste de ${pos} : personne n’y joue.`,
  ahead: (pos, who, d) => `Serait titulaire au poste de ${pos}, devant ${who} (+${d}).`,
  close: (pos, who, d) => `Pousse ${who} au poste de ${pos} (${d === 0 ? 'à égalité' : d}).`,
  behind: (pos, who, d) => `Derrière ${who} au poste de ${pos} (${d}).`,
  none: (pos, d) => `Pas de place naturelle : au mieux ${pos}, ${d} sous son niveau.`,
  scout: 'Fais-le superviser pour voir où il s’intégrerait.',
};

export const FP: Record<UiLang, FitStrings> = { en, ar, es, fr };

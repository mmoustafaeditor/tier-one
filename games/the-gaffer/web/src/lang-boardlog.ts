// Strings for "Why it moved" under the board's trust (ui2/Office.tsx; sim/boardlog.ts). EN is the reference; AR is
// Egyptian Arabic.
import type { UiLang } from './i18n';

interface BLStrings {
  title: string; none: string;
  result: (club: string, s: string, derby: boolean, up: boolean) => string;
  press: string; claim: (club: string) => string; table: (up: boolean) => string; plan: string; review: (pos: string) => string;
}
const en: BLStrings = {
  title: 'Why it moved', none: 'No change yet.',
  result: (cl, s, d, up) => `${s} against ${cl}${d ? ' (derby, counts 1.5×)' : ''}: ${up ? 'better than they expected' : 'worse than they expected'}`,
  press: 'Your answer to the press', claim: (cl) => `Your public claim about ${cl} didn’t hold up`,
  table: (up) => (up ? 'The table: clear of the target' : 'The table: off the target'), plan: 'You agreed the season plan', review: (p) => `Season review: finished ${p}`,
};
const ar: BLStrings = {
  title: 'اتغيرت ليه', none: 'لسه مفيش تغيير.',
  result: (cl, s, d, up) => `${s} قدام ${cl}${d ? ' (ديربي، بيتحسب ×1.5)' : ''}: ${up ? 'أحسن من اللي كانوا مستنيينه' : 'أقل من اللي كانوا مستنيينه'}`,
  press: 'ردك على الصحافة', claim: (cl) => `كلامك قدام الناس عن ${cl} ما اتحققش`,
  table: (up) => (up ? 'الترتيب: فوق الهدف' : 'الترتيب: بعيد عن الهدف'), plan: 'اتفقت على خطة الموسم', review: (p) => `تقييم الموسم: خلّصت ${p}`,
};
const es: BLStrings = {
  title: 'Por qué cambió', none: 'Sin cambios todavía.',
  result: (cl, s, d, up) => `${s} ante ${cl}${d ? ' (derbi, cuenta ×1,5)' : ''}: ${up ? 'mejor de lo que esperaban' : 'peor de lo que esperaban'}`,
  press: 'Tu respuesta a la prensa', claim: (cl) => `Tu declaración sobre ${cl} no se cumplió`,
  table: (up) => (up ? 'La tabla: por encima del objetivo' : 'La tabla: lejos del objetivo'), plan: 'Acordaste el plan de la temporada', review: (p) => `Balance de la temporada: ${p}`,
};
const fr: BLStrings = {
  title: 'Pourquoi elle a bougé', none: 'Aucun changement pour l’instant.',
  result: (cl, s, d, up) => `${s} contre ${cl}${d ? ' (derby, compte ×1,5)' : ''} : ${up ? 'mieux que prévu' : 'moins bien que prévu'}`,
  press: 'Votre réponse à la presse', claim: (cl) => `Votre déclaration sur ${cl} ne s’est pas vérifiée`,
  table: (up) => (up ? 'Le classement : au-dessus de l’objectif' : 'Le classement : loin de l’objectif'), plan: 'Vous avez validé le plan de la saison', review: (p) => `Bilan de saison : ${p}`,
};
export const BL: Record<UiLang, BLStrings> = { en, ar, es, fr };

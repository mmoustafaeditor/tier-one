// Strings for the Tactics Lab on the pre-match screen (ui2/PreMatch.tsx, sim/lab.ts). EN is the reference; AR is
// Egyptian Arabic.
import type { UiLang } from './i18n';

interface LabStrings {
  title: string;
  open: string;
  close: string;
  sub: string;
  shape: string;
  now: string;
  win: string;
  xg: (us: string, them: string) => string;
  diff: (pts: string) => string;
  use: string;
  inUse: string;
  note: string;
}

const en: LabStrings = {
  title: 'Tactics Lab',
  open: 'Try another plan',
  close: 'Close the lab',
  sub: 'The match engine’s odds against this opponent for each style. Nothing changes until you tap Use.',
  shape: 'Shape',
  now: 'Current plan',
  win: 'Win',
  xg: (us, them) => `xG ${us}–${them}`,
  diff: (pts) => `${pts} pts`,
  use: 'Use',
  inUse: 'In use',
  note: 'Counts how well the squad knows each style. Using one resets your player roles to its defaults; a new shape picks the best XI for it.',
};
const ar: LabStrings = {
  title: 'معمل التكتيك',
  open: 'جرّب خطة تانية',
  close: 'اقفل المعمل',
  sub: 'فرص محرك الماتش قدام الخصم ده لكل أسلوب. مفيش حاجة هتتغير غير لما تدوس استخدم.',
  shape: 'التشكيل',
  now: 'الخطة الحالية',
  win: 'فوز',
  xg: (us, them) => `xG ‏${us}–${them}`,
  diff: (pts) => `${pts} نقطة`,
  use: 'استخدم',
  inUse: 'شغّالة',
  note: 'بيحسب الفريق فاهم كل أسلوب قد إيه. لو استخدمت واحد، أدوار اللاعيبة بترجع للافتراضي بتاعه؛ والتشكيل الجديد بيختار أحسن 11 ليه.',
};
const es: LabStrings = {
  title: 'Laboratorio táctico',
  open: 'Probar otro plan',
  close: 'Cerrar el laboratorio',
  sub: 'Las probabilidades del motor contra este rival para cada estilo. No cambia nada hasta que pulses Usar.',
  shape: 'Sistema',
  now: 'Plan actual',
  win: 'Victoria',
  xg: (us, them) => `xG ${us}–${them}`,
  diff: (pts) => `${pts} pts`,
  use: 'Usar',
  inUse: 'En uso',
  note: 'Cuenta lo bien que la plantilla conoce cada estilo. Usar uno devuelve los roles a los de ese estilo; un sistema nuevo elige el mejor once para él.',
};
const fr: LabStrings = {
  title: 'Labo tactique',
  open: 'Essayer un autre plan',
  close: 'Fermer le labo',
  sub: 'Les chances du moteur de match face à cet adversaire pour chaque style. Rien ne change avant d’appuyer sur Utiliser.',
  shape: 'Système',
  now: 'Plan actuel',
  win: 'Victoire',
  xg: (us, them) => `xG ${us}–${them}`,
  diff: (pts) => `${pts} pts`,
  use: 'Utiliser',
  inUse: 'En place',
  note: 'Tient compte de la maîtrise de chaque style par l’effectif. En choisir un remet les rôles par défaut ; un nouveau système choisit le meilleur onze pour lui.',
};

export const LB: Record<UiLang, LabStrings> = { en, ar, es, fr };

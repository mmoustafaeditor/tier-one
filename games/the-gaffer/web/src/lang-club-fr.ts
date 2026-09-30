// V2.7 Club vision, French. Type-checked against lang-club.ts.
import type { CLStrings } from './lang-club';
const P = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const CL_FR: CLStrings = {
  tag: 'Réunion du conseil',
  title: (season: string) => `Le plan du conseil pour ${season}`,
  advice: (target: string) => `Notre objectif : ${target}. Visez plus haut et le propriétaire vous soutiendra financièrement, mais nous vous jugerons plus durement.`,
  choices: {
    expected: () => 'Votre objectif est le bon',
    ambitious: (target: string) => `Viser plus haut : ${target}`,
  },
  fx: {
    goodwill: () => 'Conseil +5',
    kitty: (v: string) => `${v} du propriétaire`,
    strict: () => 'Conseil plus exigeant',
    target: (t: string) => t,
  },
  board: {
    none: 'Le conseil se réunit avant les premières journées.',
    expected: (t: string) => `Plan de la saison : l’objectif du conseil, ${t}.`,
    ambitious: (t: string, v: string) => `Plan de la saison : ambitieux, ${t}. Le propriétaire a mis ${v} ; le conseil juge plus durement.`,
  },
  build: {
    busy: (level: number, n: number) => `Construction niveau ${level} · prêt dans ${n} ${P(n, 'journée', 'journées')}`,
    takes: (n: number) => `Prend ${n} ${P(n, 'journée', 'journées')}`,
    oneAtATime: 'Un chantier à la fois',
    opened: (f: string, level: number) => `Le nouveau ${f} est ouvert : niveau ${level}.`,
  },
  ledger: { owner: 'Investissement du propriétaire', parachute: 'Indemnité de relégation' },
};

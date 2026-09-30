// V2.7 Club vision, French. Type-checked against lang-club.ts.
import type { CLStrings } from './lang-club';
const P = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const CL_FR: CLStrings = {
  tag: 'Réunion du conseil',
  derby: 'Derby',
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
  awards: {
    title: 'Soirée des trophées',
    poty: 'Joueur de la saison', young: 'Meilleur espoir', boot: 'Soulier d’or', keeper: 'Gardien de la saison', manager: 'Entraîneur de la saison',
    team: 'Équipe type de la saison', elsewhere: 'Dans les autres championnats',
    goals: (n: number) => `${n} ${P(n, 'but', 'buts')}`, rating: (v: number) => `moy. ${v.toFixed(1)}`, you: 'vous',
    ours: (n: number) => `${n} des nôtres dans l’équipe type.`,
  },
  legends: {
    title: 'Légendes du club',
    none: 'Pas encore de légende. Il faut 200 matchs de championnat ici, ou 80 buts, ou 100 matchs et 2 trophées.',
    way: 'En route',
    line: (apps: number, goals: number, trophies: number) => `${apps} ${P(apps, 'match', 'matchs')} · ${goals} ${P(goals, 'but', 'buts')} · ${trophies} ${P(trophies, 'trophée', 'trophées')}`,
  },
};

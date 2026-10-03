// V2.7 Club vision, French. Type-checked against lang-club.ts.
import type { CLStrings } from './lang-club';
const P = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const CL_FR: CLStrings = {
  tag: 'Réunion du conseil',
  derby: 'Derby',
  title: (season: string) => `Le plan du conseil pour ${season}`,
  adviceTop: (target: string) => `Notre objectif : ${target}. C’est le plus haut qu’une direction puisse demander ; nous vous jugerons là-dessus.`,
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
    top: () => 'C’est déjà l’objectif le plus haut : rien de plus ambitieux à convenir',
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
  press: {
    tag: 'Conférence de presse',
    q: {
      predict: (opp: string) => `Pouvez-vous battre ${opp} ?`,
      star: (pn: string) => `${pn} est-il l’homme de ce match ?`,
      rival: (opp: string) => `L’entraîneur de ${opp} dit que vous sentez la pression.`,
      blame: (opp: string) => `Qu’est-ce qui n’a pas marché contre ${opp} ?`,
      ref: (opp: string) => `Ce carton rouge contre ${opp}. Juste ?`,
    },
    adv: {
      predict: 'Une réponse mesurée ne coûte jamais rien. Promettez une victoire et il faudra la livrer.',
      star: 'Soutenez-le en public et il grandira. Les autres aiment entendre que c’est collectif.',
      rival: 'Il cherche une réaction. Répondez et les supporters adorent, mais il faudra gagner.',
      blame: 'Gardez ça dans le vestiaire si possible. Nommez un joueur en public et il le prendra mal.',
      ref: 'S’en prendre à l’arbitre : les supporters applaudissent, la direction grimace.',
    },
    a: {
      predict: { measured: 'On les respecte. On sera prêts', confident: 'On va gagner', deflect: 'Demandez-moi après le match' },
      star: { measured: 'C’est l’affaire de toute l’équipe', confident: (pn: string) => `${pn} fera la différence`, deflect: 'Je ne parle pas des individus' },
      rival: { measured: 'Qu’il parle. On se concentre sur nous', confident: 'On lui répondra sur le terrain, en gagnant', deflect: 'Je n’ai pas entendu ce qu’il a dit' },
      blame: { measured: 'On va l’analyser ensemble', confident: 'C’est ma faute', deflect: 'Mauvais jour. On passe à autre chose', name: (pn: string) => `${pn} nous a laissés tomber` },
      ref: { measured: 'Je laisse ça aux arbitres', confident: 'L’arbitre s’est trompé', deflect: 'Je ne l’ai pas bien vu' },
    },
    fx: {
      squad: (n: string) => `Moral du groupe ${n}`, morale: (n: string) => `Son moral ${n}`, trust: (n: string) => `Sa confiance ${n}`,
      board: (n: string) => `Direction ${n}`, fans: (n: string) => `Supporters ${n}`,
      claim: 'Promesse publique : une défaite contre eux et c’est direction −3, supporters −4', safe: 'Ne coûte rien',
    },
  },
  store: {
    base: 'Vert Semba', free: 'Gratuit', buy: (price: string) => `Débloquer · ${price}`, use: 'Utiliser', inUse: 'Utilisé',
    short: (n: number) => `Il manque ${n} cr`, bought: 'Style débloqué.',
    seasonEarn: 'Vous gagnez 50 cr pour chaque saison terminée (les 10 premières d’une carrière).',
    seasonToast: (n: number) => `+${n} Semba Credits pour la saison terminée.`,
  },
};

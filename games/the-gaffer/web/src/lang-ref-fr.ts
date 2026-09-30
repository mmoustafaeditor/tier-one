// Copy for the officials (gf-ref), French. Type-checked against lang-ref.ts.
import type { RefStrings } from './lang-ref';
const P = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const R_FR: RefStrings = {
  strict: ['Permissif', 'Juste', 'Sévère', 'Très sévère'],
  referee: 'Arbitre',
  varOn: 'VAR', varOff: 'Sans VAR',
  refLine: (r, s, v) => `Arbitre ${r} · ${s} · ${v ? 'avec VAR' : 'sans VAR'}`,
  speeds: ['Lent', 'Normal', 'Rapide'],
  instant: 'Instantané',
  commentary: 'Commentaire', moments: 'Temps forts',
  windows: (n) => `${n} ${P(n, 'fenêtre', 'fenêtres')} restante${n === 1 ? '' : 's'}`,
  statsExtra: ['Cartons rouges', 'Hors-jeu', 'Coups francs', 'Touches', 'Six mètres'],
  tenMen: 'À dix',
  suspended: 'Suspendu',
  suspendedIn: (comp, n) => `Suspendu : ${comp} (${n})`,
  outSuspended: (names) => `Suspendus : ${names}`,
  seq: {
    goal: 'BUT', nogoal: 'BUT REFUSÉ', pen: 'PENALTY', playOn: 'Jouez', yellow: 'CARTON JAUNE', red: 'CARTON ROUGE', y2: 'DEUXIÈME JAUNE',
    check: 'Vérification VAR…', ofr: 'Visionnage', stands: 'Décision maintenue', over: 'Décision annulée',
    given: 'But accordé', penGiven: 'Penalty accordé', noPen: 'Pas de penalty', fk: 'Coup franc hors de la surface',
    down: 'Rouge annulé · jaune', up: 'Transformé en rouge', rescind: 'Deuxième jaune annulé', id: 'Mauvais joueur · carton corrigé',
    why: { offside: 'hors-jeu', apf: 'faute dans l’action', ahand: 'main', onside: 'pas hors-jeu', outside: 'hors de la surface', dive: 'simulation', foul: 'faute', hand: 'main', violent: 'comportement violent', goal: 'but', pen: 'penalty' },
  },
  ev: {
    yellow: (p) => `Averti · ${p}`, y2: (p) => `Deuxième jaune · ${p}`, pen: (p) => `Penalty · ${p}`,
    var: (what) => `VAR · ${what}`, nogoal: (p) => `But refusé · ${p}`,
    yellowSub: 'Avertissement', y2Sub: 'Deux jaunes : exclu', penSub: 'Fauché dans la surface', penHand: 'Main dans la surface',
    redHow: { sfp: 'Faute grossière', violent: 'Comportement violent', dogso: 'Occasion nette annihilée', hand: 'Main : but empêché', '2y': 'Deux avertissements' },
  },
  c: {
    kickoff: ['L’arbitre {r} donne le coup d’envoi.', '{r} siffle, c’est parti.'],
    yellow: ['{r} avertit {s}.', 'Carton jaune pour {s}. {r} n’a pas hésité.', '{s} prend un jaune.'],
    yellowSpa: ['{s} casse la contre-attaque, {r} l’avertit.', 'Faute tactique de {s}. Jaune.'],
    yellowHand: ['Main de {s}. {r} sort le jaune.'],
    yellowDogso: ['{r} donne un jaune à {s}, pas un rouge : il jouait le ballon.'],
    yellowDissent: ['{s} conteste auprès de {r} et prend un jaune.'],
    yellowDive: ['{s} est averti pour simulation.'],
    yellowWaste: ['{r} avertit {s} pour gain de temps.'],
    y2: ['Deuxième jaune ! {r} exclut {s}.', '{s} reprend un jaune, {r} sort le rouge.'],
    red: ['Rouge direct ! {r} exclut {s}.', 'Carton rouge pour {s}. {r} n’a pas hésité.'],
    redDogso: ['{s} annihile une occasion nette : rouge de {r}.'],
    redViolent: ['Loin du ballon, {s} dérape. Rouge de {r}.'],
    redHand: ['{s} arrête un but de la main. Rouge.'],
    adv: ['{r} laisse l’avantage.', 'Bel avantage de {r}, le jeu continue.'],
    pen: ['{r} désigne le point de penalty ! {s} fauche {v}.', 'Penalty ! {s} fait tomber {v}.'],
    penHand: ['Main de {s} dans la surface ! {r} siffle penalty.'],
    nogoal: ['{s} marque, mais le but ne comptera pas.', '{s} croit avoir marqué…'],
    added: (n) => `Le quatrième arbitre annonce ${n} ${P(n, 'minute', 'minutes')} de temps additionnel.`,
    et: 'Égalité après quatre-vingt-dix minutes : prolongation.',
    etHalf: 'Mi-temps de la prolongation.',
    shootout: 'Toujours à égalité. Tirs au but.',
    tenMen: '{c} sont à dix et se réorganisent.',
  },
  varLine: (note, r, s) => {
    const [what, t, res, why] = note.split(':');
    const mon = t === 'ofr' ? `${r} va voir l’écran. ` : 'Vérification VAR. ';
    if (what === 'goal') {
      if (res === 'stands') return why === 'goal' ? 'Vérification terminée : le but est valable.' : 'Vérification terminée : pas de but, la décision est maintenue.';
      if (why === 'onside') return `VAR : ${s} n’était pas hors-jeu. But accordé !`;
      if (why === 'offside') return `VAR : ${s} était hors-jeu. But refusé.`;
      return `${mon}${why === 'apf' ? 'Faute dans l’action' : 'Main avant le but'}. But refusé.`;
    }
    if (what === 'pen') return 'Vérification terminée : le penalty est maintenu.';
    if (what === 'foul' || what === 'hand') return `${mon}${r} accorde le penalty.`;
    if (what === 'outside') return 'VAR : la faute était hors de la surface. Coup franc, pas penalty.';
    if (what === 'dive') return `${mon}Pas de penalty : ${s} s’est laissé tomber.`;
    if (what === 'redDown') return `${mon}Le rouge de ${s} devient un jaune.`;
    if (what === 'redUp') return `${mon}Décision changée : rouge pour ${s} !`;
    if (what === '2y') return `${mon}Le deuxième jaune de ${s} était une erreur. Il reste sur le terrain.`;
    if (what === 'id') return `VAR : mauvais joueur. Le carton est pour ${s}.`;
    if (what === 'violent') return `${mon}Comportement violent de ${s}. Rouge.`;
    return 'Vérification terminée.';
  },
  report: {
    title: 'L’arbitrage', fouls: 'Fautes sifflées', cards: 'Cartons', reviews: 'Visionnages', checks: 'Vérifications VAR', changed: 'Décisions changées',
    pens: 'Penaltys', added: 'Temps additionnel', noVar: 'Match sans VAR', noCards: 'Aucun carton.', addedFmt: (a, b) => `+${a} / +${b}`,
  },
};

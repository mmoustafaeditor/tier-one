import type { NVStrings } from './lang-nav';
export const NV_FR: NVStrings = {
  squadAreas: 'Rubriques de l’effectif',
  players: 'Joueurs', room: 'Vestiaire', training: 'Entraînement', medical: 'Médical', academy: 'Académie',
  news: 'Messages et actus', settings: 'Réglages',
  inboxLine: (n: number) => (n ? `${n} ${n === 1 ? 'nouveau message' : 'nouveaux messages'}` : 'Messages et actus'),
};

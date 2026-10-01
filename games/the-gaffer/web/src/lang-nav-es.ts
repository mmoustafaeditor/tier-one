import type { NVStrings } from './lang-nav';
export const NV_ES: NVStrings = {
  squadAreas: 'Secciones de la plantilla',
  players: 'Jugadores', room: 'Vestuario', training: 'Entrenamiento', medical: 'Médico', academy: 'Cantera',
  news: 'Buzón y noticias', settings: 'Ajustes',
  inboxLine: (n: number) => (n ? `${n} ${n === 1 ? 'mensaje nuevo' : 'mensajes nuevos'} en el buzón` : 'Buzón y noticias'),
};

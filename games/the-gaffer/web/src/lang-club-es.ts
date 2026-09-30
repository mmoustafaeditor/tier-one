// V2.7 Club vision, Spanish. Type-checked against lang-club.ts.
import type { CLStrings } from './lang-club';
const P = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const CL_ES: CLStrings = {
  tag: 'Reunión de la directiva',
  derby: 'Derbi',
  title: (season: string) => `El plan de la directiva para ${season}`,
  advice: (target: string) => `Nuestro objetivo: ${target}. Si apuntas más alto, el dueño te respaldará con dinero, pero te juzgaremos con más dureza.`,
  choices: {
    expected: () => 'Vuestro objetivo es el correcto',
    ambitious: (target: string) => `Apuntar más alto: ${target}`,
  },
  fx: {
    goodwill: () => 'Directiva +5',
    kitty: (v: string) => `${v} del dueño`,
    strict: () => 'Directiva más exigente',
    target: (t: string) => t,
  },
  board: {
    none: 'La directiva se reúne antes de las primeras jornadas.',
    expected: (t: string) => `Plan de temporada: el objetivo de la directiva, ${t}.`,
    ambitious: (t: string, v: string) => `Plan de temporada: ambicioso, ${t}. El dueño puso ${v}; la directiva juzga con más dureza.`,
  },
  build: {
    busy: (level: number, n: number) => `Construyendo nivel ${level} · listo en ${n} ${P(n, 'jornada', 'jornadas')}`,
    takes: (n: number) => `Tarda ${n} ${P(n, 'jornada', 'jornadas')}`,
    oneAtATime: 'Una obra a la vez',
    opened: (f: string, level: number) => `Se abre el nuevo ${f}: nivel ${level}.`,
  },
  ledger: { owner: 'Inversión del dueño', parachute: 'Pago de descenso' },
  awards: {
    title: 'Noche de premios',
    poty: 'Jugador de la temporada', young: 'Mejor joven', boot: 'Bota de Oro', keeper: 'Portero de la temporada', manager: 'Entrenador de la temporada',
    team: 'Once de la temporada', elsewhere: 'En otras ligas',
    goals: (n: number) => `${n} ${P(n, 'gol', 'goles')}`, rating: (v: number) => `media ${v.toFixed(1)}`, you: 'tú',
    ours: (n: number) => `${n} ${P(n, 'de los nuestros', 'de los nuestros')} en el once de la temporada.`,
  },
  legends: {
    title: 'Leyendas del club',
    none: 'Aún no hay leyendas. Hacen falta 200 partidos de liga aquí, u 80 goles, o 100 partidos y 2 títulos.',
    way: 'En camino',
    line: (apps: number, goals: number, trophies: number) => `${apps} ${P(apps, 'partido', 'partidos')} · ${goals} ${P(goals, 'gol', 'goles')} · ${trophies} ${P(trophies, 'título', 'títulos')}`,
  },
};

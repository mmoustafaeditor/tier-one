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
  press: {
    tag: 'Rueda de prensa',
    q: {
      predict: (opp: string) => `¿Puede ganar al ${opp}?`,
      star: (pn: string) => `¿Es ${pn} el hombre para este partido?`,
      rival: (opp: string) => `El entrenador del ${opp} dice que usted está nervioso.`,
      blame: (opp: string) => `¿Qué falló contra el ${opp}?`,
      ref: (opp: string) => `Esa roja contra el ${opp}. ¿Justa?`,
    },
    adv: {
      predict: 'Una respuesta prudente nunca cuesta nada. Si promete una victoria, hay que cumplir.',
      star: 'Si lo respalda en público, crecerá. Al resto le gusta oír que es cosa de todos.',
      rival: 'Busca una reacción. Si responde, la afición lo celebra, pero entonces hay que ganar.',
      blame: 'Mejor dentro del vestuario. Si señala a un jugador en público, le dolerá.',
      ref: 'Cargar contra el árbitro: la afición aplaude y la directiva se tensa.',
    },
    a: {
      predict: { measured: 'Los respetamos. Estaremos listos', confident: 'Vamos a ganar', deflect: 'Pregúnteme después del partido' },
      star: { measured: 'Es cosa de todo el equipo', confident: (pn: string) => `${pn} lo decidirá`, deflect: 'No hablo de individualidades' },
      rival: { measured: 'Que hable. Nosotros a lo nuestro', confident: 'Le responderemos en el campo, ganando', deflect: 'No he oído lo que dijo' },
      blame: { measured: 'Lo analizaremos juntos', confident: 'La culpa es mía', deflect: 'Mal día. Pasamos página', name: (pn: string) => `${pn} nos falló` },
      ref: { measured: 'Lo dejo en manos de los árbitros', confident: 'El árbitro se equivocó', deflect: 'No lo vi bien' },
    },
    fx: {
      squad: (n: string) => `Moral del equipo ${n}`, morale: (n: string) => `Su moral ${n}`, trust: (n: string) => `Su confianza ${n}`,
      board: (n: string) => `Directiva ${n}`, fans: (n: string) => `Afición ${n}`,
      claim: 'Promesa pública: si perdemos con ellos, directiva −3 y afición −4', safe: 'No cuesta nada',
    },
  },
  store: {
    base: 'Verde Semba', free: 'Gratis', buy: (price: string) => `Desbloquear · ${price}`, use: 'Usar', inUse: 'En uso',
    short: (n: number) => `Faltan ${n} cr`, bought: 'Estilo desbloqueado.',
    seasonEarn: 'Ganas 50 cr por cada temporada que terminas (las 10 primeras de una carrera).',
    seasonToast: (n: number) => `+${n} Semba Credits por terminar la temporada.`,
  },
};

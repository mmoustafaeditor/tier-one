// Copy for the officials (gf-ref), Spanish. Type-checked against lang-ref.ts.
import type { RefStrings } from './lang-ref';
const P = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const R_ES: RefStrings = {
  strict: ['Permisivo', 'Justo', 'Estricto', 'Muy estricto'],
  referee: 'Árbitro',
  varOn: 'VAR', varOff: 'Sin VAR',
  refLine: (r, s, v) => `Árbitro ${r} · ${s} · ${v ? 'con VAR' : 'sin VAR'}`,
  speeds: ['Lento', 'Normal', 'Rápido'],
  hlTitle: 'Resúmenes',
  hl: ['Solo comentario', 'Clave', 'Ampliados', 'Completos', 'Partido entero'],
  hlSpeed: 'Velocidad del partido en los resúmenes',
  wx: ['Despejado', 'Lluvia', 'Lluvia intensa', 'Viento', 'Calor', 'Nieve'],
  instant: 'Al instante',
  commentary: 'Narración', moments: 'Momentos clave',
  windows: (n) => `${n} ${P(n, 'ventana', 'ventanas')} restantes`,
  statsExtra: ['Rojas', 'Fueras de juego', 'Faltas a favor', 'Saques de banda', 'Saques de puerta'],
  tenMen: 'Con diez',
  suspended: 'Sancionado',
  suspendedIn: (comp, n) => `Sancionado: ${comp} (${n})`,
  outSuspended: (names) => `Sancionados: ${names}`,
  seq: {
    goal: 'GOL', nogoal: 'NO ES GOL', pen: 'PENALTI', playOn: 'Siga, siga', yellow: 'AMARILLA', red: 'ROJA', y2: 'SEGUNDA AMARILLA',
    check: 'Revisión del VAR…', ofr: 'Revisión en el campo', stands: 'Se mantiene la decisión', over: 'Decisión revocada',
    given: 'Gol válido', penGiven: 'Penalti', noPen: 'No es penalti', fk: 'Falta fuera del área',
    down: 'Roja anulada · amarilla', up: 'Se convierte en roja', rescind: 'Segunda amarilla anulada', id: 'Jugador equivocado · tarjeta corregida',
    why: { offside: 'fuera de juego', apf: 'falta previa', ahand: 'mano', onside: 'posición correcta', outside: 'fuera del área', dive: 'simulación', foul: 'falta', hand: 'mano', violent: 'conducta violenta', goal: 'gol', pen: 'penalti' },
  },
  ev: {
    yellow: (p) => `Amonestado · ${p}`, y2: (p) => `Segunda amarilla · ${p}`, pen: (p) => `Penalti · ${p}`,
    var: (what) => `VAR · ${what}`, nogoal: (p) => `Gol anulado · ${p}`,
    yellowSub: 'Amonestación', y2Sub: 'Doble amarilla: expulsado', penSub: 'Derribado en el área', penHand: 'Mano en el área',
    redHow: { sfp: 'Juego brusco grave', violent: 'Conducta violenta', dogso: 'Evitó una ocasión manifiesta', hand: 'Mano: evitó un gol', '2y': 'Doble amarilla' },
  },
  c: {
    kickoff: ['El árbitro {r} da comienzo al partido.', '{r} pita y arranca el partido.'],
    yellow: ['{r} amonesta a {s}.', 'Amarilla para {s}. {r} lo tuvo claro.', '{s} ve la amarilla.'],
    yellowSpa: ['{s} corta la contra y {r} le muestra amarilla.', 'Falta táctica de {s}. Amarilla.'],
    yellowHand: ['Mano de {s}. {r} saca la amarilla.'],
    yellowDogso: ['{r} muestra amarilla a {s}, no roja: iba a por el balón.'],
    yellowDissent: ['{s} protesta a {r} y ve la amarilla.'],
    yellowDive: ['{s} ve la amarilla por simular.'],
    yellowWaste: ['{r} amonesta a {s} por perder tiempo.'],
    y2: ['¡Segunda amarilla! {r} expulsa a {s}.', '{s} ve otra amarilla y {r} saca la roja.'],
    red: ['¡Roja directa! {r} expulsa a {s}.', 'Roja para {s}. {r} no dudó.'],
    redDogso: ['{s} evita una ocasión clara: {r} saca la roja.'],
    redViolent: ['Sin balón, {s} pierde los nervios. Roja de {r}.'],
    redHand: ['{s} evita un gol con la mano. Roja.'],
    adv: ['{r} da la ley de la ventaja.', 'Buena ventaja de {r}; sigue el juego.'],
    pen: ['¡{r} señala el punto de penalti! {s} derriba a {v}.', '¡Penalti! {s} tira a {v}.'],
    penHand: ['¡Mano de {s} en el área! {r} señala penalti.'],
    nogoal: ['{s} la mete, pero no subirá al marcador.', '{s} cree que ha marcado…'],
    added: (n) => `El cuarto árbitro muestra ${n} ${P(n, 'minuto', 'minutos')} de añadido.`,
    et: 'Empate tras noventa minutos: prórroga.',
    etHalf: 'Descanso de la prórroga.',
    shootout: 'Sigue el empate. Penaltis.',
    tenMen: '{c} se quedan con diez y se reorganizan.',
  },
  varLine: (note, r, s) => {
    const [what, t, res, why] = note.split(':');
    const mon = t === 'ofr' ? `${r} va al monitor. ` : 'Revisión del VAR. ';
    if (what === 'goal') {
      if (res === 'stands') return why === 'goal' ? 'Revisión completada: el gol sube al marcador.' : 'Revisión completada: no es gol, se mantiene la decisión.';
      if (why === 'onside') return `VAR: ${s} estaba en posición correcta. ¡Gol válido!`;
      if (why === 'offside') return `VAR: ${s} estaba en fuera de juego. No es gol.`;
      return `${mon}${why === 'apf' ? 'Falta previa' : 'Mano antes del gol'}. No es gol.`;
    }
    if (what === 'pen') return 'Revisión completada: el penalti se mantiene.';
    if (what === 'foul' || what === 'hand') return `${mon}${r} señala penalti.`;
    if (what === 'outside') return 'VAR: la falta fue fuera del área. Falta, no penalti.';
    if (what === 'dive') return `${mon}No es penalti: ${s} se dejó caer.`;
    if (what === 'redDown') return `${mon}La roja a ${s} se queda en amarilla.`;
    if (what === 'redUp') return `${mon}Cambia la decisión: ¡roja para ${s}!`;
    if (what === '2y') return `${mon}La segunda amarilla a ${s} era un error. Sigue en el campo.`;
    if (what === 'id') return `VAR: jugador equivocado. La tarjeta es para ${s}.`;
    if (what === 'violent') return `${mon}Conducta violenta de ${s}. Roja.`;
    return 'Revisión completada.';
  },
  report: {
    title: 'El arbitraje', fouls: 'Faltas señaladas', cards: 'Tarjetas', reviews: 'Revisiones en el campo', checks: 'Revisiones del VAR', changed: 'Decisiones cambiadas',
    pens: 'Penaltis', added: 'Añadido', noVar: 'Partido sin VAR', noCards: 'Sin tarjetas.', addedFmt: (a, b) => `+${a} / +${b}`,
  },
};

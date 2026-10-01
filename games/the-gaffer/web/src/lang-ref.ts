// Copy for the officials (gf-ref): the referee, cards, penalties, VAR, added time, extra time, match speed.
// English is the reference; lang-ref-{ar,es,fr}.ts are type-checked against it. {r} referee, {s} player, {v} the
// player fouled, {n} a number.
const P = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const R_EN = {
  strict: ['Lenient', 'Fair', 'Strict', 'Very strict'] as [string, string, string, string],
  referee: 'Referee',
  varOn: 'VAR', varOff: 'No VAR',
  refLine: (r: string, s: string, v: boolean): string => `Referee ${r} · ${s} · ${v ? 'VAR in use' : 'no VAR'}`,
  speeds: ['Slow', 'Normal', 'Fast'] as [string, string, string],
  wx: ['Clear', 'Rain', 'Heavy rain', 'Windy', 'Hot', 'Snow'] as string[], // matchday weather (engine/weather.ts)
  instant: 'Instant',
  commentary: 'Commentary', moments: 'Key moments',
  windows: (n: number): string => `${n} ${P(n, 'window', 'windows')} left`,
  statsExtra: ['Red cards', 'Offsides', 'Free kicks', 'Throw-ins', 'Goal kicks'] as [string, string, string, string, string],
  tenMen: 'Down to ten',
  suspended: 'Suspended',
  suspendedIn: (comp: string, n: number): string => `Suspended: ${comp} (${n})`,
  outSuspended: (names: string): string => `Suspended: ${names}`,
  // Banner phases: incident → the referee's call → VAR → the final ruling.
  seq: {
    goal: 'GOAL', nogoal: 'NO GOAL', pen: 'PENALTY', playOn: 'Play on', yellow: 'YELLOW CARD', red: 'RED CARD', y2: 'SECOND YELLOW',
    check: 'VAR check…', ofr: 'On-field review', stands: 'Decision stands', over: 'Decision overturned',
    given: 'Goal given', penGiven: 'Penalty given', noPen: 'No penalty', fk: 'Free kick outside the box',
    down: 'Red card rescinded · yellow', up: 'Upgraded to a red card', rescind: 'Second yellow rescinded', id: 'Wrong player · card corrected',
    why: { offside: 'offside', apf: 'foul in the build-up', ahand: 'handball', onside: 'onside', outside: 'outside the box', dive: 'simulation', foul: 'foul', hand: 'handball', violent: 'violent conduct', goal: 'goal', pen: 'penalty' } as Record<string, string>,
  },
  // Key moments on the timeline.
  ev: {
    yellow: (p: string): string => `Booked · ${p}`, y2: (p: string): string => `Second yellow · ${p}`, pen: (p: string): string => `Penalty given · ${p}`,
    var: (what: string): string => `VAR · ${what}`, nogoal: (p: string): string => `No goal · ${p}`,
    yellowSub: 'Caution', y2Sub: 'Two cautions: sent off', penSub: 'Fouled in the box', penHand: 'Handball in the box', redHow: { sfp: 'Serious foul play', violent: 'Violent conduct', dogso: 'Denied an obvious goal', hand: 'Handball: denied a goal', '2y': 'Two cautions' } as Record<string, string>,
  },
  // Commentary.
  c: {
    kickoff: ['Referee {r} gets us under way.', '{r} blows his whistle, and we’re off.'],
    yellow: ['{r} books {s}.', 'Yellow card for {s}. {r} had no doubts.', '{s} goes into {r}’s book.'],
    yellowSpa: ['{s} stops the break, and {r} books him for it.', 'A cynical one from {s}. Yellow card.'],
    yellowHand: ['Handball by {s}. {r} shows yellow.'],
    yellowDogso: ['{r} shows {s} yellow, not red: he was going for the ball.'],
    yellowDissent: ['{s} has words with {r} and is booked for dissent.'],
    yellowDive: ['{s} is booked for simulation.'],
    yellowWaste: ['{r} books {s} for time-wasting.'],
    y2: ['Second yellow! {r} sends {s} off.', '{s} is booked again, and {r} shows red.'],
    red: ['Straight red! {r} sends {s} off.', 'That’s a red card for {s}. {r} didn’t hesitate.'],
    redDogso: ['{s} denies a clear chance: {r} shows red.'],
    redViolent: ['Off the ball, {s} lashes out. Red card from {r}.'],
    redHand: ['{s} stops a goal with his hand. Red card.'],
    adv: ['{r} plays advantage.', 'Good advantage from {r}; play goes on.'],
    pen: ['{r} points to the spot! {v} is brought down by {s}.', 'Penalty! {s} brings down {v}.'],
    penHand: ['Handball in the box by {s}! {r} points to the spot.'],
    nogoal: ['{s} puts it in, but it won’t stand.', '{s} thinks he’s scored…'],
    added: (n: number): string => `The fourth official shows ${n} ${P(n, 'minute', 'minutes')} of added time.`,
    et: 'Level after ninety minutes: extra time.',
    etHalf: 'Half-time in extra time.',
    shootout: 'Still level. Penalties.',
    tenMen: '{c} are down to ten, and reorganise.',
  },
  // A VAR event's line. note = what:check|ofr:stands|over[:why].
  varLine: (note: string, r: string, s: string): string => {
    const [what, t, res, why] = note.split(':');
    const mon = t === 'ofr' ? `${r} goes to the monitor. ` : 'VAR check. ';
    if (what === 'goal') {
      if (res === 'stands') return why === 'goal' ? 'VAR check complete: the goal stands.' : 'VAR check complete: no goal, the decision stands.';
      if (why === 'onside') return `VAR check: ${s} was onside. The goal is given!`;
      if (why === 'offside') return `VAR check: ${s} was offside. No goal.`;
      return `${mon}${why === 'apf' ? 'A foul in the build-up' : 'Handball before the goal'}. No goal.`;
    }
    if (what === 'pen') return 'VAR check complete: the penalty stands.';
    if (what === 'foul' || what === 'hand') return `${mon}${r} gives the penalty.`;
    if (what === 'outside') return 'VAR check: the foul was outside the box. A free kick, not a penalty.';
    if (what === 'dive') return `${mon}No penalty: ${s} went down too easily.`;
    if (what === 'redDown') return `${mon}The red card for ${s} becomes a yellow.`;
    if (what === 'redUp') return `${mon}It’s upgraded: red card for ${s}!`;
    if (what === '2y') return `${mon}The second yellow for ${s} was wrong. He stays on.`;
    if (what === 'id') return `VAR check: wrong player. The card goes to ${s}.`;
    if (what === 'violent') return `${mon}Violent conduct by ${s}. Red card.`;
    return 'VAR check complete.';
  },
  report: {
    title: 'The officials', fouls: 'Fouls given', cards: 'Cards', reviews: 'On-field reviews', checks: 'VAR checks', changed: 'Decisions changed',
    pens: 'Penalties', added: 'Added time', noVar: 'No VAR at this match', noCards: 'No cards.', addedFmt: (a: number, b: number): string => `+${a} / +${b}`,
  },
};
export type RefStrings = typeof R_EN;

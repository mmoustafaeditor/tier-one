// Copy for V2.7 Club vision (the pre-season board meeting, facility builds, the parachute). English is the reference;
// lang-club-{ar,es,fr}.ts are type-checked against it. Voice: the boardroom. Plain, short, what it costs.
const P = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const CL_EN = {
  tag: 'Board meeting',
  derby: 'Derby',
  title: (season: string): string => `The board’s plan for ${season}`,
  advice: (target: string): string => `Our target: ${target}. Aim higher and the owner will back you with money, but we’ll judge you harder.`,
  choices: {
    expected: (): string => 'Our target is right',
    ambitious: (target: string): string => `Aim higher: ${target}`,
  },
  fx: {
    goodwill: (): string => 'Board +5',
    kitty: (v: string): string => `${v} from the owner`,
    strict: (): string => 'Stricter board',
    target: (t: string): string => t,
  },
  board: {
    none: 'The board meets before the season’s first matchdays.',
    expected: (t: string): string => `Season plan: the board’s target, ${t}.`,
    ambitious: (t: string, v: string): string => `Season plan: ambitious, ${t}. The owner put in ${v}; the board judges harder.`,
  },
  build: {
    busy: (level: number, n: number): string => `Building level ${level} · ready in ${n} ${P(n, 'matchday', 'matchdays')}`,
    takes: (n: number): string => `Takes ${n} ${P(n, 'matchday', 'matchdays')}`,
    oneAtATime: 'One build at a time',
    opened: (f: string, level: number): string => `The new ${f} is open: level ${level}.`,
  },
  ledger: { owner: 'Owner’s investment', parachute: 'Parachute payment' } as Record<string, string>,
  awards: {
    title: 'Awards night',
    poty: 'Player of the Season', young: 'Young Player', boot: 'Golden Boot', keeper: 'Goalkeeper of the Season', manager: 'Manager of the Season',
    team: 'Team of the Season', elsewhere: 'Around the leagues',
    goals: (n: number): string => `${n} ${P(n, 'goal', 'goals')}`, rating: (v: number): string => `avg ${v.toFixed(1)}`, you: 'you',
    ours: (n: number): string => `${n} of ours in the Team of the Season.`,
  },
  legends: {
    title: 'Club legends',
    none: 'No legends yet. It takes 200 league games here, or 80 goals, or 100 games and 2 trophies.',
    way: 'On the way',
    line: (apps: number, goals: number, trophies: number): string => `${apps} ${P(apps, 'game', 'games')} · ${goals} ${P(goals, 'goal', 'goals')} · ${trophies} ${P(trophies, 'trophy', 'trophies')}`,
  },
  // V2.9 press conferences (sim/press.ts): one card per question; Measured never costs anything.
  press: {
    tag: 'Press conference',
    q: {
      predict: (opp: string): string => `Can you beat ${opp}?`,
      star: (pn: string): string => `Is ${pn} the man for this one?`,
      rival: (opp: string): string => `${opp}’s manager says you’re feeling the heat.`,
      blame: (opp: string): string => `What went wrong against ${opp}?`,
      ref: (opp: string): string => `That red card against ${opp}. Fair?`,
    },
    adv: {
      predict: 'A measured answer never costs us. Promise a win and we’d better deliver.',
      star: 'Back him in public and he’ll grow. The rest of the lads like to hear it’s about the team.',
      rival: 'He wants a reaction. Fire back and the fans love it, but then we have to win.',
      blame: 'Keep it in the dressing room if you can. Name a player in public and he’ll take it hard.',
      ref: 'Go after the referee and the fans cheer, the board winces.',
    } as Record<string, string>,
    a: {
      predict: { measured: 'We respect them. We’ll be ready', confident: 'We’ll win it', deflect: 'Ask me after the game' },
      star: { measured: 'It’s about the whole team', confident: (pn: string): string => `${pn} will decide it`, deflect: 'No talk about individuals' },
      rival: { measured: 'Let him talk. We focus on us', confident: 'We’ll answer him on the pitch, with a win', deflect: 'I haven’t heard what he said' },
      blame: { measured: 'We’ll look at it together', confident: 'That one’s on me', deflect: 'Bad day. We move on', name: (pn: string): string => `${pn} let us down` },
      ref: { measured: 'I’ll leave it to the officials', confident: 'The referee got it wrong', deflect: 'I didn’t see it properly' },
    },
    fx: {
      squad: (n: string): string => `Squad morale ${n}`, morale: (n: string): string => `His morale ${n}`, trust: (n: string): string => `His trust ${n}`,
      board: (n: string): string => `Board ${n}`, fans: (n: string): string => `Fans ${n}`,
      claim: 'Public claim: lose to them and it’s board −3, fans −4', safe: 'Costs nothing',
    },
  },
};
export type CLStrings = typeof CL_EN;

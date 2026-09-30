// Copy for V2.7 Club vision (the pre-season board meeting, facility builds, the parachute). English is the reference;
// lang-club-{ar,es,fr}.ts are type-checked against it. Voice: the boardroom. Plain, short, what it costs.
const P = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const CL_EN = {
  tag: 'Board meeting',
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
};
export type CLStrings = typeof CL_EN;

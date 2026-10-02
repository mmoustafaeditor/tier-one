// Weather on matchday (light, like FM's): picked once per match from its key and the home country's climate, the same
// for both sides. It changes how the game is played, never who is favoured: a wet ball makes short combinations and
// carrying it through midfield harder and the long ball more attractive, wind spoils long balls and crosses, heat and
// heavy pitches tire players, slippery ground means more slips into fouls and knocks. Missing (old saves) = clear.
export type Wx = 0 | 1 | 2 | 3 | 4 | 5; // clear, rain, heavy rain, wind, heat, snow
export const WX = {
  combo: [0, -0.04, -0.08, 0, 0, -0.06],  // short combinations between the lines (duel logit)
  prog: [0, -0.02, -0.05, 0, 0, -0.05],   // carrying it through midfield
  long: [0, 0, 0.05, -0.08, 0, 0],        // the long ball (a heavy pitch invites it, the wind spoils it)
  air: [0, 0, 0, -0.06, 0, 0],            // crosses, headers and corners
  foul: [1, 1.05, 1.1, 1, 1, 1.06],       // slips into tackles
  tire: [1, 1, 1.05, 1, 1.1, 1.05],       // fatigue per minute
  inj: [1, 1.08, 1.15, 1, 1.05, 1.15],    // knocks (the background chance)
};
// Climate by country: [clear, rain, heavy rain, wind, heat, snow] weights.
const NORTH = [46, 24, 9, 12, 5, 4], SOUTH = [64, 12, 4, 8, 12, 0], HOT = [68, 2, 0, 6, 24, 0];
const CLIMATE: Record<string, number[]> = {
  ENG: NORTH, SCO: NORTH, GER: NORTH, NED: NORTH, BEL: NORTH, FRA: [54, 18, 6, 10, 9, 3],
  ESP: SOUTH, ITA: SOUTH, POR: SOUTH, TUR: SOUTH, BRA: [55, 15, 6, 5, 19, 0], ARG: SOUTH, USA: [56, 14, 5, 8, 15, 2],
  EGY: HOT, KSA: HOT, UAE: HOT, QAT: HOT, MAR: [70, 6, 1, 8, 15, 0],
};
const hashS = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; };
export function weatherFor(key: string, country: string): Wx {
  const w = CLIMATE[country] ?? [60, 14, 5, 9, 10, 2];
  let u = (hashS(`wx:${key}`) % 10000) / 10000 * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { u -= w[i]; if (u < 0) return i as Wx; }
  return 0;
}

// How an AI manager adapts to the day (like FM's AI), kept to what the engine shows really pays (sim-tests/wxai.ts):
// in the wind, long balls and crosses die, so it keeps the ball on the ground, plays narrower and takes corners
// short; in the heat it keeps the ball and makes the other side run. Heavy rain and snow change nothing: going
// direct on a heavy pitch was measured to cost more than the long-ball edge (WX.long) gives back, and a lower press
// in the heat costs more chances than the legs it saves. Clear skies and light rain change nothing either.
type Knobs = { passing: number; build: number; width: number; routine: number };
export function weatherPlan(t: Knobs, wx: Wx): Partial<Record<'passing' | 'build' | 'width' | 'routine', number>> {
  const p: Record<string, number> = {};
  if (wx === 3 || wx === 4) { p.passing = Math.min(1, t.passing); p.build = Math.min(1, t.build); }
  if (wx === 3) { p.width = Math.min(1, t.width); if (t.routine === 1) p.routine = 2; }
  // Only what actually changes (a knob already there is not a change to log).
  for (const k of Object.keys(p)) if (p[k] === (t as Record<string, number>)[k]) delete p[k];
  return p;
}

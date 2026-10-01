// The live pitch's "physics file" (plan: "محرك ماتش FM26", phase 1), like FM's simatch\physics\physical_constraints.jsb:
// every number that sets how players move lives here, so the feel of the pitch can be tuned in one place. Times are in
// display time: a match minute plays in a few real seconds, so speeds and delays scale with the speed setting
// (`tau` = max(120, 0.9 × ms per match minute), the time an average player takes to cover most of a gap).
export const T = {
  // Body
  VMAX: 34,          // top speed of an average player, metres per tau
  ACC_TAU: 0.22,     // an average player reaches top speed in this share of tau
  TURN: 2.6 * Math.PI, // how far an average player at speed can turn, radians per tau (a full about-turn in ~0.4 tau)
  TURN_SPEED: 0.35,  // the turn limit applies above this share of top speed (a standing player turns freely)
  // Perception and decisions
  DECIDE: 0.5,       // a player looks again every this share of a beat (FM: every quarter second of match time)
  DECIDE_MS: [50, 250] as [number, number],
  REACT: [0.12, 0.6] as [number, number], // reaction to a new ball (pass, turnover, shot) as a share of a beat: best, worst reader
  REACT_MS: [30, 420] as [number, number],
  // Sprint tank (0-1): sprinting drains it, jogging refills it
  SPRINT: 1.12,      // a speed boost above this is a sprint
  DRAIN: 1.1,        // a full tank of an average player lasts 1 / DRAIN match minutes of flat-out sprinting
  REFILL: 0.35,      // tank refilled per match minute when not sprinting
  EMPTY: 0.15,       // below this the player can't sprint (his boost is capped at SPRINT)
};

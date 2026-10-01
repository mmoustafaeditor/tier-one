// The live pitch's "physics file" (plan: "محرك ماتش FM26", phase 1), like FM's simatch\physics\physical_constraints.jsb:
// every number that sets how players move lives here, so the feel of the pitch can be tuned in one place. Times are in
// display time: a match minute plays in a few real seconds, so speeds and delays scale with the speed setting
// (`tau` = max(120, 0.9 × ms per match minute), the time an average player takes to cover most of a gap).
export const T = {
  // Body
  VMAX: 44,          // top speed of an average player, metres per tau
  ACC_TAU: 0.18,     // an average player reaches top speed in this share of tau
  TURN: 2.6 * Math.PI, // how far an average player at speed can turn, radians per tau (a full about-turn in ~0.4 tau)
  TURN_SPEED: 0.35,  // the turn limit applies above this share of top speed (a standing player turns freely)
  // Perception and decisions
  DECIDE: 0.5,       // a player looks again every this share of a beat (FM: every quarter second of match time)
  DECIDE_MS: [50, 250] as [number, number],
  REACT: [0.12, 0.6] as [number, number], // reaction to a new ball (pass, turnover, shot) as a share of a beat: best, worst reader
  REACT_MS: [30, 420] as [number, number],
  // Sprint tank (0-1): sprinting drains it, jogging refills it
  SPRINT: 1.12,      // a speed boost above this is a sprint
  DRAIN: 0.8,        // a full tank of an average player lasts 1 / DRAIN match minutes of flat-out sprinting
  REFILL: 0.6,      // tank refilled per match minute when not sprinting
  EMPTY: 0.15,       // below this the player can't sprint (his boost is capped at SPRINT)
  // Phase 2: the defence as a group
  THREAT: 32,        // attackers within this many metres of our goal are marked
  MARK_REACH: 20,    // a marker takes a man within this many metres of him
  MARK_ROLE: 10,     // metres added to a marker's cost when the man isn't his kind of job (see Pitch2D)
  MARK_TIGHT: 1.4,   // goal-side gap to his man within 20 m of goal
  MARK_LOOSE: 2.6,   // ... and further out
  SLIDE: 0.35,       // how far the line's centre shifts towards the ball's side
  LINE_WIDTH: 40,    // the back line is never wider than this
  GK_OUT: [1.2, 7] as [number, number], // keeper's distance off his line: at least, at most
  GK_OUT_K: 0.12,    // ... growing by this per metre the ball is away
  GK_SHUFFLE: 8,     // the keeper's quick side-steps across his goal: he tracks the angle much faster than a runner closes a gap
  BLOCK_GAP: 1.6,    // a blocker stands this far from the ball in the shooting lane
  // Foundation step 5: the marking instruction (tactics marking: zonal / mixed / man), × the mixed values above
  MARK_REACH_K: [0.7, 1, 1.25] as [number, number, number], // how far a marker goes for a man
  THREAT_K: [0.85, 1, 1.1] as [number, number, number],   // how far from goal attackers get a man
  ZONE_BOX: 16,      // zonal: a defender leaves the line for his man only inside this distance of goal
  SET_ZONAL: [11, 3, 0] as [number, number, number],       // corners: how many defenders hold zones (the rest mark men)
};

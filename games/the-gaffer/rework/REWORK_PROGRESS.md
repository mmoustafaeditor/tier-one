# The Gaffer rework — progress ledger

Kept current across sessions. Nothing here is deployed: work is on branch `claude/repo-coordination-lbro4r`, not merged
to `main` (the user has not authorised deployment).

## Milestone 0 — ground truth: done
* `REWORK_BASELINE.md` (build, data, save, tests, F01–F17 dispositions), `REWORK_STATE_MAP.md`, `REWORK_SCREEN_MAP.md`,
  `REWORK_FEATURE_LEDGER.md`.
* Reproduction: `node sim-tests/build.mjs rework/repro` (prints OPEN/OK per item).

## Milestone 1 — restore trust: done (F01, F02, F03, F04, F09 fixed; F17 verified and hardened)
* Regression: `node sim-tests/build.mjs rework/trust` — 25 checks, all pass.
* Full sim suite after M1: 42/43 pass, `marking` the same sampling-noise check as the baseline. Engine fingerprint
  unchanged (`a04af554a49efa49`), season unchanged (2.87 goals, 44.5% home, 22.8% draws).
* Screenshots (390 and 1440, EN and AR): `evidence/m1-before/` (build of `6f56572`) and `evidence/m1-after/`, made with
  `ui-tests/rework-shots.mjs`.

## Milestone 2 — make decisions usable: in progress
Done (regression checks in `rework/trust`, 33 checks, all pass; screenshots `evidence/m2-before|after/`):
* **F10** Today "Available for <day>": counts the next match's competition bans and rests (`availabilityFor`, the
  rule selection uses); tired players are available but flagged ("n not fully fit"); reasons per player.
* **F08** win/draw/loss rounded together (`pct3`, always 100); single chances never 0%/100% (`pctOf`, `pct1`).
* **F06** the manager's best XI (assistant at kick-off, "Best XI for me", holes in his XI) = one assignment over the
  whole XI (Hungarian, `assignXI`/`bestXI` in `sim/tactics.ts`); Tactics lists why a man plays out of position against
  the best natural player left out. **Scoped to the user's side.** The first version moved AI clubs too; the full suite
  then showed four calibrated statistical tests drifting (aiprep, referee ten-men, rolespitch, traitsengine; all pass on
  the M1 commit), and tuning engine weights to win them back was chasing sample noise. AI clubs keep the slot-by-slot
  pick (`autoXI`) until Milestone 4 recalibrates with it. Engine fingerprint is back to `a04af554a49efa49`; season seed 7
  2.86 goals / 44.6% / 23.1% (the user club's own picks differ). The `morale` floor is back at 35.
* **F05** Promote opens a sheet (Academy tab and Player page): squad place, contract and wage, and the prospect promise
  (10 apps in 20 league matchdays or a loan); academy cards' promote choice shows the promise too. `promotionTerms` is
  what the command applies (test).
* **F11** quick match ends on a read-only full time (score, xG, officials, ratings, analysis) with Back / Change teams /
  Rematch; nothing touches a career (throwaway career, never saved).
* Bottom-bar ghost buttons readable (full time, quick match).

* **F12** half-time: the team talk is staged with the suggested changes and the sub; nothing restarts until "Second
  half" (before: choosing a talk restarted the match at once and dropped the picked changes). Browser check
  `ui-tests/rework-ht.mjs` (fails on the old build, passes now).
* **Continue** says its next step everywhere, phones included: "n to decide", "Next: matchday", "Back to the match",
  "Season review", "Your career" (same order as `App.cont`).
* **F15** courses state effect, permanence, once-only and reputation before paying (the numbers are the engine's:
  fatigue ×0.85, press ×1.03, youth growth ×1.15, defeats hurt morale less).
* **F13** season review cup chips say won / runners-up / out in the semi-finals… instead of a bare name.
* **F07** half-time sub suggestion only for a man actually flagging (< 80% fit) and never one who scored or assisted.
* **F14** checked, not reproduced: digest counters are scoped to the sim run (`staffCallsSince(seq0)`), xG chart
  markers group a scorer's goals ("Haaland ×2").

* **Recruitment funnel**: Transfers is four numbered stages (Needs & scouting → Shortlist & search → Negotiations →
  Deals & loans) with a sub-switch where a stage holds two views; all seven views and deep links unchanged. Search is one
  tap further (nav test budget 2 → 3, recorded there). Evidence `evidence/m2c-*`.
* Observed for F07 (open): for Al Ahly's ageing keeper the scouts' first pick is a 35-year-old external keeper — the
  audit's succession example; needs an age/horizon term in `sim/recruit/picks.ts`.

* **F07 recruitment** done: succession picks weigh age against the starter's horizon (test: 6/6 clubs).
* **First-week guide** on Today (`ui2/Guide.tsx`, `lang-guide.ts`, 4 languages): five steps ticked off by the career's
  own state (board meeting, staff split, plan set, opponent report, first match), "Show me" deep links, hideable,
  gone after the first matches. Evidence `evidence/m2d-after/`.
* **Width gate** `ui-tests/overflow.mjs`: every area and tab at 320/360/390/412 px, EN and AR, no sideways scroll.
  It caught a regression of this rework (long effect chips widened Today to 518 px) and older ones (Club hero/tabs
  at 320-360, Tactics action row and a Targets card at 320); all fixed, gate passes.

M2 status: the trust items F05–F15 are done or checked. Tactics now uses progressive disclosure: style, shape, approach,
press and line stay; "More instructions · n set" opens shape without the ball, width, tempo, passing, transitions, set
pieces and marking (remembered per device; it never hides a setting silently). Evidence `evidence/m2e-after/` (before:
`evidence/m1-before/03-tactics-*`). Open M2 polish: decision cards' "why it matters" and confidence.

## Milestone 3 — connected career-memory slice: first slice done
* `sim-tests/rework/slice.ts` (seeded, Node): promote a 17-year-old (sheet terms = applied terms) → the dressing room
  holds the pathway promise (10 games in 20 league matchdays) → delegated selection leaves him out → the assistant's
  card flags it 2 matchdays before it can't be kept, with the sporting cost → the manager starts him (his XI, F01) → he
  plays (here a cup tie, which counts) → the promise counts it → 10 games: kept, trust 65 → 77, a message citing the
  event → the staff never transfer-listed him → save + reload: same promise record, same XI. All checks pass.
* `ui-tests/rework-slice.mjs` (browser, phone): the same path in the real build (promotion sheet → card on Today →
  start him → "Your XI" with him → full-time ratings → page reload → player page with promise progress). Passes;
  screenshots `evidence/m3-slice/`.
* Fixes found by the slice: prospect promises never warned before breaking (now they do); the staff could list or
  sell a player with an open promise (now they don't); the assistant's advice said "Saturday" for a Wednesday cup tie.

Next: M3 pilot arcs (broken promise, derby/board pressure) on the same rails; M2 polish; M4/M5 validation.

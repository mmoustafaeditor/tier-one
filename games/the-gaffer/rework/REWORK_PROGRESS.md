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
* **F06** best XI = one assignment over the whole XI (Hungarian, `assignXI` in `sim/tactics.ts`) for the user and AI
  clubs; Tactics lists why a man plays out of position against the best natural player left out.
  Results changed (AI clubs pick better XIs): fingerprint `3879e6cc016b8942` (was `a04af554a49efa49`); season seed 7:
  2.87 goals, home 43.6%, draws 23.6% (was 2.87 / 44.5% / 22.8%); seed 11: 2.87 / 44.1% / 23.7%. formations, rolebal,
  roles, sanity, world, parity, room, recruit, youth, v2core, tactics, single pass. `morale` floor lowered 35 → 33 with the
  measured spread written in the test (lowest club average 34.96 on seed 7, a struggling side; before 40).
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

Next (M2 rest): onboarding (first-week guide, skippable), Today decision cards (why it matters, confidence), Tactics
basic/advanced layers, recruitment funnel (7 chips → 4 stages). Then M3 connected career-memory slice.

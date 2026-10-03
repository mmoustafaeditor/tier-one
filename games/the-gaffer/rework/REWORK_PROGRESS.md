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

## Milestone 2 — make decisions usable: next
Order: F10 availability → F08 forecast rounding → F05 promotion sheet → F06 best XI with reasons → F11 quick-match
full time → F12 half-time draft → Continue blocker label → F07/F13/F14/F15 checks.

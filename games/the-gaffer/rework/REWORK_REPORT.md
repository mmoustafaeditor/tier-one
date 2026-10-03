# The Gaffer rework — reviewable state report

Branch `claude/repo-coordination-lbro4r`, not merged to `main`, not deployed (deployment not authorised). Every claim
below links to a test or a screenshot made from the running build in this container (Node 22, Chromium via Playwright;
no named Android device was available — see Known limitations).

## 1. What changed (player-facing release notes)
* The XI you pick is the XI that plays, in quick results and watched matches alike; Tactics says whose XI it is.
* One "today": the header, Today and every message agree on the date; deadlines are counted in matchdays; "window
  shuts tonight" only on deadline day.
* One deal quote: Today and the negotiation room show the same "room after".
* The board never offers "aim higher" when the target is already the top one; after a job move, the old club's
  results, plan, instalments and talks stay with the old club.
* Saves keep the previous copy; a save that doesn't load opens the one before it, and says so.
* "Available for Sat" counts the right bans and flags tired players; win/draw/loss always add to 100%.
* Best XI for your team picks the best eleven together, and Tactics says why anyone plays out of position.
* Promoting an academy player shows the commitment first; his pathway promise warns before it breaks; the staff won't
  list or sell a player you gave your word to.
* Quick match ends on a full-time screen with Rematch; half-time stages the team talk with your changes; Continue says
  what it does next; courses say what they do; cup runs say how far you went; full time links to what to do next.
* Transfers is one four-step funnel; Tactics shows the essentials first; a first-week guide on Today.
* Nothing is wider than a phone at 320–412 px, in English or Arabic.

## 2. F01–F17 disposition
See `REWORK_BASELINE.md` (table) — F01, F02, F03, F04, F05, F07, F08, F09, F10, F11, F12, F13, F15 fixed; F06 fixed for
the manager's side (AI clubs deferred, see §6); F14 not reproduced; F17 not reproduced and hardened; F16 open (M3+).
Current-code reproduction: `node sim-tests/build.mjs rework/repro` → every checked item OK.

## 3. Test report (this container, final state `fac4989`)
| Suite | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | clean |
| Sim tests (43) | `node sim-tests/build.mjs <name>` | 42 pass; `marking` fails one sampling-noise check, same as the baseline (passes at 4,000) |
| Trust regressions | `rework/trust` | 33+ checks pass (F01–F10, F17, F07 picks) |
| Career-memory slice | `rework/slice` | pass (promote → warn → start → plays → kept → reload) |
| Broken-promise arc | `rework/arcs` | pass |
| Navigation (4 languages) | `ui-tests/nav.mjs` | pass (Search budget 2 → 3 taps, funnel) |
| Width gate 320/360/390/412, EN/AR | `ui-tests/overflow.mjs` | pass |
| Half-time staging, Continue label, courses | `ui-tests/rework-ht.mjs` | pass (fails on the old build: F12 reproduced) |
| Browser slice | `ui-tests/rework-slice.mjs` | pass |

## 4. Balance report
Engine fingerprint unchanged from the baseline (`a04af554a49efa49`): the rework did not change how matches are
decided. Season seed 7 (5,784 league matches): 2.86 goals/game, home wins 44.6%, draws 23.1% (baseline 2.87 / 44.5 /
22.8 — the user club's own XI picks differ). Speed: ~2.7 ms a fast match, ~19 ms a full watched match in this
container. The F06 attempt to move AI clubs to the new XI pick was measured and reverted (it shifted four calibrated
tests; see `REWORK_PROGRESS.md`).

## 5. Migration notes
Save format version unchanged (8). New optional fields, all read with defaults so old saves load unchanged:
`vision.club` (absent = the current club), slot records `100+n` (the previous save of slot n). No data is rewritten on
load. Rollback: older builds ignore both fields.

## 6. Known limitations (not hidden)
* AI clubs still pick their XI slot by slot (F06 for AI) — a results change that needs its own recalibration (M4).
* F16 (contextual conversations) and the derby/board arc as authored content are not built; the systems exist.
* No Android device test, no WebView back/resume run, no named-device benchmark in this environment.
* No human comprehension sessions (the handoff's human gates) — none could be run here.
* The `marking` test is noisy at its default sample size (pre-existing).
* The first-week guide's "hidden" choice is per device (localStorage), by design.

## 7. Release checklist (web + Android), when deployment is authorised
1. Merge the branch to `main` (CI `build-the-gaffer.yml` builds web + APK and publishes the web build).
2. Check `/the-gaffer/version.json` shows the new build; installed apps hot-update from it.
3. Open an existing save from the live build (slot load + previous-copy fallback), and a `.gaffer` export.
4. Spot-check Today, Tactics, Transfers funnel, a quick match and a career match at 390 px, in Arabic.
5. No Android wrapper change was made (`android/` untouched): no new APK required.

## 8. Next backlog
* P0: none open from the trust backlog.
* P1: AI best XI with recalibration (M4); Android/WebView resume + import on a named device; human first-hour test.
* P2: F16 contextual talks; Today "World pulse"; analysis "tactical causes" tab; scenarios / Tactics Lab modes.

## 9. Evidence index
`evidence/m1-before|after` (Today/board, inbox dates, Tactics), `m2-before|after` (promotion sheet, availability,
quick-match full time), `m2b-before|after` (half-time staging, Continue, courses), `m2c-before|after` (Transfers
funnel), `m2d-after` (first-week guide), `m2e-after` (Tactics essentials), `m3-slice` (the connected sequence:
promotion sheet → warning card → Your XI → full time → after reload). Phone 390 px and desktop 1440 px, English and
Arabic where the screen changed.

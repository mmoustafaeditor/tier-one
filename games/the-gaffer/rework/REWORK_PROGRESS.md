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
`evidence/m1-before/03-tactics-*`). Decision cards show the adviser's confidence (from staff quality); the board's advice no longer mentions "aim higher" where it isn't offered. M2 done.

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

* Pilot arc **broken promise** (`sim-tests/rework/arcs.ts`): warned, let go, never played → broken (0 of 10), trust
  65 → 45, morale 66 → 55, he asks for a word, message and news name it, the next talk is "broken". Passes.
  Derby/board pressure already exists and is covered by `sim-tests/world.ts` (a derby defeat costs ×1.5 with the board)
  and the press cards ("feeling the heat").

* **F16** contextual talks (`rework/talks`): "scored", "debut" (homegrown first game) and "dropped" from the last match
  here, once each, cooldown kept; no invented reasons. Fingerprint unchanged.
* **M4** full-time "What to do next" links (tactics / training / needs / dressing room) from the analysts' findings.

* Full time "Why it happened": the analysts' top three findings (engine record), marked good/bad. Evidence
  `evidence/m4-after/`. Today's "World pulse" already exists (Headlines panel: the latest three news items → News).

Decision (Saif, 2026-10-03): AI clubs keep their current XI selection; the best-XI assignment stays on the manager's side only.
Update (Saif, later on 2026-10-03): approved moving AI clubs to the best-XI pick, with the balance recalibrated (see
"AI clubs on the best XI" below).

* Pre-match "Three things for this match": the two biggest numbers edges either way from the match model (ours, where
  they crowd us, their danger zone) plus what the scouting report knows; "Open tactics" link. Read-only, no result change.
  Evidence `evidence/m4c-after/`.

* Title screen: the career card shows manager, season, matchday, league position (after the first match), the next
  league fixture (home/away) and when it was last played; an empty slot is a "Start a 2026/27 career" card. The new
  save-description fields are optional (`SaveMeta.pos/of/next`): older saves show the old card until saved again, no
  migration needed. `ui-tests/rework-title.mjs`; evidence `evidence/m4d-before|after/`.

* Squad planner (Squad screen, handoff §D): one card per line (GK/DEF/MID/ATT) with roles (first choice / rotation /
  prospects, from the dressing-room roles), deals ending this season / next (heat colour), average age and 31+, who is
  out, and the needs the scouts derive from Plan A (`needs()`, the same list Transfers › Needs shows; a chip opens it).
  Folded to one summary row on phones so the player list stays inside the nav budget; open on wider screens; the
  choice is remembered. Read-only. `ui-tests/rework-planner.mjs`; evidence `evidence/m4e-before|after/`.
  Not done from §D: Plan B fit, registration/homegrown status (no competition in the game requires it yet).

* Accessibility before a career starts (handoff §A, §19): an "Accessibility" button on the title screen and the same
  panel in Settings. Text size (standard / larger / largest, page zoom 1.1 / 1.2), Reduce motion (stops CSS
  animations and the live-match flashes/whistle; shown on and locked when the device asks for reduced motion), Stronger
  contrast (secondary text and lines). Device prefs, not the save; survive reloads. No sideways scroll at the largest
  size on Today/Squad/Match/Transfers/Club, EN and AR. `ui-tests/rework-a11y.mjs`; evidence `evidence/m4f-before|after/`.

* New career, club page (handoff §B.2): "About the job" with the club's league rank by squad strength and by budget,
  average age against the league, its derbies (from `sim/rivalry.ts`; they count 1.5× with the board) and how many of
  the first eleven are out of contract next summer. Facts only. `ui-tests/rework-job.mjs`; evidence
  `evidence/m4g-before|after/`.
* Full suite re-run: 46/47 sim tests pass (`marking` baseline noise), fingerprint unchanged; all UI gates pass.

* Decision memory (handoff §C): a role-promise card quotes how far it has got ("started 1 of 5" for a role, "0 played
  so far" for a prospect, next to the matchdays left). `rework/slice` checks the card carries it. The browser slice now
  also recognises the staff keeping the promise themselves (match prep is delegated in "The usual split", so the
  assistant may start the kid mid-sim); that run then skips the card steps and says so instead of failing.
  Evidence `evidence/m4h-after/`.

Next: M5 validation items possible here (save round-trip/slot isolation checks, full-suite run), then the report.

* **M5 here:** `rework/lifecycle` (3 seasons: checks, exact save round trip, two-slot isolation, sane bands), ES/FR
  width gate (found and fixed Spanish/French overflow at 320–390 px), `ui-tests/perf.mjs` numbers, compatibility and
  rollback notes (report §7b–7c).

* **AI clubs on the best XI (Final plan item 2, in progress).** `aiXI` in `sim/tactics.ts` is the one switch AI
  selection goes through (match and dressing room); it now uses `bestXI`. Engine fingerprint changes
  `a04af554a49efa49` → `3879e6cc016b8942` (approved). Balance, 9 staff-run seasons (`rework/aixi`, 3 clubs × seeds 7–9):
  AI starters out of position 5.9% → 0.6%; goals 2.887 → 2.916; home wins 44.0% → 44.6%; draws 22.9% → 22.1%; the
  user's points a game 1.798 → 1.775 (within noise). Tests that moved:
  - `aiprep`: the points half of "the read helps" was sample noise at 600 matches; at 2,400 it passes (+0.025 pts,
    +0.18 xG). Default raised to 2,400.
  - `referee` ten men: one sending-off depended on who it was (−0.26 a 90 for this one); now also checks the average
    over losing any outfield player: −0.56 a 90 (0.26–0.80). Passes.
  - `rolespitch`: 4 matches gave press_fullback ~300 frames; at 32 matches every role passes. Default raised to 32.
  - **Closed (Saif: "tune the engine numbers"):** `TRAIT.MOVE` 0.8 → 1.0; composure now measured against the side's own
    shooters (open-play share) so it moves goals between them and adds none (traits on vs off: goals +0.1%, it was
    +1.5% before), with `TRAIT.CALM` 0.8 → 1.5 so the effect stays clear (composed finishers +0.011–0.014 goals over xG
    a shot, test wants 0.01). Morale: below 40 the pull back to normal is 30% instead of 20%, same rule for every
    squad; the lowest club now averages 43–46 on seeds 7–10 (was 33–35). `rolespitch` default 64 matches
    (press_fullback +1.5 m; 32 still swung ±0.8 m). `pitch` checks move.ts buildUp directly: quiet minutes went from
    3 in 900 to none in 2,700, so the old check had nothing to measure.
  - Final engine fingerprint `7116eb372ed61d68`. Balance (9 staff-run seasons): goals 2.854, home 44.6%, draws 22.6%,
    the user's points a game 1.72 (1.80 before AI sides picked a best XI: they are a little harder to beat).
* **M4 match polish:** `rework/agree` plays 400 matches (100 cup ties: 21 to extra time, 11 to penalties) minute by
  minute and checks that score, stats, cards, shots, commentary (goals, VAR, disallowed goals), ratings, the
  "Why it happened" score and xG, red-card minutes and highlights (no key moment ever skipped in any mode) all agree
  with the event log: all pass. Found and fixed one display mismatch: "Why it happened" could round an xG of 4.95 to
  4.9 while the full-time chart showed 4.95 (now rounded through the two-decimal value). Match › Fixtures opens with
  "What keeps happening": record, xG a match and the analysts' findings that came back over the last six matches,
  each bad one linking to its screen (`ui2/Trends.tsx`, `ui-tests/rework-trends.mjs`).
* **Player page (§I):** "In your 4-3-3": starts at …, would start ahead of …, pushing …, behind …, or no natural
  place (`sim/planfit.ts`, `rework/planfit`, `ui-tests/rework-planfit.mjs`); exact only when the scouts know him.
  Evidence `evidence/m4i-after/`.

* **Medical (§G):** "Fit, not match-ready": not injured but below 78% fitness (MATCH_SHARP), with the matchdays back
  at the game's own +12% a matchday and the rest switch. Often empty after a one-match week; fills in cup weeks.
  `ui-tests/rework-medical.mjs`.

* **Dressing room (§E):** "What happened in the dressing room": talks (with their tone), answers to requests, the
  armband, promises kept or broken, requests to talk or leave, new leaders, departures, read from the season's event
  log (the talk/answer command events now record the tone and the answer); turning points marked. The same history,
  for one player, on his page ("Between you and him"). `ui2/RoomLog.tsx`, `rework/roomlog`.
* **Training (§F):** "The fitness coach's week": his proposal (intensity and focus) with its reasons (squad fitness
  against his "tired" line, the next opponent), "Use his week" applies it. The coach's own delegated call and the
  proposal are one function (`sim/staff.ts weekPlan`), so they can't differ: `rework/weekplan` (40 of 40 weeks).
* **Academy (§H):** each loan club says the playing time (his role there, from who is better in his position) and the
  team's level against his; the first suggestion is marked when he would start. `ui-tests/rework-screens3.mjs`;
  evidence `evidence/m4j-after/`.

* **Last sections (Saif: "finish everything that can be done here"):**
  - §S News: sections (All, Our club, Results, Transfers, Managers, Youth, Records, Crisis, Dressing rooms) with counts;
    "Our club" items marked. Each item already had its category.
  - §Q Board: "Why it moved" — the board's last eight confidence moves, each with its cause (a result against what they
    expected, derby ×1.5; press answers; a public claim; the weekly table check; the season plan; the season review),
    recorded where confidence moves (`sim/boardlog.ts`). `rework/boardlog`: every move equals the sum of its causes
    (29 of 29 over half a season).
  - §Q Facilities: a forecast under each affordable upgrade (cash after paying, +upkeep a month, the lowest point left
    this season and when).
  - §H Academy: Under 18 / Under 21 groups with size, average and how many are ready.
  - §R Career: "Your style, from what you've done": the plan in use, the market (spent vs raised, signings' age),
    promises kept vs broken, homegrown players in the squad, departments run yourself. Read from the career.
  - §E Memory: the dressing room remembers its turning points across seasons (`RoomState.memory`, 60 kept); the
    timeline adds what the season log no longer holds (`rework/roomlog` checks the armband survives a season change).
  - §F Training: "This week": the next seven days around the real fixtures (match, recovery after, light before, your
    intensity and focus between), the game's own two-match-week rule, and a note that the sim applies the week whole.
  - Save size: last seasons' opponent reports are pruned at tidy (never read again; ~20 KB a season). Academies level
    off (kids leave at 20); rating histories are capped at 60. Not changed (it would change results): the world's
    player count rises ~350 a season (intakes outnumber retirements).
  - `ui-tests/rework-screens4.mjs`; evidence `evidence/m4k-after/`.

## Final plan (Saif, 2026-10-03: "do everything, then merge")
1. M5 validation possible here: multi-season regression, save round-trip / slot isolation, ES/FR width gate, browser
   performance numbers, rollback plan.
2. AI clubs on the best-XI assignment + balance recalibration (results change; Saif approved; before/after numbers).
3. M4 match polish: commentary / stats / pitch agree with the engine's events; analysis across several matches.
4. Remaining handoff screens (dressing room, training, medical, academy, player page, club, news): result-neutral items.
5. Merge into `main` (merge commit; main merged in first), check the Gaffer workflow and the live site.

## Deferred, to revisit (Saif, 2026-10-03: "keep these in mind if they really should be done") — done 2026-10-03
Saif asked for all three to close the game out. What was built, and where it stops:
1. **World size bounded** (`sim/season.ts` `FREE_MAX = 400`): the cause was the free-agent pool, not intakes vs
   retirements — released academy kids and unsigned expired contracts piled up (160 → 2,424 free agents in three
   seasons). At season end the 400 most valuable stay on the market and the rest leave the game (anyone the career
   still refers to stays). Players over three seasons 8,422 → 8,530 → 8,496 → 8,386 (was → 9,165 → 10,413); the
   packed save grows ~60 KB a season (874 → 993 KB), half what it did. `rework/lifecycle`, `youth`, `world` and
   `fingerprint` pass; top-100 talent 85.9 → 86.7 over three seasons (band ±3).
2. **Training microcycle, on the weekly model** (`ui2/Training.tsx`): the week strip places the sessions the intensity
   gives (Light 2 / Normal 3 / Heavy 4) on the free days around the fixtures and the rest as days off; "Give them a
   day off" / "Extra session" move the intensity one step (`training.set`). The game still applies the week as a
   whole, so results don't change; a per-day simulation was not built (it would need its own balance pass).
3. **Tactics Lab** (`sim/lab.ts`, pre-match "Try another plan"): the next match in the engine's own odds for every
   style, in this shape or another; Use applies it (`tactics.set`) and the tunnel's odds become that row's (tested,
   `rework/lab` and `ui-tests/rework-lab.mjs`). Scenario modes were not built.
   **Narrative events:** the handoff §S examples were checked against the game. Already there: contract asks and
   "playing above his role" (form spike), academy pathway promises, the board moving targets, broken promises, press
   questions, derbies. Missing and added: **the captain challenges the rotation policy** (`room.ts` `rotating`, ask
   `rotation`): 17+ different league starters in the last five and ≤1 win in the last five matches; uses the existing
   ask system (talk options, ignored = morale/trust hit, ask cooldowns, room log). `rework/captainrot`. Sponsor
   activation conflicts were not added (no sponsor-activation system to conflict with).

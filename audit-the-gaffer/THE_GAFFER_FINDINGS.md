# The Gaffer: findings

Audited build: **The Gaffer 2.1.0, web build 29846333** (`the-gaffer/version.json`), repo `mmoustafaeditor/tier-one`
at `865bc2b` (branch `claude/repo-coordination-lbro4r`, identical to `origin/main`). The last The Gaffer source commit is
`aa929cb` (bot publish, 2026-09-30). The live `https://www.sembagames.app/the-gaffer/` was byte-identical to the repo
build: SHA-256 `9c1f1af2…db322d` matched. Test date: 2026-09-30. Environment: Linux container, Playwright Chromium
(headless), viewports 390×844 (phone) and 1440×900 (desktop), plus a width sweep from 320 to 768 px. Headless
simulations used the game's own `sim/` modules, bundled with esbuild.

The scale and the evidence rules are in `THE_GAFFER_DESIGN_AUDIT.md` §2. Evidence paths are relative to
`audit-the-gaffer/evidence/`.

| ID | Title | Category | Severity | Status |
|---|---|---|---|---|
| GF-001 | Live-match **Changes** button (subs, shape, instructions) is off-screen on every phone width | UX issue (functional on phones) | **High** | reproduced |
| GF-002 | The user's side gets engine bonuses AI sides never get; user-managed clubs overperform | broken dependency / balancing | **High** | reproduced (sim A/B) + code-confirmed |
| GF-003 | AI morale death spiral: losing AI squads sink to the morale floor and the tables polarise | balancing concern | **High** | reproduced (sim) + code-confirmed |
| GF-004 | Board and fans judge favourites structurally harshly; a 2nd-placed Man City is sacked, a double-winning Al Ahly's fans "mutter" | balancing concern | Medium | reproduced (sim + UI) |
| GF-005 | Following staff recommendations strips the squad to the 16-player floor and piles up unused cash | balancing / design weakness | Medium | reproduced (sim) |
| GF-006 | Real players have no Arabic names: Latin script inside Arabic sentences | content issue | Medium | reproduced (UI) + code-confirmed |
| GF-007 | Today header and "Fit for" lose their day word once the user's league is over | functional bug (text) | Low | reproduced (UI) + code-confirmed |
| GF-008 | Board objective lines are ungrammatical ("They want win the league", "They want stay up") | content issue | Low | reproduced (UI) + code-confirmed |
| GF-009 | Depth chart counts one bench player as cover for several slots; cards overlap on phones | UX issue | Low | reproduced (UI) + code-confirmed |
| GF-010 | Cash-runway chart repeats a month label (13 "months" a season) | functional bug (display) | Low | reproduced (UI) + code-confirmed |
| GF-011 | League picker says "Real squads · 18 clubs" for Egypt/Saudi (6 real clubs each); generated Egyptian players carry Gulf/West-African surnames | content issue | Low | reproduced (UI) + code-confirmed |
| GF-012 | High-press preset looks close to dominant in the engine's own closed form | balancing concern | Low | suspected (partially verified) |
| GF-013 | Transfers header ignores an agreed fee that is waiting on personal terms; parallel bids are each checked alone | UX issue | Low | code-confirmed + UI observation |
| GF-014 | Android update feed carries an unrelated Tier One merge message as The Gaffer's changelog | content / ops | Low | reproduced (live API) |
| GF-015 | Season-end wage ratchet raises every player's wage, mid-contract included | design recommendation | Low | code-confirmed |
| GF-016 | Contradictory staff advice on the same player (list him, then "he's part of this place, make them pay") | content issue | Low | reproduced once (UI) |

What was checked and found working is in `THE_GAFFER_DESIGN_AUDIT.md` §4. Examples: injuries, substitutions, the
negotiation flow, mid-match resume, the season transition, quick-match isolation, RTL layout, and zero console errors.

---

## GF-001 · Live-match "Changes" button is unreachable on phones
- **Category / severity / status:** UX issue with functional impact · **High** · reproduced.
- **Tested:** 2.1.0 build 29846333, Chromium, Al Ahly career, live league match.
- **Preconditions:** a live match open in the match screen (`Walk out`) on a viewport ≤ 480 px wide.
- **Steps:** 1) Start a career and walk out for any match. 2) Look at the fixed bar at the bottom. 3) Measure the
  Changes button (the evidence script `harness/widths.mjs` does this at 320, 360, 375, 390, 412, 430, 480, 540, 600 and
  768 px).
- **Expected:** the in-match changes sheet (subs, shape, approach, press, line, roles) can be reached on the phone
  layout the game targets (Android WebView, `QA.md` used 412×915). Basis: `ENGINE.md` › Presentation and V2_DESIGN
  §8.2 ("Live … sticky sub bar · Change / Continue").
- **Actual:** the bar's content is 519 px wide inside a 366 px container. `Changes` sits at x = 399–531 px at every
  width from 320 to 480, so it is off-screen; `Instant` is clipped. The page cannot scroll sideways because the bar is
  `position: fixed`. It becomes reachable at ≥ 540 px. At desktop width it is at x = 961–1092.
- **Impact:** on phones, manual substitutions and tactical changes are unreachable for the whole match. The only
  in-match lever left is the single substitution the half-time "Why" card suggests, plus the touchline shouts.
  Injuries and red cards can't be answered with a player's own choice.
- **Evidence:** `screens/A-A14-live-viewport.png`, `screens/C-C05-live-360.png`, `screens/A-A13-changes.png`
  (full-page), `screens/C-C04-live-desktop.png`. The width sweep output is in this file above. The sheet works when
  opened programmatically: `screens/A-A15-changes-sheet.png`, and a sub made that way scored at 47′
  (`screens/A-A16-ft-live.png`).
- **Owner / location:** `web/src/ui2/Live.tsx:232-243` (`.mbar` markup) and
  `web/src/styles/look/components.css:315-321`. `.mbar .seg { flex: none }` keeps the five speed buttons at full width.
- **Repair direction:** make the bar fit narrow screens. For example, let `.seg` shrink or scroll, collapse the speeds
  into one cycling control on narrow screens, or move `Instant` into an overflow menu. Keep `Changes` always visible
  and at least 48 px tall.
- **Acceptance:** at 320, 360, 390, 412 and 480 px, `Changes`, pause, the speed control and `Instant` all sit fully
  inside the viewport. No horizontal page scroll. Tap targets ≥ 44 px. The Arabic (RTL) layout is also fine.
- **Regression tests:** a Playwright check at those widths in EN and AR that asserts the bounding rects of the bar's
  buttons fall inside `innerWidth`, and that tapping `Changes` opens the sheet.
- **Confidence:** high (measured, with the code cause). Uncertainty: on-device WebView font metrics could differ
  slightly, but the overflow is about 150 px.

## GF-002 · User-side-only engine bonuses: user-managed clubs overperform
- **Category / severity / status:** broken dependency / balancing · **High** · reproduced in a seeded simulation A/B,
  cause code-confirmed.
- **Preconditions:** any career.
- **Steps (A/B):** for seeds 7–10 and six clubs (Zamalek, Haras El Hodoud, Ipswich, Man City, Al-Hazem, Getafe),
  simulate one season with the user at `ita-bologna`, so all six are AI. Then simulate the same seed with the user at
  each club, taking the staff-recommended choice on every decision (no skill applied). Compare that club's points.
  Harness: `harness/fair.ts`; data: `sim/fair.jsonl`, `sim/user-vs-ai-ab.csv`.
- **Expected:** a club run on staff defaults should perform about as the AI runs it. Player skill should make the
  difference (V2_DESIGN §0.4: staff act through the same commands, so there's parity; the V2.3 acceptance names a
  "staff-parity test ±4 pts").
- **Actual:** the club earned more points when user-managed in 19 of 24 same-seed pairs (2 ties, 3 lower). Mean
  **+0.37 points per game**, about +14 points over a 38-game season:
  Zamalek +0.31, Haras +0.29, Ipswich +0.26, Man City +0.31, Al-Hazem +0.67, Getafe +0.39. Examples: Al-Hazem
  14 → 46 pts (18th → 9th), Getafe 26 → 54 (19th → 10th), and user-managed Zamalek won the title in 4 of 4 seeds
  against 1 of 4 as AI. For Man City and Haras, a run where **no decision was answered** (`mode=ignore`) also gained,
  so the edge doesn't come from choices.
- **Cause (code):** `web/src/sim/match.ts:136-141`. Only the user's side gets `mods.level` = assistant quality / 100
  (≈ +0.35 to +0.7 rating levels) plus `cohLevel(cohesion)`, up to +2. In the user's match the opponent gets
  `AI_COH` (+0.4) (`match.ts:153-154`). AI-vs-AI games get neither. Morale also moves only through the user's dressing
  room systems (`roomDay`, the talk, the psychologist target in `season.ts:171`), while AI clubs follow the bare
  ±6 / +1 drift (see GF-003). The user's XI and shape are also re-optimised every matchday by `staffPrep`, while AI
  sides use `aiTactics`.
- **Impact:** decisions feel less meaningful, because a small club overperforms without the player doing anything,
  and tables, board objectives and the difficulty setting all read off inflated user results.
- **Repair direction:** give AI sides the same inputs as the user: an assistant-quality equivalent and cohesion,
  either per club or at least the same league-average value in AI-vs-AI and user games. Or make the user's modifiers
  relative to a neutral baseline everyone shares. Then re-tune `TUNE.HOME` / `PREP_EDGE` if needed.
- **Acceptance:** repeat the A/B (the same 6 clubs × 4 seeds, staff-defaults and `ignore` modes). The mean
  |Δ points/game| is ≤ 0.10, and no club gains more than 0.2 on average. Existing `sim-tests/sanity` bands
  (goals 2.6–3.0, home wins 42–47 %, draws 22–27 %) still hold.
- **Regression tests:** add `sim-tests/parity.ts`, a seeded A/B for 2–3 clubs that asserts the bound above. It fails
  if user-only modifiers creep back in.
- **Confidence:** high that an edge exists (19/24 pairs, large effect). Medium on how much each cause contributes;
  the repair agent should ablate them one by one.

## GF-003 · AI morale death spiral
- **Category / severity / status:** balancing concern · **High** · reproduced (sim) + code-confirmed.
- **Steps:** simulate a season with the user outside England and Egypt (`harness/morale.ts`, seed 7). At matchday 30,
  print each club's average and minimum squad morale.
- **Expected:** morale should move with results but settle back towards normal (the comment at `season.ts:179`:
  "morale drifts back to normal"). A weak AI side should not be locked at the floor.
- **Actual (`sim/ai-morale-r30-seed7.txt`):** Premier League bottom six at matchday 30: average morale 23, 11, 10, 7,
  8, 8, with minimums at the floor (6); points 26, 23, 20, 18, 15, 12. Leaders: 87–97. Egypt: Pharco 8, ENPPI 18,
  Bank Ahly 20; Al Ahly 92. The A/B runs show the same (AI Al-Hazem average morale 17 over a season, AI Ipswich 22–27).
- **Cause (code):** `season.ts:113-116` gives ±6 per result to players who played (±2 minus 1 to the rest).
  `season.ts:180` drifts back by only ±1 per matchday. So a side losing more than about a third of its games heads to
  the floor. Morale feeds the engine: every attribute gets `(morale − 60) / 20` in `engine/model.ts:149,585` and
  `tactics.ts:114`, so morale 8 is about −2.6 on every attribute of every player. Losing makes losing likelier.
- **Impact:** tables polarise (Hull 12 pts from 30 games). The league winner runs away (Liverpool 82 pts from 30).
  This also inflates the user's results against weak AI (feeds GF-002), board expectations, and the value of
  "giant-killing".
- **Repair direction:** stronger mean reversion (e.g. drift a proportion of the gap, not ±1), a softer floor or
  diminishing loss penalties, or a cap on the engine's morale term. Apply the same rules to AI and user squads.
- **Acceptance:** across 3 seeds, at matchday 30 no top-flight AI club averages below about 35 morale. Bottom-three
  points per game stays in a plausible band (for example ≥ 0.6). The `sanity` bands hold.
- **Regression tests:** a seeded season test asserting the league-wide morale distribution and a points-spread band.
- **Confidence:** high.

## GF-004 · Board and fans are structurally harsh on favourites
- **Category / severity / status:** balancing concern · Medium · reproduced (sim + UI).
- **Evidence:**
  - Man City, seed 7, staff defaults (`sim/eng-man-city.json`): season 1 was 2nd with 92 pts, board 65 → 45. Season 2
    was 2nd again at matchday 45 with 33 W / 7 D / 10 L and 108 goals, board 12, fans 7 → **sacked**. The board
    trajectory falls steadily while the team wins about 66 % (`perRound`).
  - Calibration (`sim/calib.jsonl`): the kickoff odds the board uses (`expectedPoints`, `season.ts:229-236`)
    overestimate mid and weak user clubs. Ipswich expected 1.11 points per game, actual 0.62; Getafe 1.71 vs 1.34.
    Elite clubs sit close to the maximum (City 2.3–2.4), so every draw or loss is a large negative "surprise"
    (`coach.ts:176-194`, ×1.8 board, ×4 fans).
  - The weekly table term only turns positive once the objective is met (`season.ts:392-409`). A club 2nd behind a
    title rival bleeds confidence all season.
  - UI: Al Ahly won the league and cup in the UI season, and the fans were **"Muttering" (46)**
    (`screens/A-A34-season-over.png`). Brighton met "top half" 5 seasons running with fans 21–43
    (`sim/long-brighton.json`).
- **Expected:** a title-chasing favourite 2nd with a 66 % win rate shouldn't face the sack; fans of a double winner
  shouldn't mutter. The game's own text promises "The board also reads the table" and a season review that "weighs
  how far off the objective you finished" (QA.md).
- **Repair direction:** anchor board and fans to a realistic baseline. Use calibrated expected points (or damp the
  surprise term for heavy favourites), give "close to objective" partial credit in `tableMood`, add fan credit for
  trophies and for league position against pre-season expectation, and review `sackLine` for top-3 sides.
- **Acceptance:** across 3 seeds × 2 seasons each for Man City, Real Madrid and Al Ahly on staff defaults, nobody is
  sacked while in the top 2. Fans end ≥ 60 after a title. The mean surprise per game is within ±0.1 across the
  calibration clubs.
- **Confidence:** medium-high. The sacking happened in 1 of 3 two-season City runs; the fans pattern shows in every
  run.

## GF-005 · Staff defaults strip the squad and hoard cash
- **Category / severity / status:** balancing / design weakness · Medium · reproduced (sim).
- **Steps:** a five-season career taking the staff-recommended choice on every decision (declining job offers):
  `harness/career.ts eng-brighton 5 11` and `egy-zamalek 5 12`.
- **Actual:** Zamalek's squad went 30 → 19 → 16 and stayed at 16 (the selling floor). Cash went €9M → €74M, about
  218 months of its €340K wage cap. Season-1 ledger: transfers out €19.1M. Brighton went 26 → 16/17, with cash
  €50M → €55–74M. The 3-season runs show the same: Al Ahly 30 → 22 (cash €12M → €33M), Al-Hilal 30 → 23. The
  decisions driving this are the recommended picks on incoming bids (`offer/offer`, `offer/rc.rivalBid`) and loans
  out, while the default split ("Signings wait for you") never buys (`kinds` in `sim/long-*.json`).
- **Expected:** "The usual split" (the staff pick at onboarding) should keep a workable squad. Money should create
  decisions (V2_DESIGN §0.1: every system has a cost and a consequence).
- **Impact:** a player who follows advice slowly ends up with a thin squad and a pile of money that has no sink,
  above all in the Egyptian and Saudi leagues.
- **Repair direction:** make recruitment advice squad-aware (don't recommend selling below the positional needs
  `recruit/needs.ts` already computes). Have the staff raise a "sign a replacement" decision when a sale opens a hole.
  Consider cash sinks that fit the design, such as facility builds or board requests (V2.7 "Club vision" is still
  unbuilt).
- **Acceptance:** over 5 seasons on staff defaults for three clubs, the squad stays ≥ 22 with every position
  covered, and cash doesn't exceed about 3 seasons of the wage bill without a surfaced decision to use it.
- **Confidence:** medium-high (consistent in 4 runs). Whether it's a "bug" depends on intended delegation, so it's
  classed as a design weakness.

## GF-006 · Real players have no Arabic names
- **Category / severity / status:** content issue · Medium · reproduced (UI) + code-confirmed.
- **Steps:** switch to عربي (Club › Settings) and open Today, Squad and Match.
- **Actual:** every real player shows in Latin script inside Egyptian-Arabic sentences, e.g. "الشارة لـAchraf Dari" and
  the squad list "Mostafa Shobeir", "Emam Ashour". Clubs, staff and generated players do get Arabic names.
- **Cause:** `web/src/sim/seed.ts:99` and `:252` set `name: { en: r.name, ar: r.name }`, and the data rows
  (`data/real.ts`) carry no Arabic name.
- **Evidence:** `screens/B-B02-today-ar.png`, `screens/B-B03-squad-ar.png`, `screens/B-B05-match-ar.png`.
- **Repair direction:** add an Arabic name column to the data snapshot, at least for the Egyptian and Saudi squads
  and prominent Arab players, and use it for `name.ar`/`short`. Transliteration for the rest is optional. Keep
  English as the fallback. Don't change the other languages.
- **Acceptance:** in AR, Egyptian and Saudi real players show in Arabic script; mixed-script strings keep correct
  bidi order.
- **Confidence:** high.

## GF-007 · Missing day word after the user's league ends
- Low · reproduced + code-confirmed. **Steps:** finish your league while others play on, then open Today.
  **Actual:** "Nothing on your desk. **’s all that matters.**" and the panel title "Fit for" with no day
  (`screens/A-A34-season-over.png`). **Cause:** `ui2/Today.tsx:40-41` and `:159-163` pass `dayWord = ''` into
  `x.today.head` / `x.today.fit` (`lang-v2.ts:82,93`) when there is no next match. **Fix:** use a season-over
  headline and hide or retitle the availability panel. **Acceptance:** no dangling possessive in EN/AR/ES/FR.
  **Test:** a UI snapshot at season end.

## GF-008 · Ungrammatical board objective line
- Low · reproduced + code-confirmed. "1st now. They want **win the league**." / "They want **stay up**."
  (`screens/A-A18-today-md2.png`, `screens/C-C03-today-desktop.png`). **Cause:** `lang-v2.ts:102` `boardWhy` puts the
  objective phrase (`i18n.ts` objective strings) after "They want". **Fix:** an infinitive-ready objective phrase set
  ("to win the league"), or rephrase. Check AR/ES/FR use their own forms. **Test:** a string test over all objectives.

## GF-009 · Depth chart overstates cover and overlaps on phones
- Low · reproduced + code-confirmed. **Actual:** "Hady Reyad" covers both CBs, "Ahmed Eid" covers LB and LW, "Saaiy"
  both CMs (`screens/B-B03-squad-ar.png`; the same pattern in EN in the first session). Cards overlap and truncate names
  on a 390 px phone. **Cause:** `ui2/Squad.tsx:34-40` picks the best cover per slot independently, so one player can
  "cover" several slots and the colour states (Covered/Thin) overstate depth. **Fix:** assign cover without reuse
  (a greedy or bipartite pass) and mark reused cover as thin. Space the pitch cards for narrow screens.
  **Acceptance:** no player appears as cover twice; no overlap at 360 px.

## GF-010 · Cash runway repeats a month
- Low · reproduced + code-confirmed. EN axis "… Dec | Jan | Jan | Feb …", AR "أبريل | أبريل"
  (`screens/A-A29-money.png`, `screens/B-B06-club-ar.png`). **Cause:** `ui2/Office.tsx:54-55` steps every 4 matchdays
  (28 days) and labels each step by month, giving 13 points a season. **Fix:** label by real calendar month (bucket
  the matchdays) or label ticks by date. **Test:** unique month labels for a full season.

## GF-011 · "Real squads" label and generated names in Egypt/Saudi
- Low · reproduced + code-confirmed. The league picker marks Egypt and Saudi "Real squads · 18 clubs"
  (`NewCareer.tsx:29,75`: any league with one real club counts as covered), while the title screen correctly says
  "the big six of Egypt and Saudi Arabia". The other 12 clubs have generated players, and Egyptian clubs field
  "T. Al Kuwari", "Y. Al Wakrawi", "I. Al Thubaiti", "M. Akinwumi" (transfer search, club list). **Fix:** label
  "6 real · 12 generated clubs" and weight the name generator by the club's country. **Acceptance:** a label that
  matches the data; mostly Egyptian names at generated Egyptian clubs.

## GF-012 · High press looks close to dominant (needs a proper check)
- Low · **suspected / partially verified**. The repo's `sim-tests/tactics` (`sim/simtest-tactics.txt`) shows
  gegenpress as the best preset in 13 of 16 fixtures (mean E[pts] 1.77 vs 1.58–1.73). In the UI, choosing "Press,
  then run in behind" moved Al Ahly's forecast from 83 % to 90 % (`screens/A-A10-tactics-press.png`). ENGINE.md
  claims "best preset depends on the fixture". Caveats: that test uses the old generated world, and the fatigue and
  injury costs of pressing aren't in the closed-form E[pts]. **Repair direction:** re-run on the real 2026/27 world,
  including fatigue and injury over a run of matches, before any change. **Acceptance for a change:** no preset best
  in more than about 50 % of fixtures, and the spread stays in the 0.3–0.5 target.

## GF-013 · Agreed fee not shown as committed
- Low · code-confirmed + UI observed. After Zamalek accepted €6.9M for Mohamed Sobhy, and before personal terms, the
  Transfers header still read "€12M spending room · €0 committed", while the talks card said "Room left €4.7M"
  (`screens/A-A25-today-md3.png`, `screens/A-A26-talks.png`). `recruit/money.ts:10-18` counts only completed
  commitments. `recruit/deals.ts:148` checks each bid alone, and `:200` blocks an overspend only at completion, so
  there is no money loss. The risk is a second agreed deal that later fails on "budget". **Fix:** show agreed-but-
  unsigned fees as "reserved" and include them in the bid check. **Test:** two parallel bids over the budget are
  refused at bid time with a clear reason.

## GF-014 · Wrong changelog in the Android feed
- Low · reproduced (live API). `GET /api/the-gaffer/latest` returns `"changelog": "Merge remote-tracking branch
  'origin/main' into lane8/t1-hybrid"`, a Tier One merge. **Cause:** `.github/workflows/build-the-gaffer.yml` passes
  the head commit subject to `scripts/publish-apk.mjs`. The app doesn't show the field today (no reference in
  `android/` or `web/src/update.ts`), so the impact is small. **Fix:** take the changelog from a The Gaffer source
  (e.g. `web/package.json` or a CHANGELOG), never a commit subject.

## GF-015 · Season-end wage ratchet (design recommendation)
- Low · code-confirmed. `season.ts:559` sets `wage: Math.max(p.wage, wageOf(value, lid))` for every player at every
  season end, contracts included, so wages never fall and can rise without renegotiation. V2_DESIGN §8 lists "no wage
  ratchet" as a planned V2.7 change. It isn't implemented yet; this records it rather than calling it a regression.

## GF-016 · Contradictory staff advice
- Low · reproduced once. The director of football recommended "Put Amr El Gazar on the transfer list?" (staff pick:
  yes). When a €1.1M bid arrived, the same director said "Amr El Gazar's part of this place. If they want him, make
  them pay." (`screens/A-A18-today-md2.png`, `screens/A-A25-today-md3.png`). **Fix:** bid advice should read the
  listed flag and the reason for listing.

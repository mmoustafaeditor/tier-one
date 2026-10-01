# Repair master prompt: The Gaffer (verified audit findings)

You are a senior game engineer fixing **verified** problems in **The Gaffer**, Semba Studios' football-management
game. Work carefully and minimally. This prompt describes the work; it does **not** authorise commits, pushes, merges
or deployments. Follow the user's separate instructions for those, and follow the repository's `CLAUDE.md`
(team-sync rules, `UPDATES.md` entry, owner policy).

## 0. The right game, the right code
- Repository `mmoustafaeditor/tier-one`. It holds **two games**. Touch **The Gaffer only**; never touch Tier One
  (`tier-one/`, `games/tier-one/`, `api/tier-one/`).
- The Gaffer's source: `games/the-gaffer/web/src` (React 19 + TypeScript + Vite). Editable only there.
- Generated, never hand-edited: `games/the-gaffer/build/*`, `the-gaffer/index.html`, `the-gaffer/version.json`,
  `downloads/TheGaffer.apk`, `api/the-gaffer/latest.js`.
- Android wrapper: `games/the-gaffer/android` (`com.sembagames.thegaffer`).
- Shared with Tier One (explain the impact before touching): `design/`, `data/`, `api/data/`, `vercel.json`, root
  docs. None of the fixes below should need them. If a fix does (e.g. Arabic names in `data/seed/`), stop and describe
  the impact on both games first.
- Audited state: `865bc2b` on `main`; The Gaffer web **2.1.0, build 29846333** (last Gaffer commit `aa929cb`). Live
  sembagames.app/the-gaffer was byte-identical to it.
- Pushing to `main` with changes under `games/the-gaffer/**` runs `.github/workflows/build-the-gaffer.yml`. That
  rebuilds, commits the web build (and a new APK if `android/` changed) and triggers a Vercel deploy. Work on a
  branch.

## 1. Intended experience and constraints to preserve
- A phone-first manager game: **Today** is a queue of at most 5 decisions with the staff's advice pre-picked,
  Continue plays on, and the full-time screen explains "what it changed" (`V2_DESIGN.md` §0, §5).
- **One engine contract** (`ENGINE.md`): screens send commands, `sim/clock.ts` moves time, the match engine is shared
  by the user's and AI matches (FULL vs FAST on the same odds), and everything is seeded and deterministic.
- Staff act through **the same commands** as the user; delegation must not give or take a hidden edge.
- Keep the visual identity (green look, `styles/look/*`, the `BRAND` switch), the four languages (EN reference;
  AR Egyptian, ES, FR type-checked in `lang-*` files), and RTL. Don't switch the game to one language.
- Save compatibility: `SAVE_VERSION` 8 with an upgrade chain (`sim/upgrade.ts`). Any new persisted field is optional
  with a default, or gets an upgrade step plus a test in `sim-tests/oldsave.ts` / `roomsave.ts`. Never break loading
  older saves.
- Engine balance bands to keep (`sim-tests/sanity`): goals 2.6–3.0 per match, home wins 42–47 %, draws 22–27 %,
  `predict()` home-win close to the simulated rate.

## 2. Working rules
1. **Reproduce each issue on your checkout before editing.** Record the command or steps and the before value.
2. **Check whether newer commits already fixed it** (`git log -- games/the-gaffer`, read the diff). If so, verify
   and report; don't redo it.
3. Implement the **smallest coherent fix**. No unrelated refactors, no speculative features, no new systems beyond
   what a finding needs.
4. Add tests for **behaviour** (seeded sim assertions, UI geometry checks), not tests that mirror code.
5. Verify gameplay consequences through **UI and simulation** where relevant: phone (360/390/412 px) and desktop
   (≥ 1024 px), EN and AR.
6. Run `npm run typecheck`, `npm run build`, the existing sim-tests (`node sim-tests/build.mjs <name>` for
   `sanity oldsave roomsave realworld recruit referee roles room tactics why youth v2core`), and your new tests.
7. Report per finding: what changed, how it was verified (numbers before and after), and what's still open.
   Distinguish fixed / partly fixed / not attempted.
8. This prompt doesn't authorise publishing. Commit, push and deploy only as the user separately instructs, with an
   `UPDATES.md` entry per `CLAUDE.md`.

## 3. Findings to fix, in order

Evidence referenced below lives in `audit-the-gaffer/evidence/` (if it's missing on your checkout, rebuild it with the
harness descriptions given here).

### Step 1 · GF-001 (High): the live-match "Changes" button is off-screen on phones
- **Reproduce:** start any career, `Walk out`. At 320–480 px width the fixed `.mbar` content is ~519 px wide;
  `Changes` sits at x ≈ 399–531 px, off-screen, and `Instant` is clipped. It becomes reachable only at ≥ 540 px.
- **Where:** `ui2/Live.tsx:232-243` (bar markup); `styles/look/components.css:315-321` (`.mbar .seg { flex: none }`).
- **Fix:** make the bar fit, e.g. let `.seg` shrink or scroll, or use one speed toggle on narrow widths, and put
  `Instant` in an overflow. `Changes` must always be visible.
- **Accept when:** at 320, 360, 390, 412 and 480 px (EN and AR) every bar control is fully inside `innerWidth`, taps
  are ≥ 44 px, there's no horizontal scroll, and tapping `Changes` opens the sheet. Desktop is unchanged.
- **Test:** a Playwright geometry check for those widths (bounding rects inside the viewport) and a sheet-open check.

### Step 2 · GF-003 (High): AI morale death spiral (fix before GF-002, since it feeds it)
- **Reproduce:** seed 7, user managing `ita-bologna`. Simulate to matchday 30 with `playDay`. Premier League bottom
  six average morale 7–23 with minimums at the floor (6), points 12–26; leaders 87–97. The same in Egypt.
- **Where:** `sim/season.ts` `applyMatch` (±6 on result, ±2−1 for non-players) and the drift at
  `season.ts:~180` (`p.morale += Math.sign(target − morale)`, i.e. ±1/matchday). The engine reads
  `(morale − 60)/20` on every attribute (`engine/model.ts:149, 585`, `tactics.ts:114`).
- **Fix:** stronger mean reversion (e.g. move a fraction of the gap each matchday) and/or diminishing result swings
  near the extremes, applied identically to user and AI squads. Don't remove morale's effect; bound it.
- **Accept when:** over seeds 7, 8 and 9 at matchday 30, no top-flight AI club averages below ~35 morale;
  bottom-three points per game ≥ ~0.6; the champion's pace is ≤ ~2.5 points per game; `sanity` bands hold.
- **Test:** a new seeded sim test (e.g. `sim-tests/morale.ts`) asserting those bands.

### Step 3 · GF-002 (High): user-side-only engine bonuses
- **Reproduce:** a seeded A/B. For seeds 7–10 and clubs `egy-zamalek, eg1_haras, eng-ipswich, eng-man-city,
  ksa_hazem, esp-getafe`, simulate one season with the user at `ita-bologna` (all AI), then with the user at that
  club, taking the recommended choice on each decision (`d.choices.find(c => c.pick) ?? d.choices[0]`, and decline
  job offers). Audit result: user-managed +0.37 points per game on average; 19 of 24 pairs higher; Al-Hazem 14 → 46
  pts; Getafe 26 → 54. The edge also appears when no decision is answered.
- **Where:** `sim/match.ts:136-141` (`mods.level` = assistant quality/100 + `cohLevel(cohesion)` only for the user's
  side), `:153-154` (opponent `AI_COH` only in user games), user-only morale target (`season.ts moraleTarget`,
  `room.ts roomPull`).
- **Fix:** give every side the same class of inputs (an assistant-equivalent and cohesion for AI clubs, or a shared
  neutral baseline), so the user's advantage comes only from *choices*. Ablate one cause at a time and measure each.
- **Accept when:** re-running the A/B (both modes), mean |Δ points per game| ≤ 0.10, and no club's mean gain > 0.2;
  `sanity` bands hold; choices (a better assistant, a higher cohesion) still show a bounded, measurable benefit
  (e.g. ≤ ~+0.15 points per game for a top assistant vs an average one).
- **Test:** `sim-tests/parity.ts` running 2–3 clubs × 2 seeds, asserting the bound.

### Step 4 · GF-004 (Medium): board and fans punish favourites; odds miscalibrated
- **Reproduce:** a seed-7 Man City career on staff defaults: sacked at matchday 45 of season 2 while 2nd (33 W,
  board 12, fans 7). Calibration: expected vs actual points per game, Ipswich 1.11 vs 0.62 and Getafe 1.71 vs 1.34.
  In the UI, Al Ahly won the league and cup and the fans ended "Muttering" (46).
- **Where:** `sim/coach.ts afterMatch` (surprise ×1.8 board, ×4 fans), `sim/season.ts expectedPoints`, `tableMood`
  (no partial credit near the objective), `coachSeasonEnd` (fans ±10), `sim/balance.ts sackLine`.
- **Fix (after steps 2–3, which change the odds):** re-check the calibration; damp or re-centre the surprise terms;
  give partial credit within a few points of the objective; add fan credit for trophies and final position against
  pre-season expectation.
- **Accept when:** for Man City, Real Madrid and Al Ahly × 3 seeds × 2 seasons on staff defaults, nobody is sacked
  while in the top 2; fans ≥ 60 after winning the league; mean (actual − expected) points per game within ±0.1 across
  6 calibration clubs.
- **Test:** a seeded board test over those runs.

### Step 5 · GF-005 (Medium): staff defaults strip the squad and hoard cash
- **Reproduce:** 5 seasons on staff picks: Zamalek squad 30 → 16, cash €9M → €74M; Brighton 26 → 16/17.
- **Where:** recommendation logic for bid, sale and loan decisions (`sim/decisions.ts`, `sim/recruit/*`,
  `sim/youthDecisions.ts`); needs in `recruit/needs.ts`; the selling floor `SQUAD_SELL_MIN`.
- **Fix:** don't recommend a sale or loan that opens a positional hole; when a sale opens one, raise a "sign a
  replacement" decision. Keep "Signings wait for you" as the default, but make the gap visible and actionable.
- **Accept when:** 5 seasons × 3 clubs on staff defaults keep squad ≥ 22 with every position covered, and the game
  surfaces a spend decision before cash exceeds ~3 seasons of the wage bill.
- **Test:** a seeded multi-season test on squad size and positional coverage.

### Step 6 · Content and UI polish (Low, independent)
- **GF-006 (Medium, content):** real players have `name.ar = name.en` (`sim/seed.ts:99, 252`). Add Arabic names for
  at least the Egyptian and Saudi real squads, with the English fallback. **This touches the shared data snapshot**
  (`data/seed/`, used by Tier One too): describe the impact before changing it. Or keep the Arabic names in a
  Gaffer-only override table under `games/the-gaffer/web/`.
- **GF-007:** `ui2/Today.tsx:40-41, 159-163` pass an empty day into `head`/`fit` once the user's league is over.
  Use a season-over headline; hide or retitle "Fit for".
- **GF-008:** `lang-v2.ts:102` `boardWhy` → "They want to win the league / to stay up". Check AR/ES/FR.
- **GF-009:** `ui2/Squad.tsx:34-40`: assign cover without reusing a player across slots; fix card overlap at 360 px.
- **GF-010:** `ui2/Office.tsx:54-55`: label the runway by real calendar month (no duplicate labels).
- **GF-011:** `ui2/NewCareer.tsx:29, 75`: show "6 real · 12 generated clubs" style labels; weight generated names by
  the club's country.
- **GF-013:** show agreed-but-unsigned fees as reserved in the spending room, and check the sum of open bids at bid
  time (`recruit/money.ts`, `recruit/deals.ts:148`).
- **GF-014:** stop writing the head commit subject into `api/the-gaffer/latest.js` `changelog`
  (`build-the-gaffer.yml` → `scripts/publish-apk.mjs`); use a The Gaffer-owned changelog source.
- **GF-016:** bid advice should read the player's listed flag and the reason for listing.

Each: reproduce, fix, a string/UI test in EN and AR, and a screenshot before and after.

### Not to be changed without a new decision
- **GF-012 (suspected high-press dominance):** first re-measure on the real 2026/27 world including fatigue and
  injury over a run of matches. Change `TUNE` only if a preset is best in more than ~50 % of fixtures there.
- **GF-015 (wage ratchet, `season.ts:559`):** planned as V2.7 "no wage ratchet". Implement only if the owner
  confirms, with a save-compatible change.

## 4. Dependencies between fixes
- Step 2 (morale) → Step 3 (parity) → Step 4 (board/fans): each changes the odds the next one is measured against,
  so re-run the A/B and the calibration after each.
- Step 1 and Step 6 are independent of the balance work and can be done first or in parallel.
- Step 5 is independent of the engine but should be verified after steps 2–3, since results affect sale decisions.

## 5. Final verification checklist
- `npm run typecheck && npm run build` are clean; all existing sim-tests plus the new ones pass.
- The A/B, calibration and morale census numbers are reported before and after.
- Playwright at 360/390/412 px and 1440 px, EN and AR: Today, Squad, Match (tactics), live match (bar and Changes
  sheet), full time, Transfers, Club › Money; 0 console errors.
- Saves: a v8 save made before the change loads and plays on; `oldsave`/`roomsave` pass.
- A report listing each finding as fixed / partly fixed / not attempted, with evidence, and anything left open.

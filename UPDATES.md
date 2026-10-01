# Team update log

Every change to this repo gets an entry here, **newest first**, so each of us (and each
Claude Code session) can see what the others did before starting work.

**How to add an entry:** copy the template, put it at the top of the list, fill it in, commit it
together with your change.

```markdown
## YYYY-MM-DD · <who> · <short title>
- **What changed:** …
- **Files:** …
- **Heads-up for the team:** … (anything the others must know or do; "None" if nothing)
```

`<who>` is the person the work was done for (their GitHub name), e.g. `saifsaber`, `mmoustafaeditor` or `moemsacod`, even when Claude Code did the typing.

---

## 2026-10-01 · saifsaber · The Gaffer: matchday weather
- **What changed:**
  - **Weather per match.** Every match now has weather: clear, rain, heavy rain, wind, heat or snow (`engine/weather.ts`). It is picked once from the match key and the home country's climate. England and Germany get rain and some snow; Spain and Italy are mostly clear, with heat; Egypt and Saudi get heat and never snow.
  - **Same for both sides.** Weather changes how a match is played, never who is favoured:
    - a wet or snowy pitch makes short combinations and carrying the ball through midfield harder, and the long ball more attractive;
    - wind spoils long balls, crosses and corners;
    - heat and heavy pitches tire players;
    - the wet means more slips into fouls and more knocks.
  - **Measured on 3,000 seeded matches against the same matches in clear weather** (`node sim-tests/build.mjs weather`):
    - goals overall −0.1%;
    - fouls in rain 23.6 against 22.4, heavy rain 24.3 against 22.5;
    - fewer headed chances in the wind (5.82 against 6.12);
    - players end hot matches more tired (88.4 against 89.3).
  - **Where you see it.** The weather shows on the live screen's pitch card in EN/AR/ES/FR. Rain and snow fall over the 2D pitch; the animation stops when the device asks for reduced motion.
- **Files:** `games/the-gaffer/web/src/sim/engine/weather.ts` (new), `src/sim/engine/model.ts`, `src/sim/match.ts` (`wx`), `src/ui2/Live.tsx`, `src/ui2/Pitch2D.tsx`, `src/styles/app.css`, `src/lang-ref{,-ar,-es,-fr}.ts`, `sim-tests/weather.ts` (new)
- **Heads-up for the team:** Old saves have no weather and play as clear. Match results differ from before this change, since weather is part of each match now. `data/`, `api/data/` and `design/` are untouched. Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer, foundation step 5: marking style, like FM (zonal / mixed / man, and at set pieces)
- **What changed:** Two new team instructions on the Tactics board and the live tactics sheet, in EN/AR/ES/FR. Both default to Mixed.
  - **Marking:** Zonal / Mixed / Man.
  - **Marking at set pieces:** Zonal / Mixed / Man.

  In the engine (`engine/model.ts`), Mixed is the engine exactly as before: the same 200-match fingerprint as step 4. The trade-offs:
  - **Zonal** holds the shape: less room between the lines and fewer fouls, but runners from wide and into the box find space.
  - **Man** is tight on the flanks and in the air, but markers get pulled out of shape (more room in midfield and between the lines) and it costs fouls.
  - **At corners**, zonal gives away more first contacts. Man-marking leaves the second ball at the edge of the box.

  No style is a free win (`node sim-tests/build.mjs marking`): every combination is within −1.0% to +0.9% points of Mixed/Mixed (the limit is +3%). The simulated trade-offs all show up:
  - fouls: man 12.3, mixed 11.3, zonal 10.4 a match;
  - wide and headed chances conceded are lowest with man;
  - box and through chances conceded are lowest with zonal.

  On the pitch, zonal only takes men who come into a player's area and the back line holds until the box. Man reaches further and a defender follows his man anywhere. At corners, zonal holds every zone, mixed holds 3 and the rest pick up a man, and man marks all of them. Measured in 10 seeded matches (Node pitch test), attackers near goal marked: zonal 76%, mixed 85%, man 81%. Man-marking chases from further away, so it isn't tighter on this measure yet; phase 4 (the director) will refine it.
- **Files:** `games/the-gaffer/web/src/sim/tactics.ts` (`marking`, `setMark`), `src/sim/engine/model.ts`, `src/ui2/pitch/{sim,defend,tuning}.ts`, `src/ui2/Match.tsx`, `src/ui2/Live.tsx`, `src/lang-tac{,-ar,-es,-fr}.ts`, `sim-tests/marking.ts` (new), `sim-tests/pitch.ts` (env `MARKING`)
- **Heads-up for the team:** Old saves have neither field and play as Mixed. AI managers keep Mixed for now. Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer, foundation step 4: injuries come from tackles too, and players have a hidden proneness
- **What changed:**
  - **Injuries from tackles.** A fouled player can now be hurt by the tackle: rarely by a careless foul, more often by a reckless one, often by serious foul play (`engine/injury.ts`). The roll happens after the minute, on its own random stream.
  - **Hidden proneness.** Every player has a hidden injury proneness, taken from his id and his physique; a strong player is a little harder to hurt. It makes him likelier to be hurt both in tackles and in the existing background injuries (tiredness, load, pressing).
  - **Totals unchanged.** The background chance is scaled down so totals stay as they were. Over 2,000 seeded matches (`node sim-tests/build.mjs injuries 2000 0.281`): 0.275 injuries a match against 0.281 before (−2.3%), about a third of them from fouls. The fouled player is hurt in 0.31% of fouls with no card, 0.98% of booked fouls and 7.4% of fouls that are sent off.
  - **Shown on the pitch.** The injured player goes down at the whistle of that foul and stays down under a medic's cross; otherwise he pulls up mid-minute. The injury event now carries `how: 'foul'` and the offence in `note` when a tackle did it.
  - **Checks.** The referee test passes, old saves load, and the season (5,784 league matches, 2.77 goals a match) runs. The Node pitch test shows the same numbers as before this step, apart from the injury itself.
- **Files:** `games/the-gaffer/web/src/sim/engine/injury.ts` (new), `src/sim/engine/referee.ts` (`FoulOut.off`), `src/sim/match.ts`, `src/ui2/pitch/sim.ts`, `src/ui2/Pitch2D.tsx`, `ui-tests/pitch-metrics.mjs`, `sim-tests/injuries.ts` (new)
- **Heads-up for the team:** Match results change from this step on (who gets hurt, and when), so the 200-match fingerprint is new. Proneness needs no save field. Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer pitch, foundation step 3: the engine tells the pitch when, what, and when the ball goes out
- **What changed:** The engine's ball path for the pitch (`m.flow`, FULL matches only) now carries more information:
  - each entry has the second within the minute it happens (`t`) and the engine node it happened at (`n`: a cross, a through ball…);
  - throw-ins and goal kicks are entries of their own (`k: 'ti' | 'gk'`, from `restartOnTurnover`).

  Nothing else in the engine changed: 200 seeded full matches give the same fingerprint before and after (every event, score, stat and tally; `node sim-tests/build.mjs fingerprint`). The referee test passes too.

  On the pitch, a throw-in now runs the ball over the touchline and the nearest outfield man takes it from the line. A goal kick that doesn't follow a missed shot (a cross or a long ball out) is staged by the keeper. In 10 seeded matches that is 319 throw-ins and 202 goal kicks (143 before).

  Throw-ins count as restarts in the pitch test, so turnover reaction no longer measures them: it is now 96 of 115 (83%, passes).
- **Files:** `games/the-gaffer/web/src/sim/engine/play.ts`, `src/sim/engine/referee.ts`, `src/ui2/pitch/sim.ts`, `src/ui2/pitch/setpieces.ts`, `ui-tests/pitch-metrics.mjs`, `sim-tests/fingerprint.ts` (new)
- **Heads-up for the team:** Saves and match results are unaffected: `flow` isn't saved into results, and nothing reads `t` or `n` yet. The director (phase 4) will use them to time beats. Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer pitch, foundation steps 1-2: pitch logic out of React, seeded Node pitch test
- **What changed:** Nothing a player sees. The pitch's movement code moved out of the React component into `ui2/pitch/sim.ts` (`newAnim`, `tick`); `Pitch2D.tsx` only draws now. The pitch test's measurements moved into `ui-tests/pitch-metrics.mjs`, shared by the browser test and a new Node test, `node sim-tests/build.mjs pitch [matches] [minutes]`. It plays 10 seeded full matches (about 134,000 frames) in about 18 s a run and runs twice: both runs give identical numbers.
  With samples this big, the real baseline shows:
  - marking 85%, keeper 0.3 m off the angle, every corner 5 in the box, every wall 3+ (all solid);
  - back-line spread is a median 4.0 m (limit 3 m);
  - the side that lost the ball reacts in 77% of turnovers (limit 80%, 159 measured);
  - a carrier in our box finds a blocker 30% of the time (578 frames).

  Those three are what phases 3-4 are for. The browser test still passes nav, 58 fps and no console errors.
- **Files:** `games/the-gaffer/web/src/ui2/Pitch2D.tsx`, `src/ui2/pitch/sim.ts` (new), `ui-tests/pitch.mjs`, `ui-tests/pitch-metrics.mjs` (new), `sim-tests/pitch.ts` (new)
- **Heads-up for the team:** Use the Node pitch test to judge pitch changes. The browser test's 40-second samples swing too much to judge marking, the box or the line. The Node test fails on the three weak checks above until phases 3-4. Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer pitch, phase 2 of the FM26 plan: the defence as a group
- **What changed:** The Gaffer's live 2D pitch only; nothing under `sim/` changed. Out of possession the defence now works as a group (`ui2/pitch/defend.ts`):
  - every attacker within 32 m of goal gets a goal-side marker: zonal by default, and the man-marking instruction pairs its target first; midfielders take men in front of the line, defenders take those near goal or beyond it;
  - the back line slides across towards the ball and stays compact;
  - a carrier wide in our third gets a second man;
  - the keeper stands on the bisector of the shooting angle;
  - the nearest defender steps into the shooting lane at once when a carrier is in our box.

  These are FM26's known weak spots, done on purpose. Measured in settled play (`ui-tests/pitch.mjs`): marking went from 40-47% before this phase to 80-100% in most runs, and the keeper went from 1.2-1.6 m off the angle to 0.0-0.5 m in most runs. Small samples make single runs swing: one long spell of a man unmarked in front of the line can pull a run down.
- **Files:** `games/the-gaffer/web/src/ui2/Pitch2D.tsx`, `src/ui2/pitch/defend.ts` (new), `src/ui2/pitch/tuning.ts`, `ui-tests/pitch.mjs`
- **Heads-up for the team:** Some test checks are still unstable from run to run: back-line spread sometimes lands right on the 3 m limit, and reacting after losing the ball sometimes fails (e.g. 2 of 6). That is phase 4 (the director). The pitch test now leaves out frames of a paused or finished match, and judges marking at 5 m in the last 22 m and 8 m out to 30 m, where the line holds. The box blocker rarely gets measured: the engine's shots come straight after the pass, so there are only 3-10 such frames a run. Getting a defender there in time needs phase 4 (the director). Next after this: a marking-style instruction like FM (zonal / mixed / man, set pieces), agreed with Saif. Tier One is untouched.

## 2026-10-01 · mmoustafaeditor · Tier One: leaderboards, prizes and badges (SAIF-03); publish-area overlaps fixed (SAIF-04)
- **What changed:** New Leaderboards screen (Me › Leaderboards, or "All leaderboards" under the Results board): today, this week and the Wire season, with your rank and the top 25. A top-10 finish in a finished Daily or week pays coins once (Daily 60/40/25/10, week 200/120/80/30, boards with 3+ players), collected on a gold prize card; prizes never change a score. Badges on the byline: board medals, wins over rivals, latest trophies. `lb.top` now takes an optional past `day` (read-only). SAIF-04: the filed stamp on the saga card no longer runs over the route, the post card's stamp clears the send button, and the Wire file sheet's band sits under the sheet handle instead of behind it.
- **Files:** `api/tier-one/v3/index.js` (`lb.top` `day`), `games/tier-one/v3/web/src/lib/awards.ts` (new), `src/ui/awards.tsx` (new), `src/screens/Boards.tsx` (new), `src/styles/awards.css` (new), `src/i18n/parts/awards.ts` (new), `src/App.tsx`, `src/screens/Me.tsx`, `src/screens/Results.tsx`, `src/ui/connect.tsx`, `src/lib/save.ts` (optional `prizes`), `src/styles/play.css`, `src/styles/system.css`, `games/tier-one/SAIF_IMPROVEMENTS.md`, `UPDATES.md`
- **Heads-up for the team:** New route `boards` (`?tab=boards`). Prize amounts are first values; tune in `lib/awards.ts` (`PRIZE`). The Wire season board shows rank only (no prize yet).
## 2026-10-01 · mmoustafaeditor (Claude Code session) · Closed three of Saif's requests
- **What changed:** Removed from `.claude/requests.md`: the new Tier One app icon (already on `main`, and in the 3.4.0 / versionCode 19 APK Saif published), Saif's proposal files (already on `main`), and publishing The Gaffer (live at sembagames.app/the-gaffer). Approved by Mostafa.
- **Files:** `.claude/requests.md`, `UPDATES.md`
- **Heads-up for the team:** The Vercel deploy hook request stays open until Mostafa has created the hook and the `VERCEL_DEPLOY_HOOK` secret.

## 2026-10-01 · saifsaber · The Gaffer pitch, phase 1 of the FM26 plan: each player's body
- **What changed:** The Gaffer's live 2D pitch only; nothing under `sim/` changed. Each player now moves with his own body: a top speed, acceleration and turning limit from his attributes and match fitness, and a sprint tank that empties when he sprints and refills when he jogs. He re-reads the play at decision ticks (like FM's quarter-second "slice") and reacts to a new ball after his own reaction time. Better players react sooner. The game has 7 attributes, so "reading the game" is derived from rating, age and the skill his position leans on, the same way the referee derives aggression; saves don't change. The back line holds its depth together at its slowest defender's pace. All the numbers are in one tuning file, `ui2/pitch/tuning.ts`. New `sim-tests/body.ts`; `ui-tests/pitch.mjs` checks the limits, reaction times and tank (120 s run: 59 fps, all checks passed).
- **Files:** `games/the-gaffer/web/src/ui2/Pitch2D.tsx`, `src/ui2/pitch/body.ts` (new), `src/ui2/pitch/tuning.ts` (new), `ui-tests/pitch.mjs`, `sim-tests/body.ts` (new)
- **Heads-up for the team:** Team length out of possession went up from about 33 m to 34-38 m (players now have to accelerate and react). One short run out of five had the back line at 3.0 m spread. Holding the line is phase 2 of the plan. Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer pitch movement, part C: pass and shot types, set pieces, build-up
- **What changed:** The Gaffer's live 2D pitch (presentation only; nothing under `sim/` changed). **Passes** now have types: short, long (lofted, with a shadow), through ball (into space ahead of the runner), cross from out wide, and cutback from the byline. **Shots** follow the engine's shot type (a header comes from a cross, a cutback from the byline, a long shot from the edge of the box). Shots spread across the goal or go wide or over, saves can be parried, and blocks deflect. **Set pieces** come from the engine's events: corners (5 attackers in the box, zonal defending), free kicks in range with a 3–5 man wall 9.15 m away, the assistant's flag for offside, and goal kicks after a miss. **Quiet minutes** now show a passing chain in each side's philosophy (possession 5–6 passes, direct 2–3 with a long ball, wings down the flank). Added time now plays out on the pitch too. `ui-tests/pitch.mjs` checks all of this (120 s run: 59 fps, all five pass types, a corner with 5 in the box, walls of 4, no console errors).
- **Files:** `games/the-gaffer/web/src/ui2/Pitch2D.tsx`, `src/ui2/pitch/move.ts`, `src/ui2/pitch/setpieces.ts` (new), `ui-tests/pitch.mjs`
- **Heads-up for the team:** Last of the 3 pitch-movement PRs (A, B, C). Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer pitch movement, part B: runs off the ball, transitions
- **What changed:** Second step of the pitch-movement plan (UI only; the engine, results and stats are untouched). With the ball, players now make the runs their role asks for: full-backs and wing-backs overlap on the ball's flank, inverted full-backs step inside, wingers hold the touchline, inside forwards run diagonally into the half-space, advanced forwards run on the shoulder of the last defender, target men stay central, false nines drop between the lines, box-to-box and attacking midfielders arrive late in the box, playmakers show for the ball and holders screen. At most 3 real runs at once. After a turnover, the side that lost the ball counter-presses with its nearest three (counter-press instruction, or a high press) or races back, with its back line dropping as one; the side that won it breaks forward when "counter at once" is on. Measured by `ui-tests/pitch.mjs`, two runs: runs in 27-29% of frames (max 2 at once), back-line spread 1.0 m, team length 32-34 m, reaction after a clean turnover 7/8 and 9/10.
- **Files:** `games/the-gaffer/web/src/ui2/pitch/move.ts`, `web/src/ui2/Pitch2D.tsx`, `web/ui-tests/pitch.mjs`, `UPDATES.md`
- **Heads-up for the team:** None.

## 2026-10-01 · saifsaber · The Gaffer pitch movement, part A: speed, back line, press
- **What changed:** First of three steps of the pitch-movement plan (UI only; the engine, results and stats are untouched). Each player's speed on the 2D pitch now comes from his pace (up to 1.5x between the fastest and the slowest) and drops when his match fitness runs low. Out of possession, the back line moves as one straight line: it steps up after a backward pass and drops when the carrier has time; midfield stays 8-16 m in front of it, and the forwards are within 38 m. The press follows the pressing instruction: sit off waits in its own half, hunt high sends two. The presser stands between the ball and his goal, a second man covers 7 m behind, pressing roles go first, and hold-shape roles never press. Measured by the new `ui-tests/pitch.mjs`: 59 fps, back-line spread 1.5 m, team length 30 m out of possession.
- **Files:** `games/the-gaffer/web/src/ui2/pitch/move.ts` (new), `web/src/ui2/Pitch2D.tsx`, `web/ui-tests/pitch.mjs` (new), `UPDATES.md`
- **Heads-up for the team:** None. `?pitchdebug` in the address exposes the pitch state for the test only.

## 2026-10-01 · saifsaber · The Gaffer: install it as an app from the browser (desktop and phone)
- **What changed:** The Gaffer can now be installed from the browser like Tier One (Chrome/Edge "Install", "Add to Home Screen" on phones). It has a web app manifest (name, icons, dark-green colours) and a small service worker. The worker fetches the page from the network first and caches it only for offline play, so the installed app always runs whatever build the site serves; `version.json` is never cached, so the in-game "Update now" keeps working. Both are registered only on the website (`/the-gaffer/` over http/https): never inside the Android app (file:// with its own updater) and never on a local dev server. Careers are shared with the browser tab (same site). Tested locally under a `/the-gaffer/` path: Chrome reports no installability errors, the game opens offline, and a new page on the server shows on the next load. The nav regression test passes.
- **Files:** `games/the-gaffer/web/pwa/` (new: `manifest.webmanifest`, `sw.js`, `icons/`), `games/the-gaffer/web/src/pwa.ts` (new), `web/src/main.tsx`, `web/vite.config.ts` (the release build copies `pwa/` next to the page), `.github/workflows/build-the-gaffer.yml` (publishes the whole `the-gaffer/` and `games/the-gaffer/build/` folders), `vercel.json`, `UPDATES.md`
- **Heads-up for the team:** `vercel.json` is shared, but the only change is that `/the-gaffer/sw.js` and `/the-gaffer/manifest.webmanifest` get the same no-cache header as the Gaffer page; nothing for Tier One changes. The Android APK is unchanged (it bundles only the page and `version.json`).

## 2026-10-01 · saifsaber · The Gaffer CI: a manual run publishes an APK only when asked
- **What changed:** A manual run of "Build and publish The Gaffer" has no previous commit (`github.event.before` is empty), and the publish step treated that as "publish a new APK". So a manual run with "Also publish a new APK" unticked still published one (2.2.0, versionCode 29847298; same game as 29847260, only the build number moved, so installed apps get one extra download prompt). Manual runs now publish an APK only when the box is ticked; pushes to `main` behave as before. That manual run was used to get the Tier One 3.4.0 release (PR #9) deployed, since Vercel skips merges by Saif's account.
- **Files:** `.github/workflows/build-the-gaffer.yml`, `UPDATES.md`
- **Heads-up for the team:** Tier One Android 3.4.0 (versionCode 19) is live on sembagames.app. The Vercel deploy hook request in `.claude/requests.md` is still open; it would make merges from any account go live by themselves.

## 2026-10-01 · saifsaber (Tier One APK at mmoustafaeditor's request) · Tier One Android 3.4.0 published (versionCode 19)
- **What changed:** The Tier One APK and update feed move from the held 3.1.0 to 3.4.0. Mostafa asked Saif to take care of the APK. The single-file bundle `tier-one/apk/index.html` is rebuilt from the current v3 source (`npm run build:min`, build 29847278). It now carries everything the web already had: drawn motion films, catchphrases, "HERE WE GO" removed, and the one design system. The bundle inside the held 3.4.0 APK predated those merges. `downloads/TierOne.apk` is a fresh `gradle clean assembleDebug` at **3.4.0 / versionCode 19**. It's 19, not 18, because an 18 was briefly published before the hold and may be installed. Checks: `aapt` reads 19 / 3.4.0; the bundled `assets/index.html` is byte-identical to `tier-one/apk/index.html`; the intro files are present; and the signing certificate is identical to the published 3.1.0 (`apksigner`), so installed apps accept the update. `api/tier-one/latest.js` announces 3.4.0 / 19 with a 3.4 changelog. Docs: the Tier One APK badge links to sembagames.app, the versionCode is 19, the app bundles `tier-one/apk` (not the classic game), and The Gaffer is at 2.2.0.
- **Files:** `downloads/TierOne.apk`, `api/tier-one/latest.js`, `games/tier-one/app/build.gradle`, `tier-one/apk/index.html`, `tier-one/apk/version.json`, `games/tier-one/README.md`, `README.md`, `CLAUDE.md`, `UPDATES.md`
- **Heads-up for the team:** Installed Tier One apps will now offer the 3.4.0 download. The web game (`tier-one/`) is unchanged and already 3.4.0. Saif's old requests in `.claude/requests.md` are left as they are.

## 2026-10-01 · saifsaber · The Gaffer CI: a failed publish now fails the run
- **What changed:** When a push run and a manual "publish a new APK" run overlapped, the second one's publish hit a rebase conflict on the generated build files, never reached `main`, and still showed green. The publish step now rebases with this run's generated files winning (`-X theirs`), aborts a failed rebase before retrying, and fails the run if all 4 attempts fail.
- **Files:** `.github/workflows/build-the-gaffer.yml`, `games/the-gaffer/README.md` (APK and HTML links now point at sembagames.app: the GitHub raw links 404 for people outside the repo), `UPDATES.md`
- **Heads-up for the team:** The 2.2.0 APK is published (versionCode 29847260, `downloads/TheGaffer.apk`). Avoid starting a manual Gaffer build while a push build is still running; if a publish fails now, the run is red instead of silently green.

## 2026-10-01 · saifsaber · The Gaffer 2.2.0: version name, READMEs and a new APK
- **What changed:** The release that merged in PR #6 (audit fixes, V2.7–V2.10, navigation redesign) is now called 2.2.0 (`web/package.json`), and the root and game READMEs show 2.2.0 with what's new. After this lands, the build workflow is run with "Also publish a new APK", so `downloads/TheGaffer.apk` bundles 2.2.0 and the update feed `api/the-gaffer/latest.js` (written by CI) announces it.
- **Files:** `games/the-gaffer/web/package.json`, `README.md`, `games/the-gaffer/README.md`, `UPDATES.md`; then by CI: `the-gaffer/*`, `games/the-gaffer/build/*`, `downloads/TheGaffer.apk`, `api/the-gaffer/latest.js`
- **Heads-up for the team:** Installed Gaffer apps will offer the 2.2.0 APK download (they already run the 2.2 game through live updates). Nothing changes for Tier One.

## 2026-10-01 · saifsaber · The Gaffer: navigation redesign (UI/UX pass, branch only)
- **What changed:** Inventory, expert usability review (18 measured tasks, phone and desktop, no real users), new information architecture and its implementation. Squad gets a labelled row at the top of all five areas (Players · Dressing room · Training · Medical · Academy): on phones these were ~2,600 px below the fold. The inbox gets a line on Today with the unread count (3 taps → 1), and the desktop rail gains labelled Inbox & news and Settings items. The Match tab "Next match" is renamed "Tactics". Segment and chip rows keep the chosen item in view, and Arabic chart months no longer overlap. Same look, same routes, no save change.
- **Files:** `games/the-gaffer/web/src/ui2/{shell,SquadTabs (new),Squad,Room,Training,Pathway,Today,Transfers,Office}.tsx`, `App.tsx`, `styles/app.css`, `lang-nav*.ts` (new), `lang-v2*.ts`, `ui-tests/nav.mjs` (new, `npm run test:nav`), `package.json`; docs in `audit-the-gaffer/THE_GAFFER_{FEATURE_NAVIGATION_INVENTORY,UI_UX_AUDIT,INFORMATION_ARCHITECTURE,UI_UX_VERIFICATION}.md` with before/after screenshots in `audit-the-gaffer/evidence/ux/`
- **Heads-up for the team:** None for Tier One.

## 2026-09-30 · saifsaber · The Gaffer V2.10 (smallest form): earned credits and club looks (branch only)
- **What changed:** Semba Credits can now be earned and spent without any payment: +50 cr for every season a career finishes (its first 10 seasons, once per season), and the three club looks on the Club Pass page (Claret night, Harbour blue, Desert gold) can be unlocked for 250 cr each and applied: they recolour the office background, kept after a reload. Presentation only: a test checks that `sim/**` never imports `meta/**`. The Pass itself, ads and every paid item stay "concept, nothing is sold" until real payment ids and server verification exist; kit designer, stadium looks, extra slots and scenarios are not built.
- **Files:** `games/the-gaffer/web/src/meta/{wallet,looks}.ts`, `sim/prefs.ts`, `ui2/Pass.tsx`, `App.tsx`, `styles/app.css`, `lang-club*.ts`, `sim-tests/store.ts` (new)
- **Heads-up for the team:** Credits live in the device-local `semba.credits.v1` key, named to be shared across Semba games, but Tier One doesn't read it today; nothing changes for Tier One.

## 2026-09-30 · saifsaber · The Gaffer V2.9: press conferences (branch only)
- **What changed:** Rare press conferences on Today: before the matchweek's big match (a derby, a top-three clash, a cup final) or after a controversy (our red card, a defeat by 3+, a lost derby); at most one a matchweek (8–9 of 46 in a season), up to 3 questions with Measured (free, the assistant's pick) / Confident / Deflect, plus "name a player" when asking who's to blame. Each answer shows its cost before you tap it (squad or player morale/trust, board, fans). A confident claim costs board −3 and fans −4 more if you then lose to that side. The Tier One link part of V2.9 is not built: it would touch Tier One, so it waits for Mostafa.
- **Files:** `games/the-gaffer/web/src/sim/{press,pressDecisions}.ts` (new), `sim/{coach,commands,decisions}.ts`, `model/types.ts`, `ui2/Decisions.tsx`, `lang-club*.ts`, `lang-dressing*.ts`, `sim-tests/press.ts` (new)
- **Heads-up for the team:** None (optional save field `claim`).

## 2026-09-30 · saifsaber · The Gaffer V2.7–V2.8: club vision, facility builds, awards, legends, AI boards, derbies (branch only)
- **What changed:** V2.7: a pre-season board meeting on Today (Expected = board goodwill, Ambitious = target one step up, the owner adds 15% of cash, a stricter board), facility upgrades now take 6–24 matchdays to build (one at a time), 6 months of parachute money after relegation, and renewals no longer ratchet wages (GF-015). V2.8: an awards night at the season's end (Player/Young Player of the Season, Golden Boot, Goalkeeper, Manager, Team of the Season for your league and the real top flights; winners +10% value), club legends (200 league games, 80 goals, or 100 games + 2 trophies) on the Career screen, AI managers who get sacked by their boards (mid-season and at the season's end, ~14% a season, in the news), and derbies that count 1.5× with the board and fans.
- **Files:** `games/the-gaffer/web/src/sim/{vision,awards,legends,managers,rivalry}.ts` (new), `sim/{season,coach,commands,decisions,economy}.ts`, `model/types.ts`, `ui2/{Office,Today,PreMatch,Sheets,Career,Decisions,text}.*`, `lang-club*.ts` (new, EN/AR/ES/FR), `styles/app.css`, `sim-tests/{vision,world}.ts` (new)
- **Heads-up for the team:** Old saves load (all new fields are optional). Nothing is live until the branch is merged.

## 2026-09-30 · saifsaber · The Gaffer: fixes from the design audit (branch only, not on main)
- **What changed:** 10 of the audit's 16 findings fixed on `claude/repo-coordination-lbro4r`: live-match Changes button reachable on phones (GF-001); AI morale no longer sinks to the floor (GF-003); no hidden user-only engine bonuses, staff now count against a club-size norm and every club gets the leaders' pull (GF-002, user edge +0.43 → +0.19 pts/game); fans cheer winning and boards don't sack managers on course (GF-004); staff keep a squad of 22+ and propose wage-cap rises when only the cap blocks a renewal (GF-005); agreed fees held back from the spending room (GF-013); honest league labels and Egyptian names at Egyptian clubs (GF-011); Today season-over header, board grammar, depth-chart cover, runway months, consistent director advice, CI changelog (GF-007/008/009/010/014/016). Status table in `audit-the-gaffer/THE_GAFFER_FINDINGS.md`.
- **Files:** `games/the-gaffer/web/src/sim/{season,match,coach,staff,decisions,transfers,norms}.ts`, `sim/recruit/{money,deals,tick}.ts`, `data/names.ts`, `ui2/{Today,Squad,Office,NewCareer,Talks,Decisions}.tsx`, `styles/look/components.css`, `lang-v2*.ts`, `lang-new*.ts`, `sim-tests/{morale,parity,reserve}.ts` (new), `sim-tests/recruit.ts`, `.github/workflows/build-the-gaffer.yml`, `audit-the-gaffer/THE_GAFFER_FINDINGS.md`
- **Heads-up for the team:** Nothing is live yet: merging to `main` makes The Gaffer's CI rebuild and deploy it. Game balance changed (morale, board, fans, staff selling and renewals), so existing careers will feel different after the update; saves load unchanged (no save-format change). Still open: GF-006 (Arabic names for real players, touches the shared `data/seed/`), GF-012, GF-015.

## 2026-09-30 · saifsaber · The Gaffer design and gameplay audit (docs only)
- **What changed:** Evidence-based audit of The Gaffer 2.1.0 (build 29846333): a full UI season with Al Ahly, a desktop Ipswich start, quick match and an Arabic pass, plus seeded simulations (user-vs-AI A/B on 6 clubs × 4 seeds, odds calibration, AI morale census, 3- and 5-season careers). 16 findings (GF-001…016) and a repair master prompt for a coding agent. No game code changed.
- **Files:** `audit-the-gaffer/` (THE_GAFFER_DESIGN_AUDIT.md, THE_GAFFER_FINDINGS.md, THE_GAFFER_SYSTEM_DEPENDENCIES.md, THE_GAFFER_REPAIR_MASTER_PROMPT.md, evidence/), `.vercelignore` (keeps the audit folder off the site), `UPDATES.md`
- **Heads-up for the team:** Top issues: the live-match "Changes" button is off-screen on every phone width (GF-001); the user's side gets engine bonuses AI sides never get (GF-002); AI morale spirals to the floor (GF-003). Nothing is fixed yet.

## 2026-09-30 · mmoustafaeditor (Claude Code session) · Tier One 3.4.0 web: drawn motion films, catchphrases, game-first design system, banter, long-tail customization
- **What changed:** 3D films removed. Every call, post, day end, story beat and moment is now a drawn motion piece (objects, places, light; no people). "HERE WE GO" removed from all on-screen text; the player's catchphrase (house line, earned, bought, or custom from Chief) drives stamps, bursts and share cards. One design system (Sheet, chips, empty states, first-load stage, precache). Football-Twitter banter, creator-rivals config (off by default), kind registry, seasonal drops, collection book.
- **Files:** `games/tier-one/v3/web/src/**`, `api/tier-one/v4/config/**`, `api/_lib/config.mjs`, `docs/**`, `tier-one/` (web build).
- **Heads-up for the team:** Web only. The Android feed and APK stay at 3.1.0 (`api/tier-one/latest.js`, `downloads/TierOne.apk`) until an APK release is approved. Platform features stay in sandbox until the Vercel env keys are set.

## 2026-09-30 · mmoustafaeditor (Claude Code session, Android lane) · Tier One Android 3.4.0 (versionCode 18): APK release prep
- **What changed:** `games/tier-one/app/build.gradle` is 3.4.0 / versionCode 18 and keeps bundling `tier-one/apk/index.html` (the single-file `npm run build:min`), which is rebuilt here at 3.4.0 (3,527 kB; it was still the 3.3.0 file, and the first 3.4.0 bundle predated the `lane18/qa` merge, so it is rebuilt once more with the QA fixes: tutorial vs morning papers, 3.3 rooms, film row copy, Wire countdown i18n). The update feed `api/tier-one/latest.js` now announces 3.4.0 / versionCode 18 at the usual `https://www.sembagames.app/downloads/TierOne.apk` with a 3.4 changelog. Checked for the WebView (a `file://` page): the service worker is never registered there (`lib/perf.ts` `swSupported()` → `isApp()`), the min build carries no `manifest.webmanifest` link (only `build:web` injects one), and film clips and posters resolve to `https://www.sembagames.app/tier-one/films/…` (`film/clips.ts` `FILM_BASE`), with the drawn fallback for anything missing; the API base is `www.sembagames.app`. No game source changed. The CI workflow (`build-tier-one.yml`) is unchanged: Gradle still copies `tier-one/apk/index.html` → `assets/index.html` and `tier-one-classic/semba-intro.*` → `assets/semba-intro.webm`, which is what its bundle check greps for.
- **Files:** `games/tier-one/app/build.gradle`, `tier-one/apk/index.html`, `tier-one/apk/version.json`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, `games/tier-one/README.md`, `README.md`, `CLAUDE.md`, `UPDATES.md`.
- **Heads-up for the team:** `downloads/TierOne.apk` is the 3.4.0 APK built from this branch with `gradle assembleDebug` (AGP 8.5.2, platform 34, build-tools 34.0.0, the same `app/debug.keystore`: the signing certificate is identical to the 3.1.0 file, verified with `apksigner`, so installed apps accept it; `aapt` reads versionCode 18 / 3.4.0 and the bundled `assets/index.html` is byte-identical to `tier-one/apk/index.html`; use `gradle clean assembleDebug` when republishing, an incremental repackage after the bundle changed left ~2 MB of dead space in the zip). The `TierOne-apk` artifact from the `Build Tier One APK` run for this push is the same build if you would rather publish that one. If the feed must be held back for any reason, revert the `latest.js` change (3.1.0 / 17) as was done for 2.4. `__tierPush` (push notifications) is not injected by the app yet; the game treats it as optional.

## 2026-09-30 · mmoustafaeditor (Claude Code session) · Tier One 3.4 "One Newsroom": the connected game, 3D films, platform, credits, PWA
- **What changed:** Eleven lanes merged (spec: `games/tier-one/v3/GOTY.md` §7–§9). Career story "The Comeback" (the fall is the game's one opening; five chapters on the five ranks; Mags Doyle, Vince Marlow, named sources; Vince's play from chapter 4; case file). One career: followers, reputation, contacts and rivals live once in the save (v3 migration) and every mode moves them. Home is one assignment; Results is one front page with a "how your name moved" strip. Wire opens on "Most wrong right now". Me is the profile hub with the playstyle card and "Your desk". Coach-mark tutorial; boot intro once per session; one-screen Pass. Editor's desk: assignments, morning papers, Deadline Day Live (shared 24 h board on the real deadline days), playstyle titles, streak stakes. Press box: weekly room leagues, feed, spectate, beat-my-board challenge links, friend rivals, newsrooms (clans), live presence. Credits economy: one catalog, coins vs credits, "Your desk" customization, gifting, referrals (`docs/BUSINESS.md`). Platform API v4 (`api/tier-one/v4`): accounts, cloud save, server wallet, remote config, telemetry, OpenAPI. Perf: code-split web build (`npm run build:web`), service worker + PWA, push scaffolding, 60 fps fixes. Films: source calls, post, and moments play video clips from `tier-one/films/` (3D renders, Remotion + three.js, in `games/tier-one/v3/film`) with drawn fallbacks; every film is unskippable and short.
- **Files:** `games/tier-one/v3/web/src/**`, `api/tier-one/v3/index.js` (room/newsroom/challenge/live actions), `api/tier-one/v4/**`, `api/_lib/**`, `docs/**`, `tier-one/` (split build layout: index.html + assets/ + sw.js + manifest + films/ + apk/), `vercel.json`, `games/tier-one/build.gradle` (APK bundles `tier-one/apk`).
- **Heads-up for the team:** Release = `npm run build:all` then commit `tier-one/`. Platform features run in sandbox until these Vercel env vars are set (names only): `PUBLIC_URL`, `OPS_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_PLAY_SERVICE_ACCOUNT`, `GOOGLE_PLAY_PACKAGE`, `T1_VAPID_PUBLIC`, `PLATFORM_SANDBOX`. Credit packs stay "not on sale" until a verified payment flow is configured. 3D clips land in `tier-one/films/` as the studio lane renders them; the game falls back to drawn films for any missing clip.

## 2026-09-30 · mmoustafaeditor (Claude Code session, api lane) · Tier One platform API v4: accounts, cloud save, wallet, remote config, telemetry
- **What changed:** New `POST /api/tier-one/v4` (GOTY §8.3): a versioned action router with idempotency keys, per-IP/per-device rate limits, structured errors and request ids; every v3 action mounted unchanged (`v3.<action>` and bare names), so one endpoint serves the client. Identity (`account.hello` device token → Semba account, email magic links with a sandbox/Resend adapter, `account.me/devices/rename` with a moderation list), cloud save (`save.push/pull`, gzip blobs, additive-counter merge documented in `docs/api/README.md`), a server-authoritative Credits wallet (`wallet.get/earn/spend/gift/purchase.verify/checkout.start`, `ent.list`) with Stripe Checkout + webhook, Google Play Billing and sandbox adapters, remote config from `api/tier-one/v4/config/*.json` (catalog, featured, weekly events, Deadline Day Live 2027-02-02 / 2027-09-01, flags, A/B buckets, min client version) with schema validation, and privacy-minded telemetry with `ops.stats`. Client libs: `lib/api.ts` (`v4()`), new `lib/account.ts` (`bootPlatform()`), `lib/sync.ts`, `lib/flags.ts`; not wired into App/main yet.
- **Files:** `api/_lib/**`, `api/tier-one/v4/**` (index.js, stripe-webhook.js, config/*.json, test/*), `docs/api/v4.yaml` (OpenAPI 3.1), `docs/api/README.md`, `vercel.json` (two new functions), `games/tier-one/v3/web/src/lib/{api,account,sync,flags}.ts`, `src/lib/__tests__/sync.test.ts`.
- **Heads-up for the team:** Nothing changes for players until the integrator calls `bootPlatform(__APP_VERSION__)` from main/App. New env names (values in Vercel, never in the repo): `PUBLIC_URL`, `OPS_TOKEN`, `T1V4_SALT` (optional), `RESEND_API_KEY` + `EMAIL_FROM`, `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, `GOOGLE_PLAY_SERVICE_ACCOUNT` + `GOOGLE_PLAY_PACKAGE`, `PLATFORM_SANDBOX`; without them mail and purchases stay in sandbox (never in production). The pressbox lane should `SADD t1v4:newsroom:<code>:members <accountId>` for gifts to work. Tests: `node --test "api/tier-one/v4/test/*.test.mjs"`, `node api/tier-one/v4/test/client.mjs`. `api/verify-purchase.js` and v3 are untouched.

## 2026-09-30 · mmoustafaeditor (Claude Code session) · Tier One 3.3 "One Byline": connected career with global byline, seasons, HERE WE GO, Remotion scenes
- **What changed:** GOTY polish pass with six parallel lanes (connect, calls, season, shell, football, scenes). Every mode now feeds one journalist: shared byline (followers/rep/hot hand), Contacts Book (XP levels, cosmetics), rival ledgers, one unified Feed, and Home's Next Up. HERE WE GO! reaction on Done/Confirmed calls (gold frame, exclusive stamp, confetti, buzz). Hold-to-publish button with print-roller animation, Delete & repost with ratio pile-on, rival race avatars lighting up, overnight Breaking cards with taunts. Seasons follow the real 2026/27 calendar (Rumour Mill, Winter/Spring/Summer Windows) with 40-level Pass (free + Gold cosmetics: frames, inks, flairs, ringtones, byline flair, desk themes). Weekly events (seeded by ISO week) with rewards. Weekly event banners on Home and Practice. Desktop layouts: 1024px+ left-rail nav, 3-column Home dashboard, results two-column. Motion tokens, View Transitions, tilt, Roll numbers, haptics. Updated 2026/27 football data (summer transfers, Winter 2027 Wire). Three Remotion cutscenes (CareerColdOpen, SourceIntro, SeasonOpener) rendered server-side as MP4s. All text in EN, AR (Egyptian), ES with RTL/LTR logic, AA contrast, visible keyboard focus, reduced-motion respect.
- **Files:** `games/tier-one/v3/web/src/**` (all UI lanes merged), `games/tier-one/v3/GOTY.md` (spec), `games/tier-one/v3/web/package.json` (3.3.0), `tier-one/version.json`.
- **Heads-up for the team:** Scenes lane (Remotion cutscenes) completing separately; will merge once ready. Build is 2,945 kB (1,633 gzipped). No engine changes (Daily stays server-scored). Career perks (askCost, bookPerks) ready but not yet integrated into engine (Career/Practice windows unchanged for now; cosmetics + season progression + global byline wired).

## 2026-09-30 · mmoustafaeditor (Claude session) · Tier One: post animation, call gate, no hints, banter results
- **What changed:** Publishing plays a new post animation (`ui/PostScene.tsx`, rebuilt from the classic composer;
  tap to skip, reduced-motion static). The call panel opens with "Make a call" / "Decide later"; loudness chips no
  longer overlap (points under labels); outcome no longer pre-selected. Source-order hint banner and "next source"
  glow removed; locked sources say "Opens day N". Results screen (Daily, Rooms, Practice, Career) rebuilt: verdict,
  your calls as tweet cards with 1–3 best replies, the rest behind "See all replies" / "Full breakdown" / leaderboard /
  share sheets. Banter pools restored from the classic game + `lane/content` and extended natively (EN 741, AR 711
  Egyptian, ES 721 lines) in `i18n/parts/banter.ts`, picked per result by `lib/banter.ts`. SAIF-01/02 → In Progress.
- **Files:** `games/tier-one/v3/web/src/**`, `games/tier-one/SAIF_IMPROVEMENTS.md`, `tier-one/index.html`, `tier-one/version.json`.

## 2026-09-30 · mmoustafaeditor (Claude session) · Tier One: home bar, career slots, blog pencil, Wire rework
- **What changed:** Home top bar adds coins and Daily / Career / Room chips (Me press card reuses it); pages no longer
  scroll past their content; Today's five shows kits + player names (from `daily.start`'s cast; "?" offline);
  missions show their coin reward; reset/close times in local time instead of "00:00 UTC"; "byline" → "name"
  (EN/AR/ES). Career: no league card, 3 save slots each with a transfer code (`/api/online` save codes, 30 days,
  needs Redis), old saves migrate to slot 1. Prologue replay removed; blog renamed via a pencil by the title (first
  free, then 250 coins). Wire: real-market explainer, transfer-window countdown, coin rewards by star level (15/25/40/70),
  collapsible groups by stars/league/team, and a Wire board on the v3 server leaderboard (built from server scores).
  The Gaffer (same push window): tactics v3 roles, referee/VAR/discipline, slower live pace, green rebrand.
- **Files:** `games/tier-one/v3/web/src/**`, `api/tier-one/v3/index.js`, `tier-one/index.html`, `tier-one/version.json`.

## 2026-09-30 · lane9 (Claude session) · The Gaffer: purple mark replaced by the green banner mark
- **What changed:** The violet "THE [GAFFER]" banner and violet launcher "G" (v0.12, still in the published APK) are
  replaced by a refreshed mark in The Gaffer's own greens: same Barlow Condensed ExtraBold Italic letterforms and
  slanted banner. Two options behind one switch, `BRAND` in `games/the-gaffer/web/src/brand.ts`: **A** green banner /
  white type (default, shipped) and **B** white banner / green type. The switch drives the title-screen wordmark, the
  favicon, the share-card colours, and on Android (build.gradle reads it) the launcher icons, adaptive icon
  (foreground, background, monochrome) and the splash. Android window/status/nav colour: navy #070B16 -> #062421.
- **Files:** `games/the-gaffer/web/src/brand.ts` (new), `web/index.html`, `web/vite.config.ts`, `web/src/ui2/Title.tsx`,
  `web/src/ui2/share.ts`, `web/src/styles/app.css`, `scripts/brand-assets.mjs` (new generator), `android/app/build.gradle`,
  `android/app/src/main/java/.../MainActivity.java`, `android/app/src/main/res/{values,values-v31,drawable,mipmap-anydpi-v26}`,
  `android/app/src/brandA|brandB/res` (moved launcher PNGs), `android/store/icon.svg`, `android/store/play-store-icon-512.png`.
- **Heads-up for the team:** Not published: `/the-gaffer/` still has the old build until someone runs `npm run build:min`.
  **The APK must be rebuilt and republished** (`downloads/TheGaffer.apk`): launcher icons live in the APK and
  launchers cache them, so only a new APK (higher versionCode) clears the purple. No service worker or web manifest
  exists, so there is no web cache to bump; the build number bumps itself. Switching to option B: set `BRAND = 'B'`,
  rebuild web + APK (both options' Android icons are already generated). Tier One and the studio site are untouched.
## 2026-09-30 · saifsaber · Mostafa's sessions now open with Saif's updates + recommendations
- **What changed:** The session hook (`.claude/hooks/team-sync.sh`) now lists Saif's `UPDATES.md` entries since mmoustafaeditor's latest entry (title, files, heads-up) and Saif's open proposals per game, read from `origin/main`. `CLAUDE.md` § 1c now says: when working for mmoustafaeditor, before starting a task, tell him in one message what Saif updated (his game first), what Saif recommends for that game, and ask whether to include any proposal.
- **Files:** `.claude/hooks/team-sync.sh`, `CLAUDE.md`, `UPDATES.md`
- **Heads-up for the team:** Saif's list resets once mmoustafaeditor adds his own `UPDATES.md` entry, so keep logging every change there.

## 2026-09-30 · saifsaber · README looks like the sembagames.app home page
- **What changed:** The root README now opens with the home page hero ("Pick a game. Hit play.", with the Semba mark) and shows Tier One and The Gaffer side by side, as on the site. Their key-visual cards are rendered from `index.html` and link to each game. Under each card: Play, Android APK (from the site) and the game page. The old studio banner and Tier One card (old T1 art, "Open the game") are no longer used in the README. The images are 2× PNGs captured from the home page, with the countdown hidden so they don't go stale.
- **Files:** `README.md`, `.github/assets/{readme-hero,readme-tier-one,readme-the-gaffer}.png` (new), `UPDATES.md`
- **Heads-up for the team:** If the home page cards change, re-capture these three PNGs (Playwright screenshot of `.hero-top`, `.kv.t1` and `.kv.gfc`). `studio-banner.svg` and `tier-one-card.svg` are kept but unused.

## 2026-09-30 · saifsaber · README: APK links from the site, The Gaffer Android 2.1.0
- **What changed:** The root README's APK links now point to `https://www.sembagames.app/downloads/*.apk`. The old GitHub `raw` links give a 404 to anyone who isn't signed in, because the repo is private. The Gaffer's row now shows Android `2.1.0`, which its workflow published after PR #5 (new icon). Checked that the site serves the new APKs: Tier One 3.1.0 and The Gaffer 2.1.0 match `downloads/` on `main`, and both update feeds are live.
- **Files:** `README.md`, `UPDATES.md`
- **Heads-up for the team:** `games/tier-one/README.md` and `games/the-gaffer/README.md` still use the GitHub `raw` links, which 404 for the public.

## 2026-09-30 · saifsaber · Tier One Android 3.1.0: the app now runs the v3 game
- **What changed:** Tier One Android 3.1.0 (versionCode 17), done from Saif's session at Mostafa's request. The app now bundles the v3 build (`tier-one/index.html`, the same 3.1.0 game as sembagames.app/tier-one) instead of the classic game, with the new app icon. Two fixes make v3 work inside the app: from a file URL it now calls `https://www.sembagames.app` (the bare domain answers with a 308 redirect, and CORS preflights can't follow redirects, so every API call would have failed), and Android Back closes the app when v3 answers `false` (it used to wait for `'exit'`, which only the classic game sends). Checked by loading the new build from a `file://` URL: the v3 API and `/api/data` calls all return 200 and the home screen renders. `tier-one/` was rebuilt with `npm run build:min` (same game; only the build number and that file-URL API base changed). A 2.4.1 icon-only APK was built on the branch first and replaced by this one before release.
- **Files:** `games/tier-one/app/build.gradle`, `games/tier-one/app/src/main/java/com/tierone/game/MainActivity.java`, `games/tier-one/v3/web/src/lib/api.ts`, `tier-one/{index.html,version.json}`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, `games/tier-one/README.md`, `README.md`, `CLAUDE.md` (current versions, repo map)
- **Heads-up for the team:** The app now needs internet (the v3 Daily and world come from the server). The classic game is still on the site at `/tier-one-classic` but no longer in the APK. The README download link (GitHub) serves 3.1.0 once this is on `main`; sembagames.app and the in-app update prompt follow when Vercel deploys.

## 2026-09-30 · saifsaber · New app icons for Tier One and The Gaffer (Android)
- **What changed:** Both Android launcher icons and Play Store icons are redrawn in each game's new look. Tier One: a tilted newsprint card with a Newsreader "T1" and a vermilion rule on the dark newsroom desk, with a gold dot. The Gaffer: matches the v2.1 title-screen wordmark: "THE" in letterspaced mint over a wide Archivo 900 "G" with the white-to-mint gradient, on the dark teal ground (was a purple slanted panel). SVG sources in `store/icon.svg`; PNGs rendered with the site fonts. No game code changed.
- **Files:** `games/tier-one/app/src/main/res/mipmap-*/ic_launcher.png`, `games/tier-one/store/{play-store-icon-512.png,icon.svg}`, `games/the-gaffer/android/app/src/main/res/mipmap-*/ic_launcher.png`, `games/the-gaffer/android/store/{play-store-icon-512.png,icon.svg}`, `.claude/requests.md`
- **Heads-up for the team:** Tier One's icon is a game path: waiting for Mostafa's OK (request filed), and the published APK only changes when he does a release. The Gaffer: when this reaches `main`, its workflow builds and publishes a new APK (android/ changed), updates its feed and asks Vercel to deploy, so installed apps will be offered the update.

## 2026-09-30 · saifsaber · README brought up to date with the live site
- **What changed:** Root `README.md` now links sembagames.app at the top (plus a badge), shows the current versions that are live (Tier One web 3.1.0 / Android 2.4 classic; The Gaffer web 2.1.0 / Android app 0.12.0, which self-updates to the latest web build), lists the current repo layout (tier-one-classic, the-gaffer, api/the-gaffer, api/data, design, both APKs) and mentions both games in the Arabic section. Versions checked against the live sembagames.app version files and update feeds on 2026-09-30.
- **Files:** `README.md`, `UPDATES.md`
- **Heads-up for the team:** Site/docs only. When a game version changes, update its row in the README table.

## 2026-09-30 · saifsaber · Saif's proposal files per game + CLAUDE.md hook-up (docs only)
- **What changed:** Saif's improvement proposals are now recorded per game. `games/tier-one/SAIF_IMPROVEMENTS.md` holds four Tier One proposals (TIERONE-SAIF-01 deal comments/reactions, -02 humor/personality, -03 leaderboards/prizes/achievements/badges, -04 overlapping publish controls), all `Proposed`: unverified observations pending Mostafa's review. `games/the-gaffer/SAIF_IMPROVEMENTS.md` sets up the same workflow for The Gaffer with an empty list (`GAFFER-SAIF-nn` IDs). `CLAUDE.md` gains section 1c: identify the target game, read that game's file, and for mmoustafaeditor briefly list Saif's open proposals for it and ask whether to include any before starting; keep the two games apart; check the deploy target belongs to the right game. No game, UI or build change.
- **Files:** `games/tier-one/SAIF_IMPROVEMENTS.md` (new), `games/the-gaffer/SAIF_IMPROVEMENTS.md` (new), `CLAUDE.md`, `.claude/requests.md`, `UPDATES.md`
- **Heads-up for the team:** Mostafa: nothing is approved; say which proposals to take on, defer or reject. `games/tier-one/` is a game path, so this waits for your OK (see `.claude/requests.md`). Merging it to `main` runs the Tier One APK build and The Gaffer's build workflow (which calls the Vercel deploy hook), even though only docs changed.

## 2026-09-29 · mmoustafaeditor · Tier One 3.1: the newsroom game (classic spirit + v3 newspaper)
- **What changed:** The v3 presentation layer is rebuilt as "paper on the newsroom desk" (spec: `games/tier-one/v3/HYBRID.md`). Dark desk with newsprint cards, chunky game buttons, colour per mode, motion everywhere, and the cheeky classic voice.
  - **Home:** a press pass (level, XP, streak flame), Today's five with a live countdown and week dots, 3 daily missions with coin rewards, mode tiles and a wire ticker.
  - **Navigation:** new tabs Home · Story · Wire · Friends · Me.
  - **The saga file fits one screen:** What we know, a coach tip, source tiles, and Make the call with points printed on the buttons. The maths moves behind "How's this scored?".
  - **Source calls are full-screen scenes** with the classic per-source sounds, ported unchanged in `lib/synth.ts`: animated backdrops, a mumbled voice, a typed subtitle and the clue stamped into the file. The first call per source plays in full; repeats play short.
  - **Moments:** a publish burst with shake, an overnight time-lapse with rival breaking cards, taunts and a STOP PRESS twist, and a red Deadline Day takeover with a heartbeat.
  - **Results reveal:** the press rolls, your front page drops, sagas flip in with their points, the tier stamp slams (confetti for Tier 1), then XP, coins and the streak.
  - **Story mode replaces the Career Desk:** a disgraced-journalist prologue, 6 chapters mapped onto the career ranks, chapter intros, and editor and rival lines after each window.
  - **First run:** a welcome card, your byline, then a guided first saga with a 5-step coach.
  - Wire, Friends, Practice, Pass, How-to and Settings are restyled to match.
  - Engine, scoring, the server-held Daily and the save format are unchanged. The new save fields are optional.
- **Files:**
  - Screens: `games/tier-one/v3/web/src/screens/{Home,Me,Story,Saga,Window,Results,Onboarding,Wire,Rooms,Practice,Pass,HowTo,Settings}.tsx`
  - UI: `src/ui/{game.tsx,CallScene.tsx}`
  - Logic: `src/lib/{synth,sfx,progress,storyMode}.ts`
  - Styles: `src/styles/{game,home,play,story,screens}.css`
  - Strings: `src/i18n/parts/*.ts`
  - Spec: `games/tier-one/v3/HYBRID.md`
  - Release build: `tier-one/`
- **Heads-up for the team:**
  - New UI strings go in `src/i18n/parts/<area>.ts` as `{ en, ar, es }`; they merge over the base editions.
  - Character art slots are ready in `ui/CallScene.tsx` (`ART`). No drawn people anywhere until painted art lands.
  - The Android app still bundles the classic build; an APK with 3.1 is a separate step.

## 2026-09-29 · mmoustafaeditor · Studio site: gamey rework
- **What changed:** sembagames.app home rebuilt as a game-studio launcher. Animated studio hero (Semba mark with a spinning ring, "Pick a game. Hit play.") with two key-visual cards: Tier One on the newsroom desk (front page, slammed EXCLUSIVE stamp, ringing caller card, BREAKING ticker) and The Gaffer under floodlights (sweeping beams, drifting dust, chalk tactics drawing on a pitch). Each card has a 3-step "what you do" strip, live badges (Daily #N from days since 2026-09-01 UTC + 1, time to the next Daily, The Gaffer version read from `/the-gaffer/version.json`), a huge chunky PLAY button and the Android APK. Below, one tab strip (Games · Ranks · Updates · About, hash links `#games`, `#leaderboard`, `#updates`, `#about`, `#tier-one`, `#the-gaffer` still work) replaces the long scroll; Games has a Tier One / The Gaffer switcher with the phone explainer and feature cards. Leaderboard fetches, share, sticky play bar, privacy/terms and footer are unchanged in behaviour. Tier One tokens from HYBRID.md (desk, paper, vermilion, gold), The Gaffer's mint on dark green. Fonts are self-hosted (Archivo, Newsreader, IBM Plex Mono); Google Fonts is no longer loaded. Honors `prefers-reduced-motion`; no horizontal scroll at 360 px. Updates list gains The Gaffer 2.0 and 2.1.
- **Files:** `index.html`, `assets/fonts/*` (3 woff2 + OFL licences, copied from `games/tier-one/v3/look/fonts/` because `/games` is not deployed), `UPDATES.md`
- **Heads-up for the team:** When a game ships, add its line to the Updates panel in `index.html`. The Gaffer's badge reads `/the-gaffer/version.json` at load, so it follows releases by itself (fallback text is v2.1).

## 2026-09-29 · mmoustafaeditor · The Gaffer v2.1: dressing room, recruitment, training & pathway (V2.4–V2.6 combined)
- **What changed:** The three parallel increments merged into one build. V2.6 training & pathway (no lane entry of its own): load and recent minutes drive growth and injury risk, a Medical screen (treatments, rush-back with re-injury risk), position plans, an Academy that lives in the world (`world.academy`, seeded for every club) with Intake Day, academy loans, graduates and a rating-history curve on the profile. Cross-lane wiring: promoted graduates join the dressing room at trust 65 with the pathway (Prospect) promise; recruitment signings join it with the role agreed in the agent talk as a promise (regular → Starter) and loan-ins as loans; recruitment reads the room's `unhappyPlayers` rule; a release-clause sale also settles sell-on clauses; growth reads the room's personality (`archetypeOf`: Driven +15 %, Volatile −10 %); homegrown means promoted, academy-produced (`hg`) or at the club since 17; news, inbox, training report and decision links find academy players via `anyPlayer()`; other clubs' academy kids are not on the market. Save v8: steps 4→5 bridge, 5→6 room, 6→7 recruitment, 7→8 academy/training; v4 saves from 2.0 upgrade in order.
- **Files:** merge of `lane7/gf-dressing`, `lane7/gf-youth`, `lane7/gf-recruit`; integration edits in `sim/{upgrade,commands,decisions,clock,save,room,youth}.ts`, `sim/recruit/{ai,deals}.ts`, `ui2/{Decisions,Player,Training,text,roomText,game}.tsx/ts`, `App.tsx`, `model/types.ts`; release build in `the-gaffer/`.
- **Heads-up for the team:** `SAVE_VERSION` is 8. Look players up with `anyPlayer()` (sim/youth.ts) when an academy kid could be meant; signings, loans and graduates must go through `joinRoom`.

## 2026-09-29 · mmoustafaeditor · The Gaffer V2.4: the dressing room
- **What changed:** Trust (seasons) next to morale; a squad role in every contract (Star / Starter / Rotation / Prospect) plus an optional release clause; a derived hierarchy (3–4 leaders whose morale pulls the room's settle point, core, fringe); club-owned team cohesion that the engine reads for the user's side ((cohesion − 50)/25 levels, clamped ±2; the other side plays at 60); typed promises (4 roles + sign / keep / new contract) kept (+8 trust) or broken (−20; a leader's also costs cohesion −4); one-to-one talks (reassure / challenge / give your word) with outcomes by personality; players asking for a word; transfer requests after 5 matchdays of trust < 25 and morale < 40, rival bids for unsettled players and release clauses met by bigger clubs; the armband. Surfaces: Dressing room screen (Squad → Dressing room, Today's pulse, full-time), talk and armband sheets, profile block (trust/morale arrows with cause, role, promise chips), renewal sheet (role + clause), Today cards, inbox/news story lines, a cohesion cause on the Why card. Save v6 (step 5→6, plus a 4→5 bridge).
- **Files:** `games/the-gaffer/web/src/sim/{room,room-decisions,cohesion}.ts`, `src/ui2/{Room.tsx,roomText.ts}`, `src/lang-dressing*.ts`, `src/styles/dressing.css`, small hooks in `sim/{clock,commands,decisions,season,match,transfers,aftermath,save,upgrade}.ts`, `sim/engine/story.ts`, `model/types.ts`, `src/App.tsx`, `ui2/{Decisions,text,why,game,Sheets,Player,Squad,Today,FullTime}`, `sim-tests/{room,roomsave}.ts`
- **Heads-up for the team:** `SAVE_VERSION` is 6 in this lane (recruitment 7, training 8 add their own steps). Other systems can read `unhappyPlayers(world, clubId)` from `sim/room.ts` and react to `room.request` / `room.interest` / `room.clause` domain events.
## 2026-09-29 · mmoustafaeditor · The Gaffer V2.5: recruitment (needs, knowledge fog, two-stage transfers, agent talks, loans)
- **What changed:** Needs derived from Plan A and the squad (red/amber, change the shape and they change); knowledge 0–100 per player with scout assignments (league / country / worldwide + position, slots from the scouting facility), ranges that only narrow and always contain the truth; scout picks with "why he fits"; club stage with reservation price, counters, patience, 5-matchday freezes, answers next matchday (instant on deadline day) and rival hijacks; the negotiation room (agent style, hidden priority, patience, wage/years/role, signing-on fee, release clause, appearance bonus, live win chance); instalments and sell-on committed against spending room atomically; loans with wage share and minutes clauses (parent trust, recall); need-driven AI bids for our players; Today cards, news, inbox, staff log, staff delegation through the same commands. Save v7.
- **Files:** `games/the-gaffer/web/src/sim/recruit/*` (new), `ui2/Transfers.tsx` (rewritten), `ui2/Talks.tsx`, `ui2/recruitText.ts`, `styles/recruit.css`, `lang-recruit*.ts` (new); small hooks in `sim/{commands,clock,decisions,staff,save,upgrade,estimate,loans,transfers}.ts`, `ui2/{Decisions,Player,Office,text,game}.tsx/ts`, `App.tsx`; `sim-tests/recruit.ts`.
- **Heads-up for the team:** `SAVE_VERSION` 7 (step 6→7 in `sim/recruit/save.ts`; 4→5/5→6 are `??=` pass-throughs until the other lanes merge). Two adapters in `sim/recruit/ai.ts` (`unhappyOf`, `onSigned`) are to be pointed at `sim/room.ts` (`unhappyPlayers`, `joinRoom`) when V2.4 merges.

## 2026-09-29 · mmoustafaeditor · The Gaffer v2.0: real 2026/27 world, one engine contract, Today and delegation
- **What changed:** First v2 milestone (V2.0–V2.3 of `games/the-gaffer/V2_DESIGN.md`), built to the `v2/look` mockups. Real 2026/27 world imported from `data/seed/` (facts only; in-house ratings and designer tiers; fictional-names switch; uncovered leagues stay generated). New sim core: commands with validation (`sim/commands.ts`), one event log (`sim/events.ts`), the clock (`sim/clock.ts`), `MatchRecord` (`sim/record.ts`), per-department delegation with staff personalities (`sim/delegation.ts`, `sim/staff.ts`), the Today decision queue (`sim/decisions.ts`), two IndexedDB save slots (`sim/slots.ts`), save v4 through the upgrade chain. New UI (`src/ui2/`): Today, Squad, Player, Match (chalk tactics board, fixtures, table, cups), pre-match tunnel, floodlit live match, half-time Why card, full-time, Transfers, Club office and staff room, Career, Club Pass (concept), Settings, News, Training, quick match. EN / Egyptian Arabic / ES / FR, RTL. Cut: development points, licence quiz, board donations, formation locks. Old `src/ui`, `src/components`, the old stylesheets and the unused @fontsource packages are gone. Release build 2.0.0 published to `/the-gaffer/`.
- **Files:** `games/the-gaffer/web/src/**` (sim, model, ui2, lang-v2*, styles, data/real.ts), `games/the-gaffer/web/scripts/{import-seed,tiers}.mjs`, `games/the-gaffer/web/sim-tests/{realworld,v2core}.ts`, `games/the-gaffer/web/package*.json` (2.0.0), `games/the-gaffer/README.md`, `the-gaffer/index.html` + `version.json`
- **Heads-up for the team:** Old careers are never lost: they load in their old fictional world ("Continue old career") and stay in slot 1; `gaffer.save.v1` is kept read-only. The Android backup mirrors the active slot (`gaffer.backup.v2`). `src/boot/` is unchanged (Tier One v3 imports it). Regenerate the real world with `node games/the-gaffer/web/scripts/import-seed.mjs` after a seed update.

## 2026-09-29 · mmoustafaeditor · Tier One v3 app: playable build at /tier-one-v3 (not the cutover)
- **What changed:** New React + Vite + TS single-file app for Tier One v3 (EN, Egyptian Arabic RTL, ES), built to the v3 look. Playable: front page on the real Wire, the Daily (server-held board and score: sources, evidence by circle, composer with printed stakes, rivals, announced twist, 60 s Deadline Day with Quick post, results with per-saga breakdown and a PNG scoop card), Practice (Coach odds, board codes, past Dailies once their seed is published), Career (ranks, Rep, Trust, club leaks/freeze-outs, favours), The Wire (calls on real rumours, Market pricing, settlement from the data snapshot + `api/tier-one/v3/_lib/wire-overrides.json`), weekly leagues, Friends rooms (server-scored rounds), achievements, streak with grace days, wallet/shop with earned credits, Semba Pass page (concept only, nothing takes money). Save `tierone_v3` with a `v` migration chain. New API `/api/tier-one/v3` (one function). The rules engine now lives in `api/tier-one/v3/_lib/engine.mjs` (the old path re-exports it).
- **Files:** `games/tier-one/v3/web/**`, `api/tier-one/v3/**`, `tier-one-v3/index.html` + `version.json` (release build), `games/tier-one/v3/engine/*.mjs`, `vercel.json`, `.gitignore`
- **Heads-up for the team:** `tier-one/index.html` (v2) is untouched; no APK change. Set `T1V3_SALT` (any long random string) in Vercel before this goes live: without it the Daily is refused in production. It uses the same Redis env as `api/online.js`. `vercel.json` gains a `/tier-one-v3` rewrite and `includeFiles: data/seed/**` for the new function. Rebuild with `cd games/tier-one/v3/web && npm ci && npm run build:min`; play-test locally with `npm run serve` (fake Redis); API smoke: `npm run smoke:api`.

## 2026-09-29 · mmoustafaeditor · Tier One v3 visual direction ("the newsroom look")
- **What changed:** Added the art direction for the Tier One v3 rebuild: design tokens (morning and late editions, plus Arabic), a component layer, bundled OFL fonts (Newsreader, Schibsted Grotesk, Archivo, IBM Plex Mono, Noto Naskh Arabic, IBM Plex Sans Arabic), original crest and portrait generators, and hi-fi mockups of 7 screens, one of them also in Arabic RTL. These are mockups, not the production app.
- **Files:** `games/tier-one/v3/look/**` (start at `mockups/index.html` and `LOOK.md`)
- **Heads-up for the team:** Nothing live changed. Source credibility is now "Grade A–D" so it doesn't clash with the "Tier 1" result rank. The Press Pass page is marked as a concept.
## 2026-09-29 · mmoustafaeditor · Tier One v3 design spec (design only, no game code)
- **What changed:** New ground-up v3 spec: Daily core rebuilt on 4 outcomes with a planted "spin" (correlated misinformation), one announced twist, story-driven source opening days, a two-source rule for exclusives, Tier 1 = 180+ with an exclusive; the Wire (real rumours, market-priced scoring, locks, leagues); Career ranks with earned source Trust and club relations; Semba Credits economy, Press Pass, season track; connection map, player journeys, cut list, screen list, data contract. Rules-as-code reference engine in `games/tier-one/v3/engine/`. Numbers set by hand (owner: no sim suites this round), with telemetry gates in DESIGN.md §3.10.
- **Files:** `games/tier-one/v3/DESIGN.md`, `games/tier-one/v3/engine/daily-engine.mjs`, `games/tier-one/v3/engine/rng.mjs`
- **Heads-up for the team:** Nothing live changes. The v2 game (`tier-one/index.html`) is untouched. v3 needs a new server API and a data service before any build.
## 2026-09-29 · mmoustafaeditor · Semba football data service (real 2026/27 squads, transfers, rumours)
- **What changed:** New shared data backend for both games. A researched snapshot (no paid API) of the 2026/27 season after the summer window: 108 clubs (all of the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, plus the top 6 in Egypt and Saudi Arabia), 3,603 players with positions/numbers/nationality (88% with birth dates), 1,557 confirmed summer 2026 moves touching those clubs and 35 open rumours for January/summer 2027, each with sources and a `confidence`. Served by `/api/data/health`, `/api/data/snapshot?league=|club=`, `/api/data/rumours`, `/api/data/transfers?since=`. `SEMBA_DATA_NAMES=fictional` switches every name to The Gaffer's fictional ones. No crests, kits or photos are stored.
- **Files:** `api/data/*` (endpoints + `_lib`), `data/seed/*` (snapshot), `data/curated/*` (hand-researched rumours/overrides), `data/tools/*` (refresh, validator, smoke test), `data/SCHEMA.md`, `data/REFRESH.md`, `data/tests/`, `vercel.json` (bundles `data/seed` with the functions), `.vercelignore`, `.gitignore`, `CLAUDE.md` (repo map row)
- **Heads-up for the team:** The games don't read it yet (next step per game). Refresh weekly with `data/REFRESH.md` (`node data/tools/refresh.mjs` then `node data/tools/validate.mjs`); `/api/data/health` reports `stale: true` after 10 days. No env vars or Redis needed.

## 2026-09-29 · mmoustafaeditor · Tier One reskin "Pitch Night" (dark sports UI)
- **What changed:** Restyle only, no features, screens or data changed. A theme layer (`@@LANE CSS:t1ui`, loads last) gives the default look charcoal-navy surfaces, one green accent (#3DDC6E) with red for negatives, and thin Barlow type (light big numbers and names, no italics/caps). Buttons and tabs are pills; the board and feed are headline lists with hairline dividers; cards lose their outlines; results/leaderboard use round W/L/exclusive dots. `@@LANE JS:t1ui` swaps emoji UI icons (sources, rivals, crown, phone, How to play, More, medals…) for one set of inline line-SVG icons as they render (tweet/news bodies and share text keep their emoji). Barlow 300/600 Latin subsets are embedded, so it works offline. Theme **Auto** now always shows the dark look (the explicit Light option still works, with green accents). Deadline Day keeps its red palette. Scoring was checked unchanged (same seeds give the same points).
- **Files:** `tier-one/index.html` (new font block, CSS slot `t1ui`, JS slot `t1ui`, theme-color meta), `UPDATES.md`
- **Heads-up for the team:** New UI CSS should use the tokens (`--panel`, `--accent`…). Emoji added to UI labels get turned into icons automatically if they're in the `t1ui` map. The APK needs a rebuild to ship this.

## 2026-09-29 · mmoustafaeditor · Tier One 2.4 APK published (Android 2.4, versionCode 15)
- **What changed:** `downloads/TierOne.apk` is now the 2.4 build from CI run 84 (bundles the live 2.4.0 game with the retuned math). The update feed moves from 2.3 to 2.4 / versionCode 15, so installed apps get the prompt.
- **Files:** `downloads/TierOne.apk`, `api/tier-one/latest.js`, `UPDATES.md`
- **Heads-up for the team:** None.

## 2026-09-28 · saifsaber · The Gaffer: new APK and live updates for the site and the app
- **What changed:** New APK (0.12.0, versionCode 29843669, same signing key, installs over 0.11). Live updates:
  - **Build numbers:** every web build gets one (minutes since 1970) plus `/the-gaffer/version.json`. The APK versionCode is that number, so versions never need bumping by hand.
  - **Website:** the game shows "Update now" when a newer build is live. Game page and `version.json` are served with no cache.
  - **Android app:** a new `WebUpdater` replaces the 6-hourly `UpdateChecker`. It downloads new web builds in the background (size + SHA-256 checked), shows the same banner in the game (EN/AR/ES/FR), falls back to the bundled build if a download ever fails to start, keeps a copy of the save outside the page, and shows "Download" when a new APK is out.
  - **Workflow:** on every push to `main` it builds web + APK, commits the web build back with `[skip ci]` (plus the APK and `api/the-gaffer/latest.js` when `android/` changed, or on request), then triggers Vercel through a deploy hook. It checks the APK's signature, versionCode and bundled page.
- **Files:** `.github/workflows/build-the-gaffer.yml`, `games/the-gaffer/android/app/build.gradle`, `…/MainActivity.java`, `…/WebUpdater.java` (new), `…/UpdateChecker.java` (removed), `games/the-gaffer/scripts/publish-apk.mjs` (new), `games/the-gaffer/web/{vite.config.ts,package.json,tsconfig.json}`, `web/src/update.ts`, `web/src/ui/UpdateBanner.tsx` (new), `web/src/{App,main}.tsx`, `lang-new*.ts`, `styles/gaffer.css`, `the-gaffer/{index.html,version.json}`, `games/the-gaffer/build/*`, `downloads/TheGaffer.apk`, `api/the-gaffer/latest.js`, `vercel.json`, `games/the-gaffer/README.md`, `CLAUDE.md`
- **Heads-up for the team:** mmoustafaeditor: add the `VERCEL_DEPLOY_HOOK` secret (steps in `games/the-gaffer/README.md` › Live updates), or bot commits won't go live. Install the new APK once from sembagames.app/downloads/TheGaffer.apk after the merge; later updates arrive inside the app.

## 2026-09-28 · saifsaber · The Gaffer 0.12.0: manager overhaul (staff room, transfer windows, loans, ratings, new navigation)
- **What changed:** Built from saifsaber's decisions on the product audit (https://claude.ai/artifact/S5oRNcQG4emVv2RxLxik2n).
  - **Navigation:** five tabs, Home · Squad · Match · Transfers · Club; settings sit behind the gear in Club; one way into each screen.
  - **Home:** a "Today: n things need you" list, each item with one button, plus the next match, form, board, fans and headlines.
  - **Staff room:** 13 duties you can hand to staff or take back, everything except playing the match. Adds a sporting director (old saves get one). Staff log what they did, and in a simulated season a fully delegated career did as well as a hands-on one.
  - **Matchday:** player ratings, man of the match, xG, commentary that no longer repeats the same line, and a full-time card (table move, board, fans, injuries, records, milestones).
  - **Transfers:** summer and winter windows with deadline day (AI bids and deals only happen while a window is open; free agents sign any time), a shortlist, scout rating ranges for players outside your league, season loans in and out.
  - **History and records:** past seasons, club records, a trophy cabinet and academy graduates.
  - **Support:** Supporter pack (3 club looks, badge, no ads), an optional rewarded ad for a free scout report, and a labelled sponsor card. All off until ids are filled in (`games/the-gaffer/MONETIZATION.md`). Privacy page updated.
  - **Design:** line icons instead of emoji tiles, visible focus, reduced motion, 40 px+ targets, and on desktop two columns with a side rail. New text in EN/AR/ES/FR.
- **Files:** `games/the-gaffer/web/src/**` (new: `sim/staff.ts`, `sim/loans.ts`, `sim/windows.ts`, `sim/ratings.ts`, `sim/records.ts`, `sim/estimate.ts`, `sim/aftermath.ts`, `sim/groups.ts`, `monet.ts`, `lang-new*.ts`, `ui/Home.tsx`, `ui/MatchHub.tsx`, `ui/Transfers.tsx`, `ui/ClubHub.tsx`, `ui/StaffRoom.tsx`, `ui/History.tsx`, `ui/FullTime.tsx`, `ui/Support.tsx`, `ui/icons.ts`, `ui/staffText.ts`), `games/the-gaffer/build/index.html`, `the-gaffer/index.html`, `api/the-gaffer/verify-purchase.js` (new), `design/assets/icons/ui/*`, `games/the-gaffer/{README,MONETIZATION}.md`, `web/package.json` (0.12.0), `android/app/build.gradle` (versionCode 5)
- **Heads-up for the team:** Web 0.12.0; the Android build is set to versionCode 5 but `downloads/TheGaffer.apk` is **still 0.11.0**. Once the workflow builds it, replace the APK and then bump `api/the-gaffer/latest.js` to 0.12.0 / 5 (left at 0.11.0 on purpose). Ads and the Supporter pack stay off until the ids in `web/src/monet.ts` are set. Existing balance, not changed here: in one test seed the board sacked a top club's manager in 3rd place by matchday 27, delegated or not.

## 2026-09-28 · saifsaber · The Gaffer: phone UI fixes from the product audit (web 0.11.0)
- **What changed:** Fixed defects found in a browser run of every screen: the THE GAFFER logo and the Quick match tile ran off the right edge on phones; set-piece pickers (Tactics) covered their labels; Squad/Match/League with no career now offer a New career button instead of a dead end; News, Inbox, Your career and Quick match go Back to the tab you came from (not always Home); "1 players out of position" / "1 starters are tired" plurals fixed in EN/AR/ES/FR.
- **Files:** `games/the-gaffer/web/src/App.tsx`, `ui/parts.tsx`, `styles/gaffer.css`, `i18n.ts`, `lang-es.ts`, `lang-fr.ts`, `games/the-gaffer/build/index.html`, `the-gaffer/index.html`
- **Heads-up for the team:** Web only. `downloads/TheGaffer.apk` is still the 0.11.0 build without these fixes: rebuild it from the `build-the-gaffer` workflow artifact at the next Gaffer release. Bigger changes from the audit are waiting for saifsaber's go-ahead.

## 2026-09-28 · saifsaber · The Gaffer moved into the team repo (web 0.11.0, Android 0.11.0 / versionCode 4)
- **What changed:** Brought The Gaffer (game 02, football manager) over from the retired `saifsaber/tier-one`: web source, minified build, Android project, update feed and APK. Once merged it's served at sembagames.app/the-gaffer, with the APK at `/downloads/TheGaffer.apk` and the feed at `/api/the-gaffer/latest`. Added a README card. The build workflow now only builds and uploads the APK; the old step that pushed bot commits straight to `main` is gone.
- **Files:** `the-gaffer/index.html`, `games/the-gaffer/**`, `api/the-gaffer/*`, `downloads/TheGaffer.apk`, `.github/workflows/build-the-gaffer.yml`, `vercel.json` (new: `/the-gaffer` rewrite + APK download headers), `design/` (17 shared files the source imports: tokens, components, fonts, 8 icons, logo), `.gitignore`, `.vercelignore` (+`/design`), `README.md`, `CLAUDE.md`, `.claude/requests.md`
- **Heads-up for the team:** It touches `api/` and `downloads/`, so it waits on branch `ccr-dc1851aa-6gusor` for mmoustafaeditor's OK (see `.claude/requests.md`). No Tier One files changed. `index.html` (the Tier One landing page) has no Gaffer link yet.

## 2026-09-28 · mmoustafaeditor · Launch polish: leaderboards, share card, snap calls, rival race, Career journey, new landing page (web 2.4.0, Android 2.4)
- **What changed:** New sembagames.app landing page (20-second animated explainer, live Today/This week leaderboard, "You asked, we shipped", sticky Play bar). Daily and weekly leaderboards (`lb.submit`/`lb.top`/`lb.me` in `api/online.js`; anonymous device id + chosen nickname; Leaderboard screen from the Home Daily card). Results: journalist profile chip ("The Sniper", "The Grinder"…), "#n of m today", Daily and Tier 1 streaks, room "Beat @nick by n", who-lied proof line, Challenge a friend, U-turn "First take / Final" story, rival posts marked right/wrong; the share image carries all of it; DRAFT PENDING chip while a U-turn is a draft. Board/player page: "Exclusive race" meter (Tabloid → ITK → Insider, scooped/locked/open), Doubt it / Big if true reactions on rival posts, rival tag on the Overnight sheet, rival-watch hint in Career. Deadline Day: screen darkens with the clock, heartbeat from 30 s, "Snap calls" overlay at 15 s (one tap posts as Advanced), TIME stamp at zero. Career: one-sentence effect on every gear item and source-tree step (+ "pays for itself in ~n windows" where honest), "⚡ Early" badge when an upgrade opened a source early, level-up sheet with concrete unlocks and the next perk, Goals tab with 5 milestones, Legend career (prestige: tier bars +10, pay +10% per level, LEGEND tag). Intro: plays with sound straight through on every load — no Tap to start, no loading bar, no skip. Tutorial is 5 steps (Deadline Day + Tier 1 beats); How to play leads with the 5-line loop. Blue tick description fixed (it doubles exclusive followers).
- **Files:** `index.html`, `tier-one/index.html`, `api/online.js`, `api/tier-one/latest.js`, `games/tier-one/app/build.gradle`, `games/tier-one/README.md`, `CLAUDE.md`, `UPDATES.md`, `downloads/TierOne.apk`
- **Heads-up for the team:** Android versionCode 15. Leaderboards use the Redis store already connected in Vercel (keys `lb:d:*`, `lb:w:*`, 40/60-day TTL). `CONFIG.DAILY_REPLAY` is still `true` (testing) — set it to `false` before the public launch; replays never resubmit to the leaderboard.

## 2026-09-28 · mmoustafaeditor · Epic intro, Career source tree, Go louder, rivals, trophies (web 2.3.0, Android 2.3)
- **What changed:** Live-drawn full-screen Semba intro with a trailer-style soundtrack. iPhone/browser Back walks up the menus. Daily/Practice: all sources open Day 1 with early hunches, 4 contacts (web 2.1.0). Career/Rooms: gated sources again, source upgrade tree (reliability levels + earlier physio/airport), Career-only tier bars that rise with upgrades, pay ×2.25, boosts repriced. Go louder on a posted call; U-turn is a draft until the new call posts; results compare "You called | What happened". Rival journalists clearly labelled, "Beaten by @X on Day N" on results. Compact Trophies grid, Rare+ pop-ups by default with a setting.
- **Files:** `tier-one/index.html`, `games/tier-one/intro-sound/*`, `games/tier-one/app/build.gradle`, `api/tier-one/latest.js`, `downloads/TierOne.apk`, `games/tier-one/README.md`, `CLAUDE.md`, `UPDATES.md`
- **Heads-up for the team:** Android versionCode 14. `semba-intro.*` video files are unused but still bundled in the APK.

## 2026-09-28 · mmoustafaeditor · Tier 1 capped at ~20% everywhere; owner UI fixes (web 2.0.2, Android 2.2)
- **What changed:** Tier 1 now needs 385; gear is gentler (reliability +2, Wi-Fi +1 contact on day 6, Second phone on day 5, twist warnings 20%/+10%); boosts cost $200/$500/$800 and still double per repeat. Simulated strong play: Daily ~12% T1, fully geared career ~17–19%. UI (2.0.1): classic-speed tweet typing with sounds, source calls play the full animation then show the chat, simpler "What we know" list, "Decide later" button, no ad banners during play (Career-only "Watch ad · +1 contact" pill), Arabic names wrap instead of truncating.
- **Files:** `tier-one/index.html`, `games/tier-one/app/build.gradle`, `api/tier-one/latest.js`, `downloads/TierOne.apk`, `games/tier-one/README.md`, `CLAUDE.md`, `UPDATES.md`
- **Heads-up for the team:** Android versionCode 13. If AdSense auto ads are turned on, disable anchor/overlay formats so no banners appear over game screens.

## 2026-09-27 · mmoustafaeditor · Tier One 2.0: full overhaul finished (web 2.0.0, Android 2.1)
- **What changed:** Everything shipped in 1.9–1.19 today, now complete: new game math (plot twists, late-opening sources, 3 contacts a day, final tuning: T1 at 370, +4/day early bonus, escalating boost prices), new design system, new Home + tab bar + 45 s learn-by-doing tutorial, board with Overnight sheet and a real-time Deadline Day clock (also on the player page, resumes on reload), redesigned player page, composer and U-turn sheet, new results (reveal, scoreboard, who-told-the-truth table, share image), Trophies cabinet with 66 achievements and PS5-style pop-ups, redesigned Career, Friends rooms and Past dailies, 500+ new replies (mixed reactions after U-turns, twist banter) in EN/ES/AR, Android Back handling, decluttered screens, ads never cover controls, plain labels instead of abbreviations. Full end-to-end QA across modes, languages, skins and sizes.
- **Files:** `tier-one/index.html`, `games/tier-one/app/build.gradle`, `api/tier-one/latest.js`, `downloads/TierOne.apk`, `games/tier-one/README.md`, `CLAUDE.md`, `UPDATES.md`
- **Heads-up for the team:** Android versionCode 12. In-progress windows from before 1.10 are discarded (save version 3). Rooms mid-season now score against the new rules. `DAILY_REPLAY` still `true` (testing only). New code goes in the lane slots (see CLAUDE.md).

## 2026-09-27 · mmoustafaeditor · Plot twists and crunch-time rules (web 1.10.0)
- **What changed:** New game math in every mode. 3 contacts a day (DD 3, 60 s). Sources open over the week: airport spotter from day 4, physio only on day 6 and Deadline Day, so one high-reliability read per player early no longer works. Exactly 2 real deals twist per window (seeded, same for everyone in the Daily and rooms): the wire posts 🚨 TWIST, earlier reads go out of date, that player's sources can be asked again, and updating a call after a twist is free. Scoring: Sure −12 / Confirmed −45 when wrong, exclusive +20 (before any rival posts), +10 for a right call after a twist. Career: gear effects rewritten (twist warnings, extra contacts on set days, sharper sources), no follower multiplier, pay retuned (~17 windows to full gear). Simulated: strong player in crunch on days 6–7 in ~78% of Daily windows, T1 ~19%; career crunch 78% → 41% from new to maxed.
- **Files:** `tier-one/index.html`, `UPDATES.md`
- **Heads-up for the team:** In-progress windows from older versions are discarded (save version 3). Redesigned board/player/results screens are still coming. APK not rebuilt yet.

## 2026-09-27 · mmoustafaeditor · New look, Android Back fix, mixed U-turn replies (web 1.9.0)
- **What changed:** First part of the big overhaul. New "Deadline Night" design system (tokens, all 5 skins, a working Daylight light theme, stronger red Deadline Day takeover, offline-safe fonts, new sound cues). Android Back now closes the open sheet / goes up a screen instead of quitting the app (the APK calls `window.__tierBack`, which never existed). Fan replies after a U-turn are now mixed praise + call-outs even when the final call is right. Adds lane scaffolding (CSS/I18N/JS slots, `LANE_ACTS`, `SCREENS`, `onHook`) used by the rest of the overhaul: new game math (plot twists), new screens and a Trophies tab are coming next.
- **Files:** `tier-one/index.html`, `UPDATES.md`
- **Heads-up for the team:** APK not rebuilt for this interim web release. `DAILY_REPLAY` still `true`.

## 2026-09-27 · mmoustafaeditor · Harder Tier 1, sticky sources, planted wire stories, per-player breaking news, harsher banter (web 1.8.0, Android 2.0)
- **What changed:** Rebalanced the game by simulation. Tier cutoffs are now T1 350 / T2 250 / T3 160 / T4 70 (a perfect-play bot went from 92% to 29% T1, a decent casual bot from 51% to 14%). Each source can be asked once per player per window and sticks to its story, so you have to ask around. About 1 in 3 telling news-wire events is a planted red herring (the wire now gives the answer away free in 66% of sagas by day 5, down from 85%). Bribe is $150 and once per player. Career pay trimmed to $40 + half the points + $20 per exclusive + tier bonus (120/60/30/10) so the full gear set takes about 15 windows. The overnight "headlines" popup is gone: a player with new rival/wire news gets a NEW chip, and opening him shows a BREAKING banner with only his news. New voice pack v5 (EN/ES/AR) with much harsher, reckless banter, still PG-13.
- **Files:** `tier-one/index.html`, `games/tier-one/app/build.gradle`, `api/tier-one/latest.js`, `downloads/TierOne.apk`, `games/tier-one/README.md`, `CLAUDE.md`
- **Heads-up for the team:** Web 1.8.0, Android 2.0 (versionCode 11). Old boards for the same seed are unchanged except for the red herrings, but anyone mid-season in a room scores against the new tier cutoffs. `CONFIG.DAILY_REPLAY` is still `true` (testing only).

## 2026-09-27 · mmoustafaeditor · 5 players/4 contacts, no repeated lines, red Deadline Day, clearer exclusives and headlines
- **What changed:** Every mode is now 5 players, 4 contacts a day, 7 days (tier cutoffs and pay rescaled). No line ever
  repeats within a window (source clues, source DMs, rival posts, news wire, official lines, DM openers) and recently
  seen lines are avoided; ~310 new lines (EN/ES/AR) widen the rival/news pools. Lying sources now lean towards "it's
  happening" (~70% of lies), for more intrigue. The airport spotter's plane follows the clue: lands (done), diverts
  (hijack), turns back (collapsed), or no plane (fake). Deadline Day turns the whole app red. Results show a gold
  EXCLUSIVE banner vs a green RIGHT banner that names the rival who beat you. New "Overnight headlines" sheet after each
  day and NEW rumour tags on saga cards. Web 1.7.0, Android 1.9.
- **Files:** `tier-one/index.html`, `games/tier-one/app/build.gradle`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** Boards changed shape (5 sagas), so rooms created before this update will get 5-player
  seasons from now on. `DAILY_REPLAY` still `true`. Next Android release is versionCode 11.

## 2026-09-26 · mmoustafaeditor · Career cash economy: goals, payday, bigger packs; online store connected
- **What changed:** Career pay now rewards good windows ($40 + half the points + $25/exclusive + tier bonus, about
  $150–$600 a window). Boosts cost $40/$60/$90. New **Career goals** card (level 7, Tier 1 three times, all 14 gear,
  100K followers) → 👑 Tier One Legend badge; completable in roughly 15–20 windows without paying. Soft nudges: daily
  Payday +$60, one ad a day for +$40, gear you can't afford shows "need $X" and points to cash packs, packs are now
  $400/$1,400/$3,500 with "Most popular"/"Best value" tags. Rooms stay level: no packs, payday or ad cash there.
  mmoustafaeditor connected the Redis store in Vercel; this deploy turns online play on. Web 1.6.0, Android 1.8.
- **Files:** `tier-one/index.html`, `games/tier-one/app/build.gradle`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** Real-money cash packs stay disabled until Stripe Payment Links are pasted into
  `CONFIG.STRIPE_LINKS` (see `games/tier-one/LAUNCH.md`). `DAILY_REPLAY` still `true`. Next Android release is versionCode 10.

## 2026-09-26 · mmoustafaeditor · Redeploy request done
- **What changed:** Saif's "Redeploy the site on Vercel" request is closed: mmoustafaeditor's push to `main` (2a3614d)
  deployed on Vercel ✅, which also put Saif's tidy-up live (`/api/verify-purchase` now answers). Removed the request
  from `.claude/requests.md`.
- **Files:** `.claude/requests.md`, `UPDATES.md`.
- **Heads-up for the team:** Saif's own merges will still be blocked until he's added to the `semba-game-studios`
  Vercel team (Settings → Members).

## 2026-09-26 · mmoustafaeditor · Play with friends (rooms), transfer codes, dollars, 10 new gear items
- **What changed:** New **Play with friends**: create a private room (3/5/10 seasons) or join with a 5-letter code or
  invite link; each season everyone in the room gets the same sagas; each room has its own career and a leaderboard.
  **Move to another device** in Settings gives a short transfer code (30 days). Credits are now dollars (`$`).
  Gear shop grew from 4 to 14 items with level locks (source-reliability boosts, Deadline Day power bank, podcast
  studio for followers, blue tick for exclusives, lucky trench coat, second laptop). Outcomes renamed to
  "❌ Deal collapses, he stays" / "🧢 Fake news, never real". Web 1.5.0, Android 1.7.
- **Files:** `tier-one/index.html`, `api/online.js` (new), `games/tier-one/LAUNCH.md`, `games/tier-one/app/build.gradle`,
  `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** ⚠️ Online play needs a Redis store connected in Vercel (steps in `games/tier-one/LAUNCH.md` ›
  Online play). Until then the game says "Online play is switching on soon". Use `C()` for the active career in game code.
  `DAILY_REPLAY` still `true`. Next Android release is versionCode 9.

## 2026-09-26 · saifsaber · Deploy check: every session says if main isn't live on the site
- **What changed:** The session hook now checks the Vercel status of the latest `main` and warns when the deploy was
  blocked (Vercel only deploys commits from accounts in the `semba-game-studios` team, so merges from saifsaber or
  moemsacod get blocked). `CLAUDE.md` section 2 now says: after a change lands on `main`, make sure it's live; a push
  to `main` from mmoustafaeditor deploys everything, otherwise Redeploy in Vercel.
- **Files:** `.claude/hooks/team-sync.sh`, `CLAUDE.md`, `UPDATES.md`.
- **Heads-up for the team:** mmoustafaeditor: after you finish new work and push to `main`, check that `main` shows ✅.
  That one push also puts live anything Saif or Moemen merged before it.

## 2026-09-26 · saifsaber · Team requests board; ⚠️ Mohamed: please Redeploy on Vercel
- **What changed:** New `.claude/requests.md` for requests one teammate leaves for another (things only that person
  can do). The session hook reads it from `origin/main` and shows every open request at the start of each Claude Code
  session, so Claude tells the user first. First request: mmoustafaeditor, please Redeploy on Vercel (the PR #2 deploy
  was blocked because Saif's account isn't in the Vercel team).
- **Files:** `.claude/requests.md` (new), `.claude/hooks/team-sync.sh`, `CLAUDE.md`, `UPDATES.md`.
- **Heads-up for the team:** Live site is still the pre-tidy-up deploy until Mohamed redeploys. When a request is
  done, delete it from `.claude/requests.md`.

## 2026-09-26 · mmoustafaeditor · Repo tidy-up: Stripe function into api/, .gitignore, hook fix, old branches removed
- **What changed:** Done by saifsaber at mmoustafaeditor's request. The session hook no longer prints "This repo is
  RETIRED" in the team repo (it now only shows inside a `saifsaber/tier-one` clone). `verify-purchase.js` moved to
  `api/verify-purchase.js`, so Vercel actually serves it at `/api/verify-purchase` (it did nothing at the root).
  New `.gitignore` for Gradle/Android build output. Removed the unused `assets/semba-logo-512.webp`; the Play Store
  icon moved to `games/tier-one/store/`. Stale branches `claude/android-project` and `claude/studio-setup-port`
  (fully merged) were deleted. No game or app changes.
- **Files:** `.claude/hooks/team-sync.sh`, `api/verify-purchase.js` (moved), `.gitignore` (new),
  `assets/semba-logo-512.webp` (deleted), `games/tier-one/store/play-store-icon-512.png` (moved), `README.md`,
  `CLAUDE.md`, `games/tier-one/README.md`, `games/tier-one/LAUNCH.md`.
- **Heads-up for the team:** `claude/apk-build-sembagames-sync-1cnmkc` is identical to `main` but was left alone
  because it was in use; delete it once that session is done. The Stripe function is now live on deploy but harmless
  until `STRIPE_SECRET_KEY` is set and `VERIFY_ENDPOINT` is filled in. `DAILY_REPLAY` is still `true`.

## 2026-09-26 · mmoustafaeditor · Player types matter, roomy source list, unskippable intro with sound
- **What changed:** Superstar ★★★ (×1.5 points, ×2 followers), Star ★★ (×1.2, ×1.4) and Squad player ★ (×1) now
  change scoring, right or wrong: gold/silver badges on saga cards, an explainer in the saga sheet, the call buttons
  show this player's exact stakes, and results show points and followers per call. Tier cutoffs raised ~25%
  (Tier 1 = 375+) to keep it hard. Sources are now a one-per-row list with a big "contacts left today" wallet
  (number + pips) and a cost pill per source. The Semba intro can't be skipped; if the browser blocks sound it shows
  "Tap to start" so it always plays with sound. Web 1.4.0, Android 1.6.
- **Files:** `tier-one/index.html`, `games/tier-one/app/build.gradle`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** Open question with the user: renaming/merging the "❌ Collapses / he stays" and
  "🧢 Nothing in it" outcomes (unchanged for now). `DAILY_REPLAY` still `true`. Next Android release is versionCode 8.

## 2026-09-26 · mmoustafaeditor · Intro soundtrack, new barber/leak sounds, cleaner source tiles, sources bash the players
- **What changed:** The Semba intro now has a soundtrack timed to the video (neon power-on, dim, riser, a silent beat,
  the impact at 2.53s with debris, the neon re-ignite "shing" and a chord), baked into `semba-intro.webm/.mp4`. It plays
  with sound where allowed (Android app, Chrome after clicking through from the home page); otherwise it plays muted
  with a "🔊 Tap for sound" chip. New sounds: barber = scissor snips, spray bottle, comb flick and a short trimmer pass;
  leak = an old newsroom fax (dial, handshake, data, paper feed). Source tiles: contact cost is a badge in the corner,
  reliability (bars + High/Medium/Low) is a clean footer, "Your record" under it in Career; fixed the overlap and the
  RTL flip. About 360 new lines where sources take football-only shots at the player they're talking about, plus
  harsher post-match DMs at the journalist (EN/ES/AR). Web 1.3.0, Android 1.5.
- **Files:** `tier-one/index.html`, `tier-one/semba-intro.webm|mp4`, `games/tier-one/intro-sound/render.js` (new),
  `games/tier-one/app/build.gradle`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** `DAILY_REPLAY` is still `true` (testing). Next Android release is versionCode 7.

## 2026-09-26 · mmoustafaeditor · Sound overhaul; Daily Challenge replayable for testing
- **What changed:** New synth sound engine (no audio files, works offline in the app): the agent call is a double phone
  ring, pickup click and a clearly fake gibberish phone voice (with a voice meter on screen); barber is electric clippers
  and scissor snips; airport is a terminal chime and a jet flyby; physio heart monitor, kitman locker clang, leak
  typewriter, bribe cash register. Also a day boom, Deadline Day siren, typing clicks, send whoosh, hit/miss stings,
  a Tier 1–2 fanfare and a sad trombone for the clown tier. `CONFIG.DAILY_REPLAY` (new) lets the Daily be replayed:
  the tile says "Play again" and the latest run replaces that day's result (streak unaffected). Web 1.2.0, Android 1.4.
- **Files:** `tier-one/index.html`, `games/tier-one/app/build.gradle`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** ⚠️ `DAILY_REPLAY` is `true` for testing. Flip it to `false` (and ship a build) before launch.
  Next Android release is versionCode 6.

## 2026-09-26 · mmoustafaeditor · Cleaner studio home page; intro plays on every game load
- **What changed:** sembagames.app is now a single screen: headline, one Tier One card (Play / Android),
  "More games coming soon", and a one-line footer. The Semba intro now plays every time the game page loads
  (clicking Tier One or reloading), not once per session; it is skipped on Stripe returns and Privacy/Terms links.
- **Files:** `index.html`, `tier-one/index.html`, `CLAUDE.md`.
- **Heads-up for the team:** The APK already plays the intro on every app launch, so no rebuild needed.

## 2026-09-26 · mmoustafaeditor · Tier One 1.3: Semba intro, 3 source tiers, way more banter, new animations
- **What changed:** The game now opens with the Semba Studios intro video (once per browser session, tap to skip,
  still-image fallback when autoplay is blocked). Sources come in 3 tiers with a reliability bar under each one:
  High (Physio, Airport spotter) costs 3 contacts, Medium (Agent, Kitman) 2, Low (Barber, Rival newsroom leak) 1;
  Deadline Day now has 3 contacts. About 600 new lines (source clues, source post-match DMs, fan roasts and praise)
  written natively in English, Spain Spanish and Egyptian Arabic, PG-13; fixed source replies only ever using 2
  variants and the fan-comment pool being capped. The murky "Day 2 of 7" splash is replaced by a full-contrast
  day stinger; new motion across the game (screen entrances, spring bottom sheets that slide out, logo slam,
  tier sunburst, contact connection bar). Web 1.1.0, Android 1.3 (versionCode 4).
- **Files:** `tier-one/index.html`, `tier-one/semba-intro.webm|mp4|jpg` (new), `games/tier-one/app/build.gradle`,
  `.github/workflows/build-tier-one.yml`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** New game text goes through the "Voice pack v2" block in `tier-one/index.html`
  (arrays there are appended to the older packs, not replacing them). The APK build now bundles the whole
  `tier-one/` folder's `index.html` and `semba-intro.*`. Next Android release is versionCode 5.

## 2026-09-26 · mmoustafaeditor · Android project wired up: builds from the live game, CI, 1.2
- **What changed:** Finished bringing the Android app into `games/tier-one/`. The APK no longer keeps its own copy
  of the game: Gradle copies `tier-one/index.html` into the app at build time. New workflow
  `build-tier-one.yml` builds the APK on every push that touches the game or `games/tier-one/**`. Version set to
  1.2 (versionCode 3) to match the APK already published. Added `.vercelignore` so `games/` (which holds the
  signing key), `.github/`, `.claude/`, `CLAUDE.md` and `UPDATES.md` are not served on sembagames.app.
  Docs updated for the new site layout.
- **Files:** `games/tier-one/app/build.gradle`, `.github/workflows/build-tier-one.yml`, `.vercelignore`,
  `README.md`, `CLAUDE.md`, `games/tier-one/README.md`, `games/tier-one/LAUNCH.md`.
- **Heads-up for the team:** ⚠️ Keep `.vercelignore`: without it the signing key would be downloadable from the site.
  Next Android release is versionCode 4.

## 2026-09-26 · mmoustafaeditor · Studio home page, game moved to /tier-one, Daily archive, APK 1.2
- **What changed:** sembagames.app is now the Semba Games studio home page (official Neon Ring logo, green brand).
  Tier One moved to `tier-one/index.html`, served at sembagames.app/tier-one; share cards link there. In the game:
  "Daily window" is now "Daily Challenge"; tapping a finished Daily opens the full results (it used to do nothing);
  a new *Past challenges* screen keeps the last 120 days on the device. Days played before this change show outcomes
  and your emoji row but not your tweets. Published APK 1.2 (versionCode 3) and bumped the update feed.
- **Files:** `index.html` (now the home page), `tier-one/index.html` (the game), `assets/`, `downloads/TierOne.apk`,
  `api/tier-one/latest.js`.
- **Heads-up for the team:** ⚠️ The game is no longer at the root `index.html`: edit `tier-one/index.html`.
  Stripe Payment Links, once added, should return buyers to `/tier-one` (the home page forwards `?purchase=` there
  as a fallback).

## 2026-09-26 · saifsaber · Studio setup brought over from saifsaber/tier-one
- **What changed:** This repo is now the Semba Studios repo everyone works in (`saifsaber/tier-one` is retired).
  Added the studio README with the banner and clickable Tier One card, the brand art, `CLAUDE.md`, this log,
  and a Tier One game page written from the current game (10 contacts, 1–2 contact sources, Tier 1 at 300+).
  The old launch-kit README moved to `games/tier-one/LAUNCH.md`.
- **Files:** `README.md`, `CLAUDE.md`, `UPDATES.md`, `.github/assets/`, `games/tier-one/README.md`,
  `games/tier-one/LAUNCH.md` (was `README.md`).
- **Heads-up for the team:** ⚠️ The root `README.md` is now the studio page; the hosting/ads/Stripe guide is
  `games/tier-one/LAUNCH.md`. The game files did **not** move: `index.html`, `api/` and `downloads/` stay at the
  root because sembagames.app and installed apps load them from there. Still to bring over from the old repo:
  the Android Gradle project + `debug.keystore` (into `games/tier-one/`), a GitHub Actions APK build, and the
  `.claude/` session-start hook.

## 2026-09-26 · mmoustafaeditor · Launch kit, balance update and Android 1.1 feed
- **What changed:** Uploaded the web launch kit (the game in `index.html`, Stripe verification, a hosting/ads/
  analytics guide). Then the game got the balance redesign: 10 contacts a day, premium sources (agent, physio,
  airport) cost 2 and budget ones (kitman, barber, leak) cost 1, Tier 1 needs 300+, Career scores ×1.0–1.25 by
  followers, Daily results can be reopened, more replies in EN/ES/AR, share cards point to sembagames.app.
  Added the Android update feed (`api/tier-one/latest.js`, version 1.1 / versionCode 2) and the 1.1 APK.
- **Files:** `index.html`, `verify-purchase.js`, `api/tier-one/latest.js`, `downloads/TierOne.apk`, `README.md`.
- **Heads-up for the team:** This already includes everything from the old repo's unmerged
  `claude/apk-build-sembagames-sync-1cnmkc` branch that players see: the game changes are identical and the
  hosted APK was built from that branch (it has the UpdateChecker). The branch's Java/Gradle source is not here yet.

# History from saifsaber/tier-one (retired)

Paths below are as they were in the old repo.

## 2026-09-26 · saifsaber · Studio logo swapped for the exact design #17
- **What changed:** The hand-drawn vector S is gone. The studio logo is now the exact "Neon Ring"
  design #17 from the approved icon sheet, saved as `semba-logo.png` (512×512, rounded corners) and
  embedded in the studio banner.
- **Files:** `.github/assets/semba-logo.png` (new), `.github/assets/semba-logo.svg` (removed),
  `.github/assets/studio-banner.svg`, `CLAUDE.md`.
- **Heads-up for the team:** The PNG is upscaled from the icon sheet (~200px source). If anyone has the
  original high-res logo file, drop it in as `semba-logo.png`.

## 2026-09-26 · saifsaber · Official logos: Semba neon S + Tier One T1
- **What changed:** Added vector logos: `semba-logo.svg` (studio, design #17 "Neon Ring": green S in a
  glowing ring) and `tier-one-logo.svg` (yellow T1 badge with red dot). The studio banner now uses the
  Semba logo and neon-green accents; the Tier One card and the game README use the T1 logo.
- **Files:** `.github/assets/semba-logo.svg`, `.github/assets/tier-one-logo.svg`,
  `.github/assets/studio-banner.svg`, `.github/assets/tier-one-card.svg`, `README.md`,
  `games/tier-one/README.md`, `CLAUDE.md`.
- **Heads-up for the team:** Studio brand colour is now neon green `#B6FF3A`; Tier One stays yellow `#FFD23F`.
  The Android launcher icons and `play-store-icon-512.png` were **not** changed yet.

## 2026-09-26 · saifsaber · Docs updated for a three-person team
- **What changed:** README, CLAUDE.md, UPDATES.md and the session-start hook now name all three of us
  (`saifsaber`, `mmoustafaeditor`, `moemsacod`) instead of assuming two people.
- **Files:** `README.md`, `CLAUDE.md`, `UPDATES.md`, `.claude/hooks/team-sync.sh`.
- **Heads-up for the team:** None.

## 2026-09-26 · saifsaber · Published APK rebuilt with game v1.0.0
- **What changed:** Replaced `games/tier-one/downloads/TierOne.apk` with the CI build of the current
  game (includes mmoustafaeditor's v1.0.0 update). The download link now serves the latest game.
- **Files:** `games/tier-one/downloads/TierOne.apk`.
- **Heads-up for the team:** `versionCode` is still 1, so this installs as a reinstall over the old APK.
  Bump it on the next release.

## 2026-09-26 · saifsaber · Studio repo makeover + team update log
- **What changed:** Turned the repo into the Semba Studios page. New studio README with a
  clickable game card, a full README for Tier One (story, sources, how to play, install, build),
  this update log, `CLAUDE.md`, and a Claude Code session-start hook that shows the latest
  updates automatically.
- **Files:** `README.md`, `UPDATES.md`, `CLAUDE.md`, `.claude/`, `.github/assets/`,
  `games/tier-one/README.md`, `.github/workflows/build-apk.yml`.
- **Heads-up for the team:** ⚠️ **The Android project moved to `games/tier-one/`.** The game file is now
  `games/tier-one/app/src/main/assets/index.html` and the APK is `games/tier-one/downloads/TierOne.apk`.
  Pull before you edit. CI now only runs when something under `games/tier-one/` changes.
  The old root copy `workflow-build-apk.yml` was removed (the real workflow is in `.github/workflows/`).

## 2026-09-26 · mmoustafaeditor · Tier One updated to latest version (v1.0.0)
- **What changed:** Synced the game with the latest artifact version, v1.0.0, with the recent
  improvements and feature updates (commit `48fdfdb`).
- **Files:** `app/src/main/assets/index.html` (now `games/tier-one/app/src/main/assets/index.html`).
- **Heads-up for the team:** `downloads/TierOne.apk` was **not** rebuilt in that commit, so the
  download link still serves the build from before this update.

## 2026-09-26 · saifsaber · Initial Android project + first APK
- **What changed:** Imported the Tier One Android project, fixed the Android SDK setup in CI,
  published the first built APK with a direct download link.
- **Files:** whole project.
- **Heads-up for the team:** None.

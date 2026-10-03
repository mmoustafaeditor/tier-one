# Team update log

Every change to this repo gets an entry here, **newest first**, so each of us (and each
Claude Code session) can see what the others did before starting work.

**How to add an entry:** copy the template, put it at the top of the list, fill it in, commit it
together with your change.

```markdown
## 2026-10-03 · Tier One 3.9.7 — painted players actually show

- Fix: the app loaded the portrait list (art/manifest.json) with `force-cache`, so phones that had seen the old, empty list kept it and showed initials instead of the 227 painted players. It now asks fresh once per build.
- Checked live: today's Daily board is five painted players; Career and Practice rebuild their boards from the painted roster.

## 2026-10-02 · Tier One 3.9.6 — roster = the owner's art pack

- Imported the owner's player art pack: 227 painted portraits (512px WebP, public/art/players/, loaded on demand, not precached).
- The playable database is now exactly those 227 players (api/tier-one/v3/_lib/art-roster.mjs), for the server's Daily/rooms and the app's Practice/Career: England 69, Italy 63, Spain 57, France 26, Egypt 12; no German, Saudi or Turkish players until their art arrives. All clubs stay as transfer destinations.
- Checked: 300 test boards, every saga's player has a portrait.
- New batches: python3 games/tier-one/v3/tools/import_player_art.py <zip> imports the images and updates the roster file, then rebuild world.json and the web build.

## 2026-10-02 · Tier One 3.9.5 — no drawn faces

- Owner: image files only, nothing drawn in code. Players without a painted portrait now show only their initials on a plain tile; the silhouette is gone. Painted art arrives through art/manifest.json (Salah is the first).

## 2026-10-02 · Tier One 3.9.4 — painted player art, Salah

- Removed the drawn SVG "anime" faces (owner: not the style). Players without art now show a quiet silhouette with their initials in the club colour.
- First painted portrait in: Mohamed Salah (owner's ChatGPT image, cropped to the portrait, 512px WebP). Salah added to Liverpool's roster; the age cap for the roster went from 33 to 36 so veteran stars count.
- Player art shows as a framed tile on the Player File and fills round avatars face-first.
- docs/art/PLAYER_PACK_01.md rewritten to the Salah style (painterly anime, warm floodlight rim light, night stadium bokeh, square, no caption); the importer keeps the top square of tall images.

## 2026-10-02 · Tier One 3.9.3 — roster live now, rival journalists tab, Your call fits, player art batch 01 ready

- The trimmed roster (top 5 per club, Turkish league added) now applies to every Daily and room immediately (owner: user testing only).
- The Player File's second tab is now "Rival journalists": the rivals' race and their posts first, then what your sources said.
- Your call fits one screen: the evidence card steps aside and the header shrinks while you choose; outcomes sit in one row of four, the stake words tightened, Publish always visible. The source-call screen is capped to one screen too.
- Player art batch 01: docs/art/PLAYER_PACK_01.md (40 real players, ChatGPT style prompt matching the character pack) and tools/import_player_art.py (PNG/zip → 512px WebP + manifest). No art imported yet: the drawn placeholder shows until the owner sends the images.

## 2026-10-02 · Tier One 3.9.2 — Market to the handoff, anime players, trimmed database

- Market rebuilt to the owner's screenshot: tabs Rumours · Transfers · My calls · Players, serif headline, search, two dropdown filters, paper rows. Transfers shows confirmed moves from the data snapshot with the date, fee and the club's announcement link. Players searches the game's database. The editor's note, the free-agents entry and the fairness line sit under the list. One screen; only the list scrolls.
- Every player now has an original anime-style portrait (ui/anime.ts, SVG, stable per player id, club shirt, mood variants). Stylised characters, not likenesses; real art can still replace them through art/manifest.json.
- Player database cut to the top 5 per club across the Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, the Egyptian and Saudi leagues, plus a new Turkish Süper Lig (five clubs, 22 players, entered from general knowledge, confidence medium). 1,026 players became 562. The server uses the trimmed world for Dailies from 2026-10-03, so today's boards keep their cast; rooms switch on the same date.

## 2026-10-02 · Tier One 3.9.1 — Player File matches the handoff

- Rebuilt the Player File to the owner's screenshot: paper header with the player's portrait large on the right (breathing), "Forward · Age 27", route, "Simulated story"; a dark evidence card with four bars and the independent circles (Club, Travel, Camp…); underline tabs Sources · What they said · Your call; one row per source with its portrait, what it knows, reliability · circle, and Ring · N pts / Called / Day N.
- Fixed the cut-off page on phones: the file is one screen tall, only the tab pane scrolls, and Back to board · Make the call stay on screen.

## 2026-10-02 · Tier One 3.9.0 "Newsroom" (first pass)

- Removed every drawn film and cutscene (call films, post films, day-end, page turns, the cutscene host, the Film setting).
- New call screen: the source's own portrait breathes on the desk while their place's sound plays, then the line types in on a paper card and the face swaps to its reaction. Same screen in Daily, Career, Practice and Rooms.
- The Player File's Clippings tab is now "What they said": every source's line about that player, newest first.
- Posting now lands as the quick burst and the stamp on the file in every mode.
- Newsroom palette from the owner's handoff (charcoal, paper, coral, subdued gold, sage), "tier one." wordmark, avatar in the top bar, five tabs Desk · Daily · Career · Market · Profile, the Desk's Daily card restyled.
- Not yet done from docs/UI39.md: the editable composer, the published-post screen with fan replies, the edition review, the Market tabs, the Settings page and the Profile tabs. APK bundle builds but was not published (Saif's feed untouched).

## 2026-10-02 · mmoustafaeditor (Claude Code session) · Tier One 3.8.0 launch rework (web)
- **What changed:** The owner's 60-part launch brief (docs/LAUNCH_BRIEF.md) applied: simulation-audited game math (Exclusive +30, Tier 1 200 / Tier 2 130; sim in games/tier-one/v3/sim/sim3.mjs, spec docs/spec/D); qualitative source reliability in ranked play, "independent sources agree / echo chamber", the Player File rebuilt, the Exclusive moment, Deadline Day phases with a fair clock, Results as the share card, onboarding in play, Practice as the learning lab; Home around THE DAILY hero, design tokens and icon family, Morning Papers, contextual push ask, analytics funnel; Career as five emergent stages (20 windows, no conspiracy plot), visible club relations, contacts as relationships; Rooms math (cap 16, 7 rounds, recap card); Transfer Market on server-managed calendar.mjs (no hard-coded dates); one economy, one Store, real credit earning, missions that reward play; the owner's character pack in public/art (fictional cast, 512px WebP, reaction moods). Specs in games/tier-one/v3/docs/spec/.
- **Files:** `games/tier-one/v3/**`, `api/tier-one/v3/**`, `api/tier-one/v4/**`, `tier-one/` build.
- **Heads-up for the team:** shipped without the integrator's cleanup/spec/QA pass (owner's credit call); `scripts/social-api.test.mjs` newsrooms test fails because newsrooms were cut from the UI/server (test is obsolete). Android feed untouched.

## 2026-10-01 · mmoustafaeditor (Claude Code session) · Tier One 3.7.0: top bar, mini My Press Card, missions box, shop sections (web)
- **What changed:** Bell shows only key notifications (new Daily, your calls, new in Shop); coins + credits in the top bar open the Shop; level off the top bar; Home has a mini My Press Card (stats per mode) and a Missions box (top 3), tiles Daily Challenge / Career Mode / Multiplayer / Transfer Market / Shop; Missions page by mode (daily + weekly); Shop split into Game customization and Game modes; "My Press Card" and "Career Mode" renames.
- **Files:** `games/tier-one/v3/web/src/**`, `tier-one/` build.
- **Heads-up for the team:** not browser-tested before release (owner testing).

## 2026-10-01 · mmoustafaeditor (Claude Code session) · Tier One 3.6.0: four modes, no-scroll pages, clear Career (web)
- **What changed:** On the 3.x UI: Home = Daily Challenge (Daily, Deadline Day, Practice) · Career · Multiplayer · Transfer Market + Press Card, Leaderboards, Missions, Shop, Settings; tabs renamed; Rooms only (Leave room, 21-day idle expiry; Challenges/newsrooms removed); one-screen pages with paging and a top-left Back; Career Continue/New + chapter card; Transfer Market filters; In talks / Advanced / Confirmed; new catchphrases; first-time tips.
- **Files:** `games/tier-one/v3/web/src/**`, `api/tier-one/v3/index.js`, `tier-one/` build.
- **Heads-up for the team:** not browser-tested before release (owner testing).

## 2026-10-01 · mmoustafaeditor (Claude Code session) · Tier One back to the pre-phone UI (3.5.0, web)
- **What changed:** Owner's call: the 4.x phone UI is reverted. The web client, `api/tier-one/v3/index.js`, `api/tier-one/v4/**` and `api/_lib/merge.mjs` are back to the 3.4 build (9134392, leaderboards/prizes/badges). Daily stays on the v3 rules (no 5 Oct cutover). The 4.x docs and engine4 stay in the repo, unused.
- **Files:** `games/tier-one/v3/web/**`, `api/tier-one/v3/index.js`, `api/tier-one/v4/**`, `api/_lib/merge.mjs`, `tier-one/` build.
- **Heads-up for the team:** next: four modes on Home, no-scroll pages and a clear Career path on top of this UI.

## 2026-10-01 · mmoustafaeditor (Claude Code session) · Tier One 4.1.0 compact rebuild (web)
- **What changed:** UI rebuilt per games/tier-one/v3/UI41.md: one-screen pages with a top-left Back button, labelled modes (Daily Challenge with Deadline Day and Practice, Career with Continue/New, Rooms, Transfer Market with filters), Press Card, Leaderboards, Missions, Shop, Settings; sources inside the player screen (no DMs/feed apps); In talks / Advanced / Confirmed; new catchphrases; Leave room + 21-day idle room expiry; widgets, Challenges and crews cut.
- **Files:** `games/tier-one/v3/web/src/**`, `api/tier-one/v3/index.js` (room.leave), `tier-one/` build.
- **Heads-up for the team:** shipped before the integrator's formatting pass finished; Android feed untouched.

## 2026-10-01 · mmoustafaeditor (Claude Code session) · Tier One 4.0.0 "Insider" live (web)
- **What changed:** The game is now a phone: lock screen, home screen and apps (Blurt, DMs, Lens, Story, Live, Market, Groups, Boards, Settings). New rules (5 stories × 5 days, SIGNS / ELSEWHERE / STAYS, Hint / Post / Drop, Scoops; v4 Dailies from 5 Oct), XP and an endless Level, Season track, Rep ranks Nobody → Tier One, Sponsors that pay per right call, the Market for real transfers (watch free, call at Level 2), Story mode with chapter bosses and phones, lock faces, widgets, icon packs, themes, phone skins, one shop. Films removed. Web only; no APK.
- **Files:** `games/tier-one/v3/**` (CONCEPT4.md, RULES4.md), `api/tier-one/v3/_lib/engine4.mjs`, `api/tier-one/v3/index.js`, `api/tier-one/v4/config/catalog.json`, `tier-one/` build.
- **Heads-up for the team:** Android feed (`api/tier-one/latest.js`, 3.4.0 vc19) untouched. Not browser-tested before release (owner testing).

## YYYY-MM-DD · <who> · <short title>
- **What changed:** …
- **Files:** …
- **Heads-up for the team:** … (anything the others must know or do; "None" if nothing)
```

`<who>` is the person the work was done for (their GitHub name), e.g. `saifsaber`, `mmoustafaeditor` or `moemsacod`, even when Claude Code did the typing.

---

## 2026-10-03 · saifsaber · The Gaffer rework M3: a promise to a youngster that the whole game remembers
- **What changed:**
  - **The prospect promise now warns before it breaks.** Promote a youngster and he's promised 10 games in 20 matchdays. Before, nothing warned you and it simply broke. Now the assistant flags it in time and proposes starting him in the next match, cup ties included, with what that costs the team.
  - **The staff respect your word.** They no longer put a player you've promised something to on the transfer list, or sell him.
  - **Proven end to end, in Node and in the real build:** promote, get warned, start him, he plays, the promise counts it. He ends up with 10 games and the promise kept, his trust goes up and a message names it. After a save and reload, the promise and your XI are still there.
- **Files:** `web/src/sim/room-decisions.ts`, `src/sim/staff.ts`, `src/lang-dressing*.ts`, `web/sim-tests/rework/slice.ts` (new), `web/ui-tests/rework-slice.mjs` (new), `games/the-gaffer/rework/*`
- **Heads-up for the team:** More "Your word" cards will appear for academy graduates. Match results unchanged. Branch only, not live. Tier One untouched.

## 2026-10-03 · saifsaber · The Gaffer rework: first-week guide, and no screen wider than a phone
- **What changed:** A skippable "Your first week" guide on Today. It has five steps (agree the season, decide how hands-on you are, set your plan, get the opponent report, play your first match). Each ticks itself off when the game state shows it's done, each has a "Show me" link, and it disappears after the first matches. A new width check opens every area and tab at 320, 360, 390 and 412 px wide, in English and Arabic, and fails if a page scrolls sideways. It caught a problem from today's work (long effect chips widened Today) and older ones (Club header and tabs, the Tactics button row, a transfer target card); all fixed.
- **Files:** `web/src/ui2/Guide.tsx` (new), `src/lang-guide.ts` (new), `src/ui2/Today.tsx`, `src/styles/app.css`, `web/ui-tests/overflow.mjs` (new), `web/ui-tests/rework-shots.mjs`, `games/the-gaffer/rework/*`
- **Heads-up for the team:** The guide's "hidden" choice is saved on the device (`gaffer.guide.hidden`), not in the save. Branch only, not live. Tier One untouched.

## 2026-10-03 · saifsaber · The Gaffer rework F07: scout picks think about the future
- **What changed:** When the search exists because the starter is getting old or his deal is ending, the scouts no longer put a 35-year-old first (Al Ahly's keeper search did). Each year past 29 costs a candidate in those searches, and past 32 in any search. An older player can still be picked when nobody younger is close.
- **Files:** `web/src/sim/recruit/picks.ts`, `web/sim-tests/rework/trust.ts`
- **Heads-up for the team:** Delegated signings use the same list, so staff sign younger players for succession. Match results unchanged. Branch only. Tier One untouched.

## 2026-10-03 · saifsaber · The Gaffer rework M2 (part 3): Transfers as one recruitment funnel
- **What changed:** Transfers' seven equal chips are now four numbered stages: 1 Needs & scouting, 2 Shortlist & search, 3 Negotiations, 4 Deals & loans. A stage with two views (e.g. Needs | Scouts) has a small switch underneath. Nothing was removed, and every link into Transfers (cards, the player page, talks) lands where it did.
- **Files:** `web/src/ui2/Transfers.tsx`, `src/lang-recruit*.ts`, `src/styles/recruit.css`, `web/ui-tests/nav.mjs` (Search is now 3 taps from Today, was 2), `web/ui-tests/rework-shots.mjs`, `games/the-gaffer/rework/*`
- **Heads-up for the team:** Search is one tap further away; the nav test budget was raised to match. Still on the branch only. Tier One untouched.

## 2026-10-03 · saifsaber · The Gaffer rework M2 (part 2): half-time staging, Continue says what's next, honest courses, cup labels, smarter half-time sub
- **What changed:**
  - **F12** at half-time the team talk now waits with your other changes until "Second half". Before, choosing a talk restarted the match at once and dropped the changes you'd ticked.
  - **Continue** now says what happens next on every screen, phones included: "2 to decide", "Next: matchday", "Back to the match", "Season review".
  - **F15** each course says what it does before you pay: tire 15% slower, defeats hurt morale less, press 3% harder, or youngsters grow 15% faster. It's permanent and taken once, and shows its reputation gain.
  - **F13** the season review says how far you went in each cup (won it, runners-up, out in the semis...), not just the cup's name.
  - **F07** the half-time sub suggestion no longer takes off someone who scored or set up a goal, and only appears when a player is actually tired.
- **Files:** `web/src/ui2/{Live,OfficeBar,Career,Sheets}.tsx`, `src/lang-v2*.ts`, `src/styles/{app.css,look/components.css}`, `web/ui-tests/rework-ht.mjs` (new), `games/the-gaffer/rework/*`
- **Heads-up for the team:** No change to results. Still on the branch only, not live. Tier One untouched.

## 2026-10-03 · saifsaber · The Gaffer rework M2 (part 1): availability, honest percentages, best XI with reasons, promotion sheet, quick-match full time
- **What changed:**
  - **F10** Today's "Available for Sat" now uses the same rule as team selection: a cup ban counts for the cup match and rested players are out, with a reason per player. Tired players count as available but are flagged.
  - **F08** win/draw/loss always add up to 100%, and no forecast says 0% or 100%.
  - **F06** the Best XI is now picked as a whole eleven instead of slot by slot (Van Dijk was at right-back with Frimpong on the bench). AI clubs pick their XIs the same way. Tactics explains every out-of-position pick against the best natural player left out.
  - **F05** "Promote" opens a sheet first: squad place, contract and wage, and the promise that comes with it (10 games in 20 matchdays, or a loan). The academy decision cards show the promise too.
  - **F11** a quick match now ends on a real full-time screen with analysis, plus Rematch / Change teams / Back. Before, it went straight back to the team picker.
  - The bottom-bar buttons on full time are readable.
- **Files:** `web/src/sim/tactics.ts` (`availabilityFor`, `assignXI`), `src/sim/youth.ts` (`promotionTerms`), `src/sim/youthDecisions.ts`, `src/ui2/{Today,Match,Pathway,Player,FullTime,QuickMatch,Live,PreMatch,util}.tsx/ts`, `src/lang-v2*.ts`, `src/lang-youth*.ts`, `src/styles/app.css`, `web/sim-tests/rework/trust.ts`, `web/sim-tests/morale.ts`, `web/ui-tests/rework-shots.mjs`, `games/the-gaffer/rework/*`
- **Heads-up for the team:** **Results change (F06):** AI clubs now pick better XIs. Engine fingerprint is now `3879e6cc016b8942`. Season seed 7: 2.87 goals, 43.6% home wins, 23.6% draws (was 2.87 / 44.5 / 22.8). The `morale` test floor went from 35 to 33: one struggling Egyptian club now averages 34.96 on seed 7 (the measured spread is written in the test). Still not on `main` and not live. Tier One untouched.

## 2026-10-03 · saifsaber · The Gaffer rework M0+M1: baseline, and the trust fixes (XI, dates, deal quote, board aim, job move, saves)
- **What changed:** Started the rework from the V3 handoff. Milestone 0: the baseline, state map, screen map and feature ledger in `games/the-gaffer/rework/`, with the trust backlog F01-F17 reproduced in a seeded Node script. Milestone 1 fixes the ones that were real:
  - **F01** the XI you pick is the XI that plays. Before, with match prep delegated (the default), the assistant wiped your XI before every match, so a "Start X" card or your own picks never reached the quick result. Tactics now says whose XI it is, with "Let the assistant pick". Watched + Instant and Quick give the same result for the same match.
  - **F02** one "today". The header said Thu while messages were dated the Saturday after, and cup ties fell before "today". Promise and deal counters now say matchdays, and "Window shuts tonight" only shows on deadline day.
  - **F03** one deal quote. Today's "meet his demands" card counted the agreed fee twice (£19M off in the test); it now shows the same "room after" as the Talks screen.
  - **F04** no "Aim higher" when the board's target is already the top one (it was the same target plus the owner's money).
  - **F09** after a job move, "Last time out" no longer shows the old club's match backwards. The old club's season plan, instalments and open talks stay with the old club.
  - **F17** export/import checked (round trip, tampered, newer and junk files all handled). Each save now keeps the one it replaced, and a slot that doesn't load opens that copy and says so.
- **Files:** `games/the-gaffer/rework/*` (new: baseline, ledgers, progress, before/after screenshots), `web/src/sim/{staff,cups,decisions,vision,coach,record,room,pressDecisions,save,slots}.ts`, `src/sim/recruit/{deals,decide}.ts`, `src/model/types.ts`, `src/ui2/{Match,Today,OfficeBar,News,Decisions,Talks}.tsx`, `src/App.tsx`, `src/lang-v2*.ts`, `src/lang-club*.ts`, `web/sim-tests/rework/{repro,trust}.ts` (new), `web/ui-tests/rework-shots.mjs` (new)
- **Heads-up for the team:** Not merged to `main` and not live (not authorised yet). Match results are unchanged (engine fingerprint `a04af554a49efa49`, season 2.87 goals). New optional save fields: `vision.club`, and slot records `100+n` holding the previous save. Tier One untouched.

## 2026-10-02 · saifsaber · The Gaffer B4: the hidden traits count in the engine too (composure, vision, movement)
- **What changed:** The last step of the plan to close the gaps with FM26. The hidden traits that already moved players on the pitch (A4) now also count in the match engine, worked out the same way (attributes, rating, age, a fixed per-player draw; nothing new saved), in a new shared module `engine/traits.ts`, with a fourth one, vision:
  - **Composure:** a composed finisher scores more of the same chances, and a composed taker more penalties.
  - **Movement off the ball:** the better mover gets more of his side's open-play shots.
  - **Vision:** the man with vision makes more of the key passes.

  They share out a side's chances and goals among its players (relative to the side's own men), so the totals don't move. Measured (new `sim-tests/traitsengine.ts`, 1,500 matches with the traits on and off):
  - **Totals:** goals +0.9%, xG −0.1% (the rule was within 3%).
  - **Composure:** the most composed third of finishers beat their xG by 0.080 goals a shot against 0.069 with the traits off.
  - **Vision:** midfielders' assists, most vs least vision ×3.59 (×2.77 off).
  - **Movement:** forwards' shots, best vs worst movers ×2.87 (×2.54 off).
- **Files:** `games/the-gaffer/web/src/sim/engine/traits.ts` (new), `src/sim/engine/model.ts`, `src/ui2/pitch/body.ts` (reads the traits from the engine module, same values), `web/sim-tests/traitsengine.ts` (new), `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** Changes who scores and assists (not how many). The plan "خطة قفل الفجوات" is now done (A1-A5, B1-B4). Tier One untouched.

## 2026-10-02 · saifsaber · The Gaffer B3: nine new roles, each with its own job on the pitch, none a free win
- **What changed:** Step B3 of the plan to close the gaps with FM26. Nine new roles (EN/AR/ES/FR):
  - **With the ball:** libero, half-back, mezzala, wide playmaker, deep-lying forward, poacher.
  - **Without it:** cover, press the full-back, tuck in.

  Each changes the engine (where he stands, which contests he joins, shots/chances, risk) and the pitch:
  - the mezzala runs into the half-space and the box;
  - the wide playmaker comes inside;
  - the deep-lying forward drops;
  - the libero steps into midfield;
  - the half-back drops between the centre-backs;
  - the cover man sits behind the line;
  - the press-the-full-back winger goes at their full-back on his flank;
  - tuck in narrows without the ball (out-of-possession positions now honour a role's sideways spot; before, they ignored it).

  Measured:
  - **Balance** (`sim-tests/rolebal.ts`, new, 400 fixtures): new roles −0.6% to +1.5% against the default role, none over +3%.
  - **An old role fixed:** the inverted full-back was +3.9% (inside to 30 instead of 36, smaller passing edges: now +2.6%).
  - **On the pitch** (`sim-tests/rolespitch.ts`, new): each role moves the way it says, e.g. mezzala +8.7 m up, wide playmaker 13.7 m inside, libero +9.6 m.
  - **Formations** (with every role at its default, so the test judges the shape itself): 4-2-3-1's wide men from 66 to 62 (it was 3.5% above the rest).
  - **Loose balls:** a ball changing sides with no challenge named now has the nearest man going to it beforehand: lost balls that show their cause 100% (12 matches).
- **Files:** `games/the-gaffer/web/src/sim/engine/roles.ts`, `src/sim/engine/phases.ts`, `src/sim/engine/story.ts`, `src/sim/tactics.ts`, `src/ui2/pitch/move.ts`, `src/ui2/pitch/sim.ts`, `src/ui2/pitch/tuning.ts`, `src/lang-tac*.ts`, `web/sim-tests/rolebal.ts` (new), `web/sim-tests/rolespitch.ts` (new), `web/sim-tests/formations.ts`, `web/sim-tests/diag.ts`, `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** Changes results (the inverted full-back and 4-2-3-1 adjusted; AI clubs can pick the new roles when they suit their players). Fingerprint now `1ac57c6d71ad9efb`; a full season 2.83 goals a game, home wins 44.3%, draws 23.1% (B2: 2.87 / 44.5% / 23%). Tier One untouched.

## 2026-10-02 · saifsaber · The Gaffer B2: six new formations, all balanced; AI clubs use the whole range
- **What changed:** Step B2 of the plan to close the gaps with FM26. Six new shapes: 3-4-3, 4-3-1-2 (diamond), 3-4-2-1, 4-2-2-2, 5-4-1, 4-4-1-1 (12 in all), on the Tactics board and the live tactics sheet, in and out of possession. Measured first (new `sim-tests/formations.ts`): with players who suit them, the old shapes were within 2.4% of each other except 4-4-2, 7% weaker than the rest; the engine also favours a crowded middle, so a narrow diamond first came out 9% stronger. Where each man stands in the new shapes (and the old 4-4-2: wide men higher, centre pair a little deeper) was set so that no shape is a free win: now −4.1% (5-4-1) to +2.6% (4-2-3-1), each with its own trade-off (5-4-1 concedes the least and creates the least; 3-4-3 and 3-5-2 the most open). AI clubs used to play almost only 4-3-3; now their style lists the shapes that suit it, their squad rules out what it can't fill, and the club's manager decides among the rest (a new manager can bring a new shape): about 87 clubs 4-3-3, 80 4-4-2, 61 4-4-1-1, 52 4-2-3-1, 40 3-4-3, the rest the others. Back-three sides drop into a back five without the ball.
- **Files:** `games/the-gaffer/web/src/sim/tactics.ts`, `src/sim/match.ts`, `web/sim-tests/formations.ts` (new), `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** This changes results everywhere (AI clubs play other shapes, and 4-4-2 is no longer weak). A full season: 2.87 goals a game (was 2.73; seed 11: 2.83, was 2.75), home wins 44.5% (43%), draws 23% (24.5%): still within real top-league numbers. The engine fingerprint is now `5367b2c1baf1b532`. Old saves keep their formation. Tier One untouched.

## 2026-10-02 · saifsaber · The Gaffer B1: the AI opponent reacts during the match, like FM
- **What changed:** First step of phase B (the engine and the AI) of the plan to close the gaps with FM26. Before, the AI manager facing you changed things only at kick-off, half-time and the 76th minute (and after a red card). Now it also reacts at any minute: when it has just conceded, or when it is being pinned back (your xG over the last quarter of an hour well above its own). It makes the one team-instruction change the engine rates best (mentality, pressing, passing, line, width, tempo, counter, build-up, counter-press or trap; no new roles or shape mid-game), at least 10 minutes after its last change, and never touches an instruction it changed in the last 20 minutes, so it doesn't flip-flop. The live feed says why ("after conceding", "being pinned back"; EN/AR/ES/FR). Measured (`sim-tests/aireact.ts`, new, 600 user-style matches): 0.46 reactions a match; the AI side takes +0.093 points a match (1.478 vs 1.385, under the 0.15 limit set in the plan); goals +0.3%; 0 flip-flops; 13 ms a match. AI-vs-AI matches are unchanged (fingerprint `27860c2686735d2e`); aiprep, wxai, sanity pass.
- **Files:** `games/the-gaffer/web/src/sim/engine/story.ts`, `src/sim/match.ts`, `src/lang-new.ts`, `src/lang-new-ar.ts`, `src/lang-new-es.ts`, `src/lang-new-fr.ts`, `web/sim-tests/aireact.ts` (new), `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** This changes results of matches you play (the AI is a little tougher, about 0.09 points a match), not matches between AI clubs. Tier One untouched.

## 2026-10-02 · saifsaber · The Gaffer A5: the man in a contest is there when it happens; Full match never freezes
- **What changed:** Step A5, the last of phase A (the pitch) of the plan to close the gaps with FM26. The live pitch only; match results unchanged (fingerprint `27860c2686735d2e`). (1) Measured first: when a duel, tackle or foul happened, the defender the engine names was a median 7.0 m from the ball (53% of the time 6 m or more), so he seemed to arrive from nowhere. He now reads it a pass early: when the next pass goes to the man he will challenge, he is already closing him while the ball is with the passer. Now a median 2.0-2.3 m. (2) Checking Full match in Node over whole matches (new `stillnode` test, the browser's frozen-picture rule) found what the 150 s browser run had only caught now and then: about one spell every 6 minutes of Full match where the whole pitch stood still for 0.4-1.9 s (free kicks and corners being set up, the start of a minute, a carrier waiting to pass). It is older than this plan (also found on the build before A1). Cause: the players' idle movement was tied to their decision ticks and to screen time, and swallowed by easing into a nearby target. It now runs in match seconds (the same walking pace at any speed), straight onto each man's position every frame; the back line sways only across, the carrier not at all. Measured: 0 frozen spells in 146 min of Full match on screen (was 24), 0 at ×1 and ×6; browser 150 s of Full match: 0, 60 fps. Seeded pitch test all passed; marking 87% (was 90-92%: markers now move about their spot), carrier pace vs space r = 0.71, back line spread 1.5 m; passes reach their man 98%; 0 jumps.
- **Files:** `games/the-gaffer/web/src/ui2/pitch/sim.ts`, `src/ui2/pitch/tuning.ts`, `web/sim-tests/diag.ts` (contest distance check), `web/sim-tests/stillnode.ts` (new), `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** Phase A of the plan is done (A1-A5). Next is phase B (the engine and the AI), which changes match results and is calibrated with the sim tests. Tier One untouched.

## 2026-10-02 · saifsaber · The Gaffer A4: players in the same role move differently (hidden traits)
- **What changed:** Step A4 of the plan to close the gaps with FM26. The live pitch only; match results unchanged (fingerprint `27860c2686735d2e`). Before, two players in the same role made the same run at the same moment. Each player now has three hidden traits, worked out from what the save already has (attributes, rating, age and his own fixed draw, like the injury proneness), so nothing new is saved and old saves work as before: movement off the ball (how often he makes his role's run, and how far he takes it), work rate (how hard he gets back and counter-presses after a turnover) and composure (how much pace he keeps on the ball when pressed). Measured (`sim-tests/traits.ts`, new, 10 seeded matches): how often a player makes his run follows his movement off the ball (r = 0.60 over 82 players, run rate 22-100%); traits spread across players (sd 0.14-0.20). Seeded pitch test all passed; carrier pace vs space unchanged (r = 0.72); full-back overlaps 47% (52% before: the poorer movers now miss some); passes reach their man 99%; 0 jumps; 60 fps.
- **Files:** `games/the-gaffer/web/src/ui2/pitch/body.ts`, `src/ui2/pitch/sim.ts`, `src/ui2/pitch/tuning.ts`, `web/sim-tests/traits.ts` (new), `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** Tier One untouched.

## 2026-10-02 · saifsaber · The Gaffer A3: a heavy first touch, and every lost ball shows why
- **What changed:** Step A3 of the plan to close the gaps with FM26. The live pitch only; match results unchanged (fingerprint `27860c2686735d2e`). Measured first: in 62% of lost balls the man who won it was 6+ m from the ball (he came from far away, with nothing on screen to explain it), and in other cases the ball just changed sides. Now: when the engine says a man lost it just after a pass reached him, it comes off his foot 1-3 m towards the man who takes it (a heavy first touch; less far for a player with a good touch, from his dribbling and passing). The man who will win it reads the pass and is already closing when it arrives. A ball that changes sides with no challenge named (a keeper's ball after a save, a clearance) is collected by whoever has it or the nearest man and passed on, never handed across the pitch. Measured (`diag`, 12 matches, 89 lost balls): heavy touch 64%, collected and played on 28%, intercepted 2%, tackled 1%, still won 6+ m from the ball 4% (was 62%); passes reach their man 99%; 0 jumps; marking unchanged (seeded 92%, was 91%); 59 fps; no freezes.
- **Files:** `games/the-gaffer/web/src/ui2/pitch/sim.ts`, `src/ui2/pitch/body.ts`, `src/ui2/pitch/tuning.ts`, `web/sim-tests/diag.ts`, `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** Tier One untouched.

## 2026-10-02 · saifsaber · The Gaffer A2: the weather moves the ball and changes the ground
- **What changed:** Step A2 of the plan to close the gaps with FM26. The live pitch only; match results unchanged (fingerprint `27860c2686735d2e`). Rain, snow, wind gusts and the heat haze were already drawn; now the weather acts on the ball and the ground. On a wet pitch a pass skids on and keeps its pace; in heavy rain and snow the water and snow hold it up. The wind blows along the pitch, one way for the whole match (the gusts show which way): a ball in the air drifts with the crosswind and hangs up when it is hit into the wind. The ground is darker and wet in rain, white in snow, and dry and yellowing in the heat. Found and fixed on the way (an older bug): when a highlight opened on a turnover, the ball could cross 40 m of pitch in a tenth of a second. The picture now cuts to the man who won it, and no ball ever flies faster than a hard-hit ball (32 m/s). Measured (`diag`, 6 matches in each weather): 0 ball jumps in clear, rain, heavy rain, wind and snow; passes reach their man 98-99%; long balls bounce 100%; in the wind about 270 balls in the air are moved by it. 59 fps in clear, heavy rain and snow.
- **Files:** `games/the-gaffer/web/src/ui2/pitch/move.ts`, `src/ui2/pitch/sim.ts`, `src/ui2/pitch/tuning.ts`, `src/ui2/Pitch2D.tsx`, `src/styles/app.css`, `web/sim-tests/diag.ts`, `web/ui-tests/pitch.mjs`, `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** For tests, `?pitchdebug&wx=0-5` shows the pitch in any weather; `WX=` does the same in `diag` and `ui-tests/pitch.mjs`. Tier One untouched.

## 2026-10-02 · saifsaber · The Gaffer A1: the ball bounces, slows and curls
- **What changed:** First step of the plan to close the gaps with FM26 (report "محرك ماتش FM26 و The Gaffer" › خطة قفل الفجوات). The live pitch only; match results unchanged (engine fingerprint `27860c2686735d2e`). The ball's flight is now physical: along the ground it leaves the foot fastest and slows as it rolls; in the air it keeps most of its pace; a long ball comes down short of its man and bounces once before he takes it; crosses swing in or out and shots curl (more from distance and free kicks). The bend and the bounce stay inside the flight, so a pass still arrives where and when the engine's pass says. Measured (`diag`, 6 matches): long balls that bounce 100% (188), 213 curled crosses and shots, passes reach their man 99%, ball jumps 0; seeded pitch test all passed; no freezes in Full match; 59-60 fps.
- **Files:** `games/the-gaffer/web/src/ui2/pitch/move.ts`, `src/ui2/pitch/sim.ts`, `web/sim-tests/diag.ts` (bounce check), `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** The browser pitch test (`ui-tests/pitch.mjs`) is noisy run to run with or without this change: before it, runs failed 2-3 checks (open lanes, carrier pace, offside line); after it, 0-1. The seeded Node tests are the ones to trust. Tier One untouched.

## 2026-10-02 · saifsaber · The Gaffer phase 2: highlights from the start of the move, a save that never stalls, a smarter AI opponent
- **What changed:** (1) A highlight whose moment comes early in its minute now starts with the end of the minute before, so you see the move from its start (never repeating what the previous highlight showed): 64 passages in 10 test matches now open with their build-up. (2) During a watched match only the match itself is saved, every minute, as a small record (~10 KB, written in 0–1 ms) instead of the whole career (~0.2 s); the career is still saved in full at kick-off and the final whistle, and loading takes the match record when it is further on. Full match now has no long frames, and a reload resumes at the last minute played. (3) Against you, the AI manager now reads the matchup at kick-off and makes the one change the engine rates best for this opponent (often counter-pressing, breaking quickly or playing out from the back). Over 600 test matches the AI side takes 1.51 points a match instead of 1.29 (goals +4%); it closes most of the human edge measured earlier. Matches between two AI sides are unchanged (fingerprint identical).
- **Files:** `games/the-gaffer/web/src/sim/highlights.ts`, `src/ui2/pitch/sim.ts`, `src/ui2/Live.tsx`, `src/App.tsx`, `src/sim/slots.ts` (`writeLive`/`readLive`/`clearLive`), `src/sim/engine/story.ts` (`aiPrep`), `src/sim/match.ts`, `src/lang-new{,-ar,-es,-fr}.ts`, `sim-tests/{aiprep.ts (new),pitch.ts,diag.ts}`, `ui-tests/resume.mjs` (new), `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** New localStorage key `gaffer.live.<slot>` (the match in progress; cleared when it ends or the slot is cleared). Opponents in your matches are a little stronger now. Tier One is untouched.

## 2026-10-02 · saifsaber · The Gaffer: passes counted, a pass network in the analysis, pass numbers live, passing in the ratings
- **What changed:** The engine now counts the passes of your matches: for each player, passes tried and completed, key passes (the ball that set up a shot), long balls and crosses, and who passed to whom. A failed pass is counted where the ball was really lost: through balls cut out, crosses and long balls won in the air, and most turnovers in midfield (interceptions). About 920 passes a match, 87% completed, like the top leagues. The analysis screen has a new **Passes** tab: both teams' passes and accuracy, a pass network for each side (each man at his spot with the ball, bigger the more passes he completed, thicker lines between men who passed to each other more), and who was on the ball most. Each player's passes and key passes also show in the Players tab. The match's "The numbers" panel shows passes and the share completed. Player ratings now include passing (centred per match, so the average rating stays the same and good passers stand out). Checked in English and Arabic at 390 px. No result changes (the engine fingerprint is identical).
- **Files:** `games/the-gaffer/web/src/sim/engine/play.ts` (`PassTally`, `m.ps`), `src/sim/{match.ts,analysis.ts,ratings.ts}`, `src/ui2/{Analysis.tsx,Live.tsx}`, `src/lang-ana.ts`, `src/styles/app.css`, `sim-tests/{passes.ts,fingerprint.ts}`, `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** New optional save field `m.ps` on a watched match (matches saved before it have none: their analysis says so). Ratings shift a little between players (not on average). Tier One is untouched.

## 2026-10-02 · saifsaber · The Gaffer: every stoppage shows its cause (fouls, cards, penalties, corners, throw-ins)
- **What changed:** Referee decisions used to appear on the pitch out of nowhere. The engine now records the cause of each one (who fouled whom, who put the ball behind for a corner, who touched it last before a throw-in or goal kick), on the passes' own stream, so no result changes (fingerprint identical). The pitch shows it. A foul: the defender goes into the challenge on the ball carrier, he goes down where it happened, the referee whistles, runs to the spot and shows the card the engine gave, and the free kick is taken from there. A penalty: the challenge happens inside the box. A corner: the ball comes off the defender or the keeper and goes over the goal line. A throw-in or goal kick: the ball runs out from where play actually was. A free kick out wide gets a two-man wall (it'll be crossed), and walls stand still. Measured: every corner shown with its cause (73 of 73), every foul at the man fouled (52 of 52), the cards on the right player, passes reach their man 99%, no jumps, no freezes in Full match.
- **Files:** `games/the-gaffer/web/src/sim/engine/play.ts`, `src/ui2/pitch/{sim,officials,setpieces}.ts`, `src/ui2/Pitch2D.tsx`, `src/styles/app.css`, `ui-tests/pitch-metrics.mjs`, `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** Flow entries carry their cause (`f`: `q` the fouler; `c`: `q` who put it out; `ti`/`gk`: `p` who touched it last). Free kicks are now where the foul was (fewer of them in shooting range than when they were placed at a zone's centre). Tier One is untouched.

## 2026-10-02 · saifsaber · The Gaffer: no more freezes in Full match, and a match speed bar like FM's
- **What changed:** Watched in the browser frame by frame, Full match had spells of 1 to 15 seconds where nothing moved. Three causes, all fixed. (1) Switching the highlights mode or speed mid-minute left the pitch on the old minute's length while the clock ran the new one; the pitch now keeps pace. (2) Dead time (a corner or free kick being set up, a goal) ran at full length with everyone standing on their spots; Full match now plays it at 0.3 of its length, like FM, and players jostle while the ball is dead. (3) In play, the carrier barely moved while holding the ball, so the whole team stood still; he now keeps going with it, and men off the ball keep moving. Measured: 0 frozen spells in 150 s of Full match (`ui-tests/still.mjs`, new); passes still reach their man 98%, no ball jumps. The in-play save in Full match now waits for a stoppage. The Slow/Normal/Fast buttons on the match screen became a speed bar from ×1 to ×6 real time in half steps (normal ×2.5), in every mode including Full match; it remembers your speed. Settings keeps Slow/Normal/Fast as the default.
- **Files:** `games/the-gaffer/web/src/sim/highlights.ts` (`squeeze`, `rateOf`), `src/sim/prefs.ts` (`rate`), `src/ui2/Live.tsx`, `src/App.tsx`, `src/ui2/QuickMatch.tsx`, `src/ui2/Settings.tsx`, `src/ui2/pitch/{sim,tuning}.ts`, `src/styles/app.css`, `ui-tests/{still.mjs (new),pitch-metrics.mjs}`, `sim-tests/pitch.ts`, `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** The pitch test no longer drops frames after 8 s of a minute when the minute is longer (Full match). It now measures whole minutes, so its Full-match numbers moved: marking 84%. Tier One is untouched.

## 2026-10-02 · saifsaber · The Gaffer: the ball goes from man to man (the engine records its passes); referee, assistants and VAR on the pitch
- **What changed:** The match engine now records the passes inside every action (`engine/passes.ts`): who passes to whom, when, and what kind (ground, long, cross, through ball, cutback), from where each player stands, ending with the man in the next contest or the shooter. About 990 passes a match for both sides, 5 in the move before a shot. They run on their own random stream, so no result changes: the engine fingerprint is identical. The pitch plays them like FM: a pass goes to the receiver (aimed where he can be, and he comes onto it), the defender in the next contest closes the carrier first, then the carrier goes past him or loses it at his feet, a shot waits for the ball to reach the shooter, and the ball never jumps (a ball that isn't at its man's feet yet rolls on to him). Measured on Extended highlights (`sim-tests/diag.ts`): passes reach their man 98% of the time (was 35%), ball jumps 0 (was 277 in 6 matches), median short pass 16 m. Also the referee (in a colour apart from both kits) runs a diagonal near play; two assistant referees run the top and bottom touchlines, each level with his half's offside line, and the right one raises the flag; on an on-field VAR review the referee goes to the pitchside monitor. Highlights now start 18 s before their moment (was 14 s) to show more of the build-up.
- **Files:** `games/the-gaffer/web/src/sim/engine/{passes.ts (new),play.ts}`, `src/sim/{match.ts,highlights.ts}`, `src/ui2/pitch/{sim.ts,officials.ts (new),tuning.ts}`, `src/ui2/Pitch2D.tsx`, `sim-tests/{passes.ts (new),diag.ts}`, `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** The flow gains `p` (pass) and `r` (contest lost, ball kept) entries; `l` now only means the ball changed hands. The flat pitch view is a little taller (a strip outside each touchline for the assistants). Passes are not tallied yet, so the analysis screen still has no pass map. Tier One is untouched.

## 2026-10-02 · saifsaber · The Gaffer: touchline shouts right under the pitch, usable during highlights
- **What changed:** The six shouts ("Press them", "Get it wide", "Drop off" …) moved from a panel far below the pitch to a row right under it, so they can be used while a highlight plays. A shout shows a "📣 Press them" bubble on the pitch for a moment, and the players' shape on the pitch follows the new instruction straight away (the pitch reads its spots from the tactics). The save after a shout waits for the next quiet moment instead of happening mid-passage (no stall on slow phones: 0 frames over 50 ms in the browser test). The "From the touchline" panel now only appears for the assistant's tip or Plan B.
- **Files:** `games/the-gaffer/web/src/ui2/Live.tsx`, `src/styles/app.css`
- **Heads-up for the team:** None. Tier One is untouched.

## 2026-10-02 · saifsaber · The Gaffer: AI managers adapt to the wind and the heat; analysis screen checked in Arabic
- **What changed:** At kick-off an AI manager sets up for the weather, and the commentary says so ("… in the wind"): in the wind it keeps the ball on the ground, plays narrower and takes corners short; in the heat it keeps the ball. Measured over 2,000 matches of each (`sim-tests/wxai.ts`): in the wind the adapting side takes 1.58 points a match against 1.50 without, and in the heat 1.55 against 1.53; goals move under 3%. Heavy rain and snow change nothing on purpose: going direct on a heavy pitch was measured to cost more than the long-ball edge gives back. Clear days, rain and snow play exactly as before. The analysis screen was checked in Arabic: "47 من 55" printed backwards (fixed), Arabic plurals for 3–10, a line naming whose number is whose on Territory, and goal labels close together on xG charts merge ("GOAL ×2") instead of overlapping.
- **Files:** `games/the-gaffer/web/src/sim/engine/weather.ts` (`weatherPlan`), `src/sim/match.ts`, `src/lang-new{,-ar,-es,-fr}.ts`, `src/ui2/Analysis.tsx`, `src/ui2/kit.tsx`, `src/lang-ana.ts`, `sim-tests/wxai.ts` (new)
- **Heads-up for the team:** The engine fingerprint changes (AI tactics differ in wind and heat). While measuring, a counter-attacking setting helped AI sides by about +0.1 xG a match in every weather, clear included: the AI's tactic choice has room to improve, separate from the weather. Tier One is untouched.

## 2026-10-02 · saifsaber · The Gaffer: post-match analysis (like FM's Analysis screen)
- **What changed:** The full-time screen has a **Match analysis** button (EN/AR/ES/FR). It opens three tabs, all read from what the engine recorded (`sim/analysis.ts`, added to the aftermath; in memory only, not in the save):
  - **Chances.** A shot map: each shot in its zone, sized by xG, filled for a goal, us and/or them. Shots, on target, big chances and xG per side. Where the chances came from, by kind (in the box, cut-backs, through balls, counters, won high, from distance, headers / corners, free-kick crosses, free kicks, penalties), with count, xG and goals.
  - **Territory.** Time on the ball along the pitch (six bands: the engine keeps the length only). Possession, entries into the final third by lane, building out past their press, progression through midfield, balls won high up and counter-attacks, us against them.
  - **Players.** Any of our players: a heat map of where he was involved (contests, shots, fouls, saves for the keeper), contests won, shots and xG, goals, assists, fouls, saves and rating. It opens on the most involved player.
- **Checks:** `node sim-tests/build.mjs analysis`: on 100 matches, shots, goals, xG by source and contests agree with the match's own numbers. Browser: no console errors; nav test passes.
- **Files:** `games/the-gaffer/web/src/sim/analysis.ts` (new), `src/sim/aftermath.ts` (`ana`), `src/ui2/Analysis.tsx` (new), `src/ui2/FullTime.tsx`, `src/lang-ana.ts` (new), `src/styles/app.css`, `sim-tests/analysis.ts` (new)
- **Heads-up for the team:** There is no pass map: the engine plays contests between players, not single passes (the screen says so). Adding passes would be an engine change, if wanted. Tier One is untouched.

## 2026-10-02 · saifsaber · The Gaffer: ENGINE.md brought up to date
- **What changed:** `games/the-gaffer/ENGINE.md` now covers everything added since engine v2, with today's measured numbers:
  - injuries from tackles and hidden proneness;
  - weather;
  - the marking instructions, including the AI's choices;
  - highlights;
  - the engine → pitch contract (`m.flow`: every entry kind, its second and node, and the rule that the pitch never guesses what the engine knows, guarded by the 200-match fingerprint);
  - the live pitch layer by layer (`sim`, `body`, `move`, `defend`, `setpieces`, `director`, `tuning`);
  - every test and how to run it (fingerprint, injuries, marking, weather, the Node and browser pitch tests, `watch.mjs` for phones);
  - the new optional save fields and the in-match save timing;
  - the known gaps (the whole-career save during a match, `ENGINE_CLOCK` off, cameras unused).
- **Files:** `games/the-gaffer/ENGINE.md`
- **Heads-up for the team:** Read it before touching the match engine or the pitch. Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer: watched as a player, and checked on a slow phone
- **What changed:**
  - **Watching tool.** New `ui-tests/watch.mjs` plays a match in the built game in one highlight mode. It reports smoothness (frames a second, frames over 50 ms, which minute the slow ones fall in) and can slow the CPU like a cheap phone (`CPU=4|6`). It can also record a video and screenshots of the pitch (kept out of git).
  - **Pitch no longer hidden.** The highlights list now sits in the pitch card ("Highlights: Extended"). On a 390-px phone it used to wrap onto a third row of the match bar, and that bar covered the pitch.
  - **Saves during play** happen every 5 match minutes but at most once every 10 real seconds, and only in a minute between highlights (the picture is cutting anyway); in Full match, every 10 s. A save writes the whole career. With the clock running fast between highlights, it froze the pitch on slow phones in the middle of a passage.
  - **Measured smoothness:**

    | | Normal CPU | CPU 4× slower | CPU 6× slower |
    |---|---|---|---|
    | Full match | 59 fps | 55 fps | 55 fps |
    | Extended, before | 58 fps | 46 fps, freezes up to 0.9 s | 35 fps, up to 1.85 s |
    | Extended, now | 58 fps | 57 fps, at most 0.45 s | 49 fps |

    At CPU 6× slower the saves still take about a second, but only between highlights.
- **Files:** `games/the-gaffer/web/ui-tests/watch.mjs` (new), `src/ui2/Live.tsx`, `src/styles/app.css`, `.gitignore` (`review/`)
- **Heads-up for the team:** A save during play still writes the whole career, about 0.2 s on a normal CPU. Saving only the live match on its own would remove that cost but changes the save format, so it was left for a decision. Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer pitch: support for the ball carrier, with the marker a moment behind
- **What changed:**
  - **Support.** When a team-mate has the ball in his own half or midfield, the three nearest players offer him a pass. One whose lane is shadowed checks away sharply (a sprint) to the nearest open spot at passing range: short, wide, behind or ahead of the carrier, never offside. Near their box, attackers keep their runs and positions instead.
  - **The marker's delay.** A marker sees his man where he was a moment ago (`T.MARK_LAG`); a good reader of the game closes most of that gap (`T.MARK_READ` × his reading). That half-step is what lets a sharp move open the lane, and it shows the difference between defenders.
  - **Measurement fix.** A man now blocks a pass only if he is in front of the ball along it. Before, a presser standing beside the carrier counted as closing every pass in every direction: with a presser within 3 m only 22% of frames had two open passes, against 93% without one. The supporting players' own choice used the same wrong rule, so both were fixed.
  - **Results:**

    | | Full match (4 matches) | Extended (10 matches) |
    |---|---|---|
    | Two open passes for the carrier | 91% (was 55–59%) | 86% |
    | Marking | 78% | 84% |
    | Overlaps | 53% | 59% |
    | Box blocking | 97% | 92% |
    | Offside | 2% | 1% |
    | Reaction after losing the ball | — | 25 of 25 |

  - **Browser:** 58 fps, no console errors; the nav test passes.
- **Files:** `games/the-gaffer/web/src/ui2/pitch/{sim,tuning}.ts`, `ui-tests/pitch-metrics.mjs`
- **Heads-up for the team:** Support movement across the whole pitch was tried first: near their box the sprints pulled attackers away from their markers and marking fell to 73%. That is why support stops at their last third (`T.SUPPORT_UPTO`). Tier One is untouched.

## 2026-10-01 · mmoustafaeditor (Claude Code session) · Tier One 4.1.0 "compact rebuild": four modes, nothing scrolls (lane8/t1-hybrid)
- **What changed:** UI41.md as a build, merged from four lanes (lane41/shell, daily, career, wire) plus integration. **Home** is four big mode tiles (Daily Challenge, Career, Multiplayer, Transfer Market) and one row of five labelled utilities (Press Card, Leaderboards, Missions, Shop, Settings) with red count badges; Deadline Day and Practice sit inside the Daily Challenge tile. No widgets, dock, status bar, bottom back arrow or desktop side panel; every screen is `ui/screen.tsx <Screen>` with a real Back button top-left (Esc / Android Back) and pages instead of scrolling. **Daily Challenge**: five compact player rows, big calls-left, End Day; the player screen shows the five sources as buttons (what they tell you, how often they're right, cost in calls), Decide now / Decide later, the decide sheet (SIGNS / ELSEWHERE / STAYS, In talks ×1 / Advanced ×2 / Confirmed ×3, the deal in one line), results on one screen. **Deadline Day**: night board with the 90 s clock as the hero, rival ticker, six players in a 2×3 grid, red clock and ticks under 15 s, two-tap posting, "window shut" results. **Career**: Continue / New career, a three-step prologue, one chapter card (three lines, boss card, goal bars, paged story messages, Play next window). **Transfer Market** (real life): Stars / Heat / League / Team filters + search, 5 a page, rumour screen with Watch / Call it, My calls (open / resolved / watching). **Multiplayer** = Rooms only (create, join with a code, Table / Rounds / Chat, Leave room); challenges and newsrooms show "This link has expired". **Press Card** (7 tabs: Overall, Daily, Career, Deadline, Market, Rooms, Sponsor), **Leaderboards** (own app: Daily Challenge today / this week, each of your rooms, Transfer Market), **Missions** (today, this week, season; Claim), **Shop**, one-screen Settings / How to play / onboarding, a 4-tip first-Daily tutorial and one first-time hint per main screen. Word sweep: no Blurt / Lens / DMs / Wire / Groups / Boards / Hint / Post-as-stake / Drop anywhere a player sees (`i18n/parts/zz41.ts` loads last and overrides the older parts in EN / AR / ES). Formatting pass measured with a headless layout check (every screen at 390×664, 390×844 and 1280×800 in EN and AR: no page or box scroll, no clipped labels, contrast ≥ 4.5, taps ≥ 44 px, Back on every page).
- **Files:** `games/tier-one/v3/web/src/**` (App.tsx, ui/phone.tsx, ui/screen.css, screens/*, styles/*, i18n/parts/{shell41,daily41,career41,wire41,zz41}.ts), new `screens/Leaderboards.tsx`, `lib/missions41.ts`; deleted `screens/{Blurt,DMs,Connect}.tsx`, `styles/{blurt,lens,results}.css`, `lib/widgets.ts`; `games/tier-one/v3/web/package.json` 4.1.0.
- **Heads-up for the team:** Not released (no `tier-one/` build output committed, no push). Weekly mission rewards (40–60 coins + XP) are new economy numbers. Server code unchanged. Old `?app=` / `?tab=` / route ids still map (blurt→daily, lens/me→card, boards→Leaderboards, market→wire, groups→rooms).
## 2026-10-01 · saifsaber · The Gaffer: small follow-ups to the highlights
- **What changed:**
  - **Match bar.** The old "Highlights" fast-forward button on the live match bar is gone; the highlight modes replace it.
  - **Weather on the pitch.** Wind shows as gusts drifting across the pitch and heat as a faint warm haze, like rain and snow already did.
  - **Measured at real pace in Extended mode** (10 seeded matches, both sides on each style), attackers near goal marked within reach:
    - zonal: 82%;
    - mixed: 88%;
    - man: 88%.

    Man-marking is no longer looser than mixed, as it was in the compressed minute.
  - **Measured in Full match mode** (4 matches): line, blocking (97%), overlaps (57%), offside (2%) and keeper (0.0 m) all hold. The carrier has two open men only 59% of the time; in build-up from the back a centre-back on the ball finds two in only about half his frames.
- **Files:** `games/the-gaffer/web/src/ui2/Live.tsx`, `src/ui2/Pitch2D.tsx`, `src/styles/app.css`
- **Heads-up for the team:** Support movement was tried: team-mates moving to open lanes near the carrier. It made it worse (53%), because their markers follow them, so it was backed out. The 2.5D and 3D cameras aren't used on the live screen, so highlights don't affect them. Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer: match highlights like FM, and the pitch at real pace
- **What changed:**
  - **Highlight modes.** A watched match now shows highlights like Football Manager (`sim/highlights.ts`). Pick the mode on the live screen's bar or in Settings › Match; it's in EN/AR/ES/FR. Average match length at Normal speed:
    - **Commentary only** (the zone map, no pitch): about 0.5 min.
    - **Key** (goals, penalties, red cards, big chances; about 5 a match): about 1 min.
    - **Extended**, the default (plus every shot, corner and free kick in range; about 41 a match): about 4 min.
    - **Comprehensive** (plus balls in behind, crosses and counters; about 58): about 6 min.
    - **Full match**: about 40 min.
  - **How a highlight plays.** It runs at the engine's own pace (Slow 1.5×, Normal 2.5×, Fast 4× real time; the old pace setting is now the highlight speed). Between highlights the clock runs on quickly and the picture cuts.
  - **Why.** Showing a whole engine minute in 2.4 s gave players no time: the ball changed hands every 0.13 s, faster than anyone reacts. The pitch's open problems (back line, overlaps, blocking, reacting after losing the ball) were all that.
  - **Measured in Extended mode on 10 seeded matches** (`node sim-tests/build.mjs pitch`, which now measures what the player sees), every check passes:
    - back-line spread 1.1 m (it was 4.4);
    - reaction after a turnover 33 of 33;
    - box blocking 90% (it was 52);
    - full-back overlaps 63% (it was 0–8);
    - offside 1%;
    - two open men for the carrier 72%;
    - marking 85%;
    - keeper 0.0 m.
  - **Also on the pitch:**
    - real runs are sprints (overlaps, counter-press, recovery runs, closing a shot), never while a set piece is staged;
    - runners hold the offside line and go when the ball is played (the director reads who the next ball is for);
    - players run at a fixed scale for the chosen speed;
    - a carrier with no target no longer crashes the pitch.
  - **Checks.** Results are unchanged (same 200-match fingerprint). Browser: 59 fps, no console errors, nav test passes.
- **Files:** `games/the-gaffer/web/src/sim/highlights.ts` (new), `src/sim/prefs.ts` (`hl`), `src/ui2/Live.tsx`, `src/ui2/Pitch2D.tsx`, `src/ui2/Settings.tsx`, `src/App.tsx`, `src/ui2/QuickMatch.tsx`, `src/ui2/pitch/{sim,move,body,tuning,director}.ts`, `src/lang-ref{,-ar,-es,-fr}.ts`, `sim-tests/pitch.ts`, `ui-tests/pitch-metrics.mjs`
- **Heads-up for the team:**
  - A watched match is shorter by default now: Extended takes about 4 min at Normal.
  - The old "Key" button on the match bar (45 ms a minute) is still there and overlaps the Key mode; it gets tidied next.
  - Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer, phase 4 (first part): the engine hands corners and offsides to the pitch; penalties staged; blocking shots
- **What changed:**
  - **Engine** (results unchanged, same 200-match fingerprint): corners and offsides are now entries in the ball path the engine gives the pitch (`m.flow`, `k: 'c' | 'o'`), each at its own second. The pitch used to guess where they went by counting shots in the event log.
  - **Penalties** are staged on the pitch: the foul is given as a penalty, the ball goes to the spot, the taker stands behind it, everyone else waits on the edge of the box and the keeper stays on his line. Before, a penalty was shown as a free kick with a wall inside the box.
  - **The director** (`ui2/pitch/director.ts`): players can read the engine's plan a moment ahead. A defender sees a shot coming and gets into the shooting lane before it's struck, then blocks the lane from the ball once it reaches the shooter in the box. He sprints flat out to the lane (an "urgent run", `body.ts move`) instead of easing in like every other move. Without that, a defender 9 m away took about a second to arrive.
  - **Box blocking** went from 28% to 52% of frames on 10 seeded matches.
  - **Beat timing:** timing beats by the engine's own seconds is built (`T.ENGINE_CLOCK`) but off. Measured, it made marking worse (88% against 94%) and nothing better.
- **Files:** `games/the-gaffer/web/src/sim/engine/play.ts`, `src/ui2/pitch/{director (new),sim,body,setpieces,tuning}.ts`, `ui-tests/pitch-metrics.mjs`
- **Heads-up for the team:**
  - Still open: back-line spread (4.4 m against 3 m) and full-back overlaps (0–2%).
  - The turnover-reaction check reads 94 of 125. The same 95 or so turnovers still get a reaction, but corners and offsides now land where the engine had them, which brings about 5 more turnovers into the measured window. Those are being looked at next.
  - Urgent runs were tried for counter-pressers, recovery runs and overlaps too. They broke walls and the offside line, so only the blocker uses one.
  - Tier One is untouched.

## 2026-10-01 · mmoustafaeditor · Tier One 4.0 phase B, play lane: Blurt, DMs and the results thread on the 4.0 driver (lane22/play)
- **What changed:** Every window now plays in **Blurt** on `makeDriver` (`App.tsx` builds `makeDriver({ mode, onDone: onDriverDone })` for daily / room / play; `play` also takes `tutorial`, `deadline`, `challenge`). Blurt: today's window pinned at the top ("Day 2 of 5 · 2 DMs left"), stories as big cards in club colours with their state (no DM yet / the contacts' answers as chips / your post stamped), the three accounts' overnight posts on the timeline with handle and accuracy, your posts with live counters, Drops as square cards, pull to refresh, the Story boss strip (registry), the Live clock bar (`rulesFor('deadline')`, time out ends the window). Post sheet: SIGNS / ELSEWHERE / STAYS with the clubs named, Hint / Post / Drop, the deal in one sentence from `preview` and whether the Scoop is still on; posting is a real flight into the timeline, a Drop is composed, published, flipped (catchphrase typed on, one slam). End day runs the clock to morning and refreshes the feed. **DMs** app: contacts as threads (what they tell you, how often they are right from the E4 tables, when locked ones open, warmth = Trust, coffee), brand offers (accept / decline), and the **call screen** (typographic avatar, "Barber · 00:07", live waveform, the contact's synth sound bed, the answer typed as a voice note, hang up / tap to skip). **Results** are a thread: posts resolve one by one (ending card, Scoop stamp / catchphrase / ratio, points in one line, banter replies), then grade, "You beat N% of today's players" / group / boss head-to-head, follower and Rep rolls, XP and the level bar, coins and the sponsor's per-call lines, the share card (grid), next action. The drawn films are gone (CONCEPT4 §6).
- **Files:** new `src/screens/Blurt.tsx`, `src/screens/DMs.tsx`, `src/styles/blurt.css`, `src/i18n/parts/play4.ts`, `src/ui/tutorial.tsx` (stub); rewritten `src/screens/Results.tsx`, `src/screens/Window.tsx`, `src/lib/scenes.ts` (no-op API); `src/lib/banter.ts` (`thread4`, `accountPost4`, `ratioLine4`, `BANNED4`), `src/lib/rivals.ts` (`setBoss`, `bossNow`, `bossResult`, `bossLine`), `src/lib/share.ts` (`shareWindow4`, `renderCard4`, `shareText4`), `src/screens/Connect.tsx` (`ContactsScreen` = DMs). Deleted: `src/film/**`, `src/ui/film.tsx`, `src/lib/filmgate.ts`, `src/ui/CallScene.tsx`, `src/ui/PostScene.tsx`, `src/screens/Saga.tsx`. Outside the lane (smallest edits): `src/App.tsx`, `src/screens/{Me,Newsroom,Rooms,Settings,Wire}.tsx` (film imports removed), `src/lib/perf.ts` (`prefetchFilm` removed).
- **Heads-up for the team:** Story lane: register the chapter boss once with `setBoss({ boss: () => Boss4 | null, result?: (out) => BossResult4 | null })` from `lib/rivals.ts`; Blurt shows the strip and the results head-to-head from it. Onboarding lane owns `ui/tutorial.tsx`: Blurt mounts `<TutorialLayer driver story/>` in mode `tutorial`; targets carry `data-tut` (`story-<i>`, `dm-<src>`, `post`, `how-<o>`, `loud-<s>`, `publish`, `end-day`). Start a window with `go({ n: 'play', mode: 'practice' | 'career' | 'tutorial' | 'deadline' | 'challenge', key: Date.now() })`. `lib/scenes.ts` still exports `playScene` / `afterScenes` etc. as no-ops so callers compile; drop the calls when you next touch them. `ui/live.tsx MorningPapers` still opens its newspaper sheet on Home (not this lane's file). The Daily before `V4_FROM` (2026-10-05) shows "plays by the new rules from 5 October" with a Practice button.

## 2026-10-01 · mmoustafaeditor · Tier One 4.0 Story: Career IS Story mode, rebuilt on the 4.0 engine (lane22/story)
- **What changed:** The Story app is one DM thread (`screens/Story.tsx`, `styles/story.css`): the chapter's guide at the top (Rosa → Hana → Hana + Tony → Priya and Mags → Mags), the chapter goal pinned under it ("Chapter 2 · 6 of 12 windows · Rep 47 → 55" plus "Beat @ITK_Kev in 12 windows · 3 so far"), every beat as a message (chapter cards, the boss's stats card, window results with the head-to-head, boss banter, reveals, unlocks), the next window's stories and the DMs that land before day 1, then two extras and one big button. No films: the prologue is played on the phone (Mags and Vince type, you tap "Drop it", the post lifts, the ratio spins, 38,400 followers roll down to 200, "Nothing personal." from an unknown number), and the epilogue is your pinned post plus one text you send Vince. The model is `lib/storyMode.ts`: five chapters (`CH`: guide, contacts, rivals, boss, board rank, gate = windows + Rep bar + boss wins: 8/40/3, 12/55/5, 16/70/7, 20/85/9; Chapter 5 = three Tier One windows, then a 45-second Live finale against Vince), a boss per chapter (`BOSS`, `bossView`: handle, accuracy, days, tell, followers, your record, what beating them unlocks), the head-to-head per window (your right + Scoops vs their right posts), the whistleblower (1 window in 8, an unknown number, 75% right; Priya from Chapter 4, 1 in 4, 90%), Vince's clients (Chapter 2 on: tagged stories, the agent talks it up, @ITK_Kev a day early), Vince's play (Chapter 4 on: one planted contact a window, told after), the trap (Chapter 5: Vince's word-for-word "Done deal" DM on a story that isn't signing), Career extras (extra DM 40, tip-off 60 = "does this story STAY", max 2 a window; free extras from 3.x favours, a right Market call, or Market Tips from Chapter 3). The engine gained Story options on `rulesFor('career', { rank, trust, boss, bossRank, contacts, rivals, extraDm, tagged, planted, live })` with per-boss p / rel / days by rank (`BOSSES`) and per-story contacts (`R.PER`, `E4.srcOf`); defaults are unchanged (sim4 800 daily: same numbers). 3.x club leaks, the frozen-out kit man and favours are gone from `careerRules`; the editor's-desk route renders Story.
- **Files:** `api/tier-one/v3/_lib/engine4.mjs`, `games/tier-one/v3/web/src/lib/engine.ts`, `src/lib/storyMode.ts`, `src/lib/career.ts`, `src/lib/desk.ts`, `src/screens/Story.tsx`, `src/screens/Editor.tsx`, `src/styles/story.css`, `src/i18n/parts/story4.ts` (new), `UPDATES.md`
- **Heads-up for the team:** Play lane: a Career window is `const w = nextCareerWindow(getSave()); makeDriver({ mode: 'career', seed: w.seed, rules: w.rules, cast: w.cast, label: w.label, onDone: w.onDone })` (`w.onDone` = `onStoryDone`: the story settle, then `onCareerDone`; plain `onDriverDone` also works, the Story screen catches the story up from `v4.last.career`). Show `w.tips` as DMs before day 1, tag `w.tagged` stories "Vince's client", keep `w.planted` secret, run `w.live` windows with the clock. Story opens `{ n: 'play', mode: 'career' }`, which App still builds with the v3 driver until `WindowScreen` moves to `Driver4`. Market lane: `save.v4.tips` (0–3) are Market Tips; Story spends them from Chapter 3. Rival ids `roar` (@DailyRoar) and `vince` (@VinceMarlow) can appear in a Career window's feed (`rival.roar`, `rival.vince` are in `story4.ts`).

## 2026-10-01 · mmoustafaeditor · Tier One 4.0 onboarding + clarity: the first five minutes, How to play on one card, the word sweep (lane22/onboarding)
- **What changed:** CONCEPT4 §12 as a build. First launch is a lock screen at 09:41 with one DM from Mags Doyle; tap it and "Set up your account" asks two things (your handle, with a suggested one, then your line from three house catchphrases: Book it. / Lock it in. / Through the gates.), then the First window opens in Blurt (driver mode `tutorial`, seed `tutorial-1`, 3 stories). `ui/tutorial.tsx` is the teaching layer the play lane mounts: Mags's lines arrive as DMs (typing dots, then the line) and one green ring sits on the thing to tap; every step waits for the player's own action on the real UI (barber DM → the chip → the agent → a Hint → end the day → @BackPageBants → the kit man → a Post → Deadline Day → the physio → a Drop, with the Scoop rule on the Drop's deal line → close). The First window settles through `lib/meta.ts onTutorialDone`: followers at full weight from a 200-follower start (about 600 for a clean run), Level 2 and its coins, so the results thread shows the Market unlock; the first Local sponsor offer lands in DMs; back on the home screen a push card asks once, with its reason. How to play (`screens/HowTo.tsx`) is one card: the six ideas, each with a small picture made of the game's own pieces, the scoring table and the contacts, all read from `E4.RULES`. A 3.x save sees "What's new on your phone" once (the new words as a glossary). Word sweep across `i18n/parts/*.ts` in EN, AR and ES: Talks/Advanced/Confirmed, Done/Hijack/Off/Fake, exclusive, Press Points, the old ranks, the editor's desk and front-page lines are now CONCEPT4 §3 words.
- **Files:** `games/tier-one/v3/web/src/screens/Onboarding.tsx`, `src/ui/tutorial.tsx` (new), `src/screens/HowTo.tsx`, `src/styles/screens.css` (ob4/tut4/how4 blocks; the 3.x how-to styles removed), `src/i18n/parts/onboarding4.ts` (new), word sweep in `src/i18n/parts/*.ts`; outside the lane: `src/lib/meta.ts` (`onTutorialDone`), `src/lib/catalog.ts` (two house lines `cp.lockin`, `cp.gates`), `src/App.tsx` (the `play` route takes the 4.0 modes; `<Onboarding go route/>` always mounted).
- **Heads-up for the team:** Play lane: keep `<TutorialLayer driver story/>` and the `data-tut` targets (`story-<i>`, `dm-<src>`, `post`, `how-<o>`/`loud-<s>` as radios with `aria-checked`, `publish`, `end-day`); add a "?" to Blurt's header that opens `{ n: 'howto' }`. `App.tsx` on this branch still builds the v3 driver for `play`, so the First window only plays once the play lane's `makeDriver` switch is merged. The 3.x twist/U-turn banter pools were not rewritten (only v3 archive results reach them).

## 2026-10-01 · mmoustafaeditor · Tier One 4.0 phase B, modes lane: Live, Market, Groups, Boards (lane22/modes)
- **What changed:** **Live** is a 90-second Deadline Day stream. The lobby (`screens/DDLive.tsx`) has one button: a practice stream any day (random seed, driver mode `deadline`), or on a real deadline day (`lib/season.ts DEADLINE_DAYS`) the ranked **DD Live**. The server (`live.dd.board / start / submit / results`) gives everyone the same seed, allows one run per player and replays the finished log under `E4.rulesFor('deadline')`, so Hint, Post and Drop score engine4 WIN, LOSS and SCOOP. The 3.x rumour board, its own stake numbers and U-turns are gone. **Market** (`screens/Wire.tsx`) is the Wire renamed: every card says "Market says 62% he moves" over a market bar. Watch is free with no level gate: your watchlist goes in `save.market.watch`, and a stage change, a 15-point move or a settled rumour goes to the tray through `notify()`. HE MOVES / HE STAYS calls open at Level 2 and are backed as a Hint, a Post or a Drop. The call sheet states the deal in one sentence ("Win 14.4 if he moves. Lose 6.2 if he stays."). Open calls show heat and settled calls show as a thread. A right call pays XP, coins by the player's star and a **Tip** (`lib/tips.ts`, hold 3). The server's wire scoring is unchanged. **Groups** (Level 4) has three tabs. Rooms show round results as the v4 grid plus "what happened". Challenges play on driver mode `challenge` with the maker's rule spec (`acceptChallenge` → `makeDriver`), and the finished log is sent from an `onGain` hook. Crews are the newsroom actions. **Boards**: Today, This week, Market season and Groups. Your place is the biggest number on screen, prizes are collected here, and ranks are written as words ("1st"), never crowns. The morning-papers sheet and the DD/press-box/masthead films are cut. Strings are in `i18n/parts/modes4.ts` (EN, Egyptian AR, ES).
- **Files:** `api/tier-one/v3/index.js` (DD Live handlers + helpers only), `games/tier-one/v3/web/scripts/live.test.mjs`, `web/src/lib/{live,social,wireData,tips}.ts`, `web/src/screens/{DDLive,Wire,Rooms,Newsroom,Boards}.tsx`, `web/src/ui/{social,live,WireChip}.tsx`, `web/src/styles/{live,social,football}.css`, `web/src/i18n/parts/modes4.ts`; outside the lane (smallest edits): `web/src/App.tsx` (Route `play` modes `deadline` / `challenge`, v3 driver memo skips them), `web/src/ui/phone.tsx` (`appOf` for those two modes).
- **Heads-up for the team:** Play lane: mount `{ n: 'play', mode: 'deadline' | 'challenge' }` with `makeDriver({ mode: route.mode, onDone: onDriverDone })`. The window is already in `save.v4.live[mode]` (lib/live.ts `startStream` and lib/social.ts `acceptChallenge` started it), and the ranked DD Live / challenge logs go up by themselves from `onGain`. Career/Practice: spend a Tip with `spendTip('extraDm' | 'tipoff' | 'second')` from `lib/tips.ts`. Lens: `marketProfile(save)` from `lib/wireData.ts` gives Market season Cred and hit rate. Shell: `MorningPapers` now renders nothing, so drop its mount. `<SocialWatch/>` must stay mounted, because it installs the Groups and Live settle hooks and the Market tray watcher. Not done: a Secret file for a Scoop-grade Market call (there is no file id in `SECRET_FILES`). DD Live is only as fair as the client: the seed and the board are local, so the server checks the clock and the replay, not the truth. A fully server-held DD scope needs remote driver support for mode `deadline`.

## 2026-10-01 · mmoustafaeditor · Tier One 4.0 Lens: profile, Sponsors, Looks, Season, Secret files (lane22/lens)
- **What changed:** New `screens/Lens.tsx` is the Lens app, five tabs with one obvious action each. **Profile**: frame avatar, @handle, the rank held (crown only at Tier One), Level, the catchphrase, Market Cred and hit rate; followers in wood type with a rolling count and a 30-day graph; the Rep bar with the five ranks named; the Level bar; hot streak; the grid of your right Drops (each in the Drop card style it was published in, with the line it fired); bosses ("Beat @BackPageBants 5–3"); medals as "1st ×2 · 2nd ×1" (ribbons, never crowns); trophies by name; records; "Share my line". **Sponsors** (CONCEPT4 §4): the running deal pinned with its running total, strike pips, the clean-finish bonus, the rate card per right Hint / Post / Drop, the strike rule in one line and the brand's own lines; offers as brand DMs with Take the deal / Not now; standing stars for all six brands (and what a shut tier wants); past deals. Brands are drawn logotypes (`BrandMark`). **Looks**: the one shop for wallpapers, phone themes, Drop cards, frames, ringtones and catchphrases with a live preview on your own phone, coins and credits kept apart, Gold explained in one card, the starter bundle once at Level 3 as a quiet card (a line after), your own line from Insider. **Season**: the 30-tier track, free and Gold lanes, claim with a reveal. **Files**: 12 sealed folders; an earned one is a "New file" until you open it. `Me`, `Pass` and `Customize` now open Lens (Profile / Season / Looks). `lib/deals.ts` matches §4: every running deal moves per call (`onCallAll`, used by `lib/meta.ts`), each deal keeps the brand's lines, Groups rounds and Practice never count (and never end a window deal's term), no offer before the First window, plus `brandsView`, `dealLines`, `rateCard`, `bonusAtStake`. New `lib/lens.ts` keeps the follower history, the Drops grid and opened files (`lib/meta.ts settleWindow` calls `noteWindow`). The share card (`ui/sharex.tsx`) is the equipped Drop card and its PNG uses that style; it now finds a v4 right Drop (`rightDropOf`).
- **Files:** `games/tier-one/v3/web/src/screens/Lens.tsx` (new), `src/lib/lens.ts` (new), `src/styles/lens.css` (new), `src/i18n/parts/lens4.ts` (new), `src/lib/deals.ts`, `src/lib/meta.ts`, `src/lib/catchphrase.ts`, `src/lib/style.ts`, `src/screens/Me.tsx`, `src/screens/Pass.tsx`, `src/screens/Customize.tsx`, `src/ui/customize.tsx`, `src/ui/sharex.tsx`, `src/ui/awards.tsx`, `src/ui/connect.tsx`, `src/styles/customize.css`, `src/styles/sharex.css`, `scripts/economy4-test.mjs`, `UPDATES.md`
- **Heads-up for the team:** Other lanes can draw looks with `ui/customize.tsx`: `<Wallpaper p/>` (lock and home screen), `<DropFace p o cp player club scoop/>` / `<DropCard s …/>` (Blurt's Drop card), `<FrameRing/>` / `<Avatar s/>`, `<PhoneMock/>`, `<BrandMark brand/>` (sponsor DMs and results lines). Story lane: write chapter head-to-heads to `save.story.h2h[<rival id>] = { w, l, beaten }` and Lens shows them; until then the rival ledger stands in. Sponsor rule change: a Groups round no longer pays or ends a deal (§4 lists Daily, Career, Live and Market only). economy4-test 9/9, tsc clean.

## 2026-10-01 · mmoustafaeditor · Tier One 4.0 shell redesign: lock faces, home widgets, icon packs, themes and phones (lane22/shell2)
- **What changed:** The phase-A shell (navy field, flat colour squares, an orange gradient button, two-thirds empty) is replaced by CONCEPT4 §17/§18. The phone is a warm near-black with paper highlights and ONE accent taken from the player's look (theme → wallpaper → lock face), one editorial type system (Newsreader names and stamps, Archivo condensed numbers, Schibsted text), one drawn icon family on grained paper tiles with a pressed edge, solid edged surfaces (no glass, no blobs). **Lock faces** (new `lockface` kind): field + clock style (big numerals, stacked editorial, ticker with your last result, club split) + the stamp under the clock (handle and rank, catchphrase, followers, streak) + tray style (cards, strip, paper slips); six house faces (House and Late edition free, Ticker 150, Club split 400, Floodlight 900, Gilt 300 credits) plus the Chronicle face from Chapter 5; the device bezel frames the lock screen and the Brick boots with a beat. **Home**: your handle and rank set big, then widgets in your phone's Screen slots (Today's window as a matchday ticket with the five kits, countdown and the one action; Followers with a 30-day line; Streak; Your line; Market watch; Sponsor; Season track; Group; Boss; Secret files), the apps and the dock; two pages; the first page is full on first launch. **Edit home**: hold anywhere → move, resize (2×2 / 4×2), move to page 2, remove, add, and tabs for Lock face, Icons, Theme and Phones; every look is tried on this phone before paying (`tryLook`). **Icon packs** (new `iconpack` kind): paper (default), outline, stamp, retro, crest. **Themes**: two new OS themes with radius and type tokens (Chalkboard, Matchday programme); an equipped v4 theme now actually restyles the phone. **Phones** (new `device` kind + `lib/phones.ts`): your phone, the Brick, the Post's hand-me-down, the Halo flagship, the burner, the Chronicle phone, plus Terrace and Halo One skins; four parts (Screen 2/4/6 slots, Battery 0–3 extras, Camera 1–2 photos from Chapter 3, SIM 75→90%) upgraded with coins in one tap; desktop draws the equipped device's bezel, frame, radius, notch and the Brick's crack.
- **Files:** `games/tier-one/v3/web/src/ui/phone.tsx`, `src/screens/Home.tsx`, `src/screens/Front.tsx`, `src/styles/phone.css`, `src/styles/home.css` (new section at the end), `src/styles/desktop.css`, `src/lib/phones.ts` (new), `src/lib/widgets.ts` (new), `src/ui/widgets.tsx` (new), `src/lib/kinds.ts` and `src/lib/catalog.ts` (additions only: kinds `lockface`, `widget`, `iconpack`, `device`, theme `radius`/`face` tokens, items), `src/i18n/parts/shell24.ts` (new).
- **Heads-up for the team:** Story lane: read `perksFor(save, 'career')` from `lib/phones.ts` ({ extras, photos, burner, phone }); it returns `NO_PERKS` for the Daily, rooms, Live (pass `ranked: false` for a Live practice) and the Market. Lens lane: mount `<PhonesShelf/>` (ui/widgets.tsx) in Lens › Phones, use `carries(s)` for "Carries: …", `LookThumb`/`tryLook` for previews of the four new kinds (`KINDS_SHELL` in lib/kinds.ts; `KINDS4` is unchanged). Market lane: `setWatchSource(() => ids)` in lib/widgets.ts feeds the Market watch widget (it shows your open calls until then). Part upgrade prices live in `lib/phones.ts PART_PRICES` (Screen uses `PRICES.look`); move them into `lib/economy.ts PRICES` at integration if the economy owner prefers. `AppIcon` takes optional `pack/tile/ink` and otherwise draws the equipped pack.

## 2026-10-01 · mmoustafaeditor · Tier One 4.0 merge A: rules, economy and shell wired together (lane8/t1-hybrid)
- **What changed:** The three phase-A foundations now talk to each other. `lib/economy.ts levelUnlocks` is `{ market: 2, live: 3, groups: 4 }` (CONCEPT4 §9: the Market tile is never locked, watching is free, calls open at Level 2; `wire` is accepted as an alias of `market` by `unlockLevelOf` / `isUnlocked` because it is still the Market's id in routes and `Mode4`). `ui/phone.tsx` reads the registry for every gate: `unlockLevel` / `isUnlocked` (tile gates, Live and Groups) and the new `callLevel` / `canCall` (the gate inside an open app; `AppDef.calls`). The Market's call sheet shows "Reach Level 2" with the level bar in place of the YES / NO buttons until then, and its star coins now land through `credit()` (the Gold +10%, the ledger line) via `onWireRight(coins, rid)`. `lib/meta.ts onDriverDone(outcome, driver)` is the one settle for a `Driver4` window (pass it as `makeDriver({ onDone })`): it routes to `onDailyDone` / `onRoomDone` / `onCareerDone` / `onDeadlineDone` / `onPracticeDone` by mode (tutorial and challenge play by Practice's book) and returns the `Gain`. A `Gain` now carries `offers` (the sponsor offers that landed with it) and every Gain fires `onGain()` listeners; App puts a new offer ("Volt wants to talk · Saw your first call. Want to make some money?"), a brand walking and "Market calls are open" at Level 2 into the phone's tray through `ui/juice.tsx notify()`. `npx tsc --noEmit`, `scripts/economy4-test.mjs` (9 checks) and `npm run build:web` pass.
- **Files:** `games/tier-one/v3/web/src/lib/economy.ts`, `src/lib/meta.ts`, `src/ui/phone.tsx`, `src/screens/Wire.tsx`, `src/App.tsx`, `src/styles/screens.css`, `src/i18n/parts/mergeA4.ts` (new), `scripts/economy4-test.mjs`, `games/tier-one/v3/docs/DESIGN_SYSTEM.md`, `games/tier-one/v3/HANDOFF4.md`, `UPDATES.md`
- **Heads-up for the team:** Phase B lanes: build on `makeDriver({ mode, onDone: onDriverDone })`; read gates from `ui/phone.tsx` (`isUnlocked` for a tile, `canCall` for an action inside an app), never a local number; put tray events through `notify()` and account events through `onGain()`. Still rough: `App.tsx` builds the v3 driver for the `daily` / `room` / `play` routes (a Practice window started from the new screen opens only once the play lane switches `WindowScreen` to `Driver4`); the Market screen is the 3.x Wire (old words, the hero copy overlaps the cards at 390px); the morning-papers pinboard scene (`lib/scenes.ts`) still plays on Home and goes with the film sweep; `lib/driver3.ts` leaves with the last v3 screen.
## 2026-10-01 · saifsaber · The Gaffer pitch, phase 3 (first part): the ball carrier, and measurements for attacking off the ball
- **What changed:** The live 2D pitch only (engine untouched).
  - **The ball carrier.** He carries it towards where the engine has the play: a short step at a slower pace when a man is on him (shielding it), and a long step at a faster pace into space. On 10 seeded matches, his speed against the room around him went from r = −0.04 (no link) to r = 0.55. This needed a fix: a boost under 1 is now allowed, so a player can be slowed (before, every boost was raised to at least 1).
  - **Full-backs.** They read up to 3 beats ahead and start their run when the ball is about to go out wide in the last third. Inverted full-backs underlap into the half-space.
  - **New pitch-test measurements** (`ui-tests/pitch-metrics.mjs`, used by the Node and browser tests):
    - **Offside:** no one waits offside while the carrier has the ball. 1%, limit 5%.
    - **Support:** the carrier has two men in open lanes. 90%, limit 70%.
    - **Carrying:** the carrier's pace follows the space around him. r = 0.55, limit 0.2.
    - **Overlap:** a full-back next to a wide carrier in the last third. Reported only, at 0–5%. The ball reaches the wing in one pass, faster than a full-back can get there from his line. Pushing the full-backs up all the time was tried: it broke the back line on the turnover (spread 4.9 m, reaction 79%), so it is off (`FB_PUSH` 0). This needs the director (phase 4).
  - Everything else holds on the 10 seeded matches: marking 94%, keeper 0.5 m, reaction 95 of 118.
- **Files:** `games/the-gaffer/web/src/ui2/pitch/{sim,move,tuning}.ts`, `ui-tests/pitch-metrics.mjs`
- **Heads-up for the team:** The back-line spread (4.2 m) and box blocking (28%) are still the phase-4 items. Tier One is untouched.

## 2026-10-01 · saifsaber · The Gaffer: AI managers pick a marking style; an injured man with no sub left is shown going down
- **What changed:**
  - **AI marking.** AI managers now choose a marking style by philosophy:
    - possession, counter and bus hold zones;
    - gegenpress goes man to man;
    - balanced, wings and direct stay mixed.

    At set pieces they mark man to man when their centre-backs and strikers are clearly stronger in the air than the opponent's, and hold zones when the opponent's are.
  - **Injury with no sub left.** When a player is hurt and no substitutes are left, the pitch now shows him going down under the medic's cross before he's helped off. Before, he vanished. The pitch remembers who stood in each slot at the start of the minute, so the injured man's slot is found the same way whether or not a sub came on.
- **Files:** `games/the-gaffer/web/src/sim/tactics.ts` (`aiTactics`), `src/ui2/pitch/sim.ts` (`ids`, `downIn`), `src/ui2/Pitch2D.tsx`
- **Heads-up for the team:** AI sides' results shift slightly with their marking style; every style stays within about 1% expected points of mixed. Tier One is untouched.

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
## 2026-10-01 · mmoustafaeditor · Tier One 4.0 "Insider": the phone shell (lane22/shell)
- **What changed:** The game is now a phone (CONCEPT4.md §2, §6). Boot shows a lock screen with the time, the date and a tray of real events (today's window, results, level-ups, unlocks; other lanes add deals and rivals through `notify()`); tap or swipe up to unlock. The home screen has a wallpaper, one widget (today's window: play, resume or results), your name line (level, Rep, followers and coins rolling) and the app grid: Blurt, DMs, Lens, Story, Live, Market, Groups, Boards, Settings, each a drawn icon with badges; Live and Groups show "Reach Level N" with the level bar until reached. The dock holds your four most-used apps. Apps open with a phone transition, the edge swipe or the arrow goes back, the home bar goes home; Esc and 1–9 work on a keyboard. The status bar's battery drains during a window and recharges at results. At 1024px+ the phone sits on a dark desk with a context panel (today's board, your grid, the tray). Settings is an app (language, sound, motion, phone theme, handle, how to play, restore purchases, about). Every existing screen still mounts under its app for phase B. New juice primitives in `ui/juice.tsx` (Count, Pop, Ticker, Typing, notify/NotifyHost/useTray, Ratio, Stamp, Sheet, useHaptic) and OS tokens in `styles/phone.css`; `docs/DESIGN_SYSTEM.md` rewritten for the phone.
- **Files:** `games/tier-one/v3/web/src/App.tsx`, `src/ui/phone.tsx` (new), `src/ui/juice.tsx` (new), `src/screens/Home.tsx` (home screen), `src/screens/Front.tsx` (lock screen), `src/screens/Settings.tsx`, `src/styles/phone.css` (new), `src/styles/desktop.css`, `src/lib/sfx.ts`, `src/lib/push.ts`, `src/lib/perf.ts`, `src/i18n/parts/shell4.ts` (new), `index.html`, `public/manifest.webmanifest`, `docs/DESIGN_SYSTEM.md`, `UPDATES.md`
- **Heads-up for the team:** Routes are unchanged; `?app=<id>` is the new deep link (`?tab=` still maps; `?app=wire` opens Market). `Chrome` gained `home` and `openApp`; new route `{ n: 'settings' }`. `levelInfo` / `unlockLevel` in `ui/phone.tsx` are a fallback until `lib/economy.ts` lands (the merge swaps them for `levelOf` / `levelUnlocks`). The `TopBar` level pill (`ui/game.tsx`, season level) and the home screen's level (lifetime XP) disagree until the economy lane unifies `levelOf`. The `publish.hwg` sound cue now plays the fanfare (no "here we go" voice).

## 2026-10-01 · mmoustafaeditor · Tier One 4.0 rules lane: one driver for every mode, v4 Daily on the server, Practice with the Coach
- **What changed:** The client's live play now has one driver API on engine4: `lib/driver.ts` `makeDriver({ mode, seed?, rules?, cast?, room?, coach?, code?, resume?, onDone? })` → `Driver4` (`start`, `pub`, `ask`, `post`, `endDay`, `finish`, `isOver`, `result`, `preview`, `askState`, `callState`, `scoopOpen`, `clock`, `log`, `error`, `subscribe`/`version`, `coach?`) for daily, practice, career, deadline, room, challenge and tutorial; local windows live in the save under `v4.live[mode]` (seed + rule spec + action log, replayed on resume) and finish into `v4.last[mode]`; the Daily and room rounds mirror the server's public state and answer the post screen from a shadow (`engine.ts shadow4`). The 3.x driver moved unchanged to `lib/driver3.ts` (legacy, re-exported from driver.ts) so App/Window/Saga/Results still compile until the play lane moves. engine4 gained `V4_FROM`, `TUTORIAL_SEED` (`tutorial-1` = career rank 0, 3 stories), `rulesFor('tutorial')`, `specOf`/`rulesOf` (a rule spec that travels with a saved window or a challenge), `bounds(R)` and the Deadline Day clock (`CLOCK_S` 90). Server: Daily boards from 2026-10-05 and room rounds opening from that day replay the log with engine4 and store `v: 4` (results carry `scoops`; `ex` mirrors it for old readers); bounds come from the rules; par and league points by tier unchanged; a v4 day's cast is sized by `STORIES`; `daily.seed` returns `v`; challenges created with `v: 4` store the rule spec they were played under and the taker replays exactly that; a v4 room feed `filed` event carries `drops`. Practice is v4: random seed, a friend's code, past Dailies from the cutover only, and the Coach (`E4.posterior` as plain odds: "about 7 in 10"). `lib/story.ts` adds the v4 readings (`outWord4`, `backWord4`, `saysWord4`, `dealLine4`, `contactCard4`, `nextMove4`, `postLine4`, `readsText4`). Sim (800 boards) matches RULES4.md §1.
- **Files:** `api/tier-one/v3/_lib/engine4.mjs`, `api/tier-one/v3/index.js`, `games/tier-one/v3/sim/rules4-api.test.mjs` (new), `games/tier-one/v3/web/src/lib/engine.ts`, `src/lib/driver.ts`, `src/lib/driver3.ts` (new, legacy), `src/lib/story.ts`, `src/lib/scenes.ts`, `src/lib/save.ts` (one optional `v4` field), `src/screens/Practice.tsx`, `src/i18n/parts/rules4.ts` (new), `UPDATES.md`
- **Heads-up for the team:** Play lane: build the Blurt/DMs window on `makeDriver`; `App.tsx` still constructs the v3 driver for the `play`/`daily`/`room` routes, so a Practice window started from the new screen (saved under `v4.live.practice`) opens only once that switch is made. Economy lane: hook XP/Rep/followers through `onDone` (local) or the remote result; the fields under `save.v4` are listed in `engine.ts V4Save`. Press box lane: send `v: 4, rules: <Driver4 window rules>` and the log on `challenge.create`, and read `v`/`rules` from `challenge.get`. Dailies before 2026-10-05 stay v3 everywhere (archive only).

## 2026-10-01 · mmoustafaeditor · Tier One 4 "Insider": the economy and Sponsors model (lane22/economy, phase A)
- **What changed:** One source for every progression/economy number, `web/src/lib/economy.ts` (RULES4 §3): XP (Press Points renamed; `save.xp`, `pp` kept in step), Level forever (100 + 30 × (L − 1), coins per level, unlocks Live 3 / Groups 4 / Wire 5), Season track 30 × 400 XP with a free lane (coins + a look every 5) and a Gold lane (350 credits: a look every 3, the Legendary at 30, +10% coins, a second sponsor slot), Rep deltas by backing with the ranks Nobody 0 · Rising 40 · ITK 55 · Insider 70 · Tier One 85 (kept once reached, "under review" 10 under the bar), Followers by backing + Scoop + hot streak + mode factor, the coins earn table and prices (looks common 150 / rare 400 / epic 900, legendary credits or Gold; coffee 30, extra DM 40, tip-off 60, max 2 a window, handle rename 250), Contacts Book trust (`trustFor()` 0–1), 12 Secret files. **Sponsors** (`lib/deals.ts`, CONCEPT4 §4): Local / National / Global tiers paying per right call by loudness (4/8/16 · 8/16/32 · 15/30/60; a Scoop pays double the Drop), clean-finish bonus (60/150/400), warnings and strikes (a wrong Hint is ignored, a wrong Post warns, a wrong Drop strikes; 3/2/1 strikes before the brand walks, Global warned first), standing 0–3 stars (+25% a star; a branded look and a long-term deal at 3), offers in the DMs after results and at week start (the first Local one right after the First window), one active (two with Gold); Daily, Career, Live and Market calls count, Practice never. `lib/meta.ts` `onDailyDone / onPracticeDone / onCareerDone / onRoomDone / onDeadlineDone / onWireFiled / onWireRight` take a v4 `Result4` (or a v3 `Result`) and return a `Gain` `{ xp, level, levelUp, coins, rep, repDelta, followers, followersDelta, rank, rankUp, review, unlocked, sponsor (lines per call), deal, files }`. One shop (`lib/catalog.ts`; the 3.x season coin store folds in), ONE credit-pack table read from `api/tier-one/v4/config/catalog.json` (100/350/800/1,800; Gold 350; coin packs; a one-time starter bundle at Level 3; credit earn amounts), the never-called credit-earning functions wired to their events, every coin grant through `credit()`. Looks taxonomy `KINDS4` = wallpaper, theme (whole-phone), dropcard, frame, ringtone, catchphrase. Save migration v3 → v4 keeps every player's progress. New words in `i18n/parts/economy4.ts` (EN / Egyptian AR / ES). `node scripts/economy4-test.mjs` drives a Daily, a room and the sponsor flows through the real libs.
- **Files:** `games/tier-one/v3/web/src/lib/economy.ts` (new), `lib/deals.ts` (new), `lib/meta.ts`, `lib/byline.ts`, `lib/season.ts`, `lib/catalog.ts`, `lib/kinds.ts`, `lib/wallet.ts`, `lib/save.ts`, `lib/progress.ts`, `lib/awards.ts`, `lib/monet.ts`, `lib/sync.ts`, `src/i18n/parts/economy4.ts` (new), `web/scripts/economy4-test.mjs` (new), `api/tier-one/v4/config/catalog.json`, `api/tier-one/v4/_test/*`, `games/tier-one/v3/DESIGN.md` (§6–7 now point at RULES4 §3); smallest edits outside the lane: `api/_lib/merge.mjs` (xp counters), `lib/desk.ts` (v4 stories skipped by the style tracker), `lib/catchphrase.ts` (custom line from Insider rank), `UPDATES.md`
- **Heads-up for the team:** No screens changed (phase B builds Lens / DMs / results on this model). `REP_TIERS` ids are now `nobody / rising / itk / insider / tierone` (`cn.tier.*` strings added); `levelOf(xp)` is the account level forever (`into`/`need` are XP, `pct` the bar); `ACH` values are the XP a Secret file pays (no coins); `save.pp` mirrors `save.xp` until every screen reads `xp`. The server merge rules gained `xp` / `season.xp` counters (`api/_lib/merge.mjs`). `scripts/economy-test.mjs` was already broken on the base branch (stale i18n/react stubs); the v4 api tests pass (`node --test api/tier-one/v4/_test/{config,wallet,sync}.test.mjs`).

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

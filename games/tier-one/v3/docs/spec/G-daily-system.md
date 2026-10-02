# G · Daily system (Tier One 3.8)

Part 1 is the contract (shared board, action log, week, scoring); part 2 (below the rule) is the core loop as the player sees it.

Living spec, part G (brief §53). The Daily Challenge is the product heartbeat (§3): one board, same answers for everyone, one attempt, scored on the server. The numbers are in D; this part is the contract.

## 1. The shared board

- Seed: `daily-<UTC date>` + server salt; the board (`buildBoard(seed)`) and the cast are built on the server and never sent whole. The client gets `pub(g)`: what the player may see, never truth, spin, the twist day in advance or future rival posts.
- Daily No. 1 = 1 September 2026; the number is the UTC day count. Reset at 00:00 UTC; the hub shows it in local time.
- Same question, same answer: a source's reply depends only on (seed, saga, source, era). Two players who ring the agent on saga 3 on day 1 hear the same line, in any order. That is what makes one seed a fair ranked board, and it is why the board is frozen for its full availability period (Addendum B: a roster refresh never changes a started board).
- One attempt per day; no replays count. Yesterday's board is replayable in Practice with the same seed (off the record).

## 2. The action log is the score

- Every action is one log entry: `['a', saga, source]` ask · `['c', saga, outcome, strength]` call · `['u', saga, outcome, strength]` U-turn · `['e']` end day. Career favours (`['f', …]`) are rejected on a ranked board (`RULES.FAVOURS` unset).
- The server appends an action, replays the whole log through `replay(board, log, RULES)`, and stores the log. The score is `resolve(replay(...))`; a stored total outside `SCORE_MIN … SCORE_MAX` (−450 … 470) is refused. Nothing from the client is trusted: not the answer, not the day, not the clock.
- Public API kept stable in 3.8: `RULES, buildBoard, answer, newGame, ask, call, uturn, endDay, finish, apply, replay, pub, preview, resolve, tierFor, gridRow, posterior, tally, circlesFor, livePosts, askState, callState, canAsk, canCall, canUturn, exclusiveOpen, readRight, srcOf, sourcesFor, weights, lik, nSays, truthAt, eraOf, OUT, SRC, RIVAL_IDS`. New: `RULES.ROLLOVER` (0 on the Daily). `games/tier-one/v3/engine/daily-engine.mjs` re-exports the same file, so client, server and simulator are one rule set.

## 3. The week

| Day | What opens | What the player should be doing |
|---|---|---|
| 1 | Kit man, barber, agent · 4 points | Kit man on three or four sagas; an agent where the stake is high. In talks is already worth filing (p > 0.24). |
| 2 | @BackPageBants' posts land · 4 points | The spin shows itself: the barber and the tabloid agreeing is one voice, not two. |
| 3 | Airport spotter · 4 points | The turning point: the spotter is the best read per point in the game. Confirmed with two circles from here is the exclusive window. |
| 4 | Twist (half the boards) · @ITK_Kev · 4 points | Re-read the twisted saga from scratch; its old reads are shown "before the twist". |
| 5 | Twist (other half) · physio · 4 points | The closer: 92% on the move, nothing on Off vs Fake. One physio a day at most. |
| 6 | @PressBoxPete · 4 points | 61% of sagas already have a correct rival post: Confirmed now is for points, not exclusives. |
| 7 | Deadline Day · 60 s · 3 points · 3 posts | File what's open. Quick Post at 15 s posts the lean at Advanced. |

Points do not carry over (D §2). Each source answers once per saga per era; a twist opens a new era.

## 4. Deadline Day countdown (§9, §50)

Server-held clock: `ddAt` is set when day 7 is first opened; the server refuses actions after `ddAt + 60 s + 4 s grace`. UI thresholds, in seconds left: 60 normal · 30 heartbeat · 15 Quick Post mode · 10 ticking and vibration · 5 timer pulse · 0 whistle and "Time. The window is shut." Animations never block input; Reduce Motion drops the shake and vibration, keeps the numbers. Unresolved sagas must be the first thing on the screen at 60 s.

## 5. Results and sharing (§10)

- Tier from `tierFor(total, exclusives)`: Tier 1 needs 200 and an exclusive; 130 / 70 / 0; below zero Spiked.
- Share text: `Tier One · Daily No. N · Tier 2 · 135 pts`, the five-cell grid (`gridRow`: ★ exclusive, ■ right, □ wrong, · not filed), exclusives count, rank percentile, streak. No outcome is ever in the text or the image.
- Par = the median once three players have filed; with the 3.8 numbers it should sit near 100 (D §5).
- Leaderboard: top 25, server-side; prizes need ≥ 3 players.

## 6. What Practice teaches (§30), from the simulation

The gap between the card-reading player (124) and the expert (217) is explainable in four lines, and Coach mode should say them:
1. Buy reads by what they would change, not by habit: the barber after a "Leaving" read is worth 1 point; after a "Staying" read, 10.
2. Two circles and a lead of four is the Confirmed line; one circle is a hunch however loud it is.
3. The exclusive race is days 2–4. By Deadline Day, 79% of sagas have already been broken correctly by a rival.
4. Always file: In talks on a lean beats silence from p ≈ 0.24, and an uncalled saga is a zero.

Coach mode may show the exact posterior (`posterior(g, i)`); ranked Daily shows only the words in `i18n/parts/math38.ts` (Reliable · Gossip · Direct, but biased · Strong on destination · Very reliable, late) and "N independent sources agree" / "Echo chamber".

## 7. Fairness invariants (§22, §48)

- Nothing bought, earned or levelled changes a Daily answer, point, source accuracy, opening day or score. Contact trust, favours, second opinions and Press Office exist only in rule sets that carry them (Career, Practice); the Daily uses `RULES` as exported.
- The engine accepts no action the rules refuse (`apply` returns false; the server rejects the request).
- A roster or cast refresh never touches a Daily already generated: boards are built from the frozen seed and the cast snapshot of that day.

---

# G (part 2) · Daily system: the core loop (3.8)

Owner brief: LAUNCH_BRIEF §5–§10, §27–§28, §30–§31, §39–§40. This part covers what the player sees and does inside
one window: the board, the Player File, the call, the publish, Deadline Day, the results and what they share. Game
math (D) owns the numbers; nothing here types a number the engine exposes (`RULES`, `E.preview`, `E.resolve`).

## Decisions

| Area | Decision | Why |
|---|---|---|
| Source reliability (§5) | **REWORK.** Ranked play shows one qualitative line per source (`c38.rel.*`): Kit Man "Knows whether, not where" · Barber "Gossip · street chatter" · Agent "Direct but biased" · Spotter "Strong on destination" · Physio "Strong on medicals" · Press Office "Club insider"; rivals likewise. The 1–3 reliability bars and the "Fair source / Rarely wrong" grades are gone from the cards and the call film. Exact odds print only in Practice with Coach on (`view.posterior`), with a footer in ranked modes saying so. | A journalist reads people, not percentages; the old bars were a percentage in disguise. |
| Evidence circles (§6) | **KEEP, REWORK the words.** `evidenceOf(g,i)` → Strong / Split / Weak / No reads, plus the line "N independent sources agree" or "Echo chamber: these reports trace back to the same story" (two or more street voices on the same line). The bars and circle markers stay. Shown on the board card, the Player File and Deadline Day. | The two-source rule is the game's best lesson; it now reads in one glance without a manual. |
| Player File (§27) | **REWORK.** Header = portrait slot + kit, name, position · age · nation, current club → linked club, saga N of M, heat (Quiet / Warm / Hot / On fire from rival posts + twist). Then the evidence summary, then tabs Sources · Clippings · Your Call. Source cards: face, name, cost, opens day, qualitative line, "Called · day d". Sticky bar: Back to Board · Make the Call (becomes Change the call / Filed). | Two-second read: who, where, how sure, what next. |
| Publish sheet (§7) | **KEEP the ladder, REWORK the words.** What happens? → How sure are you? (In talks / Advanced / Confirmed with "Low risk, low reward" … "Highest reward · Exclusive possible"); stake in words: "Right: +32 · Wrong: −15 · Filed on day 2: +10 early bonus"; one Exclusive sentence that always explains (on / needs Confirmed / needs two independent sources, you have 1 / rival got there first / no Exclusive on a repost). Hold to publish stays. | The central decision should never need the "How's this scored?" box. |
| Exclusive moment (§8) | **NEW.** On results: gold EXCLUSIVE stamp, its own diegetic sound (`excl.stamp`: teletype + wire bell, used nowhere else), "You broke it first." with the saga and the follower spike, a share button. Gold is now reserved: Tier 2 lost its confetti; T1 and the Exclusive keep it. | Make the moment unmistakable and keep gold rare. |
| Deadline Day (§9) | **KEEP, POLISH.** Phases on one clock: 60 normal · 30 heartbeat · 15 Quick Post (words and glow change, controls do not) · 10 ticking + haptic · 5 pulse (`dd.pulse`) · 0 whistle. Phase marks on the bar. Fair clock: `ddEndsAt = now + ddLeftMs − min(2 s, RTT/2)` measured per request (`lib/driver.ts`), the server keeps `DD_GRACE_MS` (4 s) and the head says "Clock synced with the newsroom · 4 s grace". Unresolved sagas sort first with a red UNRESOLVED tag and "Still open: N" in the band. Reduced motion: no shake, no pulse, phones still. The burst overlay is pointer-transparent; input is never blocked. | A signature moment must be fair before it is loud. |
| Results (§10) | **REWORK into the viral object.** On-screen result card = share text = clipboard: `TIER ONE #147 · TIER 1 · 186 PTS` / `■■★□·` / `2 Exclusives · Top 8% · 11-day streak` / up to three achievement lines (Perfect five · You broke it first · 3 Exclusives · Beat all three rivals · Survived Deadline Day · First Tier 1 · Longest streak yet · 30/100-day streak · Promoted · Called it on day 2) / link. Spiked reads "SPIKED. The editor would like a word." on the card, the quip and the share. "Copy result" is one tap. Top X% needs ≥ 10 players and rounds up (never Top 0%). | Wordle-shaped, spoiler-free, funny when you lose. |
| Timings (§39–40) | **TRIM.** Call film: full cut (3.5 s) only the first time ever per source, then the 2 s tell; hold after the tell 200 ms; a tap/Enter/Esc skips to the tell. Post film ≤ 2.0 s (hold 800 ms). Day end 1.0 s (was 1.5). Overnight: sky 450 ms, cards 110 ms apart, tap skips. Results reveal ≈ 2.9 s for five sagas (was ≈ 4.2), tap skips. "The paper's out" and the Deadline Day film: full cut once ever, then short and skippable. Audio stays diegetic (phones, paper, teletype, whistle); no jingles added. | Common 150–400 ms, results 500–1200 ms, nothing repeats a wait. |
| Contextual info (§28) | **REWORK.** `TopBar bare` on the window, the file, Deadline Day and the results reveal: no wallet, no bell. Title shows the mode and "Day n of 7". | During play: day, calls, sagas, evidence, rivals, posting status. Nothing else. |
| Onboarding (§31, §45) | **REWORK.** Welcome → name → one skippable scene ("You were fired." editor + you, portrait slots, two lines) → training board (Coach off, so it plays like the Daily) with the coach marks: open a file → ring the Kit Man → ring a different kind of source → read the evidence, Make the Call → what happens → how sure, hold Publish → (phones: back) → "Filed. Now the consequence." with **See the consequence** (fast-forwards the week: rivals, twist, results) or play the week out. Results end on "To the desk"; Home highlights today's Daily. The Career prologue film no longer plays at onboarding; Career Mode keeps it. | Teach in play, consequence inside five minutes, meta systems unseen. |
| Practice (§30) | **REWORK.** OFF THE RECORD lab, one screen: Coach toggle, four tools listed (exact odds, why each source misled you, past Daily replay, board codes), codes, past seven Dailies. After every Practice board the breakdown explains each wrong read: street echo · agent's "Done" means little · agent's Off/Fake is the one to trust · spotter/physio can't tell Off from Fake · kit man knows whether, not where · said before the twist · honest miss. Weekly-event banner removed from Practice (§34: modifiers never applied; its button looped). | Practice teaches why you lost. |
| Deadline Day Live card | **FIX (§35).** The hub card now says "Real deadline days only · one shared board · Next: 2 Feb". DD Live screen fits one viewport: sagas paged 2 at a time, table 5 at a time. | No contradictory copy. |

## Numbers (none new to the engine)

- Deadline Day phases: 30 / `DD_SNAP` (15) / 10 / 5 s; latency correction `min(2000, RTT/2)` ms; grace mirrors the server's 4000 ms.
- Films: call full 105 f, short 60 f, hold 200 ms; post hold 800 ms (repost 700); day end 30 f; overnight 450 + 110·n (≤ 550) ms; results stages 500 / 450 / 260·n / 600 ms; burst 1100 ms.
- Share: ≤ 3 achievement lines; Top X% shown when players ≥ 10.
- Heat: `min(3, rivalPosts + twist)`.

## Exported APIs others rely on

- `lib/story.ts`: `evidenceOf(g,i) → { word, lean, circles, echo, agree, reads, rivals }`, `heatOf(g,i)`, `relKey(src)`, `whyKey(R, read, truth, tw)`.
- `lib/share.ts`: `viralLines(t, ctx)`, `viralText(t, ctx)`, `achievementKeys(ctx)`, `topPct(rank, players)`, `ViralCtx` (rooms can pass `roomWon`, Career passes `promoted`).
- `ui/portrait.tsx`: `<Portrait kind id size club mood name round />`, `portraitPlaceholderSVG`, `artFor`, `loadArtManifest`, `moodFor(src, o)`; `screens/Saga.tsx` `RivalFace`.
- `ui/game.tsx`: `TopBar bare`.
- `lib/driver.ts`: `View.ddGraceMs`, `View.ddRttMs`, `DD_GRACE_MS`.
- `lib/sfx.ts`: `excl.stamp`, `dd.pulse`.
- i18n: `i18n/parts/core38.ts` (`c38.*`, en/ar/es).

## Open / for other lanes

- Home should keep the Daily tile glowing after the training board lands (it does today for an unplayed Daily).
- Rooms can feed `roomWon` into `ViralCtx` for "Won the Press Room"; Career's promotion already rides through `report.promoted`.
- The math lane may retune `BASE / LOSS / EARLY / EXCL / TIERS`; every screen here reads them live.

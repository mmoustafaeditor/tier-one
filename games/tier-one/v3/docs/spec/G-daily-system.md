# G · Daily system (Tier One 3.8)

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

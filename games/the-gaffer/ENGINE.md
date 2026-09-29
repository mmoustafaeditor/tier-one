# The Gaffer — match engine v2

## Layers (`web/src/sim/`)
| Layer | Where | Job |
|---|---|---|
| Decisions | `engine/model.ts` | Two shapes per side (in / out of possession) from formation + instructions → weighted presence in 6×5 zones. Every phase is a contest between the players those shapes put there (top 3 each side, attribute mixes, numerical superiority). Players choose lanes by presence and odds. |
| Resolution | `engine/play.ts` | Walks a possession graph (build-up → progression by lane → final third by lane → cross / cutback / through ball / combination / long shot, counters, high turnovers, fouls → free kicks & penalties, corners, shots) second by second. FULL (user's match) samples the two players in every contest; FAST (all other matches) samples the contest's average odds: same graph, same odds. |
| Rules | `match.ts` | Fouls → cards (booked players tackle more carefully) → send-offs, injuries (fatigue-driven), subs, reshape, time-wasting bookings, shoot-outs. Red cards rebuild the model mid-minute. |
| Projection | `match.ts derive()` | Score, shots, on target, corners, fouls, cards, xG — all counted from `m.events`; possession/territory from the resolver's clock. Ratings (`ratings.ts`) use the same events (shots, duels, blocks, saves). |
| Closed form | `engine/model.ts solve()/rates()` | Absorbing Markov chain over the same graph → exact expected goals/xG/shots per 90. Used by `predict()` (odds, board's expected points), suggestions and scouting's counter plan. |
| Story | `engine/story.ts` | "Why" (verdict from goals vs xG, where the danger came from, midfield, press, decisive one-on-one, finishing/keeping, legs, reds, whether a change worked) and suggestions: every one-step change evaluated by the engine itself, with the win chance it buys. The AI manager uses the same search at half-time against a human. |
| Presentation | `ui/Live.tsx`, `Pitch2D.tsx`, `Momentum.tsx`, `WhyCard.tsx`, `commentary.ts`, `sfx.ts` | Ball follows the engine's zone path; commentary from events (no template reused in a match); momentum; goal flash/slam/sound; HT and FT Why with one-tap changes. Nothing here decides anything. |

Instructions (all map 1:1 to the Tactics screen, each with a one-line effect + price): mentality, pressing, line, width, tempo, passing, full-backs, striker role, pressing trap, corner routine, counter at once, run the clock, man-mark. Philosophies are presets; mastery = cohesion. Tuning lives in `TUNE` (model.ts).

## Numbers (seeded, `web/sim-tests/`: `node sim-tests/build.mjs <name>`)
| | result | target |
|---|---|---|
| Season 2026, all leagues (5,784 league matches, seed 7) | 2.86 goals, home 44.2%, draw 22.3% | 2.6–3.0 / 42–47 / 22–27 |
| 240 direct matches (seeds 7/8/9) | goals 2.67–2.83, home 42–46%, draw 21–25%, shots ~29, on target ~10, xG ≈ goals +0.15, corners ~10, fouls ~22, yellows ~3.3, reds 0.14–0.23, offsides 3.6, pens 0.2 | |
| `predict()` vs simulated home win | 45% vs 45% | |
| Rating gap (home − away, closed form) | 0 → W41 D26; +4 → 58/23; +8 → 73/17; +12 → 89/8 | |
| Tactics, equal eng1 fixtures (closed form) | best − worst philosophy preset 0.27 E[pts] (max 0.41); best preset depends on the fixture | 0.3–0.5 |
| Single instruction, mean effect | all within ±0.1 E[pts] (mentality +2 +0.08, high press +0.08, narrow +0.09, wide −0.08, overlapping FBs −0.08) | bounded |
| Speed | season 10.9 s (old engine 7.0 s); FAST match ≈1.2 ms; model build 0.08 ms; closed form 0.4 ms | |
Owner asked for no large suites: these are single quick runs, not 10k-match studies. FAST≡FULL by construction (same graph/odds); not separately measured.

## Aftermath links (match → other systems)
Existing, now fed by v2 events: fitness (`m.fit`), morale ±6 by result, bans from cards, injuries, league/cup tables, Elo, board & fans vs the engine's own kick-off odds, records, mastery, player stats, ratings/MOTM.
Added: fatigue now depends on pressing, tempo, running roles and chasing the ball; injury risk rises with fatigue and a high press; ratings include duels, blocks, key passes; the FT card carries the assistant's verdict; scouting's counter plan (and the delegated tactics job) is the engine's best preset against that opponent, not a fixed rock-paper-scissors table.

## Save
`SAVE_VERSION` 3: step 2→3 writes the new instructions at their middle setting and carries a match half-played by v1 on under v2 (`ensureV2`: old stats kept as a base, new events add to it). Tested in `sim-tests/oldsave.ts`.

## Known gaps
- Narrow width is slightly favoured on average and overlapping full-backs slightly penalised; wings is the weakest preset without quick wide players.
- Season sim is ~55% slower than v1 (model rebuilds). FAST builds one model per half plus changes; could cache per line-up.
- No stoppage time; offsides only from through balls / long balls; no in-match formation licence check beyond the chips.

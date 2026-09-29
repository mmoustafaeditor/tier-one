# Tier One v3 — Design Spec

Status: design for build · Owner: mmoustafaeditor · Replaces v2 "Plot Twists" (web 2.4.0)
Rules-as-code: `games/tier-one/v3/engine/daily-engine.mjs` (+ `rng.mjs`). Where this document and the engine disagree, the engine is wrong and gets fixed.

> **How the numbers were set.** The owner asked for no simulation suites this round. Every constant below was set by hand: the reasoning and worked arithmetic are shown next to it. The v2 audit numbers (Playwright-driven real engine, 2,000 windows per policy) are the "before" column. An early prototype of a 3-outcome variant (400–600 windows) was run before the no-sim decision and is cited only as a sanity check. §3.10 lists the few numbers that live telemetry has to confirm, the knob for each, and when it gets tuned.

---

## 1. Pillars

1. **Be right, be first, be credible.** Every decision trades certainty against speed against volume. No mode rewards only one of the three.
2. **Evidence you can reason about.** Each source has one clear rule printed on its card. The skill is combining sources, spotting echo chambers and timing the post. It is not reverse-engineering hidden tables.
3. **One world.** The Daily, the Wire, Career, rooms, leagues and the wallet feed each other (see the connection map, §10). Anything that feeds nothing is cut (§12).
4. **Fair where it's ranked.** Daily, Friends rooms and Wire leagues are identical for every player. Money, Career progress and ads never touch them.
5. **Five minutes, every day.** The Daily is ~5 minutes. The Wire is 60 seconds a day with a payoff that arrives over weeks.

## 2. What v2 got wrong (audit evidence) and the v3 answer

| v2 problem (audit ref) | Evidence | v3 answer |
|---|---|---|
| Tier 1 only reachable by near-optimal Bayesian inference | Skilled Bayes bot 30% T1. Every human-style heuristic 0–2% (t1-sim §3, §11) | Source cards with integer "tally" weights a human can add up (§3.4). Tier bars set from the *engaged-player* distribution (§3.9) |
| Hunches are a trap (0.55 read that locks the source) | Skilled with hunches 258 vs without 303 (t1-sim §7b) | Hunches cut. A source is simply closed until the story reaches it (the spotter can't see jets before there are jets) |
| Hidden 1–3 twists are pure variance for normal players | Aggressive 121→64 from 1 to 3 twists. Cautious gets 16 pts per twisted player vs 32 untwisted (t1-sim §5) | Exactly one announced twist. It wipes that saga's slate for free and restarts its race (§3.3) |
| Exclusive race is a coin flip vs the Tabloid | Tabloid right-first on 0.56 players/window, on days 2–3, before any evidence exists (t1-sim §6) | Exclusives need Confirmed **and** two independent circles of evidence (the "two-source rule", §3.6) |
| Independent lies make "3 agreeing sources" always strong | Lies were drawn per source (systems §1.4) | Correlated misinformation: each story has one planted spin that the street circle repeats (§3.2) |
| Hidden rules: free post-twist update still halved; Go louder re-dates the call | systems §5 items 8–9 | One U-turn rule and no Go louder. Every rule is printed and matches the engine |
| Career gear mostly worthless; boosts doubled into a pure cash sink | radar/laptop/mic/tick/bank ≈ 0 pts; 1 burner/day = $28,350 with doubling (t1-sim §8b–c) | Gear and cash cut. Sources get better by being used (Trust, §6.3). Favours at flat prices (§6.6) |
| Rooms "stay level" but tier bars were per-member | systems §5 item 13 | Friends rooms use Daily rules exactly (§5) |
| Leaderboard trusts client scores; purchase grant trusts the redirect | systems §3 | Daily scored server-side from the action log (§3.11). Purchases verified server-side before any grant (§7.6) |
| Values disagree across README, landing page, tutorial and code | systems §1.7 table | One rule set: `engine/daily-engine.mjs`. Every screen number is computed from it (§13 rule 1) |

What v2 got right and v3 keeps: the 7-day window, 5 sagas, the composer (the best screen in the game, ux §8), the Deadline Day clock, the Overnight sheet, the results explanation ("you called / what happened / points"), source personalities, and the honest offline states.

---

## 3. The core: a transfer window (Daily rules)

The Daily, Practice and Friends rooms all run this ruleset unchanged. Career runs it with rank modifiers (§6). All constants are `RULES` in the engine.

### 3.1 Outcomes and base rates

Each saga is one real player (from current real squads, via the data service) linked with one real club. Exactly one of four outcomes is true:

| Outcome | Meaning | Base rate | Why this rate |
|---|---|---|---|
| **Done** | Signs for the linked club | 35% | The most common single result, but under half. "Always Done" must lose (worked below) |
| **Hijack** | Leaves, but for another club | 20% | Rare enough to feel like a scoop, common enough to hunt |
| **Off** | The talks were real and collapsed | 25% | |
| **Fake** | There were never real talks (a kite) | 20% | Needed for the agent's identity (only he knows if talks were real) and for the spin |

Blind "Done, Confirmed" EV per saga = 0.35×(40+24) − 0.65×60 = −16.6. v3 forbids blind calls anyway ("no sources, no story", §3.5).

### 3.2 Correlated misinformation: the spin

Each saga carries one hidden **spin**: the wrong story that's being planted. The spin depends on the truth (`RULES.SPIN`). A Fake is spun as Done 70% of the time, a Hijack as Done 70% ("the original club's camp still says it's on"), an Off as Done 60%, and a Done is spun as Hijack or Off.

**Street** voices (Barber, Tabloid, ITK) are right with their reliability. When they're wrong they **repeat the spin**, so they are wrong *together*. Every other source makes its own errors. The UI groups evidence into five **circles**: Club (Kitman, Physio), Agent, Travel (Spotter), Street (Barber, Tabloid, ITK) and Insider.

*Worked example: the echo trap.* The Barber and the Tabloid both say **Done**. Both right: 0.35 × 0.45 × 0.35 = 0.055. Truth Fake with spin Done, both wrong together: 0.20 × 0.70 × 0.55 × 0.65 = 0.050. Hijack/Off spun as Done: 0.050 + 0.054. **P(Done) = 26%**, *lower than the 35% prior*. Two agreeing street voices are almost worthless on Done. The street card says so in words: "Street voices repeat each other. Count the street once."

### 3.3 Twists: what a changing story looks like

- **Exactly one twist per window**, on a real story (never a Fake). It lands at dawn on **day 4 or day 5** (50/50). A banner names the player: "🚨 TWIST — the Rashford saga has turned". The new outcome is not shown.
- New truth (`TW_M`, printed in How to play): a Done becomes a Hijack or an Off (50/50). A Hijack becomes a Done or an Off (50/50). An Off is revived as a Done (60%) or a Hijack (40%).
- **What sources know.** Before the twist every source reported the story *as it was*, so they weren't lying. Those reads are marked **Before the twist** and stop counting. The saga gets a fresh spin, and its sources can be asked again.
- **Slate wiped, free.** Any call or U-turn penalty on that saga disappears. The exclusive race restarts: only rival posts after the twist count.
- Why one, and why announced: v2's hidden 1–3 count cut 57 points off Aggressive between 1 and 3 twists and nothing off the Skilled bot (audit §5). That's variance that punishes the players the game courts. One announced twist is a readable plot beat and a comeback chance: the twisted saga is worth up to 72 points to anyone who re-investigates fast. What you believed before still helps, because the twist table is public. If you had a Done, it's now Hijack-or-Off 50/50.
- Edge case: all five Fake (0.2⁵ = 0.03% of boards) → no twist. Day 5's banner says "No twist this window".

### 3.4 Sources: who knows what, when, at what cost

Contacts: **4 points a day on days 1–6, 3 on Deadline Day**. Unused points are lost at End day ("the phone stops ringing"). Each source can be asked **once per saga per era** (again after a twist). Every answer is fixed by `(seed, saga, source, era)`, so the same question gets the same answer for everyone, whatever order they ask in. That's what makes one seed a fair board.

| Source | Cost | Opens | Knows | Error style | Card rule (in words) | Card tally |
|---|---|---|---|---|---|---|
| **Kitman** | 1 | day 1 | Is he packing? LEAVING/STAYING | own, 80% right | "Cheap and honest, but he only knows *if*, never *where*" | LEAVING: +1 Done, +1 Hijack · STAYING: +1 Off, +1 Fake |
| **Barber** | 1 | day 1 | Full outcome | street, 45% right, else the spin | "Hears everything the street hears, including the lies" | +1 to what he says (street) |
| **Agent** | 2 | day 1 | Full outcome, incl. whether talks were real | own, sells a move: Done 85% when Done; says Done 35% when Hijack/Off, 60% when Fake | "His *Done* means little. Anything else from him is gold" | Done +1 · Hijack/Off/Fake +3 |
| **Airport spotter** | 2 | day 3 | Which city the jet goes to. LINKED/OTHER/NOTHING | own, 85% right on moves, 76% "nothing" on non-moves | "No jets before day 3. When he sees one, believe it" | LINKED +3 Done · OTHER +3 Hijack · NOTHING +1 Off, +1 Fake |
| **Physio** | 3 | day 5 | Medical booked, and where | own, 92% | "Near certain, but only once medicals start (day 5). Can't tell Off from Fake" | LINKED +5 Done · OTHER +5 Hijack · NO MEDICAL +2 Off, +2 Fake |

Each source has one job:
- **Kitman**: day-1 triage (moving or not) for 1 point. P(moving | LEAVING) = 0.44/0.53 = **83%**.
- **Agent**: the only source that splits **Off from Fake**. His Hijack/Off/Fake calls are 73%/74%/56% posteriors, but his Done is 52%.
- **Barber**: the only 1-point full answer. It's a trap if you stack him with other street voices.
- **Spotter**: splits Done from Hijack from day 3. LINKED → 81% Done. NOTHING → 90% not moving.
- **Physio**: the late hammer. LINKED → 93% Done, but by day 5 the early bonus and most exclusives are gone.

Budget: full coverage of one saga (Kitman + Barber + Agent + Spotter + Physio) costs 9 points. The window gives 27. Asking everything about everyone would cost 45, so every ask has an opportunity cost.

**The evidence panel** shows every read grouped by circle with its card tally ("Agent: OFF → +3 Off"), a running tally bar per outcome, and a **two-source check** per outcome. It never shows the exact probability. That stays the player's judgement (Practice's Coach mode shows it, §5).

### 3.5 Rivals

Rival posts go up overnight and appear on the Overnight sheet.

| Rival | Posts on | How often | Right | Wrong looks like | Tally |
|---|---|---|---|---|---|
| **@BackPageBants** (Tabloid) | day 1–2 | 60% of sagas | 35% | the spin (street) | street +1 |
| **@TransferITK_** (ITK) | day 2–4 | 70% | 55% | the spin (street) | street +2 |
| **@PressBoxPete** (Insider) | day 5–6 | 85% | 75% | random | +3 |

A rival post counts as evidence: it adds to the tally and to the two-source check, and it gates exclusives. It does **not** satisfy "no sources, no story" on its own. You must cite at least one read of your own.

### 3.6 Calls, strengths and scoring

Strengths: **Talks · Advanced · Confirmed** (the internal "Sure" is gone, one name everywhere).

| | Right: base | + per day left (7 − day) | + Exclusive | Wrong | U-turn penalty (on the withdrawn call) |
|---|---|---|---|---|---|
| **Talks** | 10 | 1 | — | −5 | 3 |
| **Advanced** | 20 | 2 | — | −15 | 8 |
| **Confirmed** | 40 | 4 | +20 | −60 | 30 |

- **Exclusive (+20):** the call is right *and* Confirmed *and* posted no later than the day of the first *correct* rival post (rivals post overnight, so posting on their day beats them) *and* passes the **two-source rule**. At posting time, at least two different circles must point to your outcome (by the card tallies). The composer shows it as ✓✓. The rule is copied from real journalism, and it kills the v2 coin flip: a lone day-1 gamble can be right but can never be a scoop.
- **No sources, no story:** you can't call a saga without at least one read of your own in the current era.
- **Uncalled:** 0. Staying silent is legal and sometimes correct.
- **U-turn:** once per saga, any day. The old call is withdrawn and costs its penalty (about half its loss). The new call scores normally from its own day and can never be exclusive. A twist voids U-turn penalties too.
- **Deadline Day (day 7):** 60-second real clock, 3 contacts, at most **3 posts**. The last 15 seconds open the one-tap snap composer (posts at Advanced). Uncalled sagas score 0.
- **Superstar points multiplier: cut** (see §12). Star power affects Career followers only.

**When should you post loud?** At break-even (no bonuses): Talks 33%, Advanced 43%, Confirmed 60%. On day 2 without an exclusive, Advanced beats Talks above **40%** and Confirmed beats Advanced above **60%**. With the +20 exclusive in reach, Confirmed beats Advanced above **47%**. Printed rule of thumb: *"Confirmed when you'd bet 3-to-2. Advanced when it's more likely than not. Talks when you just have a lean."*

**Worked examples**
1. Day 2: Kitman LEAVING, Agent HIJACK. Circles pointing at Hijack: Club (LEAVING feeds Hijack) + Agent → ✓✓. Confirmed Hijack; no rival has posted a correct Hijack. If right: 40 + 4×5 + 20 = **80**. If wrong: **−60**.
2. Day 1: Talks Done on one Barber read. Day 3: Agent says OFF, Spotter NOTHING. U-turn to Off at Advanced: penalty 3, then 20 + 2×4 = 28 if right → **25** net. If you had kept Talks Done and it was Off: **−5**.
3. Twist on day 4 wipes a day-2 Confirmed Done (which would have been wrong, −60 avoided). On day 4 you ask Agent + Spotter, see OTHER + HIJACK, and post Confirmed Hijack: 40 + 12 + 20 = **72**.
4. Ceiling: four sagas Confirmed on day 1 with exclusives (84 each) + the twisted saga on day 4 (72) = **408**. Floor: five wrong Confirmed after five U-turns = −450. The server rejects any submission outside [−450, 408].

### 3.7 Why no single routine solves it

- The spin makes source *combinations* matter. "Count agreeing reads" loses to street echoes (§3.2). "Only trust elite sources" means posting on day 5+ and forfeiting exclusives and the early bonus.
- The two-source rule and the rival timings make the exclusive a daily judgement: go now with two circles, or wait for the spotter on day 3 and risk the ITK.
- The twist is announced but not predictable in advance, so a 1-in-4 chance of voiding hangs over each real saga's early call.
- Deadline Day's 3-post cap forces ranking your leftovers.

### 3.8 Expected strategy results: before (v2 measured) → after (v3 estimate)

v2 = audit, Daily, bar 370. v3 = hand estimate (arithmetic shown where it drives the tier). T-shares use the v3 bars below.

| Strategy | v2 mean / T1 | v3 est. mean | v3 est. T1 / T2+ | How v3 changes it |
|---|---|---|---|---|
| Random | −13 / 0% | −25 | 0% / ~1% | 4 outcomes, −60 Confirmed. ~60% Spiked |
| Cautious (Talks on first read, U-turn if outvoted) | 128 / 0% | ~45 | 0% / 0% | Talks-only ceiling = 5 × (10 + 6) = **80**, so T3 at best. Printed: "Talks keeps you safe, not Tier One" |
| Investigative (source-card tally, posts on margin) | 175 / 0% | ~120 | ~10% / ~35% | Now defines the engaged distribution the bars come from |
| Aggressive early (one cheap read, Confirmed day 1) | 94 / 3% | ~10 | **0%** / ~19% | ~50% accurate. No exclusives (fails two-source), so capped at T2: 4 right + 1 wrong = 4×64 − 60 = 196. ~50% Spiked |
| Late conservative (all Advanced on day 6) | 142 / 0% | ~80 | 0% / 0% | ~85% right at 22 / −15 → 5 × (0.85×22 − 0.15×15) ≈ 82. No exclusives → T3 |
| Highly skilled (exact inference, EV staking) | 300 / 30% | ~230 | ~70% / ~95% | Needs the posterior + value of information. Human experts approach it |
| Exploit: blind calls | 66 / 0% | — | — | Not allowed ("no sources, no story") |
| Exploit: copy the Insider on day 5–6 (one cheap read each) | 50 / 0% | ~80 | 0% / ~25% | 75% × 45 − 25% × 60 ≈ 19 per saga, no exclusives, so capped at T2. **The main thing telemetry has to watch** (§3.10) |
| Exploit: echo chamber (Barber + street rivals, Confirmed on 2 agreeing) | — | ~−40 | 0% | §3.2: agreeing street voices on Done are 26% |

Sanity check: the pre-freeze 3-outcome prototype had exact-Bayes 250, best tally player 150, engaged population ≈ 100, casual 72, random −24, copy-Insider 64. v3 adds a fourth outcome and correlated errors, so every informed row sits 10–20% lower.

### 3.9 Tiers and Tier 1 rarity

| Tier | Needs | Target share for engaged players |
|---|---|---|
| **Tier 1** | ≥ **180** points **and** ≥ 1 exclusive | **10%** |
| Tier 2 | ≥ 120 | 25% |
| Tier 3 | ≥ 70 | 35% |
| Tier 4 | ≥ 0 | 30% |
| Spiked | < 0 | (engaged players rarely) |

Why 10%. T1 is the name of the game, so it has to feel earned, and a weekly-league Daily player should hit it about once a week (1 − 0.9⁷ = **52%** of engaged players get at least one T1 in a week). 20% (the old target) makes it a Tuesday. 5% makes it a lottery. Why the exclusive gate: it makes T1 mean "broke a story", and it takes gamblers out of T1 entirely. Four lucky coin flips reach 196 points but no exclusive.

"Engaged" = a player with ≥ 5 Dailies in the last 14 days. Bars are **fixed for a whole season** and printed. At each season start they're reset to the previous season's engaged-player p90/p65/p30, rounded to 5 and moved at most ±15. Results show "Today's par" (the engaged median for this board), so a hard day reads as hard, not as failure.

### 3.10 Telemetry gates (replace the sim, set knobs, never change rules mid-season)

| Watch | Healthy | Knob (only at season start) |
|---|---|---|
| Engaged T1 share | 8–12% | `TIERS` |
| Exclusives per engaged window | 0.5–1.0; ≥1 in 40–60% | `EXCL`, rival `days`/`p` |
| Share of Confirmed calls on day 1–2 that are right | ≥ 65% | Confirmed `LOSS` |
| Spend share by source (engaged) | every source 10–35% | cost / `from` |
| Twisted-saga pts vs others (engaged) | within ±20% | `TWIST_DAY` |
| Copy-the-Insider players reaching T2+ | < 15% | Insider `rel` 0.75 → 0.70, `days` [5,6] → [6,6] |

### 3.11 Reproducibility, hidden truth, fairness

- **Seeds:** Daily = `daily-<UTC date>` + a server secret salt (published the day after, so anyone can replay and audit). Practice = random, shown and shareable. Room round = `room-<code>-r<n>`. All RNG is `mulberry32(fnv1a(seed))` (`rng.mjs`); every answer has its own sub-seed (§3.4).
- **Hidden truth is server-side for ranked play.** `daily.start` returns the public board (players, clubs, rival schedule shape). `daily.ask` returns one answer. `daily.call / daily.uturn / daily.end` append to the action log. The server re-runs the engine on the log and stores the score. The client never holds the truth, so the leaderboard can't be curled (audit §3). The Daily needs a connection; offline, Home offers Practice.
- Practice and Career run the engine locally (nothing ranked depends on them).
- The Daily rolls over at **00:00 UTC** for everyone. The Home clock shows local time. One attempt; `DAILY_REPLAY` is deleted.

---

## 4. The Wire (long-horizon, real rumours)

The Wire is a second game on real-world rumours, with a season-long payoff. It never replaces the Daily. It sits beside it on Home ("Today: Daily · Wire: 3 new rumours, 1 resolved overnight").

### 4.1 What you file

A **Call** on one rumour, filed from its card:

| Part | Options | Required |
|---|---|---|
| **Happens?** | YES (he moves before this window shuts; loans count) / NO | yes |
| **Where** (YES only) | one of the linked clubs, or "Another club" | optional |
| **Fee band** (YES only) | ≤ €20m · €20–50m · €50–80m · €80m+ · free/loan | optional |
| **Strength** | Talks (1) · Advanced (2) · Confirmed (3) = stake *s* | yes |

Limits (same for everyone): **5 new calls a day**, **40 open calls** at once. One call per rumour.

### 4.2 Scoring: a market rule you can explain in a sentence

Every rumour has a **Market** number *m*: the chance it happens. *m* = 50% data service `p_market` (outlets, tiers, status, calibrated) + 50% Wire crowd (Cred-weighted, only players with ≥ 20 resolved calls), clamped 5–95%. For your side, *c* = *m* (YES) or 1 − *m* (NO), frozen at lock.

- **Right:** `+ s × (10 × (1 − c) + 2) × L`
- **Wrong:** `− s × 10 × c`
- **Where** bonus (right YES, right club): `+ s × 8 × (1 − c_club)`. Wrong club on a right YES: 0.
- **Fee** bonus (right YES, right band): `+ 2s`. Wrong band: 0.
- **Lead** L = 1 + 0.25 × min(1, days from lock to resolution ÷ 28). Up to ×1.25 for calls made a month ahead.

In plain English: *you're buying the story at the Market price. Back it when the Market's cheap and you're right, and you win big. Follow a 90% Market and you win little.* Expected value is `10s × (p − c) + 2s × p`. Following a well-calibrated crowd earns only the small +2s participation term. Real points come from knowing better than the Market, and earlier is when the Market is most wrong. So the **early-call** and **contrarian** bonuses aren't bolted on; they come out of the formula.

*Worked:* Market 30% on "Osimhen → Galatasaray". You file YES Confirmed (s = 3), 40 days out. It happens: 3 × (10 × 0.70 + 2) × 1.25 = **33.8**, plus the club (crowd had Galatasaray at 40% among YES callers): 3 × 8 × 0.60 = **14.4**. Total **48**. If it doesn't happen: −3 × 10 × 0.30 = **−9**. Following the crowd with NO Confirmed at c = 0.70 pays 3 × (3 + 2) × 1.25 = 18.8 if right and costs −21 if wrong.

### 4.3 Locks and anti-gaming

- **Locked at filing.** One **Correction** within 15 minutes, only if the rumour's status hasn't changed. No edits after that, ever.
- **News freeze:** when the feed moves a rumour to `agreed`, `medical`, `confirmed`, `collapsed` (tier-1 outlet) or `extended`, the rumour closes to new calls.
- **Late-wire rule:** calls filed in the **6 hours before** the first outlet timestamp of that status change (`status_history[].first_reported_at`, not our ingest time) are scored with *c* = max(*c*, 0.90), so they can barely win. This kills latency sniping from people who read social media faster than the feed.
- **Sybil resistance:** the crowd half of the Market counts only accounts with ≥ 20 resolved calls, weighted by season Cred (capped). Heat points (§4.4) come from `p_market` only, never from the crowd.
- **Daily cap and open cap** stop volume farming of 95% Markets (each such call is worth ≈ +1.9 × s).

### 4.4 Making open calls feel alive before they resolve

- **Heat line** on each open call: Market at your lock → Market now, with a sparkline. It shows **paper Cred** (what you'd win if it resolved now, in grey, never counted).
- **Heat points (counted in leagues):** the first time the data-service `p_market` moves **15 points toward your side** after your lock, +1 × *s* league point. Once per call.
- **Split rooms:** "You and 62% of Correspondents said YES". Rivals' positions on the same rumour: "@kaz_ITK went the other way".
- **Overnight digest:** "2 of your calls moved, 1 resolved, 1 rumour you follow went quiet".

### 4.5 Resolution and rumours that never resolve

| Case | Resolves as | When |
|---|---|---|
| Move confirmed (`confirmed`, incl. loan) | YES; club = destination; fee = reported fee band | on confirmation |
| Contract extension announced | NO | immediately |
| Moves to a club not in the list | YES, club = "Another club" | on confirmation |
| Window shuts, no move | NO | window close + 72 h paperwork grace |
| Feed can't determine (disputed, registration fails) | **Void**: stake returned, 0 points | after 14 days of dispute |
| Rumour first seen outside a window | targets the **next** window | fixed at filing, shown on the card |

A rumour "going quiet" never resolves early: NO calls pay at window close. That's by design. NO is the patient call.

### 4.6 Credibility, leagues, rivals

- **Season Cred** = the sum of Wire points resolved this season. Rank and byline show Cred plus **Hit rate** (stake-weighted, shrunk: (hits + 5) / (n + 10)).
- **Weekly leagues:** divisions of 30, matched by division tier: Stringer → Reporter → Correspondent → Editor → **Tier One**. League score for the week = **Daily tier points** (T1 30 · T2 20 · T3 12 · T4 6 · Spiked 2 · not played 0; all 7 days count, no "best 5", so gambling on variance doesn't pay) + **Wire points resolved that week + Heat points** (floored at 0, capped at 150). Top 6 promote, bottom 6 relegate. Stringer can't drop and Tier One can't rise. Weeks run Monday 00:00 UTC to Sunday 23:59 UTC.
- **Rivals:** three auto-assigned rivals near your Cred each season, plus any friends you add. Head-to-head on shared rumours and Dailies. Rival reactions are real events ("@kaz_ITK filed against you"), never decorative buttons.

---

## 5. Modes and their rule separation

| | Daily | Practice | Friends rooms | Career | The Wire |
|---|---|---|---|---|---|
| Board | same seed for all, real squads | random or a past Daily; scenario packs | shared seed per round | rank-modified, local | real rumours |
| Rules | `RULES` | `RULES` | `RULES` | `RULES` + rank modifiers (§6) | §4 |
| Ranked | yes (global/weekly/league) | no | within the room | no | yes (leagues, Cred) |
| Coach mode (exact odds shown) | no | **yes** (toggle) | no | no | — |
| Extra contacts / Favours / ads | **never** | ad or credits | **never** | yes | **never** |
| Press Pass effect | none on score | full archive, scenario packs | none on score | 3 career slots | none on score |
| Needs connection | yes | no | yes | no | yes |

**Friends rooms:** 2–24 players, a code or invite link. A season is 5/10/20 rounds. Each round is one shared-seed window with Daily rules, playable within 48 h. The standings total room points. A room can also run a **Wire room**: a private league on members' Wire calls. v2's per-room careers are cut (they broke fairness).

---

## 6. Career: local blogger → Tier One

Solo, offline-capable, unranked. One window ≈ 5–6 minutes. Career exists to teach the game's depth, build a personal contact network and pace unlocks over weeks.

### 6.1 Ranks and what changes

| Rank | Promotion needs | Board | Unlocks |
|---|---|---|---|
| **Local Blogger** | start | 3 sagas, lower-division real players, 3 contacts/day. Kitman, Barber, Agent. Tabloid only | — |
| **Regional Reporter** | 8 windows · Rep ≥ 55 | 4 sagas, 4 contacts. + Spotter, + ITK | Club relations |
| **National Correspondent** | 20 windows · Rep ≥ 65 | 5 sagas top-flight = **Daily rules exactly**. + Physio, + Insider | Club Leaks |
| **Chief Correspondent** | 36 windows · Rep ≥ 75 | 5 sagas, 1–2 superstar sagas (followers ×2.5) | Second opinions (Trust L5) |
| **Tier One** | 56 windows · Rep ≥ 85 | 6 sagas, 5 contacts, Deadline Day 45 s | "Here we go" byline, Tier One desk trophy |

Pacing: an engaged player plays 1–2 Career windows a day, so Tier One takes ≈ **5–7 weeks**. Each rank adds exactly the source or rival the Daily already uses. Career is the tutorial for the full Daily, spread over the first two weeks.

### 6.2 Reputation (0–100, start 50)

Per window, `Rep ← Rep + Δ − 0.05 × (Rep − 50)`, where Δ adds up per call: right Talks +0.5, right Advanced +1, right Confirmed +2, exclusive +2, wrong Talks −0.5, wrong Advanced −1.5, wrong Confirmed −4. The decay means Rep settles at **50 + 20Δ**. A player who sustains Δ = +1.75 per window (≈ 80% accuracy, some Confirmed) sits at 85. Rep measures *sustained* quality, not grind; the window count gates the pacing.

### 6.3 Contact network: Trust (reliability grows with use)

Every Career source is a named person with **Trust points**: +1 per ask, and +2 when their read pointed to the final truth and you published a call that matched it. Levels: L1 6 · L2 15 · L3 28 · L4 45 · L5 70.

| Level | Effect |
|---|---|
| each level | 'own' sources: 12% of their remaining error removed (L5 = 60% fewer errors). Barber: +0.05 reliability (0.45 → 0.70) |
| L3 | Early access: Spotter from day 2, Physio from day 4 |
| L5 | **Second opinion**: ask again once per era |

An engaged player asks each source ~4 times a window, so L5 takes ≈ 12–15 windows per source. The upgrades are earned by play, never bought (they replace v2's $9,270 source tree).

### 6.4 Clubs leak to you, or burn you

Each real club has a **Relation** from −5 to +5 with you. A published right call about that club's player (from or to) is +1; an exclusive +2. A wrong Confirmed is −2, a wrong Advanced −1. Relation drifts 1 toward 0 every 10 windows without a story.

- **≥ +3: Club Leak.** A sixth source on that club's sagas: cost 2, 'own', 85% right, knows that club's side. A toast says "Arsenal's press office is returning your calls".
- **≤ −3: Frozen out.** That club's Kitman turns *street* (repeats the spin) until you recover. Badge: "Villa have frozen you out".

### 6.5 Followers

Reach, not score. +100 × (1/2/4 for Talks/Advanced/Confirmed) × star (1 / 1.5 / 2.5) per right call. +500 × star per exclusive. −300 × star per wrong Confirmed. Followers are used by:
- **Star power on the board:** ≥ 10k → one superstar saga per window; ≥ 50k → two.
- **Account milestones pay Semba Credits** (10k: 50 · 50k: 100 · 100k: 200 · 250k: 300). They pay once per *account*, not per slot, so extra slots can't be farmed.
- **Share cards** (byline + follower count).

### 6.6 Favours (the only consumables)

Earned: 1 per exclusive, +1 per Tier 1 window. Stock cap 5. Also sold for **15 Semba Credits** each, at most 3 bought per day. Use at most 2 per window. Flat prices, no doubling.

| Favour | Effect | Payback logic |
|---|---|---|
| **Burner** | +1 contact today | ≈ 0.1 bits per point late in the week. Worth it on Deadline Day |
| **Tip-off** | Tells you whether one saga is **Fake** or real | Splits Off/Fake, the agent's job, a day early |
| **Stakeout** | Spotter available one day early on one saga | Buys the day-2 Done/Hijack split: early bonus +4 and an exclusive chance |

Rewarded ad (Career and Practice only): **+2 contacts**, once per window, max 3 a day. Press Pass holders get it without the ad.

### 6.7 Cut from Career (with reasons in §12)

Cash/$ and pay formula, gear (8 items), XP/levels (replaced by Rank), boosts with doubling, Legend prestige (replaced by a new career slot after Tier One: "Start again at a rival paper"), per-room careers.

---

## 7. Economy and monetization: Semba Credits

### 7.1 Hard rules

1. Nothing bought, earned in Career, or granted by the Pass or ads changes a Daily, Friends room or Wire score, or a league position.
2. No loot boxes, no paid random rewards. Every purchase shows exactly what you get.
3. No energy, no fake timers, no "offer ends in" clocks. Season end dates are real.
4. Every price is shown in credits *and* the credit pack price for reference.

### 7.2 Credit packs (shared wallet with The Gaffer, one Semba ID)

| Price (USD) | Credits | Bonus | ¢ per credit |
|---|---|---|---|
| $0.99 | 100 | — | 0.99 |
| $4.99 | 550 | +10% | 0.91 |
| $9.99 | 1,200 | +20% | 0.83 |
| $19.99 | 2,600 | +30% | 0.77 |

### 7.3 Press Pass: $4.99/month or $39.99/year (33% off)

Includes: **no ads** · season-track **pass lane** · **3 Career slots** (free: 1) · Practice **full Daily archive** (free: last 7 days) · **one scenario pack a month** kept forever · rewarded-ad perks without watching · Wire **personal calibration report** (your own stats only; no crowd data beyond what's free) · a monthly **150 credits** stipend. It never touches ranked scores.

### 7.4 Catalog (all fixed-price, all previewable)

| Item | Type | Price (credits) |
|---|---|---|
| Newsroom theme (e.g. Broadsheet, Tabloid Red, Deadline Neon, Stadium) | cosmetic | 400 |
| Desk trophy (shown on share cards and the profile) | cosmetic | 150–300 |
| Byline style (font/colour/stamp) | cosmetic | 200 |
| Scenario pack (8 hand-authored windows: "Summer 2019 madness", "Deadline Day classics") | Practice content | 250 |
| Extra Career slot (permanent) | convenience | 400 |
| Favour | Career consumable | 15 (max 3 bought per day) |
| Practice contact top-up (+2) | Practice convenience | 10 |
| The Gaffer items (Supporter looks) | cross-game | per Gaffer catalog |

### 7.5 Earn rates (free player, no spend)

| Source | Credits |
|---|---|
| Daily played | 5 (+5 on a Tier 1) |
| Weekly league | promote 30 · stay 15 · relegate 5 |
| 7-day streak | 20 |
| Season track, free lane | 20 at every 4th tier (10 × 20 = 200/season) + 4 cosmetics |
| Achievements (30, one-off) | 10–50 each, ≈ 650 total, ≈ 250 in the first month |
| Follower milestones | 50–300 (account-wide) |

**Sinks** by player type: free players spend on cosmetics and Favours. Spenders spend on themes, slots and scenario packs. Credits never expire.

### 7.6 Season track

Four seasons a year, aligned to the football calendar: **Summer Window** (Jun–Aug), **Autumn** (Sep–Nov), **Winter Window** (Dec–Feb), **Spring** (Mar–May). Each has **40 tiers × 100 Press Points (PP)**.

PP per day for an engaged player: Daily 20 (+15 T1 / +10 T2 / +5 T3), Wire 5 per call filed (max 25) + 10 per right resolution, streak day +5, league result 50–100 per week, achievements 25–100. Engaged ≈ **60 PP/day**, so the track finishes around **week 10 of 13**. A 4-days-a-week player reaches ≈ tier 15.

Free lane: credits every 4th tier, cosmetics at 10/20/30/40. Pass lane: a reward on every tier (8 cosmetics, 6 × 30 credits, 6 Favour bundles, 1 scenario pack, the season's desk trophy).

Payments are verified server-side (`api/verify-purchase.js` pattern from The Gaffer's `monet.ts`: Stripe session → server check → grant once per session). No grant from a redirect parameter.

### 7.7 A 30-day player economy (hand-calculated)

Assumptions: engaged play 6 of 7 days, 2–3 Wire calls a day, 10% T1, 2 league promotions + 2 stays in the month, 3 streak-7s (grace days used), first-month achievements.

| | Free | Light spender ($4.99 pack, day 10) | Press Pass ($4.99) |
|---|---|---|---|
| Daily (26 × 5 + 3 T1 × 5) | 145 | 145 | 145 |
| League (2 × 30 + 2 × 15) | 90 | 90 | 90 |
| Streaks (3 × 20) | 60 | 60 | 60 |
| Track credits (tier ≈ 18: 4 free + pass drops) | 80 | 80 | 80 + 90 |
| Achievements + 10k follower milestone | 250 + 50 | 300 | 300 |
| Purchases / stipend | — | 550 | 150 |
| **Credits earned** | **675** | **1,225** | **915** |
| Non-credit value | — | — | 18 pass-lane rewards (4 cosmetics ≈ 1,200 credits of value, 3 Favour bundles), no ads, 3 slots, archive, 1 scenario pack (250) |
| Typical spend | 1 theme (400) + 10 Favours (150) | 2 themes + trophy + Favours | theme + scenario pack + Favours |
| Feels like | first theme around **day 14–18** without paying | gets exactly what they bought | ≈ **2,200 credits of value for $4.99** (150 + 90 credits, ≈1,200 in cosmetics, 400 slot, 250 pack, ≈135 in Favours) vs 550 from a $4.99 pack |

The free player gets a meaningful unlock every 2–3 weeks and plays every ranked mode in full. The Pass is ≈ 4× the value of the same money spent on credits, and it's the only way to get no ads, extra slots and the archive together.

### 7.8 Ads

Rewarded only, always opt-in, never in Daily/Wire/Friends. One **Sponsored** card below Results and on Home for non-Pass players, never over controls. No interstitials. `monet.ts` switches (empty id = off) are reused, extended with a `TierAds` Android bridge identical to `GafferAds`.

---

## 8. Retention loops

| Loop | Beat | Hook |
|---|---|---|
| Daily | 00:00 UTC | New Daily. Overnight Wire digest: resolutions, Market moves, rival calls |
| Streak | daily | Streak = days with a Daily played. **Grace:** 1 day off earned per 7-day streak (bank up to 2); a missed day auto-spends one. Milestones pay credits at 7/30/100 |
| Weekly | Monday 00:00 UTC | League promotion/relegation, division reveal, rival head-to-head summary |
| Seasonal | four per year | Track resets, bars recalibrated (§3.9), season trophy. Summer and Winter Windows bring the Wire's resolution waves and a **Deadline Day event**: the real deadline day hosts a special Daily with real deadline-day rumours as sagas |
| Social | any time | Share cards (Daily result grid, Wire call receipts with the Market at your lock: "I called it at 22%"), private rooms, rival pings |

---

## 9. Cross-game contract (Tier One ⇄ The Gaffer)

Tiny and one-way each direction, through `api/semba/events` (Redis stream, 30-day TTL):

- **Gaffer → Tier One:** when a Gaffer manager makes a *real-player* bid or sale in a live career, the Gaffer emits `{type:'gaffer.move', playerId (data-service id), fromClub, toClub, fee, status:'bid'|'agreed'|'rejected', at}`. Aggregated across players, the top 3 "Gaffer-world" moves each day become **Practice scenario sagas** ("The Gaffer community is chasing Wirtz"). They're never Wire rumours: fictional moves must not resolve real calls.
- **Tier One → Gaffer:** a player's resolved right Wire calls and Daily T1s are emitted as `{type:'t1.story', playerId, headline, byline, at}`. The Gaffer shows them as **media leaks** in its newspaper (flavour, with the Tier One byline) and as a news-card link to the Tier One profile.
- **Shared:** Semba ID, wallet, Press Pass flag (read-only in The Gaffer: no ads in both games is a Pass perk). No gameplay effect crosses games.

---

## 10. Connection map (the 7-question trace, applied to v3)

Columns: **Consumes** · **Trigger** · **Validates** · **Changes** · **Consumed by** · **Player sees** · **Persists**.

| System | Consumes | Trigger | Validates | Changes | Consumed by | Player sees | Persists |
|---|---|---|---|---|---|---|---|
| **Daily** | seed, real squads, engine rules | play / 00:00 UTC | server replays the action log; one attempt | score, tier, exclusives | Leagues, Streak, Season track, Credits, Share cards, Rivals, Gaffer leaks | result grid, par, rank | server + local history |
| **Sources/contacts** | board truth + spin, day, era | Ask | cost ≤ contacts, opens day, once per era | reads, contacts left | Evidence panel, two-source rule, Trust (Career) | answer + card tally | window log |
| **Rivals** | truth/spin schedule | End day | — | public feed | Evidence, exclusive race, Overnight sheet | posts, "beat you" lines | window log |
| **Calls/U-turns** | evidence | Post / U-turn | no sources no story; once per saga; DD cap | calls, penalties | Scoring, Rep/Followers/Relations (Career) | composer gain/loss, receipts | window log |
| **Practice** | any seed, Coach mode | Practice | none | local only | Season track (+10 PP/window, cap 3/day), Achievements (learning set) | exact odds (Coach) | local |
| **Friends rooms** | room seed per round | round opens | Daily rules, 48 h | room standings | Share cards, Rivals (friends) | table, head-to-head | server 90 d |
| **The Wire** | data-service rumours, Market | File | caps, locks, freeze, late-wire | open calls, Cred | Leagues, Heat points, Season track, Rivals, Gaffer leaks | heat line, digest, receipts | server |
| **Career** | engine + rank modifiers | window | Rank rules | Rep, Trust, Relations, Followers, Favours | Rank, Club Leaks, Credits (milestones), Achievements, Share cards | rank bar, contacts, club badges | local + cloud save |
| **Rep** | Career calls | window end | clamp 0–100 | Rep | Rank gates | Rep bar with equilibrium hint | career save |
| **Trust** | asks, true reads you used | ask / resolve | — | Trust per contact | reliability, early access, second opinion | contact card levels | career save |
| **Club relations** | right/wrong calls per club | resolve | clamp ±5, drift | Relation | Club Leak source, frozen-out Kitman | club badges, toasts | career save |
| **Followers** | Career calls × star | resolve | — | followers | star power, credit milestones, share cards | follower count | career save / account (milestones) |
| **Favours** | exclusives, T1 windows, credits | spend | ≤2 per window, stock ≤5 | contacts, info | Career outcomes | favour tray | career save |
| **Achievements (30)** | events from all modes | event | once | unlocked set | Credits, Season track PP | trophy pop, shelf | account |
| **Streak** | Daily played | 00:00 UTC | grace days | streak, grace bank | Credits, PP, Home | flame + grace pips | account |
| **Leagues** | Daily tier pts, Wire pts, Heat | week close | division rules | division | Credits, PP, Rivals | league table | server |
| **Season track** | PP from all modes | PP gain | Pass flag | tier | Credits, cosmetics, Favours, scenario packs | track screen | account |
| **Store / Pass / Wallet** | verified payments, earn events | purchase / earn | server verification | balance, entitlements | cosmetics, slots, Favours, archive, ads off | wallet, items | account |
| **Cosmetics** | purchases, track | equip | owned | theme/trophy/byline | Share cards, profile, rival views | look of desk and cards | account |
| **Share cards** | Daily/Wire/Room/Career results, cosmetics | Share | — | — | acquisition (invites → rooms) | image + link | — |
| **Ads** | Pass flag, mode | opt-in | allowed modes only | +2 contacts | Career/Practice | reward toast | — |

Every row feeds at least one other row. Nothing is decorative.

## 11. A week in the life (ripples across systems)

**1. Maya, free, engaged.** *Mon:* her Daily is Tier 2 (+20 league points, +5 credits, +30 PP). She files a Wire YES on a winger at Market 28%. *Wed:* the Market moves to 47% after a tier-1 outlet report: +2 Heat points in her league and a digest ping. Her rival @kaz filed NO. *Fri:* in Career (National Correspondent) her Agent reaches Trust L3. The Physio now opens on day 4, and she lands her first Career exclusive → +1 Favour, +2 Relation with Brighton (Relation hits +3 → **Brighton's Club Leak** unlocks). *Sun:* the winger's move is confirmed. Wire +36 Cred (plus the club bonus), which pushes her to 1st in her Reporter division → **promotion** (+30 credits, +100 PP). Her share card "Called it at 28%" goes to her Friends room, and two friends file on the next rumour. None of the Career gains touch her Daily or league score.

**2. Omar, Press Pass.** He runs two Career slots, one at a "rival paper" after reaching Tier One. The Pass's archive lets him replay last Tuesday's Daily in Practice with **Coach mode** on. He sees his "two Barbers + Tabloid = Done" read was a 26% echo (§3.2). Next Daily he waits for the Agent, posts Confirmed Off on day 2 with ✓✓, and gets his first T1 of the season (league +30, credits +10, desk-trophy progress). The pass lane drops the "Deadline Neon" theme, which now frames his T1 share card.

**3. Lina, light spender.** She buys 550 credits in week 2 and spends 400 on the Broadsheet theme. In Career she's frozen out by Villa after two wrong Confirmed calls, so the Villa Kitman now repeats the spin (badge shown). She uses a bought Favour (Tip-off) to confirm a Villa saga is Fake, publishes right, and her Relation climbs back to −2, lifting the freeze. Her Daily scores in the same week are unaffected by any of it; her league stays at Correspondent.

**4. The Gaffer link.** Dev manages Everton in The Gaffer and bids for a real striker. That bid and 400 others make "Everton chase X" a Gaffer-world Practice saga in Tier One. Separately, Dev's right Tier One Wire call on the same striker's *real* move appears in The Gaffer's paper as a leak under his byline.

---

## 12. Cut, merged, kept (and why)

| v2 feature | Decision | Why |
|---|---|---|
| Hunches | **cut** | Dominated and a trap (audit §7b). Replaced by story-driven opening days |
| Hidden 1–3 twists, twist bonus +10, halved post-twist update | **merged** into one announced, free-reset twist | Readable event, no hidden rules |
| Go louder (escalate) | **cut** | It re-dated calls (a hidden cost) and nobody skilled used it. Choose the strength when you post |
| Superstar points ×1.5/×1.2 | **cut** from points, kept in Career followers | Adds board variance to points without adding a decision; star power still matters for reach |
| Follower score multiplier (FMULT) | **cut** | Dead code (always ×1) |
| Gear (8 items), source tree bought with $, cash, pay formula, payday, ad cash | **cut** → Trust (earned) + Favours | Most gear worth ≈ 0. Cash was a sink with bad payback. "Reliability grows with use" is the fantasy |
| Boost price doubling | **cut** | Pure sink (audit §8c) |
| XP/levels | **merged** into Rank | Two progress bars measuring the same thing |
| Legend prestige | **merged** into a new-slot restart ("rival paper") | Same replay value, no reset of earned identity |
| Rival reactions (Doubt it / Big if true) | **cut** | No effect (ux F16). Real rival events replace them |
| Rooms as shared careers | **cut** → Daily-rules rooms + Wire rooms | Unequal tier bars broke fairness |
| 66 achievements | **cut to 30** | Each now pays PP/credits and teaches a system |
| Skins paid with career $ | **merged** into Semba Credits cosmetics | One wallet |
| Local-date Daily, `DAILY_REPLAY` | **cut** | UTC rollover; one attempt; server-scored |
| Snap calls overlay | **kept** as the DD one-tap composer, renamed "Quick post" | "Call" means only a published prediction |

---

## 13. Screens (for the UI team: purpose and data, no visuals)

Global rules: (1) every number shown is computed from the engine or the API, never typed into copy. (2) "Call" means a published prediction only; asking a source is "Ask". (3) Strength names are Talks / Advanced / Confirmed everywhere.

| Screen | Purpose | Data shown |
|---|---|---|
| **Home (Today)** | One place for today | Daily state (play/played + tier + par), Wire digest (moves, resolutions), streak + grace, league position, season tier, Career rank card |
| **Board** | The window at a glance | Day, contacts left, per saga: player, clubs, current lean (tally leader), evidence strength (circles ✓), call chip, exclusive race state ("open · ITK posts d2–4"), twist chip |
| **Saga page** | Investigate one story | Reads grouped by circle with card tallies, tally bar per outcome, "Before the twist" section, rival posts, sources to ask (cost, opens day, what each would tell you) |
| **Ask sheet** | Spend a contact | Source card (rule sentence + tally), cost, remaining contacts |
| **Composer** | Publish | Outcome × strength grid: if right / if wrong points (incl. early bonus), exclusive status, two-source check ✓✓, U-turn cost if applicable, live tweet preview |
| **Overnight sheet** | What changed | Rival posts, twist banner, "your exclusive is contested" lines |
| **Deadline Day** | 60 s finale | Clock, 3 contacts, posts left (of 3), Quick post |
| **Results** | Learn from the window | Per saga: your call, truth, points breakdown, which reads were right, where the spin came from, what an exclusive needed; total, tier, par, rank, league points |
| **Leaderboard** | Rank | Daily global/friends, weekly |
| **Wire feed** | Browse rumours | Player, clubs, Market %, heat, outlet tier, status, first seen, window |
| **Rumour detail / File** | File a call | Market, crowd split, your rivals' positions, the scoring formula with your numbers ("win 23 / lose 9"), lock rules |
| **My calls** | Track open/resolved | Heat line, paper Cred, locks, resolutions, receipts |
| **League** | Weekly competition | Division table, points breakdown (Daily/Wire/Heat), promotion line |
| **Rivals** | Social pressure | Head-to-heads, shared rumours, recent Dailies |
| **Career hub** | Progress | Rank, Rep (with equilibrium), windows to next rank, followers, Favours |
| **Contacts** | Network | Each contact's Trust level, next effect, points to next level |
| **Clubs** | Relations | Relation per club, Club Leaks, frozen-out badges |
| **Friends rooms** | Private play | Room list, round status, standings |
| **Season track** | Rewards | Tiers, PP, free and pass lanes |
| **Store / Pass / Wallet** | Buy and see balances | Items with credit price, packs with USD, Pass contents, balance, purchase history |
| **Profile** | Identity | Byline, Cred, hit rate, trophies, theme |
| **Practice** | Learn | Seed picker, archive, scenario packs, Coach toggle |
| **How to play** | Rules | Generated from `RULES` |

**The six questions, answered on the screens where decisions happen:**

| Question | Board | Saga page | Composer | Results |
|---|---|---|---|---|
| What is being reported? | lean + rival chips | every read, by circle | the outcome you're posting | truth vs your call |
| How strong and independent? | circle count ✓ | tally bar + circles + echo warning | two-source check ✓✓ | which reads were right, the spin |
| What remains uncertain? | "split" chip when the top two are within 2 | tally gap, unasked sources listed with what they'd split | — | — |
| Gain/lose by publishing now? | — | — | exact ±points, early bonus, exclusive | points breakdown |
| Who might beat me? | race chip + rival schedule | rival posts + next rival window | exclusive status line | "beaten by @ITK on day 3" |
| What next? | contacts left, suggested saga (the least certain uncalled) | "Ask the Spotter to split Done/Hijack" hint | Post | "Tomorrow at 00:00 UTC", league line |

---

## 14. Data contract (from the data service)

`GET /rumours?since=` → normalized records:

```
{ rumour_id, window_id, first_seen_at, last_update_at,
  player: { id, name, club_id, position, age, nationality, market_value_eur, star: 1|2|3 },
  from_club_id, deal_type: 'permanent'|'loan'|'loan_obligation',
  linked: [ { club_id, first_seen_at, best_outlet_tier: 1..4, mentions_7d } ],
  reported_fee_eur: { min, max } | null,
  status: 'rumour'|'talks'|'advanced'|'agreed'|'medical'|'confirmed'|'collapsed'|'extended'|'moved_elsewhere',
  status_history: [ { status, outlet_tier, first_reported_at, source_url } ],
  p_market: 0..1, heat: 0..100,
  resolution: { outcome: 'moved'|'stayed'|'void', club_id, fee_eur, confirmed_at } | null }
```

Also `GET /squads?league=` (current real squads for Daily/Career boards: player id, name, club, position, star) and `GET /windows` (id, opens_at, closes_at per league). SLA: status changes within 30 minutes; `first_reported_at` is the outlet timestamp, not ingest time; `p_market` is calibrated (reliability diagram published monthly). Player/club names only, no photos or crests unless licensed.

## 15. Server and save

- New `api/tier-one/v3.js` actions: `daily.start|ask|call|uturn|end`, `wire.file|correct|mine`, `league.me`, `room.*`, `wallet.balance|grant(verified)`, `events.*`. Redis keys by account.
- Semba ID: device id + optional sign-in (needed for wallet and Pass across devices). Anonymous play stays possible; the wallet binds to the ID when you sign in.
- Local save `tierone_v3` with a real `v` migration chain. The v2 save is read once: trophies map to the 30 new achievements, skins map to themes, the career converts to a Regional Reporter start with Trust L1 on sources v2 had upgraded. v2 Daily history is kept read-only.

## 16. Open risks

1. **Data service latency and quality** decides whether the Wire feels fair. The late-wire rule covers minutes to hours, not a broken feed. Wire resolutions need a manual override queue.
2. **Hand-set constants.** The tier bars (180/120/70) and the spin table are estimates. §3.10 lists the gates. The first season's bars may move ±15 at season 2.
3. **Server-held Daily** needs a connection; offline players only get Practice.
4. **Real names** of players and clubs: fine as factual reporting; no photos or crests without licences.
5. **Market manipulation** by coordinated groups: mitigated by the 20-resolved-call weight gate and the data-service half of the Market; watch crowd–`p_market` divergence.
6. **Scope:** Career ranks + Trust + Relations is the largest build item. Ship order: engine + Daily + Results → Practice/Coach → Wire → Leagues → Career → Store/Pass.

## 17. Decisions for the studio lead

1. Four outcomes kept (brief) with the spin. **Recommend keep**; the 3-outcome variant was simpler, but the brief asks for Off vs Fake and the agent needs it.
2. Daily requires a connection (server-held truth). **Recommend yes**: fair leaderboards need it.
3. Tier 1 needs an exclusive. **Recommend yes.**
4. Press Pass Tier One-only, or a Semba Pass covering The Gaffer's Supporter perks? **Recommend** Tier One Pass now, Semba Pass once The Gaffer has a season track.
5. Wire resolutions need a human override queue staffed during windows.

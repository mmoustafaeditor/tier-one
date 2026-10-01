# Tier One 4: "The Call" — the rulebook

The lead designer's single source of truth for how Tier One plays. Every number lives in
`api/tier-one/v3/_lib/engine4.mjs` (game rules) and `games/tier-one/v3/web/src/lib/economy.ts` (XP, levels, coins, prices).
The balance sim is `games/tier-one/v3/sim/sim4.mjs` (`node sim4.mjs 1500 daily`). If this file and the code disagree, the code wins
and this file is wrong.

## 0. Why the rules changed

3.x asked a new player to learn about fifteen ideas before the first post: four endings (Done, Hijack, Off, Fake), three
strengths named after transfer stages (Talks, Advanced, Confirmed, which read like *outcomes*), five contacts with prices
and opening days, tally weights, evidence circles, the two-source rule, the rumour-mill spin, three rivals, Exclusives, the early
bonus, U-turns with penalties, a twist that wiped a story's slate, and a Deadline Day post cap. Most players couldn't say why they
won or lost.

4.0 keeps the one decision that makes the game good, **"am I sure enough, early enough?"**, and cuts everything that didn't
feed it. A new player needs six ideas, and every one fits on a card:

1. **Stories.** A player, a club. It ends one of three ways: **SIGNS** (joins that club), **ELSEWHERE** (joins another club),
   **STAYS** (doesn't move).
2. **DMs.** Each day you get a few DMs to send. Each contact tells you one thing about one story.
3. **Contacts.** Five people. Each card prints what they can tell you and how often they're right.
4. **Post.** Pick the ending and how loud you go: a **Hint** (×1), a **Post** (×2) or a **Drop** (×3, All in). The post screen shows
   exactly what you win or lose. Posts are final.
5. **Earlier pays more.** Every day before Deadline Day adds a bonus to a right call.
6. **Scoop.** Go All in, be right, and be there before any rival posted that ending.

Cut, and why:

| Cut | Why |
|---|---|
| Four endings | "Off" and "Fake" both mean "he doesn't move". Nobody could tell them apart, and the answer was the same. |
| Talks / Advanced / Confirmed | They read like what happened, not how sure you are. Replaced by ×1 / ×2 / ×3 All in. |
| Contact prices and points | Every call costs one phone call. The barber is free (gossip is free). One number to track, not two. |
| Tally weights, evidence circles, two-source rule | Hidden maths. Replaced by an accuracy printed on every card, and by a loss on All in that makes gambling a losing bet. |
| Twists that wipe a story | Punished good play with no warning. In 4.0 the truth never changes; the evidence just gets better as the deadline gets close. |
| U-turns | Only existed to undo twists. Posts are final, which makes posting the big moment it should be. |
| Deadline Day post cap | Deadline Day already has fewer calls and a clock. |

## 1. A Daily window

| Knob | Value | Why |
|---|---|---|
| Stories | 5 | Five decisions is a satisfying session; six got samey in testing. |
| Days | 5 (Mon–Thu, then Deadline Day) | Two fewer than 3.x: the same tension, a 4-minute session. |
| DMs | 3 a day, 2 on Deadline Day | 14 DMs for 5 stories: you can't check everything, so you choose. |
| How it ends (start) | SIGNS 40% · ELSEWHERE 25% · STAYS 35% | No ending is a safe default guess. |

### Contacts

| Contact | Tells you | Right | From | Costs |
|---|---|---|---|---|
| The barber | an ending | 50%; when wrong he repeats the rumour mill | day 1 | free |
| The kit man | LEAVING or STAYING | 85% / 80% | day 1 | 1 DM |
| The agent | an ending | 60–80%; when he's wrong he says SIGNS (agents talk up deals) | day 1 | 1 DM |
| The spotter | seen there · seen elsewhere · not seen | 85% | day 3 | 1 DM |
| The physio | medical there · elsewhere · none | 95% | Deadline Day | 1 DM |

Each contact answers once per story. Same question, same answer, for everyone (a fair ranked board).

### Rivals

Rivals post overnight and you see it in the morning: **@BackPageBants** (days 1–2, right 40%, repeats the rumour mill),
**@ITK_Kev** (days 2–3, right 60%), **@PressBoxPete** (days 3–4, right 85%). A rival's post is evidence, and it's the clock on your
Scoop.

### Scoring

| How loud | Right | Wrong | Each day early | Scoop |
|---|---|---|---|---|
| Hint ×1 | +10 | −5 | +2 | — |
| Post ×2 | +20 | −20 | +3 | — |
| Drop ×3 All in | +30 | −60 | +4 | +25 |

How sure you need to be (before the early bonus): ×1 above 1 in 3, ×2 above 3 in 5, All in above 4 in 5. The post screen says
it in words: "You win 46 if he signs. You lose 60 if he doesn't."

A Drop is the catchphrase moment: a right Drop stamps your catchphrase on the story and lands on your Lens grid.

### Grades

Per story on the board: **Tier One** 36 and at least one Scoop · **Tier Two** 24 · **Tier Three** 12 · **Tier Four** 0 ·
**Spiked** below 0. A five-story Daily: 180 / 120 / 60.

### What the sim says (1,500 boards each)

| Player | Mean | Tier One | Tier Two+ | Spiked |
|---|---|---|---|---|
| Casual (random contacts, ×2 on day 2) | 54 | 0% | 10% | 28% |
| Reads the cards (follows the accuracies) | 138 | 13% | 74% | 1% |
| Sharp (exact odds, expected value) | 215 | 65% | 87% | 2% |
| All in on day 1 off the barber | 32 | 19% | 19% | 48% |
| Copy the PressBoxPete | 66 | 6% | 30% | 28% |
| Wait for Deadline Day and the physio | 93 | 0% | 40% | 2% |

Reading the cards always beats gambling, copying and waiting. Tier One is earned: about 1 in 8 good Dailies, most days for a
sharp player.

## 2. Modes: one game, different knobs (the apps are named in CONCEPT4.md §2)

Every mode runs `engine4.mjs`. A mode is a rule set from `rulesFor(mode, opts)` plus where its board comes from.

| Mode | Board | Rules | Ranked | Unlocks |
|---|---|---|---|---|
| **First window** (tutorial) | fixed seed `tutorial-1`, 3 stories | Career rank 0, Coach on, the editor talks you through it | no | first launch |
| **Daily** | `daily-<UTC date>`, same for everyone | `RULES` (5 stories, 5 days) | yes: day, week, league | after the first window |
| **Career: The Comeback** | local, per window | `rulesFor('career', { rank, trust })`: 3 → 6 stories, more calls at the top, contacts sharpen with Trust | no | after the first window |
| **Deadline Day** | 6 stories, one day, a 90-second clock, rivals already posted, every contact open | `rulesFor('deadline')` | yes on the real deadline days (DD Live), otherwise Practice | level 3 |
| **Practice** | random seed, a past Daily, or a friend's code; Coach shows the exact odds | `RULES` | no | after the first window |
| **The Wire** | real rumours | own market rule (DESIGN §4), same words: HE MOVES / HE STAYS, backed ×1 / ×2 / ×3 All in | yes: Wire season | level 5 |
| **Press box** (rooms, challenges, newsrooms) | shared seed | Daily rules exactly | inside the room | level 4 |

Deadline Day mode replaces the old 60-second last day: the Daily's day 5 is now just a normal day with 2 calls and the physio.

## 3. Progression and economy (single source: `web/src/lib/economy.ts`)

Four things grow, and each has one job. Nothing else is a currency.

| Thing | Job | Earned by | Shown as |
|---|---|---|---|
| **XP** | how much you've played | every window, Wire call, room round | **Level** (forever) and the **Season** track (resets each season) |
| **Reputation** 0–100 | how good you are | right calls (more for bigger backing), lost on wrong ones | **Rank**: Nobody 0 · Rising 40 · ITK 55 · Insider 70 · Tier One 85 |
| **Followers** | how famous you are | right calls, Scoops, hot streaks | the big number on your byline |
| **Coins** | what you spend | playing, prizes, the season track | coin count; spent on looks, Career extras |

**Credits** are the paid currency (shared Semba wallet with The Gaffer). They buy Gold, premium looks and coin packs. Never
anything that changes a ranked score.

### XP
Daily 60 (+40 Tier One, +25 Tier Two, +10 Tier Three) · Career window 40 · Practice 20 (first 3 a day) · Deadline Day 40 ·
Wire call 10 (+15 when right) · Press box round 30 · achievement 50 · daily mission 25.
A regular player (Daily + a Career window + a minute of Wire) earns about 180 XP a day.

### Level (never ends)
XP for the next level = 100 + 30 × (level − 1). Level 2 in the first session, 5 on day 2–3, 10 in about a week, 25 in about two
months, 50 in about eight months. Every level pays coins (10 × level, capped at 200). Levels 3, 4 and 5 unlock Deadline Day,
the Press box and the Wire.

### Season track
30 tiers, 400 XP each (12,000 XP ≈ a 10-week season at a regular pace; a casual player finishes about 60%). Free lane: coins
and a look every 5 tiers. Gold lane (350 credits ≈ €4.99): a look every 3 tiers, the season's Legendary at tier 30, +10% coins.

### Reputation
Right: +1 / +2 / +3 by backing, +2 more for a Scoop. Wrong: −1 / −3 / −6. Daily and Career move it fully, Practice not at all,
Wire at half. Start 30. A rank, once reached, stays (it's a title); dropping 10 below the bar shows "under review" until you climb back.

### Followers
Right: 40 / 100 / 220 by backing, +300 for a Scoop. Wrong: −20 / −60 / −250. Hot streak (right calls in a row) adds 10% per call,
up to +100%. Mode factor: Daily, Career 1 · Press box 0.8 · Wire 1.5 · Practice 0.25.

### Coins
Earn: Daily 15 (+15 Tier One) · Career window 10 · daily missions 3 × 10–20 · level-ups · Daily prizes 60/40/25/10 (top 10 of 3+)
· weekly prizes 200/120/80/30 · season track · scalps 50 and trophies 150 over rivals. A regular free player earns about 80 a day.
Spend: looks (common 150, rare 400, epic 900; legendary is credits or the Gold track), coffee with a contact 30 (Trust),
Career extras (an extra DM 40, a tip-off 60; max 2 extras a window), handle rename 250. Brand deals (CONCEPT4.md §4) are the main mid-game coin income: 150 → 600 a deal.
Nothing in the shop ever runs out: every season adds 8–12 new looks, and last season's leave the coin shop for good.

### Mystery
- **Secret files.** 12 hidden achievements, shown as sealed files until earned (for example "Call three STAYS All in in one
  Daily").
- **The whistleblower.** About one Career window in eight, an unknown number texts you a single tip on one story. It's right
  75% of the time. Who is it? The Comeback answers that in Chapter 4.
- **Sealed results.** Your score isn't shown as you play. Results open post by post, as a thread (CONCEPT4.md §7).

## 4. Clarity rules (every screen)

- No icon without a word. A crown means Tier One and nothing else. Medals say "1st ×2", not a crown and a number.
- Every number on screen says what it is ("Level 7", "Rep 62/100", "4,210 followers", "120 coins").
- The post screen always says the deal in a sentence: "Win 46 if he signs. Lose 60 if he doesn't."
- Contact cards print their accuracy and what they can tell you. No hidden weights.
- First window teaches the six ideas by playing them, one at a time. No rules page before the first post.

## 5. Code contract (for every lane)

- Rules: `api/tier-one/v3/_lib/engine4.mjs`. Typed bridge: `web/src/lib/engine.ts` exports `E4` (the engine), the types
  `Board4, Game4, Pub4, Result4, Preview4`, `OUTS4 = ['signs','elsewhere','stays']`, `BACKING = ['x1','x2','allin']`, and
  `castFor()` (unchanged: a story's player, his club `from`, the linked club `to`, and `alt` for ELSEWHERE).
- Daily cutover: Daily boards from **2026-10-05** use v4 (`v: 4` in the stored result); older Dailies and logs keep v3 so the
  archive still replays.
- Economy numbers: only in `web/src/lib/economy.ts` (client) and `api/tier-one/v4/config/catalog.json` (server); the client
  imports the JSON for prices and packs, so they can't drift.
- New strings: each lane adds its own `web/src/i18n/parts/<lane>4.ts` with en, ar (Egyptian) and es. The words are CONCEPT4.md §3.

# D · Game math specification (Tier One 3.8)

Living spec, part D (brief §53). Source of truth for every number in `api/tier-one/v3/_lib/engine.mjs` (`RULES`); the simulator that produced every figure here is `games/tier-one/v3/sim/sim3.mjs` (`node sim3.mjs all 2000`). Baselines are the 3.7 values the brief lists; nothing below was accepted without a run. Status words: **KEEP** (number survives the audit), **CHANGE** (new number), **NEW** (new rule).

## 1. Method

- Eight archetypes play the live engine on the same seeded boards: **random**, **cautious** (never Confirmed), **tally** (plays the card exactly as the UI prints it: ✓✓ + lead ≥ 4 → Confirmed, lead ≥ 3 from day 3 → Advanced, else In talks by Deadline Day), **aggressive-early** (Confirms the day-1 leader), **late-conservative** (banks until the physio), **copy-insider** (waits for @PressBoxPete, repeats him at Confirmed), **echo-chamber** (counts barber + two street rivals as three sources), **Bayes** (exact posterior, buys the read with the best expected value per point, calls when sure enough for the day, U-turns when the evidence turns).
- 1,500–3,000 boards per archetype per run; A/B variants on identical seeds. Information per source is computed analytically (mutual information with the truth, spin marginalised; and EVOI = points of expected value a rational caller gains from the read on its opening day).
- "Engaged pool" below = cautious + tally + late-conservative + Bayes on equal weight; "target population" = 35% tally, 30% cautious, 15% late, 10% Bayes, 10% copy/echo (what a real engaged base looks like).

## 2. Core board

| Rule | Value | Status | Why |
|---|---|---|---|
| Sagas per board | 5 | KEEP | 27 points ÷ 5 sagas ≈ one strong read + one cheap read per saga: triage every day. 4 removes the dilemma, 6 makes the session long. |
| Days | 7 (day 7 = Deadline Day) | KEEP | The opening days (1 / 3 / 5 / 7) give the week a shape: open, destination, medical, deadline. |
| Outcome prior | Done .35 · Hijack .20 · Off .25 · Fake .20 | KEEP | 55% "moves" / 45% "stays"; the stay side is the hard axis (§3) and must stay large enough to matter. |
| Contact points | 4 per day, days 1–6 | KEEP | Marginal value of a point to a good player ≈ 4–5 score (3/day: Bayes −18, tally −14; 5/day: +15 / +19). Points bind: the "confirm this or open that" dilemma is real. |
| Rollover | 0 (`ROLLOVER`) | NEW, explicit | Carrying 1 or 2 points changed an optimal score by +1. A rule that changes nothing is a rule to leave out; "use it or lose it" is the daily ritual. The knob exists so Career/Practice can experiment without an engine change. |
| Deadline Day points / posts | 3 / 3 | KEEP | 2 or 4 points moved scores < 1. Three = one physio, or spotter + kit man, in sixty seconds: a feel decision, not a math one. |
| Deadline Day clock | 60 s, Quick Post at 15 s, server grace 4 s | KEEP | See G §4 for the UI thresholds. |
| Spin (planted wrong story) | one per era, drawn from `SPIN[truth]` | KEEP | This is what makes the street correlated: the echo-chamber archetype scores 36 (23% Spiked) against the tally player's 124. The lesson works. |
| Twist | exactly one per board, on a real saga, day 4 or 5 (50/50), announced; the saga's call and reads are voided free | KEEP | Twists land on 100% of boards (no twist only when all five are Fake, 0.03%). Cost to the player is lost points and lost early days, never a penalty: it is drama, not a tax. |
| U-turn | once per saga; withdrawn call costs 3 / 8 / 30; the new call is never exclusive | KEEP | A Confirmed U-turn to a right Advanced on day 5 nets −6 instead of −60: a rescue, not a free re-roll. The Bayes player uses it 0.3 times a board. |

## 3. Sources

Information per contact point, cold (prior) and after the most common day-1 state (a kit man read):

| Source | Cost | Opens | Bits (cold) | Bits / pt | EVOI pts (cold → after "Leaving") | Verdict |
|---|---|---|---|---|---|---|
| Kit man | 1 | 1 | .275 | **.275** | 5.2 | KEEP. Best cheap read; the right first call on every saga. |
| Barber | 1 | 1 | .192 | .192 (.117 after Leaving, **.222 after Staying**) | 3.8 (1.1 → 10.6 after Staying) | KEEP at 45%. Not noise: the best Off-vs-Fake separator in the game (.204 bits on that axis; his "it was never on" is rarely the spin). At 55% the Bayes player gains +19 and the card reader +0: it would widen the expert gap for nothing a human can feel. |
| Agent | 2 | 1 | .391 | .196 | 14.6 → 17.6 | KEEP the bias. Her "no" is 73–74% right, her "yes" 52%: that asymmetry is the inference the brief wants. A sharper table (+5 pts to Off/Fake) helped the day-1 gambler most (+17). |
| Airport spotter | 2 | 3 | .679 | **.339** | 17.9 → 25.8 | KEEP. Most information per point and the day-3 turning point. Opening on day 1 would be worth +3.8 EVOI and would delete the mid-week. |
| Physio | 3 | 5 | 1.047 | .349 | 22.3 → 28.8 (30.8 if it opened day 1) | KEEP 3 points, day 5. Cost 2: late player +15, card reader +8, expert +2: a cheaper physio pays waiting. Day 4: exclusives −25% (people wait for it before Confirming). It is the closer, priced as one. |
| Press office (Career) | 2 | 1 | 85% on four outcomes | | | KEEP, Career only (relationship ≥ +3). |

Off vs Fake once "he stays" is known: only the barber (.204 bits) and the agent (.196) can tell them apart; kit man, spotter and physio contribute 0. That is by design (the physio can't see talks that never happened) and it is what keeps the stay side a judgment call: the Bayes player is still right on 92% of the stays it calls, the tally player 88%, because the two sources that can tell are both cheap.

Card tally weights, circles and the two-source rule: unchanged (`TALLY`, `CLAIM_TALLY`, `CIRCLE`). Reads from one circle count once; an exclusive needs two circles.

## 4. Publishing ladder

| Strength | Right | Early / day left | Wrong | Exclusive | U-turn cost | Status |
|---|---|---|---|---|---|---|
| In talks | +10 | +1 | −5 | — | −3 | KEEP |
| Advanced | +20 | +2 | −15 | — | −8 | KEEP |
| Confirmed | +40 | +4 | −60 | **+30** (was +20) | −30 | CHANGE (exclusive) |

Break-even probabilities (the numbers the composer's guidance must match):
- Confirmed beats Advanced from **p ≈ 0.58 on day 1**, 0.67 on day 6; with an open exclusive (two circles already agree, so p is rarely that low) 0.42 / 0.46. "Confirmed when you'd bet 3-to-2" stays correct.
- Advanced beats In talks from p ≈ 0.39 (day 1) to 0.50 (Deadline Day). In talks beats silence from p ≈ 0.24: always file something.
- A day-3 Confirmed on a spotter read (p ≈ .81) and a day-6 Confirmed on a physio read (p ≈ .92) are worth the same ≈ 34 EV. That tie is the game: early and brave, or late and sure, and only the first can be exclusive.

Audit answers (brief §7):
- **Confirmed is not too punishing.** −50 cut the Confirm-everything-on-day-1 archetype's Spiked rate from 39% to 26% and raised its mean from 48 to 62 while giving the card reader +2. Reckless must stay expensive.
- **Neither cautious nor aggressive dominates.** Cautious (never Confirmed) 63, aggressive-early 51 (38% Spiked), tally 124, Bayes 217.
- **Early bonuses are strong enough.** The card reader (mean call day 4.5) beats the wait-for-the-physio player (day 5.8) 124 to 78; +1/+3/+5 would mostly reward the gambler (+13).
- **Late certainty does not dominate early journalism** (above), and copying @PressBoxPete scores 70 with 0 exclusives and 18% Spiked.
- **The exclusive was too small.** +30 makes a day-2 exclusive (40 + 20 + 30 = 90; 94 on day 1) the biggest single thing in the game, lifts the card reader +4.5 and the expert +16, and lifts the reckless archetype 0 (two circles gate it).
- **Skilled beats random**: Bayes beats random on 98% of boards, tally on 82%; tally beats random on 96%, cautious on 82%.
- **Luck does not overwhelm judgment**: in the engaged pool, 24% of score variance is the board, 43% is the archetype. One board can go wrong (Bayes p10 = 70, p90 = 340); a week cannot.
- **Optimal play is understandable**: the tally rule (two circles + lead ≥ 4 → Confirmed; lead ≥ 3 → Advanced; always file by Deadline Day) is three sentences and lands Tier 1 on one board in eight. The expert's extra 90 points come from buying reads by value instead of habit and Confirming a day earlier: that is what Practice/Coach should teach (G §6).

## 5. Tiers and bounds

| Tier | Threshold | Status |
|---|---|---|
| Tier 1 | **200** and ≥ 1 exclusive (was 180) | CHANGE |
| Tier 2 | **130** (was 120) | CHANGE |
| Tier 3 | 70 | KEEP |
| Tier 4 | 0 | KEEP |
| Spiked | < 0 | KEEP |
| Score bounds | −450 … **470** (was 420) | CHANGE (server validates) |

Target distributions (what the leaderboard and the share card should look like):

| Player | T1 | T2 | T3 | T4 | Spiked | mean |
|---|---|---|---|---|---|---|
| tally (card reader) | 13% | 36% | 30% | 17% | 5% | 124 |
| cautious | 0% | 0% | 45% | 51% | 4% | 63 |
| late-conservative | 0% | 12% | 52% | 31% | 5% | 78 |
| Bayes (expert) | 56% | 26% | 9% | 6% | 3% | 217 |
| copy-insider | 0% | 26% | 27% | 29% | 18% | 70 |
| echo-chamber | 0% | 6% | 23% | 48% | 23% | 36 |
| random | 0% | 1% | 4% | 16% | 80% | −61 |
| **target population** | **≈10%** | **≈20%** | **≈35%** | **≈30%** | **≈5%** | ≈105 |

Tier 1 ≈ one day in ten for an engaged player, "Top 8%" on a share card means something, and Spiked is rare unless you gamble or copy. Daily "par" (median) should sit near 100.

## 6. Rivals and twists

| Rival | Days | Posts on | Right | Wrong = spin | Status |
|---|---|---|---|---|---|
| @BackPageBants | 1–2 | 60% of sagas | 35% | always | KEEP |
| @ITK_Kev | 2–4 | 70% | 55% | always | KEEP |
| @PressBoxPete | 5–6 | 85% | 75% | spread | KEEP |

Share of sagas where a correct rival post already stands when you post (exclusive gone): day 2 8%, day 3 25%, day 4 33%, day 5 43%, day 6 61%, Deadline Day 79%. The exclusive is a race you win on days 2–4; the physio (day 5) rarely gets you one. That is the intended tension and the reason the physio stays late.

## 7. Deadline Day

60 s, 3 points, 3 posts, Quick Post from 15 s (posts at Advanced), server grace 4 s. UI thresholds (brief §9): 60 normal · 30 heartbeat · 15 Quick Post · 10 ticking + vibration · 5 timer pulse · 0 whistle. No early bonus on day 7 (`EARLY × 0`), so Deadline Day is about finishing, not scoring: the player who arrives with two open sagas and a lean on each gains ≈ +30 by filing Advanced on both.

## 8. Recommendations for other lanes

Numbers the other lanes should adopt unless their own simulation says otherwise.

**Followers (§21, lane progression).** Replace the flat table with `base × early × star`, where base = 30 / 80 / 200 for In talks / Advanced / Confirmed, early = 1 + 0.1 × days left (day 1 ×1.6, Deadline Day ×1), star = ×1 / ×1.5 / ×2 for 1★ / 2★ / 3★ (superstar). Exclusive: +400 × star, on top. Wrong: −15 / −50 / −200 × star (a wrong Confirmed on a superstar costs 400: "it should hurt"). Hot hand cap ×1.5 (×2 made movement look random). Mode factors: Daily ×1, Rooms ×0.8, Market ×1.5, Practice ×0 ("off the record" means it), Career by stage ×0.5 / ×0.75 / ×1 / ×1.25 / ×1.5 (publication reach). Reputation unchanged: +1 right, −2 wrong Confirmed.

**Career (§11, §13, lane career).** Five stages, 20 windows to the top: The Blog 3 windows (3 sagas, 3 points, kit man / barber / agent, @BackPageBants) → Local Desk 4 windows (4 sagas, 4 points, + spotter, + @ITK_Kev; rep ≥ 55) → Nationals 5 windows (5 sagas, 4 points, + physio, + @PressBoxPete; rep ≥ 62) → The Press Box 5 windows (5 sagas, 4 points, press office via relationships; rep ≥ 70) → Tier One 3 windows (6 sagas, 5 points, 45-second Deadline Day; rep ≥ 78), then endless/prestige. Gates are "windows AND reputation", as now; the counts drop from 8 / 20 / 36 / 56 to 3 / 7 / 12 / 17 cumulative. Contact trust (−12% error per level, barber +5%/level, early opening at Trusted, second opinion at Direct Line) stays Career/Practice only.

**Multiplayer (§16–17, lane rooms).** Min 2, recommended 2–12, hard cap 16 (a 24-table never reads on a phone). Code: 6 letters from a 24-letter alphabet (no I/O), ~190M codes. Rounds: 7 by default (3 / 7 / 14 offered). Daily cadence: a round opens 00:00 UTC and closes 48 h later; weekly: Monday–Sunday. Late join allowed through round 3 of 7 (≤ 40% of rounds); missed rounds score 0 and don't count as played. Standings by total points; ties by exclusives, then round wins, then earliest filing. Inactivity: archive 14 days after the last round closed (read-only 90 days), not "21 days without opening". Host passes to the longest-tenured active member; a room with fewer than 2 active members for 2 rounds closes. Taunt cooldown 60 s (make the server match the words). Spectate a round only after filing it. Coin rewards only in rooms with ≥ 3 players and ≥ 3 rounds. Anti-cheat: server seed per round, action-log replay (G §2), one account per device per room. Rounds use the Daily rules unchanged so a room score and a Daily score are the same currency.

**Transfer Market (§18, lane market).** 5 new calls a day, **30** open calls (was 40: fewer, more considered; a window rarely has more than ~150 live rumours), one call per rumour, one correction within 15 minutes, late-call protection widened from 6 h to **12 h** before the news broke. Keep the price formula; stakes 1 / 2 / 3 map to In talks / Advanced / Confirmed as now.

**Deadline Day Live (lane dd).** Align to the ladder: right 10 / 20 / 40, wrong −5 / −15 / −45 (three outcomes, so the prior is higher than the Daily's; −45 keeps Confirmed's break-even near 0.55), early ×1.25 before 12:00 UTC unchanged.

**Progression / economy (lane economy).** XP for a Daily 20 (+15 / +10 / +5 by tier) and the coin table are fine; the hidden 20-coins-per-400-XP drip goes (§35). Missions must never name a source ("ring the barber three times" is mathematically bad advice: barber EVOI after a "Leaving" read is 1.1 points).

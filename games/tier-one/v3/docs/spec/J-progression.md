# J · Progression: followers and reputation (Tier One 3.8)

Living spec, part J (brief §53). Covers brief §20–§21. Code: `lib/byline.ts` (`followerDelta`, `repStep`, `REP_TIERS`, `trustWord`). Simulator: `sim/career38.mjs` (the follower and reputation lines are the ones below).

## 1. The mental model (§20)

| Number | Means | Moves when | Shown |
|---|---|---|---|
| **FOLLOWERS** | how famous you are | every resolved call in the Daily, rooms, Career and the Market | Press Card, Home mini card, Career stage screen, Results |
| **REPUTATION** (0–100, a word) | how trusted you are | the same calls | Press Card, Career stage screen, Results; the word gates Career stages |
| **SEASON XP / level** | the temporary reward track | playing, missions | Pass page, Results (lane economy) |

Contextual, never headline: contact relationships (Career/Contacts), club relations (Career), rival records (Rivals), Market Cred (Market). The hot hand is **kept but quiet**: a ×1.1 per right call in a row, capped ×1.5, shown only as a chip on Results.

Fairness (§22, §48): nothing here changes a ranked score; Practice moves neither number ("off the record" means it).

## 2. Reputation = trust (`repStep`)

Right: `rep += gain × (100 − rep) / 50`, gain 1 / 1 / 2 for In talks / Advanced / Confirmed, +1 for an exclusive. Wrong: `rep −= loss × rep / 50`, loss 0 / 1 / 3. Exact value kept in `byline.repX`, the integer shown is the rounded one.

Why: 3.7 added +1 per right call flat, so reputation measured volume. The scaled step settles near your weighted accuracy and stays there: a 75% Advanced caller sits ≈ 71, an 88% Confirmed expert ≈ 85, a 60% caller ≈ 60. Words (`REP_TIERS`): Blogger 0 · Stringer 55 · Correspondent 65 · Chief 75 · Tier One 85; "Tier One" now means "right about 85% of the time at the volume you file at". A new name starts at 50.

Sim (120 careers, 20–45 windows): card reader ends 79 (73–86), expert 83 (73–91), cautious 76 (72–80), wait-for-the-physio 47, echo-chamber 54. The two bad habits never reach Correspondent; nobody good is stuck.

## 3. Followers = fame (`followerDelta`)

`right: (base × early + exclusive) × star × reach × mode × hot` · `wrong: −wrongBase × star × reach × mode`

| Factor | Values | Why |
|---|---|---|
| base (right) | 30 / 80 / 200 for In talks / Advanced / Confirmed | §21: louder, braver, more fame (3.7: 40 / 90 / 220) |
| wrong | 15 / 50 / 200 | a wrong Confirmed costs what a right one earns: "it should hurt" (3.7: 10 / 30 / 130) |
| exclusive | +400 (3.7: +300) | §8 "exclusives should feel incredible": the biggest single jump in the game |
| early | 1 + 0.1 × days left when filed (day 1 ×1.6 … Deadline Day ×1) | §21 "how early the call was" |
| star | ×1 / ×1.5 / ×2 for 1★ / 2★ / 3★ | §21 "player star level": a superstar exclusive on day 2 = (200 × 1.5 + 400) × 2 = 1,400 |
| reach | Career stage ×0.5 / 0.75 / 1 / 1.5 / 2; ×1 elsewhere | §21 "Career publication reach": the Blog has no readers, Tier One has all of them |
| mode | Daily ×1 · Career ×1 (then reach) · Rooms ×0.8 · Market ×1.5 · Practice ×0 | unchanged from 3.4 except Practice, now truly off the record |
| hot | ×(1 + 0.1 × min(streak, 5)) | 3.7's ×2 made movement look random (§21 "not visual noise") |

Examples: a right Advanced on day 3 on a 2★ in the Daily: 80 × 1.4 × 1.5 = **+168**. A wrong Confirmed on a 3★ at Tier One reach: −200 × 2 × 2 = **−800**. A right In talks on Deadline Day in a room: 30 × 0.8 = **+24**.

Career trajectory (sim, followers when a stage is reached): card reader 2.4k at the Nationals, 19k at Tier One; expert 8k / 48k; cautious 1.2k / 6k. The 38,200 you lost comes back around window 15 for the expert and in endless play for the card reader (≈ 2–4k a window at ×2 reach): a long-term milestone, not a first-career given. Milestone coins (10k 50 · 50k 100 · 100k 200 · 250k 300) are unchanged and pay once from any mode.

## 4. Contacts (§15) in this model

Levels are XP behind the scenes (60 / 160 / 320 / 560) and words in front: Cold · Familiar · Trusted · Inner Circle · Direct Line (`trustWord`). Effects (fewer mistakes, early opening, second opinion) apply in Career and Practice only; cosmetics (frame, warmer lines, nickname, gold card) everywhere.

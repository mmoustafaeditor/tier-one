# E · Economy (Tier One 3.8)

Living spec, brief §53 part E. Decisions, numbers and why. Code: `web/src/lib/{meta,progress,season,wallet,monet,awards,catalog}.ts`, `api/tier-one/v4/config/catalog.json`. Model: `web/scripts/economy-sim.mjs`.

## 1. Decisions (brief §22, §35, §37)

| System | Decision | Why |
|---|---|---|
| Two currencies (Coins / Credits) | **KEEP, REWORK** into one coherent system: Coins = play, Credits = premium + rare milestones | §22. Both existed; the credit side never paid out. |
| Credit earning | **NEW (wired)**: first Tier 1 → 30, every 30-day streak → 40, season end → 25, referred friend's first window → 30 (friend's side) | §35 "nonfunctional Credits". The functions existed and were never called; now fired through `lib/earnhook.ts` (no import cycles). Server `catalog.json.earn` matches. |
| Hidden coin drip (20 coins / 400 XP) | **REMOVE** | §35: unexplained; inflationary for Core/Hardcore (+180–240 coins a month). |
| Gold lane coins and +10% coin bonus | **REMOVE**; the lane becomes the **Season Pass**: 8 looks, nothing else | §22/§24: premium buys identity, never progression. "Gold" is reserved for Exclusive/achievement states (§8). |
| Coin packs, rewarded ads | **REMOVE** | Coins are never sold (§22). Ads were off and off-brand. |
| Payments | **KEEP, disabled behind ONE flag** (`PAYMENTS.enabled`) with honest UI: packs listed as prices, no buy button | §35, §24. |
| Weekly events | **REMOVE** (system and strings; owners keep the 5 event looks) | §34: modifiers never applied; "never show fake mechanics". |
| Weekly league | **REMOVE** (server `league.*`, Results "+N league points") | §35: no screen since 3.6. |
| Weekly leaderboard prizes | **REMOVE**; daily prizes stay (60/40/25, 4th–10th 10, needs 3 players) | Consistency with the missing weekly tab. |
| Season track (40 levels) | **KEEP, REWORK** free lane: 15/20/25/30 coins every 3rd level (300 a season) + frame at 40 | The one "temporary progression" of §20. |
| Missions | **REWORK**: no source-ring chores; rewards for playing well (§5) | §47. |
| Store (Shop + Pass & store) | **MERGE** → one Store (see K) | §23. |
| Career conveniences (favours 15, coffee 30, rename 250) | **KEEP**, out of the Store: `buyFavour()` for the Career tray; coffee in Contacts; rename in Career | §22 allows low-impact Career convenience; §23–24 say the Store sells identity only. |
| Referrer's reward | **DEFERRED**: only the friend is paid (locally); the referrer needs server confirmation that does not exist. Copy promises only the friend's 30. The unobtainable "3 friends" lamp is removed. | Honesty over incentive until v4 accounts verify referrals. |

Fairness line (§22, §48): nothing bought or earned reaches a Daily board, its sources, a room result or Market Cred. The catalog's `Item` type has no field that could carry an effect (`validateCatalog`).

## 2. Coin sources (per event)

| Source | 3.7 | 3.8 | Where |
|---|---|---|---|
| Daily finished | 5 (+5 T1) | **8, +12 at Tier 1, +4 at Tier 2** | `meta.ts DAILY_COINS` |
| Daily streak, every 7th day | 20 | **25** | `meta.ts STREAK_COINS` |
| Daily mission (3 a day) | 5–15 | **5** (Daily, right×3, Advanced+, early, Practice, Career, Market, room, share) / **8** (Exclusive, beat a rival, twist) | `progress.ts MISSIONS` |
| Weekly mission (6 a week) | 40–50 | **25** (5 Dailies, 3 Career, 2 rooms, 5 Market) / **30** (2 Exclusives, 12 right) | `progress.ts WEEKLY` |
| Daily leaderboard prize | 60/40/25/10 | same | `awards.ts PRIZE` |
| Weekly leaderboard prize | 200/120/80/30 | **gone** | |
| Trophies (30, one-off) | 10–50 | same (~600 total) | `meta.ts ACH` |
| Contact level-up | level×10 | same (career lane) | `byline.ts` |
| Rival scalp / rivalry won | 50 / 150 | same (career lane) | `byline.ts` |
| Follower milestones | 50/100/200/300 | same (career lane) | `byline.ts` |
| Season track, free lane | 235 a season | **300 a season** | `season.ts freeReward` |
| Transfer Market right call | 15/25/40/70 by stars | same today; **recommended 10/15/25/40** to the market lane | `screens/Wire.tsx STAR_COINS` |
| Hidden drip | 20 / 400 XP | **gone** | |

## 3. Monthly inflow model (§37) — `node scripts/economy-sim.mjs`

Archetypes: Casual = 3 Dailies a week; Engaged = a Daily a day + some Career; Core = Daily, Career, rooms, Market; Hardcore = everything, missions, top-10 finishes.

| Archetype | Coins / month (3.7) | **Coins / month (3.8)** | Season XP / month | Season level reached (Rumour Mill, 230 XP/lv) |
|---|---|---|---|---|
| Casual | 318 | **~300** | 630 | 11–12 |
| Engaged | 1,510 | **~1,170** | 2,580 | 40 (~90% of the season) |
| Core | 2,511 | **~1,800** | 3,680 | 40 |
| Hardcore | 3,555 | **~2,460** | 4,770 | 40 |

Affordability on the coin ladder (common 100–180, rare 300–400, top rare 400–450): Casual buys a common every ~18 days and a rare every ~5 weeks; Engaged a rare every ~9 days; Hardcore a rare every ~4 days. The coin catalogue holds ~24 items (~5,900 coins); the inflation guard is 1–2 new coin items a month (drops) plus vault returns and the Career sinks (favours, coffee). Hardcore players run out of coin items in ~3 months by design: the rare looks are credits.

## 4. Season XP (brief §20: Followers / Reputation / Season XP)

| Event | XP |
|---|---|
| Daily finished | 20 (+15 T1, +10 T2, +5 T3) |
| Practice (first 3 a day) | 10 |
| Career window | 10 |
| Room round | 15 |
| Market call filed / right | 5 / 10 |
| Trophy | 25 |
| Daily / weekly mission claimed | 20 / 40 |

XP per level = `max(60, round(days × 0.75 × 100 / 39 / 10) × 10)`: Rumour Mill 230, Winter 60, Spring 260, Summer 150. An Engaged player (~85 XP/day) tops out at ~90% of the season; Casual reaches 11–12. The level starts again each season and says so on screen ("Season Lv N"; the Season tab says "The track starts again at level 1 each season"); the recap keeps what was reached. Lifetime Press Points (`save.pp`) keep counting for sync and never show.

## 5. Missions (brief §47)

Daily: always "Play today's Daily" + two drawn from: get 3 right, a correct Advanced/Confirmed, an Exclusive, beat a rival on a saga, a right call filed by day 3, a Practice board, a Career window, a Market call, right on a twisted saga, a room, share a result. Weekly (Mon–Sun UTC): 5 Dailies, 3 Career windows, 2 rooms, 5 Market calls, 2 Exclusives, 12 right. Counters: `advRight` (s ≥ 1 and right), `rivalBeat` (right where a rival posted wrong or later), `early` (right, day ≤ 3), `share` (`onShared`). Removed: "ring the physio/spotter/barber/agent N times" (they pushed bad play in ranked modes).

## 6. Credits

- Earn (client and server identical): first Tier 1 **30** · every 30-day streak **40** · season end **25** · referred friend's first window **30** (friend). Idempotent per key; pushed to v4 `wallet.earn` once `WalletSync` is attached.
- Spend: epic/legendary looks (110–320), season sets (90–180), Season Pass **350** (= the €4.99 pack), name your paper 150, gifts (usual price), all refundable 48 h.
- Packs (when `PAYMENTS.enabled`): 100 / €1.49 · 350 / €4.99 · 800 / €9.99 · 1,800 / €19.99. Until then the Store shows them as a price list under "How to earn credits"; no buy button anywhere.
- Credits never buy coins, calls, sources, reliability or score (§22, §24).

## 7. Cadences (brief §46)

| Cadence | Economy hooks |
|---|---|
| Daily | Daily coins and XP, 3 daily missions (reset 00:00 UTC), Daily prize read back next day |
| Multi-day | streak (grace days), Market settlements (coins + XP), room rounds (XP, mission) |
| Weekly | 6 weekly missions (Monday UTC), featured rotation (15% off, Monday), new drops (Monday) |
| Seasonal | season track (free lane, Season Pass lane), limited set, season-end credits, recap |
| Long term | trophies, contact levels, rival scalps, follower milestones, earned-only looks |

## 8. Handoffs

- Career lane: call `buyFavour()` / `favoursLeftToday()` (`lib/wallet.ts`) from the Favours tray; `FAVOUR_COST` 15, 3 a day.
- Market lane: consider `STAR_COINS` 10/15/25/40 (§3 model assumes it); Deadline Day Live still grants `dd.*` looks via `grantEarned`.
- Platform: `PAYMENTS.enabled` + `setPurchaseFlow` + v4 `wallet.purchase.verify` turn payments on; `setWalletSync` turns on server-side credits. `api/tier-one/v4/config/catalog.json` cosmetic entries (card.foil …) are an older server-side draft that does not mirror the client catalog; until server spends exist, the client catalog is the source of truth.

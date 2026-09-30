# Tier One: the business plan (3.4, "credits that mean something")

Owner's brief: it's a business, so there should be ways to make money, but it must never feel like a cash grab.
This document is the plan for that. It pairs with `GOTY.md` §3 and §8.4, `web/src/lib/catalog.ts` (the one catalog),
`web/src/lib/wallet.ts` (the ledger) and `screens/Customize.tsx` ("Your desk").

The one-line version: **we sell the way your name looks, never how well it does.** The Daily stays server-scored
and identical for everyone; nothing bought reaches a board, a source or a score. Money buys looks, Gold and a
paper's name, and the player can see every one of them before paying.

## 1. Two currencies, plainly named

| | Coins | Credits |
|---|---|---|
| How you get them | Playing: missions, level rewards, streaks, contact level-ups, rival scalps, season banked coins | Bought in packs. Rarely earned: first Tier 1 (30), every 30-day streak (40), season end (25, +25 at level 40), a referred friend (30 each) |
| What they buy | Stock and special looks (most of the catalog), coffees, Career favours | Collector's and one-off looks, season-limited sets, Gold, naming your paper, gifts |
| Where they live | `save.credits` (legacy field name) + `save.ledger` | `save.wallet.credits` + `save.wallet.ledger` (idempotent keys; the v4 server replays it) |

Every special-tier item carries **both** prices, so a player who never pays can still dress most of the desk with
coins. Credits buy the rarest looks, the season's limited set, Gold and the paper name. That is what makes credits
"mean something" without making coins feel worthless.

## 2. Pricing

### Credit packs (honest tiers; `CREDIT_PACKS` in wallet.ts)

| Pack | Credits | Price (EUR) | Per credit | Bonus vs smallest |
|---|---|---|---|---|
| Starter | 100 | €1.49 | 1.49c | – |
| **Gold** | **350** | **€4.99** | 1.43c | +4% (exactly one Gold season) |
| Desk | 800 | €9.99 | 1.25c | +19% |
| Newsroom | 1,800 | €19.99 | 1.11c | +34% |

Rules: no pack above €20 (no whale tier), bonuses grow slowly, and the middle pack is Gold's price so **Gold costs
the same however you pay** (350 credits or €4.99 direct). Credits never expire. Prices are shown in euros in the
client; the stores set regional tiers.

### Gold (per season, cosmetic only)

€4.99 or 350 credits, one payment, this season only. Eight Gold-lane looks on the 40-level track and +10% coins on
what you earn. It never sells score, sources, contacts or Daily advantage (GOTY §3). Four seasons a year means a
committed player spends at most €20/year on Gold.

### Catalog price bands (`lib/catalog.ts`)

| Rarity | In-world name | Typical price | Examples |
|---|---|---|---|
| common | Stock | 100–180 coins | inks, rings, flair, the standard looks (free) |
| rare | Special | 250–400 coins **or** 50–80 credits | red-top / broadsheet cards, press-pass skins, ticket frame |
| epic | Collector's | 110–180 credits | wire/night sets, season-limited set (150–180) |
| legendary | One-off | 200–320 credits | the gilt set |

The **featured rotation** is three items a week, one per kind, at an honest 15% off, deterministic by ISO week and
never the same item two weeks running. Nothing "leaves" and nothing is marked up first: next week it costs its usual
price. The **season set** (a byline card, a masthead, a poster frame, plus the track/Gold items) is on sale only
inside the real season dates, with a real countdown, and each season's set is a different item id.

### Regional notes

- **Egypt (AR-EG)**: Google Play's local tier for €1.49 lands around EGP 75–90; the €4.99 Gold tier around
  EGP 250–300. Keep the two smallest packs on the store's lowest recommended tiers; do not hand-set a higher local
  price. Web checkout (Stripe) should use Purchasing Power Parity coupons, applied automatically by country.
- **Spain and the EU**: shown prices include VAT; €4.99 is the anchor. Apple/Google take 15% (small-business
  programme) or 30%; Stripe on the web ~3%. The web build is the better margin, so the site should sell Gold and
  packs directly and the app should deep-link to it where store policy allows.
- **Everywhere**: one price list, one catalog; the server's `config.get` (v4) can lower a region's tier, never raise
  it above the EUR list.

## 3. What credits buy (the catalog kinds)

Byline card designs · byline flair · post frames · stamp inks · desk editions · ringtones · press-pass skins · film
poster frames · share-card styles · newsroom mastheads · naming your paper · Gold.

Everything bought shows up everywhere (`wallet.equipped(kind)`, `bylineStyle(save)`, `shareStyle(save)`,
`posterStyle(save)`, `pressPassStyle(save)`, `mastheadStyle(save)`, `paperName(save)`): Me, results, share cards, room
and newsroom tables, film overlays. A purchase that only shows on the store screen is worth nothing; that is why
"Your desk" is a live preview and the helpers exist.

Refunds: any purchase can be refunded from the ledger within 48 hours (the item comes off; Gold once no Gold reward
has been claimed). The refund rate is a KPI, not a cost centre: a high rate means a preview lied.

## 4. Conversion points in the loop

Nothing pops a shop in the play surface. Money is offered at the moments a player is proud of their name:

1. **First Tier 1** — the first credits arrive for free (30). The results screen's byline line can offer "dress your
   card" (a link to Your desk), which now has enough credits to try a special look with coins or credits.
2. **Season end** — the recap card shows the season's set with its real countdown for the *next* season and the Gold
   preview. Season-end credits (25/50) land the same day.
3. **Newsroom masthead** — a newsroom of up to 20 players wears one masthead; founders buy it, members see it every
   week on the combined table. Gifting inside a newsroom (credits only, by friend code) is the social purchase.
4. **Share card** — the scoop card carries the style, the frame and the paper name. It is the free advertising and
   the reason share-card styles are priced above byline cards.
5. **Referral** — `?ref=CODE`: both players get 30 credits when the friend finishes a first window. The server pays
   the referrer after verification, so the client can never mint credits for itself.

## 5. Retention levers (which make the money possible)

- The Daily streak with grace days and a real cost of missing (§7.2), credits at 30-day marks.
- Real-calendar seasons with a 40-level track and a set that goes away: a reason to log in each season, not a
  reason to pay to skip anything.
- The weekly featured rotation: a reason to look at the desk once a week.
- Gifting and newsrooms: a friend's gift is a return trigger.
- The morning papers recap, the Feed and Next up: every session ends with the next thing to do.

## 6. KPIs to watch

| KPI | Target at 90 days | Why |
|---|---|---|
| D1 / D7 / D30 retention | 45% / 20% / 9% | The Daily is a habit product; D7 is the number that matters |
| ARPDAU | €0.02–0.04 | Cosmetic-only games sit here; higher means we're pushing |
| Payer conversion | 2–3% of MAU, Gold ≥ 60% of first purchases | Gold is the honest entry point |
| Refund rate | < 3% of purchases | A preview that lies shows up here first |
| Referral completion | 25% of captured `?ref` links finish a window | Measures the friend's first session, not the link |
| Featured lift | 1.5× purchases of featured items vs their off-week | The rotation should nudge, not dominate |
| Gift share | 10% of credit spend | Social purchases retain both players |
| Support tickets per 1k payers | < 5 | Purchases survive reinstalls (server entitlements, §8.3) |

Telemetry is batched and PII-free (§8.3): purchase, refund, gift, referral, featured-view events with item ids only.

## 7. The "never" list

- **No pay-to-win.** Nothing bought changes a Daily board, its sources, its score, a room or a league. The Career
  conveniences in §1.2 are earned by contact level, never sold. The catalog's `Item` type has no field that could
  hold an effect, and the test refuses any that appears.
- **No timers you pay to skip.** No energy, no cooldowns, no "wait or pay".
- **No loot boxes, gacha, mystery bundles or randomised rewards for money.** Every item is named, previewable and
  fixed-price.
- **No fake discounts.** The featured price is the only discount; the usual price is shown beside it and returns the
  week after. No "was €9.99" that never was.
- **No countdown pressure except the truth.** Season sets end on the real season date and say so in days; the
  featured strip ends on Sunday and says so. Nothing else counts down.
- **No pack over €20, no whale tiers, no VIP levels.**
- **No ads in the Daily, no interstitials, at most one rewarded ad a day after solo results** (§3), behind `MONET.ads`.
- **No selling to children's accounts** (age gate before any purchase flow) and no dark-pattern cancel flows for
  Gold: one payment, one season, done.
- **No purchase without a verified payment flow.** `MONET.enabled` stays false until Play Billing / Stripe
  verification exists; the UI says "Not on sale yet" rather than pretending.

## 8. 12-month platform roadmap (additions drop into the catalog; no client release needed for most)

| Month | Addition | Ships through |
|---|---|---|
| 1 | v4 wallet + entitlements live; Stripe Checkout on the web; sandbox mode | api lane; `setWalletSync`, `setPurchaseFlow` |
| 2 | Google Play Billing in the Android wrapper; regional tiers | api lane + store console |
| 3 | Deadline Day Live (winter, 2 Feb): an event masthead and poster frame for everyone who plays it (earned) | `config.get` catalog items with `source: 'event'` |
| 4 | Creator codes: a referral code tied to a creator pays them a share of the credits their referred players buy, in credits or cash | server referral ledger + a creator dashboard |
| 5 | Newsroom mastheads v2: a newsroom votes its masthead; newsroom-only gifts; "founder" flair | press box lane + `setGiftDirectory` / `setGiftCourier` |
| 6 | Spring set, first **collab set** with a real football media brand (cosmetic, licensed) | `config.get` |
| 7 | New kind: **caller-card frames for the five sources** (contact Lv2 frame becomes a family) | `catalog.ts` Kind + Customize tab |
| 8 | New kind: **desk objects** (a mug, a lamp, a trophy shelf style) shown on the desk stage and Home | as above |
| 9 | Summer set; **Gold+ for the year** (four seasons for €14.99, still cosmetic only) | wallet: one entitlement, four `gold.<season>` ids |
| 10 | **Beat-my-board wagers in coins** (never credits, never Daily): stake coins on a challenge link, winner takes the pot minus nothing | press box lane |
| 11 | Seasonal **charity masthead**: a limited masthead whose proceeds go to a named cause, shown on the item | `config.get` + accounting |
| 12 | The Rumour Mill set '27; year-in-review share card; first anniversary one-off for every day-1 account (earned) | `config.get` |

Every line above is a catalog entry, an `earn` hook or a config flag. None of it changes a score.

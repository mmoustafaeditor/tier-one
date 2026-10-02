# K · Store (Tier One 3.8)

Living spec, brief §53 part K. Code: `web/src/screens/Customize.tsx` (the screen), `web/src/ui/customize.tsx` (pieces), `web/src/lib/catalog.ts` (the one catalog), `web/src/lib/wallet.ts` (buy/equip/gift/refund), `web/src/styles/customize.css`.

## 1. Decisions (brief §23–24, §35)

| | Decision | Why |
|---|---|---|
| Shop (Home) + "Pass & store" (My Press Card) | **MERGE** into one Store at `{ n: 'customize' }`; the old `{ n: 'pass' }` route opens its Season tab | §23, §35 duplicate stores. |
| Top-level sections | **Featured · Cosmetics · Season · Owned** | §23. |
| 19 categories at once | **REMOVE**; progressive browsing: group (Byline · Desk · Newsroom) → kind chips → 6 tiles a page | §23. |
| "Game modes" tab (favours, coffee, rename) | **REMOVE** from the Store; favours via `buyFavour()` in the Career tray, coffee in Contacts, rename in Career | §24: the Store sells identity only. |
| Gold | **REWORK** → Season Pass: 8 looks on the track, 350 credits, no coins, no bonus | §8 reserves gold; §22 premium = identity. |
| Friends & receipts | **KEEP** behind a sheet (Owned › Receipts): ledger with 48 h refunds, gifts outbox, bring a friend, our promise | Not worth a tab; still useful. |
| Collection book | **KEEP** behind a sheet (Owned › Collection), paged two sets at a time | |
| Featured rotation | **KEEP, FIX**: three items a week, one per kind, 15% off, exact "never two weeks running" (walks forward from the epoch week) | The old pick could repeat an item in consecutive weeks. |
| Weekly-event looks (`ev.*`) | not listed; owners keep and equip them from Owned | §34. |
| Referral lamp (`rf.3`) | **REMOVE** (unobtainable without server-confirmed referrals) | §35 nothing fake. |

## 2. Layout (one viewport at 390×664; no page scroll)

Top bar: Back (top-left) · "Shop" · menu. Then the wallet strip (coins, credits, "Get credits" when payments are on, else "How to earn credits"), then the four tabs.

- **Featured**: this week's three (15% off, usual price shown struck through), New this week (≤ 3), Last chance (≤ 3, honest countdown, vault badge), the fairness line. Tapping a card opens the item sheet.
- **Cosmetics**: currency filter chip when opened from the top bar's coin/credit button; group chips; kind chips (scrollable); the try-on stage (max 24 vh on phones); 3×2 tiles with ‹ 2/5 › pager; the action bar (name · price/state · Buy or Put on · More). "More" opens the item sheet (both currencies, gift, pin to byline, hear it, name your paper). Catchphrase kind adds a pen button → "Your line" sheet (write your own from Chief rank).
- **Season**: recap (when pending), the season masthead with level N of 40 and "starts again at level 1 each season", Next up (you + next 3 levels, Claim / Claim all), the Season Pass card (preview of 4 looks, buy with credits, or "How to earn credits"), the limited set strip with countdown.
- **Owned**: All (n) + kind chips for what you own, 3×2 tiles, action bar (Put on / Take off / More), then Collection and Receipts buttons.

## 3. Price ladder

| Rarity | Coins | Credits |
|---|---|---|
| Common (lamps, feed skins, flair) | 100–180 | — |
| Rare (cards, mastheads, press passes, frames, headline fonts, ring packs) | 250–400 | 50–80 |
| Epic | — | 110–140 (season set 120–180) |
| Legendary (gilt family) | — | 200–320 |
| Catchphrases | — | 60–150; season line 90 |
| Season Pass | — | 350 (one €4.99 pack) |
| Name your paper | — | 150 |

Featured: 15% off, rounded to 5, never above the usual price. Season sets leave at season end; vault returns are one ISO week, at the usual price, never inside their own season. Everything refundable within 48 hours.

## 4. What the Store never sells (brief §24)

Contact points, source reliability, extra ranked calls, score multipliers, Exclusives, coins. The `Item` type has no field for an effect; `validateCatalog()` refuses unknown keys and refuses a priced earned item.

## 5. Strings

New copy in `i18n/parts/economy38.ts` (en / ar Egyptian / es): sections, groups, Season Pass, Owned empties, Receipts, honest payments copy, mission labels, and overrides of dead base text (Semba Pass, "Earn 500 credits", "Lv N" → "Season Lv N", contact L3 discount, leagues in Settings).

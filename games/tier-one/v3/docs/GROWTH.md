# Tier One · Growth: the long tail (3.4)

Cosmetics keep the desk fresh between windows. Rules: GOTY.md §8.4 (no pay-to-win, honest prices) and §12 (game first,
one clear action). Catalog: `web/src/lib/catalog.ts`; server overrides: `api/tier-one/v4/config/catalog.json`
(`drops`, `rails`, `vault`, `earnedOnly`), validated by `validateCatalog()` in `api/_lib/config.mjs`.

## Drop calendar (Mondays, UTC)

| Date | Drop |
|---|---|
| 28 Sep 2026 | Broadsheet serif headline, Amber lamp, Memo + Ticker feed skins, two signature lines |
| 5 Oct | Dawn lamp, Newsroom ring pack, "boots" line |
| 12 Oct | Red-top slab headline, Red-top feed skin · vault: Spring '26 byline |
| 19 Oct | Neon lamp, Broadsheet + Red-top front pages, "photos" line |
| 26 Oct | Wire mono headline, Terrace ring pack |
| 2 Nov | Stadium ring pack, Wire front page, "shut" line |
| 9 Nov | Stencil headline |
| 16 Nov | Night feed skin · vault: Winter '26 poster |
| 23 Nov | Gilt lamp |
| 30 Nov | "Kettle" line (legendary) |
| 7 Dec | Gilt front page |

Each season brings a seven-piece limited set (byline, masthead, poster, headline, lamp, feed skin, line) that leaves
at season end. The vault brings one past piece back for one week at most, at its usual price, dates shown.

## Never list

- Nothing changes a Daily board, its sources, a score, a streak or the clock. Items have a closed key list; the server
  refuses effect-like keys.
- No loot boxes, no random rolls, no fake scarcity: every countdown is the item's real window.
- No "HERE WE GO" on screen; the catchphrase replaces it.
- Earned-only looks (story chapters, Chief and Tier One rank, 30/100-day streaks, rivalry trophies, referrals) are never
  sold, gifted or dropped in the store.
- No discount other than the weekly featured 15%.

## Earn vs buy

- Earn: house catchphrases by rank, streak and chapter; your own line from Chief; rank, streak and rivalry looks; season
  track. Granted the moment the event fires (`lib/earnhook.ts`), announced on Your desk.
- Buy: signature lines, headline fonts, lamps, ring packs, feed skins, front pages, season sets. Coins for rare and
  under; credits for epic, legendary and season pieces.

## KPIs

- Weekly desk visits per DAU; share of DAU with one non-standard look equipped.
- Drop-week conversion (buyers of the new item / desk visitors that week).
- Collection book: median sets completed; earned-only owners as a share of WAU.
- Custom catchphrase: Chief players who write one; server refusal rate.
- Guardrails: refund rate under 3%; no change in Daily completion or D7 retention between buyers and non-buyers.

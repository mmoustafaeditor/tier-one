# Semba football data: schema, endpoints and legal rules

One snapshot of real football facts that both games (Tier One and The Gaffer) read: leagues, clubs, current squads,
confirmed transfers and open transfer rumours. The snapshot is **researched, not bought**: `data/tools/refresh.mjs`
rebuilds squads and confirmed transfers from public fact pages, and people/Claude sessions add rumours by hand in
`data/curated/`. A weekly refresh keeps it current (see [`REFRESH.md`](REFRESH.md)).

```
data/
  seed/        the published snapshot (served by /api/data/*): meta, leagues, clubs, players, transfers, rumours, sources, fictional
  curated/     hand-researched inputs merged on every build: rumours.json, transfers.json, overrides.json
  tools/       refresh.mjs (build), validate.mjs (diff + checks), rumour-sources.mjs (pluggable feeds), clubs.config.mjs
  tests/       node --test data/tests/*.test.mjs
api/data/      snapshot.js, rumours.js, transfers.js, health.js (+ _lib: normalizer, store, heat, names, ids)
```

## Conventions

- Dates are ISO `YYYY-MM-DD` (UTC). Money is `{ value, currency }` in whole units (`value: 34500000, currency: 'GBP'`).
- Nationalities are FIFA trigrams (`ENG`, `ESP`, `EGY`). Positions are `GK | DF | MF | FW`.
- `confidence` is on every club, player, transfer and rumour: `high` (cross-checked), `medium` (one good source), `low`
  (conflicting or thin sources: show it, but don't build a storyline on it).
- Every file carries or inherits an `asOf` (`meta.json › asOf` = squads/transfers build date, `curatedAsOf` = rumours).

## Stable ids

Ids never change once published (the validator blocks a club id disappearing).

| Thing | Id | Example |
|---|---|---|
| League | country + tier, same as The Gaffer | `eng1`, `esp1`, `egy1`, `ksa1` |
| Club | league country + slug, fixed in `clubs.config.mjs` | `eng-arsenal`, `ksa-al-hilal` |
| Player | `p-` + slug of the player's reference-article title (unique, survives transfers); unlinked players: `p-<name>-<birthdate>` or `p-<name>--<first club>` | `p-bukayo-saka`, `p-ben-white-footballer` |
| Transfer | `t-<date>-<player slug>-<destination>` | `t-20260821-ezri-konsa-eng-arsenal` |
| Rumour | `r-<player slug>-<window>` | `r-alex-scott-202701` |

## Records

**League** `{ id, name, country, tier, season, partial }` (`partial: true` = only the top clubs are covered: Egypt, Saudi).

**Club**
```json
{ "id": "eng-arsenal", "name": "Arsenal", "shortName": "Arsenal", "code": "ARS", "country": "ENG", "leagueId": "eng1",
  "colors": { "primary": "#F00000", "secondary": "#FFFFFF" }, "gameIds": { "gaffer": "eng_lgu" },
  "squadSize": 23, "confidence": "high", "asOf": "2026-09-29" }
```
Colours are the home-kit facts (shirt, then first different of shorts/sleeves/socks). **No crests, logos, kits or photos are
stored anywhere**; the games draw their own original badges and kits from these colours.

**Player**
```json
{ "id": "p-bukayo-saka", "name": "Bukayo Saka", "shortName": "Saka", "nationality": "ENG", "birthDate": "2001-09-05",
  "position": "FW", "clubId": "eng-arsenal", "shirtNumber": 7, "contractEnd": null, "loan": null,
  "refs": { "wiki": "Bukayo Saka", "wikidata": "Q..." }, "confidence": "high" }
```
`clubId` is the club he plays for this season. On loan in: `loan = { direction:'in', fromClubId|fromName, until }`.
Loaned out to a club we don't track: `clubId` is the parent club and `loan = { direction:'out', toName }`; these are hidden
from `/snapshot` unless `&loans=1`. `contractEnd` is filled only when a source states it.

**Transfer** (confirmed only)
```json
{ "id": "t-20260821-ezri-konsa-eng-arsenal", "playerId": "p-ezri-konsa", "playerName": "Ezri Konsa",
  "fromClubId": "eng-aston-villa", "fromName": "Aston Villa", "toClubId": "eng-arsenal", "toName": "Arsenal",
  "date": "2026-08-21", "type": "transfer", "fee": { "value": 51000000, "currency": "GBP" }, "feeText": "£51m",
  "window": "2026-summer", "sources": ["https://…official club announcement…"], "confidence": "high" }
```
`type`: `transfer | loan | free | undisclosed | loan-to-buy`. `fee` only when publicly reported. At least one side is a
tracked club; the other may be any club (`fromClubId: null, fromName: 'Club Brugge'`). A few moves only have a month-level
source and carry `date: null`; `?since=` skips those.

**Rumour**
```json
{ "id": "r-alex-scott-202701", "playerId": "p-alex-scott-footballer-born-2003", "playerName": "Alex Scott",
  "currentClubId": "eng-bournemouth", "currentClubName": "Bournemouth",
  "linked": [{ "clubId": "eng-chelsea", "name": "Chelsea", "stage": "interest" }],
  "fee": { "min": 70000000, "max": 80000000, "currency": "GBP" }, "window": "2027-01",
  "fact": "Chelsea named as keen on Bournemouth midfielder Alex Scott for January.",
  "outlets": [{ "name": "BBC Sport", "tier": 1, "url": "https://…", "date": "2026-09-29" }],
  "credibility": "strong", "firstSeen": "2026-09-12", "lastSeen": "2026-09-29", "status": "open", "confidence": "medium" }
```
- `stage`: `interest | talks | bid | agreed`. `window`: `2027-01` (January) or `2027-summer`.
- Outlet `tier`: 1 = club/league official, BBC, Sky, The Athletic, Fabrizio Romano-level; 2 = national papers and big sports
  sites (Telegraph, ESPN, SI, Marca, Bild, Sport…); 3 = aggregators/tabloid sites (Sports Mole, TEAMtalk, Football365…);
  4 = social accounts / low-reliability sites. `url` may be the page where we read a report credited to `name`.
- `credibility` bucket: `strong` (a tier-1 outlet, or tier 2 with 3+ outlets), `solid` (tier 2, or 3+ outlets),
  `speculative` (tier 3 only), `weak` (tier 4 only).
- `firstSeen`/`lastSeen`: first/last date the rumour was reported or re-checked by our research.
- `status`: `open | confirmed | dead`. The API shows an open rumour as `dead` once `lastSeen` is 60+ days old.
- `heat` (0–100, added by the API): best outlet tier + number of outlets + deal stage + January bonus, halving every
  14 days since `lastSeen`. `/rumours` sorts by it.

## Endpoints (Vercel functions, `GET`, CORS open, JSON)

| Endpoint | Returns | Cache |
|---|---|---|
| `/api/data/health` | `{ ok, asOf, curatedAsOf, season, names, ageDays, stale, counts, confidenceHighPct }` | `no-store` |
| `/api/data/snapshot` | all leagues + clubs (no players) | CDN 1 h, stale 1 day |
| `/api/data/snapshot?league=eng1` | that league's clubs + squads (`&loans=1` adds loaned-out players) | same |
| `/api/data/snapshot?club=eng-arsenal` | one club + squad | same |
| `/api/data/rumours` | open rumours by heat; `?club=`, `?window=2027-01`, `?status=all`, `?limit=` | same |
| `/api/data/transfers?since=2026-07-01` | confirmed moves, newest first; `?club=`, `?league=`, `?type=`, `?limit=` | same |

Every body starts with `{ ok, asOf, season, names }`. Errors: `{ ok:false, error }` with 400/404/405/503.
Responses carry an `ETag`; nothing secret is ever read into a response.

**Names switch.** Set `SEMBA_DATA_NAMES=fictional` in Vercel to serve fictional names everywhere with no other change:
clubs take The Gaffer's own near-real names (`data/seed/fictional.json`, built from its `clubs.ts` by
`data/tools/fictional.mjs`), players get deterministic invented names, reference links/sources/rumour text are dropped.
Ids, colours, positions, ages and numbers stay the same, so saves keep working when the switch is flipped.

## Sources and legal constraints

- **Facts only.** Squad lists, shirt numbers, positions, nationalities, birth dates, transfer dates/fees and kit colours
  are facts. We store them in our own structure and never copy prose, tables' layout, photos, crests or logos.
- **Reference sources.** Squads and confirmed transfers are cross-read from English Wikipedia article revisions (the
  articles cite official club and league announcements; text is CC BY-SA, we keep only facts plus the article URL in
  `sources.json`) and birth dates from Wikidata (CC0). The refresh tool fetches raw pages slowly (one every 2 s, cached,
  identified User-Agent) as Wikimedia asks.
- **Not scraped.** Sites whose terms forbid automated collection (e.g. Transfermarkt, most club and news sites) are never
  fetched by tools. People may read them while researching, but only facts go into the files.
- **Rumours.** We store who/where/fee/outlet/date and a link. The `fact` line is written by us, short and neutral
  (e.g. "Chelsea named as keen on…"), never a quote or headline; no article text, images or paywalled content.
  Automatic sources (`rumour-sources.mjs`) may only read official RSS/Atom feeds whose terms allow it, keep headlines in
  memory only, and produce candidates that a person accepts before anything is published.
- **Real names.** Player and club names are used factually (nominative use). No real badges, kits, sponsor marks or
  player images appear in either game; `SEMBA_DATA_NAMES=fictional` removes real names if a rights holder asks.
- Rumours are about football moves only; never health, private life or anything defamatory. Low-credibility items are
  labelled as such in the games.

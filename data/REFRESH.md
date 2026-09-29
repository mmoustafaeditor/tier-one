# Weekly data refresh (checklist)

The snapshot in `data/seed/` is the games' only football-data source (no paid API). Refresh it **every week**, and on
transfer deadline days. A Claude Code session can do the whole thing; it takes ~15 minutes, mostly waiting.

`/api/data/health` says `stale: true` once the snapshot is 10+ days old; rumours lose heat every 14 days and read as dead
after 60 days without a re-check, so a skipped week shows in the games.

## 1. Squads and confirmed transfers (automatic)

```bash
node data/tools/refresh.mjs                 # ~130 pages at 2 s each + Wikidata birth dates (~10 min first time, cached after)
node data/tools/validate.mjs                # diff vs the last committed snapshot
```

- Covers every club in `data/tools/clubs.config.mjs` (all of the Premier League, La Liga, Serie A, Bundesliga and Ligue 1, plus
  the top 6 in Egypt and Saudi Arabia). At season change, update the members there (promoted/relegated clubs), keeping the ids
  of clubs that stay. New clubs get a new id; never reuse or rename one.
- Useful flags: `--only eng1,esp1` (one league), `--no-wikidata`, `--curated-only` (no network; re-merge `data/curated/`),
  `--out /tmp/x` then `validate.mjs --new /tmp/x`.
- Wikipedia/Wikidata sometimes rate-limit (HTTP 429). The tool backs off and retries; `WIKIDATA_GAP_MS` (default 65 s)
  spaces the birth-date queries. Just re-run: pages are cached in `data/tools/.cache/` for 12 h (`WIKI_CACHE_HOURS`).

## 2. Read the validator report

`validate.mjs` exits 1 on **errors** (don't publish): duplicate/missing ids, a club vanishing, a squad under 16, the
player count falling more than 10 %, `asOf` going backwards. **Warnings** need a look:

| Warning | What to do |
|---|---|
| `club changes with no transfer on record` | Check the move on the club's official site or a major outlet. If real, add it to `data/curated/transfers.json`. If the source page is wrong, add an override. |
| `big squad churn` | The club page was probably restructured or vandalised. Compare with the official squad page; pin with overrides or `squadTitle` in the config. |
| `club confidence low` | The squad list looks stale (summer signings missing, sold players still listed). Fix by hand with `overrides.json`. |
| `N first-team players (academy rows mixed in?)` | Fine for the games (they pick the top of the list), but trim via `overrides.json › exclude` if it matters. |
| `rumour … not re-confirmed for N days` | Re-search it: update `lastSeen` + outlets, or set `"status": "dead"`. |
| `… is now at … — mark confirmed` | Set `"status": "confirmed"` on that rumour. |

Corrections go in `data/curated/overrides.json`, never straight into `data/seed/` (the next build would undo them):

```json
{ "players": { "p-some-player": { "clubId": "eng-chelsea", "shirtNumber": 10, "confidence": "high" } },
  "clubs": { "esp-real-madrid": { "colors": ["#FFFFFF", "#FEBE10"] } },
  "exclude": ["p-an-academy-kid"],
  "addPlayers": [{ "name": "New Signing", "clubId": "egy-al-ahly", "position": "FW", "nationality": "EGY", "confidence": "medium" }] }
```

## 3. Rumours (by hand, ~10 min)

1. Search the week's transfer talk for the tracked clubs (major outlets, club-beat reporters; Egypt and Saudi too).
2. In `data/curated/rumours.json`, for each rumour: update `lastSeen` and add the new outlet `{ name, tier, url, date }`;
   add new ones with player, current club id, linked club ids + stage, fee range if reported, window, and a one-line
   `fact` **in our own words**; close ones that happened (`confirmed`) or died (`dead`).
3. Tier and confidence rules: see `SCHEMA.md › Rumour`. One tabloid source = `confidence: low`.
4. Optional: `node data/tools/rumour-sources.mjs` lists candidates from the RSS feeds configured there (facts only).
5. `node data/tools/refresh.mjs --curated-only && node data/tools/validate.mjs`.

## 4. Publish

```bash
node --test data/tests/*.test.mjs                       # quick checks
git add data/seed data/curated data/tools && git commit -m "data: weekly refresh YYYY-MM-DD"
```
Add an `UPDATES.md` entry (counts from `data/seed/meta.json`). Vercel redeploys on push to `main`; the endpoints serve the
new snapshot within an hour (CDN cache). Check `https://sembagames.app/api/data/health` shows the new `asOf`.

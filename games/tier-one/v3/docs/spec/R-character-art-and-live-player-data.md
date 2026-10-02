# R · Character art and live player data (3.8, lane38/market: the data half)

Owner brief: LAUNCH_BRIEF §19, §27, Addendum A (art), Addendum B (live player database) — **as cut by the owner for this release:
no data provider yet, so no live pipeline, cron, adapter or monitoring.** The art half (the `<Portrait>` slot system,
`public/art/manifest.json`) is specified by lane38/core in `R-character-art.md`; this file covers the data.

## Decisions

| Area | Decision | Why |
|---|---|---|
| The data | **KEEP** the snapshot in `data/seed` (`meta.asOf` 2026-09-29: 7 leagues, 108 clubs, 3,603 players, 1,557 transfers, 35 open rumours) as *the* data, served by `/api/data/*` and `api/data/_lib/store.js`. | Owner decision: the provider pipeline waits for a provider. |
| Freshness label | **NEW.** "Squad data as of 29 Sep 2026" on the Market list, the file sheet and (via `wire.board.asOf`) anywhere else; "Squad data: not loaded" when offline. | Addendum B: never present old club information as live fact without a timestamp. |
| Player status | **NEW** `playerStatus(snap, id)`: `club` (on a covered roster) · `loan` (roster line with `loan.direction: 'in'`, parent club shown) · `free` (positive evidence only) · `unknown` (not in the snapshot). The Market shows On loan from X / Free agent / Status not verified beside the kit; a plain club player shows nothing. | Addendum B: a blank club never means free agent; unknown is unknown. |
| Free agents | **NEW** `freeAgentsOf(snap)` = players with no roster line whose latest dated transfer has no destination club and a destination name that reads as a release (unattached / free agent / released / without club / sin equipo / svincolato / libre). Today's snapshot has **0** (its 24 null-destination moves read "TBD", 7 arrivals came *from* "Unattached"), so the Free agents filter says so honestly: "No confirmed free agents in the squad data as of 29 Sep 2026." Free agents are status rows, never callable (a call needs a live rumour). | Never invent free agents. The filter is discoverable (a chip) without the weight of the Daily CTA. |
| Art binding | Portrait slots in the Market rows and the file sheet are marked for `<Portrait kind="player" id={playerId} club={from} />`; name, club, status, position, nationality are live text from the snapshot. | Addendum A: nothing baked into art. |
| Frozen boards | Unchanged and preserved: the Daily board, DD Live boards (`t1v3:dd:board:<day>`) and every Market call lock their player identities, club context, price and room share when created; a snapshot refresh changes none of them. | Addendum B acceptance 5. |

## What a future provider integration needs (five lines)

1. A licensed roster feed with stable provider ids; add `refs.<provider>` crosswalks on `players.json` and never key on names.
2. A staging → validate (`data/tools/validate.mjs`) → atomic publish step that writes a new `data/seed` version with `meta.asOf`, and a change log with before/after and source URL per field.
3. A source-priority rule in `normalize.js`: official registration > provider roster > rumour stage; rumours never change `clubId`.
4. Explicit statuses on the player record (`club | loan | free | retired | unknown`, with `since` and `lastClubId`) so `playerStatus` reads a field instead of inferring from transfers.
5. A scheduled job (daily full, 6-hourly in a window) with retry/backoff and a `health.js` that reports last run, stale age and record deltas; the client already shows `asOf` and keeps the last good copy.

## Exported APIs others rely on

- `world.mjs › playerStatus(snap, playerId)`, `freeAgentsOf(snap)`; `wire.board › items[rid].ps / loanFrom`, `freeAgents[]`, `asOf`.
- `lib/wireData.ts › WireState.freeAgents / asOf`, `PlayerStatus`, `FreeAgent`; strings `mk.squadAsOf`, `mk.status.*`, `mk.fa*`.

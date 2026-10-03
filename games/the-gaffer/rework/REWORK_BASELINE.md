# The Gaffer rework — baseline (Milestone 0)

Source of truth for this rework: *The Gaffer — Opus 5.5 Focused Master Rework Handoff (V3)* (the "handoff"), the
Full Feature Guide (v2.2.0, build 29849616, made from this repo in the previous session) and this repository.

## Build, data, save

| Item | Value | Where |
|---|---|---|
| Web version | 2.2.0 | `web/package.json` (Android versionName comes from it) |
| Baseline source | `6f56572` (main merged into `claude/repo-coordination-lbro4r`; last Gaffer change B4 `f41db83`) | git |
| Live build at baseline | 29849607 (`the-gaffer/version.json`) | the site |
| Save format | `SEMBA_GAFFER_SAVE`, `SAVE_VERSION` 8 (`src/sim/upgrade.ts`), sha-256 checksum, gzip+base64 `GZ1:` | `src/sim/save.ts` |
| Slots | 2, IndexedDB `semba-gaffer/slots` (localStorage fallback `gaffer.slot.<n>`), mirror `gaffer.backup.v2`, live match `gaffer.live.<n>` | `src/sim/slots.ts` |
| Data | real 2026/27 snapshot (`src/data/real.ts`), 7 real leagues + generated ones; fictional-name mode | `src/sim/seed.ts`, `src/sim/renames.ts` |
| Engine fingerprint | `a04af554a49efa49` (200 seeded matches) | `sim-tests/fingerprint.ts` |
| Season (seed 7, all leagues) | 5,784 matches, 2.87 goals/game, home wins 44.5%, draws 22.8%, 20.3 s on this container | `sim-tests/season.ts` |

Benchmarks above were measured in this cloud container (Node 22, no named device); they are not phone numbers.

## Test baseline (before any rework change)

`npm run typecheck`: clean. 43 sim tests (`node sim-tests/build.mjs <name>`): 42 pass; `marking` fails one check
("man-marking at corners concedes fewer headed chances than zonal") at its default 1,200 matches per style — the same
check passes at 4,000 (recorded as sampling noise in the previous session, not a regression). UI tests in `ui-tests/`
are Playwright scripts against `dist/`.

## Architecture as found

* Domain logic is outside React: `src/sim/**` (pure functions over `World` + `Career`), commands in
  `src/sim/commands.ts` (`dispatch`, validated, emits domain events), decisions in `src/sim/decisions.ts` (+ room,
  youth, recruit, press decision builders), the clock in `src/sim/clock.ts` (`advance`, `simUntil`).
* UI: `src/ui2/**` reads selectors and dispatches commands through `g.run`; routing in `src/ui2/game.tsx` / `App.tsx`.
* Match: zone/graph engine `src/sim/engine/**`, `src/sim/match.ts` (`startMatch`, `simulate`, `predict`); the pitch
  (`src/ui2/pitch/**`) presents the engine's flow and never changes results (fingerprint test).
* RNG: seeded (`src/sim/rng.ts`), passed explicitly; same state + seed → same next state.

## Trust backlog dispositions (F01–F17)

Evidence: `sim-tests/rework/repro.ts` (reproduction, prints OPEN/OK) and `sim-tests/rework/trust.ts` (regression
checks for the fixes). "Observed" = reproduced in this build.

| ID | Disposition | Root cause (proven) | Fix / plan |
|---|---|---|---|
| F01 | reproduced/open → **fixed (M1)** | `staffPrep` cleared `tactics.xi` before every match when match prep was delegated (the default); the assistant's formation change (`tactics.patch`) cleared it again | Manager's XI persists; assistant doesn't re-shape around it; Tactics says whose XI it is; watched+instant = quick for the same snapshot/seed (test) |
| F02 | reproduced/open → **fixed (M1)** | three clocks: header "today" = matchday−2, messages dated by matchday (Sat), cup ties on Wed (before "today"); `due.days` counted matchdays; "Window shuts tonight" on any window card | `todayOf`/`stampDate` (`src/sim/cups.ts`) used by header, Today, News; due labels in matchdays; window cards count matchdays left, "tonight" only on deadline day |
| F03 | reproduced/open → **fixed (M1)** | Today's agent card used `spendingRoom(w,c)` (which already reserves this deal's fee) and subtracted the deal again: the fee counted twice (£19M in the repro) | `dealCost(...).roomAfter` is the one quote; Today and Talks both show it |
| F04 | reproduced/open → **fixed (M1)** | `raiseObjective('title') === 'title'`: "Aim higher" had the same predicate plus owner money | no ambitious option (and the command refuses it) at the top of the ladder; explanation shown; money once, scoped to the club |
| F05 | reproduced/open (M2) | `academy.promote` is one tap; the prospect pledge (10 apps in 20 matchdays or a loan) is added afterwards, never shown | promotion sheet with the commitment |
| F06 | reproduced/open (M2) | `autoXI` fills slots greedily in slot order: Van Dijk at RB while Frimpong sits out (Liverpool 4-3-3) | global assignment + reasons |
| F07 | untested (M2) | — | review the advice builders with score/time/horizon context |
| F08 | reproduced/open (M2) | three outcomes rounded independently (5/18 Egyptian fixtures don't sum to 100) | largest-remainder rounding, ">99%" |
| F09 | reproduced/open → **fixed (M1)** | Today read `c.matches[0]` (the manager's history) and picked "our" side with `home === clubId ? 0 : 1`: after a move the old match reads backwards ("0-2 v Liverpool"); the season vision, old club's instalments and talks followed the manager | `lastMatchHere`; vision scoped to its club; old instalments settled from the old club; old talks end on the move |
| F10 | reproduced/open (M2) | "x of y fit" uses `available()` (injury + league ban): a cup ban for a cup match and tired players count as fit | "available for the next match" with reasons |
| F11 | reproduced/open (M2) | `QuickMatch` `onFinish` → team picker | read-only full-time + analysis, Rematch / Change teams |
| F12 | reproduced/open (M2, design) | half-time screen exists (`HalfTime` in `Live.tsx`); tactical edits apply at once in the Changes sheet, no staged draft | staged half-time draft + Start second half |
| F13 | untested (M2) | — | check season review/career labels at a season end |
| F14 | untested (M2) | — | check chart grouping and digest counters |
| F15 | reproduced/open (M2, design) | courses (`enrol`, `src/sim/coach.ts`) are instant and the card shows only cost | disclose effect/duration/stacking before paying |
| F16 | open (M3, design) | — | contextual conversations within the room system |
| F17 | **not reproduced** (round trip, tamper, future version, junk all handled) → hardened (M1) | slot writes overwrote in place with no previous copy | previous copy kept per slot; `loadSlot` falls back to it and says so |

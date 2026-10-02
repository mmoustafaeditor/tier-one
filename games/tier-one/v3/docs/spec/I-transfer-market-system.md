# I · Transfer Market system (3.8, lane38/market)

Owner brief: LAUNCH_BRIEF §18 (the hardcore mode), §19 (no hard-coded windows), §42 (journalism, not betting), §48 (server-authoritative),
Addendum B as cut by the owner for this release (snapshot only; see spec R). Code: `api/tier-one/v3/_lib/wire.mjs` (scoring, settlement),
`_lib/calendar.mjs` (windows), `index.js › wire.* / ops.calendar / live.dd.*`, `web/src/lib/wireData.ts`, `web/src/screens/Wire.tsx`.

## Position

Daily teaches Tier One; the Market deepens it. It is the one mode where the answer is not on our server: real rumours, real
paperwork, settled weeks later. Words on screen: a *call*, *confidence* (In talks / Advanced / Confirmed), *the Market price*,
*the room*, *Cred*. Never stake, bet, odds, P&L, chips.

## Decisions

| Area | Decision | Why |
|---|---|---|
| Price formula | **KEEP, small REWORK.** `marketOf` = credibility bucket (strong .50 · solid .38 · speculative .25 · weak .15) + stage (talks +.08 · bid +.14 · fee agreed +.30) + **independent outlets** (+.03 each beyond the first, max +.09), clamped 5–95%. Confirmed = 95%. Locked per call when filed. | The snapshot has no calibrated probability yet; the three visible facts a journalist would weigh are the three inputs. Outlets were in the heat score but not the price. |
| Core scoring | **REWORK (the big one).** Right: `max(1 × conf, 10 × (1 − c) × conf) × lead`. Wrong: `−10 × c × conf`. The old "+2 a call" is gone. | Sim (200k calls/archetype, model price off by up to ±15 pts): old formula paid *always-favourite at Confirmed* **+4.0/call** vs a skilled reporter **+2.7**; the season board would rank favourite-spam. New formula: favourites 0.0, random 0.0, skilled **+1.1**, oracle +2.2. Zero expected value at the Market price means only judgment moves the table. The +1×conf floor keeps "right" always feeling like a gain. |
| Confidence | **KEEP** ×1 / ×2 / ×3 as In talks / Advanced / Confirmed, now worded "A lean · More likely than not · You'd stake your byline". | Same ladder as the Daily; the words are the journalist's, not a bookmaker's. |
| Lead bonus | **KEEP** ×1.0 → ×1.25 linear over 28 days between filing and settlement. | Symmetric in c ↔ 1−c at a fair price, so it rewards *earliness* only. Early calling is the journalism. |
| Late-call rule | **KEEP** 6 h: filed within 6 h before the first report of the change → priced as if c ≥ 0.90. | The data's `at` has day resolution; a rumour at "fee agreed" is already frozen to new calls, so this is the backstop, not the gate. |
| Destination / fee extras | **REWORK: risk and reward.** Right club `+6 × conf × (1 − room share on that club)`; named a club and he went elsewhere `−2 × conf`. Right fee band `+2 × conf`; wrong `−1 × conf`. Only when he moves. | Old: +8×conf×(1−share) with no downside = a free option bigger than the main call (EV +6.6 vs the call's ~0). Now EV ≈ +2.3 for a 55% club pick, 0 for a coin flip: "Name it" is a decision. |
| Daily call limit | **KEEP 5/day.** | The pool is ~35–60 live rumours and each takes one call, so the real cap is the pool; 5/day is the ritual and the selection decision ("which five?"). |
| Open-call limit | **REMOVE as a rule** (constant stays at 60 as a storage bound, never shown). | 40 was larger than the whole pool, and a cap that bites would freeze a player for weeks while January settles. One call per rumour already bounds exposure. |
| Correction | **KEEP** one, within 15 min; price stays locked; the room split and the club split move with it. | Typo protection, not a rethink. |
| Settlement | **KEEP, calendar-driven.** Moved = a transfer on record from the rumour's club since first seen (destination + fee band from it); dead in the data = NO on its last-seen day; window shut + `settleGraceH` (72 h) = NO; vanished from the data = VOID (stake back) after the window shuts. Hand overrides win. Window closes come from the calendar, per league when configured. | Nothing is typed in wire.mjs any more. |
| Heat points | **REMOVE.** The "market moved 15 pts your way" reward fed only the invisible weekly league (§35). | Nothing pays for a price twitch; only being right pays. |
| Crowd display | **REWORK → "The room".** `62% YES · 38% NO · 41 reporters`, never names. New: **Against the room** — if your side held < 35% of a room of 10+ when you filed, the sheet says so; when it settles you get a gold "Called it against the room" stamp and a one-tap share (§38, §56: "I went against 90% of the Market and called it"). The room's share is stored on the call at lock (`cRoom`). | The memorable Market moment is beating consensus, not beating a number. |
| Season Cred / table | **KEEP** season board (`t1v3:cred:<season>`, settlement time) · **MOVE** the table into the Market screen as a third tab (`lb.top period 'wire'`, 6 a page), settled calls only, with "You: #r · Cred" and the fairness line. | Economy lane makes Boards daily-only; the Market owns its own table. |
| Hit rate | **KEEP** shrunk `(hits+5)/(n+10)`, confidence-weighted. | Stable early. |
| Coins for right calls | **KEEP** 15/25/40/70 by star (client-side, cosmetic currency). | Economy lane owns the values. |
| Market availability | **NEW.** `calendar.market.open` + `flags.market`: ops can pause new calls (settlement keeps running); the screen shows a closed note with the ops reason. | §19: a data refresh or a dead feed should never need a client patch. |
| Wire screen | **REWORK** to one viewport: tabs Market · My calls · Table; filters Stars · Heat · League · Team · **Free agents** · search; 5 rows/page; freshness line "Squad data as of 29 Sep 2026 · Window opens in 90d 12h"; roster-status chips (On loan from X / Free agent / Status not verified); the settled reel replaces the list until dismissed; Back = Home. | Owner rules (no scroll, Back, self-explanatory names). |

## Numbers

- `WIRE`: DAILY_CALLS 5 · OPEN_CALLS 60 · CORRECT_MIN 15 · LATE_HOURS 6 · LATE_C .90 · LEAD_X .25 · LEAD_DAYS 28 · MIN_RIGHT 1 · DEST_RIGHT 6 · DEST_WRONG 2 · FEE_RIGHT 2 · FEE_WRONG 1 · ROOM_X .35 · ROOM_MIN 10 · CROWD_MIN 5.
- Price: CRED {.50 .38 .25 .15} + STAGE {0 .08 .14 .30} + .03 × min(3, outlets − 1), clamp [.05, .95].
- Worked: YES at 25%, Confirmed, right 40 days later → +28.1; wrong → −7.5. YES at 90%, Confirmed, right → +3.8 (floor × lead). Named Chelsea (room 50% on it) and €50–80m, right, Advanced → +6 +4 on top; wrong club/fee → −4 −2.
- Calendar defaults (`CALENDAR_DEFAULT`): 2027-01 opens 1 Jan 00:00Z closes 2 Feb 23:00Z deadline 2 Feb; 2027-summer 15 Jun 23:00Z → 1 Sep 18:00Z deadline 1 Sep; closed 2026-summer kept for old calls; settleGraceH 72.

## Calendar (§19) — how it works

- `calendar.mjs` is pure and bundled by both server and client (the client's build-time fallback). `index.js › calendar()` merges the KV override `t1v3:cal` on top, cached 60 s per instance.
- `wire.calendar` (public) → windows, closed windows, league closes, deadline days, flags, market availability, current window, server `now`.
- `ops.calendar { token, set | clear }` with `OPS_TOKEN` (≥16 chars, constant-time compare). `set` is shape-checked (`validateCalendar`); `windows` replaces the list whole; `leagues: { ksa1: { closes, deadline? } }` gives a league its own close/deadline day.
- The client (`wireData.ts`) applies the calendar into `season.ts › WIRE_WINDOWS / DEADLINE_DAYS` **in place** (`applyWireCalendar`), so `lib/live.ts`, the Daily hub banner, the DD Live screen and the Market countdown all read live dates with no edits. Last good copy in `localStorage t1.cal.v1`; built-in defaults before that.
- `live.dd.*` read `ddDays(cal)` and honour `flags.ddLive`; `DD_DAYS` stays exported as the build-time default for tests.

## Exported APIs others rely on

- `wire.mjs`: `WIRE`, `marketOf(r)`, `stakeOf(yes, s, m) → { c, win, lose }`, `rumourState(r, snap, overrides, now, cal)`, `wirePoints(call, st) → { pts, right, parts, room }`, `hitRate`, `feeBand`, `ghostRumour`, `windowOfId`.
- `calendar.mjs`: `CALENDAR_DEFAULT`, `validateCalendar`, `mergeCalendar`, `currentWindow`, `closesOf`, `deadlineDays`, `nextDeadline`, `lastDeadline`, `marketOpen`, `publicCalendar`.
- `world.mjs`: `playerStatus(snap, id) → { status: 'club'|'loan'|'free'|'unknown', … }`, `freeAgentsOf(snap)`.
- `index.js` actions: `wire.calendar`, `ops.calendar`, `wire.board` (+ `calendar`, `market`, `freeAgents`, `limits`, items `ps`/`loanFrom`), `wire.file` (error `closed` when paused), `wire.correct`, `wire.mine` (+ `beat`, calls carry `room`, `parts`, `frozen`); exports `DD_DAYS`, `ddDays`.
- `lib/wireData.ts`: `useWire()` (state now has `calendar`, `market`, `freeAgents`, `limits`), `useCalendar()`, `getCalendar()`, `loadCalendar()`, `currentWindowOf`, `windowLine(now, cal)`, `stakeOf`, `WIRE`, `marketOf`, `CURRENT_WINDOW`, plus the unchanged `useWireFor / wireFor / ensureRumours / stageOf / gradeOf / windowParts`.
- `lib/season.ts`: `applyWireCalendar(windows)` (the one edit outside the lane).
- i18n: `i18n/parts/market38.ts` (`mk.*`, en/ar/es).

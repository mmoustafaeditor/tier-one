# P · Analytics (3.8, brief §54–§55)

Implementation: `web/src/lib/analytics.ts` → `POST /api/tier-one/v4 { action: 'telemetry.batch', events }` (`api/_lib/telemetry.mjs`: daily KV buckets, HyperLogLog DAU / D1 / D7, conversion counters, 45-day TTL, no PII). `lib/account.ts` re-exports `track` / `flushTelemetry` for older callers.

## Transport
- Queue in memory, mirrored to `localStorage tierone_tm_queue` (≤200). Batches of ≤50 every 15 s or at 40 waiting; `online` and `pagehide` (keepalive) flush. A `NET` failure keeps the batch; any other rejection drops it.
- Names: `/^[a-z][a-z0-9_.]{1,39}$/`. Props: ≤12 short scalars; keys that look like PII (mail, phone, name, nick, token…) and values with `@` or URLs are dropped client-side and again server-side.
- Remote flag `telemetry` (config.get) switches it off; the server samples per subject (`telemetry.sample`).

## The funnel (`funnel.*` / `EVENTS`)
| Event | Name | Sent by |
|---|---|---|
| App opened | `app.open` {platform, onboarded, pwa, days} | App boot (`trackAppOpen`) |
| Onboarding started / completed | `onboarding.start` / `onboarding.done` {tutorial} | App (watches `save.onboarded`), once each |
| Daily viewed | `daily.view` {no} | App `go()` → `today`, or `daily` from elsewhere |
| Daily started | `daily.start` {no} | App `go()` → `daily` with no record and no live board today |
| First / second source called | `source.first` / `source.second` {src} | **core lane**: `funnel.sourceCalled(nth, src)` on the first ever board (sent once each) |
| First call published | `call.first` | **core lane**: `funnel.firstCallPublished()` (once) |
| Daily finished | `daily.done` {no, tier, total} | App (`onByline` window event, mode daily) |
| Result shared | `result.share` {how, mode} | **core / share lane**: `funnel.resultShared('share'|'x'|'save', mode)` |
| Career started | `career.start` | App (first time `career.live` exists), once |
| Room created / invite sent / joined | `room.create` / `invite.send` {how} / `invite.join` | **rooms lane** |
| Market call made | `market.call` {stake, yes} | **market lane** |
| Store opened / item previewed | `store.open` {from} / `store.preview` {item, kind} | App `go()` → customize; **store lane** for previews |
| Purchase attempted / completed | `checkout.start` / `purchase.ok` {item, cur} | **store lane** (names match the server's CONVERSIONS set) |
| D1 / D7 / D30 return | `return.d1` / `return.d7` / `return.d30` | App boot, once each, local calendar days since first open |

Extras the shell sends: `push.ask`, `push.on`, `push.refused`, `push.later`, `push.off`; `link.start`, `link.done`, `link.nudge`; `settings.lang`; `boot` (account hello).

## Reading it
`ops.stats { token, days }` returns per day: DAU, D1/D7 returners, event counts, mode mix, conversion counts. "Where players quit" = the ratio between consecutive funnel rows per day: open → onboarding.done → daily.view → daily.start → source.first → source.second → call.first → daily.done → result.share; and return.d1 ÷ app.open(days=0).

## Owner KPIs (§55) → events
Onboarding completion (`onboarding.done` ÷ `onboarding.start`), first Daily completion (`daily.done` ÷ `daily.start`), next-day return (`return.d1`, server `ret1`), Daily completion rate, share rate (`result.share` ÷ `daily.done`), invite conversion (`invite.join` ÷ `invite.send`), room creation, Career completion (career lane to add `career.promo`), Market return, streak continuation (`daily.done` with a streak prop, core lane), shop conversion (`purchase.ok` ÷ `store.open`).

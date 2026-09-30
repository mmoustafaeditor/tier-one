# Tier One platform API v4

`POST /api/tier-one/v4` with a JSON body `{ action, ...fields }`. One endpoint serves the whole client: the platform
actions below plus every v3 action (`api/tier-one/v3/index.js`) mounted unchanged. The OpenAPI description is
[`v4.yaml`](v4.yaml); the code is `api/tier-one/v4/index.js` over `api/_lib/**`.

```
{ ok: true,  rid, v, ...data }                     // success; v = handler version, rid = request id
{ ok: false, error, code, rid, ...extra }          // failure; code is UPPER_SNAKE, error a short reason
```

Codes: `BAD_REQUEST` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409,
`IDEM_IN_PROGRESS` 409, `PAYLOAD_TOO_LARGE` 413, `RATE_LIMITED` 429, `UNKNOWN_ACTION` 400, `STORE` 502,
`OFFLINE` 200 (no store connected), `V3_<ERROR>` 200 (a v3 action answered `{ error }`; `error` keeps v3's word).
Send `X-Request-Id` to choose the `rid`; it comes back as a header too.

## Running it

- Tests: `node --test "api/tier-one/v4/test/*.test.mjs"` (in-memory store, no network) and
  `node api/tier-one/v4/test/client.mjs` for the client merge rules. Smoke run: `node api/tier-one/v4/test/smoke.mjs`.
- Storage: the same Upstash Redis REST store as v3 and `api/online.js`, through `api/_lib/kv.mjs`. Without the env the
  endpoint answers `OFFLINE` and the game plays on locally.
- Env (names only): `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`);
  `PUBLIC_URL` (for magic links and Stripe return URLs); `T1V4_SALT` (email hashing; derived from the store token when
  absent); `OPS_TOKEN` (`ops.stats`); `RESEND_API_KEY` + `EMAIL_FROM` (+ optional `EMAIL_API_URL`) for real mail;
  `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`; `GOOGLE_PLAY_SERVICE_ACCOUNT` (JSON key) + `GOOGLE_PLAY_PACKAGE`;
  `PLATFORM_SANDBOX=1` to force the purchase sandbox on. Nothing sends mail or grants a real purchase without its keys.
- `vercel.json` bundles `data/seed/**` (v3 needs it) and `api/tier-one/v4/config/*.json` with both functions.

## Auth model

1. The client already has a device id (`save.dev`, 8–24 alphanumerics, also its v3 identity). `account.hello { dev }`
   on a device the server has never seen creates an account (`a_XXXXXXXXXXXX`) and returns a **device token once**.
   The client keeps `{ dev, token }` in localStorage (`tierone_v4_auth`).
2. Every authenticated action sends `dev` + `token`; the server compares the token's SHA-256 with the device record in
   constant time. A wrong or missing token answers `UNAUTHORIZED`; `account.hello` on a claimed device without its
   token answers `FORBIDDEN` with `code2: DEVICE_CLAIMED` (the client then runs without a platform account).
3. `account.link.start { email }` mails a 15-minute link (`/tier-one/?link=<token>`; 3 per address per hour). The
   address is never stored: only a salted SHA-256 and a masked form (`r***@example.com`). `account.link.finish
   { link }` links the email; if that email already owns another account, **this device joins the older account**
   (`merged: true`) and the client pulls that account's cloud save. In sandbox mode (no mail env) `link.start` returns
   the link in the reply so local testing needs no inbox.
4. `account.me`, `account.devices`, `account.rename { nick }` (moderation list in `api/_lib/moderation.mjs`, one
   rename a day). Nicks follow v3's rule: no links, `@` only as a plain handle.

Rate limits: 1,500 requests per IP per hour, 900 per device per hour, plus per-action ceilings (`limit` on the
handler, e.g. 10 `account.link.start` an hour). Limits are hourly INCR buckets in the store, like v3.

Idempotency: any action registered with `write: true` accepts an `Idempotency-Key` header or `idem` body field. The
first reply is stored for 24 h under `(account|dev|ip, action, key)`; a repeat gets it back with `replay: true`; a
repeat while the first is still running gets `IDEM_IN_PROGRESS`.

## Sync rules (cloud save)

The save is one JSON document (`lib/save.ts` `Save`), pushed gzip+base64 (`blob` ≤ 320 KB, raw ≤ 2.5 MB) with the
version the client last synced from (`base`), its local `updatedAt`, and `deltas` (counter changes since `base`,
from `diff()` in `lib/sync.ts`).

- `save.push` with `base == stored version` fast-forwards to `version + 1`. Any other `base` is a race with another
  device: the server merges and returns the merged `blob`; the client replaces its local save with it.
- `save.pull` returns the current `{ version, updatedAt, deviceId, blob }` (`version: 0` when empty).
- Merge (identical in `api/_lib/merge.mjs` and `lib/sync.ts`, both unit-tested):
  1. **Last-writer-wins** for anything not listed below: the document with the later `updatedAt` is the base.
  2. **Additive counters**: `credits` (Coins), `pp`, `byline.followers`, `stats.*`, `book.<src>.xp|asks|hits`,
     `rivals.<id>.w|l|d`. Result = server value + client delta. Without deltas: `max(server, client)`.
     Clamped ≥ 0 for `credits`, `pp`, `byline.followers`.
  3. **High-water marks** (max): `byline.hot`, `byline.best`, `streak.best`, `book.<src>.lv`, `practice.played`.
  4. **First-time stamps** (earliest non-zero): `ach.*`, `milestones.*`, `scenes.*` (seen films), `rivals.<id>.scalp|trophy`,
     `stats.pay:*` (purchase sessions).
  5. **Collections unioned by id**: `feed` (by `id`, sorted by `at`, cap 60, `read` sticks), `owned`, `wireSeen`,
     `ledger` (by `at|why`, cap 30), `seasonLog` (by `id`), `rooms` (by `code`), `byline.keys` (cap 40).
  6. **Keyed records unioned**: `daily` (by Daily number; the newer document wins a shared key).
- Device-only fields never sync: `dev`, `sound`, `reduced` (kept from the local save when a remote document is
  applied; `lib/sync.ts` `LOCAL_FIELDS`).
- Client flow (`bootPlatform()` → `pullOnBoot()`): pull; if the server is ahead of the local base, merge locally and
  push from the server's version; otherwise push if dirty. `watch()` then pushes ~4 s after a local change and on
  `pagehide` (keepalive). The base kept locally is a counter snapshot (`tierone_v4_sync`), not a full copy.

## Wallet rules

Two currencies (GOTY §8.4): **Coins** stay in the local save; **Credits** are the server-authoritative ledger here.
Nothing in the wallet reads a Daily board or writes a leaderboard key (`api/tier-one/v4/test/wallet.test.mjs`
asserts it): a purchase can never change a score.

- `wallet.get` → `{ wallet: { balance, coinsPending, entitlements }, ledger }`.
- `wallet.earn { reason, ref }`: server-validated reasons only, amounts from `catalog.json › earn`:
  `season_end` (ref = season id; only after that season's end and if the account existed then; once per season),
  `streak_30` (thirty consecutive `t1v3:lb:once:<day>:<dev>` markers on any device of the account; once per
  30 days), `first_t1` (ref = day; a `T1` result doc for that day; once per account). Anything else is `BAD_REQUEST`.
- `wallet.spend { item }`: a catalog item priced in credits. Decrement-then-check, so a race can never overdraw;
  entitlements are granted once (`CONFLICT: owned`). Coin items land in `coinsPending`; the client claims them with
  `wallet.coins.claim` and adds them to the local save.
- `wallet.gift { to, newsroom, amount | item }`: both accounts must be members of `t1v4:newsroom:<code>:members`
  (the pressbox lane SADDs account ids there, or passes its own check to `createApi({ newsroomMembers })`). Cap per
  gift and per day from `catalog.json › gift`; only `giftable` items.
- `wallet.checkout.start { item, currency? }` → Stripe Checkout `{ url, sessionId }` (metadata `sku`, `account`).
  `wallet.purchase.verify { provider: 'stripe', sessionId }` verifies a paid session (the flow `api/verify-purchase.js`
  used, now behind `api/_lib/purchase/stripe.mjs`); `{ provider: 'google', productId, purchaseToken }` verifies through
  the Android Publisher API with a service account and acknowledges the purchase; `{ provider: 'sandbox', item }`
  grants for free **only** when the sandbox is on (`PLATFORM_SANDBOX=1`, or no payment keys outside production).
  Every receipt grants once (`rcpt:<provider>:<id>`), whichever of verify or the webhook arrives first.
- `POST /api/tier-one/v4/stripe-webhook`: `checkout.session.completed` → grant. Signature checked
  (`t=…,v1=…`, 5-minute tolerance); 503 until `STRIPE_WEBHOOK_SECRET` is set so Stripe retries.
- `ent.list` → `{ entitlements, gold: { season, active }, cosmetics }`. Entitlements are `gold:<season>`, `cos:<id>`,
  `name:paper`.

## Catchphrases (`catchphrase.set`)

GOTY.md §12: a Confirmed call that lands fires the player's catchphrase. House, earned, signature and season lines are
catalog looks on the client (`lib/catchphrase.ts`); only a line the player writes themselves reaches the server.

- `catchphrase.set { text }` (auth, write, 20/min) → `{ text }` cleaned. Refusals: `CATCHPHRASE_EMPTY`,
  `CATCHPHRASE_LONG` (over 24 characters after cleaning), `CATCHPHRASE_BLOCKED` (the nick moderation list in
  `api/_lib/moderation.mjs` plus `BRAND_BLOCK` in `api/tier-one/v4/catchphrase.mjs`: brands, broadcasters, our own
  name and other people's catchphrases, matched on the leet-normalised form). Stored at `t1v4:cp:<account>` for 400 days.
- The Chief-rank gate is client-side (rank lives in the save); the server only decides whether the words may go out.
  A client whose line is refused falls back to the house line ("Book it.").

## Catalog, events, flags (`api/tier-one/v4/config/*.json`)

`config.get { client: { ver } }` → `{ catalog, featured, events: { weekly, ddlive }, flags, ab, minClientVersion,
latest, update, season, week }`. Files are validated on load against `SCHEMAS` in `api/_lib/config.mjs` (a bad file
fails every request with a path to the error, so validate locally: `node --test api/tier-one/v4/test/config.test.mjs`).
Reloaded every 60 s per warm function. Provider ids (`stripePrice`, `googleSku`) never leave the server.

- `catalog.json`: `items[]` (`id`, `kind` credits|gold|cosmetic|coins|name, `price` { credits, eur, usd } in cents,
  `grants` { credits, coins, ent }, optional `season`, `from`/`until` dates, `featured`, `giftable`), `earn`, `gift`.
- `events.json`: `weekly[]` (`week` ISO `YYYY-Www`, `title`, `rules`, `reward`), `ddlive[]` (Deadline Day Live dates:
  winter **2027-02-02**, summer **2027-09-01**). The reply carries this week + next, and the next four DD Live days.
- `flags.json`: `flags` (booleans, numbers, strings), `ab.experiments[]` (`buckets`, `weights`, `active`, `salt`),
  `client.minClientVersion` / `latest` / `message`, `telemetry.sample` / `maxBatch`.

A/B buckets are deterministic: FNV-1a of `"<experiment>|<salt>|<account id>"` over the weights, same function in
`lib/flags.ts` (`bucketFor`). Change `salt` to reshuffle.

### Adding a config-driven event

1. Weekly: add `{ "id": "week-2026-w45-local", "week": "2026-W45", "title": "Local Week", "rules": { "league": "esp1" }, "reward": "ev.local" }`
   to `events.json › weekly`. DD Live: add `{ "id", "day", "title", "closesLocal", "window" }` to `ddlive`.
2. Run `node --test api/tier-one/v4/test/config.test.mjs` (the schema catches typos and duplicate ids).
3. Commit; no client release needed. The client reads `getConfig().events` / `ddLiveDates()` from `lib/flags.ts`.
   Gate a new feature the same way: add a flag to `flags.json`, read it with `flag('name', default)`.

## Adding an action

1. Put the logic in a module under `api/_lib/` (a `createX({ kv, ... })` factory returning `async (body, ctx)`
   functions; `ctx` has `rid`, `ip`, `dev`, `kv`, `account` when authenticated). Throw `new ApiError('CODE',
   'reason', status, extra)` for failures; return the success fields (the router adds `ok`, `v`, `rid`).
2. Register it in `api/tier-one/v4/index.js`: `R('thing.do', { v: 1, auth: true, write: true, limit: 60, fn })`.
   `auth: 'optional'` resolves the account when a token is present. A breaking change is a new version:
   `R('thing.do', { v: 2, ... })` keeps `thing.do@1` working and makes `thing.do` run v2.
3. Never use a bare name a v3 action owns (`daily.*`, `lb.top`, `wire.*`, `league.me`, `room.*`, and the
   `newsroom.*`/`challenge.*`/`live.*` families other lanes are adding to v3): `v3.<name>` always reaches v3, and the
   bare name only when v4 has none.
4. Test it in `api/tier-one/v4/test/` with the harness (`call({ action, ...auth })`), then describe the request and
   reply in `docs/api/v4.yaml` (one entry in the `action` discriminator mapping).

## Telemetry and ops

`telemetry.batch { events: [{ t, name, props }] }` (≤ `telemetry.maxBatch`, names `a-z0-9_.` ≤ 40 chars, ≤ 12 scalar
props, values ≤ 80 chars; keys or values that look like emails, phones, names or tokens are dropped; events older than
36 h are dropped; sampling by `telemetry.sample`). Stored as daily counters (`t1v4:tm:<day>:*`, 45 days): event counts,
mode mix (`window.start` with `props.mode`), conversion events (`store.open`, `checkout.start`, `purchase.ok`,
`gold.view`, `gold.buy`, `link.start`, `link.done`), DAU/D1/D7 as HyperLogLogs of account ids.
`ops.stats { token: OPS_TOKEN, days? }` returns the last 14 days.

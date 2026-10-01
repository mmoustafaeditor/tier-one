# Creator Rivals (Tier One)

Real football creators can sign up to appear in Tier One as a rival account. The program is off by default
(`flags.creatorRivals: false` in `api/tier-one/v4/config/flags.json`) and nobody appears until a signed agreement exists.

## How it works

- A creator rival is one entry in `api/tier-one/v4/config/rivals.json`, validated on load by `SCHEMAS.rivals` and
  `checkRivals()` in `api/_lib/config.mjs`.
- `config.get` sends the active entries (consent stripped) only while `flags.creatorRivals` is `true`. "Active" means
  `active` is not `false`, consent is signed on or before today and not revoked, and today is inside `from`/`until`.
- The client merges them after the three house rivals in `rivalRoster()` (`games/tier-one/v3/web/src/lib/rivals.ts`).
  Creator cards carry `kind: 'creator'`, their literal handle and no ledger (they don't post on sagas or change scores).
- A creator speaks with one of the house voice packs (`voice`: `tabloid`, `itk` or `insider`). The lines are ours and
  fictional in tone; nobody writes copy in the creator's name, and nothing claims they said it.
- `code` is the creator code players type to find them (`creatorByCode()`); later it can carry revenue-share attribution.

## Entry

```json
{
  "id": "maker",
  "handle": "@maker_fc",
  "name": "Maker",
  "initials": "MK",
  "avatar": "https://…/maker.png",
  "voice": "itk",
  "code": "MAKER",
  "from": "2026-10-01",
  "until": "2026-12-31",
  "lang": ["en", "es"],
  "consent": { "signed": "2026-09-20", "ref": "CR-0001" }
}
```

| Field | Rule |
| --- | --- |
| `id` | `a-z0-9_-`, 2–31 chars; never `tabloid`, `itk` or `insider` |
| `handle` | `@` + up to 15 of `A-Za-z0-9_`; never a house handle |
| `voice` | `tabloid`, `itk` or `insider` |
| `code` | `A-Z0-9`, 3–12, unique |
| `from` / `until` | `YYYY-MM-DD`, `from` ≤ `until` |
| `consent.signed` / `consent.ref` | required; signed on or before `from`; `ref` points at the signed agreement |
| `consent.revoked` | set the day a creator leaves; they drop out at once |

## Onboarding checklist

1. Signed agreement on file (likeness, handle, avatar, the voice pack they chose, the dates, how to leave).
2. Add the entry with `consent.ref`, run `node --test api/tier-one/v4/_test/config.test.mjs`.
3. Turn on `flags.creatorRivals` only when at least one entry is ready.
4. To remove someone: set `consent.revoked` (immediate), then delete the entry at the next config release.

Never add a real person who has not signed. See `docs/LEGAL_NAMES.md`.

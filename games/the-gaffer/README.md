<h1 align="center">The Gaffer</h1>
<p align="center"><b>Semba Studios' football management game.</b><br>
<i>Build a coaching career across Europe's big five leagues and the Arab leagues.</i></p>

<p align="center">
  <a href="https://sembagames.app/the-gaffer">▶ Play on the web</a> ·
  <a href="https://www.sembagames.app/the-gaffer/index.html">🌐 Standalone HTML</a> ·
  <a href="https://www.sembagames.app/downloads/TheGaffer.apk">⬇ Download Android APK (2.2.0)</a>
</p>

## Status

**Canonical product name:** The Gaffer.

**Current release: web and Android `2.2.0`.** New in 2.2: the design-audit fixes, club vision (board meeting, facility builds), awards night, club legends, AI managers sacked by their boards, derbies, press conferences, Semba Credits per season with unlockable club looks, and the new navigation (Squad areas row, inbox on Today). Audit and UX docs: [`audit-the-gaffer/`](../../audit-the-gaffer).

**v2.0: the 2026/27 rebuild (V2.0–V2.3).** Spec: [`V2_DESIGN.md`](V2_DESIGN.md); look: [`v2/look/`](v2/look/).

- **Real 2026/27 world:** the Premier League, LaLiga, Serie A, Bundesliga, Ligue 1 and the big clubs of Egypt and Saudi
  Arabia, imported from `data/seed/` as facts (names, clubs, ages, positions). Ratings are ours: an in-house squad model
  plus designer tiers (`web/scripts/tiers.mjs`); regenerate with `node web/scripts/import-seed.mjs`. Uncovered leagues
  keep generated squads. A Settings switch (and the `VITE_WORLD_NAMES=fictional` build flag) swaps every name for a
  fictional one, keeping every number.
- **One engine contract:** screens send commands (`sim/commands.ts`), the clock (`sim/clock.ts`) moves time, every change
  lands in one event log (`sim/events.ts`), and matches become a `MatchRecord` (`sim/record.ts`) that full-time, the
  table, form and the board all read.
- **Today:** at most five decisions with the staff's advice pre-picked, one tap each, undo; Continue plays on to the next
  decision. Delegation per department (Me / Ask me / Staff) with staff personalities.
- **Saves:** two slots in IndexedDB (save v4), mirrored for the Android shell. Old careers load through the upgrade
  chain and stay in their old fictional world ("Continue old career"); nothing is deleted.
- **Cut:** development points, the licence quiz, board donations, formation locks. Club Pass and Semba Credits are a
  labelled concept on the web; rewarded ads only ever pay credits.

- Web: `https://sembagames.app/the-gaffer`
- APK in repo: `downloads/TheGaffer.apk`
- Standalone web file in repo: `the-gaffer/index.html`
- Update feed: `/api/the-gaffer/latest` · Health: `/api/the-gaffer/health` · Purchases: `/api/the-gaffer/verify-purchase`
- Android app id: `com.sembagames.thegaffer`

Core career data stays on the device.

## Live updates

Push a change to The Gaffer on `main` and it reaches everyone without anyone rebuilding by hand:

1. **CI** (`.github/workflows/build-the-gaffer.yml`) builds the web game and the APK, commits the fresh web build
   (`/the-gaffer/index.html` + `version.json`) to `main`, and asks Vercel to deploy.
2. **The website** shows players who have the game open a banner, "The Gaffer x.y is ready · Update now".
   It checks `/the-gaffer/version.json` on start, every 10 minutes and when the tab comes back.
3. **The Android app** downloads the new web build itself (checked against the SHA-256 in `version.json`), shows the same
   banner, and uses the new build from then on. It plays offline from its bundled copy, and keeps a copy of the save
   outside the page. If a downloaded build ever fails to start, it goes back to the bundled one.
4. **A new APK** is only published when `games/the-gaffer/android/` changed (or when you run the workflow with
   "Also publish a new APK"). Installed apps then show "App update x.y is out · Download".

Every build has a number (minutes since 1970). It's the web build number, the APK versionCode and what the apps compare,
so nobody bumps versions by hand; `web/package.json` holds the name shown to players (2.2.0).

**One-time setup (mmoustafaeditor):** Vercel only deploys commits made by members of the Vercel team, so the bot's
publish commit needs a deploy hook. Vercel › tier-one › Settings › Git › Deploy Hooks › create one for `main`, then
GitHub › Settings › Secrets and variables › Actions › New secret `VERCEL_DEPLOY_HOOK` = that URL. Without it the site
catches up on mmoustafaeditor's next push.

## Source and builds

The editable source is under `web/src`. The game is built as a single HTML file so the same release can be served on the web and bundled inside the Android WebView.

```bash
cd games/the-gaffer/web
npm ci
npm run typecheck
npm run build
npm run build:min
```

Outputs:

- `web/dist/index.html` — Android input
- `build/index.html` — minified web release
- `/the-gaffer/index.html` — published web copy: copy `build/index.html` here when releasing
- `/downloads/TheGaffer.apk` — published APK: download the `TheGaffer-apk` artifact from the green build run and replace this file

Do not edit generated release files by hand.

## Deployment

The production layout follows the same Vercel project used by Tier One. The repository publishes a clean The Gaffer surface:

```text
the-gaffer/index.html
api/the-gaffer/latest.js
api/the-gaffer/health.js
downloads/TheGaffer.apk
```

The Gaffer CI workflow rejects legacy project branding in the source, built web file, and the HTML embedded in the APK before anything can be published.

## Android

The Android wrapper lives in `android/`.

- app id: `com.sembagames.thegaffer`
- update endpoint: `https://sembagames.app/api/the-gaffer/latest`
- direct APK: `https://www.sembagames.app/downloads/TheGaffer.apk`
- shares images, reports, saves, and text through the native Android share sheet
- supports file import and the native Back button
- keeps the actual game inside `assets/index.html`

Every release must increment `versionCode` and update `api/the-gaffer/latest.js`.

## Next server phase

The deployment foundation is intentionally separate from the larger live-service work. The next server-backed features are Trainer ID, promo codes, broadcasts/maintenance notices, admin tools, and Android rewarded ads. Online PvP, Elo and cloud sync follow after that.

See `FEATURES.md` for the detailed roadmap.

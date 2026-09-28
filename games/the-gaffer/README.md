<h1 align="center">The Gaffer</h1>
<p align="center"><b>Semba Studios' football management game.</b><br>
<i>Build a coaching career across Europe's big five leagues and the Arab leagues.</i></p>

<p align="center">
  <a href="https://sembagames.app/the-gaffer">▶ Play on the web</a> ·
  <a href="https://github.com/mmoustafaeditor/tier-one/raw/refs/heads/main/the-gaffer/index.html">🌐 Standalone HTML</a> ·
  <a href="https://github.com/mmoustafaeditor/tier-one/raw/refs/heads/main/downloads/TheGaffer.apk">⬇ Download Android APK</a>
</p>

## Status

**Canonical product name:** The Gaffer.

**v0.11.0 — deployment foundation.**

The full football-management core works locally and on Android. This release adds the production web surface, Android update checks, and the Vercel API namespace used by The Gaffer.

- Web: `https://sembagames.app/the-gaffer`
- APK in repo: `downloads/TheGaffer.apk`
- Standalone web file in repo: `the-gaffer/index.html`
- Update feed: `/api/the-gaffer/latest`
- Health: `/api/the-gaffer/health`
- Android app id: `com.sembagames.thegaffer`

Core career data remains device-local. The Android app contacts Semba Games for version checks; future online features will use the dedicated The Gaffer API namespace.

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
- direct APK fallback: `https://github.com/mmoustafaeditor/tier-one/raw/refs/heads/main/downloads/TheGaffer.apk`
- shares images, reports, saves, and text through the native Android share sheet
- supports file import and the native Back button
- keeps the actual game inside `assets/index.html`

Every release must increment `versionCode` and update `api/the-gaffer/latest.js`.

## Next server phase

The deployment foundation is intentionally separate from the larger live-service work. The next server-backed features are Trainer ID, promo codes, broadcasts/maintenance notices, admin tools, and Android rewarded ads. Online PvP, Elo and cloud sync follow after that.

See `FEATURES.md` for the detailed roadmap.

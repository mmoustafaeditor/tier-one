# CLAUDE.md — Semba Studios repo

This repo, **`mmoustafaeditor/tier-one`**, is the one the whole team works in. It is shared by
**three people who all use Claude Code**: `saifsaber`, `mmoustafaeditor` and `moemsacod`.
Any of them may have pushed since the last session. Keeping each other informed is part of every task.

> `saifsaber/tier-one` is **retired**. Don't push there; its history is summarized at the bottom of `UPDATES.md`.

## 1. At the start of every session: sync with the team

Check what teammates pushed before you start:

```bash
git fetch origin
git log --oneline HEAD..origin/main   # teammates' commits you don't have
head -60 UPDATES.md                   # latest team updates
```

Then, **before doing the task**:
- If there are new commits or `UPDATES.md` entries from another teammate, tell the user in 2–4
  lines what changed (who, what, any heads-up). The user wants to hear about teammates' updates.
- If the branch is behind `origin/main`, merge it in before editing, so you don't overwrite their work.
  Never force-push over a teammate's commits.

## 2. At the end of every change: log it

Every commit that changes something real (game, build, docs, config) must come with a new entry
at the **top** of the list in [`UPDATES.md`](UPDATES.md), in the same commit or the same push:

```markdown
## YYYY-MM-DD · <github user the work is for> · <short title>
- **What changed:** …
- **Files:** …
- **Heads-up for the team:** … ("None" if nothing)
```

Put in "Heads-up" anything that would surprise the others: moved files, new version numbers,
an APK that still needs rebuilding, config they must fill in, etc.

## 3. Repo map

| Path | What it is |
|---|---|
| `README.md` | Studio landing page (Semba Studios) with a clickable card per game |
| `UPDATES.md` | Team update log, newest first |
| `index.html` | Semba Games studio home page, served at sembagames.app |
| `assets/` | Web-sized copies of the Semba logo for the home page (made from `.github/assets/semba-logo.png`) |
| `tier-one/index.html` | **Tier One: the entire game** (HTML + CSS + JS, EN/ES/AR), served at sembagames.app/tier-one. The only copy: the Android build bundles it. |
| `tier-one/semba-intro.{webm,mp4,jpg}` | The Semba Studios intro shown as the game's loading screen on every load of the game page (tap to skip; skipped when returning from a payment or opening a Privacy/Terms link). Also bundled into the APK. |
| `api/tier-one/latest.js` | Android update feed (Vercel function) polled by the app's UpdateChecker |
| `downloads/TierOne.apk` | Published APK; the feed and README download links point to it |
| `verify-purchase.js` | Optional Stripe purchase verification (see `games/tier-one/LAUNCH.md`) |
| `games/<game>/` | One folder per game, each with its own `README.md` |
| `games/tier-one/` | Tier One's game page (`README.md`), hosting/ads/payments guide (`LAUNCH.md`) and the Android WebView project (Gradle 8.9, JDK 17, SDK 34) |
| `.github/workflows/build-tier-one.yml` | Builds the APK on pushes touching the game or `games/tier-one/**`; the APK is attached to the run |
| `.vercelignore` | Keeps `games/` (incl. the signing key), `.github/` and `.claude/` off the public site. Don't remove it. |
| `.github/assets/` | Brand art: `semba-logo.png` (studio logo, the exact design #17 "Neon Ring"; never redraw it), `tier-one-logo.svg` (T1), plus the banner and game card that embed them |

**Don't move** `index.html`, `tier-one/`, `api/` or `downloads/`: the site, the update feed and
installed apps load them from there (`https://sembagames.app/api/tier-one/latest`,
`https://www.sembagames.app/downloads/TierOne.apk`).

The Android wrapper lives in `games/tier-one/`. It has no copy of the game: Gradle copies
`tier-one/index.html` and the intro video into the app's assets at build time. Keep `app/debug.keystore`: every release must be
signed with it or installed apps refuse the update.

## 4. Conventions

- **Releasing a Tier One version:** bump `CONFIG.VERSION` in `tier-one/index.html`; bump `versionCode` (+1) and
  `versionName` in `games/tier-one/app/build.gradle`, push, and when the build workflow is green download the
  APK from the run and replace `downloads/TierOne.apk`; bump `version`,
  `versionCode` and `changelog` in `api/tier-one/latest.js`; update the version badge in
  `games/tier-one/README.md`. Say in `UPDATES.md` if the APK is not rebuilt yet.
- Current versions: web game `1.1.0`, Android `1.3` (versionCode 4).
- **New game:** create `games/<slug>/` with its own `README.md` and add a card/row to the root `README.md`.
- The game file is large (~270 KB, very long lines). Search it with grep; don't rewrite it wholesale.
- Arabic text in the game and READMEs is Egyptian Arabic; keep that tone.

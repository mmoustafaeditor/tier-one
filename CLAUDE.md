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
- If the hook shows **open requests** from `.claude/requests.md`, tell the user about them first and say who each
  is for. When the person it's for says it's done, delete the request and log it in `UPDATES.md`. To leave a
  request for a teammate (something only they can do), add one there using its template.
- If the hook says the latest `main` is **not live on the site** (Vercel blocked it), tell the user. See section 2.

## 2. At the end of every change: log it

Every commit that changes something real (game, build, docs, config) must come with a new entry
at the **top** of the list in [`UPDATES.md`](UPDATES.md), in the same commit or the same push:

```markdown
## YYYY-MM-DD · <github user the work is for> · <short title>
- **What changed:** …
- **Files:** …
- **Heads-up for the team:** … ("None" if nothing)
```

**After it lands on `main`, make sure it's live.** Check the Vercel status on the latest `main` commit
(GitHub shows ✅/❌ next to it). Vercel deploys a commit only if its author is in the `semba-game-studios`
Vercel team (mmoustafaeditor's account); merges from saifsaber or moemsacod show ❌ "Deployment was blocked".
- If you're working for **mmoustafaeditor**: your own push to `main` deploys everything on it, teammates' blocked
  commits included. If the latest `main` still shows blocked, tell them to open
  https://vercel.com/semba-game-studios/tier-one/deployments → latest `main` deployment → `⋯` → **Redeploy**.
- If you're working for **someone else**: tell the user the change is on `main` but not live until mmoustafaeditor
  pushes or redeploys. Don't push empty commits to force a deploy.

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
| `tier-one/semba-intro.{webm,mp4,jpg}` | The Semba Studios intro shown as the game's loading screen on every load of the game page, with a soundtrack timed to the animation. It can't be skipped; where the browser blocks autoplay with sound it shows a "Tap to start" button so the intro always plays with sound. Not shown on payment returns and Privacy/Terms links. The soundtrack is synthesized; its source script is kept in `games/tier-one/intro-sound/`. Also bundled into the APK. |
| `api/tier-one/latest.js` | Android update feed (Vercel function) polled by the app's UpdateChecker |
| `api/online.js` | Online features (Vercel function): career transfer codes and multiplayer rooms. Needs a Redis store connected in Vercel (see `games/tier-one/LAUNCH.md` › Online play); without it the game shows "Online play is switching on soon". |
| `downloads/TierOne.apk` | Published APK; the feed and README download links point to it |
| `api/verify-purchase.js` | Optional Stripe purchase verification, served at `/api/verify-purchase` (see `games/tier-one/LAUNCH.md`) |
| `games/<game>/` | One folder per game, each with its own `README.md` |
| `games/tier-one/` | Tier One's game page (`README.md`), hosting/ads/payments guide (`LAUNCH.md`) and the Android WebView project (Gradle 8.9, JDK 17, SDK 34). `store/` holds Play Store art (512px icon). |
| `.github/workflows/build-tier-one.yml` | Builds the APK on pushes touching the game or `games/tier-one/**`; the APK is attached to the run |
| `.claude/requests.md` | Open requests between teammates; the session hook shows them at the start of every Claude Code session |
| `.gitignore` | Keeps Gradle/Android build output, `local.properties` and OS/editor junk out of git |
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
- Current versions: web game `1.7.0`, Android `1.9` (versionCode 10).
- Game shape lives in `CONFIG`: `SAGAS` (players per window, 5) and `CONTACTS` (per day, 4); 7 days. Tier cutoffs: T1 235, T2 155, T3 90, T4 35.
- Text freshness: every source line, source DM, rival post, news-wire item, official line and DM opener is chosen with `freshPick()`, so nothing repeats within a window and recently seen lines are avoided. New text goes in a voice pack (v2–v4 blocks) as appended arrays.
- Career economy: pay per window = $40 + half the points + $25 per exclusive + tier bonus (T1 150, T2 80, T3 40, T4 15), ×1.25 at 70+ rep; daily Payday +$60 and one ad +$40 per day (solo only). Career goals (level 7, Tier 1 ×3, all gear, 100K followers) unlock the Tier One Legend badge. Cash packs ($400/$1,400/$3,500) need `STRIPE_LINKS` filled in `CONFIG`.
- In-game currency is shown as dollars (`$`), but the save field is still `career.credits`.
- Multiplayer rooms: each room has its own career in `save.rooms[code].career`; game code reads the active career through `C()` (solo career unless `roomCtx` is set). Use `C()`, not `save.career`, in anything that runs during a window.
- ⚠️ `CONFIG.DAILY_REPLAY` in `tier-one/index.html` is `true` **for testing only** (the Daily Challenge can be replayed). Set it back to `false` before real players use it.
- **New game:** create `games/<slug>/` with its own `README.md` and add a card/row to the root `README.md`.
- The game file is large (~270 KB, very long lines). Search it with grep; don't rewrite it wholesale.
- Arabic text in the game and READMEs is Egyptian Arabic; keep that tone.

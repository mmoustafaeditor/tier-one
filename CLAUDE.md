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

## 1b. Who decides what (owner policy)

mmoustafaeditor owns **Tier One, the game**. The **sembagames.app site** is shared. The rule for every session,
whoever it is working for:

| Area | Paths | saifsaber / moemsacod may… |
|---|---|---|
| **Site** (sembagames.app) | `index.html`, `assets/`, `README.md` | change and push to `main` freely — no approval needed |
| **Game** (Tier One) | `tier-one/**`, `games/tier-one/**`, `api/**`, `downloads/**` | **not push to `main` without mmoustafaeditor's OK first** |

- Working for **saifsaber or moemsacod** and the change touches a **game** path: do the work on a branch, then add a request in
  `.claude/requests.md` (`from <you> → for mmoustafaeditor`, what/why, the branch) and stop there. Don't merge or push it to
  `main` until mmoustafaeditor says yes. Site-only changes go straight to `main` as usual (with an `UPDATES.md` entry).
- Working for **mmoustafaeditor**: at the start of every session (the hook lists them) tell him about **every** teammate
  commit, open request and open PR — site changes too, even though they need no approval — and say for each whether it's a
  site change (allowed) or a game change (needs his OK). A game change already pushed to `main` without his OK must be
  flagged, not silently merged; ask him whether to keep or revert it.
- GitHub side: `.github/CODEOWNERS` marks the game paths as mmoustafaeditor's. It only blocks merges once branch protection
  on `main` has "Require review from Code Owners" turned on (repo Settings → Branches); until then the rule is a team
  agreement enforced by the hook and this file.

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
| `tier-one/semba-intro.{webm,mp4,jpg}` | Legacy intro video files (no longer used by the game; still bundled into the APK). The Semba Studios intro is now drawn live in `tier-one/index.html` (`#boot`) around the embedded real logo, full screen in any orientation, with an embedded trailer-style MP3 soundtrack whose source is `games/tier-one/intro-sound/render.js` (re-embed with `embed.py`). It plays on every load with sound, straight through: no "Tap to start", no loading bar, no skip (if the browser refuses sound autoplay it plays silently and the first tap turns the sound on in sync). Only payment returns and Privacy/Terms links bypass it. |
| `api/tier-one/latest.js` | Android update feed (Vercel function) polled by the app's UpdateChecker |
| `api/online.js` | Online features (Vercel function): career transfer codes, multiplayer rooms and the Daily/weekly leaderboards (`lb.submit`, `lb.top`, `lb.me`; anonymous device id `save.online.dev` + nickname; Redis keys `lb:d:<day>*` 40 d, `lb:w:<ISO week>*` 60 d; one entry per device per day, never overwritten). Needs a Redis store connected in Vercel (see `games/tier-one/LAUNCH.md` › Online play); without it the game shows "Online play is switching on soon" and the leaderboards show a placeholder. The landing page reads `lb.top` too. |
| `downloads/TierOne.apk` | Published APK; the feed and README download links point to it |
| `api/verify-purchase.js` | Optional Stripe purchase verification, served at `/api/verify-purchase` (see `games/tier-one/LAUNCH.md`) |
| `games/<game>/` | One folder per game, each with its own `README.md` |
| `games/tier-one/` | Tier One's game page (`README.md`), hosting/ads/payments guide (`LAUNCH.md`) and the Android WebView project (Gradle 8.9, JDK 17, SDK 34). `store/` holds Play Store art (512px icon). |
| `.github/workflows/build-tier-one.yml` | Builds the APK on pushes touching the game or `games/tier-one/**`; the APK is attached to the run |
| `.claude/requests.md` | Open requests between teammates; the session hook shows them at the start of every Claude Code session |
| `.gitignore` | Keeps Gradle/Android build output, `local.properties` and OS/editor junk out of git |
| `.vercelignore` | Keeps `games/` (incl. the signing key), `.github/` and `.claude/` off the public site. Don't remove it. |
| `the-gaffer/index.html` | **The Gaffer** (football manager, game 02) published web build, served at sembagames.app/the-gaffer. A copy of `games/the-gaffer/build/index.html`; never edit by hand. |
| `games/the-gaffer/` | The Gaffer's source (`web/src`, React + Vite, the only place to edit), minified build (`build/index.html`, `npm run build:min`), Android WebView project (`android/`, appId `com.sembagames.thegaffer`, its own `debug.keystore`), README/FEATURES/QA/MONETIZATION. Uses a few shared files from `design/`. Web and Android 0.12.0 (versionCode = build number, e.g. 29843669; never bump by hand). Live updates: CI publishes every web build to `/the-gaffer/` and deploys; installed apps hot-update from `/the-gaffer/version.json` (`WebUpdater.java`); new APK only when `android/` changes (see its README › Live updates). New v0.12 text goes in `web/src/lang-new*.ts` (EN reference, AR/ES/FR type-checked). Ads and purchases switch on from `web/src/monet.ts`. |
| `api/the-gaffer/` · `downloads/TheGaffer.apk` | The Gaffer's Android update feed (`latest.js`), health check, Supporter-pack purchase check (`verify-purchase.js`), and published APK. `.github/workflows/build-the-gaffer.yml` builds web + APK on every push to `main`, commits the web build (and the APK + feed when `android/` changed) with `[skip ci]`, then calls the `VERCEL_DEPLOY_HOOK` secret. |
| `design/` | Shared Semba design tokens/components/icons that The Gaffer's source imports (kept off the site by `.vercelignore`) |
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
- Current versions: web game `2.4.0`, Android `2.4` (versionCode 15).
- Game math (v2 "Plot Twists", tuned by simulation; full rules and metrics were written to `MATH_NOTES.md` during the overhaul): 5 players, 7 days, `CONFIG.CONTACTS` 3 a day, Deadline Day `CONFIG.DD_CONTACTS` 3 and `CONFIG.DD_SECONDS` 60 (real-time clock, `game.ddEndsAt`, resumes on reload). Sources open over the week (airport spotter day 4, physio day 6 and DD). Exactly 2 real deals twist per window (seeded from `seed+':tw'`): pre-twist reads go outdated, that player's sources can be asked again, and updating a call after a twist is free. Scoring: +4 per day left on right calls, exclusive +20 (before any rival post), +10 for a right post-twist call; wrong Sure −12 / Confirmed −45. Daily/Practice: all sources open Day 1 (physio/airport give 55% hunches before day 6/4), 4 contacts. Career/Rooms: 3 contacts, airport from day 4, physio day 6, plus a source upgrade tree (3 reliability levels per source, physio/airport unlock earlier) and Career-only tier bars that rise with upgrade progress (385/320/260 new → 395/360/340 maxed; locked per window). Daily tiers 395/330/270/70: strong play ~12% T1; maxed career ~36% T1 / 59% T2+ / 70% T3+, casual ~0%, final calls on days 6–7 in ~76% of Dailies; career crunch drops with gear to ~47%. Boost prices double per repeat buy within a window.
- Sources stick to their story: each source can be asked once per player per window, and again after that player's twist (`contactSource` returns false otherwise). About 1 in 3 telling news-wire events is a planted red herring (`e.o`, rolled from a separate `seed+':rh'` RNG so base boards are unchanged). Rival/wire news is shown per player: a NEW chip on the card and a BREAKING banner when that player is opened (`s.newsSeen`); an Overnight sheet summarises news after End day. Bribe $150, once per player.
- Text freshness: every source line, source DM, rival post, news-wire item, official line and DM opener is chosen with `freshPick()`, so nothing repeats within a window and recently seen lines are avoided. New text goes in a voice pack (v2–v5 blocks) as appended arrays. v5 is the harsher banter pack: still no slurs, sexual content, family/body/identity insults or claims about real people beyond football.
- Career economy: pay per window = $40 + half the points + $20 per exclusive + tier bonus (T1 120, T2 60, T3 30, T4 10), ×1.25 at 70+ rep; daily Payday +$60 and one ad +$40 per day (solo only). The full gear set ($3,590) takes about 15 windows. Career goals (level 7, Tier 1 ×3, all gear, 100K followers) unlock the Tier One Legend badge; the Goals tab also tracks 5 milestones (`careerMilestones`, stats in `C().stats`). Once all 4 goals are done a solo career can start a **Legend career** (prestige): `C().prestige` +1, keeps trophies/followers/catchphrases/skins, resets level/cash/gear/source tree/T1 count; tier bars +10 and pay +10% per prestige level, LEGEND tag on Home/Career/share. Shop items and tree steps show a one-sentence effect derived from the real numbers (`crOneLiner`/`crTreeLiner`) and, where honest, "pays for itself in ~n windows" (`payoffWindows`). Level-ups show a sheet with concrete unlocks (`crLevelSheet`). Cash packs ($400/$1,400/$3,500) need `STRIPE_LINKS` filled in `CONFIG`.
- In-game currency is shown as dollars (`$`), but the save field is still `career.credits`.
- UI architecture (overhaul): lane slots in the file (`@@LANE CSS|I18N|JS:<name>` markers; lanes: math, ds, home, board, player, results, career, online, content, rivals, lb, results2, onb, rival2, career2, dd), `LANE_ACTS` (click actions, checked before built-ins), `SCREENS` (extra screens for `go()`), `onHook(event,fn)` engine hooks (contact, call, uturn, day, ddtick, resolved, rendered), `BACK` handlers for Android Back (`window.__tierBack`). Achievements: `ACH` catalog, `save.ach`/`save.stats`, PS5-style pop-ups. Add new code in the matching slot rather than editing shared code.
- Launch-polish features (2.4): leaderboards (`window.LB`, `SCREENS.leaderboard`, `lb:rank` DOM event, `save.daily.history[k].rank`); results extras (profile `rs2Profile`, rank `#rsRank`, streaks, room comparison, proof line, Challenge a friend, U-turn first take `s.rs2first`, rival verdicts); rival race meter + reactions (`s.rx = {tabloid|itk|insider: {v:'doubt'|'big', day}}`, mirrored to `result.per[i].rx`); Deadline Day intensity (`--ddp` on `<html>`, heartbeat ≤30 s, `#ddSnap` snap-call overlay ≤15 s posting `'med'`, `game.ddSnapOff`); Career journey (above). Lanes that decorate screens they don't own use `rendered` hooks and MutationObservers (results2, rival2, career2) — keep them idempotent (`data-sig`).
- Multiplayer rooms: each room has its own career in `save.rooms[code].career`; game code reads the active career through `C()` (solo career unless `roomCtx` is set). Use `C()`, not `save.career`, in anything that runs during a window.
- ⚠️ `CONFIG.DAILY_REPLAY` in `tier-one/index.html` is `true` **for testing only** (the Daily Challenge can be replayed). Set it back to `false` before real players use it.
- **New game:** create `games/<slug>/` with its own `README.md` and add a card/row to the root `README.md`.
- The game file is large (~1.4 MB, very long lines). Search it with grep; don't rewrite it wholesale.
- Arabic text in the game and READMEs is Egyptian Arabic; keep that tone.

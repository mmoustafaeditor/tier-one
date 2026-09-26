# Team update log

Every change to this repo gets an entry here, **newest first**, so each of us (and each
Claude Code session) can see what the others did before starting work.

**How to add an entry:** copy the template, put it at the top of the list, fill it in, commit it
together with your change.

```markdown
## YYYY-MM-DD · <who> · <short title>
- **What changed:** …
- **Files:** …
- **Heads-up for the team:** … (anything the others must know or do; "None" if nothing)
```

`<who>` is the person the work was done for (their GitHub name), e.g. `saifsaber`, `mmoustafaeditor` or `moemsacod`, even when Claude Code did the typing.

---

## 2026-09-26 · mmoustafaeditor · Redeploy request done
- **What changed:** Saif's "Redeploy the site on Vercel" request is closed: mmoustafaeditor's push to `main` (2a3614d)
  deployed on Vercel ✅, which also put Saif's tidy-up live (`/api/verify-purchase` now answers). Removed the request
  from `.claude/requests.md`.
- **Files:** `.claude/requests.md`, `UPDATES.md`.
- **Heads-up for the team:** Saif's own merges will still be blocked until he's added to the `semba-game-studios`
  Vercel team (Settings → Members).

## 2026-09-26 · mmoustafaeditor · Play with friends (rooms), transfer codes, dollars, 10 new gear items
- **What changed:** New **Play with friends**: create a private room (3/5/10 seasons) or join with a 5-letter code or
  invite link; each season everyone in the room gets the same sagas; each room has its own career and a leaderboard.
  **Move to another device** in Settings gives a short transfer code (30 days). Credits are now dollars (`$`).
  Gear shop grew from 4 to 14 items with level locks (source-reliability boosts, Deadline Day power bank, podcast
  studio for followers, blue tick for exclusives, lucky trench coat, second laptop). Outcomes renamed to
  "❌ Deal collapses, he stays" / "🧢 Fake news, never real". Web 1.5.0, Android 1.7.
- **Files:** `tier-one/index.html`, `api/online.js` (new), `games/tier-one/LAUNCH.md`, `games/tier-one/app/build.gradle`,
  `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** ⚠️ Online play needs a Redis store connected in Vercel (steps in `games/tier-one/LAUNCH.md` ›
  Online play). Until then the game says "Online play is switching on soon". Use `C()` for the active career in game code.
  `DAILY_REPLAY` still `true`. Next Android release is versionCode 9.

## 2026-09-26 · saifsaber · Deploy check: every session says if main isn't live on the site
- **What changed:** The session hook now checks the Vercel status of the latest `main` and warns when the deploy was
  blocked (Vercel only deploys commits from accounts in the `semba-game-studios` team, so merges from saifsaber or
  moemsacod get blocked). `CLAUDE.md` section 2 now says: after a change lands on `main`, make sure it's live; a push
  to `main` from mmoustafaeditor deploys everything, otherwise Redeploy in Vercel.
- **Files:** `.claude/hooks/team-sync.sh`, `CLAUDE.md`, `UPDATES.md`.
- **Heads-up for the team:** mmoustafaeditor: after you finish new work and push to `main`, check that `main` shows ✅.
  That one push also puts live anything Saif or Moemen merged before it.

## 2026-09-26 · saifsaber · Team requests board; ⚠️ Mohamed: please Redeploy on Vercel
- **What changed:** New `.claude/requests.md` for requests one teammate leaves for another (things only that person
  can do). The session hook reads it from `origin/main` and shows every open request at the start of each Claude Code
  session, so Claude tells the user first. First request: mmoustafaeditor, please Redeploy on Vercel (the PR #2 deploy
  was blocked because Saif's account isn't in the Vercel team).
- **Files:** `.claude/requests.md` (new), `.claude/hooks/team-sync.sh`, `CLAUDE.md`, `UPDATES.md`.
- **Heads-up for the team:** Live site is still the pre-tidy-up deploy until Mohamed redeploys. When a request is
  done, delete it from `.claude/requests.md`.

## 2026-09-26 · mmoustafaeditor · Repo tidy-up: Stripe function into api/, .gitignore, hook fix, old branches removed
- **What changed:** Done by saifsaber at mmoustafaeditor's request. The session hook no longer prints "This repo is
  RETIRED" in the team repo (it now only shows inside a `saifsaber/tier-one` clone). `verify-purchase.js` moved to
  `api/verify-purchase.js`, so Vercel actually serves it at `/api/verify-purchase` (it did nothing at the root).
  New `.gitignore` for Gradle/Android build output. Removed the unused `assets/semba-logo-512.webp`; the Play Store
  icon moved to `games/tier-one/store/`. Stale branches `claude/android-project` and `claude/studio-setup-port`
  (fully merged) were deleted. No game or app changes.
- **Files:** `.claude/hooks/team-sync.sh`, `api/verify-purchase.js` (moved), `.gitignore` (new),
  `assets/semba-logo-512.webp` (deleted), `games/tier-one/store/play-store-icon-512.png` (moved), `README.md`,
  `CLAUDE.md`, `games/tier-one/README.md`, `games/tier-one/LAUNCH.md`.
- **Heads-up for the team:** `claude/apk-build-sembagames-sync-1cnmkc` is identical to `main` but was left alone
  because it was in use; delete it once that session is done. The Stripe function is now live on deploy but harmless
  until `STRIPE_SECRET_KEY` is set and `VERIFY_ENDPOINT` is filled in. `DAILY_REPLAY` is still `true`.

## 2026-09-26 · mmoustafaeditor · Player types matter, roomy source list, unskippable intro with sound
- **What changed:** Superstar ★★★ (×1.5 points, ×2 followers), Star ★★ (×1.2, ×1.4) and Squad player ★ (×1) now
  change scoring, right or wrong: gold/silver badges on saga cards, an explainer in the saga sheet, the call buttons
  show this player's exact stakes, and results show points and followers per call. Tier cutoffs raised ~25%
  (Tier 1 = 375+) to keep it hard. Sources are now a one-per-row list with a big "contacts left today" wallet
  (number + pips) and a cost pill per source. The Semba intro can't be skipped; if the browser blocks sound it shows
  "Tap to start" so it always plays with sound. Web 1.4.0, Android 1.6.
- **Files:** `tier-one/index.html`, `games/tier-one/app/build.gradle`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** Open question with the user: renaming/merging the "❌ Collapses / he stays" and
  "🧢 Nothing in it" outcomes (unchanged for now). `DAILY_REPLAY` still `true`. Next Android release is versionCode 8.

## 2026-09-26 · mmoustafaeditor · Intro soundtrack, new barber/leak sounds, cleaner source tiles, sources bash the players
- **What changed:** The Semba intro now has a soundtrack timed to the video (neon power-on, dim, riser, a silent beat,
  the impact at 2.53s with debris, the neon re-ignite "shing" and a chord), baked into `semba-intro.webm/.mp4`. It plays
  with sound where allowed (Android app, Chrome after clicking through from the home page); otherwise it plays muted
  with a "🔊 Tap for sound" chip. New sounds: barber = scissor snips, spray bottle, comb flick and a short trimmer pass;
  leak = an old newsroom fax (dial, handshake, data, paper feed). Source tiles: contact cost is a badge in the corner,
  reliability (bars + High/Medium/Low) is a clean footer, "Your record" under it in Career; fixed the overlap and the
  RTL flip. About 360 new lines where sources take football-only shots at the player they're talking about, plus
  harsher post-match DMs at the journalist (EN/ES/AR). Web 1.3.0, Android 1.5.
- **Files:** `tier-one/index.html`, `tier-one/semba-intro.webm|mp4`, `games/tier-one/intro-sound/render.js` (new),
  `games/tier-one/app/build.gradle`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** `DAILY_REPLAY` is still `true` (testing). Next Android release is versionCode 7.

## 2026-09-26 · mmoustafaeditor · Sound overhaul; Daily Challenge replayable for testing
- **What changed:** New synth sound engine (no audio files, works offline in the app): the agent call is a double phone
  ring, pickup click and a clearly fake gibberish phone voice (with a voice meter on screen); barber is electric clippers
  and scissor snips; airport is a terminal chime and a jet flyby; physio heart monitor, kitman locker clang, leak
  typewriter, bribe cash register. Also a day boom, Deadline Day siren, typing clicks, send whoosh, hit/miss stings,
  a Tier 1–2 fanfare and a sad trombone for the clown tier. `CONFIG.DAILY_REPLAY` (new) lets the Daily be replayed:
  the tile says "Play again" and the latest run replaces that day's result (streak unaffected). Web 1.2.0, Android 1.4.
- **Files:** `tier-one/index.html`, `games/tier-one/app/build.gradle`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** ⚠️ `DAILY_REPLAY` is `true` for testing. Flip it to `false` (and ship a build) before launch.
  Next Android release is versionCode 6.

## 2026-09-26 · mmoustafaeditor · Cleaner studio home page; intro plays on every game load
- **What changed:** sembagames.app is now a single screen: headline, one Tier One card (Play / Android),
  "More games coming soon", and a one-line footer. The Semba intro now plays every time the game page loads
  (clicking Tier One or reloading), not once per session; it is skipped on Stripe returns and Privacy/Terms links.
- **Files:** `index.html`, `tier-one/index.html`, `CLAUDE.md`.
- **Heads-up for the team:** The APK already plays the intro on every app launch, so no rebuild needed.

## 2026-09-26 · mmoustafaeditor · Tier One 1.3: Semba intro, 3 source tiers, way more banter, new animations
- **What changed:** The game now opens with the Semba Studios intro video (once per browser session, tap to skip,
  still-image fallback when autoplay is blocked). Sources come in 3 tiers with a reliability bar under each one:
  High (Physio, Airport spotter) costs 3 contacts, Medium (Agent, Kitman) 2, Low (Barber, Rival newsroom leak) 1;
  Deadline Day now has 3 contacts. About 600 new lines (source clues, source post-match DMs, fan roasts and praise)
  written natively in English, Spain Spanish and Egyptian Arabic, PG-13; fixed source replies only ever using 2
  variants and the fan-comment pool being capped. The murky "Day 2 of 7" splash is replaced by a full-contrast
  day stinger; new motion across the game (screen entrances, spring bottom sheets that slide out, logo slam,
  tier sunburst, contact connection bar). Web 1.1.0, Android 1.3 (versionCode 4).
- **Files:** `tier-one/index.html`, `tier-one/semba-intro.webm|mp4|jpg` (new), `games/tier-one/app/build.gradle`,
  `.github/workflows/build-tier-one.yml`, `downloads/TierOne.apk`, `api/tier-one/latest.js`, docs.
- **Heads-up for the team:** New game text goes through the "Voice pack v2" block in `tier-one/index.html`
  (arrays there are appended to the older packs, not replacing them). The APK build now bundles the whole
  `tier-one/` folder's `index.html` and `semba-intro.*`. Next Android release is versionCode 5.

## 2026-09-26 · mmoustafaeditor · Android project wired up: builds from the live game, CI, 1.2
- **What changed:** Finished bringing the Android app into `games/tier-one/`. The APK no longer keeps its own copy
  of the game: Gradle copies `tier-one/index.html` into the app at build time. New workflow
  `build-tier-one.yml` builds the APK on every push that touches the game or `games/tier-one/**`. Version set to
  1.2 (versionCode 3) to match the APK already published. Added `.vercelignore` so `games/` (which holds the
  signing key), `.github/`, `.claude/`, `CLAUDE.md` and `UPDATES.md` are not served on sembagames.app.
  Docs updated for the new site layout.
- **Files:** `games/tier-one/app/build.gradle`, `.github/workflows/build-tier-one.yml`, `.vercelignore`,
  `README.md`, `CLAUDE.md`, `games/tier-one/README.md`, `games/tier-one/LAUNCH.md`.
- **Heads-up for the team:** ⚠️ Keep `.vercelignore`: without it the signing key would be downloadable from the site.
  Next Android release is versionCode 4.

## 2026-09-26 · mmoustafaeditor · Studio home page, game moved to /tier-one, Daily archive, APK 1.2
- **What changed:** sembagames.app is now the Semba Games studio home page (official Neon Ring logo, green brand).
  Tier One moved to `tier-one/index.html`, served at sembagames.app/tier-one; share cards link there. In the game:
  "Daily window" is now "Daily Challenge"; tapping a finished Daily opens the full results (it used to do nothing);
  a new *Past challenges* screen keeps the last 120 days on the device. Days played before this change show outcomes
  and your emoji row but not your tweets. Published APK 1.2 (versionCode 3) and bumped the update feed.
- **Files:** `index.html` (now the home page), `tier-one/index.html` (the game), `assets/`, `downloads/TierOne.apk`,
  `api/tier-one/latest.js`.
- **Heads-up for the team:** ⚠️ The game is no longer at the root `index.html`: edit `tier-one/index.html`.
  Stripe Payment Links, once added, should return buyers to `/tier-one` (the home page forwards `?purchase=` there
  as a fallback).

## 2026-09-26 · saifsaber · Studio setup brought over from saifsaber/tier-one
- **What changed:** This repo is now the Semba Studios repo everyone works in (`saifsaber/tier-one` is retired).
  Added the studio README with the banner and clickable Tier One card, the brand art, `CLAUDE.md`, this log,
  and a Tier One game page written from the current game (10 contacts, 1–2 contact sources, Tier 1 at 300+).
  The old launch-kit README moved to `games/tier-one/LAUNCH.md`.
- **Files:** `README.md`, `CLAUDE.md`, `UPDATES.md`, `.github/assets/`, `games/tier-one/README.md`,
  `games/tier-one/LAUNCH.md` (was `README.md`).
- **Heads-up for the team:** ⚠️ The root `README.md` is now the studio page; the hosting/ads/Stripe guide is
  `games/tier-one/LAUNCH.md`. The game files did **not** move: `index.html`, `api/` and `downloads/` stay at the
  root because sembagames.app and installed apps load them from there. Still to bring over from the old repo:
  the Android Gradle project + `debug.keystore` (into `games/tier-one/`), a GitHub Actions APK build, and the
  `.claude/` session-start hook.

## 2026-09-26 · mmoustafaeditor · Launch kit, balance update and Android 1.1 feed
- **What changed:** Uploaded the web launch kit (the game in `index.html`, Stripe verification, a hosting/ads/
  analytics guide). Then the game got the balance redesign: 10 contacts a day, premium sources (agent, physio,
  airport) cost 2 and budget ones (kitman, barber, leak) cost 1, Tier 1 needs 300+, Career scores ×1.0–1.25 by
  followers, Daily results can be reopened, more replies in EN/ES/AR, share cards point to sembagames.app.
  Added the Android update feed (`api/tier-one/latest.js`, version 1.1 / versionCode 2) and the 1.1 APK.
- **Files:** `index.html`, `verify-purchase.js`, `api/tier-one/latest.js`, `downloads/TierOne.apk`, `README.md`.
- **Heads-up for the team:** This already includes everything from the old repo's unmerged
  `claude/apk-build-sembagames-sync-1cnmkc` branch that players see: the game changes are identical and the
  hosted APK was built from that branch (it has the UpdateChecker). The branch's Java/Gradle source is not here yet.

# History from saifsaber/tier-one (retired)

Paths below are as they were in the old repo.

## 2026-09-26 · saifsaber · Studio logo swapped for the exact design #17
- **What changed:** The hand-drawn vector S is gone. The studio logo is now the exact "Neon Ring"
  design #17 from the approved icon sheet, saved as `semba-logo.png` (512×512, rounded corners) and
  embedded in the studio banner.
- **Files:** `.github/assets/semba-logo.png` (new), `.github/assets/semba-logo.svg` (removed),
  `.github/assets/studio-banner.svg`, `CLAUDE.md`.
- **Heads-up for the team:** The PNG is upscaled from the icon sheet (~200px source). If anyone has the
  original high-res logo file, drop it in as `semba-logo.png`.

## 2026-09-26 · saifsaber · Official logos: Semba neon S + Tier One T1
- **What changed:** Added vector logos: `semba-logo.svg` (studio, design #17 "Neon Ring": green S in a
  glowing ring) and `tier-one-logo.svg` (yellow T1 badge with red dot). The studio banner now uses the
  Semba logo and neon-green accents; the Tier One card and the game README use the T1 logo.
- **Files:** `.github/assets/semba-logo.svg`, `.github/assets/tier-one-logo.svg`,
  `.github/assets/studio-banner.svg`, `.github/assets/tier-one-card.svg`, `README.md`,
  `games/tier-one/README.md`, `CLAUDE.md`.
- **Heads-up for the team:** Studio brand colour is now neon green `#B6FF3A`; Tier One stays yellow `#FFD23F`.
  The Android launcher icons and `play-store-icon-512.png` were **not** changed yet.

## 2026-09-26 · saifsaber · Docs updated for a three-person team
- **What changed:** README, CLAUDE.md, UPDATES.md and the session-start hook now name all three of us
  (`saifsaber`, `mmoustafaeditor`, `moemsacod`) instead of assuming two people.
- **Files:** `README.md`, `CLAUDE.md`, `UPDATES.md`, `.claude/hooks/team-sync.sh`.
- **Heads-up for the team:** None.

## 2026-09-26 · saifsaber · Published APK rebuilt with game v1.0.0
- **What changed:** Replaced `games/tier-one/downloads/TierOne.apk` with the CI build of the current
  game (includes mmoustafaeditor's v1.0.0 update). The download link now serves the latest game.
- **Files:** `games/tier-one/downloads/TierOne.apk`.
- **Heads-up for the team:** `versionCode` is still 1, so this installs as a reinstall over the old APK.
  Bump it on the next release.

## 2026-09-26 · saifsaber · Studio repo makeover + team update log
- **What changed:** Turned the repo into the Semba Studios page. New studio README with a
  clickable game card, a full README for Tier One (story, sources, how to play, install, build),
  this update log, `CLAUDE.md`, and a Claude Code session-start hook that shows the latest
  updates automatically.
- **Files:** `README.md`, `UPDATES.md`, `CLAUDE.md`, `.claude/`, `.github/assets/`,
  `games/tier-one/README.md`, `.github/workflows/build-apk.yml`.
- **Heads-up for the team:** ⚠️ **The Android project moved to `games/tier-one/`.** The game file is now
  `games/tier-one/app/src/main/assets/index.html` and the APK is `games/tier-one/downloads/TierOne.apk`.
  Pull before you edit. CI now only runs when something under `games/tier-one/` changes.
  The old root copy `workflow-build-apk.yml` was removed (the real workflow is in `.github/workflows/`).

## 2026-09-26 · mmoustafaeditor · Tier One updated to latest version (v1.0.0)
- **What changed:** Synced the game with the latest artifact version, v1.0.0, with the recent
  improvements and feature updates (commit `48fdfdb`).
- **Files:** `app/src/main/assets/index.html` (now `games/tier-one/app/src/main/assets/index.html`).
- **Heads-up for the team:** `downloads/TierOne.apk` was **not** rebuilt in that commit, so the
  download link still serves the build from before this update.

## 2026-09-26 · saifsaber · Initial Android project + first APK
- **What changed:** Imported the Tier One Android project, fixed the Android SDK setup in CI,
  published the first built APK with a direct download link.
- **Files:** whole project.
- **Heads-up for the team:** None.

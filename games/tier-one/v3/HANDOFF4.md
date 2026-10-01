# Tier One 4.0 "Insider" — handoff for the next session

Read this first, then CONCEPT4.md (the game), RULES4.md (every number), docs/NUMBERS_3x.md (the old numbers with file:line),
GOTY.md §12. You are the lead designer and the boss: the owner has said they are tired of deciding; decide, build, ship.

## Where things stand (2026-10-01, late afternoon UTC)

- **Live site** (sembagames.app/tier-one) still runs 3.4.0 "One Newsroom". The Android feed (api/tier-one/latest.js) is Saif's
  3.4.0 / versionCode 19: do not touch it; no APK builds.
- **Branch `lane8/t1-hybrid`** (origin) is the integration branch for 4.0. It contains:
  - the 4.0 rules engine `api/tier-one/v3/_lib/engine4.mjs` + sim `games/tier-one/v3/sim/sim4.mjs` (RULES4 §1 numbers reproduce);
  - **phase A, merged** (merge commits 9f69311 rules, dd32242 economy, 76b9fac shell):
    - *rules* lane: `web/src/lib/driver.ts` `makeDriver()` (one driver for every mode), server v4 scoring/replay in `api/tier-one/v3/index.js`
      (Daily from `V4_FROM = 2026-10-05`, rooms, challenges with a rule spec), Practice with the Coach, `i18n/parts/rules4.ts`;
    - *economy* lane: `web/src/lib/economy.ts` (every RULES4 §3 number: XP, Level, Season, Rep/ranks, followers, coins, prices, Secret files),
      `lib/deals.ts` (Sponsors per CONCEPT4 §4), `lib/meta.ts` result functions returning `Gain`, one shop/one pack table
      (`api/tier-one/v4/config/catalog.json`), save migration v3→v4, `i18n/parts/economy4.ts`;
    - *shell* lane: the phone OS `web/src/ui/phone.tsx` + `styles/phone.css`, `ui/juice.tsx` (Count, Pop, Ticker, Typing, notify/NotifyHost/useTray,
      Ratio, Stamp, Sheet, useHaptic), lock screen (`screens/Front.tsx`), home screen (`screens/Home.tsx`), Settings app, routing
      `?app=blurt|dms|lens|story|live|market|groups|boards|settings` in `App.tsx`, sounds in `lib/sfx.ts`, `docs/DESIGN_SYSTEM.md`,
      `i18n/parts/shell4.ts`;
  - the repo-shipped skills `.claude/skills/{frontend-design,design-critique,ux-copy,design-system,accessibility-review}` (read and follow
    them before writing any screen or copy);
  - the saved workflow `games/tier-one/v3/workflow/insider-apps.workflow.js`.
- **Phase B (the apps) has NOT been built.** The previous session hit its usage limit right after merge A, before the merge-A
  integrator finished (its last partial edit, the level/unlock fallback swap, is committed as the follow-up on top of 342a9e4).

## What to do next (in order)

1. **Environment.** Clone/checkout `lane8/t1-hybrid`. In `games/tier-one/v3/web`: `npm ci` (or symlink an existing install to
   `node_modules`; never commit it). `npx tsc --noEmit` must pass before you start. Browser checks: playwright-core + chromium
   (`/opt/pw-browsers/chromium` on the cloud image), `npx vite --port 52xx`, seed localStorage `tierone_v3`.
2. **Run the saved workflow** (Workflow tool, `scriptPath` = `games/tier-one/v3/workflow/insider-apps.workflow.js`; if the script's
   absolute paths differ on your machine, edit `REPO` and the worktree paths at the top first). It does, in this order: finish merge A
   (levelUnlocks = { market: 2, live: 3, groups: 4 }, fallbacks swapped, build green) → five app lanes in parallel worktrees (play =
   Blurt + DMs + results thread; story = Story mode per CONCEPT4 §16; lens = profile, Sponsors, looks shop, season, Secret files; onboarding =
   the first five minutes per CONCEPT4 §12 + the word sweep; modes = Live, Market, Groups, Boards) → integrate (one game on one phone, old
   words gone, films gone, version 4.0.0) → polish (pixel pass per app + an independent verifier that tries to refute it) → final cohesion.
   The owner wants every agent on **Fable at high effort**; the script already sets that.
3. **Ship.** From the repo root on `lane8/t1-hybrid`: `cd games/tier-one/v3/web && npm run build:web` (never `build:min`/APK), commit
   `tier-one/` (index.html, assets/, sw.js, manifest, version.json), add the UPDATES.md entry (newest first), then
   `git push -u origin lane8/t1-hybrid:main`. Check `https://www.sembagames.app/tier-one/version.json` shows the new build (Vercel deploys
   main; ≤ 12 serverless functions on Hobby, so nothing new under `api/` outside `_`-prefixed folders).
4. Tell the owner what shipped, in plain words, and what is still rough.

## The owner's standing rules (do not re-ask)

- It must FEEL like a game and be easy to look at (GOTY.md §12). Simple for a new player, captivating, a bit mysterious, hard to master.
- Not the classic AI look; AI tools may be used to make it. No gradient blobs, glassmorphism, emoji icons, identical card grids.
- **No drawn motion films or illustrated scenes, ever** (CONCEPT4 §6). Motion is the phone's own motion (posting, the Drop reveal, the
  call screen with ambient sound, typing dots, number rolls). The five contacts stay.
- No "HERE WE GO" (legal). No real people, brands or platforms. Fictional everything (Blurt, Lens, Volt, Nine…).
- The Daily is you vs real players; rivals are Story bosses (CONCEPT4 §10). The banter stays everywhere.
- Sponsors pay per right call by loudness, warn on a wrong Post, strike on a wrong Drop, walk only at the limit (CONCEPT4 §4).
- The Market (real transfers) is a headline app: watch free, call at Level 2 (CONCEPT4 §9).
- Monetization: Gold, looks (phone themes/wallpapers first), coin packs, one starter bundle; nothing paid touches a score; no popups.
- Never touch The Gaffer (games/the-gaffer, the-gaffer/, api/the-gaffer). Keep Saif's Android feed. UPDATES.md entry for every change.
- Commit trailer: `Co-Authored-By: Claude <model> <noreply@anthropic.com>` + `Claude-Session: <your session url>`.
- Search the plugin/connector catalog whenever a tool could help, and use it; the owner installed frontend-design, Skills For Real
  React/React Native Engineers (native-feel, ui-motion, unslop), Design and Supericons on claude.ai — use them if your session sees them.

## Known rough edges to carry into phase B

- Blurt currently opens the legacy window screen; `lib/driver3.ts` (the v3 driver) is still imported by old screens and should be deleted
  with the last v3 screen (play lane).
- `lib/synth.ts` has a synth voice named `herewego` (unused) and `i18n/parts/scenes.ts` still has `hwg: 'DONE DEAL!'` strings (the word
  sweep removes them with the films).
- `levelUnlocks` in `lib/economy.ts` is `{ market: 2, live: 3, groups: 4 }`; `wire` (the Market's old id in routes and `Mode4`) is accepted as an alias by `unlockLevelOf` / `isUnlocked`. The Market tile is never locked; the call sheet gates at Level 2 (`ui/phone.tsx canCall('market')`).
- `lib/meta.ts onDriverDone(outcome, driver)` is the one settle for a `Driver4` window (pass it as `makeDriver({ onDone })`); `onGain()` is how the shell hears about a Gain (App puts sponsor offers and a brand walking in the tray).
- Press box (`lib/social.ts`) must send `v: 4, rules` on `challenge.create` (server accepts both).
- Deadline Day practice is startable via `makeDriver({ mode: 'deadline' })` but has no route until the modes lane adds the Live app.

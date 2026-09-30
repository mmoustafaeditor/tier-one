# Tier One 3.3: "One Byline" (GOTY pass)

Owner's brief (30 Sept 2026): keep the look and the way it plays. Make every feature feel connected, to each other and to
the player, with a never-ending feel and room for future ideas. Better animation, real desktop and mobile layouts, and
up-to-date football. It's a business, so there should be ways to make money, but it must never feel like a cash grab.
Claude decides the game maths.

## North star (the test every screen must pass)
**You are making a name for yourself in football journalism.** Every mode is a beat on the same career.
Every screen answers one question, "how is my name doing, and what should I break next?", and hands you the next story.

That means:
- **One journalist.** The byline, rep and followers are the same everywhere. Every result screen shows how your name
  moved.
- **One newsroom.** The same desk, the same five sources and the same three rivals appear in every mode. They remember
  you, through contact levels, rival ledgers and the Feed.
- **One loop:** get a tip → make a call → it lands or it doesn't → your name moves → the next story is already waiting
  (Next up).
- **One voice:** plain, active, in-world copy. The stamps and headlines are loud and everything else is quiet.
- **One opening:** the first launch plays the cold open when you create your byline. It is the game's opening, not just
  Career's.
- **No dead ends:** every screen, empty state and result links to the next thing to do.

Any feature that doesn't serve this is cut or folded in.

## 0. What doesn't change
- The rules engine (`api/tier-one/v3/_lib/engine.mjs`) and its numbers. Daily scoring, stored scores and leaderboards stay
  comparable. Nothing bought, levelled or unlocked changes a Daily board, its sources or its score. This is the fairness
  line and every lane respects it.
- The save key `tierone_v3`. New fields are optional and default safely, and older saves load unchanged.
- The look (HYBRID.md §2): paper on the newsroom desk, the stamps, the colour per mode, and EN/AR (Egyptian)/ES.

## 1. The connected core: one byline across every mode
Every mode feeds the same journalist. Four shared systems (`lib/byline.ts`) hold it together.

### 1.1 Followers and Reputation (global)
- `save.byline = { followers, rep, hot, best }`.
  - `rep` runs 0–100 and starts at 50.
  - `hot` is the hot-hand streak: right calls in a row, across all modes.
- Every resolved call in any mode moves followers.
  - A right call gains `base × mode × (1 + 0.1 × min(hot, 10))`.
  - A wrong call loses `base × mode × 0.5`, and `hot` resets to 0.
  - Base by loudness (Talks / Advanced / Confirmed): right 40 / 90 / 220, wrong 20 / 60 / 260.
  - An Exclusive adds +300.
  - Mode factor:
    - Daily ×1
    - Career ×1
    - Rooms ×0.8
    - Wire ×1.5 (real football)
    - Practice ×0.25
- Rep moves +1 per right call and −2 per wrong Confirmed call, clamped to 0–100.
- Rep tiers set the flair shown on the byline and on share cards. Since 3.4 they are the Career rank gates, so the
  byline's word and the story's word are one ladder: Blogger < 55, Stringer 55–64, Correspondent 65–74, Chief 75–84,
  Tier One 85+. A new name (rep 50) is a Blogger.
- Career keeps its own story rank (its save slot). Its calls feed the global byline like any other mode (×1), and
  "credibility" in Story is this same rep.

### 1.2 The Contacts Book
- The five sources (kit man, barber, agent, airport spotter, physio) each have a relationship with you:
  `save.book[src] = { xp, lv }`. Levels run 1–5, with XP thresholds 0 / 60 / 160 / 320 / 560.
- Earning XP:
  - +10 for each ask.
  - +25 when a source's read was right and your call matched it.
  - +5 on a right call where you ignored the source's wrong read. That's the "learning who lies" beat.
- What levels give, cosmetically and in every mode:
  - Lv2: a new caller-card frame.
  - Lv3: a second voice-line pack, with warmer lines.
  - Lv4: a nickname for you in their messages.
  - Lv5: a gold card and a trophy.
- In Career and Practice only (never in the Daily or rooms):
  - Lv3: the source's first ask each window costs 1 less (minimum 1).
  - Lv5: once per window, a "second opinion" re-ask at no cost.
- Coins: "Buy them a coffee" costs 30 coins for +20 XP, once per source per day. It speeds up the cosmetic and Career
  perks and never touches the Daily.

### 1.3 Rivals are characters, not NPC noise
- The three rivals (@TheTabloid, @ITK_Kev, @TheInsider) plus Career's @BackPageBants each keep a head-to-head ledger:
  `save.rivals[id] = { w, l, d, streak, last }`.
- The ledger updates on every resolved saga, in any mode, where that rival posted on a player you called.
  - A win is you right and them wrong.
  - A loss is them right and you wrong or not filed.
  - A draw is both right.
- The Rivals screen shows each rival's card, record, current streak, last taunt, and a "scalp" stamp at 5 net wins.
  Net 10 wins earns their rivalry trophy and a cosmetic stamp.
- Rivals taunt or concede in the Feed after results. The line depends on the record, from a new banter pool.

### 1.4 The Feed: one timeline for everything
- `save.feed`: newest first, capped at 60. The kinds are:
  - editor notes (Career story beats)
  - rival taunts and concessions
  - Wire resolutions ("Your call on X landed: +40 followers")
  - room results
  - contact level-ups
  - mission completions
  - level-ups and season rewards
  - streak alerts ("Daily streak 6: play before midnight local")
- Each item deep-links to the place it's about.
- A bell icon in the top bar with an unread badge opens the Feed screen.
- Home shows the top two unread items as "For you" cards.

### 1.5 Next up: Home always knows what to do next
Home's hero card is chosen by priority:
1. The Daily isn't played today.
2. A live window is in progress (resume it).
3. A Wire call has resolved and isn't seen yet.
4. A Career window is ready.
5. A room has new results.
6. A mission is claimable.
7. Practice with this week's event.

The Daily keeps its own card below when it isn't the hero.

### 1.6 Wire ↔ Career ↔ Daily
- A player in a Daily, Career or Practice window who is also live on the Wire gets an "ON THE WIRE" chip, which links to
  the rumour.
- The Wire's resolved calls feed followers, rep, the hot hand and the Feed (1.1, 1.4).

## 2. Calls: same maths, better feel
- The four outcomes (Done / Hijack / Off / Fake) and the three loudness levels stay. The words stay too, because players
  have learnt them.
- **HERE WE GO:** a Done call at Confirmed is published as "HERE WE GO!".
  - The post card is gold-framed.
  - It has its own stamp and sound.
  - The share card leads with it.
- **Hold to publish:** the loudness button fills over 600 ms while held (a tap still works). The press rolls, then
  PostScene plays.
- **U-turn becomes "Delete & repost":** the old post is struck through, "ratio" replies pile in, then the new post
  flies in. The same engine U-turn runs underneath.
- **Stake preview:** above Publish, one line shows "Right: +X · Wrong: −Y · Exclusive still open" (or "Beaten by
  @ITK_Kev"). The numbers come from `preview()` and `exclusiveOpen()`.
- **Rival race:** on the saga screen, the three rival avatars light up and show their claim once they've posted. Your
  ledger record against each rival shows under their avatar.
- **Overnight:** rival posts come in as breaking cards with the rival's avatar and a taunt that fits the ledger. A twist
  is a glitch and a STOP PRESS slam.

## 3. Seasons and the economy (never a cash grab)
- **Seasons follow the real calendar.**
  - Off-season "The Rumour Mill": 2 Sep – 31 Dec.
  - "Winter Window": 1 Jan – 2 Feb.
  - "Spring Whispers": 3 Feb – 15 Jun.
  - "Summer Window": 16 Jun – 1 Sep.
  - Each season has a name, a colour accent, a 40-level track (the existing Pass levels, reset each season from
    `seasonPP`), and a season-end recap card.
- **Free track:** coins and cosmetics as today, plus one exclusive cosmetic per season.
- **Gold track** (a premium, one-off purchase per season, shown as €4.99): cosmetic only.
  - Post-card frames, stamp inks, desk themes, caller ringtones, byline flair.
  - +10% coins earned.
  - It never sells score, sources or Daily advantage.
  - It sits behind `lib/monet.ts` with `MONET.enabled = false` until a verified payment flow exists. The UI shows it as
    "Coming soon" with a preview of the rewards.
- **Coins:**
  - Earned from missions, level rewards, rival scalps and contact level-ups.
  - Spent on cosmetics, Career favours and coffees (1.2).
  - Coin packs sit behind `MONET` as well.
- **Rewarded ad:** at most one a day, only after results in solo modes (not rooms), for 2× mission coins. It sits
  behind `MONET.ads`.
- **Weekly event** (seeded by ISO week, Practice and Career only). The events are:
  - Rival Week: beat @ITK_Kev 3 times.
  - Medical Week: the physio opens on day 3.
  - Deadline Frenzy: Deadline Day gets 90 s.
  - Barbershop Week: the barber's reliability goes to 0.6.
  - Local Hero: the cast is from one league.

  Each event has a banner on Home and Practice and a cosmetic reward.

## 4. Desktop and motion
- **At 1024 px and wider:**
  - A left rail replaces the bottom tabs.
  - Home is a 3-column dashboard: Next-up plus the Daily, then Modes and Missions, then the Feed and Rivals.
  - The window screen shows the board and the saga side by side.
  - Results use two columns (calls on one side; verdict, leaderboard and share on the other).
  - The max content width is 1280 px. Keyboard: 1–5 picks a player, Enter publishes, Esc goes back.
- **Motion tokens** (`--ease-out`, `--ease-spring`, and durations 90 / 180 / 260 / 520 ms).
  - Page changes use the View Transitions API where supported, with a slide/scale fallback.
  - Cards tilt with the pointer on desktop.
  - Numbers roll.
  - Haptics (`navigator.vibrate`) fire on publish and on stamps where supported.
  - Everything respects Reduce motion.

## 5. Football data
- `src/data/world.json` shows squads after the summer 2026 window closed (1 Sep 2026).
- The major completed transfers are verified.
- Wire rumours are current for the Winter 2027 window.

## 6. Lanes (parallel, one branch each)
| Lane | Owns |
|---|---|
| **connect** | `lib/byline.ts`, the Feed, Rivals and Contacts screens, the Home hero, the Me page, the top-bar bell, and result hooks |
| **calls** | Saga, Window, Desk, Front, CallScene and PostScene, HERE WE GO, hold to publish, Delete & repost, the stake preview, overnight |
| **season** | `lib/season.ts`, `lib/monet.ts`, the Pass (free and Gold tracks), the store, weekly events |
| **shell** | desktop layouts, the left rail, motion tokens, view transitions, tilt, haptics, keyboard |
| **football** | the world data refresh, Wire freshness, ON THE WIRE chips |

## 7. The connected game (3.4 "One Newsroom")
Owner's brief (30 Sept, evening): every feature connects game-to-game (mode to mode), game-to-player and
game-to-multiplayer. The test is still §"North star": one journalist, one newsroom, one loop. Films everywhere the
game changes state for you, and nothing is a dead end.

### 7.1 Game to game: every mode is an assignment from the same desk
- **The editor's desk** (`lib/desk.ts`) hands out assignments. The Daily is "today's brief", Career windows are
  "the story", the Wire is "the live desk", rooms are "the press box", Practice is "off the record". One queue,
  one voice (Mags Doyle after the story lane lands; the current editor before).
- **Cross-mode consequences:** a Wire call that lands moves your Career editor's opinion (an inbox line) and
  unlocks a Career favour; a Career promotion changes your Daily share card flair; a room win puts that friend in
  your rivals ledger; a Daily Tier 1 earns a Wire credit. Everything routes through `lib/byline.ts` events.
- **The morning papers:** one daily recap (first open of the day) across all modes: what settled overnight
  (Wire, rooms, Daily rank, streak), who taunted, what's due today. Film: `moment-paper`.
- **Deadline Day is a calendar event, not just a window day.** On the real deadline days (winter: 2 Feb 2027,
  summer: 1 Sep 2027, `lib/season.ts` dates) the game runs **Deadline Day Live**: a 24-hour shared board where
  every player calls the same real sagas, a live ticker of what the room is calling (counts, not names), a
  countdown to 23:00 local, and results at midnight with a global table. Rooms can pin a DD Live round.
  Between deadline days, the Daily still has its in-window Deadline Day (day 7) as now.

### 7.2 Game to player: the game knows you
- **One profile, one number set:** followers, rep tier, hot hand, contacts, rivals, coins, Pass, streak, trophies.
  Career keeps its story rank but reads the same followers/contacts (the onecareer lane unifies the data).
  - **Done (save v3, `lib/save.ts` MIG[2]):** a Career slot stores only its story (rank, windows, favours, club
    relations, counters, history, inbox). `applyWindow` moves the byline, the book and the ledgers through
    `byline.recordInto` (mode ×1) inside the same update, and gates promotion on the global rep; the rep gates are
    `REP_TIERS`. Follower milestones pay in any mode. Contact trust in Career is the book level (accuracy steps from
    Lv2, early access at Lv3, a second opinion at Lv5, Career and Practice only).
  - **Migration:** on load, `byline.followers = max(byline, every slot)`, `byline.rep = max(byline, every slot)`,
    once; each slot's trust points become book XP where higher (`trustToXp`: trust level L → book level L+1, progress
    kept inside the band). A slot code restored from a 3.3 device folds in the same way. Nothing else in a slot moves.
  - **One visible level:** the byline tier is the identity (a word), the season Pass level is "this season's
    progress" (the one level number, top bar and Home badge). The old account level is hidden everywhere;
    `save.pp` stays as lifetime Press Points and keeps feeding the Pass (`progress.levelOf(pp)` now answers the Pass
    level at that point). Story shows a chapter number, never a level.
  - **Slots:** your name is yours; each Career is a different story (How to play, "One name").
  - **For Results:** `byline.careerSnapshot(save)`, `careerDelta(before, after)` and `lastDelta()` (the last
    recorded window's before-snapshot against the save) give the whole strip: followers, rep and tier, hot hand,
    contact level-ups, duels, rank/promotion, favours, coins, Pass level.
- **Playstyle profile** (`save.style`): tracked from calls (early vs late, loud vs quiet, source trust, U-turns).
  Shown on Me as a card ("The Sniper: files early, rarely wrong"), used by rivals' banter, by the editor's notes and by
  the Daily brief ("you've been quiet on day 1; the Market is wrong early this week").
- **Rivals remember:** ledgers already exist; add "grudge" beats (a rival who beat you twice targets your next call),
  and friend rivals (7.3).
- **Streaks and returns:** a Daily streak with a real cost of missing (the rival takes your slot on the table) and a
  "welcome back" desk note after 3+ days away, never punitive, always a next step.
- **Films for the player:** the `moment-*` set plus `moment-style-<id>` when a playstyle title is earned and
  `moment-streak-<7|30|100>`.

### 7.3 Game to multiplayer: the press box
- **Rooms → Press box** (`screens/Rooms.tsx` becomes the press box): a room is a newsroom of friends with a
  league table over a season, weekly rounds on the real calendar, a room feed (calls, taunts, HERE WE GO cards).
- **Beat my board:** any finished window (Daily, Practice, Career) makes a challenge link: same seed, your score
  to beat, 24 h; the result posts to both feeds and the rivals ledger.
- **Friend rivals:** a friend you've played 3+ rooms with becomes a named rival on your Rivals screen with the same
  ledger, taunt lines from a friend pool, and a "scalp" film with their byline on the TV.
- **Newsroom (clan):** up to 20 players under one masthead; a weekly combined table across the whole game;
  masthead cosmetics from the Pass. Server: `newsroom.*` actions beside `room.*`.
- **Spectate:** a finished room round can be replayed as a film strip of everyone's calls per day.
- **Live presence:** the Daily board shows "N reporters on this board now" and "first to break it" (first correct
  Confirmed call, by byline) once results are out; DD Live adds the live ticker (7.1).
- **Films:** `moment-room-win`, `moment-friend-scalp`, `moment-newsroom-week`, `moment-ddlive-open`, `moment-ddlive-close`.

### 7.4 Lanes for 3.4 (own disjoint files)
| Lane | Owns |
|---|---|
| **pressbox** | `screens/Rooms.tsx`, new `screens/Newsroom.tsx`, `lib/social.ts`, server `room.*`/`newsroom.*`/`challenge.*` actions in `api/tier-one/v3/index.js`, App routes (additive), `i18n/parts/social.ts`; byline.ts additive only (friend rivals) |
| **live** | `lib/desk.ts` (assignments, morning papers), `lib/live.ts` + server `live.*` (presence, first-to-break, DD Live board), `ui/live.tsx`, `lib/style.ts` (playstyle), Window.tsx additive (Daily brief sheet, DD Live ticker), `i18n/parts/live.ts`; season.ts additive (DD dates) |
| **onecareer** (after story merges) | `lib/byline.ts` + `lib/career.ts` data unification, save migration, Me/Story readouts |
| **film3d** | all clips, including the new `moment-*` ids above (queued after the calls/moments/story sets) |

## 8. Platform, business and smoothness (3.4)
Owner's brief: super smooth on mobile and desktop; an updated API; think business without a cash grab; a platform
that new features drop into; credits that mean something; still a simple game to understand.

### 8.1 Simple to understand (a rule for every lane)
- One screen, one job, one primary action. If a screen needs a paragraph to explain itself, cut the screen.
- Plain words: "call", "publish", "right", "wrong", "followers". No jargon in the UI; a glossary lives in How to play.
- Every number on screen answers "how is my name doing?"; anything that doesn't is hidden behind a tap.

### 8.2 Smoothness (`perf` lane)
- Targets on a mid-range Android phone over slow 4G: first interaction under 3 s, 60 fps on every screen and film,
  input-to-feedback under 100 ms, no layout jank on route changes. Lighthouse mobile Performance ≥ 90.
- The web build is code-split (routes, films, world data lazy); the single-file build stays for the Android APK.
  A service worker caches the shell and today's Daily, so the game opens offline and installs as a PWA.
- Animations use transform/opacity only; long lists use content-visibility; the 1,026-player world data parses off
  the boot path; fonts don't block first paint; films are preloaded one step ahead (poster first).
- Push: web push and the Android bridge for "your Daily is ready", "results are in", "Deadline Day Live opens".

### 8.3 The platform API (`api` lane): `api/tier-one/v4`
- Identity: a device token becomes a Semba account (optional email magic link; no passwords). Cloud save sync with
  versioned blobs and additive-counter merging, so a name, credits and cosmetics follow the player across phone,
  desktop and the app.
- Wallet: a server-authoritative credits ledger (earn, buy, spend, refund, gift) with purchase verification adapters
  (Google Play Billing, Stripe Checkout on the web, a sandbox mode) and entitlements for Gold and cosmetics.
- Catalog and remote config: items, prices, featured rotations, weekly events, Deadline Day Live dates, feature flags
  and A/B buckets come from the server, so new features and events ship without a client release.
- Telemetry: batched, privacy-minded events (no PII) for retention funnels, mode mix, conversion points.
- Rate limits, idempotency keys on writes, versioned OpenAPI at `docs/api/v4.yaml`; v3 actions stay mounted
  unchanged so the live game never breaks. The Daily stays server-scored and fair.

### 8.4 Credits and customization (`economy` lane)
- Two currencies, plainly named: **Coins** (earned by playing, spent on small things) and **Credits** (bought, rarely
  earned: season end, a 30-day streak, a first Tier 1). Credits buy things that are seen: Gold, byline card designs,
  mastheads for newsrooms, stamp inks, ringtones, press-pass skins, desk editions, film poster frames, share-card
  styles, and naming your paper. Never a Daily advantage; Career conveniences only as §1.2 allows.
- "Your desk" (`screens/Customize.tsx`): one place to dress the byline, the desk and the newsroom, with a live
  preview. Everything bought appears everywhere: share cards, room tables, films' overlays.
- Value and fairness: a featured rotation, season-limited sets, gifting inside a newsroom, referral codes (both
  players get credits when the friend finishes their first window), and credit packs at honest tiers (`docs/BUSINESS.md`).
- Entitlements live on the server (8.3) so purchases survive reinstalls and devices.

### 8.5 Lanes (own disjoint files)
| Lane | Owns |
|---|---|
| **api** | `api/tier-one/v4/**`, `api/_lib/**`, `docs/api/**`, client `lib/api.ts` (additive `v4()`), new `lib/account.ts`, `lib/sync.ts`, `lib/flags.ts` |
| **economy** | new `lib/wallet.ts`, `lib/catalog.ts`, `screens/Customize.tsx`, `ui/customize.tsx`, `i18n/parts/economy.ts`, `docs/BUSINESS.md`, App route (additive); not Pass.tsx / monet.ts / season.ts (onbpass lane) |
| **perf** | `vite.config.ts`, `index.html`, new `src/sw.ts`, `lib/perf.ts`, `lib/push.ts`, `styles/motion.css`, package.json scripts, `tier-one/` deploy layout; main.tsx additive only |

## 9. Film everywhere (3.4)
Owner's brief: use a lot of 3D film where applicable, so the game stays interactive and cool. Film is not only for
moments; the game's surfaces are filmed too.

### 9.1 Three kinds of film
- **Moment films** (§6–8): unskippable, 2–8 s, one per state change that matters to the player.
- **Ambient loops:** 4–6 s seamless, muted, looping clips behind the live UI. Portrait and landscape.
  `loop-home-desk` (your desk at the hour of day: morning light / lamp at night, papers stir), `loop-place-<src>`
  (the barbershop, boot room, treatment room, arrivals window, the car, the dark office: idle, waiting for your call),
  `loop-pressbox`, `loop-wire-room` (a newsroom wall of TVs with real tickers), `loop-deadline-city` (the city at
  dusk, phones lighting up), `loop-season-<rumour|winter|spring|summer>`, `loop-results-pressroom` (presses idling),
  `loop-newsroom-masthead` (the clan's masthead lit on a building).
- **Interactive beats:** short clips the player triggers and can feel: tap a source card → the phone lifts off the
  counter (`beat-pickup-<src>`, 0.6 s) then the call film; hold to publish → the press warms up under your thumb
  (`beat-press-warm`, loops while held) and fires on release; the Deadline Day clock is a filmed clock
  (`loop-dd-clock`), the U-turn is a filmed shred (`beat-shred`), a stamp slam is a filmed stamp (`beat-stamp-<outcome>`),
  page turns between tabs are filmed paper (`beat-page-<fwd|back>`, 0.3 s, replaces the CSS slide on capable devices).

### 9.2 Rules
- Film never blocks play: loops and beats are decorative and the UI stays usable on top. Only moment films hold the
  player, and they are short.
- Performance first (§8.2): loops are ≤ 400 KB, play only when the screen is visible, pause in the background, and
  drop to the poster on Save-Data / low battery / reduced motion / slow connections. One loop at a time per screen.
  Beats are preloaded with the screen. The single-file APK build ships posters only until the clips are cached.
- The look stays coherent: every loop uses the same set, lighting and grade as its moment films, so the call film
  starts from the exact frame the loop was showing (match cuts).
- Desktop gets more: a real-time 3D desk on Home (lazy three.js, high-end only, poster otherwise) where the lamp,
  papers and phone react to the pointer; the same set is what the films are shot in.

### 9.3 Lanes
| Lane | Owns |
|---|---|
| **filmui** | `ui/film.tsx` (`<FilmLoop/>`, `<Beat/>`, `useFilmBudget()`), `lib/filmgate.ts` (device/network gating), film transitions in `styles/motion.css` hooks, the Home 3D desk (`ui/desk3d/**`, lazy), integration notes per screen; screens edits are additive wrappers only |
| **film3d** | renders every `loop-*` and `beat-*` after the moment sets, with match-cut frames noted in `film/ASSETS.md` |

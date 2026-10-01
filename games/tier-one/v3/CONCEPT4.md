# Tier One 4: "Insider" — the game is your phone

The lead designer's concept for 4.0. The rules (`RULES4.md`) stay exactly as written; this file is the world those rules live
in, the words players see, and the screens. Read both before building anything.

## 1. The pitch

You are a football transfer insider. Not a newspaper reporter: an account. Your whole career fits in one phone, and the game
IS that phone. You DM your contacts, you read the timeline, you post your calls, you get ratioed or you get the Scoop, your
follower count ticks up on your profile, and brands slide into your DMs with deals. The Daily, Career, Deadline Day, the Wire
and your groups are all apps on the same home screen, and they all feed the same account.

Why a phone: it's how people follow transfer news now; it is a game shell everyone already knows how to use (no tutorial for
the navigation); it makes every mode feel connected (one account, one notification tray, one follower count); and it is a
strong, specific look that no generic web app has.

## 2. The phone (fictional OS, no real brands)

Boot: a lock screen with the time, the date and your notifications (what's next: "Today's window is open", "@ITK_Kev posted
on your story", "Volt wants to talk"). Swipe/tap to unlock → the home screen: a wallpaper (a look you own) and the apps.

| App | What it is | Replaces |
|---|---|---|
| **Blurt** | The timeline. Today's window (the Daily) and every window you play happen here: stories, rival posts, your posts, replies, the ratio, the Scoop. | Window / Saga / Daily |
| **DMs** | Your contacts. An ask is a DM; a contact answers with a voice note or a line (the existing drawn call films play here). "3 DMs a day" replaces "phone calls" (so a *call* is only ever the thing you post). Trust grows per contact. | Contacts, the call scenes |
| **Lens** | Your profile: the follower graph, your grid of Drops (right All-ins), your looks, your catchphrase, Secret files, and **Sponsors** (brand deals). The shop lives here as "Looks". | Me, Customize, Pass, collection |
| **Story** | Career: *The Comeback*, told as a chat thread with Mags Doyle (your old editor, now the manager who takes you back) and the people in the story. Chapter goals pinned at the top. | Story, Editor desk |
| **Live** | Deadline Day: a 90-second live stream (6 stories, 6 DMs, every contact awake, rivals already posting). Ranked on real deadline days (DD Live), practice any other day. | DDLive, the old day 7 |
| **Wire** | Real rumours. HE MOVES / HE STAYS, backed Hint / Post / Drop. The market % is on every card with a label. | Wire |
| **Groups** | The press box: rooms with friends, challenges, newsrooms (crews). | Rooms, Newsroom |
| **Boards** | Leaderboards and prizes. | Boards |
| **Settings** | Language, sound, motion, account, how to play (one visual card), restore purchases. | Settings, HowTo |

Everything in the tray is a real event (a result, a deal, a rival, an unlock). Never a nag.

## 3. The words (one set, everywhere, EN / AR / ES)

- A story ends **SIGNS** · **ELSEWHERE** · **STAYS**. On the Wire: **HE MOVES** / **HE STAYS**.
- You back a call as a **Hint** (×1), a **Post** (×2) or a **Drop** (×3, All in). A Drop is a big card on Blurt and on your Lens grid;
  a right Drop fires your catchphrase and counts for brands. A wrong Drop gets ratioed (−60 and a follower hit). Posts are final.
- **DMs** are what you spend to ask contacts. **Scoop** = a right Drop before any rival posted that ending.
- **Rep** 0–100, **Level** (forever), **Season** track, **Followers**, **Coins**, **Credits**.
- Ranks by Rep: **Nobody** 0 · **Rising** 40 · **ITK** 55 · **Insider** 70 · **Tier One** 85.
- Contacts: the barber, the kit man, the agent, the spotter, the physio. Rivals: @BackPageBants, @ITK_Kev, @PressBoxPete.
- Never: Talks / Advanced / Confirmed, Hijack / Off / Fake, U-turn, twist, exclusive, tally, Press Points, editor's desk,
  front page, newspaper, HERE WE GO. The Chronicle (the outlet that dropped you) may be named in the story only.

## 4. Sponsors (brand deals): the money loop that makes coins feel like income

Brands are fictional: **Volt** (boots), **Nine** (airline), **Tempo** (headphones), **Oasis** (water), **Kickoff** (fantasy app),
**Halo** (phones). A sponsor pays you **for being right, per call, scaled by how loud you went**, warns you when you're wrong, and
walks only when you keep getting it wrong. Nothing here touches a ranked score; it is coins and standing only.

**A deal** = a brand + a term + a rate card + a strike rule.

| Tier | Who gets offered it | Term | Pays per right Hint / Post / Drop | Clean-finish bonus | Strikes before the brand walks |
|---|---|---|---|---|---|
| **Local** (a town boot shop) | from the First window | one window | 4 / 8 / 16 | 60 | 3 |
| **National** | Rising rank, 2,000 followers | one window | 8 / 16 / 32 | 150 | 2 |
| **Global** | ITK rank, 10,000 followers | one week | 15 / 30 / 60 | 400 | 1 (warned first) |

- **Right calls pay instantly**, the moment a result lands: the coins roll in on the results thread with the brand's line
  ("Volt: nice one. +16"). A **Scoop pays double the Drop rate** ("Volt shared your Scoop. +32").
- **Wrong calls never cost coins.** They cost **standing with that brand**: a wrong Hint is ignored (brands don't mind quiet
  misses); a wrong Post is a **warning** ("Volt: careful."); a wrong Drop is a **strike** ("Volt: one more and we're done.").
  At the limit the brand **walks**: you keep everything already paid, you lose the clean-finish bonus, and the slot opens.
  Warnings and strikes reset when the term ends.
- **Standing** per brand, 0–3 stars: a clean finish adds a star, a walk removes one. Stars raise the brand's next rate card
  (+25% per star) and at 3 stars the brand sends a **branded look** (a wallpaper, a Drop card style, a frame) and a long-term deal.
  This is the long tail: a reason to keep every deal clean for months.
- **Offers** arrive in DMs after results and at the start of a week: one to three brands, each with its rate card, bonus, term and
  strike rule in one line ("Nine · this week · 15 / 30 / 60 per right call · +400 clean · 1 strike"). One active deal (two with
  Gold). The first offer is a Local brand DM right after the First window: "Saw your first call. Want to make some money?"
- **What counts:** Daily, Career, Live and Market calls (so the Market keeps paying when there is no window). Practice never.
- **Balance target** (RULES4 §3): a regular free player earns about 80 coins a day; sponsors are 40–60% of that by mid game, so
  coins read as what an insider earns. The numbers above are the first pass; `lib/economy.ts` owns them and the sim checks
  them against a "reader" player (92% right, mostly Hints and Posts): National ≈ 55 coins a Daily plus the bonus most windows.

## 5. Monetization (a business, never a wall)

Credits (the paid currency, shared Semba wallet) buy:
1. **Gold** (the season track's paid lane, 350 credits ≈ €4.99): a look every 3 tiers, the season Legendary, +10% coins, a second sponsor
   slot, the Insider mark on your profile (cosmetic).
2. **Looks**: phone wallpapers and OS themes (the flagship, the whole phone changes), Drop card styles, profile frames, DM ringtones,
   catchphrases, custom catchphrase from Insider rank. Common / rare / epic are coins; legendary is credits or Gold.
3. **Coin packs**, one table (`api/tier-one/v4/config/catalog.json`), the client imports it.
4. One **starter bundle** at level 3 (one-time, big discount, shown once in Lens › Looks, never as a popup).

Rules: nothing paid changes any ranked score or any rule; no offer interrupts play; offers appear only in Lens › Looks and once
on the results screen as a quiet line; every paid thing is previewable; refunds within 48 h; the free lane and deals keep a free
player in new looks every week. Unlocks (Live at Level 3, Groups at 4, Wire at 5) are reached in the first days of play and are
shown as "Reach Level 5" with the bar, never as a lock icon alone.

## 6. The feel (GOTY.md §12 applies to every screen)

- It is a phone, so it behaves like one: status bar (time, signal, battery that ticks down during a window and recharges at
  results), a notification tray, typing dots before a contact answers, read receipts, haptic-style taps (sfx), pull to refresh on
  Blurt, a follower counter that rolls.
- Juice primitives (`ui/juice.tsx`): `<Count>` (rolling numbers), `<Pop>` (tap scale), `<Ticker>` (follower / coin rolls),
  `<Typing>`, `<Notify>` (tray), `<Ratio>` (the reply counter on a wrong post). Every lane uses these, nobody reinvents them.
- **No illustrated "motion films" or drawn scenes anywhere.** The owner cut them: they felt gimmicky, and their backgrounds
  looked wrong. `src/film`, `ui/film.tsx`, the film loops and the CallScene/PostScene film playback are deleted, and nothing new of
  that kind is built. Motion in this game is the phone's own motion: app-open and sheet springs, DM typing dots then the
  answer card sliding in, the post card lifting off and landing in the timeline, the Drop reveal (card flip, catchphrase typed on,
  one slam), the ratio counter spinning up on a wrong post, number rolls, the night-to-morning as the status bar clock running
  and the timeline refreshing, the Live clock bar. Every one of these is UI motion on real UI, built from `ui/juice.tsx`.
- Not the classic AI look: one custom icon set, one type system, real microcopy in a human voice, specific brand marks drawn as
  logotypes, no gradient blobs or glass, no identical card grids, no emoji icons. AI tools may be used to make it, as long as
  nothing on screen looks like a stock "AI app".
- **Art.** Imagery is built, not illustrated: wallpapers and Drop card backgrounds are generative (club-colour fields, grain, big
  type, geometric patterns, light leaks) rendered as SVG/CSS/canvas so they scale and theme; contacts and rivals have
  typographic avatars (initials, a colour, a mark), no faces; brands are logotypes. If the owner supplies bitmap art later it goes
  in `web/public/art/<name>.webp` with a line in `web/public/art/manifest.json` (`{ id, kind, credit }`) and the looks catalog
  picks it up by id; nothing in the game depends on it existing.

- Mystery: sealed results (open post by post), Secret files, the whistleblower, sponsor offers that arrive unannounced, a rival who
  DMs you after a Scoop.

## 7. Results, now a thread

When a window ends, Blurt shows your posts resolving one by one as a thread: the ending lands as a news card, your post gets its
reaction (the Scoop stamp, your catchphrase on a right Drop, the ratio on a wrong one), the points in one line. Then the grade
(Tier One … Spiked), the follower and Rep rolls, XP and the level bar, coins (the sponsor's line and pay per right call, a warning or strike on a wrong one), and "Share" (the card to real
socials). Every end state links to the next thing.

## 8. Build order

Phase A (frame-independent, parallel): rules + server · economy + deals model · the phone shell (OS, apps, juice, design tokens).
Phase B (on the shell, parallel): Blurt + DMs (play) · Story · Lens (profile, deals, looks, shop) · onboarding + clarity · Live + Wire +
Groups + Boards. Phase C: integrate, cohesion, build, ship.

## 9. The Market (real transfers) — this section supersedes every other mention of "the Wire", including lane briefs

The best feature of 3.x was the Wire: real rumours, real outcomes, scored by a market rule. It stays, and it becomes a headline app
called **Market**. It is its own mode (nothing in it changes a Daily, a Career window or any ranked board), but it feeds the
same account, and it is the reason a football fan opens the phone on a day with no window to play.

- **Name and words.** App: **Market**. Tagline: "Real rumours. Real outcomes. Your calls." A card is a real rumour (player, clubs,
  the window it targets, status). The market % is printed on every card with its label ("Market says 62% he moves").
- **Track.** Any rumour can be **Watched** without a stake: it goes on your watchlist, and a real event on it (status change,
  the market moving 15 points, resolution) lands in the phone's tray as a notification. This is the "follow real transfers"
  feature: free, no level gate, the first thing a new player can do in the app.
- **Call.** HE MOVES / HE STAYS, backed Hint / Post / Drop, scored exactly by the existing market rule (`wire.mjs` wirePoints:
  back it when the market is cheap and you're right, you win big; follow a 90% market and you win little). Five new calls a day,
  40 open, one correction within 15 minutes, news freeze and late-call rule unchanged. The post sheet states the deal in one
  sentence, like Blurt.
- **What it pays into the rest of the game.** A right Market call pays XP (10 filed, +15 right), Rep at half weight, followers at
  ×1.5, coins by the player's star (15 / 25 / 40 / 70), and a **Tip**: a token (hold up to 3) that you can spend in Career as a free
  extra (an extra DM or a tip-off) and in Practice as a free second opinion. A Scoop-grade Market call (a right Drop against a
  market under 35%) also pays a Secret file. Market season Cred and hit rate show on your Lens profile next to your rank.
- **Unlock.** Level 2 (the first result), not 5: watching is free from the start, calling opens at Level 2. Live stays 3, Groups 4.
- **Why it is separate.** Ranked Dailies must be identical for everyone and fair; real-world calls resolve on real time and
  reward knowledge of the actual market. Keeping them apart keeps both honest. Connecting them through XP, Rep, followers, coins
  and Tips keeps them one account.

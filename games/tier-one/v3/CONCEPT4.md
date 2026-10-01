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
| **Lens** | Your profile: the follower graph, your grid of Drops (right All-ins), your looks, your catchphrase, Secret files, and **Deals** (brands). The shop lives here as "Looks". | Me, Customize, Pass, collection |
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

## 4. Brand deals (the money loop that makes coins feel like income)

Brands are fictional: **Volt** (boots), **Nine** (airline), **Tempo** (headphones), **Oasis** (water), **Kickoff** (fantasy app),
**Halo** (phones). A deal is an offer in your DMs when you cross a follower + Rep bar. One active deal at a time (two with Gold).

A deal = a term + a condition + a payout:
- Term: this window, or this week.
- Condition, always one line: "Keep Rep above 55 all window" · "3 right calls" · "One Scoop" · "No wrong Drop" · "Play every day this week".
- Payout: coins (150 → 600 as you grow) and, on the bigger ones, a branded look (a wallpaper, a Drop card style, a profile frame).
- A wrong Drop during a deal: "Volt has pulled out." You lose the payout, nothing else. Brands come back later.

Deals never touch a ranked score. They are where most mid-game coins come from, so coins read as what an insider earns.

## 5. Monetization (a business, never a wall)

Credits (the paid currency, shared Semba wallet) buy:
1. **Gold** (the season track's paid lane, 350 credits ≈ €4.99): a look every 3 tiers, the season Legendary, +10% coins, a second deal
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
- Films stay drawn (no characters, no 3D): DM voice-note scenes, the Drop reveal, the night-to-morning transition, the Live clock.
- Not AI-built: one custom icon set, one type system, real microcopy in the editor's voice, specific brand marks drawn as
  logotypes, no gradient blobs or glass, no identical card grids, no emoji icons.
- Mystery: sealed results (open post by post), Secret files, the whistleblower, deals that arrive unannounced, a rival who DMs you
  after a Scoop.

## 7. Results, now a thread

When a window ends, Blurt shows your posts resolving one by one as a thread: the ending lands as a news card, your post gets its
reaction (the Scoop stamp, your catchphrase on a right Drop, the ratio on a wrong one), the points in one line. Then the grade
(Tier One … Spiked), the follower and Rep rolls, XP and the level bar, coins and any deal paid, and "Share" (the card to real
socials). Every end state links to the next thing.

## 8. Build order

Phase A (frame-independent, parallel): rules + server · economy + deals model · the phone shell (OS, apps, juice, design tokens).
Phase B (on the shell, parallel): Blurt + DMs (play) · Story · Lens (profile, deals, looks, shop) · onboarding + clarity · Live + Wire +
Groups + Boards. Phase C: integrate, cohesion, build, ship.

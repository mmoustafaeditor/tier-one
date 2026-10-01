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
- **Animations that make sense are wanted.** Posting is a real posting animation: the composer card lifts, the post slides into
  the timeline, the like/reply counters start. A Drop is an Instagram-style card being made and published. Asking a contact is a
  **call screen**: the phone's own incoming/outgoing call UI (the contact's typographic avatar, name, "Barber · 00:07", the
  waveform) with the contact's **ambient sound bed** under it (the clippers and the salon for the barber, the airport for the
  spotter, the kit room for the kit man, a car on speaker for the agent, the treatment-room monitor for the physio; synth presets
  in `lib/sfx.ts` / `lib/synth.ts`), and the answer arriving as a voice-note transcript typed on the screen, then saved as a chip.
  Hang up or tap to skip. What's gone is the illustrated scene with a drawn background playing like a cartoon.
- **The five contacts stay** (the barber, the kit man, the agent, the spotter, the physio): each has one clear tell, one price,
  one day he opens, one sound, and that is the whole skill of the game. Their voices get rewritten for the phone era (short lines
  people actually text or say on a call), but nobody is replaced.
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

## 10. Rivals are bosses; the Daily is you against real people; the banter stays

**Daily, Live, Groups: your rivals are real players.** The competition in a ranked window is the people playing the same board:
today's players (rank, par), your friends and your groups. Results say "You beat 71% of today's 12,400 players" and "2nd of 6
in your group", never "you beat @ITK_Kev". The three accounts (@BackPageBants, @ITK_Kev, @PressBoxPete) still post on the timeline in
every window because the rules need them (their posts are evidence and the Scoop clock), but on a ranked board they are just
accounts on your feed, with their accuracy printed, not "your rivals".

**Story: rivals are bosses, one per chapter, and they get harder.** Each boss has a **stats card** (handle, accuracy, which days they
post, their tell, followers, your head-to-head record, what beating them unlocks) and a chapter-long **head-to-head**: every Career
window scores you against the boss (stories right, Scoops), and you clear the chapter by winning the head-to-head enough times
(Chapter 1: win 3 of 8 windows; later chapters more). The boss's accuracy and speed scale with your rank through
`E4.rulesFor('career', { rank, boss })` (RIVALS p/rel/days per boss and rank), so a boss you met as a Nobody posts earlier and is
right more often when you meet them again.

| Chapter | Boss | Their tell | Beating them |
|---|---|---|---|
| 1 The Blog | **@BackPageBants** (the Daily Roar) | loud, early, repeats the rumour mill, wrong 60% | Rising |
| 2 The Post | **@ITK_Kev** | a day early, but only on Vince's clients | ITK |
| 3 The Nationals | **@PressBoxPete** | slow, almost never wrong; you have to be first | Insider |
| 4 The War | **The Daily Roar** (Carl Stubbs' account) + Vince's plays | planted contacts; one story a window is poisoned | Tier One |
| 5 The Chronicle | **Vince Marlow** | the same "Done deal" pitch that burned you, word for word | the finale |

Rivals from the Creator Rivals program (opt-in real creators, flag off) and friends in Groups are real people and stay as they are.

**The banter stays, everywhere.** `lib/banter.ts` keeps its three-layer pools (EN / AR Egyptian / ES, club fans): replies under
your posts, the ratio lines on a wrong Drop, the accounts' lines on the timeline, the boss's lines after a window (a win, a loss, a
Scoop against them), a DM from the boss after you take a Scoop off them, sponsor lines, Mags's lines in Story. Short, specific,
human, funny; never cruel about real people; never the old words.

## 11. The decision list (what stays, what goes, what changes)

| Keep | Cut | Change |
|---|---|---|
| The five contacts and their tells · the catchphrase · the banter (three languages, club fans) · the Market (real rumours, market scoring, heat, watch) · Boards and prizes · Groups (rooms, challenges, crews) · The Comeback (prologue, five chapters, Vince, Mags, Priya) · looks and the collection · streaks with grace days · share cards to real socials · referral credits · offline play · EN / AR / ES | The newspaper frame (editor's desk, front pages, paper names) · drawn motion films and film loops · four endings · Talks/Advanced/Confirmed · U-turns · twists · the two-source rule and tally weights · Deadline Day as day 7 · favours and gear · the second shop · the Pass as its own screen · weekly event rules that never applied · every dead perk in NUMBERS_3x.md · unlabelled icons | Wire → Market (watch free, calls at Level 2) · rivals → chapter bosses with stats cards; ranked boards are you vs real players · Press Points → XP with a Level that never ends · Rep ranks Nobody → Tier One · coins mostly from sponsors · the Daily is 5 stories × 5 days · Live is its own 90-second mode · Results are a thread · the tutorial is the First window, not a rules page |

## 12. The first five minutes (the script every build must play exactly)

1. Lock screen: 09:41, today's date, one notification: "Mags Doyle: You're back. Open this." Tap.
2. "Your handle" (one field, a suggested handle), then "Your line" (pick one of three house catchphrases). Two taps.
3. The First window opens in Blurt: 3 stories, Mags in DMs: "Send the barber a DM. He's free. He's also wrong half the time." Each step waits for the player's own action (DM → read the chip → open the agent's card → post a Hint → end day → see @BackPageBants post → a Post → Deadline Day → the physio → a Drop). Nine taps of teaching, no text wall.
4. The results thread: the first right call, the first catchphrase stamp, the followers roll from 200 to about 500, "Level 2" and the first coins, the Market unlock card.
5. A DM from a Local sponsor ("Saw your first call. Want to make some money?") and the push-permission card with a reason: "We'll tell you when today's window opens and when your Market calls land." Then the home screen with the Daily card counting down.
If anything in those five minutes needs a tooltip, the screen is wrong.

## 13. The rhythm (retention and live ops)

- **Daily:** one Daily (4 minutes), the Market check (1 minute), a Career window if you want more. The streak counts any of them. One grace day a week, banked up to two.
- **Weekly:** Boards and the Global sponsor terms run Monday to Sunday UTC; prizes to collect on Monday morning (a tray notification); three featured looks at 15% off.
- **Seasonal:** the season track (10 weeks), 8–12 new looks, last season's leave the coin shop; a new chapter of banter.
- **Real deadline days** (DD Live, ranked): the real windows' closing days from `season.ts` (next: 2 Feb 2027, then the summer 2027 close); the Live app counts down to them for a week before.
- **Push (web push, `lib/push.ts`, opt-in with a reason):** window opens · your Market call resolved · a sponsor offer · prizes to collect · a boss DM. Never a nag, at most one a day unless the player asked for more in Settings.
- **Returning after 3+ days:** a "What you missed" thread (results, Market, sponsors), the streak grace used if available, never a penalty screen.

## 14. Telemetry (how the math gets tuned after launch, `api/tier-one/v4` telemetry)

Ten events, each with level, rank, day-of-player-life and mode: `window_start`, `dm_sent` (contact), `post` (o, s, day, scoop_open), `window_end` (tier, total, right, scoops), `level_up`, `sponsor_offer` / `sponsor_accept` / `sponsor_walk`, `market_call` / `market_resolve`, `purchase` (sku, credits), `share`. From these the owner's dashboard reads: D1/D7/D30 retention by first-window outcome, the tier distribution of engaged players (RULES4 §1's 13% Tier One target), coins earned vs spent per level, sponsor pay as a share of income, conversion by moment (after a Tier One, after a Scoop, level 3 bundle). The bars in RULES4 move only at season start, from these numbers.

## 15. The quality bar (ship gate, no exceptions)

- The first five minutes (§12) play end to end in a real browser at 390×844 in EN and AR with no dead end, no overlap, no horizontal scroll, no unlabelled icon, no old word.
- Every app opens from the home screen and back; every end state links to the next thing; reduced motion respected; keyboard works on desktop.
- 60 fps on the phone motion (no layout thrash in the timeline; transforms and opacity only); the web build under 1.5 MB gzipped for the first screen; offline opens to the lock screen and the last results.
- Numbers on screen match RULES4 and `lib/economy.ts`; the sim's reader player still lands 10–15% Tier One.
- Nothing paid changes a score; no offer interrupts play; every price previewable; refunds within 48 h.
- A per-app pixel pass and an independent verifier that tries to refute it (the Final Cut process, GOTY.md §11.2) run before the lead ships.

## 16. Story mode: The Comeback, and why no two chapters play the same

Career is **Story mode**, full stop: the app is called Story, and every window in it is a scene in *The Comeback* (STORY.html is
the bible: the fall, Vince Marlow, Mags Doyle, Hana Okafor, Priya/@ITK_Kev, Carl Stubbs, the five contacts by name). Rules for the
mode: the story is told in DMs and on the timeline by the people in it (no narration boxes); the guide changes by chapter; each
chapter adds one mechanic, one contact or tool, one boss, one reveal and one unlock, so the game you play in Chapter 4 is not the
game you played in Chapter 1; and nothing in the story is a separate grind: it runs on the windows you play.

| Chapter | Where you are | Your guide | Stories / contacts | The chapter's own mechanic | Boss | Reveal (mid-chapter) | Unlock at the end |
|---|---|---|---|---|---|---|---|
| **Prologue** | Deadline Day at the Chronicle, 23:58 | Mags | one scripted story | you post the "Done deal" Drop Vince fed you; it's wrong; the ratio; 38,200 followers gone; the box; the text "Nothing personal." | — | — | a 200-follower account |
| **1 · The Blog** | a laptop in a rented flat | Rosa (the agent who still picks up) | 3 stories · barber, kit man, agent only | learning the three tells; Local sponsors only | @BackPageBants | Rosa: "Vince doesn't lose deals by accident." | **the spotter** (Terminal Tony) + the chapter wallpaper |
| **2 · The Post** | the Evening Post hires you | Hana Okafor | 4 stories · + spotter from day 3 | **Vince's clients**: some stories are tagged; on those the agent talks up the deal (less reliable) and @ITK_Kev posts a day early | @ITK_Kev | Kev's early calls line up with the night you fell | **the physio** + National sponsors + a catchphrase |
| **3 · The Nationals** | top-flight stories, star players | Hana + Tony | 5 stories · all five contacts | **the race**: @PressBoxPete is slow and almost never wrong, so Scoops only come from early Drops; Tips from the Market become spendable here | @PressBoxPete | Tony's long lens: Vince shaking hands with Carl Stubbs | **Live** (ranked deadline days) + Global sponsors + a Drop card style |
| **4 · The War** | the Roar comes for you | Priya (she DMs you first) · Mags calls you, not the other way round | 5–6 stories | **Vince's play**: one story a window has a poisoned contact; you learn who lies from what they do; the whistleblower's tips become Priya's (90% right) | The Daily Roar (Carl Stubbs) | Priya: "I was there that night. I kept the call log." | **custom catchphrase** + the evidence wall (a look) |
| **5 · The Chronicle** | the same building, the same desk | Mags | 6 stories · star players · the last window is a 45-second Live | **the trap**: Vince DMs you the same "Done deal" pitch, word for word; your contacts' actions say otherwise; three Tier One windows to finish | Vince Marlow | the call log goes public | **Tier One** rank, the Chronicle wallpaper, the long-term Global deal |
| **Epilogue** | — | — | — | your Drop pinned at the top of Blurt; Vince's phone lights up: "Nothing personal." You sent it. The career carries on; each real season brings a new chapter of banter and a new boss. | | | |

Implementation notes: contact availability per chapter is a rule option (`rulesFor('career', { rank, trust, boss, contacts })`);
"Vince's clients" is a per-story flag that swaps that story's agent for a talk-it-up variant and moves @ITK_Kev a day earlier;
Vince's play is a per-story planted contact revealed on the results thread; the Live finale uses `rulesFor('deadline')` with
45 seconds. Story progress (chapter, windows, head-to-head, reveals seen) lives in the save and is shown as the pinned goal at the
top of the Story thread. Levels, sponsors and looks come from the same account as everywhere else; Story only adds its own
unlocks on top.

## 17. The lock screen and home screen are the player's, and they are products

The first shell (phase A) is a generic dark mobile UI: a navy field with faint pitch lines, five flat colour tiles, one orange
gradient button and two-thirds of the screen empty. That is exactly the stock look the owner does not want. The phone has to look
like it belongs to *this* player, and the way it looks has to be something they build, earn and buy. This section is the brief
for the shell redesign (a dedicated lane after the apps land; it supersedes the phase A home/lock design).

**Lock screen = your face to the world (changeable, sold).**
- A **Lock face** is a bundle: wallpaper + clock style + the stamp under the clock (your handle and rank, your catchphrase, your
  follower count, your streak) + the tray style. Six house faces at launch (two free), new ones each season; coins for common/rare,
  credits for epic/legendary, the Gold lane has its own. Lock faces are the most-seen look, so they are the flagship cosmetic.
- Clock styles: big numerals (default), stacked editorial, ticker (a one-line ticker of your last result under the time), club-colour
  split. Wallpapers: generative club-colour fields, grain, big type, light leaks, the chapter wallpapers from Story, sponsor
  wallpapers at 3 stars, and `public/art/` bitmaps when the owner supplies them.
- The tray stays: real events only.

**Home screen = your desk (widgets, arranged by you).**
- The home screen is a grid of **widgets** and app icons that the player arranges (long-press to move, in an "Edit home" mode; two
  pages). Widgets, 2×2 or 4×2: *Today's window* (the five kits and the countdown, or Resume / Results), *Followers* (the rolling number
  and a 30-day sparkline), *Market watch* (three watched rumours and their market %), *Sponsor* (the active deal and its running
  total), *Boss* (the chapter boss head-to-head), *Streak*, *Season track* (tier and progress), *Secret files* (the next sealed one),
  *Group* (your room's standings), *Catchphrase* (the stamp, big). Four come free; the rest unlock by level or come with looks.
- **Icon packs** change every app icon's style together (default, outline, editorial stamp, club crest, retro) and are looks.
- **Themes** restyle the whole OS (tokens: surface, ink, accent, radius, type) and are the epic/legendary tier; the Gold season
  Legendary is always a theme.
- The default layout for a new player is full, not empty: the window widget, followers, streak and the eight apps fill the first
  page; nothing below the fold is blank.

**The look itself (the art direction, so it stops being generic).**
- One editorial type system (a strong display face for numbers and stamps, a humanist text face), big numbers, tight leading;
  the player's handle and rank are the biggest thing on the home screen after the window.
- Colour comes from the player's club colours and the equipped look, not from a fixed navy; the default face is a warm dark
  (near-black with paper highlights and one accent), not blue-purple.
- Icons are one drawn family with a consistent weight and a small amount of depth, never flat emoji-like glyphs in saturated squares.
- Surfaces have grain and edges, not glass; motion on the home screen is the widgets ticking (followers rolling, the countdown,
  the market %), so the screen is alive without decoration.

**Money.** Lock faces, widgets, icon packs and themes are the four cosmetic lines; every one is previewable on your own phone before
buying, and the free lane and sponsors keep a free player in new ones every week. Prices follow RULES4 §3 (common 150 / rare 400 /
epic 900 coins; legendary 300 credits or the Gold track).

## 18. Phones: the device is your gear

The phone is the one object the player always holds, so it is the natural thing to upgrade, collect and show off. One rule first:
**ranked windows (Daily, Live, Groups) play the same for every phone.** On a ranked board the phone is a look; in Story and
Practice it is gear with perks. Fairness never bends, and the screen says so once: "Ranked windows: every phone plays the same."

**Your phones.** You own phones like you own looks (Lens › Phones). A phone is a device skin (bezel, frame, corner radius, boot
animation, boot sound, a default lock face) **plus four parts** that can be upgraded with coins in Story. Equip one phone for the
Daily (the showpiece) and the story hands you phones as it goes; you can carry a Story phone into the Daily as a look, with its
perks off.

| Part | What it does in Story / Practice | On ranked boards | Upgrades (coins) |
|---|---|---|---|
| **Screen** | widget slots on the home screen (2 → 4 → 6) and pages | same (it's your home screen) | 150 / 400 |
| **Battery** | how many extras you can carry into a window (0 → 1 → 2 → 3): extra DM, tip-off, second opinion | off | 200 / 450 / 900 |
| **Camera** | once a window from Chapter 3, a spotter photo on one story a day early ("seen there / elsewhere / not seen") | off | 600 (then 1 photo → 2) |
| **SIM** | the second line (the burner): whistleblower tips land here; upgrade raises their accuracy 75% → 90% (Priya) | off | given in Chapter 4, upgrade 500 |

**The phones of The Comeback** (each chapter changes your device, so the game literally feels different in your hand):

| Chapter | Phone | The feel |
|---|---|---|
| Prologue | the Chronicle's work phone | taken back in the box |
| 1 · The Blog | **the Brick** (cracked screen, 2 widget slots, no battery for extras, boot takes a beat) | you have nothing; the barber is free for a reason |
| 2 · The Post | **the Post's hand-me-down** (4 slots, battery 1) | a desk, a nameplate, one extra a window |
| 3 · The Nationals | **a flagship from Halo** (6 slots, battery 2, camera) | the long lens: Tony's photo mechanic becomes yours |
| 4 · The War | **+ the burner** (Priya's second SIM) | two phones in your pocket; the tips come on the other line |
| 5 · The Chronicle | **the Chronicle's new phone, yours** (everything, the Chronicle lock face) | back at the desk with a better phone than Vince |

**Money and looks.** Device skins are the top cosmetic line (epic/legendary: credits or the Gold track; a Halo "model" each season;
Halo at 3 sponsor stars sends you their flagship skin). Perks are coins only, never credits, and never on ranked boards, so nothing
paid ever changes a score. Phones show on your Lens profile ("Carries: Halo One · Brick (retired)") and in Groups.

**Keep it simple on screen.** A phone is one card: picture, name, four parts as four bars, one line each. Upgrading is one tap
with the price on it. No stats sheet.

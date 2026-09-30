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
- Rep tiers set the flair shown on the byline and on share cards: Blogger < 20, Stringer 20–39, Correspondent 40–59,
  Chief 60–79, Tier One 80+.
- Career keeps its own story rank and rep (its own save slot). Its calls still feed the global byline.

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

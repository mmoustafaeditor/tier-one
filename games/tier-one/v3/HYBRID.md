# Tier One 3.1 — "The Newsroom Game" (hybrid of classic 2.x and v3)

Owner's brief (Sept 2026): v3 looks good as a newspaper but lost the spirit of the old game. It is too classic and
monotonous, hard to learn at a glance, and the home page doesn't read as a home page. Keep the newspaper feel. Bring back
the gamey, easy, captivating energy of the old build. Add animation and personality everywhere. Make Career a story
that opens with the player disgraced after last season's bad calls. Every page and feature is in scope.

The rules engine, server-held Daily, save format (`tierone_v3`), real data and i18n stay. The presentation layer is
rebuilt.

## 1. What we keep from each build

**From classic (2.x): the spirit**
- One screen per decision: the player, *What we know*, big source tiles, a coach bubble saying what to do next, and
  four big outcome buttons with the points printed on the loudness buttons (+81 / −7).
- A guided first saga (pointer hand, coach bubble, 5 short steps), not a How-to page.
- A game-app shell: bottom tab bar, a hero *Today's five* card (kits, countdown, week dots, one big Play), and mode tiles.
- Per-source sound scenes (agent's phone + babble, barber's clippers, airport chimes + jet, physio's monitor, kit-room
  clang, press-office fax) with a full-screen moment.
- A cheeky voice ("Truth or cap?", "Or get ratio'd trying"), short lines and no rules text on the play surface.
- Coloured outcome chips (Done green, Hijack amber, Off red, Fake violet), reliability bars on sources.

**From v3: the craft**
- Newspaper DNA: Newsreader headlines, stamps that slam, clippings, halftone and datelines, *The Chronicle*.
- Real 2026/27 data, The Wire (real rumours), server-held fair Daily, rooms, leagues, the Pass.
- The honest maths and the "why" of every score (moved behind an info tap, not deleted).

## 2. Look: "paper on the newsroom desk"
- **Stage:** a dark, warm newsroom desk (`--desk`), lit with a soft vignette and slowly drifting light. The game plays
  on it.
- **Paper cards:** newsprint cards (`--paper`) sit on the desk. Headlines are Newsreader; stamps and clippings are the
  newspaper feel. Cards tilt, lift and cast real shadows.
- **Game layer:**
  - Colour: vermilion is the brand, gold is progress (XP, coins, level), and outcomes use their own colours.
  - Controls: big chunky buttons with a hard offset shadow that press down.
  - Numbers: Archivo condensed, in badges and counters.
- **Colour per mode:**
  - Daily: vermilion
  - Story: gold
  - Wire: cyan
  - Rooms: violet
  - Practice: green
- **Morning edition** (light) stays as an option. The desk becomes pale wood, and the paper is the same.
- **People:** no hand-drawn people anywhere. Characters appear only as painted art (the art pack, when it arrives) or as
  icon-based caller cards until then. Real footballers never appear as faces: kits, numbers and crests only.

## 3. Shell and navigation
- **Tabs:**
  - Home: the hub.
  - Story: Career.
  - Wire.
  - Friends: rooms and leagues.
  - Me: profile, trophies, the Pass and store, stats, settings.
- **Top bar:** logo, coins, level chip, `?` (how to play as a quick sheet) and settings.
- **Screen changes:** screens slide and scale, and cards animate in with a stagger.

## 4. Home
From top to bottom:
1. **Press pass:** avatar badge, byline, rank (Story chapter), level with an XP bar, credibility, followers, and a
   streak flame.
2. **Today's five:** the five player kits of today's Daily (face-down until played), a countdown, week dots, how many
   friends played and your best, and one big Play button. Afterwards it shows your tier stamp, score and rank, and the
   button becomes "See your front page".
3. **Missions:** three daily missions with progress and coin rewards (local, cosmetic, never Daily-score).
4. **Mode tiles:** Story (chapter and progress), Wire (calls live), Friends (rooms live), Practice.
5. **Wire ticker.**

## 5. The window (Daily, rooms, Practice, Story)
- **Board:**
  - Header: a 7-day strip (DD in red) and phone tokens for contact points left.
  - Five player cards: kit, name, route crests, and a status chip (No reads / Leaning Done ✓✓ / Filed stamp).
  - One big "Sleep on it" button.
- **Saga file (one screen):**
  - Player card header.
  - *What we know* chips: each outcome with its evidence count and the sources behind it.
  - Coach bubble with the next move in one sentence.
  - Source tiles: a 3-column grid with icon, name, reliability bars, a phone badge with the cost, and "opens day N" when
    locked.
  - *Make the call*: 4 outcome buttons, then 3 loudness buttons with +win/−lose, then Publish.
  - Rivals: a strip of three avatars that light up when they've posted.
  - Details (tally, weights, rules): behind "How's this scored?".
- **Source call:** a full-screen scene per source.
  1. Environment animation for that source (barbershop pole and clippings, airport runway lights and a jet, a monitor
     line, city rain for the agent, the boot room, the press-room flash).
  2. A caller card: portrait slot, with an icon until the art arrives.
  3. Ring, then click, then a mumbled voice (babble, pitch per character) with the subtitle typing out.
  4. The *says* stamp.
  5. The clue flies to the file.

  The first call to each source per window plays the full 2.5–4 s. Repeats play ~1 s. Tap to skip.
- **Publish:** the loudness button fills as you hold (tap works too), then the press rolls, the stamp slams with a
  shake and a buzz, and a reaction burst follows (followers +, shares, "@fans" replies).
- **Overnight:** a time-lapse (city dawn → night), then rival posts as breaking-news cards with the rival's avatar and a
  taunt. A twist is a glitch and a red STOP PRESS slam.
- **Deadline Day:** a red, dark full-screen takeover with a big clock, a heartbeat, a pulse under 10 s, one-tap post
  cards, and a whistle at 0.

## 6. Results
1. The press prints your front page (the headline is your best call).
2. Sagas flip one by one: truth stamp, your call, points counting up.
3. Tier reveal: a badge drop with confetti for Tier 1 and a shake for Spiked.
4. XP, credibility and follower bars fill, level-up and unlock cards pop, the streak flame grows.
5. Share card, "Play Practice", "Back home".

## 7. Story mode (Career)
- **Prologue** (once, skippable): last Deadline Day at *The Chronicle*. Your "HERE WE GO" is wrong (6 of 7 calls wrong),
  38k followers are gone, and the editor's note says "Clear your desk". Told in animated panels: paper, phone
  notifications, stamps and the editor's note, no drawn people.
- **Chapters** (these are the existing ranks, so saves map directly):
  1. The Blog
  2. The Comeback (Regional Reporter)
  3. Stringer (National Correspondent)
  4. The Rival (Chief Correspondent; @BackPageBants is your nemesis)
  5. Back at The Chronicle (Tier One)
  6. The Front Page (finale: 3 Tier 1 windows at Tier One rank)
- **Each chapter:** a cover card, one goal (the promotion gate, shown plainly), an editor message before and after each
  window, and an unlock.
- **Story beats:** first right call, first exclusive, a big miss, a promotion, the rival beating you. Each gets a short
  inbox line from the editor or the rival.

## 8. Progress (cosmetic; never touches Daily scoring)
- **Level:** Pass tier = `floor(pp / 100) + 1`, capped at 40. XP is the existing Press Points.
- **Missions:** 3 per UTC day from a pool, rewarding 5–15 coins.
- **Trophies:** the existing 30 achievements, shown as a shelf.

## 9. Onboarding
Language, then byline, then the guided first saga (Practice seed `TRAIN1`, coach on, scripted pointer), then home.
Existing players skip it; it can be replayed from `?`.

## 10. Motion and sound rules
- **Durations:** tap 90 ms; UI 160–260 ms; reveals 400–700 ms; scenes up to 4 s, always skippable.
- **Reduced motion and sound:** reduced motion turns scenes into a single card and removes shake and confetti. Sound
  obeys the setting and never plays before the first tap.

## 11. Site (sembagames.app)
Hero with the game key visuals, big Play buttons, a game-card grid, and less scrolling. It is a shared path, so log it in
UPDATES.md.

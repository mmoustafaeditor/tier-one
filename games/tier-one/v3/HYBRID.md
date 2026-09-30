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
- **People:** the films (cutscenes and moment clips) may show stylised characters: flat paper-cut or ink figures, or
  stylised 3D, with simple or no faces. Nobody speaks in them: no dialogue or subtitles. Real footballers never appear:
  a player is a generic figure in club colours and a number. Outside films, characters are icon-based caller cards. Every film is unskippable and
  short (owner's call); reduced motion shows the last frame.

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
- **Source call (3.3):** one screen, a short wordless film per source (the barber finishing a cut, the kit man at the
  player's locker, the physio's treatment table, the airport spotter's long lens, the agent's back seat, the press
  office after hours). Nobody speaks: what the source does shows the clue's read, in one language across sources
  (Done: the buying club's colours are taken on; Hijack: another club's replace them; Off: the buying club's thing is
  torn up, the player's own club stays; Fake: the rumour is binned with a shrug). Rendered clips play when present
  (`web/src/film/calls/manifest.ts` lists them); the SVG film is the fallback.
  - The first call to each source per 6 h plays the full cut (~3.5 s), repeats the short one (~2 s). Unskippable; it
    returns to the call page by itself. Reduced motion shows the last frame for ~1.2 s.
  - Back on the call page, exactly what they said appears as a quote card in the saga's clippings (source colour, the
    *says* stamp, what it added), newest first, the new one sliding in with a "New" tag.
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

## 7. Story mode (Career): "The Comeback" (3.4)
The bible is `STORY.html`; the code is `web/src/lib/storyMode.ts` and `web/src/screens/Story.tsx`. The Career told as a
comeback and a mystery: someone fed you the fake that ended you at *The Chronicle*.
- **The prologue is the game's opening.** After onboarding the `story-prologue` film ("The fall") plays instead of the
  old cold open, then its title card (the four lines and the text from the unknown number) with the Chapter 1 card;
  replayable from the cover and the desk drawer. `film/scenes/ColdOpen.tsx` stays in the registry and the gallery.
- **Chapters are the ranks** (Blogger → Tier One), so every save maps straight in; `save.story.chapterSeen` is the
  chapter index and the 3.3 ids (comeback/stringer/rival) are aliased to post/nationals/war:
  1. The Blog (Blogger) · 2. The Evening Post (Stringer) · 3. The Nationals (Correspondent) · 4. The War (Chief) ·
  5. The Chronicle (Tier One: three Tier 1 windows) · Epilogue: The Front Page.
- **Films:** `story-<id>` scene ids (`film/story/build.tsx`): the prologue, an opener per chapter, one mid-chapter reveal
  for chapters 1–4, the finale and the epilogue. Each plays its clip when rendered (`film/story/manifest.ts`, the
  video-slot pattern with the chapter plate on top) and a ~2.5 s drawn title card (`film/scenes/StoryCard.tsx`) until
  then. Unskippable, like every film.
- **The hub** fits one phone screen: chapter, goal (the promotion gate, shown plainly), the latest word from the inbox
  (or the chapter's brief) and Play. Below, in drawers: the case file (evidence pinned by each reveal), the inbox, the
  way back, the record, the sources by name, the desk (prologue replay, save slots, restart).
- **Reveals** land once (`save.story.beats.reveal<n>`) halfway to the chapter's window goal and at least two windows
  after arriving in the chapter: Rosa's warning · Kev's timing · Tony's photo · Priya's call log. The reveal plays its
  film over the results and pins its card in the case file.
- **The cast is one cast everywhere:** rivals are @BackPageBants, @ITK_Kev, @PressBoxPete in every mode (ids
  tabloid/itk/insider unchanged); sources show their names where named (Dougie, Sal, Rosa Lindqvist, Terminal Tony,
  Dr Inès; ids unchanged). Inbox senders: Mags Doyle, Hana Okafor, the rivals, the sources.
- **Vince's play** (rank index 3 on, Career only): one saga per window (fixed by the cast) is Vince's play, and one of
  its sources (agent, barber or spotter) is fed the line through the per-saga override Career already uses
  (`Rules.PER`): a street voice with zero reliability, so every read it gives is the saga's spin. The engine and its
  scoring are untouched (Daily, rooms and Practice never see it). The board marks the saga, its file carries a
  banner, and after the window Mags's note names who lied.

## 8. Progress (cosmetic; never touches Daily scoring)
- **Level:** Pass tier = `floor(pp / 100) + 1`, capped at 40. XP is the existing Press Points.
- **Missions:** 3 per UTC day from a pool, rewarding 5–15 coins.
- **Trophies:** the existing 30 achievements, shown as a shelf.

## 9. Onboarding
Language, then byline, then the story's prologue film (§7) and Chapter 1, or the guided first saga (Practice seed `TRAIN1`,
coach on, scripted pointer) with the prologue over it. Existing players skip it; it can be replayed from `?`.

## 10. Motion and sound rules
- **Durations:** tap 90 ms; UI 160–260 ms; reveals 400–700 ms; scenes up to 4 s, always skippable.
- **Reduced motion and sound:** reduced motion turns scenes into a single card and removes shake and confetti. Sound
  obeys the setting and never plays before the first tap.

## 11. Site (sembagames.app)
Hero with the game key visuals, big Play buttons, a game-card grid, and less scrolling. It is a shared path, so log it in
UPDATES.md.

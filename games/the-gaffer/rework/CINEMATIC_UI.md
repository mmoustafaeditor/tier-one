# The Gaffer — cinematic UI rebuild (reference pack v2)

Source: `The-Gaffer-Cinematic-UI-Pack` (P1–P3, 2,817 files, checksums verified). Approved references, cinematic concepts and the
40 native page views define the look; the game's own code, data and actions define behaviour. Nothing in `sim/` changes.

## Feature preservation map (current route → new place)

Every row is a feature the game has today. "Kept" = same component and action, new presentation.

| Current | Pack screen | New place | Status |
|---|---|---|---|
| Title: 2 save slots, start/continue/replace, quick match, language chips, accessibility | 01-start, 32-saves | Title |Kept |
| New career: league → club → "About the job" → sign | 02, 03 | New career (club theme previewed on pick) |Kept |
| Today: next match, Continue, decisions, inbox line, guide, staff log, headlines, availability, Office bar | 04, 05, 40 | Today (desk) |Kept |
| News (sections, unread) | 05-inbox, 06-message | News |Kept |
| Squad › Players: lens chips, planner, roster rows | 07, 09 | Squad › Players (Depth = planner, Contracts = expiring lens) |Kept |
| Player page: talk, renew, list, rest, loan, promote, fit in plan, dev curve | 08 | Player |Kept |
| Squad › Dressing room (cohesion, leaders, asks, promises, log) | 10 | Squad › Dressing room |Kept |
| Squad › Training (week, intensity, focus, individual) | 11 | Squad › Training |Kept |
| Squad › Medical (injuries, readiness, treat) | 12 | Squad › Medical |Kept |
| Squad › Academy (age groups, intake, promote/loan/sell/scout) | 13 | Squad › Academy |Kept |
| Match › Tactics (shape, style, roles, IP/OOP, instructions, Plan B, set pieces) | 14 | Match › Tactics |Kept |
| Match › Fixtures (+ "What keeps happening") / Table / Cups | 15, 16, 17 | Match tabs |Kept |
| Transfers 1 Needs & scouts · 2 List & search · 3 Negotiations · 4 Deals & loans | 18–23 | Transfers Needs / Targets / Talks / Deals |Kept |
| Club › Money / Board / Facilities / Staff / Commercial | 24–28 | Club tabs |Kept |
| Career (profile, history, offers) | 29 | Career |Kept |
| Club Pass (current state only, no new payments) | 30 | Club Pass |Kept |
| Settings (language, names, text, motion, contrast, sound, match speed/highlights, export/import/delete) | 31, 32 | Settings |Kept |
| Pre-match: sheets, team talk, brief, Tactics Lab, odds, walk out / result / sim | 33, 34 | Pre-match |Kept |
| Live: pitch (22 + ref + 2 assistants + ball), modes, speed, pause, shouts, subs, half-time | 35, 36, 37 | Live |Kept |
| Full time: score, why it happened, ratings, next action; Analysis | 38, 39 | Full time / Analysis |Kept |
| Digest, sheets (summary, staff calls, reports), toasts, update banner | — | unchanged behaviour, new finish |Kept |

## What was built

**Foundation** (`src/styles/cinematic.css`, `src/styles/look/tokens.css`, `src/ui2/theme.ts`, `src/data/clubThemes.ts`)
- Palette from the pack: canvas `#0b1215`, panels `#10171a`, raised `#192125`, text `#f4f2ed`/`#b8c0cc`, dividers `#343e42`.
  The old token names are kept, so every screen's CSS picked up the new palette; the old mint ramp now means the club accent.
- Type: Playfair Display 600–800 (English headings, scores) and Inter 400–700 (UI, rows, figures), subset to Latin +
  Latin Extended WOFF2 (100 KB together, replacing 252 KB of Archivo + Instrument Sans). Arabic keeps IBM Plex Sans Arabic
  and Readex Pro.
- Club themes: all 328 pack profiles mapped to the game's own club ids by name + country (328/328, no fallback needed;
  `sim-tests/themes-map.ts` regenerates the map). `primary` (UI accent), `onPrimary`, `link`, `kitPrimary` (shirts),
  crest motif/shape, stadium scale/region and locker standard. A club the map doesn't know gets a stable fallback from
  its own colours. The career's club sets the CSS variables in App; the new-career page takes the picked club's
  colours as soon as it is picked.
- Art: the pack's crest, shirt, banner and flag SVGs are generated in code from the profile (a port of
  `tools/build_teams.py`), so the 1,968 club SVGs cost nothing to ship. The 8 stadium backplates (compact / regional /
  monumental × Europe / Africa / Gulf) and 3 locker rooms are WebP at 1280 px (~455 KB inside the single-file build).
- Logo: the game's own vector wordmark (`brand.ts`), identical on every screen and for every club.

**Shell**: a full-width cinematic masthead (logo, club crest/name/league position, the five destinations, the inbox /
career / Club Pass / settings icons, the date and Continue) over the club's locker room tinted with its colour and its
shirts on the pegs. Phones and tablets: a two-row header (logo + utility menu, club + Continue) and the five
destinations fixed at the bottom; the utility menu holds Inbox, Career, Club Pass and Settings. Below 1300 px wide the
desktop utilities move into the same menu.

**Screens**
- Today: the host club's stadium scene with its flags and banner (the visitor's flag opposite), "Next match · Home vs
  Away", date, competition, availability, win chance, one primary action (Continue named for its next step); Pick the
  XI / opponent report with the assistant's read; the first-week strip (expands to the full guide); Manager's desk
  (decision cards, receipts and undo, inbox, staff calls); Around the club (board, fans, dressing room); Coming up
  (next three); the league line with the table link.
- Squad: editorial head (players, avg age, wage bill, unhappy, planner), Players / Depth / Contracts tabs, the compact
  roster table (shirt, name, captain badge, position · rating, fitness ring, mood, years) with every filter, the deals
  card, listed/loans, and the four doors (dressing room, training, medical, academy). Depth = the depth pitch + planner.
- Transfers: editorial head with the three money figures, the four stages as Needs / Targets / Talks / Deals tabs.
- Match: "Your match plan" head with the next match and Continue to match; grass tactics board; fixtures, table, cups.
- Live: the score in display type with the club-coloured clock, Pitch / Stats / Commentary tabs, the pitch (all 22
  players, both goalkeepers in gold/blue, the referee black with an amber ring marked REF, both assistants, the ball,
  105×68 field with 7.32 m goals, engine positions unchanged), the control bar (pause, highlight mode, speed, Make
  changes, Instant), touchline shouts, and beside it Match stats (possession, shots, on target, xG), Key moments,
  momentum and the assistant's tips / Plan B.
- Pre-match: the host's ground as the briefing hero. New career: the picked club's ground, colours and shirts.
- Every other page, tab, sheet and dialog takes the same tokens, tabs, panels and buttons.

## Not done / limitations
- The pack's prototype layouts for a few secondary pages (inbox message detail, Club › Money chart arrangement,
  facilities cards with photos) were not copied one-for-one: those pages keep their current content and arrangement in
  the new finish. No feature was removed.
- "Next decision" in the live reference has no matching engine action; the live bar keeps the existing Instant.
- Stadium scenes are art archetypes by club scale and region, not real venues; capacities shown are the game's own.
- Club Pass keeps its current concept state (nothing sold, no new payments).
- Half-time was reviewed in code only (same components and tokens as full time); no screenshot run reached minute 45.

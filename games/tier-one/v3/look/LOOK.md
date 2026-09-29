# Tier One v3: the look

**The idea:** Tier One is a newspaper that's being written while you play. Every screen is a page with a masthead,
section flags, bylines, datelines, rules and stamps. You aren't looking at a dashboard about transfers. You're
working a desk. The one colour on the page is the editor's red pen.

Open `mockups/index.html`. Each page works on its own at 390 px and at desktop width, in both editions.
The edition switch sits in the top bar (or add `?edition=late` / `?edition=morning` to the URL).

| File | What it is |
|---|---|
| `tokens.css` | Colour (both editions + Arabic), type scale, spacing, radii, rules, motion. Nothing else holds a hex value |
| `components.css` | Every shared component: masthead, nav, tabs, ticker, flags, stamps, heat, crest, portrait, the read, evidence trail, outcome picker, publish desk, tables, sheets, motion |
| `kit.js` | Draws the original crests and portraits from club colours, heat meters, tally marks and sparklines. Also runs the edition switch and loops the ticker. No dependencies |
| `fonts/` + `fonts.css` | Bundled woff2 files (latin, latin-ext, arabic subsets) and the OFL licence for each family. Nothing loads from Google at runtime |
| `mockups/*.html` | Front page, rumour file (EN + AR), the Daily, Deadline Day, scoop card, career desk, Press Pass |

## 1. Principles

1. **Draw the grid with rules, not boxes.** Hairlines divide columns, a 2 px ink rule opens each section, and a
   double rule sits under the masthead. Cards with rounded corners and drop shadows are the most common sign of
   AI-made UI. We use one rounded object in the whole app (the Press Pass, because it's a physical card).
2. **Every screen answers six questions.** On any story the player should see, without scrolling far:
   *What's reported? How strong and independent is the evidence? What's unknown? What can I gain or lose by
   publishing now? Who could beat me? What do I do next?* The rumour file answers all six in **The read**, a fact
   box with six labelled lines. Evidence is counted in *independent lines* (α β γ), and echoes (β′) are drawn
   dashed and marked as adding nothing. That tells you more than a percentage bar.
3. **One accent, used like a red pen.** Vermilion marks what the editor would mark: the live heat, the figure
   that matters (circled by hand), the "Next" line, the exclusive. If it isn't worth a red pen, it stays ink.
4. **Words over icons.** The tabs are words with page numbers ("01 Wire"). Outcomes always pair a glyph with a
   word. We don't use emoji, icon soup or badges that only make sense with a legend.
5. **Numbers get their own face.** Heat, fees, clocks and points are set in Archivo at 62 % width, like
   wood type. They're tabular so they don't jump as they tick.
6. **The copy has a voice.** Newsroom and dry: "Sleep on it · go to day 4", "Says nothing, beautifully",
   "Nerve is a stat", "Send it to the group chat". Never "Great job!" and never exclamation marks. Every line of
   copy goes through this voice pass.

## 2. Choices and why

| Choice | Why |
|---|---|
| **Newsreader** (Production Type, OFL) for display | A serif made for news, with an optical-size axis: tight and high-contrast at 88 px, sturdy at 17 px. Its italic gives us the section flags ("*The evidence*"). It's a less common choice than Playfair or Fraunces, which read as template picks |
| **Schibsted Grotesk** (OFL) for text and UI | Drawn for Schibsted's newsrooms. It's plain enough for dense UI and has more character than Inter |
| **Archivo** at `font-stretch: 62%` (OFL) | Condensed wood-type figures: the Deadline clock, heat, fees, the scoop card headline |
| **IBM Plex Mono** (OFL) | Datelines, wire slugs, timestamps and odds: the wire-service layer |
| **Noto Naskh Arabic + IBM Plex Sans Arabic** (OFL) | Naskh plays the serif's role in Arabic headlines and Plex Arabic handles UI. Tracking is switched off for Arabic, because it breaks the letter joins |
| Newsprint `#F2EEE5` / late-edition `#121110` | Warm paper, never pure white, and a dark edition that reads like ink on a night desk, never blue-black |
| Vermilion `#D2381B` / `#FF5A36` | The editor's pen. It's warmer than a brand red and doesn't compete with club colours |
| Outcome inks | Done green, Hijack amber, Off faded ink, Fake copying-pencil violet. They're used only inside stamps and the outcome picker, always with a word |
| Source **grades A–D** | We don't call them "tiers", because *Tier 1* is the result rank. Grade A is solid ink, B is outlined, C is grey and D is dashed |
| Crests | Four shield shapes crossed with patterns (stripes, halves, chief, sash, ring, hoops), in club colours with the initials on a plate. No real badges |
| Portraits | A generic head-and-shoulders silhouette in ink, lit with a halftone of the club colour, with the shirt number drawn as an outline behind it. It reads as a deliberate editorial illustration. No photos, and nobody's likeness |
| Paper grain | A fixed noise layer at 7 % multiply (3.5 % screen in the late edition). You feel it more than you see it |

## 3. Do / don't

**Do**
- Open sections with `.flag` (italic title, 2 px rule, mono aside).
- Put the stakes on the control itself: the publish buttons print `+140 / −90`.
- Make the next action the only filled button on the screen, and keep the rest outlined or quiet.
- Say plainly what's a concept or a placeholder ("Concept · not live" on the store).
- Use logical properties (`inset-inline`, `margin-inline-start`) so RTL mirrors for free.

**Don't**
- No gradient blobs, glassmorphism, glow, neon, purple-teal, "✨", or emoji as icons.
- No rounded-card grids. Separate things with rules, not containers.
- Accent-coloured text only at 11.5 px or above, and use `--accent-text` on paper (AA).
- Don't track Arabic, don't set Arabic in mono, and don't mirror the charts' coordinates. Mirror the data instead.
- No countdown timers, fake strikethrough prices or pre-ticked upsells in the store. Nothing that's sold ever changes a Daily score.

## 4. Motion spec

All durations are tokens and all go to 0 under `prefers-reduced-motion`.

| Moment | Spec | Sound hook |
|---|---|---|
| **Ticker** | Linear, one lap every `--ticker-speed` (60 s), content doubled for a seamless loop, pauses on hover, and runs the other way in RTL. The live dot blinks in 2 steps, not a fade, like a tally light. Reduced motion stops it | none |
| **Stamp slam** | `stamp-slam` 420 ms `cubic-bezier(.22,1.6,.36,1)`: from scale 2.4 and −8°, overshoots to .93, settles at its resting angle. The container gets `.jolt` (180 ms, 1–2 px) at the halfway point. On Exclusive, a two-layer drop-shadow ink bleed | `stamp.done` / `stamp.exclusive` / `stamp.fake` (thud + paper) |
| **Page turn** | Cross-document view transition, 520 ms `cubic-bezier(.65,0,.35,1)`: the old page moves 12 % aside and dims to 80 %, and the new page is revealed with a clip-path wipe from the leading edge (mirrored in RTL) | `page.turn` (soft) |
| **Type setting** | `.set` children rise 6 px and fade in, 260 ms `--ease-out`, 40 ms apart, like lines coming off the press | none |
| **Press** | Buttons move 1 px down and scale to .995 in 90 ms, with no bounce | `ui.tap` (tick) |
| **Deadline clock** | The seconds in vermilion, the progress rule counting down, `aria-live` on the clock. In the last 10 s the colon blinks in steps(2) and the page jolts on each breaking stamp | `dd.tick` each second from 10, `dd.whistle` at 0 |
| **Publish** | The filled button becomes a stamp on the story (`publish.talks/advanced/confirmed`, rising in weight) | per strength |
| **Heat change** | The number counts up in 400 ms, and the new bar segments fill left to right 30 ms apart | `heat.up` only when heat reaches 70+ |

Implementers can find the hooks in the markup as `data-sfx="…"` attributes.

## 5. Scaling

The layout is mobile first at 390 px, with a 16 px gutter and a typographic tab bar that sits over nothing
(pages reserve 96 px at the bottom). At 960 px and up, the tab bar becomes a section nav under the masthead,
columns form (3 on the front page, 2 elsewhere) with hairline rules in the gaps, and the publishing desk
becomes a sticky right column. Narrow screens get restructured, not shrunk. The scoop card is a fixed 4:5
object (1080×1350 on export) and is sized with container-query units, so it's the same artwork at every width.

## 6. Semba DNA: shared with The Gaffer, and Tier One's own

**Shared (studio foundation):** the 4-pt spacing scale and the 16 px gutter; the token names
(`--paper/--ink/--accent/--accent-text/--rule`, `--d-*`, `--ease-*`); the easing curves and durations; the
reduced-motion rule (everything to 0); focus rings (2 px accent, 2 px offset); 44 px minimum targets; the one
filled primary action per screen; the rules for sheets and dialogs (a 2 px top rule, a grip, a scrim, actions
always reachable); AA contrast, with `--accent-text` for small accent text; logical properties and the
RTL/Arabic rules; bundled OFL fonts; honest store rules (label concepts, nothing paid touches competitive
scores); the `data-sfx` sound-hook convention; empty and loading states written in the game's voice, never
spinners alone.

**Tier One's own:** newsprint, a vermilion pen, serif headlines and wood-type figures, section flags, stamps,
the wire ticker, source grades, the evidence-lines notation (α β γ), the Deadline Day extra edition and the
scoop card.

**The Gaffer should get its own:** a command-centre character (pitch green or club colour as its accent, a
sans display face, tactical boards, the matchday broadcast bug). It should not get newsprint or stamps. The two
games should feel like siblings in how they're built, not in how they look.

## 7. Still to do

- Loading and empty states (e.g. "Nothing on the wire yet. The phones are quiet — suspiciously quiet.").
- A 9:16 story variant and an Arabic scoop card.
- Tablet (768 px) pass, and Spanish copy-length testing.
- The portrait system could have 3–4 silhouettes (hair, build) so a board of five doesn't repeat.

# The Gaffer v2: the look

The Gaffer v2 is a club command center under floodlights. It grows the current pitchside-glass look into something more premium without throwing it away. The office runs on deep teal with frosted light glass. On matchday the lights go down, the floodlights come up and the data glows. Players appear as their shirts, never as faces.

Status: this is a visual and interaction direction. The HTML mockups in `mockups/` are static and use realistic 2026/27 content (Aston Villa v Newcastle, matchday 7). None of it is wired to the game yet. Anything with a price is marked as a concept.

| File | What it is |
|---|---|
| `tokens.css` | Every colour, size, radius and timing. Office and Floodlight lighting states. No raw hex values outside this file. |
| `components.css` | The shell, navigation, panels, buttons, chips, tags, meters, fog bars, charts, tactics board, scoreboard and match bar. Uses logical properties throughout. |
| `kit.js` | The icon sprite, navigation, original crests, kit-back portraits, charts (line/step with hover, momentum, zone grid), the Arabic/RTL switch (`?lang=ar`), weighted drag and one-tap resolve. |
| `fonts/` | Fonts bundled locally as woff2 files, with their OFL licence texts. `fonts.css` declares them. Nothing loads from fonts.googleapis at runtime. |
| `mockups/*.html` | Thirteen screens plus `index.html`, which shows a live preview of each screen and the system at a glance. |

Screenshots: `/tmp/claude-0/lanes5/_scratch/gf-look/` (390 × 844 at 2x, and 1440 × 900). Each phone screen has a `-fold` shot and a full-page shot. Home is also shot in Arabic (`home-*-ar.png`).

---

## 1. Where the direction came from

| Source | Kept | Left behind |
|---|---|---|
| **Light mint glass** moodboard (the owner's favourite, and the current Gaffer) | Deep teal ground, mint accent, frosted panels, the pixel-mosaic texture, big confident type, rounded "held in the hand" corners | Glass on everything, generic welcome hero, the photo-led player hero we can't license, radar charts that hide the numbers |
| **Dark sports** moodboard | Broadcast energy, luminous accents on near-black, compact stats, a pitch as the main surface | Neon everywhere, photo collages, star ratings, low-contrast grey text, rainbow charts |
| **Current Gaffer (v0.13)** | Two text contexts (light on ground, dark on glass), pill controls, floating tab bar, Supporter looks built on the same tokens | Poppins, which reads generic and has a small number set; one-row lists hiding the state that matters; stacked grey buttons; empty desktop space |
| **FM26 (player-facing)** | Depth, and the idea of an inbox that leads to decisions | Deep portal and tile hierarchies, many taps to act, dense tables as the default view, and state you have to dig for. Note: the PDF uses a custom font encoding that no tool here could parse, so this critique rests on FM's public, observed UI rather than the document's text. We copy no FM layouts. |

**Two-sentence direction.** Office screens use frosted light glass on deep teal, with big wide type and exactly one decision per card. Matchday switches to Floodlight: near-black teal, glowing mint for us and dashed coral for them, with the pitch and the numbers as the stars.

## 2. Principles

1. **Every screen answers one question.** Today answers "what needs me?" Tactics answers "how do we beat them?" Half-time answers "why is this happening?" The answer is the headline, set in large type in a football voice ("Three things need you before Saturday.", "Still climbing. Peak around 27.").
2. **Decisions come with advice and a cost.** Every choice shows who recommends it (staff avatar and a one-line quote in their voice), what it costs (tags with an icon and a word: *Injury risk 25%*, *Wages +£1.9m/yr*) and one tap to act. The staff pick is marked but never forced.
3. **Uncertainty is drawn, never hidden.** Scouting knowledge is a range bar: the wider the band, the less we know. The development projection is a band. The chance a deal lands is a percentage with its reason.
4. **Glass only where it creates hierarchy.** Glass holds decisions and data. The ground holds navigation, headlines and "nothing to do here" states (the flat panel). We never stack glass on glass.
5. **Identity, never likeness.** We use real names, but crests are original (club colours, a shape and pattern chosen by hash, and a monogram plate). Portraits show the kit from the back: surname, number and club colours, hung on a peg under a floodlight. There are no faces and no skin tones, so nothing is inferred from a name. This matches V2_DESIGN §3.11.
6. **Restructure, don't shrink.** A phone gets one column in priority order: the match first, then decisions. A tablet gets two columns. Desktop becomes a command center with a sticky rail, three panes and the key surface pinned (the tactics board and trophy lift stick while the rest scrolls).
7. **Football voice, not app voice.** Copy is written in the dugout's language: "Pick the XI", "Walk out", "Your word" (promises), "The table so far" (negotiation), "Just give me the result". Banned: "Welcome back", "Explore", "Unlock", "Oops", and exclamation marks.

## 3. Semba DNA: what we share with Tier One, and what's ours

| | Shared with Tier One v3 | Gaffer's own |
|---|---|---|
| Spacing | 4-pt scale with the same names (`--s-1` to `--s-16`), 16 px phone gutter | — |
| Motion | The same easing names and durations (`--ease-out`, `--ease-in`, `--ease-turn`, `--d-tap` 90, `--d-quick` 160, `--d-base` 260) | `--ease-spring` for tokens snapping into place, `--d-sheet` 380 for card settle, `--d-goal` 900 |
| Type | **Archivo** is the studio's numeral face. Tier One runs it condensed (62%) for clocks and wire stamps; The Gaffer runs it **wide (118%)** for headlines and scores. Same family, opposite stretch. **IBM Plex Sans Arabic** handles Arabic UI in both games. | Text in **Instrument Sans**, Arabic display in **Readex Pro** |
| Access | 44 px targets, a 3 px focus ring, reduced motion drops durations to 0, status always shown as icon plus word, validated chart palettes | — |
| Shape | — | Tier One is print: square corners and ruled lines. The Gaffer is held glass: 18–24 px radii and pills. |
| Colour | — | Deep teal and mint; club colours only on crests, kits, tokens and the 3 px identity stripe |
| Texture | — | Pixel mosaic (ground, crests, portraits, confetti); chalk on the tactics board |

## 4. Tokens (summary)

**Office (default).** The ground is `#062421` to `#0A302C`, glowing from the top right. Surfaces are glass, `#FAFFFD` to `#E2F4EE`. Ink is `#0B2A26`, `#3E5F59` and `#56766F` (AA on glass). Mint `#7DEBCB` is the accent on the ground; `#0B6456` is the accent text on glass. Primary is `#0E4F47`.

**Floodlight** (`<html data-light="flood">`). The ground is `#021311`, surfaces are dark glass, ink is `#EAF7F3`, and primary becomes mint.

**Data palette** (checked with the dataviz validator):

| Slot | Light (on `#F3FAF7`) | Dark (on `#0A2E2A`) |
|---|---|---|
| Us | `#0F8A70` | `#1CA986` |
| Them | `#DA5A3C` | `#E2694B` |
| 3rd | `#3F6FD0` | `#5B8CE6` |
| 4th (reference lines) | `#A87612` | `#C08A1E` |

Dark passes all checks. Light passes except a protan WARN on the Us/Them pair (ΔE 7.4), so **"them" is always dashed or hatched and always labelled**. Colour never carries identity on its own. Status colours (good, warn, bad) are separate from series colours and always come with an icon and a word.

**Type scale.** Sizes are fluid from phone to desktop: mega 56–112, hero 34–60, h1 26–38, h2 19–24. Fixed sizes: h3 17, body 15, small 13.5, meta 12, micro 11. Numbers use tabular figures.

## 5. Signature moments

| Moment | Where | Craft |
|---|---|---|
| **Chalk board** | Tactics | A slate board with pitch lines in chalk, drawn with an SVG displacement and grain filter. The plan is chalked on the board: arrows, a hatched "space behind Trippier", notes. Newcastle's press shows as coral ghost rings you can toggle. |
| **Weighted drag** | Tactics | The token lifts (scale 1.14, deeper shadow), trails the finger slightly (a lerp of 0.28 per frame) and tilts toward where it's moving. On release it snaps to the nearest slot with a spring and a small bounce. The role-fit badge updates. |
| **Tunnel walk-out** | Pre-match | A single-point-perspective tunnel. The mouth of the tunnel breathes with floodlight glow, with both captains' shirts in it. The crowd line ("42,657 · Holte End in full voice") and "Walk out" are the only actions. |
| **Floodlight glow** | Live, full-time | The scoreboard has two banks of four lamps and a soft light bloom. The score has a mint halo. Conic light rays sit behind the full-time result. |
| **Why it happened** | Half-time | Three numbered causes, each with its evidence drawn: a highlighted zone, a runs sparkline, a duel tally. Fixes are pre-selected, show their predicted effect, and one tap accepts them. This mirrors the engine lane's Why card: every cause cites a zone or phase. |
| **Trophy lift** | Career | The one office screen that goes dark. An original silver cup with a club-coloured plaque, pixel-mosaic confetti in the club's colours, the date and the ground ("7 May 2023 · Home Park"). |
| **Card settle / resolve** | Everywhere / Today | Panels settle in (translate 12 px, scale 0.985, staggered 45 ms). Tapping a choice, or swiping the card right to take the staff pick, collapses the card into a receipt with **Undo**. The Continue count ticks down. |

## 6. Motion spec

| Token | ms | Easing | Use |
|---|---|---|---|
| `--d-tap` | 90 | ease-out | press feedback: scale 0.97, translateY 1 px |
| `--d-quick` | 160 | ease-out | tab and chip state, hover, tooltips |
| `--d-base` | 260 | spring (for tokens) or ease-out | token snap, heat-zone changes, meters |
| `--d-sheet` | 380 | ease-out | card settle, sheet open, decision resolve (spring) |
| `--d-goal` | 900 | ease-out | goal flash on the scoreboard (to build) |
| drag | per frame | lerp 0.28 | tokens trail the pointer; tilt up to ±10° |

Rules:
- Motion always explains a change of state. It is never decoration on a loop, except the tunnel's glow, the live clock's pulse and the trophy confetti, which all stop under reduced motion.
- `prefers-reduced-motion` sets every duration to 0 and turns off the settle, thud, fall and breathe animations.
- Sound hooks (to build): `ui.tap`, `decision.resolve` (a soft stamp), `token.drop` (a felt thud), `match.whistle`, `match.goal` (crowd swell, with the home and away mix switched), `ht.why` (dressing-room door), `trophy.lift`.

## 7. Navigation map and tap counts

The phone has a floating tab bar. Desktop has a sticky rail, which also shows **Career** and **Club Pass** (on phones they live under Club). The tabs match V2_DESIGN §2.4, with two copy choices:
- The first tab is labelled **Today**, because that's the question it answers.
- The recruitment tab is labelled **Transfers**, because that's the word players use.

```
Today ── next match card ── Pick the XI ─→ Match/Tactics
  │        └── Report ─→ Pre-match (tunnel) ─→ Live ─→ Half-time "Why" ─→ Full-time ─→ Today
  ├── decision cards (tap / swipe = resolve; Open → exact screen)
  └── pulse ─→ Club office
Squad ── depth · list lenses ─→ Player ─→ Talk / contract
  └── "No cover for Watkins" ─→ Transfers shortlist
Match ── Tactics (board · roles · how we play · opponent) ─→ Pre-match ─→ Live …
Transfers ── need · fog compare · shortlist ─→ Negotiation (rounds · offer · verdict)
Club ── Office (runway · board · facilities) · Career (history) · Club Pass
```

Today's counts come from the lane-4 screenshots of v0.13 and are not verified in code.

| Task | Today (v0.13) | v2 | How |
|---|---|---|---|
| Deal with a medical risk before a match | not surfaced (unverified) | **1** | A decision card with the physio's call and its risk |
| Open contract talks with a key player | 3 (Squad → player → Renew) | **1** | The decision card surfaces it before it becomes a problem |
| Change tactics for the next match | 3+ (Match → Tactics → edit → Save) | **2** (Pick the XI → Lock in) | Drag on the board; instructions are three-step toggles |
| See contract, fitness and mood across the squad | 1 per player (opening sheets) | **1** (Squad) | Glance columns: fit ring, mood, years left |
| Find cover for a thin position | 2+ (Transfers → search) | **1** from Squad (the "No cover" alert goes to the shortlist) | The need is attached to the search |
| Make a half-time change | 3–4 (Changes → sub → pick → pick) | **1** (accept pre-selected fixes → Second half) | The Why card suggests fixes and applies them |
| Check what the board wants | 1–2 (Club) | **0** (pulse on Today) / 1 (Club) | |
| Career history | 1 (Home → Your career) | 1 on desktop (rail) / 2 on phone (Club → Career) | One more tap on phone, to keep five tabs |

## 8. Do and don't

**Do**
- Put the answer in the headline and the evidence underneath.
- Give every number its unit and its comparison ("£98k", "inside his range"; "−41%, 30–45′ against 0–30′").
- Show "them" dashed or hatched and labelled.
- Let the ground breathe. A flat "nothing else needs you" panel is a feature.
- Keep one primary button per view. On matchday it lives in the match bar.
- Use logical CSS properties. Charts flip their time axis in RTL; the pitch never mirrors.

**Don't**
- Draw faces, skin tones or photos of real people. Don't use real crests or kit sponsor marks.
- Use glass on the ground-level chrome, or stack glass on glass.
- Use colour alone for status. No red/green-only pips: W/D/L always carry a letter, localized in Arabic as ف/ت/خ.
- Show a radar chart, star ratings or rainbow palettes.
- Use generic app copy ("Welcome back", "Unlock", "Oops!") or exclamation marks.
- Put ads in the middle of a decision. The only ad surface is the pitch-side sponsor boards, which can be removed.

## 9. Responsive and RTL

- **390 px (phone).** One column. On Today and Tactics the order is: match (or board) first, then decisions, then pulse. Horizontal chip rows scroll. Nothing else scrolls sideways.
- **760–1099 (tablet).** Two columns. Heroes and key charts span both.
- **≥1100 (desktop).** A 96 px rail plus a three-pane command center. The tactics board and the player hero stick in place. Matchday screens drop the rail for the match bar (`.shell.solo`).
- **Arabic.** `?lang=ar` sets `dir=rtl` and `lang=ar`. Display type switches to Readex Pro and text to IBM Plex Sans Arabic, with no letter-spacing and no uppercase. Icons that imply direction (back, continue, chevrons) flip. Charts run right to left. Kit-back names stay in Latin script, because that's what's printed on the shirt.
- **Checks run.** No horizontal scroll at 390 or 1440 on any screen. The only elements outside the viewport are the tunnel's light beams and the scoreboard glow, both inside `overflow: hidden`. Text clipped by ellipsis appears only in intentional one-line subtitles.

## 10. Fonts (all SIL OFL 1.1, bundled)

| Family | Role | File(s) |
|---|---|---|
| Archivo (Omnibus-Type) | Display and numerals; width axis 62–125 | `Archivo-normal-100-900-latin{,-ext}.woff2` |
| Instrument Sans | Text and UI; width axis 75–100 | `InstrumentSans-normal-400-700-latin{,-ext}.woff2` |
| Readex Pro | Arabic display | `ReadexPro-normal-160-700-arabic.woff2` |
| IBM Plex Sans Arabic | Arabic text (shared with Tier One) | `IBMPlexSansArabic-normal-{400,500,700}-arabic.woff2` |

## 11. Handover to engineering

- Tokens and components are plain CSS custom properties. The game's `gaffer.css` can adopt `tokens.css` directly. Existing Supporter looks map onto `--ground*`, `--surface*` and `--club-*`.
- Crests and portraits are pure functions (`Kit.crest(code)`, `Kit.portrait(name, club, num)`). Port them to TS and store only their parameters (V2_DESIGN §3.11).
- The Why card expects three causes from the engine, each with `{zone|phase, metric, before, after}`, plus fixes with a predicted delta. The layout already reserves space for a zone thumbnail, a sparkline or a tally per cause.
- Next to refine:
  - the goal moment (scoreboard flash and crowd swell)
  - a tablet pass at 820
  - Spanish copy-length checks
  - a proper keyboard path for token moves (arrow keys between slots)
  - a Supporter-look pass on Floodlight

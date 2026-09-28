# Semba Games design system

The shared look for every Semba Studios game. It is taken directly from **Tier One 2.0.0** (design system v2,
"Deadline Night"), so a new game like **The Gaffer** looks like a sibling of Tier One from day one.

| File | What it is |
|---|---|
| [`tokens.css`](tokens.css) | Every CSS variable: Semba studio colours, Tier One palette, 5 skins, Daylight, Deadline Day, Arabic, RTL, spacing, radii, shadows/glow, type scale, motion, layout, fonts |
| [`components.css`](components.css) | Tier One's base component layer (buttons, cards, chips, app bar, tab bar, dock, sheets, medals…), copied verbatim |
| [`components.html`](components.html) | Reference page: open it in a browser. Switch skin, theme, language (EN/AR) and Deadline Day at the top |
| [`assets/`](assets) | Logos, app icons, UI icons, outcome glyphs, offline fonts, intro poster |
| [`screenshots/`](screenshots) | Tier One's main screens at 412×915 (2× pixels) |

Use it in a game:

```html
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,700;1,800&family=Barlow:wght@400;500;600;700&family=Cairo:wght@600;700;800&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="design/tokens.css">
<link rel="stylesheet" href="design/components.css">
<html lang="en" dir="ltr" data-skin="default">   <!-- data-theme="light|dark" optional, data-dd="1" for crunch time -->
```

Tier One ships as one HTML file, so it inlines all of this. A new single-file game can do the same: paste
`tokens.css` + `components.css` into its `<style>` and base64-embed the fonts, as Tier One does.

---

## 1. Two brands

**Semba Studios** is the studio. It frames every game (site, intro, store listing). **Each game** has its own
accent colour and keeps the shared game system underneath.

| | Semba Studios | Tier One |
|---|---|---|
| Accent | **Neon green `#B6FF3A`** on ink `#0A1400` | **Yellow `#FFD23F`** on ink `#1A1400` |
| Second colour | `#3AF2A0` (end of the headline gradient, 120°) | Deadline red `#FF3D55` |
| Ground | Near-black `#07090B` with a green glow top-right and a blue glow bottom-left | Navy-black `#070B16` → `#0B1224` with a blue glow top-left and a faint yellow one top-right |
| Text | `#F4F5FA`, muted `#A1A6BD`, dim `#6C7290` | `#F3F5FA`, muted `#98A3BF`, dim `#7D88A6` |
| Fonts | **Sora** 600–800 (headlines, tight tracking −.035em) + **Inter** 400–700 (body) | **Barlow Condensed 800 italic caps** (display) + **Barlow** 500/700 (body) |
| Logo | `assets/logos/semba-logo.png`: the neon "S" ring, design #17 "Neon Ring". **Never redraw it**; use the file | Wordmark "TIER **ONE**": "ONE" sits on a slanted yellow block; square app icon with "1" |

Rules
- The studio green never replaces a game's accent inside a game. It appears in the game only in the Semba intro
  (the loading bar, the "Tap to start" play dot, the glow).
- The yellow for text on light backgrounds is darker: `--accent-text:#7F5D00` (Daylight theme). Never put `#FFD23F`
  text on white.
- For **The Gaffer**: pick one new accent + ink pair and set `--accent`, `--accent-ink`, `--accent-text`,
  `--cta-glow` (and `--t1` if the top rank should match). Keep everything else.

## 2. Colour

All colours are tokens in `tokens.css`. Components use the **semantic** tokens only, so skins can change them.

| Group | Tokens | Meaning |
|---|---|---|
| Surfaces | `--bg` `--bg2` `--panel` `--panel2` `--panel3` `--line` `--line2` | Page, sheets, cards, raised/inset cards, hairlines |
| Text | `--text` `--muted` `--dim` | Primary, secondary, tertiary (dim still passes AA on `--panel2`) |
| Primary action | `--cta` `--cta-ink` `--cta-text` `--cta-glow` | The ONE primary action per screen, its label colour, the CTA colour as text, its glow |
| Brand accent | `--accent` `--accent-ink` `--accent-text` | Wordmark block, highlights, active tab icon |
| Outcomes | `--o-done` green, `--o-hijack` orange, `--o-off` red, `--o-fake` purple, `--o-ink` | **Only** for the four transfer outcomes, always with a glyph and a word |
| Results | `--ok` `--bad` `--ex` `--ex-ink` | Right, wrong, exclusive (gold) |
| Events | `--twist` cyan, `--news` red, `--news-fill`, `--info`/`--you` blue, `--you-fill`, `--sharp`, `--stars` | Plot twist, breaking/NEW, links and "you", star ratings |
| Tiers | `--t1` gold … `--t5`, `--tclown` | Result tiers (medal colours) |
| Rarity | `--r-common` `--r-rare` `--r-epic` `--r-legend` `--r-shame` | Achievements |
| Clock | `--clock-bg` `--clock-ink` `--clock-alarm` | Deadline Day score-bug (white, red digits; never the hijack orange) |
| Overlay | `--scrim` | Behind sheets |

Contrast: every text/background pair in every skin is tuned for WCAG AA. `--news-fill` and `--you-fill` exist
because the raw red/blue are too light under white text. `--dim` is the lowest text colour allowed.

## 3. Themes and skins

Set on `<html>`. Deadline Day overrides everything.

| Attribute | Look |
|---|---|
| `data-skin="default"` (dark) | **Deadline Night**: navy-black, yellow CTA. The house look |
| `data-skin="default" data-theme="light"` | **Daylight**: `#F3F5FA` ground, white panels, dark-gold text accents. Also used when Theme = Auto and the OS is light |
| `data-skin="stadium"` | Dark green pitch with faint mowing stripes, lime CTA `#E8FF5A` |
| `data-skin="neon"` | Deep violet, cyan CTA `#33E6FF`, pink twists |
| `data-skin="tabloid"` | Light: red-top newspaper pink-white, **black** CTA, red accent |
| `data-skin="broadsheet"` | Light: cream newsprint, ink-black CTA, sepia accents |
| `data-dd="1"` | **Deadline Day** ("the lights go down"): wine-red ground, white CTA with red text, red edge vignette that pulses in the last seconds (`html.dd-alarm`). Use it for any game's crunch moment |

In Tier One, skins are cosmetics bought in Career › Style (Stadium $100, Tabloid $80, Broadsheet $80, Neon $120).
Theme (Auto/Dark/Light) is in Settings and only changes the default skin.

## 4. Type

| Role | Token / class | Spec |
|---|---|---|
| Display | `--display`, `.d1`–`.d5`, `.hero-n` | Barlow Condensed **800 italic UPPERCASE**, line-height .92, tracking −.005em |
| Body | `--body` | Barlow 500 (700 for emphasis), 15px/1.45 |
| Scale | `--fs-hero` 84 · `--fs-d1` 64 · `--fs-d2` 44 · `--fs-d3` 30 · `--fs-d4` 21 · `--fs-d5` 17 · `--fs-lg` 17 · `--fs-md` 15 · `--fs-sm` 13 · `--fs-xs` 12 · `--fs-mi` 11 | px |
| Overline | `.over` | 12px 700 caps, tracking .09em, muted |
| Numbers | `.num`, `.hero-n` | `font-variant-numeric: tabular-nums` for scores, clocks, counters |

**How fonts load**
1. Google Fonts link (in `<head>`, before the CSS): Barlow Condensed, Barlow, **Cairo**, **Tajawal**
   (+ Sora/Inter on studio pages).
2. Offline subsets: Barlow Condensed 800 italic and Barlow 500/700, Latin + Latin Extended-A
   (`assets/fonts/*.woff2`, declared in `tokens.css` with `unicode-range`). They have the same family names and come
   after the Google link, so the game's core text renders with no network, including in the Android WebView.
   Arabic and other weights still need the network; they fall back to system fonts offline.
3. Fallback stacks: `"sans-serif-condensed","Roboto Condensed","Arial Narrow",Impact` for display;
   `system-ui,-apple-system,"Segoe UI",Roboto` for body.

## 5. Spacing, radii, elevation, motion, layout

- **Spacing** (4-pt): `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 20 · `--s6` 24 · `--s8` 32 · `--s10` 40 · `--s14` 56; page gutter `--gutter` 16.
- **Radii**: `--r-xs` 6 (tags) · `--r-sm` 10 · `--r-md` 14 (buttons) · `--r-lg` 20 (cards) · `--r-xl` 28 (sheets) · `--r-pill` 999.
- **Elevation**: `--e1` cards (inner top highlight + soft drop), `--e2` raised, `--e3` sheets (shadow upward). Glow:
  `--glow` / `--cta-glow` = 1px accent ring + coloured drop under the primary button.
- **Motion**: `--t-press` 90ms · `--t-fast` 160 · `--t-base` 240 · `--t-slow` 420 · `--t-stage` 650;
  easings `--ease-out` (default), `--ease-spring`, `--ease-io` (exits), `--ease-pop` (stamps, medals).
  Buttons scale to .97 on press. Honour `prefers-reduced-motion` and the in-game Settings › Motion › Reduced
  (`html.rm`): animations collapse to 1ms, no confetti or rays.
- **Layout**: phone-first column, `max-width:430px`, centred. Tap targets ≥ `--tap` 44px. App bar `--appbar` 56,
  tab bar `--tabbar` 64, dock `--dock` 108. Respect `env(safe-area-inset-*)`. No horizontal scroll.

## 6. Components

All are in `components.css` and shown in `components.html`.

**Buttons** (`.btn`)
- `.btn.primary`: the one primary action. 56px, `--cta` fill, display font 22px caps, `--cta-glow`. Optional
  `.sub` line under the label ("45-sec tutorial first"). `.xl` = 60px.
- `.btn` (secondary, `--panel2`), `.ghost`, `.outline-cta`, `.text` (link-style), `.sm` (36px, keeps a 44px hit
  area), `.danger` (U-turn, red), `[disabled]` at 40% opacity, `.loading` (three dots).
- `.iconbtn`: 44px round icon button, `.solid` variant, `.badge` count or `.ndot` dot in `--news`.

**Cards and lists**
- `.card`: `--panel`, 1px `--line`, radius 20, padding 16, `--e1`.
- `.list` + `.cell`: grouped rows, 64px min, icon + title/subtitle + `.chev` (flips in RTL).
- Player card (board): 48px shirt (`.kit`), name in display font with stars, `.route` "From → **To**" (the origin
  may ellipsize; the destination never does), one status on the right (NO CALL / outcome chip / CALL).

**Chips, tags, badges**
- `.chip`: 28px pill (contacts, cash).
- `.tag`: 20px caps label; `.new` (red), `.twist` (cyan outline), `.ex` (gold, exclusive), `.sharp`, `.ut`,
  `.dd`, `.star` (silver), `.super` (gold gradient).
- `.oc` outcome chip: glyph + word + colour (`.done` `.hijack` `.off` `.fake`), `.lg`, `.solid`, `.ghost`.
- `.sig` signal bars for trust (neutral colour only, always rise left→right), `.pips` for contacts left,
  `.stars`, `.stamp` (rotated rubber stamp: RIGHT / EXCLUSIVE / WRONG).

**Header and bottom navigation**
- `.appbar`: sticky, 56px, blurred `--bg`. Grid: back/close button · centred title (+ `small` subtitle) · actions.
- `.tabbar`: fixed, 5 tabs (Today, Career, Friends, Trophies, More), icon 24 + 11px label, active tab gets
  `--text`, accent icon and a 3px `--cta` bar on top; `.badge` for counts. **Hub screens only**; hidden during play.
- `.dock`: fixed bottom bar during play with exactly one primary button (+ optional fixed square button) and a
  `.hint` line above it; fades into the page with a gradient.

**Modals**: always **bottom sheets** (`.scrim` + `.sheet` + `.grab`). `--bg2` surface, radius 28 on top, max 94vh,
slides up in 240ms and back down on close. Full-screen overlays are reserved for moments (source call, composer
typing, U-turn, tutorial). One live `.toast`: an inverted pill under the app bar, so it never covers the DD clock.

**Feedback**: `.banner` (tip/warning/`.twist`), `.tw` tweet rows with `.reply` fan replies (`.tone.pos` PRAISE /
`.neg` ROAST), `.medal` hexagon achievements by rarity (locked = grey), `.tmedal` tier medal, `.clock` Deadline Day
score-bug (`.warn`, `.alarm`), `.days` 7-day track, `.bar`, `.ring`, `.seg` segmented control.

**Icons**: `assets/icons/ui/*.svg`, 24px, 2px stroke, round caps and joins, `currentColor`. Outcome glyphs in
`assets/icons/outcomes/`. Emoji are used for sources and trophies (🕴️ agent, 💈 barber, 🛩️ airport, 🩺 physio,
🧺 kitman, 📰 leak).

## 7. Arabic and RTL

- `lang="ar"` → `dir="rtl"`. Arabic is **Egyptian Arabic** in tone.
- Fonts switch to **Cairo** (display) and **Tajawal** (body). `--ital:normal; --caps:none; --track:0`: no italics,
  no uppercase, no letter-spacing on Arabic. Display line-height opens to 1.25 so marks don't clip.
- Use logical properties (`margin-inline-start`, `inset-inline-end`, `text-align:start`), never left/right.
- Flip only **directional** icons: back chevrons, arrows, the hijack glyph (`.flip`, `[dir=rtl] .chev`,
  `[dir=rtl] .arr`). `--gdir` flips forward-running gradients.
- These stay LTR in Arabic: the **wordmark** (it's a logo), **clocks and numbers**, **signal bars** and **pips**.
  Route arrows (From → To) flip with the text.
- Mixed text (player names, @handles) uses `unicode-bidi:plaintext` / `isolate` (`.ltr`).
- Tags and small caps labels get +1px in Arabic (no caps means smaller glyphs).

## 8. Screens (Tier One)

Screenshots are in `screenshots/` (412×915 viewport, 2×).

| # | Screen | What's on it |
|---|---|---|
| 01 | **Semba intro** | Full-bleed studio video with soundtrack, neon loading bar at the bottom; "Tap to start" if the browser blocks sound. Plays on every load |
| 02 | **Today (home)** | LIVE · TRANSFER WINDOW badge, language button, wordmark + tagline, Daily card (date, "Today's five" shirts, 7-day streak boxes, countdown, primary PLAY TODAY), "More ways to play" tiles (Career, Friends, Practice), ad slot, tab bar |
| 03 | **Tutorial** | 45-second learn-by-doing: progress segments + Skip, one real player, yellow coach card, the source to tap is highlighted with a hand |
| 04 | **Board** | App bar (close, mode title, feed with count, help), big DAY n/7 + contacts left (pips), 7-day track with red "Deadline", overnight hint, coach tip, five player cards, dock with "END DAY n" |
| 05 | **Player page** | Player header (shirt, name, route, points multiplier), "What we know" (reports with outcome chips and trust), "Ask a source" grid (cost pill, trust bars, locked "Opens Day 4/6"), earlier chat, dock MAKE YOUR CALL |
| 06 | **Make your call** (sheet) | 1) What happens? four outcome cards with "who said it", 2) How loud? TALKS / ADVANCED / CONFIRMED with +/− points, early-bonus and exclusive boxes, POST IT |
| 07 | **Deadline Day** | Whole app turns red; white score-bug clock counts down; players to call get a white CALL button; "Close early" |
| 08 | **Results** | Tier medal with sunburst, points, one tile per player, tier ladder, "The calls" table (your call → what happened, points, EXCLUSIVE), threads with fan replies, "Who told the truth", Practice again |
| 09 | **Career** | Level ring, followers/exclusives/best tier, START WINDOW, tabs Profile · Shop · Style · Sources, career goals, achievements |
| 10 | **Trophies** | Trophy cabinet (66), rarity counts, almost-there cards, filter chips, hexagon medals list |
| 11 | **Friends** | Private rooms: how it works, Join/Create segmented control, 5-letter code boxes, name, JOIN ROOM |
| 12 | **More** | Grouped list: How to play, Past dailies, Settings, Move to another device, Terms, Privacy, Contact |
| 13 | **Settings** (sheet) | Language, Theme (Auto/Dark/Light), Look (skin), sound, haptics, motion, clean fan replies |
| 14 | **Today in Arabic** | Same home in RTL with Cairo/Tajawal (headless render uses fallback Arabic fonts; see EXPORT-NOTES) |
| 15–19 | **Daylight + skins** | Home in Daylight, Stadium, Neon, Tabloid, Broadsheet |

Not shot: the full-screen source call overlay (it's an animation), the U-turn sheet, the overnight feed sheet,
Past dailies and How to play. They use the same components.

## 9. Voice (for UI copy)

Short, punchy, football-Twitter. Buttons are verbs in caps via the display font (PLAY TODAY, END DAY 1, POST IT).
Helper text is plain and specific ("3 contacts unused · they don't roll over"). Spell things out; no abbreviations.
PG-13 banter. English, Spain Spanish, Egyptian Arabic.

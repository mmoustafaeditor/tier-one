# M · UI design system (3.8)

Source of truth: `web/src/styles/system.css` (tokens, then the shared components, loaded last). Base editions stay in `look/tokens.css`; mode colours in `styles/game.css`. Screens compose; they do not restyle shared parts.

## Direction (§26)
Premium football newsroom: deep charcoal desk, warm off-white paper cards, restrained coral for the one action, muted grey for metadata, gold only for Tier One / exclusive / season level. Serif (Newsreader) for headlines and mastheads, sans (Schibsted Grotesk) for UI, condensed (Archivo) for figures and stamps, mono for datelines. Subtle paper grain on paper cards (`--tex-paper`, 7% multiply; screen-blended at 60% in the late edition; off under `prefers-reduced-data`). Never neon, never casino, never a stretched phone.

## Tokens
| Group | Tokens | Values |
|---|---|---|
| Palette roles | `--c-ink/-2/-3`, `--c-paper/-2/-3`, `--c-accent`, `--c-accent-deep`, `--c-gold`, `--c-gold-deep`, `--c-line` | aliases of the edition tokens; `--sys-*` are the reference hexes (charcoal #15130F, paper #F2EEE5, coral #D2381B / #FF5A36 late, grey #7C766A, gold #C9972B / #F7B928) |
| Type roles | `--tr-kicker` mono 10.5 · `--tr-label` cond 11 · `--tr-h1` serif 26–36 · `--tr-h2` serif 22 · `--tr-h3` sans 17 · `--tr-body` 15/1.4 · `--tr-small` 12.5 · `--tr-num` cond 18 | |
| Spacing (§44) | `--sp-1..6` | 4 · 8 · 12 · 16 · 24 · 32; `--sp-gutter` 16 |
| Targets | `--tap` 44 · `--tap-primary` 52 (lg 56) | |
| Radii | `--rad-1` 8 (chips) · `--rad-2` 12 (rows, tiles, buttons) · `--rad-3` 16 (cards) · `--rad-4` 18 (sheets) · `--rad-pill` | editorial, not bubbly |
| Elevation | `--el-0` hairline · `--el-1` hairline + soft drop · `--el-2` lifted paper · `--el-3` sheet | ink doesn't cast shadows; paper does, barely |
| Motion (§40) | `--m-tap` 150 · `--m-state` 240 · `--m-move` 400 · `--m-result` 800 · `--m-major` 1400; `--m-ease`, `--m-ease-in`, `--m-spring` | all 0 under Reduce Motion; the older `--d-*` names resolve to these |
| Breakpoints | phone <700 · tablet 700–1023 · desktop ≥1024 · wide ≥1440 | in `desktop.css`; CSS can't var a media query |

## Icon family (§43, `ui/bits.tsx ICONS`)
24-unit grid, 2px round stroke, no fills, `currentColor`. Semantic names: `desk` (Home), `daily` (newspaper), `career` (press pass), `market` (transfer arrows), `rooms` (reporters), `card` (ID press card), `phone` (source call), `exclusive`/`bolt`, `evidence` (clipping + check), `bell`, `coin`, `credit` (hex token), `shop`, `missions`, `target` (Practice), `mail`, `shield`, `language`, `film`, `sun`/`moon`, plus the sources (`shirt`, `scissors`, `briefcase`, `plane`, `pulse`, `fax`) and the utilities. Old names (`home`, `news`, `story`, `wire`, `friends`, `me`) alias the new drawings so no screen drifts. `ui/game.tsx` re-exports `Icon`.

## Shared components (system.css part 2)
Buttons (primary/dark/paper/ghost/gold/green; sm 48 · md 52 · lg 56), icon buttons (44), top bar (`ui/chrome.tsx`), tab bar / rail, card, row, chip + chip picker, the one sheet, toasts, empty state, route stage, entrances, portrait slot (`.pt`, card or round).

## Layout rules
- One viewport (`.g-screen.fit`): top bar, then `.fit__body`; lists page with `<Pager>`; sheets scroll, pages never.
- 16px side gutter on phones; 24 on tablet; 28/40 on desktop with a 92/104px rail.
- Reading width: 760 for one-column pages, 1100 for Home's two-column desk, 1200–1280 for the board + Player File split and Results (classes `.play__cols` / `.play__file` are laid out here; the core lane renders them).
- Arabic: `:lang(ar)` drops letter-spacing and uppercase on condensed labels; logical properties everywhere; the pager arrows mirror.

## Character art (Addendum A, `ui/portrait.tsx`)
`<Portrait id size shape mood name club>`; ids `src:*`, `rival:*`, `editor:*`, `me`, `player:<id>`. Placeholder: a consistent drawn bust (hair/skin/collar from the id hash; a small tell per source; club colours only as collar/backdrop). `public/art/manifest.json` maps id → file (+ moods). Names, clubs, statuses are live text next to the slot, never in the image.

# Tier One design system (4.0 "Insider": the game is your phone)

One game, one phone, one kit. The OS lives in `web/src/ui/phone.tsx` (apps, icons, status bar, frame, dock, desk
panel) and `web/src/ui/juice.tsx` (the juice primitives); the shared parts stay in `web/src/ui/game.tsx` +
`web/src/ui/bits.tsx`. Styles: `styles/system.css` (shared parts) → `styles/phone.css` (the OS tokens and parts) →
`styles/desktop.css` (the phone on the desk), loaded in that order by `App.tsx`, last. The owner's rule (GOTY.md §12)
outranks everything here: it's a game. CONCEPT4.md §3 owns the words.

## The rules
1. **It is a phone, so it behaves like one.** Status bar (time, signal, a battery that drains in a window and recharges
   at results), a lock screen with the tray, a home screen with a wallpaper and the app grid, a dock, a home bar, a back
   gesture from the edge. No tutorial for the navigation: everyone already knows how to use it.
2. **One obvious action per screen.** The home screen has one widget (today's window). Every app's first viewport has
   one primary button (`<GBtn primary>`). Everything else is dark, quiet or a row.
3. **Thumb-sized.** Tap targets 48px or more; app tiles 60px; body type 16px; one-line copy. Mono captions are labels.
4. **Colour means something.** One accent per app (`--app-blurt` … `--app-settings`), outcome colours for SIGNS /
   ELSEWHERE / STAYS, gold for coins, level and the Scoop. Nothing is coloured for decoration.
5. **Juice on every tap and every result.** Press = scale + sound + haptic (`<Pop>`, `useHaptic`). Results land:
   numbers roll (`<Count>`, `<Ticker>`), the stamp slams (`<Stamp>`), the ratio ticks (`<Ratio>`), confetti only when
   earned. Motion is 90–260 ms, 520 for the one hero beat, and never in the way.
6. **Never a wall, never a nag.** A locked app says "Reach Level N" with the level bar, never a bare lock. The tray holds
   real events only (what's next, results, deals, rivals, unlocks). Offers live in Lens › Looks and nowhere else.
7. **Not AI-built.** One drawn icon set (`AppIcon`, 24-grid line glyphs on an accent tile), one type system, specific
   microcopy in the editor's voice, no gradient blobs, no glass panels, no emoji, no identical card grids.

## Tokens (`styles/phone.css` `:root`)
| Group | Tokens |
|---|---|
| Type | `--os-t-clock` (64–84) · `--os-t-widget` (24–30) · `--os-t-body` 16 · `--os-t-small` 13 · `--os-t-label` 12 · `--os-t-micro` 10.5. Faces from `look/tokens.css`: display Newsreader, text Schibsted Grotesk, numbers Archivo condensed, mono IBM Plex Mono (Arabic swaps to Naskh / Plex Arabic). |
| Space | `--os-s1` 4 · `--os-s2` 8 · `--os-s3` 12 · `--os-s4` 16 · `--os-s5` 20 · `--os-s6` 24 · `--os-s8` 32 · `--os-gutter` 20 |
| Radius | `--os-r-ic` 22% (icon tiles) · `--os-r-card` 20 · `--os-r-widget` 24 · `--os-r-pill` · `--os-r-phone` 44 |
| Bars | `--os-status-h` 30 · `--os-bar-h` 34 (the home bar). Screens pad their bottom by the home bar (`.ph .g-screen`). |
| Theme (dark, default) | `--os-bg` #0B0C0F · `--os-bg-2` #15171C · `--os-bg-3` #1F2229 · `--os-line` · `--os-ink` #F3F1EC · `--os-ink-2` · `--os-ink-3` · `--os-glass` / `--os-note` (the status bar, the dock, tray cards) · `--os-wall-a/b` (wallpaper) |
| Theme (light) | the same names under `:root[data-edition="morning"]` (Settings › Phone theme; Auto follows the OS) |
| App accents | `--app-blurt` #FF4D2E · `--app-dms` #1DB46A · `--app-lens` #F2B632 · `--app-story` #D9486F · `--app-live` #B51B2C · `--app-market` #1FA7D9 · `--app-groups` #7C5CFF · `--app-boards` #3B82F6 · `--app-settings` #6B7280. The frame reads the open app's accent as `--app-c`. |
| Motion | from `styles/motion.css`: `--d-tap` 90 · `--d-ui` 180 · `--d-ui2` 260 · `--d-reveal` 520, `--ease-out` / `--ease-spring`; all 0 under Reduce motion. |

The old desk tokens (`--desk`, `--on-desk`, `--card`…) are mapped onto the phone's inside `.ph`, so every existing
screen already reads the phone's theme.

## The OS parts (`ui/phone.tsx`)
| Part | Use |
|---|---|
| `APPS`, `AppId`, `appById(id)`, `appOf(route)`, `routeOf(app)` | the registry: id, accent, unlock level, home route, aliases, `badge(save)` (a count, `'dot'` for "open", or 0). `badgeOf(app, save)` adds unread tray items. |
| `<AppIcon id size locked/>` | the tile icon. `<AppGlyph id/>` is the bare line glyph for inline use. |
| `levelInfo(save)` → `{ n, into, need, pct }` · `unlockLevel(app)` · `isUnlocked(app, save)` | the level and the "Reach Level N" gates. Fallback until `lib/economy.ts` lands; the merge swaps it for `levelOf` / `levelUnlocks`. |
| `<StatusBar/>` · `batteryMode('idle' \| 'window' \| 'charge')` · `useBattery()` · `useClock()` | the status bar; App drives the battery from the route. |
| `<Phone app anim locked onHome onBack canBack side>` · `<HomeBar/>` | the frame: status bar, screen (with the edge back gesture), home bar; `side` is the desk panel at ≥1024px. |
| `bumpUse(app)` · `dockApps(save)` | the dock: the four most-used unlocked apps (localStorage `t1.phone.use`). |
| `<DeskPanel app go/>` · `useTodayCast()` | the desktop context panel: your name line, about this app, today's board, your grid, the tray. |

Routing (`App.tsx`): `?app=<id>` opens an app (aliases work: `?app=wire` is Market); `?tab=` keeps mapping; `go(route)`
plays the open / close / in-app transition; `back()` pops the OS back stack; Esc = back / home, 1–9 = the apps (inside a
window 1–5 still pick the cards); `chrome` gives every screen `go`, `home`, `openApp`, `openSettings`, `edition`.

## The juice (`ui/juice.tsx`)
| Part | Use |
|---|---|
| `<Count n format sign/>` | a rolling number (digits spin from the last value, never from 0) |
| `<Pop onTap sound haptic as/>` | tap scale for anything tappable that isn't a `GBtn` |
| `<Ticker n label icon tone compact/>` | follower / coin rolls with a "+N" floater when the value changes |
| `<Typing name/>` | three dots before a contact answers |
| `notify({ app, title, body, action, id, tone, silent })` · `<NotifyHost/>` · `useTray()` | the tray: a banner drops in for 3.6 s, the lock screen and the desk panel list it until opened or cleared. `action` is `{ to: Route }`, `{ app }` or `{ onClick }`. Real events only. |
| `<Ratio n label/>` | the reply counter on a wrong post (ticks up, one 'ratio' sound) |
| `<Stamp text tone size/>` | the catchphrase stamp (`catchphraseOf().text`) or the Scoop (`tone="scoop"`); slams once |
| `<Sheet/>` `<SheetHead/>` | the one bottom sheet (re-exported from bits) |
| `useHaptic()` → `{ tap, hit, ratio, open }` · `tapSfx()` | the tap sound + vibration |

## Sounds (`lib/sfx.ts`)
`os.unlock` · `os.open` · `os.close` · `os.home` · `os.locked` · `dm.in` · `dm.typing` · `post` · `drop` · `scoop` ·
`ratio` · `deal` · `level.up` · `tray` · `count.roll`. All synth, nothing fetched; off with Sound off.

## The shared parts (unchanged, `ui/game.tsx` + `ui/bits.tsx`)
`GBtn` (primary · gold · dark · paper · green · ghost; sm 48 · md 56 · lg 64) · `Sheet` + `SheetHead` · `.g-card` ·
`.g-row` · `.g-chip`, `Picks` · `Toasts` · `Empty` · `TopBar` (inside an app: back · title · bell · coins · level) ·
`Stamp`, `CatchStamp` · `Roll`.

## Never a dead end
Results → the next thing in the tray. An empty app → the one thing to do in it. A locked app → "Reach Level N" and
the bar. Every end state links to the next thing; the home bar is always one tap from the home screen.

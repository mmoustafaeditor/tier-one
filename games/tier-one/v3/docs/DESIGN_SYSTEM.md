# Tier One design system

One game, one kit. Code lives in `web/src/ui/game.tsx` + `web/src/ui/bits.tsx`; styles end in
`web/src/styles/system.css` (loaded last). The owner's rule (GOTY.md §12) outranks everything here: it's a game.

## The rules
1. **One obvious action per screen.** The first viewport has one primary button (`<GBtn primary>`): red, 56px+,
   it rings once when the screen lands. Everything else is dark, paper or ghost.
2. **Thumb-sized.** Every tap target is 48px or more (icon buttons 44px with padding around). Body type 16px+,
   one-line copy. Mono captions are labels, never paragraphs.
3. **Colour means something.** Mode colours (Daily red, Story gold, Wire cyan, Friends violet, Practice green) and
   outcome colours (done / hijack / off / fake). Nothing is coloured for decoration.
4. **Juice on every tap.** Press = scale + drop (90 ms), a sound and a haptic (`sfx`, `haptic`). Results land:
   stamps slam once, numbers roll (`<Roll>`), confetti only when earned.
5. **Newsprint is flavour.** Mastheads, results, stamps. Never dense columns, hairline rules or walls of text.
6. **Not AI-built (§11.1).** No gradient blobs, glassmorphism, emoji icons, purple gradients or identical card grids.

## The parts (use these; don't make one-offs)
| Part | Use |
|---|---|
| `GBtn` | kinds `''` (primary) · `dark` · `paper` · `ghost` (+ `gold`, `green` for rewards/confirm); sizes `sm` 48 · md 56 · `lg` 64; `loading`, `primary` |
| `Sheet` + `SheetHead` | every modal: ink-wash scrim, springs up, drag the handle down to close, Esc, focus trap, focus returned |
| `.g-card` / `.g-card--desk` | paper on the desk / a desk panel |
| `.g-row` | list row: 64px, `__ic` · `__b` (b + small) · `__go` |
| `.g-chip`, `Picks` | status chips; `Picks` is the chip picker (radiogroup) that replaces every `<select>` |
| `Toasts` | wire slips at the top, three deep, swipe or tap to bin |
| `Empty` | icon, one line, the next action; `big` for a whole empty screen (full-width primary) |
| `TopBar` | logo or back · title · bell · coins (rolling) · level |
| `.g-tabs` | five tabs, one sliding indicator in the mode colour |
| `Stamp`, `CatchStamp` | outcome stamps; `CatchStamp line={…}` takes the player's catchphrase (the kit has no default line) |

## Motion
Scale: **90** tap · **180** state · **260** move (page turns, sheets, indicators) · **520** the one hero beat.
Entrances deal children in by `--i` (`.g-in`, or `--i` on `.stagger` children; capped at six), `backwards` fill only.
Page turns slide along tab order both ways (mirrored in Arabic); up into the window, down out of it. Everything
collapses under Reduce motion (`:root.reduce` and `prefers-reduced-motion`).

## Never a dead end
Results → next assignment, rivals, feed. Empty feed/rivals → play. Store → back to the desk. A finished Career
window → the story hub. A route's first load keeps the top bar and tab bar and shows the paper stage.

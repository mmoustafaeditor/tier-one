# The Gaffer: information architecture (Phase C)

## Principles
1. **Five labelled areas, the manager's week:** Today (what needs me), Squad (people), Match (how we play and where we
   stand), Transfers (the market), Club (the business). Every area is one tap from anywhere, with a word under the icon.
2. **Every area shows its parts at the top.** If an area has sub-areas, they're a labelled segment row at the top of
   the screen, never doors at the bottom of a long page.
3. **Things that need you surface where you already are.** Unread messages show a count on Today and on the desktop rail.
4. **No hidden menus.** No hamburger, no icon-only rail, and no generic "More" that swallows destinations.

## The structure

```
Today ─────────── decision cards · next match · pulse · table · headlines
   └ Inbox & news  (link row under the headline with the unread count; rail item on desktop)
Squad ─────────── [Players | Dressing room | Training | Medical | Academy]   ← new segment row on all five screens
   └ Player
Match ─────────── [Tactics | Fixtures | Table | Cups]                        ← "Next match" renamed "Tactics"
Transfers ─────── [Needs | Scouts | Targets | Search | Talks | Deals | Loans] (active chip scrolled into view)
   └ Talks
Club ──────────── [Money | Board | Facilities | Staff | Commercial]
   └ doors: Career · Club Pass · Settings (phone); rail items on desktop
Career · Club Pass · Settings · Inbox & news  ← labelled "you and the game" group at the bottom of the desktop rail
Matchday (solo) ── Pre-match → Live → Full time / Digest, reached by Continue
```

| Change | Fixes | Cost to the player |
|---|---|---|
| Squad segment row on Squad, Dressing room, Training, Medical, Academy | UX-01: 2,600 px of scroll → 0; moving between the five is 1 tap | none: the old doors stay where they were |
| "Inbox & news" link with the unread count on Today; Inbox & news and Settings in the desktop rail | UX-02, UX-04: inbox 3 taps → 1 tap; settings on desktop 2 → 1 | none |
| "Next match" → "Tactics" (EN/AR/ES/FR) | UX-03 | none |
| Segments and chips scroll their active item into view | UX-05 | none |
| Thinner month labels on narrow charts (every other month when they'd collide) | UX-06 | none |

## The optional sidebar, evaluated

**Desktop: yes, and it's already there.** The 1280 px layout has a labelled left rail. I'm extending it with a second
labelled group ("Career · Club Pass · Inbox & news · Settings") so everything that's a whole screen is one click away.
The rail stays labelled (icon + word). I'm not collapsing it to icons: an icon-only rail would cost recognition for
"Commercial", "Academy" or "Club Pass", where the icon alone doesn't say what's inside.

**Phone: no sidebar.** A drawer would hide the five main areas behind a hamburger. Hidden navigation is used less and
found later, and the bottom bar already shows all five areas with labels within thumb reach. I also rejected a sixth
"More" tab: it would hold Career, Club Pass, Settings and Inbox together for no reason except leftover space. Instead
each one sits where its meaning puts it: Inbox on Today, and Career, Club Pass and Settings as labelled doors at the
top of Club (where they already were).

**Six bottom tabs**, e.g. adding Career, was considered and rejected: at 390 px six labelled tabs leave about 60 px
each. "Transfers", "Traspasos" and "Transferts" would need to shrink below the 11 px label floor, and Arabic labels
would wrap.

## What doesn't change
- Routes, save format and all game logic. The new rows only call the routes that already exist (`squad`, `room`,
  `train`, `medical`, `academy`, `news`, `settings`), so old saves, Android Back and deep links behave as before.
- The visual identity: the same Seg component and tokens, the same hero headings and panels.
- RTL: the rows are flex rows, so they mirror automatically in Arabic. Labels come from the language files (four
  languages, type-checked).

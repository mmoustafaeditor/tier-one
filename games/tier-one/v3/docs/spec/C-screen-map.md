# C · Screen map (3.8)

## Global navigation (§29)
Five destinations, bottom bar on phones, left rail at ≥1024px (`ui/chrome.tsx TABS`, `tabOf`).

| Tab | Route | Icon (§43) | Lights up for |
|---|---|---|---|
| Home | `front` | desk | front, wire (Transfer Market), customize (Shop), missions, howto, editor, boards:wire |
| Daily | `today` | newspaper | today (hub), daily (board), practice, ddlive, play:practice, boards:daily |
| Career | `story` | press pass | story, desk, play:career |
| Rooms | `rooms` | reporters | rooms, room, newsroom, boards:rooms |
| My Press Card | `me` | ID card | me, pass, rivals, contacts, feed, boards from me |

Why not Market as a tab: the Market is the hardcore layer (§18). A new player should meet it after the Daily, from Home. It still has three ways in: the Home card, bell notes on a settled call / stage move, and the morning briefing's Overnight line.

Why Daily is a tab: it is the ritual (§3). Home's hero and the Daily tab are the same destination at two depths; both exist because Home must show the Daily while the tab must reach it from any screen.

## Top bar (§28, `ui/chrome.tsx TopBar`)
| Screen | Left | Right |
|---|---|---|
| Home | "Tier One" masthead | wallet pill (compact) · bell · menu |
| Daily hub, Career, Rooms, My Press Card, Market | ‹ Back | bell (+ help where the screen passes it, + menu on My Press Card) |
| Shop, Season track, Contacts, Missions | ‹ Back | wallet pill · bell (not on Shop) |
| In a window (board, Player File, Deadline Day, Results) | ‹ Back / board | nothing but what the core lane passes |
| How to play, Deadline Day Live | ‹ Back | nothing |

Screens can force either with `bell={false}` / `wallet`.

## Home (§25) — one viewport
1. Top bar (identity, compact currencies, bell, menu).
2. **THE DAILY hero**: band "THE DAILY · No. N" + reset clock; five hidden shirts; "Five sagas. Same board for everyone."; streak · reporters on it; **PLAY TODAY'S DAILY** (56px). Filed: tier stamp + pts + rank, "See your result". Mid-board: "Back to day N".
3. Season strip: Lv N · season name · bar · "Next: 15 coins at Lv 12" → Season track.
4. Four cards: Career Mode · Transfer Market · Multiplayer · Practice (one line of state).
5. Missions (N of M done / N to claim) · Shop (Looks, never power / N new).

Desktop: two columns (hero left, the rest stacked right), max 1100px.

## Overlays mounted by the shell (App.tsx)
- **Morning Papers** (`ui/morning.tsx`): first open of the day on Home, after any film. Yesterday · Overnight · Rival · Today's desk · OPEN THE DESK.
- **Push ask** (`ui/notify.tsx`): once, on Home, after the first finished Daily; 30-day wait on "Not now".
- **Settings** (`screens/Settings.tsx`): Language · Edition · Play (sound, reduce motion, film, notifications, tips) · Account (name, Protect your Press Card) · How to play · About.
- Onboarding, the scene host and toasts as before.

## Every feature's home
| Feature | Where |
|---|---|
| Daily board, Player File, Deadline Day, Results | Daily tab › Play (core lane) |
| Deadline Day Live, Practice, Daily leaderboard | Daily hub |
| Career chapters, record, sources, saves | Career tab |
| Rooms, room table/feed | Rooms tab |
| Transfer Market, market leaderboard | Home card |
| Feed, Rivals, Contacts, Badges, Style, Season track, Replays, How to play | My Press Card |
| Missions | Home tile (and Missions page) |
| Shop (one store) | Home tile; wallet pill on Home/Shop/Season/Contacts/Missions |
| Settings, Protect your Press Card, Notifications | Menu (Home, My Press Card, Shop, Practice) |
| How to play | Home card row? No: My Press Card tile, Settings, "?" on Career/Market/Rooms, `?` key |

No orphaned screens: the 3.0 "Front page" screen is deleted; `editor` remains reachable only by its link (the career lane decides).

# A · Product principles (3.8 shell lane)

The brief's mandate, reduced to the rules every screen in the shell obeys. Owner's standing rules included.

## The hierarchy (§2–§3)
1. **Primary: the Daily.** It is the ritual and the entry point. Home is built around it; the Daily tab is the second destination; the morning briefing ends in it; the first push notification is about it.
2. **Secondary: Career, Multiplayer, Transfer Market.** Reached in one tap from Home. Career and Rooms are tabs (they have state worth returning to); the Market is a Home card (a deep, optional layer that should not pull a new player away from the Daily).
3. **Supporting: Practice, My Press Card, progression, missions, leaderboards, Shop.** One compact row or tile each; never a hero.

## Decisions (KEEP / REWORK / MERGE / REMOVE / NEW)
| Thing | Decision | Why |
|---|---|---|
| Home mini Press Card + four stat boxes (3.7) | REMOVE | Four numbers before the Daily inverted the hierarchy (§25). Identity lives in the top bar and My Press Card. |
| Home four mode tiles (3.7) | REWORK → hero + four compact cards | The Daily dominates; the four supporting modes get one line of state each. |
| Missions box (3 missions) | REWORK → compact tile | Count and "N to claim"; the list lives on the Missions page. |
| Shop tile | KEEP, compact | "Looks, never power" is the promise on the tile itself. |
| Bottom bar Home · Career · Market · Multiplayer · Press Card | REWORK → Home · Daily · Career · Rooms · My Press Card | The Daily must be one tap from anywhere; the Market is contextual (§29). No duplicate entry points: the Market is only a Home card + bell notes + briefing. |
| Top bar: bell + coins + credits on every screen | REWORK → contextual (§28) | Currency only where it matters (Shop, season track, Contacts, Missions; a compact pill on Home). No bell inside a window or the Shop. |
| Morning Papers sheet (two columns, 3 assignments) | REWORK → four lines + one button (§32) | Yesterday · Overnight · Rival · Today's desk · OPEN THE DESK. |
| Push notifications (never asked) | NEW ask, six topics (§33) | Asked once after the first finished Daily; "Not now" waits 30 days. |
| Email link (code, no UI) | NEW UI (§49) | "Protect your Press Card" in Settings and a nudge on My Press Card after 3 Dailies. Anonymous start kept. |
| Settings (sheet) | KEEP, reordered | Language · Edition · Play · Account · How to play · About, one sheet. |
| How to play (scrolling rail) | REWORK → one viewport | One step card at a time ‹ 2/5 ›; the full rules in a sheet. |
| Old "Front page" screen (3.0 mockup, unreachable) | REMOVE | Dead code (FEATURES §12.8); its two helpers kept. |
| ui/chrome.tsx old Bar/DeskNav/EditionBtn | REMOVE | Only the dead Front screen used them. |
| Icon map scattered (game.tsx) | MERGE → one family in ui/bits.tsx | One line weight, §43 names, aliases for old names. |
| Character art | NEW slot system (Addendum A) | `<Portrait id>` + `public/art/manifest.json`; drawn placeholders until approved art lands; names/clubs always live text. |
| Analytics (a boot event) | NEW funnel (§54) | `lib/analytics.ts`, 22 events, batched, offline-safe. |

## Rules the shell enforces
- **No page scroll** at 390×664 and up. Long lists page with ‹ 2/5 ›. Secondary content goes behind a sheet or a tab.
- **A clear Back, top-left,** on every non-home page (`TopBar back`). The masthead "Tier One" only on Home.
- **Names are self-explanatory:** Daily Challenge, Career Mode, Multiplayer (Rooms), Transfer Market, My Press Card, Shop, Settings. Stakes read In talks / Advanced / Confirmed. No "HERE WE GO"; house catchphrases unchanged.
- **Fairness:** nothing paid or progression-based changes a ranked score. The Settings "About" line states it; the Shop tile says "Looks, never power".
- **Ask after value, never on install:** push after the first finished Daily; account protection after three.
- **Progressive disclosure:** a new player sees the Daily hero, four cards and two small tiles. Season, Missions, Shop are quiet until they matter.
- **Gold is rare:** Tier One rank, the season level pill, exclusives. Not for buttons.

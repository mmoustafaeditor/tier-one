# The Gaffer: feature and navigation inventory (Phase A)

Build inventoried: branch `claude/repo-coordination-lbro4r` at V2.10 (commit `bd890b3`), local build of `games/the-gaffer/web`.
Method: read the route table (`App.tsx`, `ui2/game.tsx`, `ui2/shell.tsx`), then walked every route in Chromium at
390×844 (phone) and 1280×860 (desktop), English and Arabic, with a fresh Al Ahly career. The headings below are what
the screens rendered (script `heads.mjs`, evidence in `evidence/ux/before/`).

## 1. Navigation shell

| Shape | Where | Items |
|---|---|---|
| Floating bottom tab bar, icon + label | phone (< 900 px) | Today · Squad · Match · Transfers · Club |
| Labelled left rail | desktop | Today · Squad · Match · Transfers · Club, separator, Career · Club Pass |
| Top bar | every office screen | club crest + name + league position; **Continue** (with "· n open") |
| Solo shell (no navigation, a match bar) | matchday | Pre-match → Live → Full time / Digest |
| Title screen (outside the shell) | start | Start a career (2 slots), Continue a slot, Quick match |

Android Back: closes the top sheet, then returns to Today from any route, then leaves the app from Today.

## 2. Every destination, how you reach it today

Taps are counted from Today with the page at the top. "Scroll" is how far down the page the last target sat on a phone.

| # | Destination (route) | What's there | Phone path | Desktop path |
|---|---|---|---|---|
| 1 | **Today** (`today`) | decision cards (board meeting, pressers, bids, contracts, staff proposals…), next-match card + staff advice, fitness, staff-handled summary, Club pulse (board, fans, dressing room), mini table, headlines | tab | rail |
| 2 | **Pre-match → Live → Full time** (`pre`, `live`, `ft`) | team sheets, last word, Walk out / Just give me the result / Sim to the next decision; 2D match; Why card | Continue (1) | Continue (1) |
| 3 | Digest (`digest`) | results and staff calls after a multi-week sim | automatic after Sim | same |
| 4 | **Squad** (`squad`) | facts, 7 lenses (Everyone, Starters, Deals ending, Unhappy, Injured, On loan, Listed), depth chart, player list, "On the desk" (contracts and moves) | tab | rail |
| 5 | Player (`player`) | development, attributes, fit, the man (trust, morale, promises), contract, actions | Squad › row (2) | same |
| 6 | Dressing room (`room`) | cohesion and its causes, leaders/core/fringe, promises, talks | Squad › **bottom of page** › Dressing room (2, ↓2,625 px) | Squad › Dressing room (2) |
| 7 | Training week (`train`) | intensity, focus, load, individual plans, last week's report | Squad › bottom › Training week (2, ↓2,625 px) | 2 |
| 8 | Medical (`medical`) | treatment room, players on the edge | Squad › bottom › Medical (2, ↓2,669 px) | 2 |
| 9 | Academy & pathway (`academy`) | academy, loans, graduates, Intake Day | Squad › bottom › Academy (2, ↓2,669 px) | 2 |
| 10 | **Match › "Next match"** (`match` tab 0) | the tactics board: XI, bench, plan, formation, mentality, pressing, roles, opponent, Plan B, set pieces | tab (1) | 1 |
| 11 | Match › Fixtures / Table / Cups | fixtures by matchday; league table + top scorers/assists; cup brackets and groups | tab › chip (2) | 2 |
| 12 | **Transfers** (`transfers`) | 7 chips in funnel order: Needs · Scouts · Targets · Search · Talks · Deals · Loans; spending room KPIs | tab (lands on Targets) | 1 |
| 13 | Talks (`transfers` + `neg`/`p`) | negotiation room for one player | Transfers › Talks › row, or Player › Make an offer | same |
| 14 | **Club** (`club`) | 5 segments: Money · Board · Facilities · Staff · Commercial; plus three door buttons: Career, Club Pass, Settings and saves | tab (Money) | rail |
| 15 | Club › Board | what the board wants, season plan (V2.7 vision line), fans | Club › Board (2) | 2 |
| 16 | Club › Facilities | 5 facilities, builds (V2.7 build times) | 2 | 2 |
| 17 | Club › Staff | staff room, delegation per department, what the staff did, candidates | 2 | 2 |
| 18 | Club › Commercial | sponsors, offers, tickets | 2 | 2 |
| 19 | **Career** (`career`) | coaching badge, season by season, records, **Club legends** (V2.8), job offers, courses | Club › Career (2) | rail (1) |
| 20 | **Club Pass** (`pass`) | Pass concept, Semba Credits, rewarded ad, **Looks** (V2.10), planned items | Club › Club Pass (2) | rail (1) |
| 21 | Settings and saves (`settings`) | language, names (real/fictional), sim stop level, match speed, sound, difficulty, export/import/delete, about | Club › Settings and saves (2) | 2 |
| 22 | **News and inbox** (`news`) | newspaper, and the **inbox** (board, fans, scouts, contracts, offers, cup messages) | Club › Board › scroll › News (3, ↓200 px); also Today › Headlines › All news, but only once there are headlines | 3 |
| 23 | Awards night (sheet) | season awards (V2.8) | automatic at the season's end | same |
| 24 | Press conference (Today cards) | V2.9 questions | Today | Today |
| 25 | World editor (`world`) | rename clubs, move leagues | **unreachable**: the route exists in `game.tsx` and the strings exist, but nothing renders it | same |
| 26 | Quick match | one-off match | title screen only | same |

Sheets (open over any screen): the decision desk (Continue with open decisions), the season summary + awards, the player
quick sheet, confirmations.

## 3. Features per agreed version, and where each lives

| Version | Feature | Lives in |
|---|---|---|
| V2.0–2.3 | Today desk, decisions, delegation, Why card, sim to next decision | Today, Club › Staff, Full time |
| v2.4 | Dressing room, promises, talks | Squad › Dressing room, Player, Today cards |
| v2.5 | Recruitment funnel (needs, scouts, targets, talks, deals, loans) | Transfers |
| v2.6 | Training, medical, academy & pathway, Intake Day | Squad › Training / Medical / Academy, Today cards |
| V2.7 | Board meeting (club vision), facility builds, parachute | Today card, Club › Board, Club › Facilities, Club › Money ledger |
| V2.8 | Awards night, club legends, AI manager sackings, derbies | season-end sheet, Career, News, Today/Pre-match "Derby" tag |
| V2.9 | Press conferences | Today cards |
| V2.10 | Season credits, club looks | Club Pass |

## 4. What the inventory shows (input to Phase B)

1. **Four of the Squad's five areas sit at the bottom of a ~3,500 px page on phones.** Dressing room, Training,
   Medical and Academy are buttons under the 30-player list.
2. **The inbox is three taps deep and called "News".** Board, fans and offer messages live in "News and inbox",
   reached from Club › Board › (scroll) › News, or from Today only after the first headlines.
3. **Club is a catch-all.** It carries the club's business (5 segments) plus Career, Club Pass and Settings as door
   buttons; on phones Career and Club Pass exist only there.
4. **The tactics board is labelled "Next match".** The Match tab's first segment is the tactics board, while the next
   match itself is on Today and behind Continue.
5. **Transfers has 7 chips in a scrolling row**; on a phone Deals and Loans start off-screen.
6. **The world editor is unreachable** (dormant code path). Out of scope to revive; noted.
7. Desktop already has a labelled sidebar (rail) with the five areas plus Career and Club Pass. Settings and the inbox
   are not in it.

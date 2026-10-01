# The Gaffer: UI/UX audit (Phase B)

**What this is:** an expert usability review. I ran 18 real tasks in Chromium against a local build of the branch at
V2.10, on a phone (390×844) and a desktop (1280×860), in English, with Arabic RTL spot checks. **No real users took
part**, so nothing here is user-research validation. The tap and scroll numbers were measured by a script
(`tasks.mjs`). It starts each task on Today, follows the visible labels, and records every tap and how far down the
page the target was. Screenshots are in `evidence/ux/before/` (`p-*` phone, `d-*` desktop, `screen-*` full pages).

## Task results (before)

| Task | Phone path (taps, scroll) | Desktop |
|---|---|---|
| Get to the next match | Continue (1) | 1 |
| Change the formation | Match (1) | 1 |
| League table / fixtures | Match › Table (2) | 2 |
| Open a player | Squad › row (2, ↓60 px) | 2 |
| Search the market | Transfers › Search (2) | 2 |
| Check the money | Club (1) | 1 |
| Board's objectives / facilities / staff | Club › tab (2) | 2 |
| **Dressing room** | Squad › **↓2,625 px** › Dressing room (2) | 2 |
| **Training week** | Squad › **↓2,625 px** › Training week (2) | 2 |
| **Medical** | Squad › **↓2,669 px** › Medical (2) | 2 |
| **Academy** | Squad › **↓2,669 px** › Academy (2) | 2 |
| Career and legends | Club › Career (2) | Career (1) |
| Club Pass and looks | Club › Club Pass (2) | 1 |
| Settings, language | Club › Settings and saves (2) | 2 |
| **Inbox (board, fans, offers)** | Club › Board › **↓200 px** › News (3) | 3 |

All 18 tasks completed with 0 console errors and 0 failed requests.

## Findings, by severity

### UX-01 (high): four Squad areas are buried under the player list on phones
Dressing room, Training week, Medical and Academy are four buttons in the "On the desk" panel, the third panel of the
Squad page, below a 30-row list. On a phone that means **2,600+ px of scrolling** (about three screens) for four of the
game's main systems (v2.4 and v2.6). On desktop the panel sits beside the list, so desktop users don't have the problem
and phone users have no clue the areas exist. Evidence: `before/p-room.png`, `screen-p-en-squad.png`.

### UX-02 (high): the inbox is three taps deep and labelled "News"
Board, fans, scout, contract and offer messages go to an inbox that shares a screen with the newspaper ("News and
inbox"). The only routes there are Club › Board › scroll › News, or Today's "All news" link, which appears only once
there are headlines. The inbox shows an unread count (1 on day one: the board's welcome), but **no navigation item
shows it**. Evidence: `before/d-news.png`.

### UX-03 (medium): the tactics board is labelled "Next match"
The first segment of Match is called "Next match", but it holds the tactics board (XI, plan, roles, Plan B). The next
match itself is on Today and behind Continue. Players looking for "tactics" have no word to find; players looking for
the match see a tactics screen. It's the same in AR, ES and FR.

### UX-04 (medium): Club is a catch-all, and Settings sits inside it
Club holds the club's business (Money, Board, Facilities, Staff, Commercial) plus three door buttons: Career and Club
Pass (phone only), and Settings and saves. Settings is not about the club. It's 2 taps on both layouts, and the
desktop rail, which has room, doesn't list it.

### UX-05 (medium): selected segment or chip can be off-screen
Transfers has 7 chips in a horizontal scroller (Needs · Scouts · Targets · Search · Talks · Deals · Loans). On a phone,
Deals and Loans start off-screen, and choosing one (from a link elsewhere, e.g. "Talks" from a player) doesn't scroll
it into view. The same applies to Club's 5-segment row in Arabic and French.

### UX-06 (low): Arabic month labels collide on the cash runway chart
In Arabic, the 12 month names under the Money chart overlap into one unreadable line (`screen-p-ar-club.png`).
English three-letter months fit.

### UX-07 (low): long tactics page on phones
The tactics board is about 5,200 px tall on a phone (`screen-p-ar-match.png`). Its sticky segment bar keeps the tabs
reachable, so this is noted rather than redesigned. The board's order (XI first) matches what a manager does most.

### Things that work and should stay
- The **Continue** button in the top bar with "· n open", and the decision desk: one tap to the next thing that matters.
- **Labelled** navigation everywhere (no icon-only items), floating tab bar on phones, labelled rail on desktop.
- The Today page as the hub: next match, staff advice, pulse, table, decisions.
- Arabic RTL mirrors correctly (bar order, back arrows, numbers kept LTR with isolates).
- Android Back always has a sensible target.

## What's out of scope for this pass
Visual identity (fonts, colours, panels, the hero headlines) stays as designed. I'm not redesigning screens' insides
beyond the navigation fixes above. The world editor route is dormant (no entry point), and reviving it is a feature
decision, not a navigation fix.

# The Gaffer: UI/UX verification (Phase E)

**What was tested:** a local build of `games/the-gaffer/web` (`npm run build`), served on localhost, in Chromium at 390×844,
360×740 (small phone) and 1280×860, in EN, AR, ES and FR, with a fresh Al Ahly career each run. Measurements came
from the same script as Phase B (`tasks.mjs`) with the same task list, so before and after can be compared directly.
Nothing was tested on an Android APK or on iOS. No real users took part.

## Before → after (phone, 390×844, taps from Today; scroll = distance below the fold)

| Task | Before | After |
|---|---|---|
| Dressing room | 2 taps, **↓2,625 px** | 2 taps, 0 px |
| Training week | 2 taps, **↓2,625 px** | 2 taps, 0 px |
| Medical | 2 taps, **↓2,669 px** | 2 taps, 0 px |
| Academy | 2 taps, **↓2,669 px** | 2 taps, 0 px |
| Training → Medical → Players | Back + scroll each time | 3 taps on the row, 0 px |
| Inbox (board/fans/offers) | **3 taps**, ↓200 px | **1 tap**, 0 px (the line shows the unread count) |
| Tactics board | 1 tap, labelled "Next match" | 1 tap, labelled "Tactics" |
| Open a player | 2 taps, ↓60 px | 2 taps, ↓162 px (the new area row is above the list) |
| Everything else (table, fixtures, search, money, board, facilities, staff, career, Club Pass, settings, next match) | unchanged | unchanged |

Desktop (1280×860): Career and Club Pass stay at 1 click. **Settings went from 2 clicks to 1, and the inbox from 3 to 1**
(both are now labelled rail items, and the inbox item carries the unread count). The Squad areas were already
reachable without scrolling on desktop and now have the same row.

The one cost: the Squad player list starts about 100 px lower on a phone, because the area row wraps to two lines at
390 px. I accepted that: every area stays visible, and nothing is hidden in a horizontal scroller.

## Screenshots
- Before: `evidence/ux/before/`. `screen-*` are full pages per area, `p-*`/`d-*` are each task's landing screen
  (phone/desktop), and `*-en.json` holds the raw measurements.
- After: `evidence/ux/after/`, with the same names, plus `area-p-{en,ar,fr}-{1..4}.png` (each Squad area with the row
  on a phone) and `screen-d-en-news.png` (the desktop rail with Inbox & news and Settings).
- Arabic: `after/screen-p-ar-club.png` shows the cash-runway months readable again (UX-06). Before:
  `before/screen-p-ar-club.png`.

## Navigation regression test
`games/the-gaffer/web/ui-tests/nav.mjs` (`npm run build && npm run test:nav`, with Playwright installed locally or
globally; set `PW_CHROMIUM` to use a pre-installed Chromium). It checks:
- 16 phone tasks and 5 desktop tasks each stay within a tap budget, with no scrolling, and no target off-screen sideways
  (the player list is allowed up to 600 px);
- the small phone (360×740) keeps all five Squad areas on screen;
- Android Back from a Squad area returns to Today;
- in AR, ES and FR: 5 labelled tabs, the inbox line on Today, all five Squad areas labelled and on screen, Arabic in RTL;
- no console errors anywhere.

It ran 3 times in a row, **all passed** (34 checks per run). An earlier run caught one real flake in the test itself:
Continue correctly opens the decision desk first when the random first fixture is a big match (a V2.9 presser). The
check now accepts either designed outcome.

## Game safety
- No save-format change. The new screens only use routes that already existed. `oldsave`, `v2core`, `press` and `store`
  sim tests pass, as did the full suite of 21 sim tests before this pass.
- An Arabic run reloaded the page and continued the saved career from the title screen, with the same career and the
  new navigation.
- `tsc --noEmit` is clean. All new copy is in `lang-nav*.ts` (EN reference, AR/ES/FR type-checked), plus the renamed
  Match tab in `lang-v2*.ts`.

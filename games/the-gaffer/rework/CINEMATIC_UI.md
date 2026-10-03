# The Gaffer — cinematic UI rebuild (reference pack v2)

Source: `The-Gaffer-Cinematic-UI-Pack` (P1–P3, 2,817 files, checksums verified). Approved references, cinematic concepts and the
40 native page views define the look; the game's own code, data and actions define behaviour. Nothing in `sim/` changes.

## Feature preservation map (current route → new place)

Every row is a feature the game has today. "Kept" = same component and action, new presentation.

| Current | Pack screen | New place | Status |
|---|---|---|---|
| Title: 2 save slots, start/continue/replace, quick match, language chips, accessibility | 01-start, 32-saves | Title | |
| New career: league → club → "About the job" → sign | 02, 03 | New career (club theme previewed on pick) | |
| Today: next match, Continue, decisions, inbox line, guide, staff log, headlines, availability, Office bar | 04, 05, 40 | Today (desk) | |
| News (sections, unread) | 05-inbox, 06-message | News | |
| Squad › Players: lens chips, planner, roster rows | 07, 09 | Squad › Players (Depth = planner, Contracts = expiring lens) | |
| Player page: talk, renew, list, rest, loan, promote, fit in plan, dev curve | 08 | Player | |
| Squad › Dressing room (cohesion, leaders, asks, promises, log) | 10 | Squad › Dressing room | |
| Squad › Training (week, intensity, focus, individual) | 11 | Squad › Training | |
| Squad › Medical (injuries, readiness, treat) | 12 | Squad › Medical | |
| Squad › Academy (age groups, intake, promote/loan/sell/scout) | 13 | Squad › Academy | |
| Match › Tactics (shape, style, roles, IP/OOP, instructions, Plan B, set pieces) | 14 | Match › Tactics | |
| Match › Fixtures (+ "What keeps happening") / Table / Cups | 15, 16, 17 | Match tabs | |
| Transfers 1 Needs & scouts · 2 List & search · 3 Negotiations · 4 Deals & loans | 18–23 | Transfers Needs / Targets / Talks / Deals | |
| Club › Money / Board / Facilities / Staff / Commercial | 24–28 | Club tabs | |
| Career (profile, history, offers) | 29 | Career | |
| Club Pass (current state only, no new payments) | 30 | Club Pass | |
| Settings (language, names, text, motion, contrast, sound, match speed/highlights, export/import/delete) | 31, 32 | Settings | |
| Pre-match: sheets, team talk, brief, Tactics Lab, odds, walk out / result / sim | 33, 34 | Pre-match | |
| Live: pitch (22 + ref + 2 assistants + ball), modes, speed, pause, shouts, subs, half-time | 35, 36, 37 | Live | |
| Full time: score, why it happened, ratings, next action; Analysis | 38, 39 | Full time / Analysis | |
| Digest, sheets (summary, staff calls, reports), toasts, update banner | — | unchanged behaviour, new finish | |

# The Gaffer rework — feature coverage ledger

Every documented feature (Feature Guide v2.2.0, build 29849616) and what the rework does with it. Status: **keep** (works,
retained), **improve** (retained, changes planned/done), **fixed** (trust defect fixed), **planned** (milestone noted),
**gap** (handoff asks for something not built yet). Evidence: Observed (this build) / Documented / Proposal.

| Area | Feature | Location | Evidence | Gap / defect | Action | Milestone | Status |
|---|---|---|---|---|---|---|---|
| Title | language switch EN/AR/ES/FR | Title | Observed | — | keep | — | keep |
| Title | 2 career slots | Title | Observed | empty slot is dead space; card lacks next fixture/last played | richer slot cards | M2 | planned |
| Title | Quick match | Title › Quick match | Observed | F11 ends at the picker | full-time + Rematch | M2 | planned |
| New career | league → club → coach → sign | NewCareer | Observed | thin (no style, no briefing) | management style + first briefing | M2 | planned |
| New career | first decisions (board plan, delegation split) | Today cards | Observed | F04 aim higher at the top | no aim higher at the top | M1 | fixed |
| Today | headline, decision cards with staff pick and costs, Undo | Today | Observed | no confidence/"why it matters" | decision card upgrade | M2 | planned |
| Today | fixture strip, next match W/D/L | Today | Observed | F08 rounding | coherent rounding | M2 | planned |
| Today | availability "x of y fit" | Today | Observed | F10 fit ≠ eligible | available for next match | M2 | planned |
| Today | staff handled it | Today | Observed | — | keep | — | keep |
| Today | club pulse (board, fans, room) | Today | Observed | F09 last time out after a move | `lastMatchHere` | M1 | fixed |
| Today | table | Today | Observed | — | keep | — | keep |
| Shell | top bar: club, position, date, Continue | all | Observed | F02 date vs messages | one "today" | M1 | fixed |
| Shell | Continue blocker state | top bar | Observed | says "n open", not what blocks | explicit blocker | M2 | planned |
| Squad | Players list + filters + depth chart | Squad › Players | Observed | — | squad planner later | M2/M3 | keep |
| Squad | Dressing room: cohesion, morale, trust, hierarchy, promises, talks, armband | Squad › Dressing room | Observed | F16 talks with nothing to say | contextual talks | M3 | planned |
| Squad | Training: intensity, focus, load, 5 individual plans | Squad › Training | Observed | — | weekly microcycle later | M3 | keep |
| Squad | Medical: treatment room, rush back, on the edge | Squad › Medical | Observed | — | keep | — | keep |
| Squad | Academy: intake day, promote/loan/release, loanees, graduates | Squad › Academy | Observed | F05 promotion hides the pledge | promotion sheet | M2 | planned |
| Player | header, actions (talk, new deal, list), ability, ceiling range, form, value | Player | Observed | — | keep | — | keep |
| Player | development chart, attributes (3 groups), where he fits, trust/morale, stats, contract | Player | Observed | — | keep | — | keep |
| Match | Tactics: 12 shapes in/out, 37 roles, presets, familiarity, instructions with gain/risk, engine zones, risks, opponent, Plan B | Match › Tactics | Observed | F06 best XI, F12 dense; F01 XI wiped | F01 fixed; best XI + layers | M1/M2 | fixed (F01) / planned |
| Match | Fixtures, Table, Cups | Match | Observed | — | keep | — | keep |
| Transfers | Needs, Scouts, Targets, Search, Talks, Deals, Loans | Transfers chips | Observed | F03 conflicting previews; 7 equal chips | F03 fixed; funnel of 4 stages | M1/M2 | fixed (F03) / planned |
| Transfers | negotiations: patience, clauses, instalments, honest read | Talks | Observed | — | keep | — | keep |
| Club | Money: runway, lines, wage cap | Club › Money | Observed | — | keep | — | keep |
| Club | Board: objectives, trust, fans | Club › Board | Observed | F04 | fixed | M1 | fixed |
| Club | Facilities (5), Staff (7 departments, Me/Ask/Staff), Commercial | Club | Observed | — | keep | — | keep |
| Career | stats, badge, seasons, records, legends, job offers, courses | Career | Observed | F09 job move leaks; F13 labels untested; F15 courses | F09 fixed; F13/F15 | M1/M2 | fixed (F09) / planned |
| Club Pass | concept, credits, looks | Club Pass | Observed | — | keep (concept, nothing sold) | — | keep |
| Inbox & news | inbox, news | Inbox & news | Observed | F02 dates | stampDate | M1 | fixed |
| Settings | language, names, sim stops, highlights, speed, sound, difficulty, export/import/delete | Settings | Observed | F17 verified | keep + previous-save fallback | M1 | fixed (hardened) |
| Matchday | pre-match: team sheets, talk, win chance, 3 ways to play | Pre-match | Observed | briefing thin | briefing | M2 | planned |
| Matchday | live: commentary, pitch/territory/shots, highlights, speed, Instant, Changes, half-time | Live | Observed | F12 commit boundary | staged half-time | M2 | planned |
| Matchday | full-time: result, xG, what it changed, officials, ratings; analysis 4 tabs | Full-time | Observed | no "next action" links | actionable analysis | M4 | planned |
| Engine | zone/graph, 7 attributes + traits, xG, officials/VAR, weather, AI react, passes | sim/engine | Observed (fingerprint a04af554a49efa49) | — | keep, presentation-independent | — | keep |
| World | seasons, AI clubs (managers sacked/hired), awards, legends, promotions | sim/season, world | Observed (world test) | narrative thin | arcs | M3 | planned |
| Saves | 2 slots, export/import `.gaffer`, migrations (v1–v8), checksum | sim/save, slots | Observed (F17) | no previous copy | previous copy + fallback | M1 | fixed |
| Platform | web + Android WebView hot update | android/, CI | Documented | — | untested here | M5 | untested |
| A11y | reduced motion | Settings note | Documented | keyboard/screen reader untested | audit | M5 | untested |

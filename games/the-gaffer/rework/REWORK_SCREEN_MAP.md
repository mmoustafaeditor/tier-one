# The Gaffer rework — screen map

Routes are `Route` in `src/ui2/game.tsx`; sheets are `SheetReq`. Phone: bottom nav with 5 areas; desktop: left rail with
the 5 areas + extras. Screenshots of every screen at 390/1440 are in the Feature Guide (build 29849616); rework
before/after evidence is in `rework/evidence/` (see `REWORK_PROGRESS.md`).

| Route | Screen (file) | Reached from | Tabs / parts |
|---|---|---|---|
| (no career) | Title (`Title.tsx`) | app start | language, 2 slots, Start a 2026/27 career, Quick match |
| (no career) | New career (`NewCareer.tsx`) | Title | country/league → club → coach → Sign |
| `quick` | Quick match (`QuickMatch.tsx`) | Title | pick two clubs → Live (F11: ends back at the picker) |
| `today` | Today (`Today.tsx`) | nav | headline, decision cards, fixture strip, next match, availability, staff handled, club pulse, table |
| `digest` | While you were away (`Digest.tsx`) | Sim to next decision | results, staff calls, why it stopped |
| `squad` (lens) | Squad (`Squad.tsx`, `SquadTabs.tsx`, `Room.tsx`, `Training.tsx`, `Pathway.tsx`) | nav | Players · Dressing room · Training · Medical · Academy |
| `room`, `train`, `medical`, `academy` | deep links into Squad tabs | cards, Player | |
| `player` (id) | Player (`Player.tsx`, `DevCurve.tsx`) | any player name | actions, attributes, fit, trust, stats, contract |
| `match` (tab) | Match (`Match.tsx`) | nav, Today "Pick the XI" | Tactics · Fixtures · Table · Cups |
| `pre` | Pre-match (`PreMatch.tsx`) | Continue on a matchday | team sheets, team talk, Walk out / Just give me the result / Sim to next decision |
| `live` | Live (`Live.tsx`, `Pitch2D.tsx`, `Officials.tsx`) | Walk out | key moments/commentary, pitch/territory/shots, highlights, speed, Instant, Changes sheet, half-time (`HalfTime`) |
| `ft` | Full-time (`FullTime.tsx`, `Analysis.tsx`) | end of match | result, xG, what it changed, officials, ratings, Match analysis (Chances · Territory · Passes · Players) |
| `transfers` (tab, neg, p) | Transfers (`Transfers.tsx`, `Talks.tsx`) | nav, cards | Needs · Scouts · Targets · Search · Talks · Deals · Loans |
| `club` (tab) | Office (`Office.tsx`) | nav | Money · Board · Facilities · Staff · Commercial (+ doors to Career, Pass, Settings on phone) |
| `career` | Career (`Career.tsx`) | rail / Club | stats, badge, seasons, records, legends, job offers, courses |
| `pass` | Club Pass (`Pass.tsx`) | rail / Club | concept only, credits, looks |
| `news` | Inbox & news (`News.tsx`) | rail, Today | Inbox · News |
| `settings` | Settings (`Settings.tsx`) | rail / Club | language, names, sim stops, highlights, speed, sound, difficulty, export/import/delete |
| `world` | world view | links | |

| Sheet | Purpose |
|---|---|
| `bid` | make a bid for a player |
| `renew` | contract renewal |
| `offers` | offers for our players |
| `staffLog` | what the staff did |
| `desk` | the desk (pending items) |
| `report` | opposition report |
| `rename` | rename club/player (fictional mode) |
| `talk` | one-to-one talk |
| `armband` | captain |

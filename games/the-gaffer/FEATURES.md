# The Gaffer: feature roadmap and parity checklist

Tracks the complete The Gaffer feature set, what is already built, and what still depends on the Semba server.

**Sources:** current The Gaffer implementation, QA findings, and the product roadmap.

**Status:** ✅ built · 🛠️ partly built · ⬜ planned · 🔁 rebuilt differently on purpose · ❌ dropped (with the reason)

The **When** column is the target build. Versions can move, but no row gets lost. Numbers like `#40` point to findings in the E2E report,
and each one is designed out when its row is built.

## 1. Start, identity and save

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Coach identity: name, age (20–80), nationality (+ second nationality) | ✅ name, age with an in-game rule message (#55), nationality and an optional second nationality (shown on the career screen and coach card) | — | |
| Club picker with search, tiers and "unlocks at" levels | ✅ country → league → club, plus club search | — | Your licence caps the clubs that offer you a job (see §9) |
| Local save (localStorage + IndexedDB) | ✅ localStorage + SHA-256, **packed** (gzip + base64, about 6× smaller: ~450K characters instead of ~2.8M, so it fits Safari too) | — | One storage place only (#56). Older plain saves still load |
| Export / import save file (`.gaffer`), paste without a file | ✅ `.gaffer` download, copy, file or paste import | — | Checksum verified; an edited file is refused (#41). Older saves are upgraded only after the check |
| Reset career / new career | ✅ Start over | — | Old game had no New career button (#56) |
| Trainer ID | ⬜ | v1.0 | Real ID from the Semba server, never `TRN-INIT` (#58); moved to v1.0 because it needs the server |
| Privacy policy page | ✅ in More › Privacy, EN/AR/ES/FR: data stays on the device, no account, no tracking, never calls a server | — | Needed for Play Store |
| Offline play | ✅ one-file build with its fonts inside (Barlow, Cairo, Tajawal), zero network requests | — | Google Fonts link removed |

## 2. Squad and players

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Squad list with filters (GK/DEF/MID/ATT) and sorts (rating, value, wage, fitness, age, player savings) | ✅ filters + 6 sorts; player savings on the player card | — | |
| Squad summary: average rating, average age, wage bill | ✅ size, avg rating, avg age, wage cap used | — | |
| Player card: 7 attributes (pace, shooting, passing, dribbling, defending, physical, goalkeeping) | ✅ shown by position | v0.5 | Attributes feed the match engine with tactics |
| Fitness, morale, form, injury, suspension | ✅ fitness drops in matches (#11), morale follows results, injuries and bans (5 yellows or a red) | v0.7 | Training loads come later, and must cost fitness (#10) |
| Season stats: apps, goals, assists, cards, clean sheets, average rating | ✅ apps, goals, assists, yellows, reds | v0.5 | Clean sheets and match ratings with match stats |
| Player's personal savings | ✅ bonuses received, on the player card | — | |
| Nicknames (الأخطبوط, الحارس الواعد …) | ✅ for the stars (الأخطبوط, الملك المصري …), editable for any player | — | |
| Real star players (`rp_*`: Salah, Mbappé, Haaland, Zizo, Emam Ashour …) | ✅ 59 near-real stars («M. Salaah», «K. Mbapeh», «Zeezo», «E. Ashour» …) with their famous shirt numbers | — | One club each (#31), in `src/data/stars.ts` |
| Shirt numbers | ✅ unique per club | — | (#50) |
| Captain and set-piece takers (penalties, free kicks, corners) | ✅ | — | Sensible defaults, never all on the goalkeeper (#24); penalties, free kicks and corner goals use them |
| Development points (⚡): +1 rating, +2 potential, +15 fitness | ✅ + a team talk (+10 morale); earned from wins, cup runs, trophies and objectives | — | Each use says why it can't be done (#9, #48) |
| Squad shrinks with no warning | ✅ fixed by design | — | Retirements are replaced by academy kids (#23) |

## 3. Tactics

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Formations (4-3-3, 4-2-3-1, 3-5-2 …), some locked by licence | ✅ 6 formations, 4-2-3-1 / 5-3-2 / 3-5-2 need licence C / B / A | — | A locked one says which licence it needs (#16) |
| Pick the XI on a pitch, bench, reserves, swap players | ✅ pitch view, tap a spot to pick or swap, best XI, out-of-position warning | — | **One source** for tactics, match and commentary (#1); unavailable picks are replaced and named |
| Mentality (park the bus → all-out attack) | ✅ 5 levels | — | Changes the prediction and the result (#15, #46) |
| Passing (tiki-taka, direct, long balls), pressing (low → gegenpress), build-up | ✅ passing short/mixed/direct (uses passing or pace), pressing low/balanced/high (costs fitness) | v0.8 build-up | |
| Pressing traps (wings, centre, half-spaces) | ✅ each works best against one philosophy | — | |
| Player roles: full-back (classic, overlapping, inverted), striker (target man, false 9, pressing forward) | ✅ full-backs 3 roles, striker 4 roles, with real effects (attack, defence, possession, fatigue) | — | |
| Philosophies with mastery % and counter / mismatch warnings | ✅ 7 philosophies, each beats two others; mastery grows with games (+2 each) | — | Warnings in the assistant's advice |
| Match prediction (win/draw/loss %) | ✅ on the match and tactics screens | — | Moves with every tactic change |
| Assistant's advice | ✅ before each match: mismatch or edge, mastery, tired starters, players out of position, underdog, trap | — | |

## 4. Match day

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Match engine | ✅ minute by minute: level + fitness + morale + formation + mentality + pressing + passing; goals (open play, penalties, free kicks, corners) with assists, chances, saves, cards, second yellows, injuries, AI subs and tactic changes | v0.8 | Same engine for live, quick and AI matches |
| Live match with Egyptian commentary | ✅ EN/AR feed | — | Starts only when the screen is visible (#53) |
| Pitch view: 2D, 2.5D, 3D camera, formation radar | ✅ live pitch with 3 cameras: 2D from above, 2.5D (fixed, high), 3D (low broadcast camera that follows the ball); 22 players move all the time by role, with and without the ball; passes, pressing, shots and goals follow the engine's events; **formation radar** (pace, shooting, passing, dribbling, defending, physical) before the match and in the live stats | — | Projected in code, so players stay round and upright |
| Speed 1X/2X | ✅ plus pause and skip to full time | — | |
| In-match tactic changes, subs (manual and automatic), half-time team talk | ✅ mentality and pressing, 5 subs, automatic subs on quick results, half-time talk with 4 options | — | Subs at half-time too (#25). The match is saved and resumes after a restart |
| Match stats (possession, shots, on target, corners, fouls, cards) | ✅ + line-ups with live fitness | — | |
| Instant sim, "skip 50%" with a revenue cut | ✅ quick result | v0.7 | Any revenue cut is stated before you choose (#52) |
| Penalty shootouts | ✅ in every knockout draw, shown kick by kick | — | |
| Post-match report, share as image | ✅ at full time: competition, score (and penalties), scorers, possession, shots, on target, corners; share sheet or PNG download | — | File named after the match, e.g. `the-gaffer-elh-0-1-lvr-2026.png` |
| Opponent scouting report (100k): formation, key threats, weaknesses, counter plan | ✅ paid (scaled to the club), accuracy from the chief scout, counter plan in one tap | — | No raw translation keys (#30); the plan really helps (+4% win chance in tests) |

## 5. Competitions

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Leagues with tiers, promotion and relegation | ✅ 18 leagues, 3 up / 3 down | — | Old game: 4 Egyptian tiers. Ours: 2 per country for now. The old saved world also had the user's club in all three Egyptian leagues at once; `checkWorld()` blocks that |
| National cups (Egypt Cup, FA Cup, Copa, King's Cup …) | ✅ 12 national cups, every club of the country, byes for the top seeds, prize money | — | The season summary shows the real run from the bracket (#3) |
| Continental cups: Europe (UCL, UEL), Africa (CCL), Asia (ACL) | ✅ 4 cups, places from last season's tables; **groups of four** (home and away, top two through) then knockouts | — | The old game's were **empty** (#12); ours are played |
| League table, results, top scorers | ✅ | — | |
| Top assists (صناع اللعب) | ✅ | — | |
| Fixtures calendar, day by day | 🔁 matchday by matchday, with a training week after each | — | Clubs alternate home and away |

## 6. Club, money and staff

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Treasury, monthly wage cap, turning treasury into wage cap and back | ✅ 12 months of budget per +1 a month, and back | — | One set of numbers on every screen (#13, #29) |
| Ticket price with attendance curve | ✅ capacity, expected crowd and revenue at 8 prices | — | Only home games bring gate money (#14) |
| Sponsors: shirt, sleeve, stadium LED, kit supplier, commercial; negotiation, early extension, termination | ✅ 5 slots, offers, ask +10% (they agree or walk), +12 months, early end costs 2 months, league and cup bonuses | — | **Playful near-real brands**; values scale with the club; the home screen warns about empty slots (#28) |
| Facilities (5): stadium, medical, training ground, academy, scouting | ✅ levels 1–5 with real effects and upkeep | — | Prices scale with the club (report §7) |
| Staff: assistant, fitness coach, doctor, psychologist, performance analyst; hiring and totals | ✅ 5 roles, 3 candidates each, quality drives effects | — | The staff total is the sum of the staff shown (#39) |
| Bonuses: whole team or one player, from the club or the coach's wallet | ✅ team bonus from club or wallet; morale by size of bonus vs wage | — | |
| Coach's personal wallet and donations to the club | ✅ salary into the wallet; donations lift board and fans in proportion (#4) | — | |
| Prize money | ✅ by league position, and for cup winners and finalists | — | |
| End-of-season finances | ✅ a ledger per season and per month, line by line | — | (#9, #29) |

## 7. Training, medical and academy

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Training load: recovery, balanced, hard | ✅ with a weekly report (who improved, who got hurt) | — | Hard training costs fitness (#10) |
| Individual focus (finishing, passing, dribbling, defending, goalkeeping, general) | ✅ per player, on any of the 7 attributes | — | |
| Player development | ✅ weekly for your squad (age, load, facility, assistant), yearly for other clubs | — | Players at their ceiling say so (#58 in the report) |
| Hospital: injuries, rehab (10k), specialist (25k), instant recovery (50k) | ✅ rehab, specialist, instant; prices scale with the club, lower with a good doctor and medical centre | — | You pay exactly the price shown |
| Academy: scouting exams, prospects up to 84 potential, promote to the squad | ✅ scouting exams (15–17 year-olds, up to 94 potential), promote, release, **sell rights** | — | (#47) |

## 8. Transfers and contracts

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Transfer market with advanced filters (position, league, nationality, free agents, sort) | ✅ position, league, free agents, within budget, name search, 5 sorts | v0.6 nationality | |
| Official negotiation (fee, wage, years, squad role) | ✅ fee, wage, years, role; the fee box starts at the asking price (#21) | — | |
| Direct buy | 🔁 every offer gets an instant, clear answer with the reason and a counter | — | (#7, #22) |
| List for sale, incoming offers, counter-offer, reject, withdraw | ✅ | — | Offers come from clubs at the player's level, and last 3 matchdays (#51) |
| Transfer rumours, "hijack the player" | ✅ other clubs chase good players; the deal can go through at the deadline unless you hijack it | — | Clubs now trade players among themselves |
| Contract renewals, expiry warnings, free exits | ✅ | — | Expiring players leave for free at season end unless renewed (#20) |
| Squad-size guard | ✅ | — | Can't sell below 16, max 32, warning under 18, academy fills to 16 (#23) |

## 9. Board, fans and the coach's career

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Board objectives: league, cup, finance, youth | ✅ league, cup, youth, finance (end the season in the black) | — | Cup aim stays open until the club is out or wins |
| Board and fan confidence, board messages | ✅ move with results against expectations | — | Messages match the real situation (#19) |
| Sacking | ✅ below 12% from matchday 12, or below 25% at season end | — | It really happens (#17), then job offers at your level |
| Job offers, moving to another club | ✅ end of season (and after sacking), same country first, capped by licence | — | Moving keeps everything valid, resets the board and tactics, and the new club welcomes you (#18, #40, #49, #50, #27) |
| Coach level, XP, reputation (unknown → legend) | ✅ | — | Slow reputation growth (report §7) |
| Coaching licences D → C → B → A → PRO → Elite, with exams and fees | ✅ 3-question exam, fee from the coach's own money | — | One licence at a time, 10 matchdays apart (#44); licences cap clubs and formations (#16) |
| Courses: fitness, psychology, tactics workshop, European fellowship | ✅ with real effects (fatigue, morale, pressing, youth development) | — | |
| Milestones (short / mid / long): first win, 3-win streak, giant slayer, cup glory, promotion, league title, two clubs, world #1 … | ✅ 16 milestones with XP, reputation and cash, including world #1 | — | Checked against real numbers (#43) |
| World coach and club rankings, filters (world, Egypt, Africa, Europe, Asia/Gulf) | ✅ club Elo from every result; coach points = club + reputation + trophies; world, your country, Europe, Africa, Asia & Gulf | — | One formula everywhere (#13), right regions (#57) |
| Coach card with photo upload, download as PNG, share | ✅ photo (kept on the device), name, nationality, age, club, level, licence, reputation, record, trophies, world rank; fixed 1080×1350 layout, mirrored in Arabic | — | File named `the-gaffer-coach-<name>-<season>.png` (#36) |
| Career history | ✅ season by season, trophies, clubs | — | |

## 10. News and inbox

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Inbox: board, fans, scouting, club report, contracts, offers; mark all read, clear, search | ✅ filters, search, mark all read, clear | — | Trims to the last 60 (#37). Welcome from the real club (#2) |
| Newspaper: tabs (transfers, results, managers, youth, crises, records), full report, share | ✅ results, transfers, managers, youth, records, crises; stories from what really happened; share any story | — | No repeats (#59) |
| Bell / notifications | ✅ unread count on the home screen | — | |

## 11. Online and live service (needs Semba's server)

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Online PvP: matchmaking queue, private room with a 6-character code, Elo leaderboard | ⬜ | v1.1 | Server with auth and rate limits. The old `record-result` had no auth |
| Gift / promo codes | ⬜ | v1.0 | Checked **on the server only**, and never shown as a placeholder (#6) |
| Rewards centre (watch an ad) | ⬜ | v1.0 | Real AdMob on Android only. No fake `confirm()` ads on the web (#5) |
| Broadcast messages, events, maintenance notices | ⬜ | v1.0 | From the admin panel |
| Cloud sync, delete-account request | ⬜ | v1.1 | |
| Coins, gems, VIP | ⬜ | decide | Monetisation is a team decision; not started until you decide |

## 12. Admin and world tools

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Admin panel: dashboard, users (suspend/ban), audit log, online matches, security | ⬜ | v1.0 | Semba server; role-checked, never in the player build |
| World editor: countries, leagues, clubs, players; publish a world version with validation | ✅ clubs, players (add, move, release), league names, country names, club swaps between leagues of a country (from next season); saved only when `checkWorld()` passes, with readable problems; versioned world file export / import | — | League sizes never change, so fixtures and cups stay valid |
| Realism / balance settings (sponsor and wage multipliers …) | ✅ club income, player wages, transfer prices (×0.5–×2), injuries (off → more), opponents (weaker / stronger), board patience; saved with the career | — | In Settings for the player, not an admin panel |
| Promo-code manager | ⬜ | v1.0 | |

## 13. Settings and platform

| Old game | The Gaffer | When | Notes |
|---|---|---|---|
| Arabic UI | ✅ English, Arabic (RTL), Spanish and French | — | Club and player names stay in English in Spanish and French |
| Settings, How to play | ✅ language, match speed, first live tab, realism; How to play in 10 short sections | — | Device settings stay on the device; realism is saved with the career |
| Anti-AFK | ⬜ | v1.1 | Only matters for online rewards (#45) |
| Android app | ✅ `android/` WebView app, appId `com.sembagames.thegaffer`, its own key, offline-first, with INTERNET permission only for Semba update checks and future online services, share sheet for cards/saves, file picker, back button; APK built by `.github/workflows/build-the-gaffer.yml` | — | No public project download |
| **Facebook button** | ❌ replaced by the **Semba Games** button ✅ | — | Studio decision |
| **"Download the Android project (ZIP)" button** | ❌ | — | Leaked `google-services.json` and `local.properties` (#42) |
| Hard-coded default club «نجم ميت عقبة» | ❌ | — | That was a bug (#2) |

## Road map

| Build | Focus |
|---|---|
| **v0.4** | Transfers and contracts, player attributes, fitness, morale, injuries and cards, squad sorts, top assists, save export and import |
| **v0.5** | Tactics (formations, XI on a pitch, mentality, pressing), in-match subs and changes, match stats, prediction, coach age and nationality, club search, captain and set pieces |
| **v0.6** | Cups (national + continental) with penalties, board and fans, sacking and job offers, licences, courses, milestones, inbox, star players and the name editor |
| **v0.7** | Money: tickets, sponsors, facilities, staff, bonuses, wallet and donations, finances; training, hospital, academy scouting, development points |
| **v0.8** | 2D pitch view, advanced tactics (roles, traps, philosophies), scouting reports, rankings, newspaper |
| **v0.9** | Coach card, settings and how to play, Spanish and French, balance settings, world editor, post-match share, continental group stages ✅ |
| **v1.0** | Semba server: gift codes, broadcasts, admin panel, AdMob on Android, APK |
| **v1.1** | Online PvP with Elo, cloud sync |

# The Gaffer: design and gameplay audit

**Scope:** The Gaffer only (football manager, game 02). Tier One was not examined.
**Mode:** audit plus repair-prompt preparation. No production code was changed, nothing was committed, pushed or
deployed, and no existing save was touched (fresh browser profiles only).
**Companion files:** `THE_GAFFER_FINDINGS.md` (the numbered findings), `THE_GAFFER_SYSTEM_DEPENDENCIES.md` (the
causal trace), `THE_GAFFER_REPAIR_MASTER_PROMPT.md`, and `evidence/`.

## 1. What was audited

| Item | Value |
|---|---|
| Repository | `mmoustafaeditor/tier-one`, branch `claude/repo-coordination-lbro4r` at `865bc2b` (= `origin/main`) |
| Last The Gaffer commit | `aa929cb` (bot publish of web build 29846333 + APK, 2026-09-30) |
| Version | web **2.1.0**, build **29846333** (`the-gaffer/version.json`); Android feed `/api/the-gaffer/latest` versionCode 29846333 |
| Source | `games/the-gaffer/web/src` (React 19 + TypeScript + Vite, single-file build) |
| Build artifacts | `games/the-gaffer/build/index.html` → copied to `/the-gaffer/index.html` (served at sembagames.app/the-gaffer) |
| Android wrapper | `games/the-gaffer/android` (`com.sembagames.thegaffer`, WebView, hot web updates via `version.json` + SHA-256) |
| Saves | IndexedDB `semba-gaffer`, 2 slots, localStorage mirror for the Android shell (`sim/slots.ts`); save v8 with an upgrade chain (`sim/upgrade.ts`) |
| Deployment | the shared Vercel project; CI `.github/workflows/build-the-gaffer.yml` builds, commits the build to `main` and calls the deploy hook |
| Test date / environment | 2026-09-30; Linux container; Node 22; Playwright 1.56 Chromium (headless); phone 390×844, desktop 1440×900, width sweep 320–768 |

**Live vs repository:** the sembagames.app home page links "The Gaffer" to `/the-gaffer/`. `curl` (TLS-verified)
fetched `https://www.sembagames.app/the-gaffer/`, and its SHA-256 `9c1f1af2…db322d` is **identical** to
`the-gaffer/index.html` in the repo and to `version.json`. Live `/api/the-gaffer/health` answered OK. The sandbox's
Chromium doesn't trust the sandbox's HTTPS proxy certificate, and I did not disable TLS checks, so the browser
sessions ran the **byte-identical live file served from localhost**. That is the live build, but not literally loaded
from the live origin; for example, same-origin calls to `/api/the-gaffer/verify-purchase` were not exercised, since
payments are switched off anyway. A local `npm run build` of the current source (typecheck clean) was also run for the
first smoke test. It differs only in the embedded build number.

## 2. Method, evidence and severity scale
- **Severity:** Critical = prevents play or corrupts saves. High = breaks a central loop or makes major decisions
  ineffective or exploitable. Medium = materially harms usability, credibility or balance. Low = limited
  presentation or friction.
- **Status:** *reproduced* (seen in UI or simulation, with steps), *code-confirmed* (cause located in source),
  *suspected* (plausible, not fully proven), *design recommendation*.
- **UI play (browser automation with real mouse clicks):**
  - Career 1: **Al Ahly** (strong, Egypt), phone layout. Onboarding, delegation choice, player profile, tactics
    changes, pre-match talk, a live match at Normal speed with a substitution, full time, a transfer search → bid →
    agent terms → signing, staff log, board, facilities and staff room. Then a **complete season through the UI**
    ("Sim to the next decision" loop, 34 league matchdays + African Champions Cup + Egypt Cup final), the season
    review and the **start of 2027/28**. An Arabic (RTL) pass on five screens, then training, dressing room,
    medical and academy.
  - Career 2: **Ipswich Town** (weak, England), desktop layout, slot 2: onboarding and Today.
  - **Quick match** (Man City v Arsenal) to full time, checking that no career save is written.
  - A reload/resume mid-live-match (it resumes at the same minute), and a slot list with two careers.
- **Simulation (headless, the game's own `sim/` modules; harness in `evidence/harness/`):**
  - 6 careers × 3 seasons (Man City, Ipswich, Al Ahly, Haras El Hodoud, Al-Hilal, Al-Hazem), staff-recommended choice
    on every decision. **Caveat:** in this first batch job offers had no staff pick and the harness took the first
    choice ("take the job"). So the Al-Hilal run moved to Zamalek after season 1, and the job-dependent numbers of
    that batch aren't used as evidence; the per-club economy and board traces are.
  - 2 careers × 5 seasons (Brighton, Zamalek), with job offers declined.
  - **A seeded A/B:** 6 clubs × 4 seeds, one season each, club AI-managed vs user-managed on staff defaults, plus
    `ignore` mode (no decisions answered) for 2 clubs × 4 seeds. That's 36 runs.
  - Calibration: expected vs actual points per user match, 8 careers, 12 club-seasons, 549 user matches.
  - A league-wide AI morale census at matchday 30 (England and Egypt, seed 7).
  - The repo's existing sim-tests: `oldsave, roomsave, realworld, recruit, referee, roles, room, tactics, why, youth,
    nodes, single, sanity, v2core`. All exited 0, and the output is kept in `evidence/sim/`.
- **Tools that failed and how it was handled:** a bug in my own UI driver (a mistyped wait step fell through to
  "click the first button") briefly looked like a spontaneous "1 call still on your desk" pop-up. It was traced to
  the driver (the stack showed Playwright's injected script) and **is not reported as a game issue**.

## 3. Does it work as a coherent game?

**Short answer: mostly yes.** The core systems are genuinely connected and legible. The main problems are balance
distortions that sit *between* the systems, plus one phone-layout defect that removes a central control.

Evidence that the systems connect:
- A training intensity choice changes growth and load; load raises injury risk; the staff rest a player "~13 %
  injury risk"; an in-match injury shows up at full time ("Achraf Dari is out for 3 weeks") and then on Today
  ("Out 3 wks" → "Out 1 wk").
- Tactics feed the same engine the forecast uses: changing shape or style moved the Al Ahly forecast 83 → 85 → 78 →
  80 → 90 %, and the Changes sheet shows a live win chance.
- A transfer runs end to end with real state: a knowledge fog (scouts 4 % sure, ability 58–70), a club fee over up to
  three bids, an agent's patience, the fee, agent fee and signing-on fee in the ledger, spending room from €12M to
  €4.7M, and a higher wage bill.
- Results move the board, fans, cohesion and dressing room, all explained on the full-time screen with the
  assistant's verdict ("We were the better side, 1.9 xG to 0.2…").
- The season end moves the world (promotion/relegation, prize money, ageing, retirements, academy intake) and the UI
  carries it into 2027/28 with a readable review.

Where coherence breaks (details in the findings):
1. **Who is managing matters more than what they decide.** User-managed clubs gain about +0.37 points per game on
   staff defaults (GF-002) because the user's side alone gets assistant and cohesion bonuses and a managed morale.
2. **Losing AI clubs collapse** (GF-003): morale falls to the floor and costs every attribute about 2.6 points.
   Tables polarise; the bottom Premier League club had 12 points from 30 games.
3. **The board and fans don't read success well** (GF-004): a 2nd-placed Man City was sacked; the fans of a
   double-winning Al Ahly were "Muttering".
4. **The default delegation drifts** (GF-005): the recommended choices sell and loan out but never buy, so squads
   shrink to 16 and cash piles up with no use.
5. **On phones the in-match Changes button is off-screen** (GF-001), so a player can't make their own substitutions
   or tactical changes during a match.

## 4. Coverage matrix

Legend: **V** = verified, **P** = partially verified, **NT** = not tested, **NA** = not applicable. "UI" and "Sim"
say where the coverage came from.

### A. Core loop and player agency
| Question | Status | Notes |
|---|---|---|
| What repeats | V (UI) | Today (≤ 5 decisions, staff pick pre-selected) → pre-match (talk, XI, report) → live or quick result → full-time "What it changed" → Today. Transfer windows and the season end punctuate it. |
| Meaningful tradeoffs | V (UI + code) | Training intensity (growth vs load and injuries), pressing (win chance vs fatigue), bid structure (instalments and sell-on vs value to them), promises vs minutes, delegation level vs number of calls. |
| Goals and consequences understood | P (UI) | Board objective, the Why card and "What it changed" are clear. The assistant's quality bonus and cohesion levels aren't surfaced as a user-side-only edge (GF-002). |
| Dominant strategies / busywork / dead ends | P (sim) | Staff defaults already overperform (GF-002). High press looks strong (GF-012, suspected). No dead ends found in play; the season rolls over. |
| Interest beyond the opening | P (sim) | Weak AI collapse (GF-003), shrinking squads plus idle cash (GF-005), and a board that saturates at 100 for most clubs meeting easy objectives flatten the long-term tension. |

### B. System dependencies
V for chains 1–23 in `THE_GAFFER_SYSTEM_DEPENDENCIES.md` (UI, code and sim as marked there). Decorative, stale and
broken chains are listed there too.

### C. Match and simulation design
| Question | Status | Notes |
|---|---|---|
| Lineups, positions, attributes, tactics and condition matter | V (code + UI + sim) | `fitPenalty`, attributes × fitness, morale, roles, shape; the forecast reacts. |
| Stronger teams favoured, not predetermined | V (sim) | `sanity` (240 matches): rating gap +4 → 63 % wins (n = 59), +8 → 91 % (n = 22). Upsets happen (Al Ahly lost 0–1 at ENPPI with 1.85 xG to 0.23). Tables are too polarised because of GF-003. |
| Tactical advantages contextual | P | ENGINE.md claims so; the repo test suggests a near-dominant press (GF-012, suspected). |
| Subs and changes applied at the right time | V (UI) | "Changes take effect from the next minute". A sub made at 6′ played and scored at 47′; sub and window counters update (4 subs / 2 windows left). |
| Goals, cards, injuries, possession, shots, xG consistent | V (UI) | Live stats, key moments, full-time officials panel and ratings agreed in the matches checked (e.g. 6 cautions listed = 6 in the officials panel). |
| Commentary / pitch / stats / result consistent | P (UI) | Consistent in 4 UI matches. The 2D pitch was only spot-checked. |
| Football rules and spatial behaviour plausible | P (code + existing tests) | Referee, VAR, added time, 5 subs in 3 windows, bans per competition; `simtest-referee` passes (142 lines). |
| Kick-off, restarts, HT, subs, FT | P (UI) | Half-time showed the Why card with a suggested sub (code-read). FT and resume verified. |
| Controllable randomness | V (code + sim) | Seeded (`rngFor(key, minute)`, `makeRng(seed …)`); same seed gives the same season. The A/B relies on this. |

### D. Economy and progression
| Question | Status | Notes |
|---|---|---|
| Fees, wages, income, expenses, reward timing | V (UI + sim) | The ledger reconciles after a signing; weekly flows are a quarter of a month; prizes at season end. |
| Units, rounding, negatives, duplicate deductions, exploits | P | € formatting with bidi isolates works in AR. No duplicate deduction seen. Parallel bids are checked alone, but completion blocks an overspend (GF-013). Not exhaustively fuzzed. |
| Financial pressure creates decisions | P (sim) | Operations roughly break even and prizes make every club profitable; staff defaults hoard cash (GF-005). |
| Runaway wealth / impossible recovery / free-resource loops | P (sim) | Runaway cash yes (Zamalek €9M → €74M). No infinite loop found. AI budgets are floored at 0 by design ("the owner covers"). |
| Player development plausibility | P (sim + existing test) | 19-year-old growth scales with minutes (×1.39); the world top-100 average is stable at 85.9 → 86.8 over 3–5 seasons; the player pool shrinks about 5 % over 5 seasons. |
| Board objectives vs strength and finances | P (sim) | Objectives come from reputation rank; Liverpool (2nd-strongest squad) is asked for "top five". Most mid clubs reach board 100 easily; favourites are punished (GF-004). |
| Multi-season pacing | P (sim, 5 seasons) | Stable, no errors (`checkWorld`/`checkCareer` 0 each season). |

### E. NPC and opponent behaviour
| Question | Status | Notes |
|---|---|---|
| Selection, tactics | V (code) | AI uses `aiTactics` + `autoXI` + `autoRoles`, respects availability and bans (`availableIn`). |
| Transfers, contracts, squad management | P (code + sim) | AI bids on the user's players (seen in UI), loans academy prospects, rumours complete on deadline day. At season end 85 % of expiring AI contracts auto-renew and AI clubs sign free agents up to 22. AI squads stayed 16–30. |
| Eligibility / injuries / suspensions / budget | P (code) | Budget floor 0 for AI; bans per competition. Not stress-tested. |
| Frozen opponents / unfair information | P (sim) | No frozen AI found. The user's side does have unfair *modifiers* (GF-002). |
| Personalities / biases affect decisions | P (UI) | Staff bias is shown and logged ("Loyalist: keeps his players"); advice can contradict itself (GF-016). |

### F. UX, onboarding, presentation
| Question | Status | Notes |
|---|---|---|
| Learnable without outside help | V (UI) | The first-day delegation card, staff advice on every decision, "Staff pick" marks, How to play in Settings. |
| Consequences and blocked actions explained | V (UI) | Bid preview ("They'll accept", "Expect a counter"), age validation ("Between 20 and 80."), full-time "What it changed". |
| Menus, confirmations, loading, errors, empty states | P (UI) | The desk sheet before Continue with open decisions; empty states ("Nobody on the shortlist…"). The season-end empty day word (GF-007). |
| Values consistent across screens | P (UI) | Stale committed spending room (GF-013); the runway month labels (GF-010). |
| Feedback after decisions | V (UI) | Toasts, "Done: … Undo", the staff log. |
| Readability, overlays, touch targets, accidental actions | P (UI) | **Changes unreachable on phones (GF-001)**; depth-card overlap (GF-009); score and Full-time pill touching on the live header. |
| Keyboard access | NT | Escape closes sheets (code + observed). No full keyboard traversal was done. |
| Arabic RTL, clipping, mixed script, translation | P (UI) | `dir=rtl`, no page-level overflow on 5 screens, Egyptian-Arabic tone. Real player names in Latin (GF-006); "إدير النادي" on the title looks like a typo (not filed; native review advised). |
| Spanish / French | NT | Not exercised beyond the language chips; QA.md already accepts English club and player names there. |

### G. Platform and reliability
| Question | Status | Notes |
|---|---|---|
| Desktop and narrow mobile | V (UI) | 1440×900 left-rail layout; 390 px phone; width sweep for the live bar. |
| Reload / navigate away and back / resume | V (UI) | A reload mid-match resumed at the same minute; slot list shows two careers; the season rolled over and was saved. |
| Offline | NT | Claimed for the Android shell (bundled copy); not tested. |
| Performance | P | Headless: one season with all leagues about 17–35 s (4 parallel runs); UI "Sim to the next decision" 1–5 s per step; a full UI season in about 100 s. No profiler run. |
| Console errors / failed requests | V (UI) | **0 page errors, 0 console errors, 0 failed requests** across every UI session. |
| Save/load integrity and migration | P | Existing `oldsave` and `roomsave` pass (v3/v4 saves load to v8). The UI export/import files were not exercised. |
| Android/iOS | NT (config read only) | No APK or iOS run. The Android WebView hot-update design was read, not executed. |

### H. Content, narrative, retention, live-ops
| Question | Status | Notes |
|---|---|---|
| Event repetition / context accuracy | P (UI) | News, rumours and staff lines were varied in one season. The contradictory advice (GF-016); generated names by country (GF-011). |
| Emergent stories | P | Dressing-room requests, promises, rival bids and cup runs appeared. No long-term narrative audit. |
| Long-term objectives / reasons to return | P | Season goals, the board, cups and records exist; the tension flattens (see A). Absent daily rewards are **not** treated as a defect. |
| Monetization / analytics / live-ops | P (code) | All off in `monet.ts` (by design). The feed changelog is wrong (GF-014). No analytics exist; see §6 for instrumentation that would answer open questions. |

## 5. What could not be assessed, and what it would take
- **Real devices and the Android APK** (WebView metrics, back button, hot update, offline): needs an emulator or
  device run of `downloads/TheGaffer.apk`.
- **Live origin in the browser**: needs a browser that trusts the sandbox proxy CA, or a run outside the sandbox. The
  byte-identical copy covers the game code itself.
- **Spanish and French** content quality, and a native Egyptian-Arabic copy review.
- **Export/import of `.gaffer` files through the UI**, and the save-size ceiling on long careers (`QA.md` quotes
  about 0.5M chars packed).
- **Keyboard-only and screen-reader** use.
- **Tactic dominance in the real 2026/27 world** including fatigue and injury over time (GF-012 needs this before
  anyone changes the engine).

## 6. Instrumentation that would answer open design questions
Only where a question is concrete:
- *Do players use Changes during matches?* Count opens of the Changes sheet and subs made by viewport width. That
  confirms GF-001's impact and verifies its fix.
- *Is the default delegation what players keep?* Track the level per department at matchday 10 and 30.
- *Do careers end by sacking or by quitting?* Log the season and position at sacking, and the last matchday played
  per slot.

## 7. Evidence index
- `evidence/screens/`: UI screenshots. `A-*` Al Ahly phone career, `B-*` Arabic, `C-*` desktop/Ipswich/width,
  `D-*` quick match, `E-*` training, room, medical, academy, `L-*` season-loop captures.
- `evidence/sim/`: `user-vs-ai-ab.csv`, `fair.jsonl` (A/B), `calib.jsonl`, `ai-morale-r30-seed7.txt`, the 3-season
  careers `*.json`, the 5-season `long-*.json`, and the existing sim-test outputs `simtest-*.txt`.
- `evidence/harness/`: the scripts that produced them (`career.ts`, `fair.ts`, `calib.ts`, `morale.ts`, the
  Playwright drivers). The `.ts` harnesses import the game source by absolute path and are bundled with the
  project's esbuild (`node_modules/.bin/esbuild <file> --bundle --platform=node --format=esm`).

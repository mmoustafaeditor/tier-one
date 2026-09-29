# The Gaffer v2: connected-systems design

**Status:** design spec for build teams. Each increment in section 8 still needs the owner's approval (the FM26 reference's approval gate) before anyone builds it.
**Baseline:** `main` @ `337d08d` (web 0.12.x after G1 "Integrity", G2 "Board and money", G-names and the pitchside-glass UI). Paths are relative to `games/the-gaffer/web/src/`.
**Inputs:** the owner's master prompt (Part II and III), the *FM26 Systems Architecture Reference* (8 pp.), the audits `gf-systems.md`, `gf-ux.md` and `gf-math.md`, G2 results, and the code. Evidence labels follow the reference. **O** is FM26 behaviour visible to players, used only as a benchmark. **P** is architecture we propose. Nothing here describes FM's internals, text, art or layouts.
**Parallel lanes treated as given:** the rebuilt match engine (`lane5/gf-engine`) and the 2026/27 data snapshot (`lane5/data-service`, `data/SCHEMA.md`). Neither had pushed work when this was written. Sections 3.3 and 3.11 define the contracts they must meet.

---

## 0. Decisions at a glance

1. **Every system is a small game with a visible consequence.** A system ships only if it has a decision, a cost, a consequence in another system and a place where the player sees it. The rest gets cut (see the list in 3.12).
2. **One authoritative state and one event log.** Commands are validated inside the simulation, never in the UI. Every change appends a domain event with its cause. Inbox, news, story threads, the Why card and records are all projections of those events.
3. **Home is a decision queue.** "What needs me today?" lists at most 5 decisions. Each shows the staff's recommendation, so one tap accepts it. **Continue** simulates to the next decision. A streamlined matchweek takes 3–5 minutes.
4. **Three-level delegation per department:** *Me*, *Ask me* and *Staff*. Staff act through the same commands the player uses. Their calls show in a log with a reason. Each staff member has one bias trait, so their calls can be wrong in a readable way.
5. **Two numbers per player for the dressing room: Morale (weeks) and Trust (seasons).** On top of those sit typed **Promises**, a three-tier hierarchy with 3–4 **Leaders**, and a team **Cohesion** value that feeds the engine. This is the smallest model that produces "the unhappy star leaves for a rival".
6. **Knowledge fog replaces the current two-matchday binary reveal.** Scouting knowledge per player runs from 0 to 100 and narrows a range gradually. Potential for players aged 23 or under is never shown as exact.
7. **Transfers take two stages with real time between them.** Club-to-club bids are answered next matchday (immediately on Deadline Day), so rivals can hijack. Personal terms are a live, multi-round talk with an agent who has a patience meter and a known or hidden priority. Clauses: instalments, sell-on, add-ons, release clause, signing-on fee and agent fee. A promised role becomes a Promise.
8. **Club-owned state belongs to the club, not the manager.** Academy, facilities, familiarity, cohesion and sponsors stay with the club when you move jobs. Today `moveTo` throws the academy away and carries squad mastery with the manager (`sim/coach.ts:148-158`).
9. **One development model for everyone.** User and AI players grow with the same per-matchday function. The inputs are age, the gap to potential, minutes, training quality and intensity. Today the user's squad grows weekly and AI squads grow yearly (`season.ts`). Prospects become captains anywhere in the world, so rival academies create stories too.
10. **Money never buys football.** Semba Credits buy cosmetics, extra save slots, scenario packs and ad removal. Rewarded ads pay credits only. The current "free opponent report" ad reward goes away because it saves club money.

---

## 1. Current state (verified against code at `337d08d`)

### 1.1 What has changed since the audit

G1 and G2 closed most of the audit's P0/P1 items. We keep all of them:

- `checkCareer` and `tidyCareer` run on write and read (`sim/save.ts:14-60`).
- `SAVE_VERSION = 2` with an explicit `UPGRADES` chain (`sim/upgrade.ts`).
- `buy` validates through `judgeBid` internally, with typed refusals, including a check on the seller's squad size (`sim/transfers.ts:67-117`).
- Seeded counter-offer rolls (`transfers.ts:153`).
- The board judges results against the engine's own odds (`expectedPoints`, `season.ts:223`), with a honeymoon period (`coach.ts:141-145`).
- G2 economy: prize pot from wage caps (`PRIZE_POT`), gate sized to the club (`GATE_SHARE 0.25`), and AI clubs paying wages (`aiEconomyWeek`).
- Academy exam cap, `LOAD_RECOVERY [16,12,11]`, rumours every fourth matchday, and players on loan excluded from AI deals.
- The market sorts by the scouts' estimate, not the hidden rating (`ui/Market.tsx:27-31`).
- Names are fictional (`sim/renames.ts`, applied on load).

### 1.2 Trace table

Classes: **C** connected, **S** present but shallow, **D** present but disconnected, **M** missing, **X** out of scope.

| System | Consumes | Trigger | Validation | Authoritative change | Consumers | Visible consequence | Survives save | Class |
|---|---|---|---|---|---|---|---|---|
| World, calendar, standings | seed, `LEAGUES`, `CLUB_ROWS` | creation; `playDay` | `checkWorld` | fixtures, cup ties, Elo | tables, cups, news, prizes, board | tables, full-time card | yes | **C** |
| Match engine (current) | XIs, `formOf`, tactics, mastery | `stepMinute` / `simulate` | subs ≤5, reds, eligibility | `LiveMatch` events and counters | aftermath, ratings, board | live screen, full-time card | yes (`career.live`) | **C**. Shots, corners and possession are counters, not events. Being replaced by the engine lane. |
| Tactics and familiarity | XI, mastery by philosophy | every minute via `rates` | licence gates formations | `career.tactics`, `mastery` | engine, prediction | prediction bar | yes | **S**. Mastery belongs to the manager, not the squad. Roles are about ±1–3 %. |
| Opposition analysis | opponent XI, scout quality | paid command or delegated | budget | `scouted[key]`, tactics | engine via counter plan | report card | yes | **S**. Costs money, not preparation time. The plan is always true whatever the scout's quality. |
| Squad and contracts | contracts, squad size | commands; season end | 16–32 guards | `contractUntil`, `wage` | season end, Home | contracts list, "ending" message | yes | **S**. No forward squad plan. |
| Promises | — | — | — | — | — | — | — | **M** |
| Morale | results, bonuses, moves | after match, commands | — | `player.morale` | `formOf` (±2 rating) | player sheet | yes | **S**. Real effect (+14 pts/season, 20 vs 100). No trust, leaders or cohesion. |
| Leaders, hierarchy, cohesion | captain only (+0.5 level) | — | — | — | engine | — | — | **M** |
| Recruitment needs | staff `signing` only | delegated duty | — | — | staff policy | staff log | — | **S**. The human player gets no need records. |
| Scouting knowledge | scout quality, watch date | shortlist toggle | — | `watch[id]` | ranges | ranges | yes | **S**. Binary: range, then exact after 2 matchdays. Own league is always exact. |
| Transfers and negotiation | budget, cap, ask, demand, window | bid sheet, AI offers, staff | `judgeBid`, `canSell` | clubs, player, ledger, deals (atomic) | squad, finance, news | toast, deals | yes | **C** but single-round. No agent, clauses or response delay. |
| Loans | window, squad sizes | commands, staff | `canLoanIn` / `canLoanOut` | `loans[]`, player club | season end | loans tab | yes | **S**. `Loan.share` is never read. Return bonus is a flat +≤2, not minutes. |
| AI market | rumour pool, budgets | every fourth matchday, season end | squad min/max | AI rosters | news, market | rumours tab | yes | **S**. AI clubs have no needs and never target unhappy players. |
| Training, fitness, injuries | load, facilities, staff, age | each matchday | — | fitness, prog, rating, injured | engine, selection | training report | yes | **C** (tuned in G2). No accumulated fatigue and no rotation pressure beyond condition. |
| Development | age, load, facilities | user weekly, AI yearly | — | rating, potential | engine, value | +1 badges | yes | **S**. Two different models. |
| Development points (⚡) | wins, trophies | commands | `canUseDev` | rating, potential, fitness, morale | engine | toast | yes | **D**. Buys ratings with a side currency and bypasses training. |
| Academy | facilities, scout, reputation | exam command; every fourth matchday | exams per season | `ops.academy` | squad | academy screen | yes | **S**. Lost on a job move. No intake day, no pathway. |
| Finances | wage cap, gate, TV, sponsors, prizes | matchday economy; commands | budget checks | `club.budget`, ledger | board, offers | finance ledger | yes | **C** (G2). Cash, commitments and spending room are one number. No instalments. |
| Board and objectives | expected points, table, cash | after match; weekly; review | sack lines | `board.confidence`, `sacked` | Home, job market | board card, Today warning | yes | **C** (G2). Objectives are imposed, never discussed. |
| Facilities | cash | command | cost | `ops.facilities` | training, injuries, gate, academy | facility cards | yes | **C**. Instant build, bought by the manager directly. |
| Staff and delegation | quality, duty flags | `staffPrep`, `staffWeek` | same domain functions | via commands | everything delegated | staff log | yes | **C**. Binary Me/Staff. No approval step, no bias. |
| Media and pressers | — | — | — | — | — | — | — | **M** |
| News and inbox | domain changes | emitted inline | dedupe by id | `news`, `inbox` | Home | feeds | yes | **C** read-only. Items are not linked to a cause event. |
| AI managers, job market | reputation, licence | season end, sacking | licence cap | `jobs[]` | career | offers | yes | **S**. AI coaches are names for rankings only. No AI sackings, no vacancies. |
| Manager career | results, trophies, XP, wallet | after match, season end | licence rules | `coach.*` | offers, formations | coach card | yes | **C**. The licence quiz and donations are disconnected mini-systems. |
| Rivalries and derbies | — | — | — | — | — | — | — | **M** |
| Awards and legends | ratings, stats | — | — | records only | history | records screen | yes | **S**. MOTM and records only. |
| Save and integrity | all slices | every `commit` | format, version, SHA-256, invariants | localStorage `gaffer.save.v1` | reload | badSave banner | — | **C**. One slot, localStorage size ceiling, six hash helpers. |
| Commands layer | UI state | UI handlers | inside the domain functions | UI computes the next state and calls `onChange` / `commit` (31 `onChange` call sites in 9 UI files plus `App.tsx`) | — | — | — | **S**. Validation is sound but the command is not a first-class object: no log, no replay. |
| International, women's football | — | — | — | — | — | — | — | **X** |

**Keep:** pure immutable sim functions; seeded RNG; the `checkWorld` / `checkCareer` / `tidyCareer` / `UPGRADES` pattern; staff acting through domain functions; the G2 economy calibration; the full-time "what changed" card; the pick-a-player sheet; the staff room.
**Replace:** development points, the licence quiz, donations to the board, formation locks by licence, binary scouting, the single-round bid sheet, and philosophy mastery owned by the manager.

---

## 2. Loops, connection map, home, navigation, delegation

### 2.1 The loops

| Loop | Clock | The player's question | Decisions | What it feeds |
|---|---|---|---|---|
| **Matchweek** (the atomic tick = one league matchday, plus any midweek cup tick) | `advance()` | "Are we ready for Saturday?" | XI and rotation (fatigue risk), plan A/B, prep focus, 0–3 queue items | match, fatigue, familiarity, morale, board, table |
| **Window** (summer and winter; deadline day as a denser clock) | calendar | "What does the squad lack, and what can I afford?" | needs, scout assignments, bids, agent talks, sales, loans | squad, cohesion (new faces), finances, promises |
| **Season** | pre-season meeting → 3 checkpoints (md ⅓, ⅔, end) → review | "Did we do what we promised the board?" | vision objectives, budget split, facility requests, youth intake, renewals | board, reputation, prizes, awards, history |
| **Career** (multi-season) | season end, sackings, vacancies | "Where is my career going, and what is this club becoming?" | job offers, interviews, staying to build | reputation, hall of fame, legends, rivalries |

### 2.2 Connection map

Each row is a command or clock event. For each we list its immediate state change, where the effect travels and where the player sees it. **Every row is an acceptance test in the headless suite (section 7.6).**

| Cause | Immediate state | Downstream (system → effect) | Where it shows |
|---|---|---|---|
| Change Plan A's shape or style | `plan.shape/style`; team familiarity with the new plan starts low | engine execution modifier; **needs** re-derived from role coverage; training's Tactical focus targets the new plan | Tactics familiarity bar; Recruitment "new need: ball-playing CB"; the next Why card mentions "unfamiliar plan" |
| Sign a player | clubs, player, contract, instalments, agent fee (one atomic transaction) | squad plan depth; **cohesion** −2 (fades over 6 matchdays); his personal familiarity starts at 30; a role **promise** is created; rivals' interest cleared; finance forecast | Squad, finance forecast, Dressing room "new arrival", news item |
| Promise a role | `promise{type, player, due}` | selection advice flags it; checked every matchday after the due point | Promise chip on the player; Today warning 3 matchdays before it breaks |
| Break a promise | trust −20; if the player is a leader, cohesion −4 | transfer-request check; renewal refusal; agent style hardens | Dressing room card, player sheet, story thread |
| Play a player 3 times in a congested week | load +31 per 90 min | injury risk ×(1 + (load−50)/25); condition | Risk badge on the XI; medical advice |
| Training intensity *Heavy* | +40 % development progress; load +4 | fatigue; injury chance | Training report; risk badges |
| Prep focus *Opposition* | uses the week's single focus slot | engine: +bounded boost against the scouted opponent's main threat | Match prep card; "Why": "our prep neutralised their left side" |
| Match result | event log committed (engine) | table; board (expected points); morale ±; cohesion ±; familiarity +; load +; injuries; ratings → value, awards, legend counters; rivalry index; manager reputation | Full-time and Why cards, table, board card, news |
| Promote an academy player | player moves from academy squad to first team; a pathway promise is optional | squad plan; homegrown counter; possible club-objective "youth" progress | Pathway screen, news "debut", thread "Homegrown" |
| Loan out a prospect | loan with a minutes clause | he plays for the borrower (engine picks him on merit); development uses real minutes | Monthly loan report (minutes, average rating, growth) |
| Scout assignment | knowledge gain per matchday for players in scope | range narrows; traits and agent priority revealed at thresholds; recommendations list | Player ranges, "Scout picks for your needs" |
| Agent walks away | talks frozen 5 matchdays; interest −10 | rival clubs can move; the need stays open | Negotiation room, news if a rival signs him |
| Board request approved | budget or facility project | build timer → facility level → effects | Club › Board, facility progress |
| Presser answer naming a player | trust / morale ± by personality | selection mood, renewals | Player sheet, next Why card if morale moved |
| AI manager sacked | vacancy | job market; the new manager's style changes that club's plan | Job market, news, Opposition report |
| Tier One story about your player | a leak event (bounded, never changes the world) | presser question; the player's morale reaction | Press room, inbox |

### 2.3 Home: "What needs me today?"

The layout at 390 px, top to bottom. Everything above the "More" fold fits in one phone screen.

1. **Header strip.** Club crest (generated), position and points, form (W/D/L letters per language), board meter. The meter gets a warning tint below 30.
2. **Next match card.** Opponent, competition, venue, odds from `predict()`, the staff's one-line readiness summary ("2 starters at high injury risk · Plan A 82 % familiar"), and the primary button. The button reads **Continue** when the queue is empty and **Prepare** when there are match-prep items.
3. **Decisions (0–5).** Each item: icon, one-line situation, deadline ("3 days left", "before kick-off"), the staff recommendation in one line and two buttons, **[Accept staff call]** and **[Open]**. More than 5 items → "+n more" opens the full queue. The count shown always equals the list, which fixes GF-06.
4. **Staff did (collapsed line).** "Staff made 4 calls since last match ›" opens the staff log.
5. **More (fold):** headlines (story threads first), table snippet, finances snapshot.

**Queue rules.** An item enters the queue only when a **decision exists**: a promise about to break, an offer, an agent waiting, a player asking to talk, a presser, an injury with a rush-back option, a board meeting, a job offer, a window deadline with open needs, or an expiring contract of a player you'd miss. Status-only facts ("3 sponsor slots empty") are not decisions: the sponsors duty's staff handle them unless you set *Me*. Priority = urgency (deadline) × stakes (player value, board risk) with a fixed order for ties. Each item carries a `cause` event id, so **Open** lands on the exact screen and item (the reference's rule that an inbox card points to the event and the decision).

### 2.4 Navigation map (fewest taps)

Five tabs stay, re-scoped so every screen has one purpose:

| Tab | Screens (depth ≤ 2) | Primary action |
|---|---|---|
| **Home** | Decision queue · Inbox (decisions and reports only) · News · Press room | Continue |
| **Squad** | Squad list (Plan / Contracts / Fitness lenses) · Player profile · Dressing room · Training week · Medical · Academy & pathway | Set XI / rotate |
| **Match** | Match prep (plan A/B, XI, prep focus, opposition report) · Live / key moments · Why card · Fixtures & tables · Cups · Awards | Play |
| **Recruit** | Needs · Scouting (assignments) · Shortlist & scout picks · Market search · Negotiation room · Loans · Deals | Make offer |
| **Club** | Board & vision · Finances (cash / commitments / spending room) · Facilities · Staff room (delegation) · Career (manager, job market) · History & museum · Locker (cosmetics) · Settings & saves | Board request |

Tap targets:

| Flow | Taps |
|---|---|
| Accept a staff call | 1 |
| Kick off from Home | 1 (Continue) or 2 (Prepare → Play) |
| Substitution in a live match | 3, sticky bar |
| Bid from a shortlist | 3 |
| Delegate a department | 3 |
| Reach any player from any list | 1 |

Rules:
- Android back always closes the top sheet first.
- No tab bar before a career exists (GF-18).

### 2.5 Delegation model

**Departments** (13 duties merged into 7 so the choice is meaningful):

| Department | Staff | Covers |
|---|---|---|
| Match prep | Assistant | XI, plan choice, in-match changes on quick results |
| Opposition | Analyst (was the scout's report) | reports, prep focus |
| Fitness & medical | Fitness coach + Doctor | intensity, rotation advice, treatment |
| Development | Head of Youth + coaches | individual plans, academy intake, loans out |
| Recruitment | Director + Chief scout | needs, assignments, shortlists, bids, loans in |
| Contracts & sales | Director | renewals, offers for your players |
| Commercial | Director | sponsors, tickets |

**Levels.**
- **Me:** nothing happens without you. A queue item appears when a decision is due.
- **Ask me:** staff prepare the command and it waits in the queue with their reason. If you ignore it, it expires at the deadline and the default applies. The default is always the *safe* option: no deal, no change.
- **Staff:** staff execute it and log it.

The default for a new career is *Ask me* for Recruitment and Contracts & sales, and *Staff* for the rest.

**How staff are wrong.** Each staff member has `quality` (0–100) and one **bias**:

| Bias | Tendency |
|---|---|
| Cautious | undervalues risk-taking: rotates too early, bids low, loses targets |
| Bold | high intensity, overbids |
| Youth-minded | favours ≤23s |
| Veteran-minded | favours proven players |
| Money-first | sells early |
| Loyalist | renews everyone |

Quality sets the error bar on their estimates, using the same knowledge-fog function as scouting. Bias adds a signed tilt to their choice score. Every logged call names its reason ("Rested Kaine: high injury risk") so the player can learn a staff member's tilt and overrule them or replace them. Staff never get information the player doesn't have.

**Acceptance:**
- A season with all departments on *Staff* and quality-60 neutral staff finishes within ±4 points of an attentive passive manager (G2 measured +3.2).
- Swapping a Cautious director for a Bold one changes deal count and average fee paid in the expected direction over 3 seasons.

---

## 3. Systems

Every system block answers the reference's seven questions, then gives the smallest version that is fun, and says what FM26 does (**O**) that we simplify or leave out.

### 3.1 Squad, contracts and promises

| | |
|---|---|
| **Inputs** | roster, contracts (wage, end, release clause, instalments), age, role coverage of Plan A/B, loans, expected development (projection band) |
| **Trigger** | commands `renew`, `release`, `list`, `promise`, `setRole`; clock: expiry checks at md 5/25 and season end; promise checks every matchday |
| **Validation** | squad 18–32 (`SQUAD_SELL_MIN`/`SQUAD_MAX`); renewal refused when trust < 25 or morale < 25; the contract end moves forward, never back (GF-03 rule `max(end, season+1)+years`); max length 5/2/1 at <30/30+/33+; wage within wage budget |
| **State change** | `Contract{wage, until, role, releaseClause?, bonuses}`; `Promise{id, playerId, type, target, due, status}` |
| **Downstream** | dressing room (trust on kept or broken promises), selection advice, needs (expiries become future gaps), finance commitments, AI market (players with ≤1 year left are cheaper and targeted) |
| **Feedback** | Squad **Plan lens**: a pitch of role slots with depth this season, next season (expiries, loans returning) and in two seasons (projection bands, "may leave"); promise chips; contract lens |
| **Acceptance test** | a Starter promise, then 10 league matches with <50 % starts → promise broken, trust −20, queue warning appeared 3 matchdays earlier; renewal extends the end date; next-season view drops expiring players and adds returning loanees |
| **Smallest fun version** | 4 roles (Star, Starter, Rotation, Prospect) that double as a playing-time promise; 3 other promise types: **Sign a player at position X by the window's end**, **Won't sell you this window**, **New contract by date**. The Plan lens shows gaps as red slots. |
| **FM delta** | FM shows detailed squad planning and many promise types (**O**). We keep 4 roles and 3 extra promises and leave out bonus clauses beyond appearance and goal bonuses: more types make the dressing room unreadable on a phone. |

**Role thresholds** use the share of league matches started while fit, over a rolling 10-match window, measured from 8 matchdays after the promise:

| Role | Share of starts |
|---|---|
| Star | ≥ 70 % |
| Starter | ≥ 50 % |
| Rotation | ≥ 25 % |
| Prospect | ≥ 10 apps in all competitions, or a loan |

### 3.2 Dressing room: morale, trust, hierarchy, leaders, promises

| | |
|---|---|
| **Inputs** | results, minutes vs role, promises, conversations, presser remarks, transfers in and out, captaincy, personality archetype, tenure |
| **Trigger** | every matchday (reducers on match events); commands `talk`, `setCaptain`; clock checks for transfer requests |
| **Validation** | one conversation per player per 4 matchdays; the captain must be in the squad; talks are only available when a trigger exists (a player asks, or something big happened), never spammable |
| **State change** | `player.morale` (0–100, weeks), `player.trust` (0–100, seasons), `player.status` (Leader/Core/Fringe, derived each matchday), `club.cohesion` (0–100), `player.request` (transfer request flag) |
| **Downstream** | engine (morale ±2 as now; cohesion ±2 levels); renewals (trust gate); transfer requests → AI market; agent style on renewal; board (fans react to a leader leaving); story threads |
| **Feedback** | Dressing room screen: the three tiers as a pitch-side "table", leaders' mood faces, cohesion meter with the last 3 causes, open promises. Player sheet: morale and trust arrows with the last cause. |
| **Acceptance test** | break a leader's promise → cohesion −4 and squad morale settle-point −1.5 within one matchday; five matchdays with trust < 25 and morale < 40 → transfer request event; a rival bids ≥ value within 2 windows in ≥ 60 % of seeded runs |
| **Smallest fun version** | as in the numbers below |
| **FM delta** | FM26 models social groups, influence and interactions (**O**, S11). We leave out cliques and pairwise relationships: 3 tiers + leaders give 80 % of the story at 10 % of the reading. Conversations are 1 choice of 3 tones, not dialogue trees. |

**Numbers (judgement, tune in playtests):**
- **Trust.** Starts at 50. Signings start at 60, academy graduates at 65, and a "Former international" background adds +10.
  - Promise kept +8; broken −20.
  - Minutes below role for 5 matchdays −4.
  - Renewed at his ask +5.
  - Named criticism −6; named praise +3.
  - Transfer request refused −15.
- **Morale.** Current rules stay. The settle point becomes `60 + psych + 0.25 × (mean leader morale − 60)`, so leaders pull the room.
- **Hierarchy.** Status score = seasons at club (cap 5) × 8 + squad rating rank points (top 5: 20/16/12/8/4) + (age ≥ 28 ? 10 : 0) + captain 15 + club legend 20. The top 3 (squads < 25) or 4 are **Leaders**; the next 8 are **Core**.
- **Cohesion.** New career 55; a new job inherits the club's value.
  - +1 per matchday the XI keeps ≥ 8 of the previous starters.
  - −2 per first-team arrival, recovered over 6 matchdays.
  - ±1 per win or defeat.
  - A leader's broken promise −4; a leader's transfer request −5.
  - Engine input: `(cohesion − 50) / 25` level points, clamped ±2.
- **Personality archetypes** (one per player, revealed at knowledge ≥ 50):

| Archetype | Responds to |
|---|---|
| Driven | criticism: +5 morale |
| Steady | small swings |
| Volatile | criticism: −8 morale; praise: +6 |
| Loyal | trust changes halved when negative; renews cheaper |
| Mercenary | trust matters less; money matters more in talks |
| Leader | status +10; his mood weighs double in the settle point |

- **Conversations:** three tones, *Reassure*, *Challenge* and *Promise* (opens the promise picker). The outcome is a morale/trust change by archetype, with a one-line reply.

### 3.3 Tactics, familiarity, opposition analysis and the engine contract

| | |
|---|---|
| **Inputs** | squad attributes and roles, Plan A/B, familiarity, opponent report (fogged), fitness and load, cohesion |
| **Trigger** | commands `setPlan`, `setXI`, `setPrepFocus`, `applyAdjustment`; in-match changes at the engine's defined tick |
| **Validation** | eligibility (injured, banned, loan-restricted); ≤ 5 subs; plan knobs within bounds; no licence locks on formations (removed) |
| **State change** | `club.plans[A|B]{shape, style knobs, roles}`, `player.fam[planId]` (0–100), `club.teamFam` (derived: XI mean), `prep{focus, target}` |
| **Downstream** | engine (below); needs (role coverage per plan); training (Tactical focus raises familiarity); AI managers read your *usual* plan for their counter-choice |
| **Feedback** | Tactics: pitch plus a familiarity bar per plan and a "fit" dot per player-role; Match prep: the analyst's 2 threats, 1 weakness, 1–2 suggested adjustments with a bounded predicted effect (±% on the odds from `predict()`); the Why card after the match |
| **Acceptance test** | switching to an unfamiliar plan lowers kick-off win % by the modelled amount and familiarity rises +4 per match; Opposition prep against the right threat lowers the opponent's xG from that channel in N=400 seeded runs; low analyst quality produces wrong threats at the stated rate |
| **Smallest fun version** | Plan A and Plan B (one shape each + 4 style knobs: mentality, pressing, tempo/passing, width) + 2 role choices (full-backs, striker, as now) + set-piece takers. A weekly prep focus: **Recovery / Tactical / Opposition / Set pieces / Development**. A congested week (a cup tick) forces Recovery or nothing. |
| **FM delta** | FM26 has separate in- and out-of-possession structures and many roles (**O**, S3). We use one shape per plan plus knobs. Two plans let you have "a Plan B" without a second tactics editor. No custom set-piece creator. |

**Familiarity numbers:**
- Personal familiarity per plan: +5 per match played in it and +3 per Tactical week.
- It decays −1 per week when unused, down to a floor of 30. New signings start at 30.
- Engine execution input: `(XI mean fam − 70) / 20` level points, which is −2 at 30 and +1.5 at 100.

**Engine contract.** The engine lane owns resolution. These are the fields the rest of the game supplies and consumes.

*MatchSetup, supplied to the engine:*
- `seed`, venue (home, crowd fill %, derby index)
- For each side:
  - the plan (shape, knobs, roles)
  - 11 + bench, each player with `rating`, `attrs[7]`, `condition`, `load`, `morale`, `fam`, `traits`
  - `cohesion`, captain and leaders on the pitch
  - set-piece takers
  - `prep {focus, targetChannel}`
  - staff modifiers (assistant quality for in-match auto changes)
- Opponent AI plan chosen by its manager's style.

*MatchRecord, returned:*
- The event log (the single source of truth) with shots, chances, xG per shot, cards, injuries (with severity and days), subs, goals and set pieces.
- Minutes per player, condition, load delta, ratings, MOTM.
- Key moments (for highlights).
- `why[]`: up to 3 factors `{factor, side, size, suggestion}` drawn from the engine's own decomposition (familiarity, fatigue, prep, mentality mismatch, cohesion, individual error).

*Aftermath reducers read only MatchRecord:* table, board, morale, trust (minutes vs role), cohesion, familiarity, load, injuries, value, awards counters, rivalry, reputation and threads. **No UI computes match consequences.**

### 3.4 Recruitment: needs, knowledge fog, shortlists, negotiation, clauses, loans

| | |
|---|---|
| **Inputs** | needs (derived + manual), scout staff and assignments, knowledge map, budgets (transfer budget, wage room), player interest, seller stance, agent profile, window calendar |
| **Trigger** | commands `addNeed`, `assignScout`, `shortlist`, `bid`, `respondCounter`, `openTalks`, `offerTerms`, `withdraw`, `loanIn/Out`, `recall`; clock: bid responses next matchday (Deadline Day: immediate), knowledge accrual per matchday, AI bids on your players |
| **Validation** | window open (free agents any time); transfer budget ≥ upfront fee + agent fee; wage room ≥ wage; seller squad > min; squad < max; no second open bid on the same player; frozen talks respected; the loan-minutes clause fits the borrower's role |
| **State change** | `need{id, roleSlot, planId, priority, source}`, `assignment{scoutId, scope, until}`, `knowledge[playerId]`, `negotiation{id, stage: club/terms/done/collapsed, bids[], patience, frozenUntil}`, and on completion one atomic `transfer{fee schedule, sellOn, addOns, contract, agentFee}` |
| **Downstream** | squad and promises (role), finance (commitments, instalments per season), cohesion (arrivals), rivals (hijack, rumour), news, Tier One link |
| **Feedback** | Needs board (role slots in red and amber); ranges that narrow week by week; "Scout picks" with a *why he fits* line ("covers RB in Plan A; 21; knowledge 70 %"); negotiation room; deals ledger with future instalments |
| **Acceptance test** | knowledge 10→100 narrows the range monotonically and always contains the truth; a bid at ≥ reservation is accepted next matchday; three sub-60 % bids freeze talks; an agent walk-away blocks re-opening for 5 matchdays; completion changes budget, wage bill, roster, promise and forecast in one event; a need disappears when the slot's depth is met |
| **Smallest fun version** | Needs derived from Plan A's role slots (depth < 2 fit players, or the starter is ≥ 32 or expiring). One scout assignment per scout (league or region + optional need). Two-stage negotiation. Loans with a wage share and a minutes clause. |
| **FM delta** | FM26's recruitment hub, pitches and requirements (**O**, S4) inspired needs and "why he qualifies". We leave out player-swap bids, tribunal fees, compensation, work permits and registration quotas (heavy rules, little fun on a phone). |

**Knowledge fog:**
- **Base knowledge K:** own club 100; own league 45; same country 25; elsewhere 10. Famous players (reputation top 5 %) get +20.
- **Accrual per matchday** in an assignment's scope: `3 + scoutQ/12` (q60 → 8). A shortlisted target inside an assignment: `4 + scoutQ/10`. Playing against him: +15.
- **Decay:** −1 per matchday after 20 matchdays unobserved, down to the base.
- **Range:** half-width `1 + round(9 × (1 − K/100))` rating points. The truth is always inside, with a seeded midpoint offset.
- **Potential band:** rating band + (age ≤ 21: 3; ≤ 23: 2) and never exact before 24.
- **Reveal thresholds:** personality at K 50, injury proneness at 60, agent priority at 70.

**Club stage (fee).**
- **Reservation** `R = value × importance(1.1/1.3/1.5) × contract factor (≤1 yr 0.75; 2 yrs 0.9) × stance (listed 0.85, selling to a rival 1.2) × prices setting × seeded 0.95–1.05`.
- **Visible asking price:** `1.1 × R`.
- **Bid value** `E = upfront + Σ instalments × 0.92^years + sellOn% × value × 0.4 + add-ons × 0.5`.
- **Responses:**
  - accept if `E ≥ R`
  - counter if `E ≥ 0.75 R` (round 1 counters halfway between R and the ask; later rounds counter at R)
  - "not interested" below that
  - below `0.6 R` is insulting: −2 patience
- **Patience:** 3 bids, then a 5-matchday freeze.
- **Hijack pressure:** each matchday a bid is pending, a rival with a matching need bids with 8 % × the player's interest-count.

**Personal terms (live agent talk).**
- **Demand package:** `wageDemand` (as now) × interest (0.9 for a dream move … 1.2 for a step down) × agent style (Fair 1.0, Hardball 1.1, Greedy 1.05 + a higher agent fee); years; role; signing-on fee (3 months' wage); release clause (demanded by *Ambitious* players joining a lower-reputation club: 2 × value); agent fee (5/8/10 % of the transfer fee, or 2/3/4 months' wage on a free).
- **Priority:** each player has one primary priority among Money, Role, Ambition and Security, visible at K ≥ 70 and otherwise shown as "?".
- **Utility:** weights are 0.5 on the primary term and the rest split evenly. The demand package scores 1.0. Exceeding a term scores up to 1.25.
- **Acceptance:** accept at `U ≥ 1 − flex` (Fair 0.08, Hardball 0.03, Greedy 0.05).
- **Patience:** 5/4/4 rounds. The agent's reply is one of *Close*, *Not there*, or *Insulted* (U < 0.75, −2 patience); an offer worse than the previous one costs a further −1.
- **Walk-away:** 5-matchday freeze and the player's interest −10.
- **The game:** trade wage against role (a promise risk), signing-on fee (cash now) and release clause (a future loss). Accepting the demand is always one tap and always works.

**Loans:**
- `share` (the wage share the borrower pays, 0–100 %).
- `minutes clause` (Starter / Rotation), with a recall option at the next window.
- Development uses real minutes (3.5).
- The parent club's trust in you, and the player's trust, fall if a loan-in's clause is broken.

**AI market:** AI clubs derive needs with the same function and bid for your *unlisted* players when a need matches and the player is unhappy or has ≤ 1 year left. They also approach players with a transfer request.

### 3.5 Training, fitness, injuries, development and the academy pathway

| | |
|---|---|
| **Inputs** | intensity (Light/Normal/Heavy), weekly focus, individual plans (≤ 5 players: attribute or new-position focus), coaches' quality, training facility, age, minutes, load, personality |
| **Trigger** | clock per matchday (training week); commands `setIntensity`, `setFocus`, `setIndividualPlan`, `treat{rest/specialist/rushBack}`; Youth Intake Day (fixed tick at ~70 % of the season) |
| **Validation** | Heavy intensity blocked in a congested week (cup tick); rush-back only if the remaining time ≤ 50 % of the original; academy capacity (8 + 2 per academy level) |
| **State change** | `player.condition` (was fitness), `player.load` (new), `prog` → rating, `injury{type, days, reinjuryRisk}`, `academy squad` (world players with `squad: 'academy'` and the club's id) |
| **Downstream** | selection (risk badges), engine (condition, load), development → value, needs and legend path; academy → pathway → promises and club objective (youth) |
| **Feedback** | Training week card (intensity, focus, who improved, who is at risk); Medical board (injured, return window as a range fogged by doctor quality, re-injury risk); Pathway screen (academy → loan → first team with minutes); intake preview ("a promising goalkeeper") 10 matchdays before Intake Day |
| **Acceptance test** | the same 19-year-old grows faster with 900 minutes than with 90, with everything else equal; an AI club's prospect follows the same function; load above 75 triples injury risk; rush-back returns the player 50 % sooner with the stated re-injury chance; academy players stay with the club after a manager's move |
| **Smallest fun version** | one intensity + one focus per week + ≤ 5 individual plans + risk badges + rush-back + intake day + pathway |
| **FM delta** | FM has detailed schedules and many session types (**O**, S7). We keep the trade-offs (learning vs fatigue vs risk) with 3 knobs. Development points (⚡) are retired: a side currency that buys ratings undercuts the training decision. |

**Numbers:**
- **Load:** +0.35 per minute played; −12 per matchday; Heavy +4; Light −4. Injury multiplier `1 + max(0, load − 50) / 25`. Risk badge Low < 50, Elevated 50–75, High > 75. The exact number is shown only with a fitness coach of quality ≥ 60.
- **Growth per matchday** `g = base(age) × gapFactor × quality × minutes × intensity × pro`:
  - base(age): ≤19 2.0 · ≤21 1.6 · ≤23 1.2 · ≤27 0.5 · ≤30 0.1
  - gapFactor = `min(1, (potential − rating) / 6)`
  - quality = `(1 + 0.1 × (facility − 1)) × (1 + coachQ/400)`
  - minutes = `0.6 + 0.4 × min(1, minutes over the last 5 matchdays / 300)`
  - intensity: Light 0.7 · Normal 1.0 · Heavy 1.4
  - pro: Driven 1.15, otherwise 1.0; Volatile 0.9
  - 100 progress = +1 rating
  - decline after 30: −0.3 to −1.2 per 10 matchdays, rising with age
- **Youth intake:** 3–7 players. Potential as in `training.ts` (facilities + reputation + Head of Youth quality). The academy exam and rights-selling go (the G2 cap already made them marginal), replaced by the annual intake and normal sales.
- **Migration:** convert remaining ⚡ to a one-off squad morale +5 and show a message.

### 3.6 Finances, board, objectives and facilities

| | |
|---|---|
| **Inputs** | G2 cash model (gate, TV, sponsors, prize pot), wage bill, instalments, board vision, confidence, results |
| **Trigger** | clock: matchday economy, season checkpoints; commands `boardRequest{facility, budget, wageRoom}`, `acceptVision`, sponsor and ticket commands |
| **Validation** | a request needs confidence ≥ 55 and cash ≥ 1.5 × cost (facility), or a positive forecast (wage room); one request per type per 10 matchdays; transfer budget and wage room are hard limits for bids |
| **State change** | `club.cash`; `budget{transfer, wageRoom}`; `commitments[]` (instalments, signing-on fees); `vision{objectives[3], level}`; `facilityProject{type, level, readyAt}`; `board.confidence` |
| **Downstream** | recruitment limits, staff wages, facility effects (training, injuries, gate, intake), job security, reputation |
| **Feedback** | Finances with three numbers: **Cash**, **Committed** (next 12 months), **Spending room**, plus a 12-month forecast line. The Board screen shows the vision, objective progress with dates, confidence with its last 3 causes, and requests. |
| **Acceptance test** | an instalment deal lowers spending room in each future season by the scheduled amount; an approved facility changes its effect only after `readyAt`; the board's verdict on each objective fires on its stated date with its stated delta; a favourite 3rd at ≥ 2.0 ppm is never sacked in-season (the G2 test is kept) |
| **Smallest fun version** | the **pre-season board meeting**: the board proposes 3 objectives (League, Cup, Club: one of finance / youth / style). You pick *Expected* or *Ambitious*. Ambitious gives +15 % transfer budget and a sack line +5. Expected gives −10 % budget and confidence +5. |
| **FM delta** | FM26 frames decisions with club vision, owner ambition and finances (**O**). We leave out ownership changes, financial fair play and debt structures. The wage cap stands in for spending rules. |

**Numbers:**
- **Budget allocation.** Transfer budget = 35 % of cash at season start (+10 % if Ambitious) + 50 % of in-season net sales − instalments due this season. Wage room = wage cap − bill. Raising the cap is a board request at the current 12-months-per-+1 cost.
- **No automatic wage-cap ratchet.** Fixes the `max(cap, bill × 1.05)` cash-out exploit.
- **Facility build times:** 6/10/16/24 matchdays for levels 2–5, at today's costs.
- **Club objective checks:**
  - finance: cash ≥ −10 % vs start at season end
  - youth: ≥ 900 league minutes for club-trained players ≤ 21
  - style: Plan A familiarity ≥ 70 by md 20 in the vision's style
- **Removed:** donations from the manager's wallet to the board (a confidence tap).

### 3.7 Media: press conferences (short, consequential, few)

| | |
|---|---|
| **Inputs** | fixture importance (derby index ≥ 60, top-3 clash, final, decider in the last 6 rounds), recent events (red card, heavy defeat, transfer request, Tier One leak), rival manager |
| **Trigger** | the clock creates at most **one presser per matchweek**, and only when a trigger exists; command `answer` |
| **Validation** | ≤ 3 questions, 3 tones each (*Confident*, *Measured*, *Deflect*) + "name a player" on relevant questions; skip = the assistant answers *Measured*, with no penalty |
| **State change** | squad morale, named player's trust, fans, board, `publicClaim` (e.g., "we'll win the league"), rivalry index, rival manager's state (rattled / fired up) |
| **Downstream** | engine (the rival's side level ±0.5 from rattled / fired up, seeded 40/60 at a high derby index), board (public claims raise the stakes of the related objective ×1.25), dressing room, story threads |
| **Feedback** | a one-screen presser; each answer shows its consequence line before you confirm ("The squad will like it. If we lose, the board will remember.") |
| **Acceptance test** | "Confident" before a match that is then lost gives exactly the stated extra board and fan losses; naming a Volatile player in criticism drops his morale by 8; a season has ≤ 1 presser per matchweek and ≥ 60 % of matchweeks with none |
| **Smallest fun version** | pre-big-match presser + post-controversy presser; three questions from ~40 templates keyed to events |
| **FM delta** | FM has frequent pressers and interviews. Most players delegate them. We make them rare, so each one matters. |

### 3.8 Competitions, calendar and world AI

| | |
|---|---|
| **Inputs** | league and cup rules, seed data (derbies, stadiums), AI clubs' needs and finances, AI managers |
| **Trigger** | the clock: matchweek ticks, cup ticks, windows, Intake Day, awards night, board meeting, pre-season |
| **Validation** | one fixture → one result (existing); continental places from the previous table; squad eligibility the same in selection and engine |
| **State change** | fixtures, tables, cups (existing), `manager{id, name, rep, style, clubId, confidence}` for every club, `rivalry[pair]`, vacancies |
| **Downstream** | job market, opponent plans (style), rivalries → media, fans and news; AI market needs |
| **Feedback** | tables, fixtures with derby flags, news about managers, job market |
| **Acceptance test** | 12–18 % of clubs change manager per season (3 seeds); a sacked AI manager's replacement brings his style and the club's plan changes; rivalry index rises after a cup final between the pair |
| **Smallest fun version** | AI managers with a style and a simple board (sacked at the checkpoints md ⅓/⅔ when ≥ 6 places below expectation, seeded 50 %; at season end if the objective is missed by ≥ 4 places); rivalries seeded from data plus dynamic growth |
| **FM delta** | International breaks, national teams and women's football are out of scope (**X**). No friendlies beyond 3 optional pre-season ticks that staff can play for you. |

**Rivalry index:** derby base 60, otherwise 0. +8 for meeting in a final or decider; +5 for a direct transfer between the pair; +3 per heated presser. It decays −5 per season towards the base. At ≥ 60, board and fan weights for that fixture are ×1.5.

### 3.9 Manager career: reputation, job market, sackings, offers

| | |
|---|---|
| **Inputs** | results vs expectation, trophies, objectives, background, badges |
| **Trigger** | season end; sackings (yours and AI); interview commands |
| **Validation** | a club considers you if `rep ≥ clubRep − 15` (±5 by vision fit) and your badge covers its reputation cap; ≤ 3 offers at a time |
| **State change** | `coach.rep`, `badges`, `jobs[]`, `contract{years, salary}` |
| **Downstream** | offers, player trust at start (reputation), agent interest (reputation raises interest) |
| **Feedback** | Career screen: reputation tier, badge progress, job security, open vacancies you qualify for |
| **Acceptance test** | a manager meeting objectives at a small top-flight club gets a continental-level offer within 3–4 seasons in ≥ 50 % of seeds; a sacking gives 1–3 offers at lower clubs |
| **Smallest fun version** | 4 backgrounds; interviews of 3 choices about the club's vision; badges from matches managed + course fee |
| **FM delta** | FM26's manager creator (**O**, S13) informs the backgrounds. We drop the licence quiz and formation locks. |

**Numbers:**
- **Backgrounds** (all earned in-game perks; none is sold):

| Background | Effect |
|---|---|
| Former international | rep +15, starting trust +10 |
| Journeyman pro | rep +8, trust +5 |
| Coaching prodigy | familiarity gain ×1.15 |
| Analyst | knowledge accrual ×1.2 |

- **Reputation per season:**
  - objective met +2, missed −3
  - ±0.6 per place against the predicted finish (cap ±5)
  - titles: top flight +5, second tier +3; cup +2; continental +6
  - sacked −5
- **Reputation tiers:** Unknown < 30 · Regional < 50 · National < 70 · Continental < 85 · World-class.
- **Badges** (reputation caps as today, D 62 … PRO 94, ELITE needs a major trophy): C 20 matches, B 60, A 120, PRO 220, plus the current course fees from the wallet.
- **Target pace:** continental-level club by season 3–4, an elite club by 7–10 for a strong career.
- **Migration:** existing licences convert 1:1. XP/level stays as a cosmetic career level on the coach card only.

### 3.10 History, records, awards, hall of fame

| | |
|---|---|
| **Inputs** | MatchRecords, season stats, ratings, trophies, transfers |
| **Trigger** | awards night (season end); legend check at each milestone event; retirement |
| **State change** | `awards[season][league]`, `club.legends[]` (compact player records that survive retirement), `hallOfFame{timeline, bestXI, iconicMatches ≤ 20}`, existing `records` |
| **Downstream** | player value +10 % and trust +3 for award winners; legend status → hierarchy +20; a retired legend can become a staff candidate at his club; news and threads |
| **Feedback** | Awards night screen (1 screen, swipe); Club museum (trophies, legends, records, iconic matches); Hall of fame |
| **Acceptance test** | awards reconcile with the stats (Golden Boot = the most league goals, tie-break assists); a player who reaches 200 apps becomes a legend and stays listed after retirement |
| **Smallest fun version** | per league: Player, Young Player, Golden Boot, Goalkeeper, Manager of the Season, Team of the Season; one global Player of the Year. Legend = 200 apps, or 80 goals, or 100 apps + 2 major trophies. |

### 3.11 Real 2026/27 world: import, fallback, crests and portraits

- **Import.** `data/seed/` (schema in `data/SCHEMA.md` on `lane5/data-service`) goes through an adapter `sim/seed.ts` that produces the same `World` shape. We import **facts only**:
  - player: stable id, names (display, short, Arabic if present), birth date, nationalities, positions, club, shirt, contract end if public, loan parent
  - club: stable id, names, short name, colours, league, city, stadium capacity, derbies
  - league: size and tier

  **Ability, potential and attributes are our own model.** Rating comes from the club's band (league band × club standing), squad role (minutes share if provided) and age, with seeded per-player variation. The studio curates overrides for about 300 notable players ("ability tiers" authored by our designers, not copied from any game or ratings site). Values and wages come from our formulas.
- **Stable IDs.** Data ids are kept verbatim (`pl:…`, `cl:…`), so updates and patches can map onto saves. Generated players (regens, intake) use `gen:<seed>:<n>`.
- **Fallback switch.** Build flag `VITE_WORLD_NAMES = real | fictional` plus a per-career setting. Fictional mode maps every real id deterministically to generated names through the existing `renames.ts` path, applied on load too, so a takedown also cleans existing saves. Old fictional saves stay fictional. There is no conversion.
- **Crests.** Generated from the club's colours: shape, division pattern and a charge from an original icon set, plus a monogram, all chosen by id hash. Stored as parameters, not images. Your own badge comes from the cosmetic designer.
- **Portraits.** Typographic (initials on the kit colour) or an abstract illustrated silhouette with kit and hair-shape variety. **No skin tone or ethnicity inferred from name or nationality.**

### 3.12 What we cut or merge

| Current feature | Decision | Why |
|---|---|---|
| Development points ⚡ | retire | buys ratings outside training; disconnects development |
| Licence quiz | retire | a trivia game unrelated to management |
| Formation locks by licence | retire | tactics should follow the squad, not a badge |
| Donations to the board | retire | a confidence tap |
| Academy exams and selling rights | replace with Intake Day | the exploit history; no pathway decision |
| Opponent report bought with cash | replace with analyst + prep focus | preparation should cost time (reference: "consume schedule capacity") |
| Philosophy mastery owned by the manager | club-owned plan familiarity | the squad learns the system, not the coach |
| 13 binary duties | 7 departments × 3 levels | fewer, more meaningful choices |
| Rewarded ad for a free report | credits only | ads must not touch the competition |

---

## 4. Emergent storylines

**Story threads** (P). A thread is a small projection over events: `{id, kind, actors, stage, startedAt, lastEventId}`. A rule table advances its stage when a matching event arrives. Threads never change the simulation; they only choose what the inbox and news surface. News without a thread or a decision is capped at 3 items per matchweek.

| Story | Mechanism, all state-driven | Stages surfaced |
|---|---|---|
| **Prospect becomes captain** | Intake player → Prospect promise → loan with a minutes clause → development from real minutes → first-team starts → status rises with tenure and rating rank → Leader → `setCaptain` | "Intake: a keeper to watch" → debut → first goal → "back from loan, 9 goals" → 50 apps → armband → legend |
| **Unhappy star joins a rival** | a broken promise or minutes below role → trust < 25 and morale < 40 for 5 matchdays → request → you refuse (trust −15) → AI rival with a need bids → contract runs down → free transfer to the rival → he plays against you (rivalry +5) | request → refusal → rival bid news → "leaves for nothing" → "returns to face his old club" (rating comparison) |
| **Tactical gamble swings the title** | last 6 rounds, gap ≤ 3 points → big-match presser + the analyst offers a **gamble adjustment** (high-variance knobs: all-out plus a trap, win odds ±, draw odds down) → the MatchRecord's Why names it | "Title decider" → gamble offered → result → season history stores "the gamble" as an iconic match |
| **Rivalries and derbies** | rivalry index (3.8) + pressers + direct transfers + finals | derby week card, heated presser, iconic match |
| **Club legends** | legend thresholds (3.10), retirement → staff candidate | milestone news, testimonial line at retirement, "legend returns as coach" |
| **Giant in crisis** (world) | AI club below expectation → AI manager sacked → vacancy → you are a candidate | "sacked" → "shortlist includes you" → interview |

**Inbox rule:** the inbox holds **decisions** and **reports** (loan report, scout picks, board verdict) only. Everything else is news. Each item links to its cause event and screen.

---

## 5. Session design for phones

**Streamlined matchweek (3–5 minutes):**
1. Home shows 0–3 decisions. Accept the staff calls or open one (60–90 s).
2. **Continue**, then choose **Key moments** (60–90 s: chances with xG ≥ 0.15, goals, cards, plus up to 3 one-tap prompts from the assistant at HT, 60' and 75', such as "Switch to Plan B? They're overrunning midfield") or **Result** (5 s).
3. Why card (15 s): score, 3 factors with suggestions, what changed (board, table, morale).
4. Back to Home.

**Deep mode:** the same screens opened fully, with the live 2D match at 1–4×, manual subs, full scouting and talks. Nothing is hidden from streamlined players, only folded.

**"Sim to next decision":** Continue keeps advancing matchweeks (quick results for your matches) until one of these happens. Each is a Settings toggle:
- a queue item with priority ≥ the chosen level (All / Important / Critical)
- a **big match** (derby, final, decider): "stop for big matches"
- a window opening or Deadline Day
- the season end

Each skipped match still produces a MatchRecord, and a "Since you were away" digest lists results, the staff's calls and thread updates on one screen.

**Budgets:**
- Continue for 5 matchweeks: ≤ 1.5 s per matchweek on a mid-range Android phone.
- Home first paint: ≤ 300 ms after load.
- Save: ≤ 400 ms, off the main thread.

---

## 6. Numbers

### 6.1 Economy: G2's calibrated model stays, with these changes

| Line | G2 today | v2 |
|---|---|---|
| Wages | `max(1.5k, value × 0.006)`/month; Gulf ×2 | same |
| Gate | ≤ `0.25 × wageCap`/month at a full base stadium; real capacity from the data where available | same formula; capacity from the seed |
| TV | 0.35 / 0.25 × wc per month | same |
| League prize | pot = Σ league wage caps × 1.0, steepness 1.5 | same |
| National cup | a tenth of the league's top budget | **1.5 × the league's top monthly wc** (G2 open item) |
| Continental | flat 60M / 25M / 5M / 10M | **flat × (club cap / competition's top cap)^0.5** |
| Parachute | none (relegated clubs −36…−43 %) | **4 months of wc in the first season, 2 in the second** |
| Wage cap ratchet | never falls; raised free each summer | **no free raise**; a board request only |
| Agent fee | none | 5/8/10 % of the fee, or 2/3/4 months' wage on frees (a money sink) |
| Signing-on fee | none | default demand 3 months' wage |
| Instalments | none | ≤ 3 seasons, ≥ 40 % upfront, discounted 0.92 per year by the seller |
| Transfer budget | = cash | 35 % of cash (+10 % Ambitious) + 50 % of net sales − instalments due |

**Targets for season 1 with a passive manager** (G2 bands, kept as regression tests):
- giants ±15 %
- mid clubs +5…+15 %
- small clubs −10…+25 %
- nobody bankrupt
- AI treasuries in the top flight +≤5M per season

**v2 check:** a small club with good sales can fund one €2–4M signing a season.

### 6.2 Manager-career progression

| Milestone | Target (strong career) | Weak career |
|---|---|---|
| Badge C / B / A / PRO | 20 / 60 / 120 / 220 matches (≈ 0.5 / 1.5 / 3 / 5.5 seasons) | same (time-based) |
| Reputation, National tier (50) | from 25–35 at a small club: 2–3 seasons | 5+ |
| Continental-level club offer | season 3–4 | rarely |
| Elite club (rep ≥ 90) | season 7–10 with ≥ 2 major trophies | — |
| Sacking risk, favourite finishing top 3 at ≥ 2.0 ppm | 0 % in-season | — |
| Salary | `max(3k, 3 % wc)`/month to the wallet (courses and badges only) | — |

### 6.3 Monetization catalog

All items use the shared **Semba Credits** wallet. The anchor is Tier One's packs: 200 cr $0.99, 600 cr $2.99, 1,500 cr $5.99.

| Item | Price | What it is |
|---|---|---|
| **Semba Pass** (both games) | $3.99/month | no ads in either game, 400 cr/month, one monthly cosmetic kept forever, pass badge. No gameplay. |
| Kit & badge designer | 400 cr, one-off | your club's kits (home, away, third) and badge in-game; presentation layer only |
| Pattern / template packs | 150 cr | extra kit patterns and badge charges |
| Stadium looks | 250 cr each | stand colours, roof, floodlights, mowing patterns (2D/3D presentation only) |
| Office / desk themes | 150 cr each | Home backdrop and "desk" objects |
| Coach card frames | 100 cr | share-card frames |
| Extra save slot | 300 cr each | 2 free slots, up to 8. Slots are never tied to the pass, and a save is never locked. |
| Scenario packs | 500 cr per pack of 3 | e.g. "Save a relegated giant", "Promotion on a shoestring", "After the exodus"; one scenario free |
| Remove ads | $4.99 or 1,000 cr | as in Tier One. The current Supporter pack migrates to Remove ads + its 3 looks. |
| Rewarded ad | +25 cr, max 4/day | offered only after the Why card is dismissed (≤ once per 3 matches), at the season review, after the deadline-day digest; never on Live, prep, talks or pressers |
| Earned credits | +50 cr per completed season (cap 10 seasons per career) | goodwill, same wallet |

**Why none of this touches balance:** purchasable items live in `presentation` or `meta` state that the simulation never reads (enforced by a lint rule and an invariant: `sim/**` cannot import `meta/**`). Scenarios are separate careers flagged `scenario: true`, excluded from any global rankings or future online modes. No loot boxes, no timers, no energy.

---

## 7. Architecture (P, mapped onto the code)

### 7.1 Authoritative state

```
GameState {
  meta: { saveVersion, slot, createdWith (build, dataSnapshotId, names: real|fictional) }
  world:  { leagues, clubs (+ plans, familiarity, cohesion, facilities, managerId, vision), players (+ trust, load, fam, status, traits),
            managers, rivalries, knowledge (sparse, user only), clubOps: Record<clubId, ClubOps>  // any club the user has run }
  career: { managerId, clubId, season, round, phase, coach, badges, board, budget, commitments, promises, needs, assignments,
            negotiations, delegation{dept: me|ask|staff}, staffLog, threads, awards, hallOfFame, records }
  clock:  { season, round, phase: preseason|matchweek|window|deadline|seasonEnd, tickSeq }
  rng:    { seed }            // all randomness = rngFor(seed, stream, ...keys)
  events: DomainEvent[]       // current season, bounded; older seasons compacted into history/threads
}
```

Club-owned fields move from `career.ops` / `career.mastery` to `world.clubs` / `world.clubOps`. This fixes `moveTo`.

### 7.2 Commands

`dispatch(state, cmd) → { ok: true, state, events } | { ok: false, reason }`. The function is pure and validates internally. The existing validated functions become command handlers:

| Existing function | Command |
|---|---|
| `buy` | `transfer.complete` |
| `renew` | `contract.renew` |
| `loanIn` | `loan.in` |
| `hireStaff` | `staff.hire` |
| `signSponsor` | `sponsor.sign` |
| `upgradeFacility` | `board.request` |
| `treat` | `medical.treat` |

The UI's ~31 `onChange` call sites (9 files) and `App.tsx`'s `commit` calls become `dispatch`. Staff policies (`staffPrep` / `staffWeek`) emit commands, not state. The *Ask me* queue stores pending commands.

### 7.3 Domain events

`{ id: "s2026.r14.n37", t: {season, round, phase}, type, refs: {players, clubs}, cause?: eventId|cmdId, data }`.
- IDs come from `clock.tickSeq` (deterministic and idempotent).
- `Msg`, `NewsItem`, threads and records store `ev` references.
- Reducers subscribe by type in a fixed order: morale, trust, cohesion, board, records, threads, then projections.

### 7.4 The clock

`advance(state)` replaces `playDay`'s inline sequence (`season.ts:234-334`) with named phases in a fixed order:
1. staff prep (commands)
2. cup tick
3. league tick (engine, FAST path for AI matches)
4. match reducers
5. weekly jobs: training, medical, development (all players), knowledge, economy (user and AI), AI market and managers, negotiation timers, promise checks, board mood
6. calendar events: windows, Intake Day, awards
7. `sackCheck`

`endSeason` becomes the season-end phase with the same sub-steps.

### 7.5 Derived views, seeds, saves

- **Projections, never stored:** table, squad plan, needs, finance forecast, decision queue, knowledge ranges, odds. These are memoised selectors. `strengthOf` stays single (G2 unified most of it; `strengthOfClub` in `transfers.ts` is still to be folded in).
- **Seeds:** one `rngFor(seed, stream, ...keys)` built on one hash. It retires the six ad-hoc `hash()` helpers. New-career seeds stay `Math.random()` (the only allowed use, in `App.tsx:89`).
- **Saves:**
  - IndexedDB database `semba-gaffer`, store `slots`, each record `{meta, packedState}`. localStorage `gaffer.save.v1` migrates once into slot 1 and is kept read-only for one release.
  - The Android shell backup stays.
  - The checksum (SHA-256) is kept.
  - `SAVE_VERSION` bumps once per increment, each with an `UPGRADES[n]` step and documented defaults (section 8).
- **Size:** event log bounded to ~3k events a season. Full event logs are kept for the last 5 user matches plus iconic matches. Target ≤ 1.5 MB packed with a ~12k-player world.

### 7.6 Invariants and tests

- **`checkWorld` + `checkCareer`, plus:**
  - one contract per player and club
  - the player's club = the contract's club
  - an active loan ⇔ the player is at the borrower
  - promise, need, negotiation and thread refs exist
  - Σ instalments = agreed fee
  - spending room is not negative after a transfer
  - academy players belong to a club
  - event ids are unique and increasing
  - every fixture has one result
  - no suspended or injured player in a MatchRecord XI
- **Headless suite** (`npm run sim:check`, in CI):
  - every row of the connection map (2.2)
  - G2 regression bands
  - determinism: same seed + same commands → same state hash over 2 seasons
  - an old-save corpus (v1, v2, each new version) loads and passes the invariants

---

## 8. Build plan

The order is the owner's: **integrity → connected core → depth and feedback → cosmetic breadth**. Sizes are engineer-days for one experienced dev, including tests.

| # | Increment | Scope | Depends on | Save migration | Acceptance | Size |
|---|---|---|---|---|---|---|
| **V2.0** | **Foundation** | `dispatch` + commands wrapping the existing functions; domain events + `ev` refs on Msg/News; `advance()` phases; `rngFor`; IndexedDB slots (2 free); move club-owned state to `world.clubs` / `clubOps`; invariant additions; `sim:check` in CI | — | v3: move `ops`/`mastery` under the club; create event log `[]`; slot 1 from localStorage | old-save corpus loads; determinism hash; 0 UI call sites mutate state; job move keeps the academy | 9 |
| **V2.1** | **Real world** | `sim/seed.ts` adapter; ability model + override table; names switch; crest and portrait generators; AI managers as entities (names from data or fictional) | V2.0, data-service schema | none for old saves (they stay fictional); new careers v3 + `createdWith` | the world passes `checkWorld`; switch to fictional renames everything in the build and on load; no crest or photo assets from third parties | 8 |
| **V2.2** | **Engine contract** | MatchSetup / MatchRecord adapters; aftermath reducers read MatchRecord only; Why card; Key-moments mode; Plan A/B; familiarity (club-owned); prep focus; cohesion input | V2.0, gf-engine | v4: `plans`, `fam` seeded from mastery (mastery ×0.8 → Plan A familiarity) | stats and ratings reconcile with events 100 %; tactic and prep effects bounded and measurable (N=400) | 6 |
| **V2.3** | **Home & delegation** | decision queue with causes; *Ask me* pending commands; 7 departments × 3 levels; staff bias; sim-to-next-decision + digest; nav re-scope | V2.0 (V2.2 for match items) | v5: map 13 duties → departments (any duty on → *Staff*) | queue count = list; staff-parity test ±4 pts; Continue 5 weeks ≤ 7.5 s | 6 |
| **V2.4** | **Dressing room** | trust, status, leaders, cohesion, promises (4 roles + 3 types), conversations, transfer requests; contracts with role, release clause; renewal fix kept | V2.0, V2.2 | v6: trust 50 (60 if signed this season), roles from current squad rank, cohesion 55 | promise-break chain test; request → rival-bid test; bounded engine effect ±2 | 8 |
| **V2.5** | **Recruitment** | needs; knowledge map and assignments; club stage with timing and hijack; agent talks; clauses and instalments; commitments; loans with share and minutes; AI needs and bids on unhappy players | V2.3, V2.4 | v7: knowledge from the current shortlist watch (≥ 2 md → K 80); existing loans get share 1 | fog monotone and honest; negotiation state machine tests; atomic completion; no deal bypasses spending room | 10 |
| **V2.6** | **Training & pathway** | intensity / focus / individual plans; load and risk; injuries with rush-back; unified development for all players; Intake Day; academy as a world squad; loan minutes → development; retire ⚡ | V2.2 | v8: ⚡ → one-off morale; `ops.academy` → world players `squad:'academy'` | same-age growth by minutes; AI prospects grow by the same function; load → risk curve | 8 |
| **V2.7** | **Club vision** | pre-season board meeting; budget split; board requests; facility build time; parachute; cup prize scaling; no wage ratchet; retire donations | V2.0, V2.5 (commitments) | v9: vision = current objective at *Expected* | G2 bands hold; objective verdicts on dates; instalments hit spending room | 5 |
| **V2.8** | **World & career** | AI manager board and sackings, vacancies, interviews, backgrounds, badges (quiz removed, formation locks removed), rivalries, awards night, legends, hall of fame, story threads | V2.1, V2.4 | v10: licences → badges 1:1; legends backfilled from `records` where possible | 12–18 % manager turnover; reputation pace targets; awards reconcile | 8 |
| **V2.9** | **Media & Tier One link** | presser generator (≤ 1 per week), consequences, rival mind games; Semba Link outbox and inbox (web same-origin localStorage `semba.link.v1`; Android via the Semba account later) | V2.4, V2.8 | v11: none (new optional fields) | presser frequency and effects tests; leaks never mutate the world; opt-out works | 5 |
| **V2.10** | **Cosmetic breadth & store** | Semba Credits wallet (shared), pass, kit & badge designer, stadium looks, office, frames, slots 3–8, scenarios, rewarded ads at breaks | server purchase verification; V2.0 slots | none (meta only) | sim never imports meta (lint); ad placement tests; verified purchase before grant | 10 |

**Total about 83 engineer-days.** V2.0–V2.3 (29 days) is the first playable "connected core" milestone and should ship on its own.

### 8.1 Tier One contract (V2.9)

- **Gaffer → Tier One:** `{v:1, id, game:'gaffer', season, round, stage: interest|bid|agreed|done|collapsed, playerRef, fromClubRef, toClubRef, feeBand, userClub:boolean}`.
  - Emitted from transfer events. At most 20 per season.
  - Refs are data-snapshot ids. Fictional-mode worlds do not emit.
  - Tier One uses them only as **Career** rumour seeds, never in the Daily (fairness).
- **Tier One → Gaffer:** `{v:1, id, game:'tierone', storyId, playerRef, clubRefs, claim: moving|staying|bid, strength, correctAtTime:boolean}`.
  - The Gaffer shows it only if the refs exist in its world and the claim is not contradicted by canonical state.
  - Effects: a presser question (bounded) and a morale line for the named player (±3). It **never** changes the world.
  - Opt-out in Settings.

### 8.2 Screen list for the UI team

| Screen | Purpose | Data shown | Primary action |
|---|---|---|---|
| Home | what needs me | next match + readiness, decisions (≤5) with staff calls, staff-did line, folded headlines | Continue / Accept |
| Digest | catch up after a multi-week sim | results, staff calls, thread changes | Back to Home |
| Inbox | decisions and reports | items with cause links | Open |
| News | the world's stories | thread-first feed | Read / share |
| Press room | presser | ≤3 questions, tones with consequence lines | Answer |
| Squad | who we have | list with Plan / Contracts / Fitness lenses | Open player |
| Player profile | one player | ranges or exact, morale / trust arrows, promise chips, contract, risk, development trend | Talk / Renew / List |
| Dressing room | the room's mood | tiers, leaders, cohesion + causes, open promises | Talk / Set captain |
| Training week | this week's plan | intensity, focus, individual plans, report | Set |
| Medical | injuries and risk | injured with return window, risk badges | Treat / Rush back |
| Academy & pathway | youth to first team | academy, loans (minutes), intake preview | Promote / Loan |
| Match prep | Saturday | Plan A/B, XI with risk, analyst threats and adjustments, prep focus, odds | Play |
| Tactics | edit a plan | pitch, knobs, roles, familiarity | Save plan |
| Live / Key moments | the match | 2D pitch or moments, score bug, assistant prompts, sticky sub bar | Change / Continue |
| Why card | what happened and why | score, 3 factors + suggestions, what changed | Done |
| Fixtures & tables | competitions | tables, cups, fixtures, derby flags | Open match |
| Awards night | season honours | winners by league, your players highlighted | Next |
| Needs | what we lack | role slots red/amber, source | Assign scout |
| Scouting | coverage | assignments, knowledge progress | Assign |
| Shortlist & scout picks | candidates | ranges, "why he fits", interest | Make offer |
| Market search | find anyone | filters, ranges | Shortlist |
| Negotiation room | bids and agent talks | stage, asking price, patience meter, priority, clause sliders, cost summary | Offer |
| Loans / Deals | movements | loans with clauses, deals and instalments | Recall |
| Board & vision | the job's terms | objectives with dates, confidence + causes, requests | Request |
| Finances | money | cash, committed, spending room, forecast, ledger | — |
| Facilities | build | levels, projects, effects | Request upgrade |
| Staff room | delegation | 7 departments × 3 levels, staff quality and bias, log | Set level / Hire |
| Career & job market | my career | reputation, badges, vacancies, offers, security | Interview |
| History & museum | continuity | trophies, legends, records, iconic matches, hall of fame | Open |
| Locker (store) | cosmetics and slots | owned and available, prices in credits, pass | Buy / Equip |
| Settings & saves | preferences | slots, sim-to-decision toggles, names mode, link opt-out, language | Save / Load |

---

## 9. Decisions for the studio lead

1. **Real names and ratings.** Using real 2026/27 player and club names needs the rights review the reference flags. I recommend shipping real names behind the fallback switch (3.11), with **in-house ability ratings** (our model plus designer-authored tiers for about 300 players), and never importing third-party ratings or valuations.
2. **Retirements.** Development points, the licence quiz, donations and formation locks all go (3.12). Players who liked ⚡ lose a familiar lever. I recommend retiring them anyway: each bypasses a connected system.
3. **Rewarded-ad reward.** Change it from "free opponent report" to credits only, so no ad ever touches the competition.
4. **Shared wallet on Android.** Web shares credits same-origin today. Android needs a Semba account/server for the wallet and the Tier One link. The pass needs it too, so it is a server dependency for V2.9–V2.10.
5. **Semba Pass price.** $3.99/month for both games, 400 credits included. I recommend confirming it with Tier One's owner before the store build.

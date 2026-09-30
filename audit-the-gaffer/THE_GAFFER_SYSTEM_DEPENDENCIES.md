# The Gaffer: system dependencies (traced)

Paths are relative to `games/the-gaffer/web/src/`. The **Evidence** column shows how each link was checked:
**UI** = seen in the browser, **code** = read in source, **sim** = measured in a headless simulation. `✓` means the
chain works as intended; `⚠` means it works but is distorted; `✗` means broken or missing.

The clock (`sim/clock.ts advance`) runs every matchday in this order: staff prep → cup ties + league matchday
(`season.ts playDay/playRound`) → dressing room (`room.ts roomDay`) → recruitment (`recruit/tick.ts`) → the user's
MatchRecord + aftermath → pulse → calendar → event log. The season end is `season.ts endSeason`.

| # | Producer (action or event) | State written | Consumer | Timing | Player-facing feedback | Evidence | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Training intensity / focus / individual plans (`commands.ts training.set`, `youth.ts developDay`) | `p.prog`, `p.rating`, `p.attrs`, `p.load`, `p.alt` | engine actors read `attrs` (`engine/model.ts actorsOf`); `load` → injury risk (`match.ts riskMult`) | growth per matchday; load per matchday | Training week screen (growth ×1.4, load), weekly report, player "Development" curve | UI `E-E01-training.png`; code; `simtest-youth.txt` (19-year-old growth 900 min vs 90 min ×1.39) | ✓ |
| 2 | Match minutes (`season.ts applyMatch → addMinutes`) | `p.m5`, `p.ms`, `p.load`, `p.fitness` | development (`youth.ts growth`), fatigue in the next match (`match.ts inputsOf fit`), injury risk | same matchday; fitness +12/matchday recovery | "Fit for Sat" %, Load list, "who can take another ninety" | UI `A-A34` (66 %/68 % fit), code | ✓ |
| 3 | Tactics + role fit (`tactics.set`, Changes sheet) | `c.tactics`, in-match `side.tactics` | `engine/model.ts` zones, contests, `fitPenalty` for out-of-position players | immediately (next minute in a match) | Forecast % updates live (83→85→78→80→90 %), "what the engine sees" zone map | UI `A-A10-*`; code; `simtest-tactics.txt` | ✓ (see GF-012 on dominance) |
| 4 | Philosophy played repeatedly (`season.ts practise`) | `c.mastery[ph]` (+2/game, +tactical focus) | `match.ts inputsOf cohesion` (±0.08 logit) | after each user match | Room/cohesion text, forecast | code | ✓ small effect |
| 5 | Pressing / tempo / roles | per-minute fatigue (`match.ts:521-529`, `phases.ts slotLoad`) | `m.fit` → actor physical attrs; injury chance | in-match per minute | fitness % in the Changes sheet, HT tired-player suggestion | code; UI `A-A15` | ✓ |
| 6 | Load + rush-back (`youth.ts`, `medical.treat`) | `p.load`, `p.rr` | injury chance multiplier (up to ×3) | per match | Medical "On the edge", staff "Rested X: ~13 % injury risk" | UI `A-A33-digest.png`, `E-E03`; code | ✓ |
| 7 | Injury event (engine) | `p.injured`, `p.inj0` (shortened by doctor + medical centre, `season.ts careOf`) | availability (`tactics.available`), auto-XI | next matchday on | FT "Achraf Dari is out for 3 weeks" → Today "Out 3 wks" → "Out 1 wk" | UI `A-A17`, `A-A18`, `A-A25` | ✓ |
| 8 | Result (`applyMatch`) | `p.morale` ±6 / (±2 − 1), drift ±1/matchday towards 60 (AI) or towards `moraleTarget` (user) | engine `(morale − 60)/20` on every attribute | next match | Dressing room pulse, player "Morale" | code; sim `ai-morale-r30-seed7.txt` | ⚠ **GF-003**: AI squads hit the floor (5–10) and the effect compounds |
| 9 | Promises, talks, roles, same-XI, arrivals (`room.ts`) | `p.trust`, `club.cohesion`, pledges, requests | `cohLevel(cohesion)` → user side's `mods.level` (±2) | per matchday | Room screen "What moved it", FT "Cohesion 56+1" | UI `E-E02-room.png`, `A-A17`; code | ⚠ user-only (**GF-002**); AI clubs have no cohesion in AI-vs-AI games |
| 10 | Assistant quality (`staff.hire`) | `ops.staff.assistant.quality` | `match.ts:140` `mods.level += quality/100` (user side only) | every user match | not explained anywhere in the UI | code; sim A/B | ✗ user-only edge (**GF-002**) |
| 11 | Performance + age + potential (`endSeason`) | `p.marketValue` (`valueOf`), `p.wage = max(old, wageOf)` | transfer asking prices, AI bids (`makeOffers`, `recruit/ai.ts`), wage bill | season end only | Player value, bid sizes | code | ⚠ value only re-priced yearly; wage ratchet (**GF-015**) |
| 12 | Transfer bid → agent talks → signing (`recruit/deals.ts`) | club budget, `commits`, player club, wage | spending room, wage room, ledger, squad, room (`joinRoom`: cohesion −2, promise) | fee answer next matchday; completion on terms | Talks timeline, "Room left", ledger "Players bought −€6.9M" | UI `A-A22…A-A29` | ✓ money reconciles; ⚠ agreed fees not reserved (**GF-013**) |
| 13 | Incoming bids / staff sales | budget +fee, squad −1 | squad depth, wage bill | when accepted | decision cards "Accept / Ask for more / Turn it down" | UI `A-A25`; sim `long-*.json` | ⚠ staff defaults strip squads (**GF-005**) |
| 14 | Weekly economy (`economy.ts economyWeek`) | budget, `ops.ledger` (gate, TV, sponsors, wages, staff, upkeep) | spending room, board (budget < 0 → −2/week), season review "In the black" | every matchday | Money screen, runway, ledger | UI `A-A29-money.png`; sim ledgers | ✓ reconciles; ⚠ large surpluses and no sink (**GF-005**); runway labels (**GF-010**) |
| 15 | User result vs kickoff odds (`coach.ts afterMatch`) | `board.confidence` (surprise ×1.8), `board.fans` (surprise ×4) | sacking (`sackCheck` < 12 by default), job offers, pulse | each user match | FT "Board 62−4 'That can't happen again.'", Club pulse | UI `A-A24`; sim `calib.jsonl`, `eng-man-city.json` | ⚠ **GF-004**: odds miscalibrated, favourites structurally punished |
| 16 | Table vs objective (`season.ts tableMood`) | board ±≤1/week | same as 15 | weekly from matchday 5 | "1st now. They want …" | UI; code | ⚠ no partial credit near the objective (GF-004); text grammar (GF-008) |
| 17 | Season end (`coach.ts coachSeasonEnd`) | board ±(met/short, cup, youth, black), fans ±10, reputation, trophies, milestones (cash) | sacking, job offers, next season's board | season end | Season review sheet "Finished 1st … Job done", "Staying put" | UI `A-A35-season-review.png`; sim | ✓ |
| 18 | Season end world update (`endSeason`) | promotion/relegation, prize money, reputation drift, ageing, retirements, contract expiry, academy fill, wage caps = bill × 1.05, new fixtures + cups | next season everywhere | season end | Review, news | UI season 2026/27 → 2027/28 done; sim 5 seasons, `checkWorld` 0 issues | ✓; ⚠ world player count shrinks ~5 % over 3 seasons (8262 → 7838), squads stay ≥ 16 |
| 19 | News / rumours (`news.ts`) | `c.news`, `c.rumours` | rumours can complete on deadline day (world transfers) | per matchday | Headlines, "Napoli want Patrik Schick … Chances: 49 %" | UI `A-A18` | ✓ information; low agency |
| 20 | Staff delegation (`delegation.ts`, `staffPrep`, `staffWeek`) | the same commands the user uses, logged with reason and bias | everything above | per matchday | "Staff made 7 calls", staff log with bias ("Loyalist", "Cautious") | UI `A-A19-stafflog.png`, `A-A33` | ✓ transparent; ⚠ advice can contradict itself (GF-016) |
| 21 | Scouting assignments / knowledge (`recruit/knowledge.ts`) | knowledge % per player | ability range shown, bid confidence | grows per matchday | "Scouts 4 % sure", "58–70" ranges | UI `A-A21-target.png` | ✓ |
| 22 | Pre-match talk (`talk.set`) | `c.talk` | `engine/model.ts:293` small bonus per side | that match | the three talk options with effect lines | UI `A-A11-prematch.png`; code | ✓ bounded |
| 23 | Opposition prep week + report | `c.prep`, `c.scouted[key]` | `PREP_EDGE` +0.5 levels | that match | "Set the press to trap them … The report says it hurts them." | UI; code | ✓ |

## Decorative-only or weakly connected systems
- **Fans (`board.fans`)**: they affect attendance (`economy.ts attendance`: × (0.75 + fans/400)) and messages, so they
  aren't decorative, but their value moves mostly with odds surprise and ends up disconnected from success (GF-004).
- **Coach XP, licences, milestones**: the milestone cash is flat (€25K–€1M) whatever the club's size. It's a large
  windfall for small clubs and noise for giants. That's a design note, not a finding.
- **Rumours between AI clubs**: informational only (no player agency). Acceptable for the design.

## Duplicated or stale state
- Spending room excludes agreed-but-unsigned fees (GF-013): a stale derived value in the header.
- Depth chart "cover" is derived per slot with reuse (GF-009): the derived state overstates reality.
- The runway uses 4-matchday "months" while ledger labels say months (GF-010).
- Morale is reset to 65 for every player at season end (`season.ts:560`), which wipes an earned mood. An intentional
  simplification; noted, not filed.

## Broken or distorted causal chains (summary)
1. **User-only modifiers** (assistant quality, cohesion, and room-driven morale) → systematic overperformance (GF-002).
2. **Morale feedback without enough mean reversion** → AI death spiral → polarised tables (GF-003), which in turn
   inflates user results and distorts board expectations.
3. **Board/fans ← miscalibrated kickoff odds and all-or-nothing table mood** → favourites punished, success not
   recognised by fans (GF-004).
4. **Recommended sales without matching recruitment** → shrinking squads and idle cash (GF-005).

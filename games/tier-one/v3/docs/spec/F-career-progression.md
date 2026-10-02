# F · Career progression (Tier One 3.8)

Living spec, part F (brief §53). Covers brief §11–§15 and Addendum A's Career placement. Code: `lib/career.ts` (stages, rules, relations, the window report), `lib/storyMode.ts` (the Career log), `screens/Story.tsx`, `styles/story.css`, `i18n/parts/story.ts` + `career38.ts`. Simulator: `sim/career38.mjs` (runs beside the math lane's `sim3.mjs`: `node career38.mjs 120 code`).

## 1. Decisions

| Feature (3.7) | Decision | Why |
|---|---|---|
| The opening: fired after a catastrophic Deadline Day call, 38,200 followers gone | **KEEP, shorter** | §11 says keep the beginning. It is now four lines on the cover, one skippable film, one title card. No "Nothing personal" text, no unknown number: Mags Doyle sends "Clear your desk." |
| Case file, four planted-evidence reveals, Vince's play, finale, epilogue, "who burned you" | **REMOVE** | §11: Tier One is a journalism fantasy, not a detective adventure. The reveal/finale/epilogue films are unregistered (`film/story/build.tsx`); `vinceOf()` is a null stub until core deletes its two call sites. Old inbox entries with retired keys are hidden by `beatKnown()`, never deleted. |
| Chapters 1–5 (8 / 20 / 36 / 56 windows) | **REWORK → five stages, 20 windows** | §13. Same five indexes in the save (`story.chapterSeen`), new ids and names (The Blog → Local Desk → Nationals → The Press Box → Tier One), gates in §2. |
| Characters (Mags, Hana, the desk, Rosa, Tony, Dougie, Sal, Dr Inès, the three rivals) | **KEEP, as reactors** | §12: they speak only about what you did (§4). |
| Story messages ("the inbox") | **REWORK → the Career log** | Same storage (`story.inbox`), new trigger set generated from play, 0–3 lines a window, most important first, with a face (Addendum A). |
| Editor's desk screen (`screens/Editor.tsx`, route `editor`) | **REMOVE / MERGE** | Its content (record, sources, clubs, saves) is four sheets off the stage screen. One screen per state, no scroll (`.fit`). |
| Club relations −5…+5 | **KEEP, make readable** | §14. Words everywhere (§5); chips on the stage screen; a Clubs sheet with the one-line consequence. |
| Contacts Book levels 1–5 | **KEEP the XP, change the words** | §15. Cold · Familiar · Trusted · Inner Circle · Direct Line (`trustWord()` in `lib/byline.ts`), effects only in Career and Practice. The never-applied "first ask costs 1 less" perk is gone (§35). |
| Vince's play (a fed source) | **REPLACE → the agent's leak** | §11 "intentional agent leaks", §12 "an agent sends you an exclusive because your credibility is high". From the Nationals, a Trusted Rosa with your reputation ≥ 65 rings you first on one saga a window: her read is free. Scoring untouched. |
| Favours (Burner, Tip-off, Stakeout) | **KEEP, quieter** | Still earned by exclusives, Tier 1 windows and landed Market calls; the tray lives in the Player File (core lane). Count shown in the More sheet only. |
| Three career slots + transfer codes | **KEEP** | Unchanged (`lib/slots.ts`), in the More sheet. |
| "Start again at a rival paper" | **REWORK → Prestige** | §13 prestige: once established (3 windows at Tier One), hand the chair back and climb again from the Blog with a harder newsroom (rivals post +5%/prestige, right +5%/prestige, cap 3). Name, followers, reputation, contacts, trophies stay. |
| Endless Career | **NEW** | After establishment, windows keep coming at Tier One rules with reach ×2. |

## 2. Stages and gates

| # | Stage | Sagas | Calls/day | Sources | Rivals | Pool | Deadline Day | Reach (§21) | Gate (cumulative windows AND reputation) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | The Blog | 3 | 3 | kit man, barber, agent | @BackPageBants | small clubs, ≤ 2★ | 60 s | ×0.5 | — |
| 2 | Local Desk | 4 | 4 | + airport spotter | + @ITK_Kev | small, ≤ 2★ | 60 s | ×0.75 | 3 windows, rep 55 |
| 3 | The Nationals | 5 | 4 | + physio | + @PressBoxPete | top clubs | 60 s | ×1 | 7, rep 60 |
| 4 | The Press Box | 5 | 4 | all five; press office at club +3; Direct Line second opinions | all three | top clubs | 60 s | ×1.5 | 12, rep 65 |
| 5 | Tier One | 6 | 5 | all five | all three | star players | 45 s | ×2 | 17, rep 70 |
| — | Established | 6 | 5 | | | | 45 s | ×2 | 3 windows at Tier One (window 20) → endless + prestige |

Club relations change boards from stage 3 (`RELATIONS_FROM = 2`); the agent's leak from stage 3 (`LEAK_FROM = 2`, Trusted, rep ≥ 65); second opinions from stage 4 at Direct Line.

Why these gates (sim, 120 careers per archetype, the math lane's archetypes on the live engine, `gates code`):

| Player | Local Desk | Nationals | Press Box | Tier One | Established | Stuck below Tier One | Rep at the end |
|---|---|---|---|---|---|---|---|
| tally (card reader) | w4 | w7 | w12 | **w17** | **w20** | 0% | 79 |
| Bayes (expert) | w3 | w7 | w12 | w17 | w20 | 0% | 83 |
| cautious (never Confirmed) | w6 | w9 | w12 | w17 | w20 | 0% | 76 |
| late-conservative (waits for the physio) | w10+ | — | — | — | — | 78% | 47 |
| echo-chamber (counts the street thrice) | w10 | w32 | — | — | — | 98% | 54 |

The windows gate is the pacing (a stage change every 3–5 windows, §13 "meaningful change every few windows"); the reputation gate is the skill check. The two bad habits the game teaches against stall on reputation (they Spike 12–22 windows per career), the three sound styles all finish in 20. The math lane's stricter proposal (62 / 70 / 78) held the cautious player to window 24–27 for no gain in the lesson, so the coded gates are 55 / 60 / 65 / 70: every gate sits below the byline word of the same index (Stringer 55, Correspondent 65, Chief 75, Tier One 85), so the Press Card never says less than the stage.

## 3. Rules a stage applies (`careerRules`)

- Trust (Contacts Book level, every mode): each level above Cold removes 12% of a source's remaining mistakes (Direct Line = 48% fewer); the barber gains +5% per level. Trusted (3): spotter opens day 2, physio day 4. Direct Line (5), from the Press Box: one free second opinion per window (`AGAIN`).
- Club at +3 on a saga's clubs: the press office source (`RULES.LEAK`, 2 points, 85%). Club at −3: the kit man on that saga becomes street gossip (45%, repeats the spin).
- Prestige p (≤ 3): rivals post with probability +5p points and are right +5p points.
- Everything else is the Daily engine unchanged, so a Career score and a Daily score are the same currency. Career is local and never ranked.

## 4. Personal stories (§12): the Career log

Generated by `storyBeats()` after `applyWindow()`, at most three lines a window, in this priority. One-time lines are remembered in `story.beats`.

| Event | Who speaks | Trigger |
|---|---|---|
| A publication offers you a role | Hana (Local Desk), the sports desk (Nationals), @PressBoxPete (Press Box), Mags (Tier One) | promotion this window |
| Established | Mags | third window at Tier One |
| A catastrophic miss | Mags, then @BackPageBants clips it | a wrong Confirmed on a 3★ player, or two wrong Confirmeds in one window |
| A player publicly confirms you were first | the player (portrait by id) | every exclusive; the first one from Mags |
| The agent's leak | Rosa | used it / wasted it |
| Trusted the Barber and got burned | Sal; Mags the third time | your wrong call matched his wrong read |
| A club freezes you out / starts returning calls | the club's press office (crest) | relation crosses −3 / +3 |
| A contact now trusts you | the contact | Trusted (3) and Direct Line (5) reached |
| You beat a rival repeatedly / they beat you | the rival | ledger streak reaches ±3 |
| Beaten to a story you had right | the rival who had it | `why === 'beaten'` |
| Known for something | Mags | playstyle title changes (lib/style.ts, 10+ calls) |
| Followers back | Mags | 1k · 5k · 10k · **38,200 ("That's everyone you lost, back.")** · 50k · 100k · 250k |
| Tier 1 at Tier One | Mags | |
| Nothing happened | Mags | quiet / solid / meh |

Lines mirror into the Feed through `feedBeat()`; the first line of the window shows on Results; the latest shows on the stage screen; the log sheet pages them 4 at a time.

## 5. Club relations, as words (§14)

`relationWord(v)`: +3…+5 **Trusted** "Press office returns your calls" · +1…+2 **Warm** "Takes your calls" · 0 Neutral · −1…−2 **Cold** "Slow to call back" · −3…−5 **Frozen out** "Club insiders are less reliable". Shown as `Chelsea · +4 · TRUSTED` chips (top three by strength) on the stage screen and as rows in the Clubs sheet. Movement: +1 both clubs on a right call (+2 exclusive), −1 wrong Advanced, −2 wrong Confirmed, drift one step toward 0 after 10 untouched windows.

## 6. Contacts, as relationships (§15)

Levels stay XP (60 / 160 / 320 / 560; +10 ask, +25 read matched a right call, +5 right call that ignored a wrong read, coffee +20 for 30 coins once a day). Words: Cold · Familiar · Trusted · Inner Circle · Direct Line. The Contacts sheet in Career and the Contacts Book (`screens/Connect.tsx`) show the word, a bar "Getting to Trusted", and one plain line per source for what the relationship does for you ("Rings you first about one deal a window"). No "+25 XP" anywhere. Daily, rooms and the Market never read the book (`bookPerks()` is off for them).

## 7. Screens (one viewport each, Back top-left)

Cover (no career) → opening film → title card "Open the blog" · Door: Continue / New career (/ Prestige) · Stage screen: stage N of 5, publication (renameable), reputation + followers with words, next goal line + bar, club chips, latest log line, **Play window N**; sheets: Career log · Contacts · Clubs · More (record, replay the opening, saves, prestige) · Stage intro once per stage after its film (the offer, what's new, with faces).

## 8. Exported API others rely on

`lib/career.ts`: `STAGES`/`RANKS` (`.gate`, `.reach`), `TOP`, `TOP_WINDOWS`, `newCareer`, `careerRules`, `castOpts`, `applyWindow → CareerReport` (`promoted`, `established`, `leak`, `barberBurned`, `rivalRuns`, `style`, `rel`, `leaks`, `frozen`, `trust`), `relationWord`, `relationsOf`, `careerTrust`, `isEstablished`, `prestigeOf`, `totalFavours`, `agentLeakOf`, `vinceOf` (null stub). `lib/storyMode.ts`: `chapterFor/chapterOf`, `chapterName`, `storyBeats`, `pushBeats`, `beatKey`, `beatFrom`, `beatKnown`, `FOLLOWERS_LOST`. Save: `CareerSave.topW`, `.marks` (new, optional).

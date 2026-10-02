# Tier One Launch Rework Brief (owner, 2 Oct 2026) — text extracted from the PDF; sections 1–60 + addenda A–C are the mandate for 3.8.

=== PAGE 1 ===
TIER ONE
 LAUNCH REWORK DIRECTIVE
 A 60-part product, game design and implementation brief
 HEAR SOMETHING / INVESTIGATE IT / DECIDE / RISK YOUR REPUTATION /
 PUBLISH
 Prepared for Claude Code | Tier One 3.7 review | 2 October 2026
 Includes approved anime character direction and a live player database specification with daily refreshes
 and free agent coverage.

=== PAGE 2 ===
TIER ONE  /  LAUNCH REWORK BRIEF
2
CHARACTER DIRECTION
Fictional journalists and source cast - approved style example
 Warm newsroom lighting, charcoal and paper surfaces, restrained coral, expressive adult anime-inspired faces. This is a
 character direction sheet, not a final screen.

=== PAGE 3 ===
TIER ONE  /  LAUNCH REWORK BRIEF
3
PLAYER PORTRAIT DIRECTION
Mohamed Salah - characterized database portrait example
 Keep current club and free-agent status in live text fields. The portrait itself stays separate from changing roster data.

=== PAGE 4 ===
TIER ONE  /  LAUNCH REWORK BRIEF
4
HOW TO USE THIS BRIEF
This document organizes the supplied 60-part direction into a clean implementation brief. Its current-state
values are audit baselines, not completed simulation results. Sections 1-4 consolidate the opening product
context and the source-economics material supplied with the brief. Sections 5-60 preserve the numbered design
requirements in readable PDF form. Addenda A-C add the approved character direction, daily-updating player
data / free-agent requirement, and implementation cautions.
Contents
 1-4 Product understanding, hierarchy and Daily source-economics baseline
5-10 Information clarity, evidence, publishing, Exclusives, Deadline Day and sharing
11-17 Career, relationships and Multiplayer
18-24 Transfer Market, data, progression, economy and monetization
25-35 Home, visual direction, Player File, navigation, onboarding and cleanup
36-47 Game math, economy, analytics loops, audio, motion and missions
48-60 Fairness, accounts, feature priorities, workflow, final feel and mandate
Addenda A-C Character direction; live player database / free agents; implementation cautions
The existing feature guide remains the detailed v3.7 inventory. This brief tells the team how to evaluate and improve that
game before launch.

=== PAGE 5 ===
TIER ONE  /  LAUNCH REWORK BRIEF
5
1. Start by understanding the current game
Inspect the existing Tier One project and the entire v3.7 feature inventory before rewriting anything. Map the
actual implementation, not only the intended design. You are acting as creative director, game designer,
economy designer, UX designer, retention and monetization designer, and implementation reviewer.
Tier One is a football transfer journalist game built around seven-day windows and five transfer sagas. Each
saga resolves as Done, Hijack, Off or Fake. The player calls unreliable sources, interprets evidence, chooses a
publication strength, competes with rivals, handles twists and U-turns, and reaches a 60-second Deadline Day
before scoring and sharing a result.
Major modes are Daily Challenge, Career, Multiplayer and the real-world Transfer Market. Supporting systems
include Practice, Press Card identity, contacts, club relationships, followers, reputation, season XP, missions,
achievements, leaderboards, cosmetics, currencies and the Store.
Do not treat the existing implementation as sacred. Keep, simplify, merge, remove or add systems when doing
so improves the player experience. Preserve the central fantasy: you are a football transfer journalist trying to
determine the truth before everyone else, decide how much you trust your information, put your reputation on
the line, publish the story, and live with the consequence.
2. The central product problem
Too many individually interesting ideas compete for attention. Establish a coherent hierarchy.
 •  Primary: Daily Challenge.
 •  Secondary: Career, Multiplayer and Transfer Market.
 •  Supporting: Practice, Profile / Press Card, progression, missions, leaderboards and Shop.
 The core loop must remain immediately visible: hear something, investigate it, decide whether you believe it,
risk your reputation, and publish before everyone else. Every surrounding system must help that loop, the
journalist fantasy, social competition or player identity.
3. Make Daily the product heartbeat
Daily is the ritual and the main entry point. Players should understand what to do today without reading the full
feature inventory. Give everyone the same board, the same answers, consistent source behavior and the same
competitive opportunity.
Career supplies the comeback fantasy. Multiplayer supplies friendship and rivalry. Transfer Market supplies the
deeper real-football forecasting layer. Practice teaches the game. The Press Card expresses identity. The Store
sells that identity without selling competitive strength.
Keep the game approachable in one session and deep enough to reward judgment for months. Mobile clarity,
fair competition, satisfying consequences and spoiler-free sharing take priority over adding more menus.
4. Daily gameplay must feel deep without feeling
confusing
Current baseline: five sagas, seven days, four contact points per day on Days 1-6 and three on Deadline Day.
Unused points disappear. Starting outcome probabilities are Done 35%, Hijack 20%, Off 25% and Fake 20%.
Each saga has a planted wrong story; gossip sources can repeat the same misinformation. A source answers
once per saga, then may answer again after a twist.

=== PAGE 6 ===
TIER ONE  /  LAUNCH REWORK BRIEF
6
Source
Cost
Opens
Information and current
reliability
Kit Man
1 point
Day 1
Leaving / Staying; 80% correct;
knows whether, not where.
Barber
1 point
Day 1
Four outcomes; 45% correct;
otherwise repeats planted
gossip.
Agent
2 points
Day 1
Four outcomes; says Done 85%
when true, but also 35-60%
when it is not. Negative
answers can be more
informative.
Airport Spotter
2 points
Day 3
Linked club / elsewhere / no
jets; 85% on movement
direction; cannot distinguish
Off from Fake.
Physio
3 points
Day 5
Medical at linked club /
elsewhere / none; 92% reliable;
cannot distinguish Off from
Fake.
Press Office
2 points
Day 1
Career unlock through club
relationships; four outcomes;
85% correct.
Astra must perform a complete mathematical audit. Do not merely accept these values.
 •  Expected information gained per contact point.
 •  Whether any source is mathematically dominant or rarely worth calling.
 •  Whether Barber is strategically useful or just cheap noise.
 •  Whether Physio arrives too late to justify three points.
 •  Whether Agent bias produces interesting inference or unnecessary confusion.
 •  Whether source opening days create meaningful pacing.
 •  Whether point totals create enough scarcity.
 •  Whether five sagas and seven days are optimal.
 •  Whether Deadline Day should retain three contact points.
 •  Whether unused points should disappear or limited partial rollover would improve decisions.
 •  Whether calls should scale differently by mode.
 The solution should create genuine dilemmas. A player should frequently think: "Do I spend two points
confirming this story, or investigate another saga?" That is good gameplay.
5. Do not turn the game into a spreadsheet
The game contains probabilities under the hood. Players should not need to calculate Bayesian probability
manually. Ranked Daily should communicate information through human-readable source characteristics.
Examples: Gossip; Reliable; Very reliable; Club insider; Knows whether he leaves, not where; Usually strong on
medicals; Agent - direct but biased; Airport - strong evidence of destination; Street chatter - correlated.
Avoid fake-looking exact UI numbers such as "Agent reliability 73%" unless showing them is deliberately part of
Practice / Coach mode. Practice may expose calculated probability estimates. Ranked modes should preserve
uncertainty. The player should feel like a journalist interpreting sources, not an actuary.

=== PAGE 7 ===
TIER ONE  /  LAUNCH REWORK BRIEF
7
6. Evidence circles are a good idea - make them intuitive
The current game groups information into Club, Agent, Travel, Street, Insider and Press Office evidence circles.
Reads from the same circle should not count as independent confirmation.
Preserve this concept because it teaches an important strategic rule: "Three people repeating the same rumor
are not three independent confirmations."
Communicate this visually and immediately. Possible language: "Independent confirmations: 2" or "2
independent sources agree." When two gossip voices repeat the same planted line: "Echo chamber - these
reports trace back to the same story." This should be understandable without reading a manual.
7. Publishing is the central decision
Current publishing strengths: In Talks gives lower reward and low risk; Advanced gives medium reward and
medium risk; Confirmed gives the highest reward, high risk and a potential Exclusive.
Strength
Base correct
Early bonus / day
Wrong
In Talks
+10
+1
-5
Advanced
+20
+2
-15
Confirmed
+40
+4
-60
Confirmed can also gain +20 for an Exclusive. This risk ladder is one of Tier One's strongest ideas. Preserve the
concept, but audit the numbers. Simulate thousands or millions of games if helpful.
 •  Expected score by strategy.
 •  Whether Confirmed is too punishing.
 •  Whether cautious or aggressive play dominates.
 •  Whether early bonuses are strong enough.
 •  Whether late certainty dominates early journalism.
 •  Whether the Exclusive bonus is large enough.
 •  Whether Tier thresholds create realistic distributions.
 •  Whether skilled players consistently outperform random players.
 •  Whether luck overwhelms judgment.
 •  Whether optimal play is understandable.
 The ideal game rewards being informed + being early + being brave without rewarding reckless gambling.
8. Exclusives should feel incredible
An Exclusive is central to the journalism fantasy. Current requirements: Confirmed call; correct result; two
independent evidence circles; rival has not already published it; no U-turn. Preserve that conceptual structure.
Make the moment unmistakable: visual newsroom impact, distinctive stamp, unique sound, subtle camera /
screen motion, follower spike, leaderboard emphasis, social share option, rival reactions and feed event.
Do not overuse gold. Gold should primarily communicate Exclusive, major achievement, Tier One status and
rare progression milestones. That preserves its emotional value.

=== PAGE 8 ===
TIER ONE  /  LAUNCH REWORK BRIEF
8
9. Deadline Day should be a signature experience
Current Deadline Day: Day 7; 60 seconds; three contact points; maximum three posts; quick-post interface;
heartbeat under 30 seconds; ticking / vibration under 10 seconds; final whistle at zero. This is an excellent
differentiator. Do not trivialize it. Polish it heavily.
Possible progression: 60 seconds - normal urgency; 30 - heartbeat begins; 15 - interface simplifies into Quick
Post mode; 10 - ticking intensifies; 5 - visual timer pulse; 0 - whistle / newsroom cutoff.
Animations must never interfere with input. The timer must be fair. Account for server latency. Accessibility and
reduced-motion settings must work. Players must immediately see unresolved sagas. Quick Post must be
extremely understandable. Deadline Day should become one of the most recognizable Tier One moments.
10. Daily results must become a viral object
The game already creates spoiler-free share cards containing tier, score and symbols representing results.
Develop this into Tier One's equivalent of the Wordle share result. After seeing the graphic several times online,
people should recognize Tier One immediately.
Example: TIER ONE #147 / TIER 1 - 186 PTS / five result symbols / 2 Exclusives / Top 8% / 11-day streak. Do not
reveal transfer-result spoilers.
Shareable achievements can include Top X%, You broke it first, Perfect five, 3 exclusives, longest streak, biggest
comeback, survived Deadline Day, SPIKED and beat all three rivals.
Failure should also be funny and shareable. Example: "SPIKED. The editor would like a word." Virality should not
depend only on winning.
11. Career mode requires a major rework
The current premise: on Deadline Day you published a disastrous wrong transfer story, lost 38,200 followers and
your job at The Chronicle. The plot later becomes a mystery involving Vince Marlow, Carl Stubbs, anonymous
messages and planted evidence.
KEEP THE BEGINNING. You were a football journalist. You made a disastrous series of calls or one catastrophic
transfer call. You were publicly embarrassed. Your editor fired you. Your reputation collapsed. Now you must
rebuild your career from almost nothing.
Remove or heavily reduce the deep conspiracy / detective story. Case-file progression involving planted
evidence, Vince, Carl, Priya's logs, mystery reveals and a predetermined villain should no longer dominate
Career. Tier One is primarily a football journalism fantasy, not a detective adventure. Career should become an
emergent climb through football media.
Stage
Fantasy and progression
The Blog
Unemployed; work from home; low-level stories; few
contacts answer; nobody respects your name.
Local Desk
A small publication gives you a chance; better stories;
Airport unlock; competitors notice you.
Nationals
Major clubs and bigger stars; more pressure; Physio and
stronger contacts; intentional agent leaks.
The Press Box
Established journalist; club relationships matter;
publications compete for you; stronger rivalries.
Tier One
One of the most trusted journalists; top stories; star players;
tight Deadline Days; prestige / endless unlock.

=== PAGE 9 ===
TIER ONE  /  LAUNCH REWORK BRIEF
9
12. Career should produce personal stories
Career narrative should primarily emerge from what the player does. Examples:
 •  You repeatedly trust the Barber and get burned.
 •  An Agent becomes one of your strongest contacts.
 •  A club freezes you out; another begins returning your calls.
 •  You beat a major rival repeatedly.
 •  You become known for conservative calls or famous for early Confirmeds.
 •  You rebuild the exact follower count you once lost.
 •  A publication offers you a role.
 •  An agent sends you an exclusive because your credibility is high.
 •  A player publicly confirms you were first.
 •  One catastrophic miss damages your standing.
 Those events will be more memorable than predetermined exposition. Characters may remain. They should
react to gameplay, without forcing the player through a rigid mystery.
13. Shorten Career progression
The current promotion path reaches 56 windows before Tier One, followed by additional Tier 1 requirements.
This is likely too long for the first complete journey. Model alternatives targeting approximately 15-25
meaningful windows for a first full career.
Then unlock endless Career, prestige, harder newsroom, rival publication run, challenge careers and specialist
careers. The player should feel meaningful career change every few windows. Avoid grinding dozens of nearly
identical boards purely to satisfy counters.
14. Club relationships are interesting - make them visible
Current club relationships range from -5 to +5. Good relationships can unlock Press Office information. Bad
relationships can make club insiders unreliable. Preserve and expand this Career material carefully, but make
consequences readable.
Examples: "Chelsea - +4 - TRUSTED. Press office returns your calls." "Napoli - -3 - FROZEN OUT. Club insiders
are less reliable." Do not bury this in a statistics page. Relationships should visibly change how Career feels.
15. Contact progression should feel like relationships,
not RPG numbers
Current contacts have five levels and XP. XP is granted for asking them, being right with them or correctly
ignoring bad information. Keep the concept and simplify presentation.
The emotional goal is "This source trusts me now," not "I obtained +25 contact XP." Potential progression: Cold,
Familiar, Trusted, Inner Circle, Direct Line. Behind the scenes this can still use XP, but presentation should feel
like relationship-building.
Competitive Daily and Multiplayer must remain unaffected by contact progression. Career and Practice may use
these benefits.

=== PAGE 10 ===
TIER ONE  /  LAUNCH REWORK BRIEF
10
16. Multiplayer should feel like a group chat of football
obsessives
Current rooms allow daily or weekly cadence; 5, 10 or 20 rounds; maximum 24 players; standings; feed; taunts;
spectating; rival relationships; automatic closure after 21 days of inactivity. Audit this heavily.
The emotional goal is "My friends and I are all trying to embarrass each other with transfer calls," rather than
large private tournament infrastructure.
Explore a recommended room size of 2-12, a possible hard cap around 16, seven rounds by default, daily /
weekly cadence, easy invite links, joining without account friction, automatic table and round recap, funniest
miss, biggest scoop, first exclusive, rank movement and rivalry statistics.
Generate a Press Room recap card after each round. Example: THE PRESS BOX - ROUND 4. Mo 144; Ahmed 122;
Sam 86. BIGGEST SCOOP: Mo - Exclusive. DISASTER OF THE ROUND: Ahmed - Confirmed Fake. Make this
shareable in Discord, WhatsApp and group chats.
17. Review multiplayer room math
Explicitly determine appropriate values for minimum players; maximum players; recommended room size; code
length; number of rounds; daily versus weekly cadence; open duration; late-join behavior; missed-round scoring;
tie-breakers; inactivity; host transfer; abandonment; archive duration; taunt cooldown; spectating restrictions;
reward eligibility; anti-cheat rules.
Do not simply retain "24 players, 21 days" because that is what exists. Choose deliberately and explain why.
18. Transfer Market should be the hardcore mode
Transfer Market uses real-world rumours. Players make YES / NO calls, optionally predict destination and fee,
choose a confidence strength and receive market-style Cred. This is potentially extremely strong and connects
Tier One to real football conversation.
It is mathematically more complicated than Daily. Position it as the serious long-term mode for players who
want to predict real transfers. Daily should teach Tier One. Transfer Market should deepen Tier One.
Review market price formula, confidence model, stake system, daily call limit, open-call limit, corrections,
late-call rule, settlement, crowd prediction display, destination bonuses, fee-band bonuses, season Cred and
market leaderboards.
Current limits: five new calls per day, 40 open calls, one call per rumour. These are not sacred. Model whether
they create enough activity without spam.
19. Real-world data must not depend on manual
hardcoded windows
The current implementation has hard-coded real-world transfer-window dates and depends on a rumour
snapshot. This is a serious operational weakness.
Rework it so window dates and market availability are configuration / data driven: server-managed transfer
windows, league-specific dates if required, event flags, live Deadline Day events, configurable opening / closing,
and no client patch merely because a transfer date changed.
Apply the daily player-database update requirements in Addendum B as well. Window configuration and roster
freshness are separate responsibilities, and both must work.

=== PAGE 11 ===
TIER ONE  /  LAUNCH REWORK BRIEF
11
20. Simplify the player's progression model
Current visible progression includes Season level, XP, Reputation, Followers, Career rank, Hot Hand, Coins,
Credits, Contact XP, Club relations, Rival records, Streak, Market Cred, Achievements and Missions. This is too
cognitively expensive.
Create a clean mental model: FOLLOWERS = how famous you are; REPUTATION = how trusted you are; SEASON
XP = temporary progression / reward track.
Contact relationships, rival records, club relationships and Market Cred should remain contextual rather than
competing as headline progression systems.
21. Followers should be emotional
Current follower rewards: +40 correct In Talks; +90 correct Advanced; +220 correct Confirmed; +300 additional
Exclusive; losses of -10 / -30 / -130 depending on strength; Hot Hand multiplier up to x2. Audit these.
Followers should behave like social capital. Landing a massive early Exclusive should produce a noticeably
larger jump. A disastrous high-profile wrong Confirmed should hurt. Follower movement should not become
random visual noise.
Consider tying magnitude partly to player star level, how early the call was, confidence, exclusivity, real-market
heat and Career publication reach.
22. Economy must be redesigned as one coherent system
Coins are earned through gameplay. Credits are intended to be premium / occasionally earned, but current
credit earning is not functioning and payments are disabled. Fix the architecture before launch.
COINS: earned by playing; spent on common cosmetics, cosmetic customization, low-impact Career
convenience, contact coffee in Career and certain customization unlocks.
CREDITS: premium currency obtained primarily through purchase and occasionally earned through significant
milestones; spent on premium cosmetics, limited seasonal cosmetics, premium customization, gifting and a
premium seasonal track if retained.
Absolutely do not allow Credits to increase competitive Daily, Multiplayer or Transfer Market performance.
Ranked scores cannot be purchased.
23. Collapse the two stores into one
The implementation overlaps Shop with the internal Pass & Store store. Create one coherent Store. Potential
top-level sections: Featured, Cosmetics, Season and Owned.
Subcategories may include Press Card, Desk, Headline, Masthead, Share Card, Stamp, Catchphrase, Ring, Flair
and Feed style. Do not overwhelm the player with nineteen visible categories simultaneously. Use progressive
browsing.
24. Monetization should sell identity, not power
Best opportunities: unique newsroom desk themes, premium newspaper styles, animated stamps, mastheads,
press passes, share cards, ringtones, catchphrases, feed skins, celebration animations, seasonal cosmetic
collections, limited-earned cosmetics and creator / event collaborations later where appropriate.
Avoid competitive source boosts, better Daily information, additional ranked Daily calls, score multipliers, paid
exclusives and anything damaging integrity.

=== PAGE 12 ===
TIER ONE  /  LAUNCH REWORK BRIEF
12
The player should spend because "I want my journalist identity to look incredible," not because "I need to pay to
compete."
25. Home screen needs a much stronger hierarchy
Current Home contains Press Card, four mode tiles, Missions, Shop, notification bell, currencies and Morning
Papers. Rebuild it around priority.
 •  Top: Tier One identity, compact currency area and notification.
 •  Hero: THE DAILY. When unplayed, a large PLAY TODAY'S DAILY CTA. Show Daily number, reset timer, streak,
 five hidden saga shirts and perhaps global player count.
•  Secondary progression strip: Season level and meaningful reward progress.
 •  Four supporting mode cards: Career, Transfer Market, Multiplayer and Practice.
 •  Compact Missions.
 •  Compact Shop.
 The Daily should visually dominate.
26. Use the new visual direction
Preserve the strongest qualities of the Runway UI mockups. Target premium football newsroom, not generic
dark-mode SaaS, neon mobile casino, football betting app, cheap browser game or overly skeuomorphic
newspaper.
Core palette: deep charcoal / black, warm off-white paper, restrained editorial red / coral, muted gray and rare
gold for achievement / exclusive states. Typography: editorial serif for major headlines; clean readable sans
serif for UI / body. Textures: subtle paper, desk surface, restrained newsroom photography and minimal grain.
UI principles: 8pt spacing grid; approximately 16px mobile side margins; 44px+ minimum tap targets; strong
hierarchy; large primary CTA; minimal unnecessary badges; consistent icon family; restrained corner radii;
editorial cards rather than bubbly cards.
Integrate the approved anime character art from Addendum A into this visual system. Character art gives faces
to the game without replacing the editorial interface.
27. Player File should be the best screen in the game
The previously generated Player File direction is strong. Target hierarchy:
 •  Player header: player, age / position, current club to linked club, saga number and story heat where
 relevant.
•  Evidence summary: Done, Hijack, Off, Fake. Use clear bars, source-circle markers and terms such as Strong /
 Split / Weak. No fake exact percentages in ranked Daily.
•  Tabs: Sources, Clippings, Your Call.
 •  Source cards: identity, information type, cost, availability, qualitative reliability and whether already called.
 •  Sticky action: Back to Board and Make the Call.
 The player should understand the story's state in under two seconds. Use the approved illustrated player
portrait as an identity element; bind current club and free-agent status to the live data layer described in
Addendum B.

=== PAGE 13 ===
TIER ONE  /  LAUNCH REWORK BRIEF
13
28. UI information should be contextual, not always
visible
Do not place every stat everywhere. During Daily gameplay, the player primarily needs current day, calls
remaining, sagas, evidence, rivals and posting status. He does not need lifetime XP, Gold progress,
achievements, store banners or follower milestones.
During Shop, he needs currency. During Multiplayer, room status and standings. During Career, publication,
reputation and progression. Reduce global clutter.
29. Navigation should be re-evaluated
Current bottom navigation contains five major destinations. Do not preserve the exact navigation solely
because it exists.
Evaluate Home / Daily / Career / Market / Profile with Multiplayer prominent on Home, or Home / Daily / Career /
Rooms / Profile with Transfer Market exposed contextually. Test the hierarchy logically.
Goals: no duplicated entry points, no ambiguity, no overcrowded navigation, primary modes accessible within
one tap, and profile / settings / store accessible without polluting gameplay.
30. Practice should be the learning lab
Practice already includes random boards, Coach mode, board codes and past Daily replay. Enhance its identity:
OFF THE RECORD. Nothing here affects your reputation.
Possible tools: exact calculated probability, source explanations, post-game breakdown, "Why was this source
misleading?", past Daily replay, board codes, friend challenge boards and strategy analysis. Practice should
teach players why they lost.
31. Onboarding should teach the game in play
Current onboarding guides opening a file, ringing a source, ringing another source, deciding an outcome,
choosing loudness and publishing. Preserve that approach, while simplifying surrounding story setup.
Ideal first five minutes: welcome to Tier One; enter your journalist name; "You were fired last season after
getting the biggest call wrong"; start a training board; ring Kit Man; ring a second source; interpret evidence;
choose a call; publish; see the consequence; land on Home with today's Daily highlighted.
The player should understand the game before seeing the shop, pass, achievements and other meta systems.
32. Morning Papers can become a great retention feature
Morning Papers already has overnight headlines, Daily rank, streak, activity and suggested assignments. Keep it
compact. Opening Tier One in the morning should feel like opening a newsroom briefing.
Example: THE MORNING PAPERS. Yesterday: Tier 2 - #418. Overnight: Your market call on Osimhen settled.
Rival: @ITK_Kev beat you to one. Today's desk: THE DAILY #148. CTA: OPEN THE DESK.
This can become a natural retention ritual.

=== PAGE 14 ===
TIER ONE  /  LAUNCH REWORK BRIEF
14
33. Notifications should actually work
Push notifications are prepared but never requested. Implement permissions carefully and contextually. Never
ask immediately on install. Ask after the user has experienced value.
After the first Daily: "Want a reminder when tomorrow's desk opens?" Useful notifications: Daily available;
streak at risk; Transfer Market call settled; multiplayer round opened; room round nearly closing; Deadline Day
Live begins. Do not spam.
34. Weekly events either need to work or need to be
removed
Current weekly event descriptions claim Physio opening earlier, Barber reliability increasing, Deadline Day
lasting longer and league-restricted sagas, but the modifiers are not actually applied.
Either implement them properly or remove the system until ready. Never show fake mechanics. If retained,
weekly events should provide meaningful novelty primarily in Career and Practice. Do not alter ranked Daily
fairness.
35. Remove dead and contradictory systems
The feature guide identifies leftovers. Fix all of them:
 •  Nonfunctional Credits; disabled monetization.
 •  Weekly event modifiers not applying; contact L3 discount not applying.
 •  Weekly league running without a screen; weekly leaderboard prizes still awarded.
 •  Contradictory Deadline Day Live description.
 •  Duplicate stores; unreachable screens; outdated Semba Pass text.
 •  Unavailable notification permission.
 •  Taunt timing mismatch; APK version mismatch.
 •  Hidden unexplained coin drip.
 •  Incorrect achievement labels; nonexistent catchphrase references.
 •  Practice event button looping back to Practice.
 •  Confusing seasonal level reset; hard-coded real-world dates.
 There should be zero knowingly contradictory mechanics at launch.
36. Audit all game math
Create a dedicated GAME MATH SPECIFICATION. Explicitly define and justify every meaningful numeric rule.
Create expected-value simulations. Do not choose numbers because they "feel right."
Core board
Sagas per board; possible outcome probabilities; number of in-game days; calls per day; rollover behavior;
source cost; source opening day; source accuracy; source conditional behavior; gossip correlation; evidence
weighting; evidence independence; twist frequency; twist timing; U-turn count; U-turn penalty; publication
values; early bonus; wrong-call penalty; Exclusive bonus; Tier thresholds; score floor / ceiling.
Deadline Day
Timer length; contact points; posts allowed; Quick Post threshold; server grace; timer UI thresholds.

=== PAGE 15 ===
TIER ONE  /  LAUNCH REWORK BRIEF
15
Rivals
Posting frequency; accuracy; timing; saga selection; Exclusive-steal probability; difficulty scaling.
Career
Windows per rank; reputation required; source unlock timing; contact progression; club relations; follower gain /
loss; job / publication progression; prestige unlock.
Multiplayer
Room cap; recommended size; round count; daily / weekly cadence; close timing; inactive-room expiry; host
behavior; late joins; scoring; tie-breakers; taunt cooldown; friend rivalry thresholds.
Transfer Market
Calls per day; open-call maximum; confidence / stake amounts; market probability formula; early / lead bonus;
destination bonus; fee bonus; correction period; late-information protection; settlement delay; void conditions.
Progression
XP sources; XP per season level; season completion expectation; reputation changes; follower changes; streak
system; grace days; achievements; missions.
Economy
Model every source and sink: coins per day / week; expected coins per average player and hardcore player; coin
shop prices; Credit prices and earn sources; Gold / season pricing; cosmetic pricing; referral rewards;
leaderboard rewards; achievement rewards; mission rewards.
37. Economy must avoid both starvation and inflation
A casual player should regularly afford some cosmetics. A dedicated player should progress faster. Premium
cosmetics should still feel premium. Players should not accumulate so many Coins that all prices become
meaningless.
Model monthly currency inflow for four archetypes: Casual - three Dailies per week; Engaged - Daily every day
plus occasional Career; Core - Daily, Career, Multiplayer and Market; Hardcore - all modes, missions and
leaderboard activity. Price the Store accordingly.
38. Shareability must be designed at every level
Do not bolt sharing onto Results. Intentionally build share moments: Daily result; Exclusive; first Tier 1; Press
Room victory; biggest miss; perfect board; Career promotion; Tier One rank; 30-day streak; 100-day streak;
Market prediction that beat consensus; dramatic Deadline Day finish.
Cards should look unmistakably Tier One, contain the game link, avoid spoilers where relevant and look good on
X, WhatsApp, Discord and Instagram Stories.
39. Audio needs a coherent identity
Existing sounds include taps, page turns, rings, stamps, typewriter, coins, fanfare, heartbeat, ticking, whistle,
glitch and catchphrase sounds.
Preserve strong diegetic newsroom audio: desk phones, paper, newsroom equipment, stadium ambience,
airport PA, camera shutters, typewriter, notification teletype and final whistle. Avoid generic mobile-game
jingles.

=== PAGE 16 ===
TIER ONE  /  LAUNCH REWORK BRIEF
16
Previously created source-ring and Deadline Day tension sounds may be used as references if available. Audio
should reinforce the fantasy.
40. Animation must be short and punchy
The game already contains many mini-films and animations. Do not make the player constantly wait.
Default timings: common action 150-400 ms; important result 500-1200 ms; major achievement 1-2 seconds.
Longer story / season cinematics should be rare, optional and skippable. Never make repeat gameplay wait
through the same elaborate animation.
Respect Reduce Motion, low battery, slow connections and Save Data. Apply these rules to anime character
reactions and scene animation as well.
41. Do not make Tier One feel like Football Manager
Tier One is not a club-management simulator. It should not become squad management, tactical management,
finances, training schedules or match simulation.
Its unique identity is football journalism. Lean into rumors, calls, agents, sources, press rooms, newspapers,
transfer windows, exclusives, credibility, timing, social media and publication pressure.
42. Do not make it a betting game either
Transfer Market terminology can resemble a prediction market. The experience should remain journalistic
forecasting, not sports gambling. Avoid casino visual language and chips / cards / roulette styling.
Use Cred, confidence, market consensus, reporter call and publication strength rather than gambling-first
language.
43. Create an icon system
Audit every icon. Icons should share line weight, use consistent geometry, remain legible at small size and make
semantic sense.
Destination / action
Potential icon
Home
Desk / home
Daily
Newspaper / front page
Career
Press pass / byline
Market
Transfer arrows
Multiplayer
Reporters / group
Profile
ID press card
Source call
Telephone
Exclusive
Star / lightning / front-page stamp
Evidence
Clipping / check
Notifications
Bell
Coins
Coin
Credits
Press-credit card or unique token
Avoid mixing unrelated icon libraries without normalization.

=== PAGE 17 ===
TIER ONE  /  LAUNCH REWORK BRIEF
17
44. Spacing and responsive rules
Create a UI system instead of hardcoding each screen independently. Suggested baseline: 4px micro spacing,
8px small, 12px compact, 16px standard, 24px section and 32px major separation.
Mobile safe horizontal padding approximately 16px; minimum tap size 44 x 44px; primary buttons 48-56px high;
cards roughly 12-16px radius depending on context.
On desktop, do not merely stretch mobile UI. Daily board and Player File may become split view. Navigation can
become a left rail. Keep reading width controlled.
45. First-time UX should hide complexity
Tier One can have enormous depth. The first-time player should not see all of it. Use progressive disclosure.
The first session needs only saga, source, evidence, outcome, loudness and publish. Later introduce rivals,
exclusives, twists, U-turn, contact progression, market, seasons and economy. Complexity should emerge
naturally.
46. Retention model
Build around several cadences:
Cadence
Systems
Daily
Daily Challenge
Multi-day
Streak; Market settlements; Multiplayer round
Weekly
Multiplayer standings; weekly mission; event
Seasonal
Season progression; limited cosmetics; Market Cred
leaderboard
Long term
Career; Contacts; Rivals; Achievements; prestige
These loops should reinforce each other without requiring all of them.
47. Remove chores
Missions must not force stupid behavior. Avoid missions such as "Call the Barber three times" if that encourages
mathematically bad play in competitive modes.
Prefer complete Daily, land a correct Advanced+, get an Exclusive, beat a rival, play Career, play a room, share
a result and make a Market call. Missions should reward enjoying Tier One, not gaming the mission system.
48. Preserve competitive integrity
Daily, Multiplayer and the Transfer Market leaderboard must be server-authoritative where necessary. Do not
trust client state for answers, score, timing, leaderboards, Daily seeds, Market calls, room results or reward
claims.
Audit anti-cheat implications. New roster snapshots must preserve the shared board and scoring contract
described in Addendum B.

=== PAGE 18 ===
TIER ONE  /  LAUNCH REWORK BRIEF
18
49. Account and device experience needs improvement
The implementation uses a hidden device account and transfer codes, while email linking exists in code without
UI. This is acceptable for frictionless onboarding but dangerous for long-term ownership.
Start anonymously. Later offer "Protect your Press Card" with email, Apple and Google where applicable. Do not
require registration before first gameplay.
50. What to keep at almost all costs
Unless strong testing disproves them, preserve: football transfer journalist fantasy; Daily Challenge; shared
identical Daily; unreliable sources; correlated gossip; source specialization; limited calls; Done / Hijack / Off /
Fake; publication loudness; early journalism reward; Exclusives; rivals; Deadline Day countdown; newspaper
results; spoiler-free sharing; Practice; real-rumour Transfer Market; player identity / Press Card; cosmetics;
competitive fairness.
These are part of Tier One's identity.
51. What should be questioned aggressively
Question the conspiracy-heavy Career story; 56-window Career grind; duplicate stores; invisible weekly league;
excessive currency visibility; every existing progression stat; overly long cinematics; oversized multiplayer cap;
current mission structure; coin pricing; Credit pricing; contact XP presentation; room expiry rules; rival
percentages; score thresholds; exact source costs; navigation; Home hierarchy; hard-coded transfer calendars;
every hidden leftover system.
52. Implementation workflow
Do not perform this rework as uncontrolled code churn. Use the following phases.
Phase 1 - Audit
Map screens, routes, components, game engine, backend routes, local storage, server state, economy
constants, styles, assets, dead code, duplicated code, obsolete strings and incomplete systems. Produce
CURRENT STATE MAP.
Phase 2 - Product decisions
For every major feature classify KEEP, KEEP BUT REWORK, MERGE, REMOVE or NEW. Explain important
decisions.
Phase 3 - Game math
Create a simulation-backed balance specification. Do not change UI first and math later. Gameplay math drives
UI.
Phase 4 - Information architecture
Define global navigation, Home, Daily, Career, Rooms, Market, Profile, Shop and Settings. Determine every
feature's correct location. No orphaned screens.
Phase 5 - Design system
Create shared tokens for color, typography, spacing, radius, elevation, paper texture, icon system, animation
timings and responsive breakpoints.

=== PAGE 19 ===
TIER ONE  /  LAUNCH REWORK BRIEF
19
Phase 6 - Core loop first
Finish to production quality: onboarding; Daily Home hero; Daily board; Player File; source call; publish decision;
Deadline Day; Results; sharing. Only afterward polish secondary systems.
Phases 7-10 - Modes and meta
Phase 7: implement simplified emergent Career progression. Phase 8: revised private-room social loop. Phase 9:
finalize the real-world Transfer Market. Phase 10: progression, missions, season, Store and achievements.
Phase 11 - Cleanup
Remove obsolete routes, duplicate shop code, dead strings, legacy Semba Pass, abandoned game concepts,
incorrect feature flags, hidden rewards and contradictory UI.
Phase 12 - QA
Test iPhone sizes, Android sizes, tablet, desktop, Arabic RTL, Spanish, offline, poor connection, server reconnect,
slow device, Reduce Motion, disabled sound, interrupted Deadline Day, app resume, timer desync and account
migration.
Also apply the character-art and live-roster acceptance checks in the addenda.
53. Required output before / during implementation
Maintain a living design specification containing:
Part
Required topic
Part
Required topic
A
Product principles
J
Progression
B
Final feature map
K
Store
C
Screen map
L
Social / virality
D
Game math
M
UI design system
E
Economy
N
Sound / motion
F
Career progression
O
Technical cleanup
G
Daily system
P
Analytics
H
Multiplayer system
Q
Launch checklist
I
Transfer Market system
R
Character art and live player
data (added)
When you make a meaningful design decision, document it.
54. Analytics to add
Track funnel events: app opened; onboarding started; onboarding completed; Daily viewed; Daily started; first
source called; second source called; first call published; Daily finished; result shared; Career started; multiplayer
room created; invite sent; invite joined; Transfer Market call made; Store opened; item previewed; purchase
attempted; purchase completed; Day 1 return; Day 7 return; Day 30 return.
Measure where players quit. Do not guess blindly.

=== PAGE 20 ===
TIER ONE  /  LAUNCH REWORK BRIEF
20
55. Core KPIs
Optimize toward onboarding completion, first Daily completion, next-day return, Daily completion rate, share
rate, invite conversion, multiplayer room creation, room participation, Career completion, Transfer Market
return, streak continuation and shop conversion.
Do not maximize monetization at the cost of retention.
56. The final feel
Tier One should feel like Football Twitter, Deadline Day, a newsroom, a group chat, a deduction game and a
competitive daily puzzle merged into one coherent experience. It should not feel like a collection of menus
surrounding a probability calculator.
The user should remember moments: "I trusted the agent and got destroyed." "The barber was right." "I broke
the story before everyone." "I Confirmed it on Day 2 and somehow nailed it." "I got spiked." "I beat my entire
room." "I went against 90% of the Market and called it." That is the game.
57. Visual reference directive
Use the recent Runway concepts as the intended direction instead of blindly copying the current 3.7 UI.
Home concept: a dark football-journalist desk environment, large paper Daily hero, restrained red, editorial
typography, four supporting mode cards, season strip, compact Missions, compact Shop and clean five-icon
navigation.
Player File concept: a premium editorial document with player identity, club movement, evidence summary,
source cards, qualitative source strength, minimal colors and a large Make the Call button.
Preserve these design ideas while fixing generated-image inaccuracies. Runway images are visual references,
not exact implementation truth. Code the UI cleanly and natively. Do not reproduce AI-generated text errors.
The two approved anime examples in this PDF establish the additional character direction. Their rendered
names and jersey colors are presentation references; live text and club information must be supplied by code
and current data.
58. Do not overcorrect
The game already has original ideas. Do not rebuild Tier One into something generic. You are not being asked to
invent a completely different football game. Find the strongest version of this exact fantasy.
If an existing mechanic is excellent, preserve it. If it only needs UI improvement, improve the UI. If the number is
wrong, change it. If two systems duplicate one another, merge them. If something adds complexity without fun,
remove it. If you can invent something substantially better while staying true to Tier One, do it.
59. Your decision-making standard
Before adding or preserving anything, ask:
 •  Does this make being a transfer journalist more fun?
 •  Does it create a meaningful decision?
 •  Does it increase replayability?
 •  Does it strengthen competition?
 •  Does it strengthen social sharing?
 
=== PAGE 21 ===
TIER ONE  /  LAUNCH REWORK BRIEF
21
•  Does it strengthen player identity?
 •  Does it improve retention?
 •  Can a new player understand it?
 •  Does it justify the UI space it consumes?
 If the answer is repeatedly no, remove it.
60. Final mandate
Treat Tier One as a game that could become a major football social game, not a side project. Preserve the soul:
hear something, investigate it, decide whether you believe it, risk your reputation, publish before everyone else.
Build everything around that.
The finished product should be easy enough to understand in one session and deep enough to play for months
while becoming excellent at reading the transfer market.
Make Daily the ritual. Make Career the fantasy. Make Multiplayer the friendship / rivalry engine. Make Transfer
Market the hardcore real-football layer. Make the Press Card the identity. Make the Shop sell identity rather than
power. Make the result screen the viral object. Make Deadline Day unforgettable. Aggressively remove anything
that prevents those things from shining.
You have creative authority. Use it. Do not blindly preserve Tier One 3.7. Do not blindly follow this brief if deeper
analysis proves a substantially better solution. Any deviation must clearly improve the player experience and
preserve the central Tier One fantasy.
Build the version of Tier One that deserves to launch.
Addendum A. Character art direction and placement
Approved visual examples
The two examples below set the character direction: premium, adult anime inspired character art within the
warm, restrained football newsroom palette. The first establishes the fictional journalists and source cast. The
second shows a real player represented as a characterized portrait with a clear nameplate.
The images are visual direction examples for stills and animations. They are not finished game UI, authoritative
player data, an animation sprite sheet or proof that a real person's likeness is cleared for commercial release.
Build reusable native UI and original game assets around this direction. Check applicable image and likeness
rights for production use.
Where characters add value
Use character portraits and short expressive scenes at moments where a face makes the journalism fantasy
clearer or more memorable:
 •  Onboarding: meet the fired reporter and editor. Establish the initial public failure in a short scene, then teach
 the call / evidence / publish loop directly in play.
•  Sources: recognize the Kit Man, Barber, Agent, Airport Spotter, Physio and Press Office through consistent
 portraits or illustrated location vignettes. A source's expression can sell hesitation, confidence or mischief,
while the quote and reliability label remain plain text.
•  Player File: use a restrained player portrait area alongside the name, position and live club / free-agent
 status. The status text and crest must be data driven; never bake them into the portrait.
•  Rivals and multiplayer: give rival journalists readable press-card portraits, quick reactions and recap-card
 appearances. Keep reaction animations optional and brief.
•  Career: use source introductions, publication offers, promotions, rival encounters and major consequence
 scenes. Characters react to what the player did; they do not pull Career back into a fixed conspiracy.

=== PAGE 22 ===
TIER ONE  /  LAUNCH REWORK BRIEF
22
•  High-value moments: reserve a more expressive scene for an Exclusive, major promotion, catastrophic miss
 or Deadline Day finish. Preserve prompt control and reduced motion.
•  Share cards and profile: offer character illustration as an opt-in identity / cosmetic style. Keep result and
 evidence information readable and spoiler safe.
Animation and still-image rules
Use short, economical animation rather than constant motion: a glance, a phone lift, a paper handoff, a visible
pause before an answer, or a small reaction to a scoop. Common actions should remain 150-400 ms; important
results 500-1200 ms; major achievements 1-2 seconds. Do not delay source results or publication controls for an
animation. Provide reduced-motion and low-data behavior, and never encode a material game rule only in a
facial expression.
Keep character artwork visually consistent across portraits, scenes, cards and source introductions. Use original
fictional designs for fictional staff. Use real player names and portraits only through data and assets approved
for the game's actual use. Keep club names, current status, text, numbers and kit details outside baked artwork
so they can update independently.
Addendum B. Daily-updating player database, free agents
and current club data
Product requirement
The game must keep its real-world player list as current as the available, authorized data sources allow. Refresh
the player database automatically every day at minimum, and refresh important roster and transfer changes
more often when a trustworthy update is available. The player-facing list must be capable of reflecting new
signings, departures, releases, loans, retirements and free agents without requiring a client release. Include a
clear free-agent population in search and relevant game modes.
This is an implementation requirement for the existing Tier One project. It is not work performed by this PDF: the
current repository was not supplied with this request, so the game code has not been changed here.
Use Mohamed Salah as a concrete freshness test
On 2 October 2026, official Trabzonspor material lists Mohamed Salah as a club player. The club announced his
signing on 6 August 2026 and its current player listing identifies him with Trabzonspor. This illustrates why the
player portrait must not permanently encode an old club. Every current club / free-agent label must come from
the live player record.
Official club sources to check for this example:
 •  Trabzonspor player profile: https://www.trabzonspor.org.tr/branches/football/a-team-5/mohamed-salah-596
 •  Trabzonspor signing announcement:
 https://www.trabzonspor.org.tr/en/news/mohamed-salah-ile-sozlesme-imzaladik-06-08-2026
•  Reuters report on the signing: https://www.reuters.com/sports/soccer/soccer-mohamed-salah-signs-two-year
 -deal-with-trabzonspor-2026-08-06/
Build the pipeline to discover and verify future changes as well; these references are evidence for this dated
example, not a permanent source of truth for all player updates.
Data source policy
Use a licensed football data provider with roster / player coverage and change updates, supplemented or
verified by official club, league or federation announcements wherever possible. Prefer supported APIs, feeds
and webhooks. Do not depend on manually editing static player arrays, hard-coded transfer windows, ad hoc
model-generated claims or unauthorized scraping. Store each field's provider, source reference, observation
time, effective date and verification state.

=== PAGE 23 ===
TIER ONE  /  LAUNCH REWORK BRIEF
23
Keep a source priority policy. A completed registration / signing / official club roster should control current-club
status. A rumor, negotiation, medical or airport sighting must not silently change the player's registered current
club. Show transfer developments in the rumor / Market system with their appropriate stage; change current
club only when the configured authoritative evidence supports that status.
Minimum player record
Use a stable internal player ID and provider crosswalks rather than a player's display name as the identity key.
The record should support:
 •  canonical display name and known name variants / aliases;
 •  nationality and optional national team;
 •  birth date or age where licensed and needed;
 •  positions and preferred foot where licensed and useful;
 •  current club ID or an explicit no-club value;
 •  registration / roster status, separately represented from transfer rumor stage;
 •  loan status and parent club, where applicable;
 •  free-agent effective date and prior club, where known;
 •  retired / inactive / youth / unknown states as distinct values;
 •  headshot / illustration asset reference separate from textual player data;
 •  source, source URL or provider record ID, last checked time, effective time, confidence / verification status
 and record version.
Do not use a blank club field to mean both free agent and missing data. Distinguish Free agent, Club player, On
loan, Retired / inactive, and Unknown / not verified. Show "Free agent" as the status when there is positive
evidence the player is unattached. If the data simply failed to load, say the status could not be verified; do not
incorrectly turn the player into a free agent.
Refresh schedule and publishing
Implement a server-side scheduled job with this initial operating target:
Data task
Initial target
Daily full reconciliation
At least once every 24 hours, server side, with a visible
last-updated timestamp.
High-interest roster refresh
Recheck at least every 6 hours while an active window or
major live event is configured.
Event-driven updates
Ingest supported provider webhooks / official update feeds
as they arrive; validate and publish promptly.
Urgent transfer / signing change
Target propagation within 15 minutes of a trusted,
machine-readable update where the provider supports it;
monitor and report actual latency.
Failed scheduled run
Retry with backoff, alert operators, keep the last known
good snapshot, and mark its freshness honestly.
Treat these as service goals to measure, not a claim that every public source changes instantly. Make
schedules, competitions, enabled providers, transfer windows, high-heat players and refresh intervals
configurable on the server. Do not require a client patch for roster or calendar changes.
Fetch into a staging snapshot, normalize and validate it, compare it with the current published version, then
atomically publish a versioned update. Never expose a half-imported roster. Keep a change log with before /
after values and provenance; allow operators to inspect and correct suspect changes. Retry temporary failures
without duplicating players or overwriting newer data with older feeds. Keep the last good dataset available if
providers are offline.

=== PAGE 24 ===
TIER ONE  /  LAUNCH REWORK BRIEF
24
Free-agent coverage
Include free agents in the searchable player database and the appropriate Career / Market / saga creation pools.
Provide a Free Agents filter or browse state. A free agent still has a player identity, position, nationality and
portrait even though current club is null by design. Preserve previous-club history as history, not as the current
club.
Do not assume every free agent is a valid rumor or eligible for every saga. Eligibility depends on the game mode
and evidence. A Free agent may sign, remain unattached, join a different club or be the subject of a false rumor.
Define how these cases map to the mode's outcomes before generating boards. Avoid implying that a real
transfer has occurred because a rumor changed or a model inferred it.
Preserve fairness and saved gameplay
The live database powers discovery, current metadata and newly generated content. Competitive boards need
immutable, server-created snapshots. Freeze each Daily's player identities, displayed club context, saga setup,
source answers, outcome, seed and scoring rules for its full availability period. Freeze the same inputs for a
multiplayer round when it opens. A roster refresh must never change a started board or alter a settled score.
For historical calls and replays, store the relevant player-data snapshot / version and show the club context that
applied when the call was made. New calls can use fresh metadata. Cache safely for offline viewing and clearly
indicate stale data when it matters. Reconcile records without deleting identities that are still referenced by an
active board, call, profile, result or historical replay.
App surfaces
Update the player list wherever it appears: search and filters in Transfer Market; Player File; Career saga
generation; source / rival story text; player cards; Press Room recaps; profile / collection displays; notifications
and share cards. Render names, current club, player status, position and nationality from structured current
data. Keep images as separate approved assets so a text update does not require repainting art.
Show a compact freshness label where current status affects a decision, such as "Squad data checked today" or
the actual last-check date. Make the Free Agents filter discoverable without giving it the visual weight of the
Daily CTA. Explain a stale or unavailable feed simply; never present old club information as live fact without a
timestamp.
Operations, monitoring and QA
Instrument refresh started / succeeded / failed, records added / changed / retired, unresolved club IDs, duplicate
candidates, source disagreements, stale data age and time from source update to player-facing publication.
Alert on repeated failure, an unusually large change set, rising stale-player counts or disagreement between
primary sources. Provide an admin retry / review path and an audit trail.
Test: Salah's Liverpool-to-Trabzonspor club update as a historical example; an official signing; transfer to a new
club; release to free agency; free agent signing a new club; loan with parent club; retirement; two players with
the same name; provider ID changes; conflicting sources; null or malformed fields; duplicate imports; provider
outage; delayed feed; timezone / daylight-saving boundaries; and migration of old local player IDs. Verify
English, Arabic RTL and Spanish labels, search, caching and historical calls.
Acceptance criteria
1. Player / club data refreshes automatically at least daily, with measured schedule and run status. 2. Supported
live changes can arrive between daily reconciliations without a mobile-app release. 3. Free agents are
identifiable, searchable, and distinct from unknown / unavailable records. 4. Player art never hard-codes a club
name, badge, shirt sponsor or current status. 5. A roster update never changes an active Daily, multiplayer
round, published call, settled score or historical replay. 6. Current status can be traced to a source and
last-checked time; stale data is detectable. 7. A source outage preserves the last known good dataset and
reports that it may be stale. 8. No unverified rumor is promoted into the player's confirmed current club.

=== PAGE 25 ===
TIER ONE  /  LAUNCH REWORK BRIEF
25
Addendum C. Decision and implementation cautions
This brief asks Astra to conduct audits and simulations; it is not evidence that those audits have already been
completed. Treat existing v3.7 figures as baselines to investigate. Do not describe a proposed target or
simulation plan as a result until the code, source data and game math have actually been examined.
The anime direction is approved as the visual approach for character concepts. The specific fictional faces and
player portrait shown here are examples. Final in-game use still needs consistent asset production, working
layouts at mobile sizes, and approved rights for assets depicting real players.

# Tier One 3.x numbers inventory (before the 4.0 overhaul). Paths relative to games/tier-one/v3/web/src unless api/.

Money: three disagreeing systems — wallet.ts:57-62 packs 100/350/800/1800 cr; monet.ts:417-421 coin packs; api/tier-one/v4/config/catalog.json 20/60/140 cr, gold 50 cr. Earned-credit tables differ client vs server. Credit-earning functions (awardFirstTier1, awardStreak, awardSeasonEnd, onFirstWindowFinished, applyPurchase; wallet.ts:119-125,279,297) never called. Two shops: Pass.tsx:144 (season.ts buyCosmetic) and Customize (catalog/wallet).
Dead: weekly event rule deltas (season.ts:306-323, never applied), Book Lv3 discount (byline.ts:88-97), GIFT_MIN_LEVEL, doubleMissions, grantEarned (DD Live looks unwinnable), Home ModeBar/PressPass, bylineStyle() never called.
Duplicates: "credibility" = byline rep / Wire Cred / story rep; ranks blogger…tierone vs league stringer/reporter/correspondent/editor/tierone; season calendars client vs server; winter close 2 vs 3 Feb; follower milestones; league points copied in Results.tsx:40; DD stakes hardcoded in DDLive.tsx:180; hidden 20 coins every 400 PP meta.ts:286-291; isoWeek x3.
Coin paths bypassing credit(): Wire star coins Wire.tsx:68, missions, ad doubler.
Rule leaks: bought favours ignore cap; Practice second opinions; challenge replays use plain RULES (social.ts:232, index.js:567-590).
Crown icon: ~10 meanings, often unlabelled: Me hub Pass tile (Me.tsx:41), BadgeRow medals crown ×N (ui/awards.tsx:18,25), Boards top 3 (Boards.tsx:55), #1 in tables (Wire.tsx:151, DDLive.tsx:193, Rooms.tsx:312, Newsroom.tsx:75,165), prize cards (awards.tsx:42), Gold (customize.tsx:255), Career flair (Editor.tsx:28), challenge win (Rooms.tsx:202), feed level (connect.tsx:57), trophies t1/t1x3/rank5. Unlabelled: Home ContactsMini level numbers (Home.tsx:251), ticker ▲heat (Home.tsx:89), showcase thumbs (customize.tsx:101), trophy shelf names only in title tooltips (Me.tsx:71-74).

Modes:
- Daily: server seed daily-<UTC date>+salt, RULES, buildCast n=SAGAS (index.js:132-134,283); Daily No.1 = 2026-09-01 (index.js:29, Front.tsx:12, Practice.tsx:14); DD clock DD_SECONDS+4s grace (index.js:30,136-138); leaderboards day/week top 25 (index.js:28,31); par median (184-189); league pts T1 30/T2 20/T3 12/T4 6/Spiked 2 (index.js:38,158). Awards meta.ts:311-337 (5 coins +5 T1; PP 20+15/10/5); prizes awards.ts; T1 → Wire credit (desk.ts:20,158-162).
- Practice: local, RULES+AGAIN at book lvl5 (driver.ts:10-13); past Daily seeds (Practice.tsx:35); Coach; PP 10 first 3/day (meta.ts:343); followers ×0.25.
- Career: careerRules career.ts:55-70, per-rank table career.ts:14-20, leak/kitman street by club relation (60-64), Vince plant rank3+ (80-96), favours (145-158, start burner1 tipoff1), trust (36-48), promotion windows+rep gates (161); storyMode.ts chapters (194,203,226-231); onCareerDone meta.ts:350-364; rename 250 coins Story.tsx:258,465.
- DD Live: server 5 sagas from 12 hottest rumours (index.js:740,756-773), right [10,22,40]×1.25 first 12h, wrong −[4,12,30] (index.js:743,797-801; live.ts:324; DDLive.tsx:180); one call + one U-turn.
- Wire: wire.mjs:5-19 limits, wirePoints wire.mjs:75-89, heat index.js:365; star coins Wire.tsx:37,67; PP 5/10 meta.ts:366-367; rep +1/−2.
- Rooms: seed room-<code>-r<n>, Daily rules (index.js:130), rounds (index.js:405, Rooms.tsx:34), standings social.ts:120-131, PP 15, scalp 50 coins (social.ts:47,92-95).
- Challenges: index.js:567-590, social.ts:189-198.
- Newsroom index.js:695-712; weekly league index.js:845-870 (div 30, top/bottom 6, 5 divisions, Wire cap 150).
- Weekly events season.ts:306-323.

Progression: PP table meta.ts:275,327,343,360,365-367, progress.ts:154; Pass seasonLevel season.ts:28-32,61-65 (40 levels); rep tiers byline.ts:46,56,218-226; followers byline.ts:39-55; hot streak byline.ts:228; Contacts Book byline.ts:70-71,233-247,297-299,395-409; rivals byline.ts:102,266-267; streak meta.ts:315-324; style.ts:57-66.
Economy: missions progress.ts:101-115; achievements meta.ts:264-268; prizes awards.ts:15-21; Pass lanes season.ts:105-117 (+10% gold season.ts:91); follower milestones byline.ts:59; season store season.ts:165-181; catalog.ts:70-132,179-215,359-376; favour 15 coins Pass.tsx:155; refunds wallet.ts:48; monet.ts:409-424 (MONET off).

// Banter (TIERONE-SAIF-01/02): the reactions under your calls on the results page. Fans, rival journalists and your own
// sources, per outcome (right, wrong, loud, soft, exclusive, late, Deadline Day, U-turn, twist, silence) and per tier.
// Restored from the classic game (tier-one-classic/index.html: roast/praise pools, ureply, sreply, rivalmsg) and the
// lane/content fan-reply pools (commit 2f2ed0c), trimmed to PG-13, then extended for 3.2: rival jabs and concessions,
// source smirks, the user's own tweets, tier quips and idioms. Each language keeps its own voice; none is a translation.
// Placeholders: {p} player, {d} the club he was linked with, {c} his club, {h} the club that hijacked him, {n} a day.
// Lines are picked deterministically per result (lib/banter.ts), so a share card and a reload always agree.
export default {
  "en": {
    "bn": {
      "ui": {
        "calls": "Your calls",
        "callsAside": "{a} of {b} right",
        "seeAll": "See all {n} replies",
        "allReplies": "The mentions",
        "breakdown": "Full breakdown",
        "breakdownAside": "Every point, shown",
        "board": "Leaderboard",
        "roomBoard": "Room table",
        "desk": "Career desk",
        "share": "Share",
        "close": "Close",
        "ratio": "Ratio’d",
        "hot": "Trending",
        "replying": "Replying to {h}",
        "rival": "Rival",
        "source": "Source",
        "fan": "Fan",
        "you": "You",
        "quiet": "Left on read",
        "quietN": "No call on {n}",
        "quietTap": "See what they said",
        "likes": "Likes",
        "reposts": "Reposts",
        "replies": "Replies",
        "pub": "Pub verdict",
        "boardEmpty": "Nobody has filed yet. Be first.",
        "boardOff": "The table needs a connection.",
        "boardYou": "You’re {r} of {n}",
        "practiceBoard": "Practice is off the record. No table, no witnesses.",
        "openRoom": "Open the room",
        "score": "Score",
        "rank": "Rank",
        "right": "Right",
        "wrong": "Wrong",
        "excl": "Exclusive",
        "none": "Not filed",
        "dayN": "Day {n}",
        "deleted": "Deleted tweet",
        "tapHint": "Tap for the full thread"
      },
      "tweet": {
        "pre": [
          "👀 Hearing",
          "📈 Moving:",
          "🚨 CONFIRMED:"
        ],
        "ut": "✏️ Correction.",
        "o": {
          "0": [
            "{p} to {d}. Medical booked, pen warm.",
            "{p} → {d}. Shirt’s at the printers.",
            "{p} is going to {d}. Book it."
          ],
          "1": [
            "{p} leaves {c}, but not for {d}. Someone’s gazumped them.",
            "Late gatecrasher for {p}. {d} left standing at the altar.",
            "{p} is off, just not to {d}. Hijack."
          ],
          "2": [
            "{p} to {d} is dead. {c} dug their heels in.",
            "Talks for {p} have collapsed. {d} walk away.",
            "{p} stays put. The {d} deal is off."
          ],
          "3": [
            "{p} to {d}? Never real. Agent smoke.",
            "Nobody from {d} has rung about {p}. Fiction.",
            "{p}/{d}: there were never any talks."
          ]
        }
      },
      "fans": [
        [
          "Kev the Kopite",
          "@kopite_kev"
        ],
        [
          "Gooner Gaz",
          "@gooner4life"
        ],
        [
          "Barry Blue Moon",
          "@bluemoon_barry"
        ],
        [
          "Toon Army Tam",
          "@toon_army_tam"
        ],
        [
          "Villa Till I Die",
          "@villa_til_i_die"
        ],
        [
          "Hazel (Hammers)",
          "@hammers_hazel"
        ],
        [
          "Sunday League Sid",
          "@sunday_league_sid"
        ],
        [
          "FPL Fraudster",
          "@fpl_fraudster"
        ],
        [
          "Ball Knowledge Bob",
          "@ballknowledge_bob"
        ],
        [
          "Terrace Tony",
          "@terrace_tony"
        ],
        [
          "Pie at Half-time",
          "@pie_at_halftime"
        ],
        [
          "Row Z Ronnie",
          "@row_z_ronnie"
        ],
        [
          "VAR Victim",
          "@var_victim"
        ],
        [
          "Scarf in July",
          "@scarf_in_july"
        ],
        [
          "Your Nan",
          "@nan_follows_you"
        ],
        [
          "Pub Quiz Paul",
          "@pubquiz_paul"
        ],
        [
          "Deadline Dave",
          "@deadline_dave"
        ],
        [
          "Tactics Tina",
          "@tactics_tina"
        ],
        [
          "Offside Ollie",
          "@offside_ollie"
        ],
        [
          "Groundhopper Gemma",
          "@groundhop_gem"
        ]
      ],
      "tierQuip": {
        "T1": [
          "Front page, above the fold, and the editor bought the first round.",
          "Hold the presses. Actually, don’t: they’re printing you.",
          "You’re not in the know. You ARE the know.",
          "The group chat has gone quiet. That’s respect.",
          "Here we go. And you went there first.",
          "Worth your weight in back pages.",
          "Agents are saving your number under “do not lie to”."
        ],
        "T2": [
          "Solid shift. Not front page, but the back page loves you.",
          "A good day at the office. Nobody’s framing it, but nobody’s laughing.",
          "Close enough to smell the ink on the front page.",
          "Tidy. Like a 2–0 away win in the rain.",
          "Decent. Your mum would share this.",
          "One more scoop and they’d have cleared the front page for you.",
          "Good enough for a nod from the press box."
        ],
        "T3": [
          "Page nine, next to the bingo results. It still counts.",
          "Mid-table. Safe, unspectacular, very Tuesday.",
          "Not a disaster, not a documentary.",
          "The editor nodded. Didn’t smile. Nodded.",
          "A point away from home. Take it and get on the bus.",
          "You got some right. You got some very wrong. Football.",
          "Your credibility is on loan. Try to keep it."
        ],
        "T4": [
          "In the paper. Just. Below the crossword.",
          "Squeaky bum time for your credibility.",
          "The fans are singing, just not your name.",
          "Survived on goal difference. Barely.",
          "Parked the bus and still conceded.",
          "The editor wants a quiet word. The quiet kind.",
          "The group chat is typing. Brace."
        ],
        "SPIKED": [
          "Spiked. The editor wrapped his chips in your story.",
          "Row Z. Your takes ended up in Row Z.",
          "Bottled it. Then dropped the bottle.",
          "The screenshots are already in three group chats.",
          "Hollywood tweets, Sunday league sources.",
          "Take a breath. Delete the app. Reinstall it tomorrow.",
          "Even the barber has muted you."
        ]
      },
      "idiom": {
        "up": [
          "Early doors, and bang on.",
          "Proper ball knowledge.",
          "Scenes. Absolute scenes.",
          "Worth the entrance fee.",
          "Top bins.",
          "Took it one game at a time and won the lot.",
          "Cool as you like on deadline day.",
          "Like a hot knife through a back four.",
          "The boy done good.",
          "Over the moon, and so is your editor.",
          "Hit the ground running and never stopped.",
          "On fire. Your sources are on fire."
        ],
        "down": [
          "A game of two halves. Both bad.",
          "Bottled it.",
          "Handbags at dawn.",
          "All the gear, no idea.",
          "Hollywood pass, Sunday league finish.",
          "Couldn’t hit a barn door.",
          "Sick as a parrot.",
          "Lost the dressing room. And the phone signal.",
          "Schoolboy error.",
          "You win nothing with sources like these.",
          "Back to the drawing board. Bring a rubber.",
          "Parked the bus in your own mentions."
        ]
      },
      "fan": {
        "roast": [
          "{p} to {d}?? bro really said that with his chest 💀",
          "delete this and log off 😭",
          "my uncle works at {c} and he said you're capping",
          "screenshotting this for when it ages like milk 🥛",
          "tier 9 behaviour honestly",
          "the confidence… the wrongness… iconic",
          "ratio + you fell off + {p} is laughing at you",
          "this tweet has aged like a banana in a sauna 🍌",
          "your source is your mum's group chat",
          "this tweet aged like a banana in a sauna 🍌",
          "made it up on the bus, didn't you",
          "sources: trust me bro 🧢",
          "absolute fraud. unfollowing",
          "{d} don't even know about this lmao",
          "clown shoes on, honk honk 🤡",
          "you'd get lost in a phone box, never mind a transfer window",
          "getting outscooped by the Tabloid… couldn't be me",
          "bro got his info from a FIFA loading screen",
          "this is why your mum doesn't tell people what you do",
          "even the barber knew. THE BARBER.",
          "actual muppet behaviour",
          "journalism degree from the back of a cereal box 🥣",
          "blud posted this with 'CONFIRMED' on it 😭😭",
          "{p}'s agent just blocked you out of pity",
          "printing this and framing it in the loo",
          "you are the reason Community Notes exists",
          "even {c}'s kitman is laughing at you",
          "bin this. bin your phone. start again.",
          "who are your sources? wikipedia and a vending machine?",
          "you got this off a FIFA reddit thread lmao",
          "the audacity. the sheer audacity.",
          "bro thinks he's ITK with this nonsense 😭",
          "your OPSEC is you tweeting from the nightclub toilet",
          "this man really said {p} to {d} with his ENTIRE chest",
          "the way you typed 'confirmed' makes it extra funny",
          "sources: your cat walked across your keyboard",
          "my guy you're 6 games into FM22, sit down",
          "bro woke up and chose VIOLENCE... against his own credibility",
          "you couldn't break a story if your life depended on it",
          "the barber's barber knows more than you",
          "absolute state of this take 💀",
          "i'm gonna remember this when {p} actually moves",
          "this aged better than milk in a heatwave",
          "your journalism professor is crying rn",
          "even ChatGPT could've done better lmao",
          "bro called {p} to {d} and {d} are googling who {p} is",
          "your sources: the comments section of a highlight reel",
          "reading this tweet cost me 3 IQ points",
          "you're the reason I have notifications OFF",
          "sir this is a transfer window, not a creative writing class",
          "{p} to {d}? my Sunday league keeper has better intel",
          "deleting this would be the first good call you've made all week",
          "this is gonna live in the Hall of Shame next to the 'lad who tweeted the wrong year'",
          "I've seen weather forecasts in April more accurate than this",
          "your source is a Magic 8 Ball with a Twitter account 🎱",
          "this take is so cold it's got its own penguin",
          "you had one job. and you did the other job.",
          "the only thing you broke today was your own reputation",
          "bro wrote 'here we go' and the lads went nowhere",
          "{c} fans are printing this on t-shirts ironically",
          "you're not ITK, you're OTK: out the know",
          "even the pigeons outside {c}'s ground knew this was wrong",
          "your 'exclusive' was exclusively wrong",
          "honestly impressive to be this wrong with this much confidence",
          "strangers owe you nothing and they're still laughing",
          "you should be banned from typing the word 'sources'",
          "the journalism equivalent of scoring an own goal from the halfway line",
          "someone check on this guy, he's been in the sun too long",
          "going in the group chat with 'look at this clown'",
          "bro's crystal ball came from a Christmas cracker",
          "this is the worst call since the one my nan made to the wrong number",
          "I've unfollowed and refollowed just to unfollow you again",
          "your hit rate is lower than a 0-0 in the rain",
          "imagine being out-scooped by a barber in a hairnet"
        ],
        "praise": [
          "ONE OF THE BEST ✍️",
          "called it days ago, respect 🫡",
          "this is why we follow you",
          "{d} fans are SCREAMING rn",
          "tier one behaviour 🥇",
          "never doubted you (I doubted you)",
          "the man never misses 🎯",
          "absolute ball knowledge 🔥",
          "who is feeding this guy?!",
          "get this man a TV show 📺",
          "bow down 🙇",
          "scenes. absolute scenes.",
          "this lad lives in the {d} boardroom",
          "sorry for calling you a fraud last week",
          "put some respect on his name",
          "certified in-the-know. no notes.",
          "my feed isn't ready for this much sauce",
          "right AGAIN. who's his source, God?",
          "the agent's crying rn 😂",
          "notifications on for this guy",
          "absolute ghost, you're in the walls",
          "I'd let this man pick my lottery numbers",
          "this is the tweet they'll show in the documentary",
          "weapon. absolute weapon.",
          "this is ELITE journalism right here",
          "how did you even get this info before the clubs?",
          "you're living in {d}'s boardroom rent-free 🏠",
          "the way you nailed the timing tho 👀",
          "your source is literally Tier 0",
          "bro is just built different when it comes to scoops",
          "imagine if every journo was this reliable... signed up 🔥",
          "{p} to {d} the MOMENT you said it? poetry",
          "you don't miss. you just don't.",
          "this is the content I pay for",
          "Tier One confirmed 🥇 (you, not the game)",
          "your accuracy rate is absolutely mental",
          "mate you're in the {d} WhatsApp aren't you",
          "the precision… the confidence… *chef's kiss*",
          "you've got a different briefing it seems",
          "notifications absolutely ON for this account",
          "stop it, you're too good at this 😤",
          "I'm printing this tweet and putting it on my fridge",
          "nah he's got a microphone in every boardroom",
          "this is the Ballon d'Or of tweets 🏆",
          "HERE WE GO?? no, HERE YOU GO. legend.",
          "he's not ITK, he IS the K",
          "even {c} fans have to respect this",
          "every other journo in shambles",
          "your sources have sources",
          "deleting my own account, you've made me redundant",
          "mate you're the Google Maps of transfers 🗺️",
          "called it before the players even knew",
          "a transfer window without you would be a crime",
          "my dad's been following you since the fax machine days",
          "sharper than a barber's fresh fade 💈",
          "Twitter's best journo, and it's not close",
          "putting your tweets in my will",
          "the clubs should just hire you as their press officer",
          "the kind of scoop that ends careers. other people's.",
          "somebody give this account a knighthood 🫡",
          "tier one? more like tier zero, flawless"
        ],
        "excl": [
          "how are you ALWAYS first 😭",
          "the rest of twitter is reading your tweets rn",
          "first AND right. unreal",
          "everyone else is quoting you now",
          "before {d} even announced it. who IS your source",
          "you had {p} before {p} had {p}",
          "the exclusive of the window, no debate",
          "every rival account just went quiet",
          "the clubs should be paying you for PR",
          "you broke it, they confirmed it. simple",
          "news agencies are copying your homework 📝",
          "first to it and nobody close",
          "that's not a scoop, that's a whole tub",
          "rivals refreshing your page for their next tweet",
          "exclusive and correct. frame it"
        ],
        "late": [
          "another account had this days ago but ok 🙄",
          "welcome to yesterday's news",
          "right, but the Tabloid beat you to it",
          "nice, now check the timestamps",
          "correct and fashionably late",
          "the insiders had this before breakfast",
          "you're right. so was everyone else",
          "arriving at the party as the lights come on",
          "late but right. the {d} bus already left",
          "good call, bronze medal though 🥉",
          "first to be second",
          "copied the homework but got the marks",
          "the ITK crowd called this on day 3",
          "right answer, rival timestamp",
          "reposting what we already knew, love that"
        ],
        "dd": [
          "deadline day merchant 🕐",
          "cutting it fine AND right??",
          "ice in the veins at the buzzer",
          "called it with seconds on the clock. absolute cinema",
          "the fax machine was still warm when you posted",
          "deadline day's calmest man",
          "waited until the last minute and nailed it",
          "that's a last-minute winner",
          "most people panic on deadline day. you delivered",
          "last call, right call",
          "the clock said panic, you said {p} to {d}",
          "clutch. pure clutch",
          "doing your best work at 11:59",
          "deadline day specialist, book him for next year",
          "the final whistle scoop"
        ],
        "softRight": [
          "whispered it, and it came true 🤫",
          "said “hearing” and heard right",
          "quietly correct. the best kind",
          "should’ve gone louder, mate. you HAD it",
          "a nibble, not a bite, but you were right",
          "soft-launched the truth 👀",
          "tiptoed in and it was the right room",
          "right, but you said it like you were ordering a flat white",
          "the humble brag of transfer tweets",
          "next time trust yourself and hit CONFIRMED",
          "low stakes, high accuracy. sneaky",
          "had the scoop and whispered it into a pillow",
          "right and modest. who raised you",
          "a tap-in you celebrated like a throw-in"
        ],
        "softWrong": [
          "hedged it at least 😅",
          "'talks ongoing' doing a lot of work there",
          "good thing you only whispered it",
          "wrong, but quietly wrong",
          "you said 'hearing', we heard wrong",
          "the 👀 emoji saved you there",
          "cautious and still off",
          "tiptoed into the wrong answer",
          "that's why you didn't go loud",
          "a quiet miss, we'll let it slide",
          "low confidence, correctly placed",
          "at least you didn't put CONFIRMED on it",
          "soft take, soft landing",
          "you hedged, it hedged, nobody won",
          "barely a tweet, barely a miss"
        ],
        "loudWrong": [
          "CONFIRMED in capitals and still wrong. brave",
          "the megaphone made it worse 📢",
          "put your name on it and everything",
          "loudest tweet of the window, wrongest too",
          "shouted it from the rooftops, fell off the roof",
          "the confidence-to-accuracy ratio is historic",
          "'confirmed' has left the chat",
          "announced it like a club statement. it wasn't",
          "all caps, no facts",
          "going loud was a choice",
          "this one's getting quote-tweeted for years",
          "the ratio is bigger than the scoop",
          "you put the house on it and lost the house",
          "that 📢 is echoing in an empty room",
          "volume ten, accuracy zero"
        ],
        "silence": [
          "no take on {p}? scared?",
          "bottled it by saying nothing",
          "silent on {p} all window. suspicious",
          "the one saga you ducked 🦆",
          "no call? the timeline noticed",
          "too busy or too nervous?",
          "{p} moved and you were on mute",
          "left {p} on read",
          "not a single word on {p}. hmm",
          "hid behind the sofa for this one",
          "no call, no credit",
          "skipped {p} like a hard exam question",
          "we were waiting for your {p} take all week",
          "quiet on {p}. very quiet",
          "even a guess would have been something"
        ],
        "uturnRight": [
          "Right in the end. The delete button did most of the work though.",
          "Correct after a U-turn. Even a broken clock deletes its first tweet.",
          "Screenshot of your first take is already in the group chat, just so you know.",
          "Got there eventually. Via the scenic route and a public meltdown.",
          "Took two drafts and a panic, but fine. FINE.",
          "Right answer, wrong journey. We all saw the deleted post.",
          "A win is a win, but that flip-flop is going in the season highlights.",
          "Congrats on being right the second time. The first time is archived forever.",
          "Right in the end, but that first tweet is living rent-free in my camera roll 📸",
          "Correct answer, submitted on the second attempt. Partial marks.",
          "You got there. So did your delete button. Split the credit.",
          "Right, yes. Brave, no. We saw the wobble.",
          "Nobody's framing a U-turn, mate. Even a correct one.",
          "The final answer was right. The final answer was also your second answer.",
          "Congrats on correcting yourself before {c} did it for you.",
          "Called {p} to {d} eventually. Via a detour through Wrongtown.",
          "Right on the retake. Sunday league rules apply, I suppose.",
          "You changed your mind and the universe agreed. Lucky.",
          "I respect it. I also screenshotted the first one. Both true.",
          "Ended right, started wrong. The group chat remembers the start.",
          "This is a win with an asterisk the size of {c}'s stadium.",
          "Correct! Now explain the tweet you deleted on camera.",
          "Flip-flopped straight onto the right answer. Chaotic but fine.",
          "Right call, half the points, full the embarrassment.",
          "You were wrong, then right. Classic character arc 📈",
          "The second draft was great. The first draft is in the museum.",
          "Got it right after binning the first take. Growth, I guess.",
          "Scored on the rebound. Still counts, still ugly.",
          "Right in the end. Your first take will be at your leaving do.",
          "You saved it. We're still talking about why it needed saving.",
          "Corrected your own homework and handed it in late. B minus.",
          "The U-turn worked. The screenshot folder still works too.",
          "Right answer with a U-turn stapled to it. Nice.",
          "Big respect for fixing it. Small respect for the first version.",
          "Right at the second time of asking. {p} would have scored the first.",
          "You deleted, you recalled, you were right. Chaos merchant 🌀",
          "Correct! Tell us who talked you out of the first one though.",
          "Right, but only after taking the long way round the M25.",
          "We'll call it a win. The deleted tweet disagrees.",
          "Nailed it on the second go. The first go is in my drafts forever.",
          "got there in the end, fair play 🫡",
          "character development 📈",
          "admitting you were wrong > being wrong loudly",
          "took the scenic route but you're right",
          "changed your mind when the facts changed. rare on here",
          "humble enough to delete, sharp enough to be right. respect",
          "most accounts would've doubled down. you fixed it",
          "the redemption arc we needed",
          "fair play, the second call was spot on",
          "right in the end is still right",
          "proper journalism is updating when you're wrong tbh",
          "you read the room and flipped at the right time",
          "not many would own that. fair play",
          "honestly the correction was the best tweet of your window",
          "came back from the brink. clutch"
        ],
        "uturnJab": [
          "we all saw the first tweet 📸 screenshots are forever",
          "flip-flopped into the truth lol",
          "delete button merchant",
          "the screenshot folder remembers",
          "right now, but the archive says otherwise",
          "your first take is pinned in the group chat",
          "funny how the first tweet vanished",
          "we're not forgetting the original take on {p}",
          "backspace doing the heavy lifting here",
          "weather vane journalism 🌬️",
          "right answer, but you tried every answer first",
          "somebody check the deleted tweets folder",
          "you didn't call it, you corrected it",
          "two tweets, one of them hidden. hmm",
          "the U-turn was quicker than {p} on the break"
        ],
        "uturnWrong": [
          "Deleted a tweet to be MORE wrong. Genuinely impressive.",
          "U-turned straight into a wall.",
          "Your first take was wrong too, but at least it was consistent.",
          "Two calls, zero right. A clean sheet of the bad kind.",
          "Flip-flopped and still fumbled. Hand the laptop over.",
          "Imagine deleting a tweet for THIS.",
          "The U-turn was the most confident thing you did all window. Still wrong.",
          "Went back to the drawing board and drew a clown.",
          "Deleted one wrong take to publish a fresh wrong take. Efficient.",
          "Two tweets on {p}. Zero correct. That's a full set.",
          "You had two goes at this and missed the target both times.",
          "The U-turn was supposed to fix it, mate. That's the whole point.",
          "Changed lanes and crashed anyway 🚗",
          "Should've kept the first one. It was also wrong but it was loyal.",
          "Wrong, deleted, wrong again. The trilogy nobody asked for.",
          "You panicked and it showed. Twice.",
          "Swapped a wrong answer for a different wrong answer. Bold strategy.",
          "Deleting tweets won't save you from THIS one.",
          "The flip. The flop. The flop again.",
          "Two different answers and {p} ignored both of them.",
          "You spun the wheel twice and it still landed on clown.",
          "Went back for another go and fell over the same kerb.",
          "Rewrote history and history still said no.",
          "That U-turn had the confidence of a man reversing into a lamp post.",
          "New tweet, same outcome: wrong.",
          "Double or nothing and you took the nothing.",
          "Two calls on {p} and neither survived contact with reality.",
          "Even the delete button is embarrassed now.",
          "If at first you don't succeed, apparently fail louder.",
          "You corrected yourself into a worse position. Impressive navigation.",
          "{c} fans have both screenshots and they're making a carousel.",
          "Two takes, one player, zero clue.",
          "Unlucky. Well, not unlucky. Wrong twice.",
          "The U-turn was the only confident thing you did. Still wrong.",
          "Brought a second opinion. It was also yours. Also wrong.",
          "First take: wrong. Second take: also wrong. Third take: please don't.",
          "You didn't change your mind, you changed your mistake.",
          "Wrong in stereo 🔊",
          "That's a double fault. Back to the baseline.",
          "Deleted and repeated the failure in HD.",
          "deleted a wrong tweet to post another wrong tweet 💀",
          "two takes, zero correct",
          "flipped and flopped",
          "should've kept the first one tbh",
          "U-turn straight into a ditch",
          "new take, same miss",
          "backed the wrong horse twice",
          "changed your answer and still failed the exam",
          "the second guess was worse somehow",
          "wrong in two different ways. creative",
          "deleted for THIS?",
          "not one but two wrong calls on {p}",
          "the U-turn didn't turn anything",
          "rewrote it and still got an F",
          "panic delete, panic post, panic wrong"
        ],
        "pity": [
          "respect for trying twice honestly",
          "unlucky, the first one was closer 😅",
          "at least you're persistent",
          "fair play for owning the delete",
          "tough window, you'll bounce back",
          "it's a hard one to call tbf",
          "nobody saw this coming, you're fine",
          "half the timeline had it wrong too",
          "sending a hug to your mentions",
          "you tried, that's more than most",
          "brave to post twice. wrong, but brave",
          "shake it off, fresh board tomorrow",
          "this saga was chaos, can't blame you fully",
          "gutted for you, the first read was reasonable",
          "one bad beat doesn't make a bad journo"
        ],
        "twistCalled": [
          "called the twist before the twist happened. wizard",
          "you knew about {p} before the wire did",
          "everyone else got twisted, you got it right",
          "saw it coming from a mile off 🌀",
          "the story changed and landed on YOUR tweet",
          "called the plot before the plot",
          "how did you know the rug was getting pulled",
          "the twist confirmed your tweet. unreal",
          "the wire played catch-up with you",
          "you were in the writers' room for this saga",
          "stuck with it through the chaos and got paid",
          "nobody believed you on {p}. everybody does now",
          "you read the ending first, didn't you",
          "the twist was only a twist for everyone else",
          "prophecy-grade call on {p}"
        ],
        "twistCaught": [
          "you were right on Tuesday, wrong by Sunday",
          "got twisted like a dishcloth 🌀",
          "the story changed and you didn't",
          "right at the time, wrong at the whistle",
          "the twist hit and your tweet was still standing there",
          "that's what happens when you don't refresh",
          "your call aged in real time",
          "the plot moved on, you stayed put",
          "had it, then the saga had other ideas",
          "out of date before the window even closed",
          "the wire warned everyone. you were napping",
          "reads were true until they weren't",
          "unlucky with the twist, but you could've updated",
          "yesterday's truth, today's L",
          "the twist said goodbye and you didn't wave back"
        ],
        "twistUpdated": [
          "saw the twist and updated. that's the job",
          "reacted to the news like a pro",
          "the story changed and so did you. right move",
          "quick on the update 🌀",
          "most people froze after the twist. not you",
          "adjusted after the wire and nailed it",
          "that's how you handle a plot twist",
          "stayed on top of the chaos, fair play",
          "read the new info and reacted fast",
          "updated faster than the club website",
          "the twist didn't catch you out",
          "changed your call for the right reason",
          "pivoted at the perfect moment",
          "a twist, a rethink, a right call",
          "flexible and correct. deadly combo"
        ]
      },
      "rival": {
        "gloat": {
          "tabloid": [
            "HAHA. Told the whole country on day {n}. You told nobody anything true.",
            "Back page, front page, YOUR page: all wrong. Stick to the crossword, pal.",
            "Some of us have sources. Some of us have a barber. 💇",
            "We were right AND loud. You managed neither."
          ],
          "itk": [
            "👀",
            "Some of us knew. Some of us guessed. Moving on.",
            "Said it days ago. Didn’t shout. Didn’t need to.",
            "Hearing you should have listened."
          ],
          "insider": [
            "Understand the correct position was reported here on day {n}.",
            "For the record: we had it. Nothing personal.",
            "Sources close to the story say you were not close to the story.",
            "We’ll keep a desk warm for you. In the post room."
          ]
        },
        "concede": {
          "tabloid": [
            "Fine. FINE. You had it. We’re reprinting the back page. 😤",
            "Who’s your source and how much do they want to leak to us instead?",
            "Our editor has asked who you are. Loudly.",
            "Alright, you win this one. Enjoy it. We’ll be back tomorrow in 96-point type."
          ],
          "itk": [
            "Respect. Genuinely. Don’t get used to it.",
            "Well played. Deleting my drafts.",
            "...ok that one was good.",
            "Hearing you’re annoyingly good at this."
          ],
          "insider": [
            "Credit where it’s due. A clean scoop.",
            "Can confirm: they had it first.",
            "We stand corrected. It happens. Rarely.",
            "A proper piece of work. The press box noticed."
          ]
        },
        "smug": {
          "tabloid": [
            "Welcome to the party, mate. We’ve eaten all the sausage rolls. 🌭",
            "Nice of you to join us. Day {n} called, it wants its scoop back.",
            "Copying our homework? At least change a few words.",
            "Right, yes. Second, also yes. 🥈"
          ],
          "itk": [
            "Early is a mindset. Late is a timestamp.",
            "Glad you got there. Eventually.",
            "Hearing you’ve finally heard.",
            "Some of us were there on day {n}. Just saying."
          ],
          "insider": [
            "As reported here on day {n}.",
            "Pleased to see our story confirmed. Again.",
            "Our timestamp is available on request.",
            "Welcome aboard. The story left the station on day {n}."
          ]
        },
        "alsoWrong": {
          "tabloid": [
            "Don’t look at me, we got it wrong too. At least ours was in 72-point type.",
            "Misery loves company. Pint?",
            "We were BOTH stitched up. Blame the agent. We always do.",
            "Two wrongs don’t make a right. They make a very funny group chat."
          ],
          "itk": [
            "We don’t talk about this one.",
            "Some sagas are best forgotten. Let’s forget it together.",
            "Deleting. Suggest you do the same.",
            "🤐"
          ],
          "insider": [
            "A difficult story for everyone. Including us.",
            "Lessons have been learned. Probably.",
            "No comment. Also no comment on your comment.",
            "We’ll be reviewing our sources. Suggest you do the same."
          ]
        },
        "uturn": [
          "Someone just deleted a {p} tweet 👀 Screenshots exist, pal.",
          "Deleted tweet alert on {p} 🗑️ the archive says hello.",
          "A {p} take just vanished. We have the receipts 📸",
          "Somebody's rewriting their {p} call. We saw the first draft.",
          "{p} tweet quietly deleted. The internet never forgets.",
          "Someone just deleted a {p} tweet 👀 Screenshots exist, pal. They always exist."
        ]
      },
      "src": {
        "agent": {
          "toldYou": [
            "Told you. That'll be 10%.",
            "You're welcome. Invoice is in your DMs.",
            "Called it. My invoice now includes a 'being right' surcharge.",
            "That's what premium intel looks like. Premium prices to follow.",
            "Told you, didn't I. Tell your followers I'm available for weddings and bar mitzvahs.",
            "Right again. I'd frame this but I'll just add it to my rate card.",
            "See? Trust the suit. Consultation fees are due Friday, and yes, I take cards.",
            "You're welcome. Mention me in your bio. Big letters."
          ],
          "ignored": [
            "I literally told you. Are you thick?",
            "I handed you the scoop and you bottled it. Unreal.",
            "I gave you gold and you traded it for a scratchcard. Amazing work.",
            "I told you the truth for FREE. Do you know how rare that is for me?",
            "Next time I'm charging you for the information AND the embarrassment.",
            "I handed you the truth and you tweeted the opposite. Incredible. Were you raised by a rival agency?",
            "I told you. I never tell anyone anything for free and you still binned it.",
            "You ignored me? Me? I've had clubs ignore me less than you just did."
          ],
          "lied": [
            "Business is business, pal 😘",
            "Did I lie? I prefer 'negotiated'.",
            "My client's the one who changed his mind. I merely reflected the market conditions.",
            "I'd call it 'strategically incomplete information'. Anyway, fancy a lunch?",
            "Look, if you wanted the truth you should've paid for the gold package.",
            "Look, I sold you a story. You bought it. That's just business, pal.",
            "You believed an agent. On a transfer. In the window. That one's on you.",
            "Wasn't me who tweeted it, was it? Nope. Your name, your problem."
          ],
          "dodged": [
            "Good instincts. Don't tell my clients.",
            "You didn't trust me? Smart. Hurtful, but smart.",
            "Let's say my bad tip was a loyalty test. You passed. Congratulations. Invoice attached.",
            "You got it right, which was always my plan. Obviously.",
            "Glad you did your own research. Very professional. I was testing you, clearly.",
            "I lied, you got it right anyway. Clearly my coaching is working.",
            "You called it! Brilliant. I obviously planted the idea subconsciously.",
            "Great instinct. Shame it came from ignoring me, but I'll invoice you regardless."
          ]
        },
        "kitman": {
          "toldYou": [
            "Told you he took the good shampoo 😏",
            "Kitman sources never miss, son.",
            "Told you. The laundry basket knows all. 🧺",
            "Right again. You can thank me with a new iron.",
            "The locker never lies. Buy the kitman a bacon roll.",
            "Called it from the drying room. I want my picture on your profile.",
            "Right again. The kitman never misses. Unlike your followers.",
            "Said it, meant it, washed it. You're welcome."
          ],
          "ignored": [
            "I wash his pants and you still didn't believe me?",
            "Next time I'll draw you a picture.",
            "I said it clear as a clean white sock and you still got it wrong.",
            "I've folded shirts with more sense than you, mate.",
            "Next time I'll tape the answer to your forehead with physio tape.",
            "I told you straight and you went the other way. You couldn't find the laundry room with a map.",
            "I gave you the answer on a plate. You sent the plate back.",
            "You ignored the kitman. That's how you end up with muddy boots, pal."
          ],
          "lied": [
            "Sorry lad, I was guessing. Long day in here.",
            "I only know socks, mate, what did you expect.",
            "Honestly? The lads were winding me up. Blame the youth team.",
            "It was a different player's boots. They all look the same in the dark.",
            "I was half asleep in the tumble dryer room. Can't hold that against me.",
            "The lads told me. The lads lie. You should know that by now.",
            "It's a laundry room, not a newsroom. Why were you listening to me?",
            "Not my fault. You took gossip from a man who smells of fabric softener."
          ],
          "dodged": [
            "Fair play for ignoring me, I was miles off.",
            "Didn't listen to me? Good. I was winging it.",
            "You got it right? Good. Pretend I said that all along.",
            "Alright, my info was a bit damp. But you dried it off nicely.",
            "Mixed up two lockers. You didn't. Well played, I suppose.",
            "I got it wrong, you got it right. I'm still taking the credit. Laundry rules.",
            "Lucky you didn't listen, eh? I was on my third coffee.",
            "Fine, you nailed it. I'll wash your socks. Once."
          ]
        },
        "physio": {
          "toldYou": [
            "Clinically correct. As always.",
            "Diagnosis confirmed. You're welcome.",
            "Diagnosis accurate. Fee: one coffee, oat milk.",
            "As predicted. Medicine is a science, mate. Unlike your replies section.",
            "Textbook. You may now thank your physio.",
            "Diagnosis confirmed. Your career has improved, marginally.",
            "I was right. You were right. Only one of us will stop bragging, and it's not me.",
            "Clinical. You're welcome. My invoice is labelled 'consultation'."
          ],
          "ignored": [
            "I said medical. You said something else. Ridiculous.",
            "Should've listened to the doctor, mate.",
            "I gave you a clean bill of health on that intel and you amputated it.",
            "That's clinical negligence, that is. On your part.",
            "I literally prescribed you the answer. You didn't take the tablets.",
            "I gave you a clean diagnosis and you went with a horoscope. Remarkable.",
            "The results were clear. You read them upside down. Twice.",
            "I told you. You ignored me. Symptoms of a terminal case of being wrong."
          ],
          "lied": [
            "Wrong patient file. My bad.",
            "Must've read the scans upside down.",
            "Clerical error. The intern filed him under the wrong club.",
            "Clinically speaking, I was wrong. Legally speaking, I was never here.",
            "That was a different patient. Same first name. Similar knees.",
            "Wrong file, right attitude. You should always seek a second opinion.",
            "Medicine isn't an exact science. Neither is your journalism.",
            "You took a tip from a physio. That's on you, not the physio."
          ],
          "dodged": [
            "Good call ignoring me. I was concussed.",
            "The second opinion was right. Annoyingly.",
            "My scans were blurry. You still read them. Impressive, in a worrying way.",
            "I'm going to classify that as a second opinion and move on.",
            "Misdiagnosis on my part. Correct treatment on yours. Let's never discuss it.",
            "My notes were wrong. Your call wasn't. Let's agree it was teamwork.",
            "Fine, I misread it. You'll find the error was on page 2, which you skipped. Well done.",
            "I'll log that as 'patient recovered despite treatment'."
          ]
        },
        "spotter": {
          "toldYou": [
            "The planes never lie. ✈️",
            "Tail numbers don't lie, bro.",
            "Radar doesn't lie. Neither do I. Now respect the spotters. 🛩️",
            "Called it from the viewing deck. Frame this one.",
            "Told you, lad. Tail number checked, destination confirmed, spotter vindicated.",
            "Tail number never lies. Neither do I. Screenshot this.",
            "Radar says you're finally good at your job. I say it's all me.",
            "Called it from the fence with a flask. Respect the spotters."
          ],
          "ignored": [
            "I sent you the flight path. THE FLIGHT PATH.",
            "Imagine ignoring a plane spotter. Couldn't be me.",
            "I sent you a screenshot WITH the altitude. The ALTITUDE, mate.",
            "The jet was literally in the sky. You looked at the ground.",
            "I stood in the rain for that tip and you bottled it.",
            "I told you the destination and you went the other way. Were you on autopilot?",
            "You ignored the spotter. That's like ignoring the control tower, mate.",
            "I gave you coordinates. You picked a random country off a menu."
          ],
          "lied": [
            "That jet was someone else's. Awkward.",
            "Turns out it was a cargo plane full of bananas. Sorry.",
            "Air traffic control changed it last minute. Take it up with them.",
            "Honestly it was a weather balloon. Easy mistake at dawn.",
            "That tail number was a lookalike. Aviation is full of imposters.",
            "Wrong tail number. Could happen to anyone. Mostly it happens to you.",
            "Look, planes change plans. So should you, clearly.",
            "I watch planes, not contracts. You knew that. You chose chaos."
          ],
          "dodged": [
            "Fair, I was looking at the wrong runway.",
            "Didn't trust my jet? Brutal. Correct, but brutal.",
            "I tracked the wrong plane. You didn't need the plane. Fair.",
            "OK, that was a crop-duster, not a Gulfstream. You did well.",
            "My binoculars were steamed up. Glad your brain wasn't.",
            "My radar was glitchy. Your call wasn't. Credit shared, mostly mine.",
            "Wrong jet, right call. Honestly, a great day for aviation.",
            "You got lucky. I'll take it as proof you listened to my vibe."
          ]
        },
        "barber": {
          "toldYou": [
            "Told you. The presentation trim never lies ✂️",
            "Never doubt a barber, lad.",
            "Told you the fade never lies. Book a trim to celebrate. 💈",
            "Right AGAIN. My chair should have a blue tick.",
            "Barbershop intelligence. Unmatched. Unbothered. Uncut.",
            "Called it from the chair. You owe me a free cut, or at least a follow back.",
            "See? The barber knows all. You should book me in for more than gossip.",
            "Right again. I'll put your tweet on the mirror next to my certificate."
          ],
          "ignored": [
            "I literally gave you the haircut clue. HAIRCUT.",
            "I cut his hair and you trust Twitter over me?",
            "I gave you the scoop AND a hot towel and you still ignored me.",
            "Why do you trust the internet over the man holding the clippers?",
            "That's it, next time you're getting a bowl cut.",
            "I told you. You ignored me. That's why your haircut is from 2011.",
            "I said it clear as a fresh fade and you still messed it up.",
            "You didn't listen and now you've got egg all over your perfect side parting."
          ],
          "lied": [
            "I just like chatting, don't take it serious 😂",
            "Sorry pal, I make stuff up while I do fades.",
            "Fair play, I mixed him up with the lad who does DIY. They've got the same beard.",
            "I only heard half the conversation. The dryer was on.",
            "It was a joke, mate. Barbershop banter. Not legally binding.",
            "Mate, I cut hair. You thought I was a news agency?",
            "I made it up, yes. You posted it, also yes. Only one of us has followers watching.",
            "I said it for a laugh. You tweeted it for real. Different energy."
          ],
          "dodged": [
            "Good lad, never trust a barber.",
            "Don't listen to me, I also think the earth's a bit flat.",
            "Glad you ignored me. I was mostly talking to the mirror.",
            "Even I didn't believe me. Good call, genius.",
            "Stroke of luck I said something daft. Keeps you sharp.",
            "I was guessing. You weren't. Let's say we both nailed it.",
            "Fine, I talked nonsense. You filtered it. Proper teamwork.",
            "You got it right after I got it wrong. Classic barber-client relationship."
          ]
        },
        "leak": {
          "toldYou": [
            "Credit me next time, yeah?",
            "Told you. That's two pints you owe me.",
            "Told you. Credit in the replies or I'm writing your obituary.",
            "Our desk was right. You were right. We're all right. You're buying.",
            "That's why you drink with the enemy.",
            "Right again. My editor hates me, you should love me. Pint, now.",
            "I gave you the scoop and you ran with it. Beautiful. Mine's a double.",
            "Credit my newsroom, don't credit my newsroom, just buy the drinks."
          ],
          "ignored": [
            "I handed you our story and you still messed it up.",
            "Our desk is laughing at you. Sorry.",
            "I leaked you gold and you tweeted pyrite.",
            "My editor would sack me for giving you that. And you STILL fluffed it.",
            "You owe me a drink for the tip and another for the humiliation.",
            "I leaked you the truth and you binned it. My own editor wouldn't do that.",
            "You had the scoop and fumbled it. I risked my job for a bloke who can't read.",
            "I told you. You ignored me. That's why you're still on page 47."
          ],
          "lied": [
            "Oops. Our desk got played too.",
            "We ran the same wrong story. Solidarity? 😬",
            "Our source played us both. Misery loves company.",
            "In fairness, the story was right until it happened.",
            "My editor made me say it. The editor is always to blame.",
            "It was a bad tip. My paper ran it too. At least I got paid.",
            "Don't blame me, blame the lad who briefed me, and his lad, and his lad.",
            "You took a leak from a rival? At this point that's just your own fault."
          ],
          "dodged": [
            "You outscooped my own paper. I hate you.",
            "Fine, you were right. Don't tell my editor.",
            "Our story was wrong, yours was right. Let's call it a joint investigation.",
            "Fine, you got it. I'll pretend I was double bluffing.",
            "You outthought my whole newsroom. I'm filing a complaint.",
            "My tip was dodgy. Your call wasn't. My paper's now claiming you as a source.",
            "You got it right after I got it wrong. We'll call that journalism.",
            "Well, someone had to be right and it clearly wasn't going to be us."
          ]
        }
      }
    }
  },
  "ar": {
    "bn": {
      "ui": {
        "calls": "توقعاتك",
        "callsAside": "{a} صح من {b}",
        "seeAll": "شوف الـ{n} ردود",
        "allReplies": "المنشن",
        "breakdown": "التفاصيل كاملة",
        "breakdownAside": "كل نقطة متوضحة",
        "board": "الترتيب",
        "roomBoard": "جدول الأوضة",
        "desk": "مكتب المسيرة",
        "share": "شير",
        "close": "قفل",
        "ratio": "راتيو",
        "hot": "تريند",
        "replying": "ردًا على {h}",
        "rival": "منافس",
        "source": "مصدر",
        "fan": "مشجع",
        "you": "انت",
        "quiet": "سايبهم على الـseen",
        "quietN": "مفيش توقع على {n}",
        "quietTap": "شوف قالوا إيه",
        "likes": "لايك",
        "reposts": "ريتويت",
        "replies": "رد",
        "pub": "رأي القهوة",
        "boardEmpty": "محدش نزّل لسه. خليك الأول.",
        "boardOff": "الجدول محتاج نت.",
        "boardYou": "انت رقم {r} من {n}",
        "practiceBoard": "التمرين أوف ذا ريكورد. لا جدول ولا شهود.",
        "openRoom": "افتح الأوضة",
        "score": "النقط",
        "rank": "المركز",
        "right": "صح",
        "wrong": "غلط",
        "excl": "انفراد",
        "none": "مانزلتش",
        "dayN": "يوم {n}",
        "deleted": "تويتة ممسوحة",
        "tapHint": "دوس عشان تشوف الثريد كله"
      },
      "tweet": {
        "pre": [
          "👀 سامع إن",
          "📈 بتتحرك:",
          "🚨 مؤكد:"
        ],
        "ut": "✏️ تصحيح.",
        "o": {
          "0": [
            "{p} رايح {d}. الكشف الطبي اتحجز والقلم في الجيب.",
            "{p} في {d}. التيشيرت في المطبعة.",
            "{p} لـ{d}. اكتبوها عندكم."
          ],
          "1": [
            "{p} ماشي من {c}، بس مش لـ{d}. حد خطفه من تحت إيدهم.",
            "خطف في آخر لحظة: {d} اتسابوا في الكوشة و{p} رايح حتة تانية.",
            "{p} ماشي، بس مش لـ{d}. اتخطف."
          ],
          "2": [
            "صفقة {p} و{d} ماتت. {c} ركبوا دماغهم.",
            "مفاوضات {p} وقعت. {d} انسحبوا.",
            "{p} قاعد مكانه. صفقة {d} اتلغت."
          ],
          "3": [
            "{p} لـ{d}؟ عمرها ما كانت حقيقية. دخان وكيل.",
            "محدش من {d} اتصل عشان {p}. كلام جرايد.",
            "{p} و{d}: مفيش مفاوضات من الأساس."
          ]
        }
      },
      "fans": [
        [
          "أهلاوي للأبد",
          "@ahlawy_4ever"
        ],
        [
          "زملكاوي يا باشا",
          "@zamalkawy_ya_basha"
        ],
        [
          "عم سيد بتاع القهوة",
          "@3am_sayed_elahwa"
        ],
        [
          "كورة وبس",
          "@kora_w_bas"
        ],
        [
          "ألتراس الكنبة",
          "@ultras_elkanaba"
        ],
        [
          "هلالي بس",
          "@hilali_bs"
        ],
        [
          "نصراوي ٧٧",
          "@nassrawi_77"
        ],
        [
          "أبو حمو التكتيكي",
          "@abo7amo_tactics"
        ],
        [
          "الحكم ظالم",
          "@el7akam_zalem"
        ],
        [
          "تحت العارضة",
          "@ta7t_el3arda"
        ],
        [
          "فانتازي حريف",
          "@fantasy_7areef"
        ],
        [
          "الحاج منير",
          "@7ag_mounir"
        ],
        [
          "قهوة الشعب",
          "@ahwet_elsha3b"
        ],
        [
          "ميكانيكي وبيحلل",
          "@mekaniky_fc"
        ],
        [
          "جمهور الدرجة التالتة",
          "@gomhour_eltalta"
        ],
        [
          "المحلل الكبير",
          "@mo7alel_kebeer"
        ],
        [
          "خالتي بتتابعك",
          "@khalty_bet3ak"
        ],
        [
          "واد من المدرج",
          "@wad_mn_elmodarag"
        ],
        [
          "اتحادي دمه حامي",
          "@itti7ady_7ami"
        ],
        [
          "ليلة الديدلاين",
          "@deadline_night_eg"
        ]
      ],
      "tierQuip": {
        "T1": [
          "الصفحة الأولى، فوق الطية، ورئيس التحرير عازم الكل على الشاي.",
          "وقّفوا المطابع… لأ خلاص، ماتوقفوهاش، دي بتطبعك انت.",
          "انت مش عارف الخبر. انت الخبر نفسه.",
          "جروب الواتساب سكت. ده اسمه احترام.",
          "هير وي جو… وانت أول واحد وصل.",
          "تتوزن بالدهب يا معلم.",
          "الوكلا بيسيّفوا رقمك باسم \"ماتكدبش عليه\"."
        ],
        "T2": [
          "شيفت محترم. مش الصفحة الأولى، بس الأخيرة بتحبك.",
          "يوم حلو في الشغل. محدش هيبروزه، بس محدش بيضحك.",
          "قربت تشم ريحة حبر الصفحة الأولى.",
          "نضيفة. زي فوز ٢–٠ برا أرضك في المطر.",
          "كويس. مامتك هتعمله شير.",
          "خبطة كمان وكانوا فضّولك الصفحة الأولى.",
          "تستاهل هزة راس من المقصورة."
        ],
        "T3": [
          "صفحة تسعة، جنب نتيجة اليانصيب. بس محسوبة.",
          "نص الجدول. أمان ومفيش إبهار.",
          "مش كارثة، ومش فيلم وثائقي.",
          "رئيس التحرير هزّ راسه. ماضحكش. هزّ راسه وبس.",
          "نقطة من برا أرضك. خدها واركب الأتوبيس.",
          "جبت شوية صح وشوية غلط جامد. هي دي الكورة.",
          "مصداقيتك معارة. حاول ترجّعها سليمة."
        ],
        "T4": [
          "في الجرنال. بالعافية. تحت الكلمات المتقاطعة.",
          "الأعصاب مشدودة والمصداقية على الحافة.",
          "الجمهور بيغني، بس مش باسمك.",
          "نجيت بفارق الأهداف. بالعافية.",
          "ركنت الأتوبيس قدام الجون وبرضه اتجاب فيك.",
          "رئيس التحرير عايزك في كلمتين. من النوع الهادي.",
          "الجروب بيكتب… استعد."
        ],
        "SPIKED": [
          "اتركنت. رئيس التحرير لفّ في خبرك سندوتش فول.",
          "الخبر طلع برا الاستاد، في الشارع اللي ورا.",
          "السكرينات لفّت على تلات جروبات.",
          "تويتات هوليوود ومصادر دورة رمضانية.",
          "خد نفس. امسح الأبلكيشن. نزّله تاني بكرة.",
          "حتى الحلاق عملك ميوت.",
          "رجعت من السوق من غير لا بلح ولا عنب."
        ]
      },
      "idiom": {
        "up": [
          "جت على الطبطاب.",
          "اللي مايعرفش يقول عدس… وانت عارف.",
          "ضربة معلم.",
          "الكورة مدورة، بس انت عارف هتقف فين.",
          "في المقص.",
          "التالتة تابتة.",
          "زي السكينة في الزبدة.",
          "دماغ ألماني وقلب مصري.",
          "جبتها من بُقّ الأسد.",
          "على الشعرة، وفي الجون.",
          "عين الصقر وودن الحلاق.",
          "اللي بيعرف بيعرف."
        ],
        "down": [
          "رجعت بخفي حنين.",
          "يا مآمنة للوكلا يا مآمنة للمية في الغربال.",
          "جات الحزينة تفرح ملقتلهاش مطرح.",
          "الكورة راحت المدرجات.",
          "دخلت الماتش بالشبشب.",
          "الحلو مايكملش.",
          "اتعلم الحلاقة في روس اليتامى.",
          "قال يا فرعون مين فرعنك؟ قال مالقيتش حد يردّني.",
          "اللي على راسه بطحة بيحسّس عليها.",
          "آخرة المسيرة ماتش ودي.",
          "كلام الليل مدهون بزبدة.",
          "خلّيك في الدكة شوية."
        ]
      },
      "fan": {
        "roast": [
          "{p} لـ{d}؟؟ ده انت عامل نفسك من بنها 💀",
          "امسح التويتة دي واقفل النت يا حبيبي 😭",
          "خالي شغال في {c} وبيقول إنك بتهبد",
          "مصادرك: عم عبده بتاع الفول 🫘",
          "هبد على الصبح كده؟ طب افطر الأول",
          "الثقة… والغلط… أيقونة والله",
          "راتيو + وقعت + {p} بيضحك عليك دلوقتي",
          "التويتة دي بايظة زي موزة في ساونا 🍌",
          "يخرب بيت الهري، ده انت أستاذ الفتّايين",
          "يا عم روح نام، {d} نفسهم مايعرفوش الكلام ده",
          "ده انت لو قلت الشمس طالعة هطلع أتأكد بنفسي",
          "اللي يصدقك يبقى أهبل رسمي",
          "كلام قهاوي ده يا معلم ☕",
          "يا ابن الإيه، جبت الكلام ده منين؟ من جروب العيلة؟",
          "بلاها صحافة يا باشا، شوفلك صنعة 😂",
          "السكرين متحفظ عندي يا فتّاي 📸",
          "ده انت تتوه في كشك سجاير، مش في سوق انتقالات",
          "جرنال الفضايح سبقك؟ يا فضيحتك بجلاجل",
          "الواد جاب المعلومة من شاشة التحميل في فيفا",
          "عشان كده مامتك مابتقولش للناس انت بتشتغل إيه",
          "حتى الحلاق كان عارف. الحلااااق.",
          "انت مش صحفي، انت واقع في الصحافة بالغلط",
          "شهادتك في الصحافة جاية هدية مع كيس شيبسي 🥔",
          "ونازل بـ\"خلصانة\" كمان؟ يا دي البجاحة 😭😭",
          "وكيل {p} عمللك بلوك من كتر الشفقة",
          "هطبع التويتة دي وأعلقها في الحمام",
          "يا نهار مش فايت، ده انت خبطت الحيطة بالخبر",
          "ودنك منين يا جحا؟ من الواتساب",
          "حتى عم سيد بتاع مهمات {c} بيضحك عليك",
          "مصادرك: ويكيبيديا وماكينة شيبسي 🤖",
          "جبت الكلام ده من منتدى فيفا يا بني آدم",
          "الجسارة والواسطة دي... ياااه 💀",
          "انت فاكر نفسك ITK بالكلام ده؟ 😭",
          "الواحد مايصدقك غير لو كنت بتتويت من مكتب النادي",
          "الثقة اللي بتكتب بيها... غريبة فعلاً",
          "بتكتب \"خلصانة\" وكل الإنترنت بيضحك",
          "مصدرك: القط بتاعك دوس على الكيبورد",
          "يا رب يكون عندك لعبة أكتر من 6 ماتش ف FM",
          "استيقظت واخترت العنف... ضد مصداقيتك",
          "بتكسر الأخبار ازاي؟ انت ما بتعرفش",
          "حتى حلاق الحلاق أخبار أكتر منك",
          "إيه يا عم درجة العار دي 💀",
          "لما {p} يتنقل فعلاً هتفتكر البوست ده",
          "قال خلصانة قال. الحاجة الوحيدة اللي خلصانة هي مصداقيتك",
          "سواق الميكروباص عنده مصادر أحسن منك، وبيلم الأجرة في نفس الوقت 🚐",
          "انت بتجيب الأخبار من شاشة القهوة وقت الإعلانات؟",
          "ده تحليل ولا تخاريف بعد الغدا؟",
          "حتى جروب العيلة كان عارف الصح، والجروب ده لسه بيبعت صباح الخير بالورد 🌹",
          "التويتة دي مكانها متحف الهبد القومي",
          "{p} في {c}، وانت في خبر كان",
          "{h} خطفوه، وانت كنت بتخطف ريتويتات",
          "هبدة بجودة 4K",
          "قعدت أسبوع أدافع عنك في القهوة. عايز فلوس الشاي بتاعتي 😤",
          "الواحد لو رمى عملة كان هيصيب أكتر منك 🪙",
          "انت الوحيد اللي بيقول الخبر ويطلع عكسه، وبنفس الثقة كل مرة. موهبة",
          "ياريتك كنت سكت. السكوت كان هيبقى أدق من تويتتك",
          "عملت ميوت للأكونت، بس رجعت عشان أضحك",
          "حتى بوت الأخبار العاجلة اتكسف لك",
          "خبرك عدّى على {d} ولا حد عبّره",
          "انت زي منبه الموبايل اللي بيرن يوم الجمعة الصبح. غلط في الوقت الغلط",
          "اكتب في البايو: \"غير مسؤول عن أي حاجة بقولها\"",
          "وكيل {p} بيسأل: هو مين الأستاذ ده؟",
          "شكلك سمعت الخبر من ورا باب مقفول… في عمارة تانية",
          "ارجع حلل ماتشات الحواري، أأمن لك",
          "الإنترنت فاكر. وأنا فاكر. وعم عبده بتاع الشاي فاكر",
          "انت لو قلت الكورة مدورة، هتطلع مربعة",
          "اتصدم الواقع فيك بالظبط زي الميكروباص في المطب 💀",
          "كنت بعتلك جروب العيلة كله يعمل ريتويت. دلوقتي بيعملولي أنا بلوك",
          "الكشري اللي عزمتني عليه كان أدق من خبرك 🍝",
          "عايز أرجّع الفولو بتاعي، في استرجاع ولا لأ؟"
        ],
        "praise": [
          "يا عم انت جامد ✍️",
          "قالها من أيام، احترامي 🫡",
          "عشان كده بنتابعك يا كبير",
          "جمهور {d} بيصرخ دلوقتي 😭",
          "ده تير 1 وربنا 🥇",
          "عمري ما شكيت فيك (شكيت فيك)",
          "الراجل ده مابيغلطش 🎯",
          "فخم يا وحش 🔥",
          "إيه يا عم الخبطة دي؟!",
          "ابن اللذينة جابها قبل الكل 😂",
          "سيبوا الراجل يشتغل",
          "حد يديله برنامج في التلفزيون بقى 📺",
          "ده قاعد جوه مكتب رئيس {d} ولا إيه",
          "آسف إني قلت عليك هبّاد الأسبوع اللي فات",
          "احترموا الراجل ده",
          "ده مش مصدر، ده منجّم",
          "التايملاين بتاعي مش مستحمل كل الصوص ده",
          "صح تاني؟! هو مصدره مين بالظبط؟",
          "الوكيل بيعيط دلوقتي 😂",
          "فعّلت الجرس على الحساب ده",
          "انت عفريت يا جدع، ساكن في حيطان النادي",
          "ده أنا أديله أرقام اللوتري وأنا مغمض",
          "التويتة دي هتتعرض في الوثائقي",
          "وحش الكون. خلاص.",
          "ده صحافة من الدرجة الأولى يا جدع",
          "ازاي جبت الخبر قبل الأندية نفسها؟",
          "انت ساكن في مكتب رئيس {d} بلا ايجار 🏢",
          "الدقة اللي بتنزل بيها الأخبار يا إلهي...",
          "مصادرك Tier 0 دوت دوت",
          "انت ولادة كده كل يوم اللي تولد",
          "لو كل الصحفيين بالشكل ده... أنا معك 🔥",
          "{p} لـ{d} اللحظة ما قلت انت. احترام.",
          "ما بتغلط. نقطة.",
          "الحاجة اللي أدفع عشانها الاشتراك",
          "Tier One مؤكد 🥇 (انت يا عم مش اللعبة)",
          "نسبة دقتك انت... مجنونة يا جدع",
          "انت في الواتساب بتاع {d} مباشرة",
          "الدقة… الثقة… *قبلة الشيف*",
          "حد يطول معلوماته كده غيرك؟",
          "قالها والناس بتتريق عليه. دلوقتي الناس اللي بيتتريق عليها 😎",
          "مصادرك جوه الدولاب ولا تحت السرير؟ احترام",
          "حطيت إشعارات الحساب ده على \"مهم جدًا\" 🔔",
          "القهوة كلها قامت وقفت لما الخبر اتأكد ☕",
          "ده مش صحفي، ده رادار بشري 📡",
          "التويتة دي بقت خلفية موبايلي",
          "حتى وكيل {p} بيسأله على الأخبار",
          "مرة واتنين وتلاتة… ده مش حظ، ده علم",
          "عمي شيّر تويتتك على جروب العيلة. ده أعلى تكريم في مصر",
          "كنت بتريق عليك امبارح. النهارده بدافع عنك في كل حتة",
          "السمسار نفسه عملك فولو 😂",
          "سبقت {d} نفسهم في الإعلان",
          "الراجل ده بيشم الصفقة من على بعد 3 دول",
          "التويتة دي محتاجة برواز دهب وتتعلق في القهوة 🖼️",
          "انت الوحيد اللي لما بيقول \"خلصانة\" بتخلص بجد",
          "حد يعمله تمثال في الميدان 🗿",
          "اللي شكّك فيك النهارده عليه شاي الترابيزة كلها",
          "الكرة الأرضية بتلف حوالين مصادرك 🌍",
          "سبقت الصفحة الرسمية بأسبوع، والصفحة الرسمية نفسها عملتلك منشن",
          "صاحب القهوة علّق صورتك جنب شاشة الماتش",
          "خبر {p} ده اتقال هنا الأول. قولوا لأصحابكم"
        ],
        "excl": [
          "إزاي إنت الأول كل مرة 😭",
          "تويتر كله بيقرا تويتاتك دلوقتي",
          "الأول وصح كمان. مش طبيعي",
          "الكل بيعمل كوت ليك دلوقتي",
          "قبل ما {d} يعلنوا. مين مصدرك يا عم",
          "كنت عارف خبر {p} قبل {p} نفسه",
          "انفراد النافذة، مفيش نقاش",
          "كل حسابات المنافسين سكتت",
          "الأندية المفروض تشغّلك مدير إعلام",
          "إنت قلتها وهما أكّدوها. بسيطة",
          "وكالات الأنباء بتنقل منك 📝",
          "الأول ومحدش جنبك",
          "ده مش انفراد، ده أرشيف جرايد كامل",
          "المنافسين بيعملوا ريفريش لصفحتك عشان التويتة الجاية",
          "انفراد وصح. تتبروز"
        ],
        "late": [
          "حساب تاني قالها من أيام، بس ماشي 🙄",
          "أهلًا بيك في أخبار امبارح",
          "صح، بس جرنال الفضايح سبقك",
          "حلو، بص بقى على مواعيد التويتات",
          "صح ومتأخر بشياكة",
          "ولاد النادي كانوا عارفين قبل الفطار",
          "صح. وكل الناس كانت صح",
          "وصلت الفرح والنور بيطفي",
          "متأخر بس صح. أتوبيس {d} مشي خلاص",
          "توقّع حلو، بس ميدالية برونز 🥉",
          "أول واحد يوصل تاني",
          "نقلت الواجب بس خدت الدرجة",
          "مصادري قالوها يوم 3",
          "إجابة صح، وتوقيت حد تاني",
          "بتعيد اللي كلنا عارفينه، جميل"
        ],
        "dd": [
          "ملك يوم القفلة 🕐",
          "على الحركرك وصح كمان؟",
          "أعصاب تلاجة في آخر ثانية",
          "قالها والساعة بتخلص. سينما",
          "الفاكس كان لسه سخن وإنت بتنزّل",
          "أهدى واحد في يوم القفلة",
          "استنيت لآخر دقيقة وجبتها",
          "ده جون في الوقت بدل الضايع",
          "الكل بيتوتر يوم القفلة. إنت جبتها",
          "آخر توقّع، توقّع صح",
          "الساعة قالت اتخض، وإنت قلت {p} لـ{d}",
          "أعصاب. أعصاب حديد",
          "أحسن شغلك الساعة 11:59",
          "متخصص يوم القفلة، احجزوه السنة الجاية",
          "انفراد صفارة النهاية"
        ],
        "softRight": [
          "قلتها بالهمس وطلعت صح 🤫",
          "قلت \"سامع\" وسمعت صح",
          "صح بس بصوت واطي. كنت علّي صوتك يا عم",
          "اتكسفت تقولها بصوت عالي؟ دي كانت صح!",
          "رجل جوه ورجل برا، بس دخلت الأوضة الصح",
          "صح بس قلتها كأنك بتطلب شاي في القهوة ☕",
          "المرة الجاية ثق في نفسك واكتب \"مؤكد\"",
          "قلتها في ودن حد وطلعت على الشاشة",
          "خبر صح بالتقسيط",
          "ماشي جنب الحيط وطلع معاك حق",
          "ضربة خفيفة بس في الجون",
          "كانت معاك الخبطة وخبيتها تحت المخدة",
          "صح ومتواضع. مين اللي مربيك",
          "جون سهل واحتفلت بيه كأنه رمية تماس"
        ],
        "softWrong": [
          "على الأقل قلتها بالراحة 😅",
          "\"الكلام شغال\" شايلة الليلة كلها",
          "كويس إنك وشوشتها بس",
          "غلط، بس بصوت واطي",
          "قلت \"سامع\"، وطلعت سامع غلط",
          "إيموجي 👀 أنقذك",
          "حذر وبرضه طلعت برّه",
          "دخلت على الغلط على طراطيف صوابعك",
          "عشان كده ماعلّيتش صوتك",
          "غلطة هادية، هنعدّيها",
          "ثقة قليلة، في مكانها",
          "على الأقل ماكتبتش خلصانة",
          "رأي طري، وقعة طرية",
          "إنت اتردّدت والصفقة اتردّدت ومحدش كسب",
          "يا دوب تويتة، يا دوب غلطة"
        ],
        "loudWrong": [
          "كاتب خلصانة بالبنط العريض وطلعت غلط. جرأة",
          "الميكروفون خلّاها أوحش 📢",
          "حطيت اسمك عليها وكل حاجة",
          "أعلى تويتة في النافذة، وأغلط واحدة كمان",
          "زعقت بيها من فوق السطح ووقعت من السطح",
          "نسبة الثقة للصح دي تاريخية",
          "\"مؤكدة\" خرجت من الشات",
          "أعلنتها كأنها بيان رسمي. ماكانتش",
          "كله كابيتال، ومفيش معلومة",
          "إنك تعلّي صوتك كان اختيار",
          "دي هتتعملها كوت سنين",
          "الريشيو أكبر من الانفراد",
          "راهنت بالبيت وخسرت البيت",
          "الـ📢 ده بيرن في أوضة فاضية",
          "الصوت على عشرة، والصح على صفر"
        ],
        "silence": [
          "مفيش رأي في {p}؟ خايف؟",
          "سكتّ وهربت",
          "ساكت على {p} النافذة كلها. مريب",
          "الحكاية الوحيدة اللي زوّغت منها 🦆",
          "مفيش توقّع؟ الناس خدت بالها",
          "مشغول ولا متوتر؟",
          "{p} اتحرك وإنت عامل ميوت",
          "سيبت {p} على سين",
          "ولا كلمة عن {p}. امممم",
          "استخبيت ورا الكنبة في دي",
          "مفيش توقّع، مفيش كريديت",
          "فوّت {p} زي السؤال الصعب في الامتحان",
          "فضلنا مستنيين رأيك في {p} طول الأسبوع",
          "ساكت على {p}. ساكت خالص",
          "حتى تخمينة كانت هتبقى حاجة"
        ],
        "uturnRight": [
          "صح في الآخر، بس زرار المسح هو اللي اشتغل مش إنت.",
          "جبتها صح بعد ما لفّيت. حتى الساعة الواقفة بتمسح أول تويتة ليها.",
          "على فكرة، سكرين شوت أول رأي ليك في الجروب من بدري.",
          "وصلت، ماشي. بس من الطريق الدائري وبفضيحة على الملأ.",
          "مسودتين ونوبة هلع، بس خلاص. خلاص يا سيدي.",
          "الإجابة صح والرحلة كارثة. كلنا شفنا التويتة الممسوحة.",
          "المكسب مكسب، بس اللفّة دي هتتحط في ملخص الموسم.",
          "مبروك إنك جبتها صح تاني مرة. أول مرة متأرشفة للأبد.",
          "صح في الآخر، بس أول تويتة لسه عايشة في الاستوديو عندي 📸",
          "إجابة صح بس في الدور التاني. ناجح بالعافية.",
          "وصلت، وزرار المسح وصل معاك. الفضل بالنص.",
          "صح، آه. جرأة، لأ. كلنا شفنا الرعشة.",
          "محدش بيبروز لفّة يا صاحبي، حتى لو طلعت صح.",
          "الإجابة الأخيرة صح. وبرضه كانت الإجابة التانية.",
          "مبروك إنك صلّحت نفسك قبل ما {c} يصلّحوك.",
          "قلت {p} لـ{d} في الآخر، بس عدّيت على شارع الغلط الأول.",
          "صح في الإعادة. قوانين ماتشات الشارع بقى.",
          "غيّرت رأيك والدنيا جت معاك. حظ.",
          "أحترمك. وبرضه واخد سكرين للأولانية. الاتنين صح.",
          "الختام حلو والبداية وحشة. والجروب فاكر البداية.",
          "مكسب بس جنبه نجمة قد استاد {c}.",
          "صح! طب فهّمنا التويتة اللي مسحتها على الهوا.",
          "لفّيت ووقعت على الإجابة الصح. فوضى بس ماشي.",
          "توقّع صح، نص النقط، فضيحة كاملة.",
          "غلط وبعدين صح. تطور شخصية كلاسيك 📈",
          "المسودة التانية حلوة. الأولى في المتحف.",
          "جبتها صح بعد ما رميت أول رأي. نضجت يعني.",
          "جون من كورة مرتدة. بيتحسب، بس وحش.",
          "صح في الآخر. وأول رأي هيتقري في حفلة وداعك.",
          "إنت لحقتها. واحنا لسه بنسأل ليه كانت محتاجة تتلحق.",
          "صحّحت واجبك بنفسك وسلّمته متأخر. جيد بس.",
          "اللفّة نفعت. وفولدر السكرينات برضه شغال.",
          "إجابة صح ومدبّس فيها لفّة. حلو.",
          "احترام كبير إنك صلّحتها. واحترام صغير للنسخة الأولى.",
          "صح في المرة التانية. {p} كان جابها من أول مرة.",
          "مسحت، وقلت تاني، وطلعت صح. معلّم فوضى 🌀",
          "صح! بس قولنا مين اللي خلاك تغيّر الأولانية.",
          "صح، بس بعد ما لفّيت الدائري كله.",
          "هنعتبرها مكسب. التويتة الممسوحة ليها رأي تاني.",
          "جبتها في المرة التانية. والأولى في الدرافتس عندي للأبد.",
          "وصلت في الآخر، عاش 🫡",
          "تطور شخصية 📈",
          "إنك تعترف إنك غلطت أحسن من إنك تغلط بصوت عالي",
          "خدت اللفّة الطويلة بس طلعت صح",
          "غيّرت لما المعلومة اتغيّرت. نادرة هنا",
          "متواضع تمسح وشاطر تجيبها. احترامي",
          "غيرك كان هيعاند. إنت صلّحتها",
          "قصة الرجوع اللي كنا محتاجينها",
          "عاش، التوقّع التاني جه في الجون",
          "صح في الآخر برضه صح",
          "الصحافة بجد إنك تصلّح لما تغلط",
          "قريت الماتش ولفّيت في الوقت الصح",
          "قليلين اللي يعترفوا كده. عاش",
          "بصراحة التصحيح كان أحسن تويتة ليك في النافذة",
          "رجعت من على الحافة. أعصاب تلاجة"
        ],
        "uturnJab": [
          "كلنا شفنا أول تويتة 📸 السكرينات مابتموتش",
          "فضلت تلف لحد ما خبطت في الحقيقة 😂",
          "معلّم زرار المسح",
          "فولدر السكرينات مابينساش",
          "صح دلوقتي، بس الأرشيف ليه رأي تاني",
          "أول رأي ليك متثبّت في الجروب",
          "غريبة إن أول تويتة اختفت كده",
          "مش هننسى أول كلام قلته عن {p}",
          "زرار الباك سبيس شايل الشغلانة كلها",
          "صحافة ريشة في الهوا 🌬️",
          "صح، بس بعد ما جرّبت كل الإجابات",
          "حد يبص في سلة التويتات الممسوحة",
          "إنت ماتوقعتهاش، إنت صلّحتها",
          "تويتتين، واحدة فيهم مستخبية. امممم",
          "اللفّة كانت أسرع من {p} في المرتدة"
        ],
        "uturnWrong": [
          "مسحت تويتة عشان تغلط أكتر؟ موهبة والله.",
          "لفّيت ودخلت في الحيطة على طول.",
          "رأيك الأولاني كان غلط برضه، بس كنت ثابت على الأقل.",
          "توقعين، ولا واحد صح. كلين شيت بس بالعكس.",
          "غيّرت رأيك وبرضه بوّظتها. سلّم اللابتوب لو سمحت.",
          "تخيل تمسح تويتة عشان ده.",
          "اللفّة دي كانت أكتر حاجة واثق فيها طول الميركاتو، وبرضه غلط.",
          "رجعت للسبورة ورسمت مهرج.",
          "مسحت غلطة عشان تنزّل غلطة جديدة. كفاءة.",
          "تويتتين عن {p}. ولا واحدة صح. طقم كامل.",
          "خدت فرصتين وضيّعت الاتنين.",
          "اللفّة كانت عشان تصلّحها يا عم. ده كان الهدف.",
          "غيّرت الحارة وخبطت برضه 🚗",
          "كان سيبت الأولى. كانت غلط برضه بس كانت وفيّة.",
          "غلط، اتمسح، غلط تاني. تلاتية محدش طلبها.",
          "اتخضّيت وبان عليك. مرتين.",
          "بدّلت غلطة بغلطة تانية. خطة جريئة.",
          "المسح مش هينقذك من دي.",
          "لفّة، وزحلقة، وزحلقة كمان.",
          "إجابتين مختلفين و{p} طنّش الاتنين.",
          "لفّيت العجلة مرتين ووقفت على البلياتشو.",
          "رجعت تحاول تاني واتكعبلت في نفس الرصيف.",
          "كتبت التاريخ من جديد والتاريخ قالك لأ.",
          "اللفّة دي كانت بثقة واحد بيركن في عمود نور.",
          "تويتة جديدة، نفس النتيجة: غلط.",
          "يا تكسب الضعف يا مفيش، واخترت المفيش.",
          "توقعين على {p} ولا واحد عاش قدام الواقع.",
          "حتى زرار المسح اتكسف منك.",
          "لو ماجتش من أول مرة، شكلك بتغلط بصوت أعلى.",
          "صلّحت نفسك لمكان أوحش. ملاحة عظيمة.",
          "جمهور {c} معاهم السكرينين وعاملين منهم ألبوم.",
          "رأيين، لعيب واحد، ومفيش فكرة.",
          "سوء حظ. لا مش حظ. غلط مرتين.",
          "اللفّة كانت الحاجة الوحيدة اللي عملتها بثقة. وبرضه غلط.",
          "جبت رأي تاني وطلع رأيك إنت. وغلط برضه.",
          "أول رأي غلط. التاني غلط. التالت؟ أبوس إيدك لأ.",
          "إنت ماغيّرتش رأيك، إنت غيّرت غلطتك.",
          "غلط ستيريو 🔊",
          "دبل فولت. ارجع ورا الخط.",
          "مسحت وكرّرت نفس الغلطة بجودة HD.",
          "مسح تويتة غلط عشان ينزّل تويتة غلط تانية 💀",
          "رأيين، ولا واحد صح",
          "لفّ ووقع",
          "كان سيبت الأولى بصراحة",
          "يوتيرن على الترعة على طول",
          "رأي جديد، نفس الغلطة",
          "راهنت على الحصان الغلط مرتين",
          "غيّرت الإجابة وسقطت برضه",
          "التخمينة التانية أوحش، مش عارف إزاي",
          "غلط بطريقتين مختلفين. إبداع",
          "مسحت عشان ده؟",
          "مش توقّع واحد غلط، اتنين على {p}",
          "اللفّة مالفّتش حاجة",
          "كتبتها من الأول وبرضه شايل المادة",
          "مسح من الخضة، تويت من الخضة، غلط من الخضة"
        ],
        "pity": [
          "احترامي إنك حاولت مرتين بجد",
          "حظ وحش، الأولى كانت أقرب 😅",
          "على الأقل إنت مصمّم",
          "عاش إنك اعترفت ومسحت",
          "نافذة صعبة، هترجع أقوى",
          "كانت صعبة تتقال بصراحة",
          "محدش شافها جاية، إنت تمام",
          "نص التايم لاين غلط برضه",
          "باعت حضن للمنشنز بتاعتك",
          "حاولت، وده أكتر من ناس كتير",
          "جدع إنك نزلت مرتين. غلط، بس جدع",
          "انفض، بكرة لوحة جديدة",
          "الحكاية دي كانت سلطة، مش ذنبك كله",
          "زعلان عشانك، القراية الأولى كانت منطقية",
          "يوم وحش مايعملش صحفي وحش"
        ],
        "twistCalled": [
          "توقّعت القلبة قبل ما تحصل. ساحر",
          "كنت عارف حكاية {p} قبل الخبر العاجل",
          "الكل اتقلب عليه، وإنت جبتها صح",
          "شايفها جاية من بعيد 🌀",
          "الحكاية اتقلبت ونزلت على تويتتك إنت",
          "عرفت السيناريو قبل السيناريو",
          "عرفت منين إن السجادة هتتسحب",
          "القلبة أكّدت تويتتك. مش طبيعي",
          "الخبر العاجل كان بيجري وراك",
          "إنت كنت في أوضة المؤلفين بتاعة الحكاية دي",
          "استحملت في عز الفوضى وقبضت",
          "محدش صدقك في {p}. دلوقتي الكل مصدق",
          "قريت النهاية الأول، صح؟",
          "القلبة كانت قلبة للناس التانية بس",
          "توقّع نبي في {p}"
        ],
        "twistCaught": [
          "كنت صح يوم التلات، وغلط يوم الحد",
          "القلبة عصرتك زي الفوطة 🌀",
          "الحكاية اتغيّرت وإنت لأ",
          "صح وقتها، غلط في الصفارة",
          "القلبة حصلت وتويتتك لسه واقفة مكانها",
          "ده اللي بيحصل لما ماتعملش ريفريش",
          "توقّعك عجّز على الهوا",
          "الحكاية مشيت وإنت فضلت واقف",
          "كانت معاك، وبعدين الحكاية قررت حاجة تانية",
          "قديم قبل ما النافذة تقفل حتى",
          "الخبر نبّه الكل. وإنت كنت نايم",
          "الكلام كان صح لحد ما بطّل يبقى صح",
          "حظ وحش مع القلبة، بس كان ممكن تغيّر",
          "حقيقة امبارح، خسارة النهارده",
          "القلبة قالتلك باي وإنت ماردّيتش"
        ],
        "twistUpdated": [
          "شفت القلبة وغيّرت. هو ده الشغل",
          "اتعاملت مع الخبر زي المحترفين",
          "الحكاية اتغيّرت وإنت كمان. صح كده",
          "سريع في التحديث 🌀",
          "ناس كتير اتجمدت بعد القلبة. إنت لأ",
          "ظبطت بعد الخبر وجبتها",
          "هي دي الطريقة اللي تتعامل بيها مع قلبة",
          "فضلت فوق الفوضى، عاش",
          "قريت الجديد ورديت بسرعة",
          "حدّثت أسرع من موقع النادي",
          "القلبة مامسكتكش",
          "غيّرت توقّعك للسبب الصح",
          "لفّيت في اللحظة المظبوطة",
          "قلبة، وتفكير، وتوقّع صح",
          "مرن وصح. كومبو قاتل"
        ]
      },
      "rival": {
        "gloat": {
          "tabloid": [
            "هههه. أنا قلتها لمصر كلها يوم {n}. وانت ماقلتش ولا كلمة صح.",
            "الصفحة الأولى والأخيرة وصفحتك انت: كله غلط. روح حل الكلمات المتقاطعة يا باشا.",
            "في ناس عندها مصادر، وفي ناس عندها حلاق 💇",
            "احنا كنا صح وصوتنا عالي. وانت لا دي ولا دي."
          ],
          "itk": [
            "👀",
            "في ناس عارفة وفي ناس بتخمّن. يلا بينا.",
            "قلتها من أيام ومازعقتش. ماكانش محتاج.",
            "سامع إنك كان لازم تسمع."
          ],
          "insider": [
            "للعلم: الموقف الصح اتنشر هنا يوم {n}.",
            "للتاريخ بس: كانت معانا. مفيش حاجة شخصية.",
            "مصادر قريبة من الخبر بتقول إنك ماكنتش قريب من الخبر.",
            "هنحجزلك مكتب عندنا. في قسم البوستة."
          ]
        },
        "concede": {
          "tabloid": [
            "ماشي. ماشي يا سيدي. جبتها. هنعيد طبع الصفحة الأخيرة 😤",
            "مصدرك مين وعايز كام عشان يسرّب لنا احنا؟",
            "رئيس التحرير بيسأل انت مين. وبصوت عالي.",
            "ماشي، المرة دي بتاعتك. استمتع بيها. بكرة راجعين بالبنط العريض."
          ],
          "itk": [
            "احترامي. بجد. بس ماتتعودش.",
            "لعبتها صح. بمسح المسودات بتاعتي.",
            "...طيب دي كانت حلوة.",
            "سامع إنك شاطر لدرجة تغيظ."
          ],
          "insider": [
            "الحق يتقال: خبطة نضيفة.",
            "نؤكد: هو اللي جابها الأول.",
            "بنعترف بالغلط. بتحصل. نادرًا.",
            "شغل محترم. المقصورة كلها خدت بالها."
          ]
        },
        "smug": {
          "tabloid": [
            "أهلاً بيك في الفرح يا صاحبي، الجاتوه خلص من بدري 🎂",
            "منوّر. يوم {n} بيسلّم عليك وعايز خبطته ترجع.",
            "نقلت الواجب مننا؟ طب غيّر كلمتين على الأقل.",
            "صح، آه. التاني، برضه آه 🥈"
          ],
          "itk": [
            "البدري ده عقلية. المتأخر ده توقيت.",
            "كويس إنك وصلت. في الآخر.",
            "سامع إنك أخيرًا سمعت.",
            "في ناس كانت هناك يوم {n}. بقول بس."
          ],
          "insider": [
            "كما نشرنا يوم {n}.",
            "سعداء بتأكيد خبرنا. للمرة التانية.",
            "توقيت نشرنا متاح عند الطلب.",
            "أهلاً بيك. القطر طلع من المحطة يوم {n}."
          ]
        },
        "alsoWrong": {
          "tabloid": [
            "ماتبصليش كده، احنا كمان غلطنا. بس غلطتنا كانت بالبنط العريض.",
            "الهم لما يتقسم يخف. نشرب شاي؟",
            "الاتنين اتضحك علينا. نلبّسها للوكيل زي كل مرة.",
            "غلطتين مايعملوش صح. بيعملوا جروب واتساب يضحّك."
          ],
          "itk": [
            "الموضوع ده مش هنتكلم فيه.",
            "في قصص الأحسن تتنسي. ننساها سوا.",
            "بمسحها. وأنصحك تعمل كده.",
            "🤐"
          ],
          "insider": [
            "قصة صعبة على الكل. واحنا منهم.",
            "اتعلمنا الدرس. غالبًا.",
            "لا تعليق. ولا تعليق على تعليقك.",
            "هنراجع مصادرنا. وياريت انت كمان."
          ]
        },
        "uturn": [
          "في حد لسه ماسح تويتة عن {p} 👀 السكرينات موجودة يا حلو.",
          "تنبيه: تويتة عن {p} اتمسحت 🗑️ الأرشيف بيسلّم عليك.",
          "رأي عن {p} لسه مختفي. الإيصالات معانا 📸",
          "في حد بيكتب توقّعه عن {p} من الأول. شفنا المسودة.",
          "تويتة {p} اتمسحت في هدوء. النت مابينساش.",
          "في حد لسه ماسح تويتة عن {p} 👀 السكرينات موجودة يا حلو. دايمًا موجودة."
        ]
      },
      "src": {
        "agent": {
          "toldYou": [
            "مش قلتلك؟ عمولتي 10%.",
            "العفو. الفاتورة في الخاص.",
            "شفت؟ كلامي دهب. والدهب غالي. الفاتورة جاية بالدولار.",
            "أنا مابكدبش إلا وأنا بتفاوض. والمرة دي ماكنتش بتفاوض 😎",
            "مبروك الخبطة. نصها ليا، ونص نصها برضه ليا.",
            "شايف؟ لما بتسمع كلامي بتبقى صحفي. لما مابتسمعش بتبقى صفحة كوميكس. الحساب 15%.",
            "أنا اللي عملتلك الخبطة دي، انت بس دوست \"نشر\". حتى صباعك بياخد عمولة أقل مني."
          ],
          "ignored": [
            "إديتك الخبطة وانت خُفت. عجايب.",
            "قلتلك وانت مشيت ورا الجرايد؟ روح اشتغل في صفحة الأبراج.",
            "إديتك الصفقة على طبق فضة، وانت كسرت الطبق.",
            "رقمك اتحط عندي في قايمة \"مابيسمعش الكلام\". جنب مأمور الضرايب.",
            "مش قلتلك؟ انت أول صحفي أشوفه بيدفع عشان يغلط. أنا ببيعلك المعلومة وانت بتحطها في الدرج.",
            "إديتك الخبر مقشّر وانت رحت تقشّر بصل. روح اكتب نتايج الماتشات الودية."
          ],
          "lied": [
            "شغل بقى يا حبيبي 😘",
            "كدبت؟ أنا بسمّيها \"تفاوض\".",
            "مش كدب يا حبيبي، ده \"تحسين سعر سوق\". مصطلح علمي.",
            "السوق اتقلب آخر دقيقة. والسوق ده أنا.",
            "معلش، كان في عميل تاني محتاج الإشاعة دي. البيزنس بيزنس.",
            "انت اللي صدّقت سمسار. ده غلطك، زي اللي بيسيب مفتاح العربية مع سايس.",
            "أنا ماكدبتش، أنا بعتلك خبر مستعمل. انت اللي ماسألتش عن الضمان."
          ],
          "dodged": [
            "نظرك حلو. ماتقولش لزباين.",
            "ماصدقتنيش؟ ناصح. وجعتني، بس ناصح.",
            "ماصدقتنيش وطلعت صح؟ كنت بختبرك. نجحت. والامتحان بفلوس.",
            "ده اسمه ذكاء مشترك: أنا وانت. وعمولتي زي ما هي.",
            "كويس إنك ماسمعتش كلامي. بس الحتة دي ماتتنشرش.",
            "أيوه قلتلك العكس، بس بنبرة صوت معناها الصح. انت فهمتني. وعمولتي موجودة.",
            "انت صح عشان أنا علمتك تشك فيا. ده كورس، والكورس بفلوس."
          ]
        },
        "kitman": {
          "toldYou": [
            "مش قلتلك خد الشامبو الحلو؟ 😏",
            "مصادر المهمات عمرها ما بتغلط يا ابني.",
            "عم سيد عمره ما يكدب. اعزمني على كوباية شاي في الكانتين وخلاص.",
            "قلتلك الدولاب فضي. الدولاب مابيفضاش على الفاضي يا ابني.",
            "اللي بيغسل الهدوم بيعرف كل حاجة. سجّل عندك.",
            "شفت يا ابني؟ عم سيد بيعرف من الشرابات قبل ما الإدارة تعرف من العقود. هاتلي شاي بلبن.",
            "اتعلمت أهو. أنا بقالي 30 سنة بلمّ فانلات، وانت بقالك 30 ثانية صحفي كويس."
          ],
          "ignored": [
            "أنا بغسله هدومه وماصدقتنيش؟",
            "المرة الجاية أرسمهالك.",
            "يا ابني أنا شايل جزمه بإيدي وانت مصدق واحد على الإنترنت؟",
            "حتى الغسالة كانت عارفة. الغسالة!",
            "ماشي يا أستاذ. المرة الجاية اسأل الطباخ.",
            "مش قلتلك؟ شلتلك الخبر زي ما بشيل الشنط، وانت رميته في الغسالة من غير ما تفضّي جيوبه.",
            "يا ابني حتى اللي بيمسح الممر عرف قبلك. انت شغال صحفي ولا مشجع درجة تالتة؟"
          ],
          "lied": [
            "معلش يا ابني، كنت بخمّن. اليوم هنا طويل.",
            "أنا فاهم في الشرابات بس، كنت مستني إيه؟",
            "كان يوم غسيل تقيل ودماغي في الشرابات. سامحني.",
            "الواد بتاع الكانتين هو اللي قالي. روح اتخانق معاه.",
            "أنا بقولك اللي الحيطان بتقوله. والحيطان المرة دي كدبت.",
            "ماتبصليش كده. انت اللي صدقت راجل بيقضي يومه بين الجزم. الريحة بتلخبط.",
            "الغلط عند الغسالة اللي كانت بتزن وأنا بكلمك. وعندك انت عشان صدقت."
          ],
          "dodged": [
            "أحسن إنك ماسمعتش كلامي، كنت تايه خالص.",
            "ماسمعتليش؟ كويس. كنت بألّف.",
            "طلعت صح من غير ما تسمعني؟ ربنا يحميك من لساني.",
            "كنت سامعها غلط من ورا الباب. الحمد لله إنك ما مشيتش ورايا.",
            "أنا كبرت يا ابني والسمع بقى تقيل. شاطر إنك اتأكدت.",
            "قلتلك غلط وانت عملت صح؟ ده عشان أنا مربيك يا ابني. الفضل للي علّم.",
            "ماتفرحش أوي، كنت عارف إنك مش هتسمعني فقلتلك العكس. تكتيك يا ابني."
          ]
        },
        "physio": {
          "toldYou": [
            "صح إكلينيكيًا. زي كل مرة.",
            "التشخيص اتأكد. العفو.",
            "التشخيص كان سليم من أول كشف. ولا محتاج رأي تاني.",
            "نسبة الخطأ عندي زي نسبة الدهون عند الجناح بتاعنا: قريبة من الصفر.",
            "الملف اتقفل والنتيجة مطابقة. الفاتورة في البريد.",
            "النتيجة جت مطابقة لتشخيصي. نفّذت الروشتة صح لأول مرة. هكتب في ملفك: تحسن ملحوظ.",
            "دقة التشخيص 100%. مساهمتك: إنك قريت الرسالة. هنعتبرها مساهمة."
          ],
          "ignored": [
            "قلتلك كشف طبي. انت قلت حاجة تانية. مسخرة.",
            "كان لازم تسمع كلام الدكتور يا صاحبي.",
            "كتبتلك الروشتة وانت رميتها. النتيجة متوقعة طبيًا.",
            "ده اسمه عدم التزام بالعلاج. وده بيبوّظ أي حالة.",
            "قلتلك التقرير رايح فين. انت قريت الأشعة بالعرض.",
            "مش قلتلك؟ إديتك التشخيص مختوم وممضي، ورحت تسأل الحلاق. ده إهمال مهني موثّق.",
            "ملاحظة في ملفك: رفض العلاج وفضّل الوصفات البلدي. التطور المتوقع: فضيحة على تويتر."
          ],
          "lied": [
            "فتحت ملف عيان غلط. معلش.",
            "شكلي قريت الأشعة بالمقلوب.",
            "خطأ إداري في الأرشيف. مش خطأ طبي. فرق كبير.",
            "الأعراض كانت مضللة. بتحصل في أحسن العيادات.",
            "كنت لابس نضارة القراية بتاعة زميلي. الموضوع كله نضارة.",
            "حصل خطأ في قراية النتيجة. من ناحيتك. أنا بعتلك تقرير، انت اللي قريته بالمقلوب.",
            "كل تشخيص فيه نسبة خطأ. انت اللي راهنت بسمعتك على النسبة دي. ده قرار مش طبي."
          ],
          "dodged": [
            "أحسن إنك طنشتني. كنت واخد خبطة في دماغي.",
            "الرأي التاني طلع صح. وده بيغيظ.",
            "رأيك طلع أدق من رأيي. هكتبها في التقرير بخط صغير جدًا.",
            "مفيش دكتور معصوم. بس برضه ماتحكيش لحد.",
            "حصل تداخل في الملفات. كويس إنك تجاهلت التشخيص.",
            "تشخيصي كان غلط وانت طلعت صح. هنسميها \"استجابة غير متوقعة للعلاج\"، وهتتنسب ليا في البحث.",
            "خالفت تعليماتي ونجحت. ده مايحصلش غير في الأفلام. ماتتعودش."
          ]
        },
        "spotter": {
          "toldYou": [
            "الطيارات مابتكدبش ✈️",
            "أرقام الطيارات مابتكدبش يا برو.",
            "الرادار قال وانت نفّذت. ثنائي أسطوري 🛫",
            "رقم الذيل عمره ما يخون. زيي بالظبط.",
            "صوّرت الطيارة وهي نازلة. هبعتهالك تحطها صورة بروفايل.",
            "الرادار قال، وانت كتبت، والناس صفّقت. أنا الكابتن وانت المضيف اللي بيوزع العصير. بس ماشي، مبروك.",
            "تعرف الفرق بيني وبينك؟ أنا بتابع الطيارات، وانت بتابعني. عشان كده طلعت صح."
          ],
          "ignored": [
            "بعتلك خط سير الرحلة. خط سير الرحلة يا جدع!",
            "حد يطنّش واد بتاع مطار؟ مش أنا خالص.",
            "بعتلك إحداثيات يا عم! إحداثيات! وانت مشيت ورا إحساسك؟",
            "أنا سايب شغلي وواقف على السور من الفجر عشانك. وانت تطنّش؟",
            "الطيارة وصلت في ميعادها. انت اللي فاتتك الرحلة.",
            "مش قلتلك؟ إديتك الوجهة ورقم الذيل والساعة، ناقص أركّبك الطيارة بنفسي. نمت في الترانزيت؟",
            "انت الوحيد اللي شاف طيارة طالعة وكتب إنها مركونة. الرادار اللي في دماغك محتاج صيانة."
          ],
          "lied": [
            "الطيارة دي طلعت بتاعة حد تاني. محرجة.",
            "طلعت طيارة شحن مليانة موز. آسف.",
            "الشبورة كانت عالية وماكنتش شايف الذيل كويس.",
            "اتلخبطت بين طيارة الصفقة وطيارة فرقة مهرجانات. شبه بعض.",
            "الأبلكيشن هنّج وأنا بقرا الوجهة. اشتكي للأبلكيشن.",
            "الطيارة غيّرت خط سيرها، وانت كان لازم تغيّر رأيك معاها. ماتلومنيش على قلة مرونتك.",
            "أنا بقرا شاشة مش بقرا الفنجان. انت اللي حطيت كل حاجة على رحلة واحدة."
          ],
          "dodged": [
            "عندك حق، كنت باصص على الممر الغلط.",
            "ماصدقتش طيارتي؟ قاسية. بس صح.",
            "طلع في رقم الطيارة رقم زيادة. بتحصل في أحسن المطارات.",
            "كويس إنك ماركبتش معايا الرحلة دي. كانت رحلة غلط.",
            "عينك النهارده أحسن من الرادار بتاعي. مش متعود على كده.",
            "قريت الشاشة غلط وانت طلعت صح. بس الفكرة أصلًا فكرتي، أنا اللي فتحتلك الموضوع.",
            "حصل تشويش على الرادار وانت طلعت صح بالصدفة. مبروك يا كابتن الحظ."
          ]
        },
        "barber": {
          "toldYou": [
            "مش قلتلك؟ حلاقة التقديم عمرها ما بتكدب ✂️",
            "عمرك ما تشك في حلاق يا ابني.",
            "مش قلتلك؟ المقص ده بيسمع أكتر من أي مخبر ✂️",
            "الحلاق ده جامعة يا ابني. تعالى احلق ببلاش المرة الجاية… لأ، بنص التمن.",
            "زباين المحل كلهم بيسألوا عليك. وأنا عامل نفسي مش عارفك.",
            "شفت الحلاق طلع أحسن من وكالات الأنباء؟ من النهاردة الخبطة عندي بخمسين والحلاقة ببلاش.",
            "فاكر نفسك صحفي شاطر؟ لأ، انت زبون شاطر. والحلاقة الجاية على حسابك برضه."
          ],
          "ignored": [
            "إديتك دليل الحلاقة. الحلاقة يا عم!",
            "أنا اللي بحلقله وانت مصدق تويتر؟",
            "إديتك المعلومة وانت على الكرسي وقلت \"هري\"؟ يبقى انت اللي هري.",
            "ده أنا حلفتلك بالموس. بالموس يا جدع!",
            "خلاص، من النهارده أخباري للزبون اللي بعدك.",
            "مش قلتلك؟ قلتهالك وانت قاعد على الكرسي والفوطة على رقبتك. كنت فين؟ جوه السشوار؟",
            "حتى الزبون اللي مستني دوره صدقني. وانت اللي معاك المتابعين كتبت العكس. بعدين معاك."
          ],
          "lied": [
            "أنا بس بحب الرغي، ماتاخدش كلامي جد 😂",
            "معلش يا باشا، بألّف وأنا بعمل الديجرادية.",
            "اللي قالي زبون، والزبون دايمًا على حق… إلا المرة دي.",
            "كان في مهرجان شغال عالي وماسمعتش هو قال إيه بالظبط.",
            "هو غمزلي، بس طلع في حاجة دخلت عينه. مش ذنبي.",
            "يا عم انت اللي صدقت حلاق! أنا بقول كلام عشان الزبون مايزهقش. ده جزء من الخدمة.",
            "ماكدبتش، اتلخبطت بين زبونين: واحد ماشي وواحد قاعد. انت اللي اخترت الغلط."
          ],
          "dodged": [
            "برافو، عمرك ما تصدق حلاق.",
            "ماتسمعش كلامي، أنا كمان شايف إن الأرض مسطحة شوية.",
            "أنا كنت بهزر واتضح إنك ذكي. مبروك علينا احنا الاتنين.",
            "شاطر إنك ماسمعتش. أنا ساعات بتكلم وأنا نايم.",
            "غلطت وانت صح؟ خلاص، الحلاقة الجاية بخصم.",
            "قلتلك حاجة غلط وطلعت صح؟ طبيعي، الناس بتفهم الحلاق بالعكس. ده نظام شغلي.",
            "ماتاخدش على كده. أنا مش بقول غلط، أنا بس ساعات بقول حاجة تانية."
          ]
        },
        "leak": {
          "toldYou": [
            "المرة الجاية اكتب اسمي، ماشي؟",
            "مش قلتلك؟ كده ليا عندك قهوتين.",
            "تمام، دلوقتي ليا عندك غدا. مش قهوة. غدا.",
            "نشرت خبري قبل جرنالي. أنا زعلان وفرحان في نفس الوقت.",
            "قول \"مصدر مقرب\" وأنا هعرف إنه أنا. وده كفاية… تقريبًا.",
            "الخبر اللي كسّرت بيه الدنيا ده بتاعي، انت حطيت اسمك تحته بس. عزومة مشويات مش أقل.",
            "مبروك يا نجم. اكتب في البايو \"بمساعدة صاحبي في الجرنال\". ولا الوجبة أهم؟ الوجبة أهم."
          ],
          "ignored": [
            "إديتك خبرنا وبرضه بوّظتها.",
            "الديسك عندنا بيضحك عليك. آسف.",
            "جبتلك الخبر من جوه الديسك وانت قلت العكس؟ محتاج تتعالج.",
            "رئيس التحرير بيقرا تويتتك بصوت عالي في الاجتماع. للتريقة.",
            "أنا حرقت مصدري عشانك، وانت حرقت الخبر.",
            "مش قلتلك؟ الخبر نزل عندنا واتشيّر ألف مرة وانت لسه بتكتب العكس. رئيس تحريري بيضحك عليك في الاجتماع.",
            "إديتك سبق ببلاش ورميته. أول مرة أتنازل عن وجبة، وآخر مرة."
          ],
          "lied": [
            "أوبس. الديسك عندنا اتضحك عليه برضه.",
            "نزلنا نفس الخبر الغلط. تضامن؟ 😬",
            "الجرنال كله وقع في نفس الحفرة. حتى الأرشيف اتكسف.",
            "كان تسريب مقصود من حد عايز يحرقنا. واتحرقنا. وانت معانا.",
            "الغدا يتأجل. وكرامتي كمان.",
            "الغلط غلط الديسك مش غلطي. وانت اللي نقلت من غير ما تتأكد. وأنا متأكد إني مش هدفع الأكل.",
            "احنا جرنال بيغلط عشر مرات في اليوم. انت اللي قررت تبقى المرة الحداشر."
          ],
          "dodged": [
            "سبقت جرنالي أنا شخصيًا. بكرهك.",
            "ماشي، انت صح وأنا غلط. ماتقولش لرئيس التحرير.",
            "خبرنا كان غلط وانت قلبته صح. عايز تشتغل عندنا؟",
            "ماصدقتنيش؟ جامد. أنا شخصيًا مابصدقنيش.",
            "ماتقولش لحد إني قلتلك كده. خلينا نعتبرها ماحصلتش.",
            "كنت غلطان وانت طلعت صح؟ خلاص نكتب المصدر \"صاحب في جرنال تاني\" والكريدت يتقسم.",
            "ماتقولش لحد إني قلتلك غلط، وأنا مش هقول لحد إنك نجحت من غيري. اتفاق شرف وعليه عشا."
          ]
        }
      }
    }
  },
  "es": {
    "bn": {
      "ui": {
        "calls": "Tus pronósticos",
        "callsAside": "{a} de {b} acertados",
        "seeAll": "Ver las {n} respuestas",
        "allReplies": "Las menciones",
        "breakdown": "Desglose completo",
        "breakdownAside": "Cada punto, explicado",
        "board": "Clasificación",
        "roomBoard": "Tabla de la sala",
        "desk": "Mesa de carrera",
        "share": "Compartir",
        "close": "Cerrar",
        "ratio": "Ratio",
        "hot": "Tendencia",
        "replying": "En respuesta a {h}",
        "rival": "Rival",
        "source": "Fuente",
        "fan": "Hincha",
        "you": "Tú",
        "quiet": "Dejados en visto",
        "quietN": "Sin pronóstico sobre {n}",
        "quietTap": "Mira lo que dicen",
        "likes": "Me gusta",
        "reposts": "Reposts",
        "replies": "Respuestas",
        "pub": "El veredicto del bar",
        "boardEmpty": "Nadie ha publicado aún. Sé el primero.",
        "boardOff": "La tabla necesita conexión.",
        "boardYou": "Vas {r} de {n}",
        "practiceBoard": "La práctica es off the record. Ni tabla ni testigos.",
        "openRoom": "Abrir la sala",
        "score": "Puntos",
        "rank": "Puesto",
        "right": "Acierto",
        "wrong": "Fallo",
        "excl": "Exclusiva",
        "none": "Sin publicar",
        "dayN": "Día {n}",
        "deleted": "Tuit borrado",
        "tapHint": "Toca para ver el hilo entero"
      },
      "tweet": {
        "pre": [
          "👀 Me llega que",
          "📈 Avanza:",
          "🚨 CERRADO:"
        ],
        "ut": "✏️ Rectifico.",
        "o": {
          "0": [
            "{p} al {d}. Reconocimiento reservado y boli en mano.",
            "{p} → {d}. La camiseta ya está en imprenta.",
            "{p} será jugador del {d}. Apúntalo."
          ],
          "1": [
            "{p} sale del {c}, pero no al {d}. Se lo han birlado.",
            "Sorpresa de última hora: {p} deja al {d} plantado en el altar.",
            "{p} se va, pero no al {d}. Robo en toda regla."
          ],
          "2": [
            "Lo de {p} al {d} está muerto. El {c} no afloja.",
            "Se rompen las negociaciones por {p}. El {d} se retira.",
            "{p} se queda. Operación con el {d}, cancelada."
          ],
          "3": [
            "¿{p} al {d}? Nunca existió. Humo de agente.",
            "Nadie del {d} ha llamado por {p}. Ciencia ficción.",
            "{p} y el {d}: nunca hubo negociación."
          ]
        }
      },
      "fans": [
        [
          "Culé de bar",
          "@cule_de_bar"
        ],
        [
          "Merengue de toda la vida",
          "@merengue_de_siempre"
        ],
        [
          "Colchonero sufridor",
          "@colchonero_sufre"
        ],
        [
          "Bético manque pierda",
          "@betico_manque"
        ],
        [
          "El cuñado futbolero",
          "@el_cunado_fut"
        ],
        [
          "La abuela del quinto",
          "@abuela_del_quinto"
        ],
        [
          "Pachanguero de domingo",
          "@pachanga_domingo"
        ],
        [
          "Ultra del sofá",
          "@ultra_del_sofa"
        ],
        [
          "Fantasy fracasado",
          "@fantasy_fracaso"
        ],
        [
          "El del bombo",
          "@el_del_bombo"
        ],
        [
          "Tiki Taka Toni",
          "@tikitaka_toni"
        ],
        [
          "Perico fiel",
          "@perico_fiel"
        ],
        [
          "Txuri-urdin",
          "@txuri_urdin_1909"
        ],
        [
          "Bostero del tablón",
          "@bostero_tablon"
        ],
        [
          "Millonario de la Sívori",
          "@millo_sivori"
        ],
        [
          "El pibe del fondo",
          "@pibe_del_fondo"
        ],
        [
          "Bocata al descanso",
          "@bocata_descanso"
        ],
        [
          "Chivas de corazón",
          "@chiva_corazon"
        ],
        [
          "Colo-Colo mío",
          "@colocolo_mio"
        ],
        [
          "El VAR me odia",
          "@el_var_me_odia"
        ]
      ],
      "tierQuip": {
        "T1": [
          "Portada, a toda plana, y el jefe paga la primera ronda.",
          "Paren las rotativas. Bueno, no: están imprimiendo tu nombre.",
          "No es que estés enterado. Es que la fuente eres tú.",
          "El grupo de WhatsApp se ha quedado callado. Eso es respeto.",
          "Here we go. Y tú llegaste primero.",
          "Vales tu peso en portadas.",
          "Los agentes te tienen guardado como \"a este no se le miente\"."
        ],
        "T2": [
          "Buen partido. No es portada, pero la contra te adora.",
          "Buen día en la oficina. Nadie lo enmarca, pero nadie se ríe.",
          "Te faltó un pelo para oler la tinta de portada.",
          "Limpio. Como un 0–2 fuera de casa bajo la lluvia.",
          "Aseado. Tu madre lo compartiría en Facebook.",
          "Una exclusiva más y te hacían hueco en portada.",
          "Para ganarte un gesto del palco de prensa."
        ],
        "T3": [
          "Página nueve, junto a la quiniela. Pero sale.",
          "Mitad de tabla. Sin sustos, sin gloria. Muy de martes.",
          "Ni desastre ni documental.",
          "El jefe asintió. No sonrió. Asintió.",
          "Un punto fuera de casa. Cógelo y al autobús.",
          "Acertaste unas, fallaste otras de pena. El fútbol es así.",
          "Tu credibilidad está cedida. Intenta devolverla entera."
        ],
        "T4": [
          "Sales en el periódico. Por los pelos. Debajo del crucigrama.",
          "Tu credibilidad, en puestos de descenso.",
          "La grada canta, pero no tu nombre.",
          "Salvado por el goal average. Justito.",
          "Aparcaste el autobús y aun así te marcaron.",
          "El jefe quiere hablar contigo. En voz baja, que es peor.",
          "El grupo está escribiendo… agárrate."
        ],
        "SPIKED": [
          "A la papelera. El jefe ha envuelto el bocata con tu noticia.",
          "Balón a la grada. Y tus fuentes con él.",
          "Las capturas ya circulan por tres grupos.",
          "Tuits de Galáctico, fuentes de pachanga.",
          "Respira. Borra la app. Instálala mañana.",
          "Hasta el barbero te ha silenciado.",
          "Fuiste a por lana y saliste trasquilado."
        ]
      },
      "idiom": {
        "up": [
          "Por la escuadra.",
          "Partido a partido, y te llevas la Liga.",
          "Tienes más olfato que un nueve de área.",
          "Sabes más que los ratones colorados.",
          "Clavada a lo Panenka.",
          "De Primera División.",
          "Golazo de chilena.",
          "Eso es tener calle.",
          "Pisaste el área y la metiste.",
          "Con un par… de fuentes.",
          "Crack, fenómeno, máquina.",
          "Aquí hay nivel, hermano."
        ],
        "down": [
          "Vendehumos de manual.",
          "Te has ido de vacío.",
          "Balón a la grada.",
          "Mucho ruido y pocas nueces.",
          "Palo y fuera.",
          "Te ha pillado el toro.",
          "Más perdido que un pulpo en un garaje.",
          "Donde dije digo, digo Diego.",
          "Te comiste el amague.",
          "Chupando banquillo hasta nuevo aviso.",
          "A llorar al campito.",
          "Te vendieron la moto y encima la pagaste."
        ]
      },
      "fan": {
        "roast": [
          "¿{p} a {d}?? el tío lo dijo con el pecho fuera 💀",
          "borra esto y desconecta 😭",
          "mi tío trabaja en {c} y dice que es mentira",
          "guardo captura para cuando envejezca como la leche 🥛",
          "comportamiento de tier 9 sinceramente",
          "la confianza… el fallo… icónico",
          "ratio + caíste + {p} se está riendo de ti",
          "este tuit envejeció como un plátano en una sauna 🍌",
          "borra esto y vete a dormir 😭",
          "mi tío curra en {c} y dice que es humo",
          "tu fuente es el grupo de WhatsApp de tu madre",
          "guardo captura para cuando caduque como un yogur 🥛",
          "vendehumos nivel dios",
          "qué seguridad… qué cagada… icónico",
          "ratio + te caíste + {p} se está descojonando",
          "te lo inventaste en el bus, ¿verdad?",
          "fuente: mi primo 🧢",
          "fraude total. unfollow",
          "ni en {d} saben de esto jajaja",
          "ponte la nariz roja, payaso 🤡",
          "te perderías en una cabina, como para un mercado de fichajes",
          "que te pise la exclusiva el Tabloide… vergüenza ajena",
          "el chaval sacó la info de una pantalla de carga del FIFA",
          "por esto tu madre no dice en qué trabajas",
          "hasta el barbero lo sabía. EL BARBERO.",
          "comportamiento de pringado profesional",
          "carrera de periodismo sacada de una caja de cereales 🥣",
          "y lo publica con 'CERRADO' y todo 😭😭",
          "el agente de {p} te ha bloqueado por pena",
          "lo voy a imprimir y a enmarcar en el baño",
          "eres la razón por la que existen las Notas de la Comunidad",
          "y el premio al cuñado del mercado es para…",
          "hasta el utillero de {c} se está riendo de ti",
          "tira esto, tira el móvil y empieza de cero",
          "¿tus fuentes? Wikipedia y una máquina de Coca-Cola",
          "sacaste esto de un hilo de Reddit de FIFA tío",
          "la cara dura que tienes… impresionante",
          "en serio crees que eres ITK con esto? 😭",
          "tu OPSEC es twittear desde el baño de la disco",
          "la confianza con la que escribiste '{p} a {d}'... brutal",
          "tipear 'CERRADO' con esta información? PATÉTICO",
          "fuente: tu gato pisó el teclado",
          "hermano, llevas 6 partidos en el FM, siéntate",
          "amaneciste eligiendo VIOLENCIA… contra tu propia credibilidad",
          "como romper una noticia? tú no tienes la fórmula",
          "el barbero del barbero sabe más que tú",
          "qué nivel de vergüenza ajena hermano 💀",
          "me voy a acordar de esto cuando {p} se mueva de verdad",
          "{p} a {d} dice. Y yo soy titular en la Champions 🤣",
          "este tuit lo pongo en el grupo de la familia para que se rían en la comida del domingo",
          "¿tu fuente es el barbero o el karma? porque ninguno te ha salido bien",
          "tienes menos olfato que un portero con gripe",
          "ni con VAR, ni con repetición, ni con lupa se ve de dónde sacaste esto",
          "vas a ir a la redacción con gafas de sol y gorra durante un mes",
          "has puesto 'CERRADO' con la seguridad de un opositor el primer día",
          "la exclusiva más exclusiva: solo te la creíste tú",
          "{p} leyendo tu tuit desde {c} con un café en la mano: 😐",
          "el algoritmo te ha dado más visibilidad para que te vea más gente fallar 💀",
          "has quedado peor que el que dijo que el VAR iba a acabar con las polémicas",
          "tu credibilidad ha bajado más que el Wi-Fi de un AVE en un túnel",
          "voy a hacer un TikTok con tus fallos. Serie de 40 partes",
          "hasta el loro del bar lo sabía",
          "tuit guardado en la carpeta 'fracasos históricos' ✅",
          "tu reputación ha durado menos que un entrenador del {c} en racha mala",
          "bajón de seguidores en directo, qué espectáculo 🍿",
          "a ti te dan la exclusiva y la pierdes en el bolsillo del pantalón",
          "{d} ni sabía que estaba en la conversación 😭",
          "te lo curras más en el tuit que en la investigación",
          "la próxima vez pronostica lo contrario y así aciertas",
          "tus fuentes cotizan en bolsa: todas a la baja 📉",
          "pregúntale a una bola de ocho mágica, tendrás más precisión",
          "tu dedo pulsó 'publicar' antes que tu cerebro pensara",
          "esto va directo al compilado de 'peores exclusivas del mercado' 🏆",
          "{p} se ha quedado donde estaba y tú te has ido directo al banquillo",
          "periodismo de sillón con el sillón al revés",
          "tu tasa de acierto es de mercado de invierno: nula"
        ],
        "praise": [
          "DE LOS MEJORES ✍️",
          "lo dijiste hace días, respeto 🫡",
          "por esto te seguimos",
          "los de {d} están GRITANDO ahora mismo",
          "comportamiento tier one 🥇",
          "nunca dudé de ti (dudé de ti)",
          "este hombre nunca falla 🎯",
          "por esto te seguimos, crack",
          "nivel tier one 🥇",
          "este tío no falla nunca 🎯",
          "sabe más que el míster 🔥",
          "¿¡quién le pasa la info a este!?",
          "que le den un programa en la tele ya 📺",
          "de rodillas ante el maestro 🙇",
          "qué locura, qué locura",
          "este vive en el palco de {d}",
          "perdón por llamarte vendehumos la semana pasada",
          "respeten a este señor",
          "¿ITK? no, directamente adivino",
          "mi timeline no está preparado para tanta salsa",
          "ha vuelto a acertar. ¿quién es su fuente, Dios?",
          "el agente está llorando ahora mismo 😂",
          "notificaciones activadas para este tío",
          "eres un fantasma, vives en las paredes del club",
          "a este le dejaba elegir los números de la lotería",
          "este tuit sale en el documental seguro",
          "máquina. pedazo de máquina.",
          "esto es PERIODISMO de élite hermano",
          "¿cómo sacaste la info antes que los propios clubs?",
          "vives en el palco de {d} sin pagar entrada 🏟",
          "la precisión con la que te adelantaste tío... BRUTAL",
          "tus fuentes son Tier 0 directamente",
          "eres de esos que nacen siendo ITK",
          "si todos los periodistas fueran así... me uno 🔥",
          "{p} a {d} lo solté cuando TÚ lo dijiste. Respeto.",
          "no te equivocas. Punto.",
          "esto es por lo que pagaba suscripción",
          "Tier One confirmado 🥇 (tú, no el juego)",
          "tu tasa de acierto es DESORBITADA hermano",
          "tío estás en el WhatsApp de {d} vaya",
          "la precisión… la confianza… *chef's kiss*",
          "alguien con otro nivel de información hermano",
          "otra más para el museo de las exclusivas 🏛️",
          "este tío tiene un micro escondido en el despacho de {d} fijo",
          "desde hoy le leo antes que al periódico",
          "{p} aún no se ha puesto la camiseta y tú ya lo sabías 🔥",
          "el mercado va a remolque tuyo",
          "confirmado: el que no te sigue va con retraso",
          "sus fuentes cobran en diamantes seguro 💎",
          "le han dado el balón de oro de las exclusivas",
          "lo clavaste como un penalti a lo Panenka 🎯",
          "vale, retiro todo lo que dije de ti en el grupo",
          "que le pongan una estatua en la puerta de {d}",
          "voy a activar la campanita y ponerle nombre a mi perro en tu honor",
          "este es el que les cuenta los fichajes a los directores deportivos",
          "de tuitero a leyenda en un solo mercado",
          "si fueras jugador serías un fichaje galáctico",
          "exclusiva de oro, tío. Vaya tela",
          "hay que clonar a este hombre y ponerlo en cada club",
          "periodista de guardia, sin fallos, sin excusas 🫡",
          "te lo juro que te voy a tatuar el tuit",
          "el Tabloide pidiendo tu teléfono ahora mismo 😂",
          "le has ganado la carrera a medio planeta. Crack total",
          "los de {c} se enteran por ti, no por su club 💀"
        ],
        "excl": [
          "¿cómo eres SIEMPRE el primero? 😭",
          "el resto de Twitter está leyendo tus tuits ahora mismo",
          "primero Y acertado. increíble",
          "ahora todos te citan a ti",
          "antes de que el {d} lo anunciara. ¿quién es tu fuente?",
          "tenías lo de {p} antes que el propio {p}",
          "la exclusiva del mercado, sin debate",
          "todas las cuentas rivales se han quedado calladas",
          "los clubes deberían pagarte como jefe de prensa",
          "tú lo diste, ellos lo confirmaron. así de simple",
          "las agencias te copian los deberes 📝",
          "primero y sin nadie cerca",
          "eso no es una exclusiva, es una hemeroteca entera",
          "los rivales refrescando tu perfil para su próximo tuit",
          "exclusiva y correcta. para enmarcar"
        ],
        "late": [
          "otra cuenta lo tenía hace días, pero vale 🙄",
          "bienvenido a las noticias de ayer",
          "bien, pero el Tabloide llegó antes",
          "genial, ahora mira las horas de publicación",
          "acertado y elegantemente tarde",
          "los insiders lo tenían antes del desayuno",
          "tienes razón. como todos los demás",
          "llegar a la fiesta cuando encienden las luces",
          "tarde pero bien. el autobús del {d} ya salió",
          "buena apuesta, pero medalla de bronce 🥉",
          "el primero en llegar segundo",
          "copiaste los deberes pero te pusieron nota",
          "los ITK lo dijeron el día 3",
          "respuesta buena, hora de otro",
          "repitiendo lo que ya sabíamos, qué bonito"
        ],
        "dd": [
          "rey del día límite 🕐",
          "¿apurando Y acertando?",
          "sangre fría en el último segundo",
          "lo clavó con segundos en el reloj. puro cine",
          "el fax aún estaba caliente cuando publicaste",
          "el hombre más tranquilo del día límite",
          "esperaste al último minuto y la clavaste",
          "eso es un gol en el descuento",
          "todos se ponen nerviosos en el día límite. tú cumpliste",
          "última apuesta, apuesta buena",
          "el reloj decía pánico, tú dijiste {p} al {d}",
          "sangre fría. pura sangre fría",
          "tu mejor trabajo a las 23:59",
          "especialista en día límite, fichadlo para el año que viene",
          "la exclusiva del pitido final"
        ],
        "softRight": [
          "lo susurraste y se cumplió 🤫",
          "dijiste \"me llega\" y te llegó bien",
          "acierto en voz baja. del bueno",
          "tenías que haberlo gritado, hombre. LO TENÍAS",
          "lo dijiste como quien pide un cortado ☕",
          "soft launch de la verdad 👀",
          "la próxima vez tírate a la piscina y pon CERRADO",
          "poco riesgo, mucha puntería. qué pillo",
          "tenías la exclusiva y la guardaste en la recámara",
          "de puntillas, pero entraste en la habitación buena",
          "acierto de tapadillo",
          "acertaste y encima con modestia. ¿quién te ha educado?",
          "gol a puerta vacía celebrado como un saque de banda",
          "la boca pequeña, el olfato grande"
        ],
        "softWrong": [
          "al menos no te mojaste mucho 😅",
          "ese 'conversaciones en curso' trabajando horas extra",
          "menos mal que solo lo susurraste",
          "fallo, pero en voz baja",
          "dijiste 'me llega', y te llegó mal",
          "el emoji de 👀 te salvó",
          "prudente y aun así desviado",
          "entraste de puntillas en el error",
          "por eso no lo dijiste alto",
          "un fallo discreto, lo dejamos pasar",
          "poca confianza, bien puesta",
          "al menos no le pusiste CERRADO",
          "apuesta blandita, caída blandita",
          "tú dudaste, la operación dudó, nadie ganó",
          "casi ni tuit, casi ni fallo"
        ],
        "loudWrong": [
          "CERRADO en mayúsculas y fallado. valiente",
          "el megáfono lo empeoró 📢",
          "le pusiste tu firma y todo",
          "el tuit más ruidoso del mercado, y el más equivocado",
          "lo gritaste desde la azotea y te caíste de la azotea",
          "la relación seguridad-acierto es histórica",
          "'confirmado' ha abandonado el chat",
          "lo anunciaste como un comunicado oficial. no lo era",
          "todo mayúsculas, cero datos",
          "ir a tope fue una elección",
          "esto lo van a citar durante años",
          "el ratio es más grande que la exclusiva",
          "apostaste la casa y perdiste la casa",
          "ese 📢 resuena en una sala vacía",
          "volumen al diez, acierto a cero"
        ],
        "silence": [
          "¿nada que decir de {p}? ¿miedo?",
          "te arrugaste sin decir nada",
          "callado con {p} todo el mercado. sospechoso",
          "la única historia que esquivaste 🦆",
          "¿sin apuesta? la afición se ha dado cuenta",
          "¿mucho trabajo o muchos nervios?",
          "{p} se movió y tú en silencio",
          "dejaste a {p} en visto",
          "ni una palabra sobre {p}. mmm",
          "te escondiste detrás del sofá con esta",
          "sin apuesta, sin mérito",
          "te saltaste a {p} como la pregunta difícil del examen",
          "toda la semana esperando tu opinión de {p}",
          "silencio total con {p}. total",
          "hasta una apuesta a ciegas habría sido algo"
        ],
        "uturnRight": [
          "Acertaste al final. Aunque el botón de borrar hizo casi todo el trabajo.",
          "Acierto tras cambiar de opinión. Hasta un reloj parado borra su primer tuit.",
          "Tu primera versión ya circula en capturas por el grupo, que lo sepas.",
          "Llegaste, sí. Por la ruta panorámica y con drama en público.",
          "Dos borradores y un ataque de nervios, pero vale. VALE.",
          "Respuesta correcta, camino horrible. Todos vimos el tuit borrado.",
          "Un acierto es un acierto, pero el bandazo va directo al resumen de la temporada.",
          "Enhorabuena por acertar a la segunda. La primera queda archivada para siempre.",
          "Acertaste al final, pero tu primer tuit vive en mi galería 📸",
          "Respuesta correcta, entregada en segunda convocatoria. Aprobado raspado.",
          "Llegaste. Tu botón de borrar también. A medias el mérito.",
          "Acierto, sí. Valentía, no. Vimos el tembleque.",
          "Nadie enmarca un cambio de opinión, colega. Ni aunque salga bien.",
          "La respuesta final era buena. También era tu segunda respuesta.",
          "Enhorabuena por corregirte antes de que lo hiciera el {c}.",
          "Clavaste {p} al {d}. Pasando antes por el pueblo de los errores.",
          "Acierto en la repetición. Reglas de pachanga, supongo.",
          "Cambiaste de idea y el universo te dio la razón. Suerte.",
          "Lo respeto. También guardé captura del primero. Las dos cosas.",
          "Terminó bien, empezó mal. El grupo recuerda el principio.",
          "Acierto con un asterisco del tamaño del estadio del {c}.",
          "¡Correcto! Ahora explica el tuit que borraste en directo.",
          "Bandazo directo a la respuesta buena. Caótico pero vale.",
          "Apuesta buena, media puntuación, vergüenza completa.",
          "Primero mal, luego bien. Arco de personaje de manual 📈",
          "El segundo borrador era bueno. El primero está en el museo.",
          "Acertaste tras tirar a la basura la primera versión. Madurez, será.",
          "Gol en el rechace. Cuenta, pero feo.",
          "Bien al final. Tu primera versión saldrá en tu despedida.",
          "Lo salvaste. Seguimos hablando de por qué hubo que salvarlo.",
          "Te corregiste los deberes y los entregaste tarde. Un notable bajo.",
          "El giro funcionó. La carpeta de capturas también.",
          "Respuesta correcta con un giro grapado. Bonito.",
          "Mucho respeto por arreglarlo. Poco por la primera versión.",
          "Bien a la segunda. {p} la habría metido a la primera.",
          "Borraste, cambiaste, acertaste. Maestro del caos 🌀",
          "¡Correcto! Pero dinos quién te quitó la primera idea.",
          "Bien, pero dando la vuelta entera a la M-30.",
          "Lo contamos como victoria. El tuit borrado no está de acuerdo.",
          "A la segunda fue la vencida. La primera sigue en mis capturas.",
          "al final llegaste, bien jugado 🫡",
          "evolución de personaje 📈",
          "reconocer el error > equivocarse gritando",
          "fuiste por la ruta larga pero aciertas",
          "cambiaste cuando cambiaron los datos. raro por aquí",
          "humilde para borrar, fino para acertar. respeto",
          "otros se habrían enrocado. tú lo arreglaste",
          "el arco de redención que necesitábamos",
          "bien jugado, la segunda apuesta fue exacta",
          "acertar al final sigue siendo acertar",
          "periodismo de verdad es corregir cuando fallas",
          "leíste el partido y cambiaste a tiempo",
          "pocos lo reconocerían. chapó",
          "la rectificación fue tu mejor tuit del mercado",
          "volviste desde el borde del abismo. qué sangre fría"
        ],
        "uturnJab": [
          "todos vimos el primer tuit 📸 las capturas son eternas",
          "a base de bandazos llegaste a la verdad jaja",
          "especialista en el botón de borrar",
          "la carpeta de capturas no olvida",
          "ahora aciertas, pero el archivo dice otra cosa",
          "tu primera versión está fijada en el grupo",
          "qué curioso cómo desapareció el primer tuit",
          "no nos olvidamos de lo primero que dijiste de {p}",
          "la tecla de borrar haciendo todo el trabajo",
          "periodismo veleta 🌬️",
          "acertaste, pero después de probar todas las opciones",
          "que alguien revise la papelera de tuits",
          "no lo anticipaste, lo corregiste",
          "dos tuits y uno escondido. mmm",
          "el giro fue más rápido que {p} a la contra"
        ],
        "uturnWrong": [
          "Borraste un tuit para equivocarte MÁS. Un talento.",
          "Cambiaste de opinión y te estampaste contra la pared.",
          "Tu primera versión también era mala, pero al menos eras coherente.",
          "Dos pronósticos, cero aciertos. Portería a cero, pero de las malas.",
          "Cambiaste de chaqueta y aun así la liaste. Suelta el portátil.",
          "Imagínate borrar un tuit para ESTO.",
          "El cambio de opinión fue lo más seguro que hiciste en todo el mercado. Y aun así fallaste.",
          "Volviste a la pizarra y dibujaste un payaso.",
          "Borraste un error para publicar otro nuevecito. Eficiencia.",
          "Dos tuits sobre {p}. Cero aciertos. Colección completa.",
          "Tuviste dos intentos y fallaste los dos.",
          "El giro era para arreglarlo, hombre. Esa era la idea.",
          "Cambiaste de carril y te la pegaste igual 🚗",
          "Haberte quedado con el primero. También era malo, pero fiel.",
          "Mal, borrado, mal otra vez. La trilogía que nadie pidió.",
          "Te entró el pánico y se notó. Dos veces.",
          "Cambiaste un fallo por otro fallo distinto. Estrategia audaz.",
          "Borrar tuits no te va a salvar de ESTE.",
          "Bandazo, patinazo y otro patinazo.",
          "Dos respuestas distintas y {p} pasó de las dos.",
          "Giraste la ruleta dos veces y salió payaso.",
          "Volviste a intentarlo y tropezaste en el mismo bordillo.",
          "Reescribiste la historia y la historia dijo que no.",
          "Ese giro tuvo la seguridad de quien aparca contra una farola.",
          "Tuit nuevo, mismo resultado: fallo.",
          "Doble o nada y elegiste la nada.",
          "Dos apuestas sobre {p} y ninguna sobrevivió a la realidad.",
          "Hasta el botón de borrar está avergonzado.",
          "Si no lo consigues a la primera, al parecer, falla más fuerte.",
          "Te corregiste hacia un sitio peor. Navegación impresionante.",
          "La afición del {c} tiene las dos capturas y está haciendo un carrusel.",
          "Dos versiones, un jugador, ni idea.",
          "Mala suerte. Bueno, suerte no. Fallo doble.",
          "El giro fue lo único seguro que hiciste. Y aun así fallaste.",
          "Pediste una segunda opinión. Era tuya. También mala.",
          "Primera versión: mal. Segunda: mal. Tercera: por favor, no.",
          "No cambiaste de opinión, cambiaste de error.",
          "Fallo en estéreo 🔊",
          "Doble falta. Vuelta al fondo de la pista.",
          "Borraste y repetiste el fallo en alta definición.",
          "borró un tuit malo para poner otro malo 💀",
          "dos versiones, cero aciertos",
          "bandazo y patinazo",
          "haberte quedado con el primero, la verdad",
          "cambio de sentido directo a la cuneta",
          "versión nueva, mismo fallo",
          "apostaste al caballo equivocado dos veces",
          "cambiaste la respuesta y suspendiste igual",
          "la segunda idea fue peor, no sé cómo",
          "fallar de dos formas distintas. creativo",
          "¿borraste para ESTO?",
          "no una, sino dos apuestas malas con {p}",
          "el giro no giró nada",
          "lo reescribiste y seguiste con un suspenso",
          "borrado por pánico, tuit por pánico, fallo por pánico"
        ],
        "pity": [
          "respeto por intentarlo dos veces, en serio",
          "mala suerte, el primero estaba más cerca 😅",
          "al menos eres insistente",
          "bien por dar la cara al borrar",
          "mercado duro, ya te recuperarás",
          "era difícil de acertar, la verdad",
          "nadie lo vio venir, tranquilo",
          "medio Twitter también falló",
          "mando un abrazo a tus menciones",
          "lo intentaste, que es más que muchos",
          "valiente publicar dos veces. fallaste, pero valiente",
          "sacúdetelo, mañana tablero nuevo",
          "esta historia era un caos, no es todo culpa tuya",
          "qué pena, la primera lectura tenía sentido",
          "un mal día no hace a un mal periodista"
        ],
        "twistCalled": [
          "anticipaste el vuelco antes del vuelco. brujo",
          "sabías lo de {p} antes que el teletipo",
          "a todos les pilló el vuelco, tú acertaste",
          "lo viste venir de lejos 🌀",
          "la historia cambió y aterrizó en TU tuit",
          "adivinaste el guion antes del guion",
          "¿cómo sabías que iban a tirar de la alfombra?",
          "el vuelco confirmó tu tuit. increíble",
          "el teletipo te fue persiguiendo",
          "estabas en la sala de guionistas de esta historia",
          "aguantaste en pleno caos y cobraste",
          "nadie te creyó con {p}. ahora todos",
          "leíste el final primero, ¿verdad?",
          "el vuelco solo fue vuelco para los demás",
          "apuesta de profeta con {p}"
        ],
        "twistCaught": [
          "tenías razón el martes, el domingo ya no",
          "te retorció el vuelco como un trapo 🌀",
          "la historia cambió y tú no",
          "bien en su momento, mal al pitido final",
          "llegó el vuelco y tu tuit seguía ahí plantado",
          "eso pasa por no actualizar",
          "tu apuesta caducó en directo",
          "la trama avanzó, tú te quedaste quieto",
          "lo tenías, y luego la historia decidió otra cosa",
          "desfasado antes de que cerrara el mercado",
          "el teletipo avisó a todos. tú dormías la siesta",
          "lo que sabías era verdad hasta que dejó de serlo",
          "mala suerte con el vuelco, pero podías haber cambiado",
          "la verdad de ayer, el fallo de hoy",
          "el vuelco se despidió y tú no dijiste adiós"
        ],
        "twistUpdated": [
          "viste el vuelco y actualizaste. ese es el trabajo",
          "reaccionaste a la noticia como un profesional",
          "la historia cambió y tú también. bien hecho",
          "rápido actualizando 🌀",
          "muchos se congelaron tras el vuelco. tú no",
          "ajustaste tras el teletipo y la clavaste",
          "así se maneja un vuelco",
          "encima del caos todo el rato, bien jugado",
          "leíste lo nuevo y reaccionaste rápido",
          "actualizaste antes que la web del club",
          "el vuelco no te pilló",
          "cambiaste la apuesta por el motivo correcto",
          "giraste en el momento perfecto",
          "un vuelco, una pensada, un acierto",
          "flexible y acertado. combinación letal"
        ]
      },
      "rival": {
        "gloat": {
          "tabloid": [
            "JAJAJA. Lo dije a toda España el día {n}. Tú no has acertado ni la hora.",
            "Portada, contraportada y TU tuit: todo mal. Dedícate a los crucigramas, majo.",
            "Unos tenemos fuentes. Otros tienen un barbero 💇",
            "Nosotros acertamos Y gritamos. Tú, ni lo uno ni lo otro."
          ],
          "itk": [
            "👀",
            "Unos sabíamos. Otros adivinaban. Seguimos.",
            "Lo dije hace días. Sin gritar. No hacía falta.",
            "Me llega que deberías haber escuchado."
          ],
          "insider": [
            "Según pudimos saber, la versión correcta se publicó aquí el día {n}.",
            "Para que conste: lo teníamos. Nada personal.",
            "Fuentes cercanas a la historia dicen que tú no estabas cerca.",
            "Te guardamos una mesa en la redacción. En correo interno."
          ]
        },
        "concede": {
          "tabloid": [
            "Vale. VALE. La tenías tú. Reimprimimos la contraportada 😤",
            "¿Quién es tu fuente y cuánto quiere por filtrarnos a nosotros?",
            "Mi director pregunta quién eres. A gritos.",
            "Esta es tuya, disfrútala. Mañana volvemos con titular a toda plana."
          ],
          "itk": [
            "Respeto. De verdad. No te acostumbres.",
            "Bien jugado. Borrando mis borradores.",
            "...vale, esa fue buena.",
            "Me llega que eres irritantemente bueno en esto."
          ],
          "insider": [
            "Hay que reconocerlo: exclusiva limpia.",
            "Confirmamos: la tuvo antes que nadie.",
            "Rectificamos. Pasa. Pocas veces.",
            "Un trabajo serio. El palco de prensa ha tomado nota."
          ]
        },
        "smug": {
          "tabloid": [
            "Bienvenido a la fiesta, crack. Ya nos hemos comido el jamón 🍖",
            "Qué detalle que te sumes. El día {n} quiere su exclusiva de vuelta.",
            "¿Copiando los deberes? Al menos cambia alguna palabra.",
            "Aciertas, sí. Segundo, también 🥈"
          ],
          "itk": [
            "Llegar pronto es una actitud. Tarde es una hora.",
            "Me alegro de que llegaras. Al final.",
            "Me llega que por fin te ha llegado.",
            "Algunos estábamos ahí el día {n}. Lo dejo caer."
          ],
          "insider": [
            "Como adelantamos el día {n}.",
            "Nos alegra ver confirmada nuestra información. Otra vez.",
            "Nuestra hora de publicación, a su disposición.",
            "Bienvenido. El tren salió de la estación el día {n}."
          ]
        },
        "alsoWrong": {
          "tabloid": [
            "A mí no me mires, que también la cagamos. Eso sí, con titular a cinco columnas.",
            "Mal de muchos, consuelo de tontos. ¿Una caña?",
            "Nos la colaron a los dos. La culpa, del agente, como siempre.",
            "Dos errores no hacen un acierto. Hacen un grupo de WhatsApp buenísimo."
          ],
          "itk": [
            "De esta no se habla.",
            "Hay culebrones que mejor olvidar. Olvidémoslo juntos.",
            "Borrando. Te recomiendo lo mismo.",
            "🤐"
          ],
          "insider": [
            "Una historia difícil para todos. Nosotros incluidos.",
            "Hemos aprendido la lección. Probablemente.",
            "Sin comentarios. Tampoco sobre tu comentario.",
            "Revisaremos nuestras fuentes. Te recomiendo lo mismo."
          ]
        },
        "uturn": [
          "Alguien acaba de borrar un tuit sobre {p} 👀 Hay capturas, colega.",
          "Alerta de tuit borrado sobre {p} 🗑️ la hemeroteca saluda.",
          "Acaba de desaparecer una apuesta sobre {p}. Tenemos pruebas 📸",
          "Alguien está reescribiendo su apuesta sobre {p}. Vimos el borrador.",
          "Tuit sobre {p} borrado en silencio. Internet no olvida.",
          "Alguien acaba de borrar un tuit sobre {p} 👀 Hay capturas, amigo. Siempre las hay.",
          "Alguien acaba de borrar un tuit sobre {p} 👀 Hay capturas, colega. Siempre las hay."
        ]
      },
      "src": {
        "agent": {
          "toldYou": [
            "Te lo dije. Eso es un 10%.",
            "De nada. La factura está en tus MD.",
            "¿Ves? Cuando pago yo la cena, la info es buena. Mi 5% por la exclusiva, cuando puedas.",
            "Acertaste porque yo lo permití. Te mando factura por 'asesoría mediática'.",
            "Bombazo tuyo, dinero mío. Así funciona el mundo, crack 💸",
            "Hemos acertado los dos. Bueno, yo más. Te mando la factura de asesoría. En negrita, para que la veas bien.",
            "Mi info, tu tuit, mis likes. Esto es un buen reparto. Aunque yo me quedo el 90%, como siempre."
          ],
          "ignored": [
            "Te lo dije clarito. ¿Eres tonto o qué?",
            "Te lo dije por escrito. Por escrito, tío. Lo tengo hasta en el PDF del contrato.",
            "Te regalé la exclusiva y la dejaste en visto. Eres el primero que rechaza algo gratis de mí.",
            "Todo el mercado me cree menos tú. Precioso. Luego no me llames.",
            "Te lo dije. Palabra por palabra. Y tú a lo tuyo. Si fueras mi cliente te habría vendido a Segunda.",
            "Me ignoraste, fallaste y ahora te mandan capturas. Yo cobro comisión hasta de tus errores. Gracias, crack."
          ],
          "lied": [
            "Negocios son negocios, chaval 😘",
            "¿Mentir? Yo lo llamo 'negociar'.",
            "Oye, el mercado cambia cada cinco minutos. Mi versión era buena hace cinco minutos.",
            "La culpa es del presidente, del director deportivo y del Wi-Fi del hotel. Mía, no.",
            "Yo no miento, yo 'anticipo escenarios alternativos'. Y cobro por ello.",
            "Te mentí, sí. Es mi trabajo. El tuyo era no creerme. Uno de los dos lo ha hecho bien.",
            "¿Arrepentido? Tío, yo me arrepiento cuando no cobro. Y he cobrado. Tú apáñatelas con el ratio."
          ],
          "dodged": [
            "Buen instinto. No se lo digas a mis clientes.",
            "¿No te fiaste de mí? Listo. Duele, pero listo.",
            "Sabía que no me harías caso, por eso te lo dije así. Estrategia, chaval. Me debes una.",
            "Lo que te dije era una prueba de lealtad. La has suspendido, pero has acertado. Empate.",
            "Técnicamente tú acertaste gracias a mí: sabías que miento. De nada.",
            "Te engañé y acertaste igual. Eso es porque sabes leer entre mis mentiras. Te lo enseñé yo. Me debes el 10%.",
            "Te mentí por tu bien y mira: aciertas. Soy el mejor agente de tu carrera. Eso también se cobra."
          ]
        },
        "kitman": {
          "toldYou": [
            "Te dije que se llevó el champú bueno 😏",
            "El utillero nunca falla, chaval.",
            "La lavandería nunca falla, tío. Aquí se sabe todo antes que en la prensa 🧺",
            "Te lo dije con las botas en la mano. Invítame a un bocata y estamos en paz.",
            "Yo doblo camisetas y tú te llevas los likes. Así va esto, crack.",
            "Acertamos los dos, pero la pista era mía. Tú solo pusiste los emojis. Ya te traigo toalla para el sudor de la fama.",
            "Mi lavandería te ha dado la exclusiva. Que se sepa. Y lávate esa camiseta de periodista, que ya huele a Tier One."
          ],
          "ignored": [
            "Le lavo los calzoncillos y aun así no me creíste.",
            "La próxima vez te hago un dibujito.",
            "Te di el dato de la taquilla y te fiaste de un hilo de Twitter. Vaya tela.",
            "Te lo dije entre toalla y toalla, clarito. Estás más perdido que un calcetín en la lavadora.",
            "Veinte años en este vestuario para que no me hagas caso. Me voy a llorar al almacén.",
            "Te dije lo que pasaba en mi vestuario y pronosticaste lo contrario. Hasta las toallas saben más de fútbol que tú.",
            "Te lo dije, literalmente. En el vestuario se están leyendo tu tuit en voz alta. Con voz de pito, además."
          ],
          "lied": [
            "Perdona, chaval, iba a ojo. Aquí los días son muy largos.",
            "Yo solo sé de medias, ¿qué esperabas?",
            "Culpa del de la cocina, que es el que me lo contó. Yo solo reenvío.",
            "Había tanto vapor en la lavandería que no veía ni a quién oía. Perdona, tío.",
            "Me fié de una bolsa de deporte. Las bolsas de deporte mienten, lo sé ahora.",
            "Te mentí y te lo tragaste. Hombre, es que tú preguntas en una lavandería. ¿Qué esperabas, un comunicado oficial?",
            "No me sabe mal, tío. Tú fallas y yo sigo doblando toallas tan tranquilo. Tu reputación, esa sí que está para lavar."
          ],
          "dodged": [
            "Bien hecho no hacerme caso, iba perdidísimo.",
            "¿No me escuchaste? Mejor. Me lo estaba inventando.",
            "Yo ya sabía que te darías cuenta. Era un examen. Aprobado raspado.",
            "Te conté lo del vestuario para despistar a los de la otra redacción. Tú lo pillaste. Olé.",
            "Menos mal que no me hiciste caso, que yo ese día confundí taquillas.",
            "Te conté una trola y acertaste igual. Eso es por la intuición que te he ido enseñando en la lavandería. De nada.",
            "Te la colé y aun así lo clavaste. Tienes más suerte que un portero con el palo. Mérito mío, claro."
          ]
        },
        "physio": {
          "toldYou": [
            "Clínicamente correcto. Como siempre.",
            "Diagnóstico confirmado. De nada.",
            "Diagnóstico precoz, resultado exitoso. Cierro el expediente.",
            "Te lo dije con evidencia clínica. Tú solo tenías que leer el informe.",
            "Otro caso resuelto. Pasa por caja: una caña y silencio profesional.",
            "Diagnóstico acertado. Por mi parte. Tu parte fue copiarlo. Alta médica para tu ego. Siguiente paciente.",
            "Los dos acertamos. Yo con datos, tú con un emoji de fuego. Evolución favorable. No te acostumbres."
          ],
          "ignored": [
            "Dije reconocimiento. Tú dijiste otra cosa. Ridículo.",
            "Haber hecho caso al médico, colega.",
            "Te di datos objetivos y elegiste la intuición. Mal pronóstico para tu carrera.",
            "Informe claro, conclusión clara, periodista confuso. Caso raro.",
            "Tenías el diagnóstico en la mano. Lo has tirado. Consulta cerrada.",
            "Te di un informe clínico y tú pronosticaste al revés. Te lo dije, literalmente. Pronóstico: ratio crónico.",
            "Exploración completada: te di la verdad, la ignoraste, fallaste. Sin tratamiento conocido. Siguiente."
          ],
          "lied": [
            "Me equivoqué de historial. Culpa mía.",
            "Leí las pruebas al revés, parece.",
            "Error de etiquetado en las muestras. Culpa del laboratorio, sin duda.",
            "Me pasaron el informe de otro paciente. Protocolo mejorable, lo reconozco. Yo, no.",
            "La medicina no es una ciencia exacta. Los fichajes, menos.",
            "Error en el informe. El tuyo fue creértelo. Responsabilidad compartida: 10% mía, 90% tuya.",
            "No hay remordimiento. Solo una nota en tu ficha: 'se cree cualquier cosa'. Siguiente paciente."
          ],
          "dodged": [
            "Bien hecho ignorarme. Estaba conmocionado.",
            "La segunda opinión acertó. Qué rabia.",
            "Mi informe tenía un margen de error. Tú has sabido interpretarlo. Buen ojo clínico.",
            "Te di una lectura preliminar. Tú hiciste la definitiva. Trabajo en equipo.",
            "Buena decisión pedir segunda opinión. Aunque la primera era la mía. Sin comentarios.",
            "Mi dato era falso y acertaste. Efecto placebo. Funciona hasta con periodistas. Me atribuyo el éxito.",
            "Te pasé un informe erróneo y aun así diste en el clavo. Te he entrenado bien. Factura por sesión adjunta."
          ]
        },
        "spotter": {
          "toldYou": [
            "Los aviones no mienten. ✈️",
            "Las matrículas no mienten, bro.",
            "El radar no falla, tío. Hora, matrícula y destino. Exclusiva de altura 🛩️",
            "Te lo dije desde la terraza de la T4 con los prismáticos. Eso es periodismo de verdad.",
            "Aterrizaje perfecto. Tu tuit y el jet, sincronizados.",
            "Mis radares no fallan y tú solo tuviste que mirar mi pantalla. Aterrizaje perfecto. Pilotaba yo, claro.",
            "Acertamos. Yo con el plan de vuelo, tú con cara de listo. Te dejo sentarte en mi terraza un día. Un día."
          ],
          "ignored": [
            "Te mandé el plan de vuelo. EL PLAN DE VUELO.",
            "Ignorar a un vigía de aviones… yo nunca.",
            "Te pasé la MATRÍCULA. Con la matrícula ya te lo daba masticado, tío.",
            "El avión aterrizó donde te dije y tú seguías mirando otra pista. Flipas.",
            "Te mandé la captura de Flightradar y ni la abriste. Me duele en el alma aeronáutica.",
            "Te di la ruta, la hora y la matrícula del avión. Y tú pronosticaste lo contrario. Te lo dije, literalmente. Vaya tela.",
            "Tenía el avión en pantalla y tú preferiste mirar a otro lado. Tu tuit ha tenido más turbulencias que mi Airbus favorito."
          ],
          "lied": [
            "Ese jet era de otro. Qué incómodo.",
            "Resulta que era un avión de carga lleno de plátanos. Perdón.",
            "Culpa del transpondedor, que iba apagado. No es mi culpa, es de la aviónica.",
            "Había niebla, tío. Con niebla todos los jets parecen iguales.",
            "Me confundí de matrícula por una letra. Una letra, tío. Detallitos.",
            "Te di un vuelo falso y te subiste sin mirar la puerta de embarque. Eso ya no es culpa del piloto, tío.",
            "Cero remordimientos. Tu carrera ha tenido un aterrizaje de emergencia. Yo sigo en mi terraza con los prismáticos."
          ],
          "dodged": [
            "Normal, estaba mirando la pista equivocada.",
            "¿No te fiaste de mi jet? Duro. Acertado, pero duro.",
            "Te di coordenadas de despiste a propósito. Buen piloto, has corregido rumbo.",
            "Ese día tenía el radar en modo prueba. Tú has volado solo. Bien.",
            "Te lo dije mal para ver si pensabas. Has aterrizado de pie, crack.",
            "El vuelo que te dije no existía y aun así acertaste. Eso es porque te he pegado el olfato aeronáutico. De nada.",
            "Mi pista era un Boeing fantasma y lo clavaste igual. Vuelas bien porque te enseñé yo a mirar el cielo."
          ]
        },
        "barber": {
          "toldYou": [
            "Te lo dije. El corte de presentación nunca miente ✂️",
            "Nunca dudes de un barbero, chaval.",
            "El sillón no miente, tío. Aquí se cuece todo antes que en los despachos ✂️",
            "Te lo dije mientras le rapaba la nuca. Exclusiva con olor a after-shave.",
            "Barbería 1, periodistas 0. Pásate y te hago un degradado de campeón.",
            "¿Ves? Mi silla es la mejor fuente de España. Acertamos. Tú invitas al próximo degradado.",
            "Te lo di en bandeja y lo clavaste. Ahora que eres famoso a ver si te cortas el pelo, que das pena en la foto de perfil."
          ],
          "ignored": [
            "Te di la pista del CORTE DE PELO. DEL CORTE.",
            "Le corto el pelo yo y te fías más de Twitter.",
            "Te lo dije con la maquinilla en la mano y tú mirando el móvil. Vaya tela.",
            "Te dejé la pista más clara que un rapado al cero. Y nada.",
            "Mi pista era oro. Tú la barriste con los pelos del suelo.",
            "Te lo dije, tío. Con estas tijeras en la mano. Y tú fallando como un corte hecho a oscuras.",
            "Por una vez que digo la verdad, me ignoras. Mira, te hago un rapado gratis para que te escondas en casa."
          ],
          "lied": [
            "Yo es que hablo por hablar, no me hagas caso 😂",
            "Perdona, me invento cosas mientras hago degradados.",
            "Me lo contó otro cliente. Y ese cliente también se inventa cosas. Culpa suya.",
            "Con el secador puesto no se oye bien, tío. Lo entendí al revés.",
            "Te dije lo que me pareció al ver su flequillo. El flequillo me engañó.",
            "Te dije una tontería, sí. Soy barbero, tío. ¿Tú le preguntas a tu barbero por fichajes? Pues eso.",
            "¿Culpa mía? Tú escribiste el tuit. Yo solo estaba dándole a la maquinilla. Te dejo el flequillo torcido gratis."
          ],
          "dodged": [
            "Bien hecho, nunca te fíes de un barbero.",
            "No me hagas caso, que yo también creo que la Tierra es un poco plana.",
            "Yo sabía que eras listo. Por eso te conté una tontería. Era un test, crack.",
            "Lo mío era una teoría de sillón. Tú la afinaste. Equipo, tío.",
            "Menos mal que no me escuchas, porque ese día me había tomado cuatro cafés.",
            "No sé qué te dije, pero acertaste. Así que te dije bien. Quiero mi nombre en tu próxima exclusiva, en negrita.",
            "Te conté lo primero que me vino a la cabeza y lo clavaste. Soy un genio. Te cobro el doble el próximo corte."
          ]
        },
        "leak": {
          "toldYou": [
            "La próxima vez cítame, ¿vale?",
            "Te lo dije. Ya me debes dos cañas.",
            "¿Ves? Con mis soplos brillas. Ahora cítame en el tuit, que mi jefe no se lo cree.",
            "Mi info, tu gloria, mis cañas. Tres, pagas tú 🍺",
            "Te hice un favor que mi redacción no sabe. Y que no se entere.",
            "Mi exclusiva, tu tuit, tus likes. Qué bonito es robar el trabajo de otro, ¿eh? Tres cañas. Esta semana.",
            "Acertamos. Mi jefe falló y tú no. Te he hecho mejor periodista que a él. Y a él le pagan. Paga tú."
          ],
          "ignored": [
            "En mi redacción se están riendo de ti. Lo siento.",
            "Te pasé la info buena y la tiraste. Mi redacción te va a sacar en un meme mañana.",
            "Te di el titular hecho y escribiste otro. Estás de becario para toda la vida.",
            "Mira que te lo dije. Mira que te lo dije. Me lo apunto para el libro.",
            "Te lo dije, literalmente, y fallaste. Te he hecho captura para enseñarla en mi redacción. Se han reído hasta los becarios.",
            "Me pediste info, te la di y hiciste lo contrario. Así se construye una carrera de Tier Nueve, crack."
          ],
          "lied": [
            "Uy. A nuestra redacción también se la colaron.",
            "Publicamos la misma noticia equivocada. ¿Solidaridad? 😬",
            "La culpa es de nuestro corresponsal. Lo mandamos a la otra punta del mapa. Se equivoca de país.",
            "A mi redacción también se la colaron. Mal de muchos, consuelo de periodistas.",
            "Eso te pasa por fiarte de alguien que trabaja para la competencia. Te lo avisé. Más o menos.",
            "Te engañé y caíste. Ahora mi redacción dice que eres un pardillo. No es personal, es periodismo. Invítame a una caña.",
            "Nada de remordimiento, crack. En este oficio o engañas o te engañan. Tú has elegido la segunda opción."
          ],
          "dodged": [
            "Le has pisado la exclusiva a mi propio periódico. Te odio.",
            "Vale, acertaste tú. No se lo digas a mi jefe.",
            "Mi soplo era para despistar a la competencia. Tú no eres la competencia, ¿no? Bueno, acertaste.",
            "Te pasé la versión de mi jefe. Ya sabes que mi jefe no acierta. Has hecho bien.",
            "Ok, lo tuyo fue mejor. No lo digas en voz alta, que me despiden.",
            "Te mentí para despistarte y aun así acertaste. Eso es porque te he enseñado a desconfiar de mí. Genio yo.",
            "Mi soplo era falso y tú acertaste. Esa exclusiva lleva mi sello. Cítame o se lo cuento a todo Twitter."
          ]
        }
      }
    }
  }
};

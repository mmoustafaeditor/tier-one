// Banter, third layer (3.5 banter lane, part 2). Appended, never replacing: lib/banter.ts reads bn.* + bnx.* + bn3.*,
// lib/story.ts voice.* + voice3.*, ui/live.tsx live.desk.voice + voice3, ui/PostScene.tsx d2.post.react + bn3.post.react,
// the catchphrase reactions cp.react.* + cp3.react.*. Same keys and lengths in banter3ar.ts and banter3es.ts.
// Results fans: 15 bn + 15 bnx + 20 bn3 lines per outcome; PostScene: 3 d2 + 6 bn3 per outcome and loudness.
// Vars: {p} player, {d} the club in the move, {c} selling club, {h} hijacker, {call} "Drop SIGNS", {day} filing day,
// {name} your byline, {phrase} your catchphrase, {to}/{from} (voice + post lines). Fictional people only; PG-13.
export default {
  en: {
    bn3: {
      fans: [
        ['Dave (Spurs, sadly)', '@lilywhite_dave'], ['Moira from the Holte', '@holte_moira'], ['Eagles Eddie', '@selhurst_eddie'], ['Saints Sophie', '@stmarys_soph'],
        ['Blades Bob', '@bramall_bob'], ['Magpie Mo', '@gallowgate_mo'], ['Wolves Wendy', '@molineux_wen'], ['Seagull Sid', '@amex_sid'],
        ['Bees Bernie', '@gtech_bernie'], ['Cherries Chaz', '@vitality_chaz'], ['Forest Fi', '@trent_end_fi'], ['Toffee Tom', '@goodison_ghost'],
        ['Hornets Hal', '@vicarage_hal'], ['Owls Olly', '@hillsborough_ol'], ['Canary Cath', '@carrow_cath'], ['Baggies Baz', '@hawthorns_baz'],
        ['Lions Lou', '@den_lou'], ['Pompey Pat', '@fratton_pat'], ['Rovers Rach', '@ewood_rach'], ['Terrier Terry', '@kirklees_terry'],
      ],
      fan: {
        excl: ['{p} was a secret until you posted it. now it’s a fact', 'refreshing the club site like it owes me money. you had it hours ago', 'first on {p}. rivals still typing', 'Scoop, correct, smug. the trifecta', 'the group chat called you a liar yesterday. apologies are in', 'you and the agent were the only two who knew', 'this is the tweet they’ll pin in the museum', 'no source, no leak, just you. mad', 'went early, went right, went viral', 'posted {p} before the club’s social team woke up', 'my notifications have never been this correct', 'first. not second. not joint. first.', 'the club’s comms team just followed you for tips', 'you posted it, the agent liked it, the club confirmed it. full circle', 'a Scoop so clean it squeaks', 'the rivals are pretending they had it. they did not', '{p} owes you a shirt', 'my phone buzzed and it was you, being right, first', 'notifications on for this account. permanently', 'nobody else had {p}. nobody'],
        late: ['right, yes. also correct yesterday, for everyone else', 'you and the club announcement arrived together', 'breaking: news from Tuesday', 'good call. from the back of the queue', 'right on {p}, but the rivals already did the victory lap', 'a scoop served cold', 'you got there. the bus left, but you got there', 'correct and three screenshots behind', 'the timeline says welcome, have a seat', 'news with the lid already off', 'right, but my nan had this on the group chat', 'the story was cooked. you brought the salt', 'you’ve confirmed what the stadium announcer already said', 'right, eventually. like a bus', 'the scoop arrived by second-class post', 'correct, and the rivals already changed their bio', 'late but tidy. like my Sunday league side', '{p} was old news by the time you hit post', 'the bandwagon kept a seat for you', 'you were right. so was everyone else'],
        dd: ['23:59 and calm as a keeper on a pen', 'the fax machine and you, legends both', 'deadline day nerve. can’t teach it', 'window shut, call landed, sleep well', 'while the rest were panic-posting you posted facts', 'the clock blinked first', 'ice cold on the final day', 'deadline day main character', 'filed with seconds left. still right. scary', 'the countdown clock is scared of you', 'that last-minute call belongs in a documentary', 'everyone else was guessing. you were reporting', 'deadline day and you were the calm one. who are you', 'right on the buzzer, like a 95th-minute winner', 'the window shut and you were holding the key', 'faxes flying, you filing. correct', 'last-gasp call, first-class result', 'a deadline day call with stoppage-time drama', 'the yellow ticker can take a break. you had it', 'midnight call, morning glory'],
        softRight: ['{p} as a Hint and it happened. undersold it', 'modest little Hint. massive W', 'should’ve Dropped it, coward (affectionate)', 'whispered it, nailed it', 'Hint today, trophy tomorrow', 'quiet confidence. we see you', 'the soft call that aged like a legend', 'low volume, high accuracy', 'played it safe and still won', 'one day you’ll trust yourself. today you were right', 'humble post, loud outcome', 'a Hint king in a Drop world', 'a Hint? it was done, mate. modest king', 'you undersold {p} like a club selling its wonderkid', 'barely a whisper and it still landed', 'Hint is the new Drop apparently', 'next time put your chest into it', 'humble reporting, elite outcome', 'you had it and played it cool. respect', 'soft call, hard proof'],
        softWrong: ['only a Hint, so only a small ratio', 'wrong in a whisper. we barely heard it', 'the hedge saved your blushes', 'a tiny L. pocket-sized', '{p} as a Hint? the hinting stopped', 'glad you kept it to a Hint tbh', 'minor miss. keep the receipts though', 'a Hint about nothing', 'soft call, soft landing, still a landing', 'we’ll call that a practice swing', 'wrong, but politely', 'the Hint button saved your weekend', 'at least it was only a Hint. small ratio, small shame', 'the Hint went nowhere. like most hints', 'your hedge had a hedge. still wrong', 'wrong, but only slightly loud', 'a whisper of an L', 'a Hint? the only hint was in your head', 'barely wrong. barely right. mostly wrong', 'minimal damage. the receipts are kept anyway'],
        loudWrong: ['ALL IN in capitals, wrong in real life', '{p} Dropped? dropped where, your notes app?', 'the loudest post of the window, the wrongest too', 'you hit Drop like it owed you money', 'bold font, zero facts', 'All in is a big word for a guess', 'the ratio on this is going to need scaffolding', 'turned it up to eleven, got it to zero', 'screaming into the wrong stadium', 'the confidence was world class. the call was not', 'you went all in on a pair of twos', 'delete key is right there, champ', 'all caps, no facts', 'All in? on whose word, your cat?', 'the ratio is visible from space', 'loudest L on the timeline today', 'that Drop aged like milk in a heatwave', 'full volume, wrong song', 'screenshotted, framed, hung in the hall of shame', 'the pinned post needs pinning down'],
        silence: ['{p} went through and you said nothing. bold strategy', 'the only reporter with nothing on {p}', 'you watched {p} like it was a film', 'a whole saga, no post. zen', 'waiting for your {p} take. still waiting', 'silence is golden. clout is better', 'not even a Hint on {p}? tragic', 'the {p} story walked right past your desk', 'we all had a take. you had a nap', 'no call, no L, no fun', 'too cool to post? or too scared?', 'you left {p} on read', 'not one word on {p}. monk mode', 'too busy refreshing to actually post', 'missed {p}. even my nan posted', 'silent on {p}. the ITKs say thanks', 'the {p} saga had a cast. you weren’t in it', 'you watched {p} like a highlights package', 'zero posts on {p}. zero regrets? we’ll see', 'the quietest press box in town'],
        uturnJab: ['right in the end. the first draft is framed in my house', 'the U-turn worked. the receipts remain', 'flip. flop. correct. somehow', 'the delete button deserves an assist', 'changed lanes and still made the exit', 'we saw the before. we saw the after. the after won', 'recalculating… arrived', 'right second time. first time’s in the archive', 'you blinked, you swerved, you scored', 'deleted evidence, correct conclusion', 'the repost carried the team', 'a U-turn with a happy ending', 'got there in the end. draft one lives in the group chat', 'the U-turn had its indicator on, at least', 'right on the reroute', 'the original post is still in my camera roll', 'repost: correct. original: content', 'fixed it before full time', 'saved by the delete key', 'swerved into the right answer'],
        pity: ['{p} fooled the whole timeline, not just you', 'rough one. the barber got everyone', 'no shame. the story lied', 'take the L, keep the pen', 'the club played poker. you played honest', 'unlucky. the sources were in on it', 'hug for the reporter 🫂', 'wrong, but you went looking. respect', 'even the club didn’t know till lunch', 'tomorrow’s another window', 'we’ve all been done by an agent', 'sending a biscuit and a tissue', 'the saga lied to everyone. you just said it out loud', 'unlucky. {p} kept the whole timeline guessing', 'you trusted the source. the source didn’t deserve it', 'bad day at the office. the office was on fire', 'pour one out for the call', 'chin up. the window’s long', 'nobody saw that coming. well, almost nobody', 'happens to the best. today it happened to you'],
        twistCalled: ['the plot twisted and you were already there', 'you read {p} like a back-post run', 'called the swerve before the swerve', 'spoiler merchant', 'saw the twist from the press box', 'the story zigged, you’d already zagged', 'you had the ending in the first chapter', 'twist detector: working', 'that’s not luck, that’s reading the game', 'the only one not surprised', 'called the curveball', 'twist? you wrote it', 'called the plot twist like you wrote the script', 'twist? you had it pencilled in', 'read the swerve like a veteran centre-back', 'the story turned. you were waiting at the corner', 'spoilers from the reporter, again', 'you saw {h} coming from a mile off', 'the twist was in your notes on day one', 'plot armour: {name}'],
        twistCaught: ['the story did a Cruyff turn. you fell over', 'right till the plot twist. then very not right', 'the rug’s gone and so is the call', 'twist ending, sad ending', 'the script changed and nobody told you', 'the saga had a second act. you left after the first', 'caught by the swerve on {p}', 'you were right on the old story', 'the plot moved faster than your thumbs', 'blindsided by a plot twist', 'wrong turn at the twist', 'the story ran off with {h}', 'the saga went Panenka and you dived', '{h} gazumped the story and your call with it', 'right on chapter one. wrong on the finale', 'the story swerved, you stayed in lane', 'caught out by the late twist', 'the ending had other ideas', 'a cliffhanger, and you fell off it', 'twist of the window. you were on the wrong side'],
        twistUpdated: ['story moved, you moved. that’s the job', 'updated like a live blog', 'no ego, just the update', 'the twist tried it. you adjusted', 'kept pace with the plot', 'rewrote it and got it right', 'changed the call, kept the W', 'slick update', 'that’s how you handle a swerve', 'twist handled, W collected', 'updated before the club did', 'flexible and correct. rare combo', 'saw the twist, changed the call. pro move', 'adapted faster than the club’s PR', 'updated like a proper newsroom', 'story moved, you moved with it', 'flexible reporting is still reporting', 'the twist didn’t catch you napping', 'quick update, clean result', 'calm under plot pressure'],
        call: {
          right: ['{call} on day {day}. history says yes', 'you typed {call}. the club typed “welcome”', 'the {call} post is getting framed', '{call} and the paperwork agreed', 'day {day}, {call}, correct. clean', '{call}? correct. who doubted', 'receipts: {call}, day {day}, right', 'the {call} button never felt so good', 'went {call} and won', 'pin the {call} post', 'that {call} came with paperwork', 'saving the {call} post for the end-of-season reel'],
          wrong: ['{call} on day {day}. it did not', '{call}, you said. nope, said the world', 'the {call} post needs a correction', 'day {day} {call}: vintage L', '{call}? on what, vibes?', '{call} and zero paperwork', 'screenshot of the {call} post: saved', 'the {call} button is not a toy', '{call}. brave. wrong. both', 'who approved this {call}', 'the {call} post is now a meme template', '{call} on day {day} and the club said nah'],
        },
      },
      rival: {
        gloat: {
          tabloid: ['Back page, day {n}. You, nowhere. 📰', 'The reel says hi. You’re not in it this time. I am.', 'Front AND back page. Greedy? Yes.', 'Had {p} on day {n}. Where were you?'],
          itk: ['day {n} 🔜 i did say', 'my man at the training ground never sleeps 👀', 'early. again. yawn. 🥱', '{p}. day {n}. 🤫 as always'],
          insider: ['Filed day {n}. Quietly. Correctly.', 'One call. One line. Right.', 'I had {p} before it was fashionable.', 'The phone rang on day {n}. I answered.'],
        },
        concede: {
          tabloid: ['Fine. FINE. Take it.', 'You won this one. I’m printing a correction. Small font.', 'Grr. Well played.', 'You had {p}. I had a headline. Yours was better.'],
          itk: ['respect 🤝 lowercase', 'you had it. i had a feeling.', 'my source owes me an explanation', 'ok. ok. 👀 noted.'],
          insider: ['A clean story. Well done.', 'Good reporting. I mean it.', 'I’ll concede that one without fuss.', 'You were right, I wasn’t. Fair.'],
        },
        smug: {
          tabloid: ['Oh NOW you’ve got it? Mine went to print day {n}.', 'Correct, second, forgettable.', 'You’re confirming MY story, mate.', 'Welcome aboard. The ship sailed day {n}.'],
          itk: ['i said day {n}. you said today. 🔜', 'glad you got the memo 📨', 'early bird: me. late bird: you.', 'caught up? cute 👀'],
          insider: ['Right, late. The record will show both.', 'I filed day {n}. You filed eventually.', 'Being second is still something.', 'Good. Now be first next time.'],
        },
        alsoWrong: {
          tabloid: ['Both wrong. Mine had a better headline.', 'Shared L. You’re buying.', 'Let’s agree it never happened.', 'We’ve both been had. Loudly.'],
          itk: ['we both got played 🤐', 'my source and your source: same bad source', 'deleting mine. you?', 'the club fooled the network too'],
          insider: ['We both misread it. It happens.', 'A bad day for the trade.', 'Wrong in good company.', 'We’ll both check twice next time.'],
        },
        uturn: ['Deleted and reposted on {p}? The screenshot is eternal.', 'Nice U-turn on {p}. The original is in the reel.', '{p}: first post wrong, second post “we’ll see”.', 'The delete button on {p} is doing overtime.', 'Posted, deleted, reposted. On {p}. In one window.', 'Sat nav reporter strikes again on {p}.'],
      },
      src: {
        agent: {
          toldYou: ['Rosa told you. Rosa is always right. Rosa is also expensive.', 'Right as rain. My fee is in the post.', 'You listened. Look how nice that feels.', 'Mention me in your next scoop. Tastefully.'],
          ignored: ['I gave you the deal on a plate. You ordered soup.', 'Next time, just believe me. It’s cheaper.', 'I don’t repeat myself. Except now: I TOLD YOU.', 'I’ll be telling the tabloid next time. They listen.'],
          lied: ['Negotiating tactic, darling. Nothing personal.', 'My client changed his mind. Clients do that.', 'Did I say done? I meant “done-ish”.', 'Price went up. So did the story.'],
          dodged: ['You didn’t bite. Annoyingly clever.', 'Good nose. Don’t tell anyone I said so.', 'You saw through me. Nobody does that.', 'Smart. Next lunch is on you.'],
        },
        kitman: {
          toldYou: ['Dougie said it and Dougie folds shirts with precision.', 'The laundry doesn’t lie. Neither do I.', 'Told you from the boot room. Tea’s on you.', 'Numbers on the peg don’t move for nothing.'],
          ignored: ['I told you he took his towel. You don’t ignore the towel.', 'I’m going back to my washing. You clearly don’t need me.', 'Wasted a good tip on you, son.', 'The kit room had it. You had other ideas.'],
          lied: ['He took the towel home to wash it. Turns out.', 'Wrong locker. Easy mistake. Sorry, son.', 'Tidy peg, messy call. My bad.', 'He came back for his flip-flops. Nobody saw that coming.'],
          dodged: ['You didn’t trust the laundry. Fair. It’s not an exact science.', 'Good. Don’t hang your story on a peg.', 'Smart lad. Even I get the socks wrong sometimes.', 'Right to double-check. The kit room gossips.'],
        },
        physio: {
          toldYou: ['Clinical outcome as predicted. Dr Inès.', 'The scans said so. I said so. You listened. Good.', 'Diagnosis: correct. Prognosis: more followers.', 'Evidence-based reporting. I approve.'],
          ignored: ['The data was clear. Your reading of it was not.', 'I don’t guess. You shouldn’t have either.', 'I presented the facts. You presented an opinion.', 'Next time, read the chart.'],
          lied: ['The file was sent. The club changed its mind. Medicine can’t fix that.', 'Clinically accurate, commercially irrelevant.', 'The knee passed. The deal didn’t.', 'I reported what I saw. The club did something else.'],
          dodged: ['A sensible second opinion. Well done.', 'You waited for more evidence. Correct protocol.', 'Healthy scepticism. Recommended.', 'Good. Never trust a single test.'],
        },
        spotter: {
          toldYou: ['Terminal Tony never misses a tail number.', 'Gate 4, 07:12, told you. Boom.', 'The apron doesn’t lie, pal.', 'Binoculars 1, doubters 0.'],
          ignored: ['I sent you the flight number. THE FLIGHT NUMBER.', 'I stood in the rain for that tip.', 'Photo, timestamp, everything. And you said no?', 'Tony’s hurt. Tony’s going home.'],
          lied: ['Wrong jet. They all look the same from the car park.', 'It was his cousin. Similar height.', 'The plane went. He didn’t. Classic.', 'Diverted. Blame the weather.'],
          dodged: ['Didn’t trust the zoom lens. Fair enough.', 'Good call. It was a holiday flight, turns out.', 'You were right to wait for a second plane.', 'Smart. Even Tony gets fooled by a charter.'],
        },
        barber: {
          toldYou: ['Sal knows. Sal always knows. Book your next trim.', 'Told you in the chair. Chair’s never wrong.', 'Shop consensus, confirmed. Fade on the house.', 'Heard it before the clippers warmed up.'],
          ignored: ['I told you mid-fade and you still ignored me.', 'I’m never giving you the good gossip again. Just a trim.', 'The whole shop had it. You had your headphones in.', 'You ignored the barber. Rookie.'],
          lied: ['My nephew’s mate’s girlfriend may have been wrong.', 'Shop talk is shop talk, pal.', 'Three blokes said it. Three blokes were wrong.', 'Heard it off the radio, to be fair.'],
          dodged: ['Didn’t believe the shop? Probably wise.', 'Fair. We do talk nonsense in here.', 'Good nose. Better than my clippers.', 'Smart. Not everything in here is true.'],
        },
        leak: {
          toldYou: ['Off the record: told you.', 'We never spoke. You were right.', 'You didn’t hear it from us. But you heard it.', 'Nice work. Delete this message.'],
          ignored: ['We don’t leak twice.', 'We handed you the club’s own line. And you passed.', 'Next leak goes elsewhere.', 'The door was open. You walked past it.'],
          lied: ['The board overruled us. Awkward.', 'Plans change. So do press releases.', 'We were told one thing and did another.', 'The line changed after lunch.'],
          dodged: ['You didn’t take the bait. Noted.', 'Smart. Not every leak is a gift.', 'Good instincts. We were testing the water.', 'You checked it. Correct.'],
        },
      },
      post: {
        handles: ['{club}_ultra', '{club}tilidie', 'its_all_{club}', '{club}_til_i_die', '{club}_away_days', 'up_the_{club}', '{club}_mad', 'proper_{club}', '{club}_since86', '{club}_ticket', '{club}_curva', 'kit_{club}'],
        react: {
          done: {
            0: ['“hint” is doing a lot of work here', 'a Hint? say more 👀', '{to} fans pretending not to care', 'a Hint? I can hear the pen moving', '{p} to {to}? keep talking', 'cautious but I’ll take it'],
            1: ['a Post?? it’s happening 😭', '{to} fans refreshing every 4 seconds', 'I’m not getting excited. I’m excited', 'a Post means the bags are packed, right?', '{from} fans already drafting the farewell post', 'checking flights to {to} for no reason'],
            2: ['ALL IN. {to} fans lose it', 'if this is wrong I’m moving to the moon', 'screenshotting before it’s real', '{p} in a {to} shirt. I need it', 'the {to} kit man is warming up the printer', 'if this lands I’m naming my dog {p}'],
          },
          hijack: {
            0: ['a third club?? tell me more', 'somebody’s gazumping {to} 👀', 'this saga has a twist in it', 'a mystery club is lurking 👀', 'not so fast, {to}', 'there’s another bid in the post'],
            1: ['not {to}?? then WHO', 'surprise season is open', '{from} fans laughing at {to} rn', '{to} getting gazumped in real time', 'someone else is reading {p}’s post', 'the {to} group chat has gone very quiet'],
            2: ['ALL IN on ELSEWHERE. {to} in pieces', 'the gazump of the year', 'this is cinema', '{to} fans in shambles', '{p} snubbing {to}. cinema', 'plot twist of the window'],
          },
          off: {
            0: ['deal off? say it isn’t so', 'the smoke is clearing 😶', 'hmm. I wanted this one', 'deal cooling, kettle not boiling', '{p} might stay at {from} after all', 'the agent’s gone quiet. never good'],
            1: ['it’s dying. I can feel it', '{from} fans relieved', 'the jet is going back in the hangar', 'the {p} saga is on life support', '{to} moving on, apparently', '{from} fans buying new shirts with {p} on'],
            2: ['ALL IN on STAYS. pain.', '{p} stays. {from} fans party', 'dead as a dodo', '{p} stays put. tears', '{to} fans deleting their edits', 'deader than my fantasy team'],
          },
          fake: {
            0: ['smelled fishy from day one', 'contract bluff?', 'the agent is fishing again', 'smells like an agent fishing for a contract', 'press release fiction?', 'the {p} rumour is starting to wobble'],
            1: ['calling fake on this? brave', 'the ITKs won’t like this', 'hmm, that’s a spicy one', 'calling fake on the whole {p} thing? spicy', 'the ITKs are sweating', 'nobody from {to} ever called, apparently'],
            2: ['ALL IN: nothing in it. the ITKs in shambles', 'bold call. very bold call', 'this is going to age one way or the other', '{p} never left {from}. the ITKs in pieces', 'ITK accounts deleting posts as we speak', 'bold. if it’s right, legendary'],
          },
        },
        ratio: ['the original post is now a museum piece', 'deleted but never forgotten 📸', 'reposting doesn’t erase the receipts', 'draft one: wrong. draft two: let’s see', 'the delete key has entered the chat', 'a masterclass in changing your mind', 'U-turn detected. screenshot captured', 'edit history energy'],
      },
      x: {
        post: 'Post it', postAria: 'Post it on X', copied: 'Post copied',
        tpl: ['{hed}. {tier}, {pts} points on {what}. Beat me.', 'Filed my {what}: {tier}, {pts} points. {row}', 'Called it on {what}: {tier}. Your turn.', 'Top of the timeline on {what}: {hed}. {pts} points.'],
        cp: ['“{phrase}” {p} → {to}. Called it first.', '{p} to {to}. “{phrase}”', 'Filed it early: {p} to {to}. “{phrase}”'],
        tags: 'TierOne,TransferTwitter',
        cpPost: 'Post the line', cpAria: 'Post your catchphrase on X',
      },
      clubFan: '{club} fan',
    },
    cp3: {
      react: {
        fan: {
          right: ['“{phrase}” posted, “{phrase}” delivered', 'the catchphrase has a better record than my club', 'every time I see “{phrase}” I check the club site', '“{phrase}” just became my ringtone', 'the {p} “{phrase}” is going in the hall of fame', '“{phrase}” merchants eating good tonight', 'shiver down my spine: “{phrase}”', 'print “{phrase}” on the away shirt'],
          wrong: ['“{phrase}” and then… nothing', 'the catchphrase wrote a cheque the call couldn’t cash', '“{phrase}”? more like “{phrase}?”', 'retire “{phrase}”, give it a testimonial', 'the {p} “{phrase}” is a collector’s item now', '“{phrase}” (not)', 'hearing “{phrase}” in my nightmares', 'catchphrase: 10/10. accuracy: 0/10'],
        },
        rival: {
          right: ['The catchphrase landed. I’ll allow it once.', 'Fine, say “{phrase}”. You earned it.', '“{phrase}” and correct. Unbearable.', 'Stealing the catchphrase. Joking. Mostly.'],
          wrong: ['“{phrase}” on the reel, next to your face.', 'A catchphrase needs a correct call. Just saying.', '“{phrase}”. Famous last words.', 'Slap “{phrase}” on the blooper tape.'],
        },
      },
    },
    voice3: {
      kitman: {
        0: ['Dougie: “He’s asked for his match shirts to be signed and boxed. That’s a goodbye box.”', 'Dougie: “Cleared the drying room of his stuff. Even the odd socks.”', 'Dougie: “Left me a thank-you card. Players don’t write cards unless they’re off.”'],
        1: ['Dougie: “He’s just had new boots broken in. You don’t do that for a week.”', 'Dougie: “Name’s still on the peg, nobody’s touched it. Staying put.”', 'Dougie: “He’s booked the physio room for next Tuesday. Next Tuesday, son.”'],
      },
      barber: {
        0: ['Sal: “It’s {to}. Everyone in the queue knows. Even the dog.”', 'Sal: “My brother-in-law drives the team bus for {to}. Say no more.”', 'Sal: “He wanted a sharp cut for photos. Photos! Signing photos!”'],
        1: ['Sal: “{to}’s out. Someone else is paying the big money.”', 'Sal: “Different club. My cousin’s seen the contract. Well, heard about it.”', 'Sal: “Not {to}. The shop reckons someone jumped the queue.”'],
        2: ['Sal: “Nah, it’s off. {from} won’t sell. Stubborn lot.”', 'Sal: “Collapsed. Money, isn’t it. Always money.”', 'Sal: “Dead in the water, mate. He’s staying.”'],
        3: ['Sal: “Fairy tale. Someone’s angling for a pay rise.”', 'Sal: “Nobody ever talked to anyone. Invented.”', 'Sal: “Made up for clicks. I know a made-up story.”'],
      },
      agent: {
        0: ['Rosa: “{to} have been very generous. I’ll let you connect the dots.”', 'Rosa: “My phone is off for other clubs. That tells you everything.”', 'Rosa: “We are in the final details. Very final.”'],
        1: ['Rosa: “{to} took too long. Another club didn’t.”', 'Rosa: “We have a better offer. It’s not from {to}.”', 'Rosa: “{to} were the first door. Not the last.”'],
        2: ['Rosa: “We walked away. {from} valued him like a museum piece.”', 'Rosa: “It was close. Close isn’t done.”', 'Rosa: “It ended politely. He stays, for now.”'],
        3: ['Rosa: “{to}? I’ve never had that conversation.”', 'Rosa: “A useful rumour for a contract renewal. Thank you.”', 'Rosa: “Whoever told you that wants something from you.”'],
      },
      spotter: {
        0: ['Terminal Tony: “Wheels down 06:48, {to}’s city. Hoodie, sunglasses, him.”', 'Terminal Tony: “Club fixer at arrivals with a sign. Tony sees all.”', 'Terminal Tony: “Private charter, tail number I’ve logged three times for {to}.”'],
        1: ['Terminal Tony: “He flew, alright. Wrong direction for {to}.”', 'Terminal Tony: “Jet went east. {to} are west. Maths.”', 'Terminal Tony: “Wasn’t {to}’s usual charter. Someone else’s plane.”'],
        2: ['Terminal Tony: “Nothing on the board. Nothing on the apron. Nada.”', 'Terminal Tony: “Car park’s empty. He’s home.”', 'Terminal Tony: “Not a single flight. I’d know. I’m always here.”'],
      },
      physio: {
        0: ['Dr Inès: “Scans requested by {to}’s medical department. Standard pre-signing protocol.”', 'Dr Inès: “Appointment confirmed with {to}’s doctors. Fasting from midnight.”', 'Dr Inès: “Full file transferred to {to}. That is not routine.”'],
        1: ['Dr Inès: “His records went out today. Not to {to}.”', 'Dr Inès: “A medical is booked. The letterhead is not {to}’s.”', 'Dr Inès: “Another club requested imaging this morning.”'],
        2: ['Dr Inès: “No external requests. His rehab plan runs to spring.”', 'Dr Inès: “No medical, no file transfer. Nothing to report.”', 'Dr Inès: “He is on my table, not on a plane.”'],
      },
      leak: {
        0: ['Press office: “Graphics are made. Announcement video is in the edit.”', 'Press office: “The board signed off. Just waiting on the paperwork.”'],
        1: ['Press office: “Someone outbid {to}. We’re taking the money.”', 'Press office: “He’s going. Not to {to}.”'],
        2: ['Press office: “No deal. He’s not for sale any more.”', 'Press office: “It’s over. Final.”'],
        3: ['Press office: “No bid, no approach, no contact. Pure fiction.”', 'Press office: “Nobody has asked about him. Nobody.”'],
      },
    },
    live: {
      desk: {
        voice3: {
          ddlive: ['Deadline day. Coffee’s on. Nobody goes home till the window shuts.', 'I want your name at the top of that board by midnight.', 'Big day. Don’t make me read about it in the tabloid first.', 'The rivals are already typing. Why aren’t you?'],
          daily: ['Five sagas. One of them is a trap. Find it.', 'Ring your contacts. Don’t guess. I hate guessing.', 'Today’s board. Make it count.', 'I don’t need fast. I need right. Fast and right is a bonus.'],
          resume: ['You left a story half-filed. Finish it.', 'The window’s still open. So is your chair.', 'Half a job is no job. Back to it.', 'Your notes are on the desk where you left them.'],
          wire: ['The real world answered. Go and see how you did.', 'A call settled overnight. Read it before the timeline does.', 'The wire’s in. Your name’s on it.', 'Settled. Good or bad, own it.'],
          career: ['Blurt needs a big post. You’re it.', 'Next window. I’m watching your numbers.', 'Earn the desk. It doesn’t come free.', 'Story desk. Bring me something I can print.'],
          room: ['Your mates are playing. Beat them.', 'A room’s open. Go and embarrass someone.', 'Friends don’t let friends win the room.', 'Room’s live. Same board, no excuses.'],
          wireSettling: ['Your live calls are close. Don’t look away.', 'Paperwork day. Watch your wire.', 'Fees agreed somewhere. Could be your call.', 'Keep an eye on the wire. It moves today.'],
          mission: ['You earned it. Claim it.', 'Expenses approved. Don’t get used to it.', 'Good work gets paid. Collect.', 'Coins on the desk. Take them before I change my mind.'],
          practice: ['Slow day. Practise your reads.', 'Nothing on. Warm up on a practice board.', 'Keep sharp. The window never really closes.', 'Off the record, a practice board never hurt anyone.'],
          ddresults: ['The table’s up. Go and see where you finished.', 'Deadline day is done. Read the table, then sleep.', 'Final standings are in. Gloat or grovel.', 'The window shut. Your record didn’t.'],
        },
      },
    },
  },
};

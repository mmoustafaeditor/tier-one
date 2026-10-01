// Banter, 3.5 extension (banter lane). `bnx.*` pools are appended to the matching `bn.*` pools by lib/banter.ts, so
// every outcome roughly doubles its variety without touching the 3.2 lines. `bnx.fan.call.*` lines quote the call you
// actually made ({call} = "Drop SIGNS", {day} = the day you filed). `voice.*` adds source personality to the
// quote lines (Sal the barber, Terminal Tony at arrivals, Rosa the agent, Dougie the kit man, Dr Inès the physio,
// the press office) without changing what a read means: every line sits under the same outcome index as before.
// Vars as in bn.*: {p} player, {c} selling club, {d} the move's club, {h} hijacker, {n} day. PG-13, no real people.
import en from '../en';
import ar from '../ar';
import es from '../es';

type VoicePack = Record<string, Record<string, string[]>>;
const more = (base: unknown, add: VoicePack): VoicePack => {
  const b = (base || {}) as VoicePack, out: VoicePack = {};
  for (const src of Object.keys(add)) { out[src] = {}; for (const r of Object.keys(add[src])) out[src][r] = [...((b[src] && b[src][r]) || []), ...add[src][r]]; }
  return out;
};
const V = (d: unknown) => (d as { voice?: unknown }).voice;

export default {
  en: {
    bnx: {
      fan: {
        excl: ['FIRST. RIGHT. LOUD. the holy trinity', 'nobody had {p}. you had {p}. frame it', 'a Scoop with receipts. rare as a clean sheet', 'the rest of the timeline is quote-tweeting YOU', 'you broke it and the others are still refreshing', 'Scoop. the word means something again', 'imagine being the rivals rn 😭', 'this is the post people will screenshot in five years', 'first on {p} and it wasn’t even close', 'blue tick energy without the blue tick', 'the ITKs are pretending they had it. they didn’t', 'bookmarked, pinned, tattooed', 'you were early AND right. pick one, they said', 'journalism so clean it squeaks', 'the {c} forum just crashed. your fault'],
        late: ['right, but late. like a Sunday bus', 'you arrived at {p} with the crowd', 'correct and fashionably late', 'the rivals had this with breakfast. you had it with dinner', 'news? this is history, mate', 'right answer, second place', 'welcome to the party. the party ended Tuesday', 'good read. slow read', 'the timeline already moved on to the next one', 'a day late and a follower short', 'you were right in the same way the weather forecast is right after it rains', 'confirmed what we all knew. thanks?', 'late but correct is still correct. just quieter', 'next time ring someone BEFORE the rivals', 'the rival’s post is older than your coffee'],
        dd: ['deadline day hero 🕛', 'sixty seconds and you nailed it. ice in the veins', 'kept your head when the clock didn’t', 'last-minute and right. that’s cinema', 'the deadline day energy on this one', 'while everyone panicked you posted the truth', 'fastest fingers, straightest facts', 'deadline day delivers again', 'you and the fax machine working overtime', 'clock said panic. you said {p}', 'the window slammed and you were on the right side of it', 'deadline day W. screenshot for the reel', 'right under the buzzer', 'this is why we stay up on deadline day', 'nerves of steel, sources of gold'],
        softRight: ['careful and correct. we respect a Hint king', 'said it softly, landed it loudly', 'only a Hint? you could’ve gone big', 'hedged and still right. smart', 'safe call, right call, small call', 'underplayed it. modest queen', 'right, but you whispered it', 'the quiet ones are always right', 'one notch louder and you’d be trending', 'a Hint and true. building trust', 'soft, sure, and spot on', 'you left points on the table but kept your dignity', 'shy but accurate', 'next time say it with your chest', 'low stakes, clean hands'],
        softWrong: ['at least you only went Hint 😅', 'wrong, but quietly. we’ll allow it', 'hedged your bets and still lost the bet', 'small call, small L', 'the Hint was imaginary', 'barely a miss. barely', 'glad you didn’t go loud on that one', 'soft landing on the wrong runway', 'a whisper of an L', 'you tiptoed into the wrong room', 'no harm done. some harm done', 'lucky it was only a Hint', 'quiet wrong still counts, mate', 'mild L. mild salsa. mild everything', 'the hedge saved you. just'],
        loudWrong: ['ALL IN? on WHAT evidence', 'all caps, zero facts', 'went loud and went wrong. the combo', 'the Drop button is not a toy', 'imagine the confidence. now imagine being right', 'bold. wrong. bold and wrong', 'deleting this would be the first right call', 'you went All in like it was a mood', 'the loudest L of the window', 'the screenshot is already on three group chats', 'All in on whose word? your nan’s?', 'big talk, no medical', 'the megaphone was on and the facts were off', 'we heard you. we all heard you. wrong', 'next time confirm it with someone who isn’t you'],
        silence: ['not a word on {p}. playing it safe or asleep?', 'the {p} saga came and went. you watched', 'no call? the fence is comfy I guess', 'you ghosted {p} like a bad date', 'quiet on {p}. scared of the replies?', 'zero posts, zero risk, zero clout', 'we waited for your take. it never came', 'couldn’t even manage a Hint?', 'the silence was louder than the rivals', 'watching from the stands on this one', 'if you don’t post, you can’t be wrong. or right', 'you left {p} on read', 'no take is a take. a boring one', 'the ITKs had a field day while you had a nap', 'abstaining on {p}. bold strategy'],
        uturnJab: ['the U-turn got there. the first post is still in my camera roll', 'right in the end. the middle was chaos', 'changed your mind and got lucky. or good. jury’s out', 'sat nav journalism. recalculated right', 'deleted, reposted, correct. the three-step', 'we saw both versions 📸', 'the repost was right. the original is a meme', 'flip-flop but make it correct', 'second draft: correct. first draft: screenshotted', 'good correction. great screenshot', 'you U-turned into the truth', 'the delete button carried you', 'right on attempt two. we count attempt one too', 'the redemption arc was quick', 'reversed and right. like a good goalkeeper'],
        pity: ['tough one. {p} fooled everyone', 'unlucky. the sources were loud', 'it happens. brush it off', 'the story twisted, you didn’t. unlucky', 'wrong but honest. that counts for something', 'dust yourself off. next window', 'we’ve all been there. some of us twice', 'not your fault the agent was fishing', 'sending tea and sympathy ☕', 'the barber got you. the barber gets everyone', 'shake it off. {p} wasn’t worth it', 'bad beat. good effort', 'next time, ring the physio', 'we still follow you. for now', 'chin up. deadline day is coming'],
        twistCalled: ['saw the twist coming like a through ball', 'you read {p} before the plot did', 'twist? you were already there', 'called the turn. elite', 'everyone got fooled except you', 'you had the sequel before the first film ended', 'plot armour: {name}', 'the twist was in your drafts', 'nobody saw that coming. you did', 'the story swerved and you were waiting', 'read the room, read the twist', 'called the U-turn before the club did', 'twist merchant', 'you got the ending right', 'someone’s been reading the script'],
        twistCaught: ['twisted like a pretzel 🥨', 'the story moved. you stayed', 'the plot left you behind', 'caught out by the swerve', 'right on Monday, wrong by Friday', 'that twist had your name on it', 'the story ran off with someone else', 'you were right before you were wrong', 'blink and you missed the twist. you blinked', 'the saga pulled a Cruyff turn on you', 'the rug got pulled', 'plot twist: you', 'the story changed lanes without indicating', 'nobody warned you. nobody warned anyone', 'twisted, not stirred'],
        twistUpdated: ['saw the change, changed the call. pro', 'updated faster than the club website', 'adapted like a sweeper keeper', 'the story moved and you moved with it', 'kept up with the twist. nice footwork', 'no pride, just facts. respect', 'changed tack, stayed right', 'you rolled with it. cool head', 'the update was the story', 'read the twist, rewrote the tweet', 'a good reporter changes their mind', 'caught the swerve in time', 'turned with the story like a full-back', 'late change, right change', 'the twist tried. you adjusted'],
        call: {
          right: ['“{call}” on day {day}. and it landed. chef’s kiss', 'you said {call}. the club said yes', '{call} was the call. the call was right', 'screenshot the {call}. history', 'called {call} and walked off like a pro', '{call} on day {day}? prophet behaviour', 'the {call} post aged like fine wine', '{call}. two words. one W', 'went {call} and the paperwork agreed', '{call} was the only take that mattered', 'filed {call} while the rest were asleep', 'if {call} was a stock, I’d buy'],
          wrong: ['“{call}” on day {day}. brave. wrong', 'you said {call}. the club said who?', '{call} was a choice. the wrong one', 'the {call} post is in the museum of Ls', '{call}? on day {day}? with those sources?', '{call} has been reported for misinformation', 'the {call} take is already a meme', 'imagine typing {call} with your whole chest', '{call} and not a single medical', 'saving your {call} for the blooper reel', 'the {call} call has left the building', '{call}: bold claim, no receipts'],
        },
      },
      rival: {
        gloat: {
          tabloid: ['Had it first. Had it louder. Had it right. {p} says hello.', 'Day {n}. Back page. You? Nothing. 😂', 'Some of us post. Some of us watch.', 'The reel needed an intro. Thanks.', 'I was on {p} on day {n}. You were on holiday, clearly.', 'EXCLUSIVE: I win. Again.', 'Screenshotted my own tweet. For the trophy cabinet.', 'Too slow. As usual.'],
          itk: ['day {n}. 👀', 'my source said {p}. my source is never wrong.', 'a day early, like always. 🔜', 'told you. well, told everyone. you weren’t listening.', 'the car park never lies.', '🤫 more soon. for you: less.', 'i had {p} on day {n}. i had it cryptic but i had it.', 'the network moves. you didn’t.'],
          insider: ['I filed on day {n}. It was right. That’s all.', 'I don’t gloat. I just note the record.', 'Day {n}, one line, correct. The method works.', 'You weren’t on it. I was. Quietly.', 'The training ground told me. I checked. I filed.', 'Checked twice, filed once. Day {n}.', 'Patience, son. It pays.', 'The record will show who had {p}.'],
        },
        concede: {
          tabloid: ['Fine. Yours. Deleting the reel. (Not really.)', 'OK. That was good. Don’t get used to it.', 'Credit where it’s due. Small credit.', 'Muting you for a day. Out of respect.', 'Beaten. On {p}. By YOU. Horrible.', 'I had it wrong. You had it right. The office is laughing at me now.', 'Grudging respect. Emphasis on grudging.', 'Well played. Unfollowing to cope.'],
          itk: ['fair. 👀', 'my source is having a word with himself.', 'ok that one’s yours. 🤫', 'the network had an off day. you didn’t.', 'deleting drafts. quietly.', 'respect. lowercase, but respect.', 'you beat me to it. rare.', 'noted. 🔜 back stronger.'],
          insider: ['Well found. Genuinely.', 'You were right and I wasn’t. It happens. Rarely.', 'Good work. That’s journalism.', 'I’ll be having a word with my man.', 'Fair play. You did the legwork.', 'Credit to you. I don’t say it often.', 'A proper call. I’d have been proud of it.', 'Correct. And early. Well done.'],
        },
        smug: {
          tabloid: ['Oh you’re right NOW? I was right on day {n}. 😂', 'Late to the party. Brought no bottle.', 'Welcome to yesterday’s news.', 'Right, but I got the clicks.', 'Correct. Also second. Mostly second.', 'Ran it on the back page days ago. Keep up.', 'Nice of you to confirm my story.', 'Beaten to it. By me. Again.'],
          itk: ['i said this on day {n}. 👀', 'early is a mindset. late is a timestamp.', 'glad you got there. eventually.', 'you and the rest of the timeline. 🔜', 'the network had this yesterday.', 'catching up is also a skill, i suppose.', 'right, but a day late. my speciality is a day early.', '🤫 already moved on to the next one.'],
          insider: ['Filed on day {n}. You’re right, but late.', 'Correct. The record notes who was first.', 'Being right late is still being right. Just less useful.', 'Glad we agree. I agreed first.', 'You got there. I was already there.', 'Right answer. Slow method.', 'Day {n}. Worth remembering next time.', 'Well done. Mine’s been out since day {n}.'],
        },
        alsoWrong: {
          tabloid: ['We were both wrong. Mine was funnier.', 'Let’s never speak of {p} again.', 'Both cooked. At least mine had capitals.', 'Shared L. Split the bill.', 'I’m deleting mine. You delete yours. Deal?', 'Nobody saw that coming. Nobody.', 'Wrong together. Rivals in shame.', 'Reel pauses for a moment of silence.'],
          itk: ['we don’t talk about this one.', 'my source and your source had the same bad day.', 'both wrong. 🤫 moving on.', 'the club fooled us both. rude.', 'draft deleted. suggest you do the same.', 'the network is regrouping.', 'even the car park was wrong on {p}.', 'shared L. not sharing the blame though.'],
          insider: ['We both got {p} wrong. The club played everyone.', 'A bad week for the trade.', 'I don’t mind being wrong in good company.', 'We’ll learn from this. You more than me.', 'Wrong together. The medical was elsewhere.', 'Every reporter gets one. We got the same one.', 'Humbling. For both of us.', 'The paperwork fooled us both.'],
        },
        uturn: ['Deleted & reposted on {p}. We saw the first one. 📸', 'The {p} U-turn is already on a meme page.', 'Sat nav reporting on {p}. Recalculating…', 'First post: wrong. Second post: we’ll see. Screenshot: forever.', 'Two posts on {p}. One of them is in the reel.', 'The delete button did the heavy lifting on {p}.'],
      },
    },
    voice: more(V(en), {
      kitman: {
        0: ['Dougie: “Took his name tape off the peg. Asked me to keep it. Sentimental lad.”', 'Dougie: “Returned his training kit washed and folded. Nobody does that unless they’re off.”', 'Dougie: “He’s taken his lucky towel home. That towel’s been here four years.”'],
        1: ['Dougie: “Asked me for new studs for next month. Next month. He’s staying.”', 'Dougie: “Same chair in the dressing room. Same moaning about the heating. Going nowhere.”', 'Dougie: “Ordered winter gloves in his size. That’s a lad planning a winter here.”'],
      },
      barber: {
        0: ['Sal: “Mate. MATE. Done. My nephew’s mate’s girlfriend works at {to}. Shirt’s printed.”', 'Sal: “Had three blokes in the chair this morning, all said {to}. Three! That’s a consensus.”', 'Sal: “Signing-day trim, is what he asked for. Signing-day trim. I rest my case.”'],
        1: ['Sal: “{to}? No no no. Somebody’s gone over the top. I heard it over a skin fade.”', 'Sal: “Word in the shop is {to} got pipped. Pipped! Like a photo finish.”', 'Sal: “He’s off, but {to} can whistle. Different club. Trust me. Well, trust the shop.”'],
        2: ['Sal: “Dead as my old clippers. {from} want silly money.”', 'Sal: “Off. Fell apart. The agent’s cut, apparently. Everyone’s talking about it.”', 'Sal: “Cold. Colder than the tap in here.”'],
        3: ['Sal: “Never real, mate. Somebody wanted a new contract and a bit of noise.”', 'Sal: “Made up. I made up better stories than that at school.”', 'Sal: “Smoke. No fire. Not even a match.”'],
      },
      agent: {
        0: ['Rosa: “We’re very close to {to}. Very. I’m choosing my shoes for the photos.”', 'Rosa: “My client and {to}? Let’s say the pens are out.”', 'Rosa: “I’ve stopped answering other clubs. Read into that.”'],
        1: ['Rosa: “{to} waited. The market doesn’t. Another door opened.”', 'Rosa: “We love {to}. We love someone else more, financially.”', 'Rosa: “{to} were the plan. Plans change when a better one rings.”'],
        2: ['Rosa: “We talked. We walked. {from} wanted the moon.”', 'Rosa: “It was real. It’s over. My client is relaxed. I am less relaxed.”', 'Rosa: “No deal. The numbers never shook hands.”'],
        3: ['Rosa: “{to}? Never heard from them. Where are you getting this?”', 'Rosa: “There was no deal. There was a contract renewal, and some useful noise.”', 'Rosa: “Nobody from {to} has my number. I checked.”'],
      },
      spotter: {
        0: ['Tony: “Gate 4, 06:10. Private jet, tail number checks out. Heading for {to}. Flask still warm.”', 'Tony: “Club car on the apron and a flight plan to {to}’s city. I’ve got a photo. Blurry, but it’s him.”', 'Tony: “Two passengers, one very tall, one very well paid. Destination: {to}.”'],
        1: ['Tony: “Jet went. Wrong way for {to}. I checked the flight plan twice. Three times.”', 'Tony: “He flew out, alright. Not {to}. Other direction entirely.”', 'Tony: “Charter left at dawn. Not where {to} train. I’ve logged it.”'],
        2: ['Tony: “Nothing. Not a jet, not a car, not a sniff. Quiet as arrivals on Christmas Day.”', 'Tony: “Been at the terminal since five. He hasn’t been near it.”', 'Tony: “No movements. My flask and I would know.”'],
      },
      physio: {
        0: ['Dr Inès: “Medical scheduled. {to}, 08:00. Scans requested at 21:40 last night.”', 'Dr Inès: “His file left this morning on {to} letterhead. That has one meaning.”', 'Dr Inès: “Cardio booked, knee imaging booked. {to}’s doctors. Tomorrow.”'],
        1: ['Dr Inès: “The scans are going to another club. Not {to}. I saw the address.”', 'Dr Inès: “A medical is booked. The letterhead is not {to}’s.”', 'Dr Inès: “File requested by a third club at 07:15. {to} have not asked.”'],
        2: ['Dr Inès: “No request. No scans. No appointment. Clinically: nothing.”', 'Dr Inès: “He was on my table at 09:00. Nobody else has asked for him.”', 'Dr Inès: “Zero requests this week. The file is still in my drawer.”'],
      },
      leak: {
        0: ['Press office: “Off the record: agreed. Announcement video is being edited.”', 'Press office: “You didn’t hear it here. It’s done. Graphics are ready.”'],
        1: ['Press office: “Between us, someone else moved first. We’re letting him go.”', 'Press office: “He’s leaving. The statement just won’t say {to}.”'],
        2: ['Press office: “They spoke. It ended. He stays.”', 'Press office: “The club said no. The statement will say it politely.”'],
        3: ['Press office: “There was never an approach. Nobody has called.”', 'Press office: “Invented. We’d know. We answer the phone.”'],
      },
    }),
  },
  ar: {
    bnx: {
      fan: {
        excl: ['الأول. صح. بصوت عالي. التلاتية المقدسة', 'محدش كان عنده {p}. انت كان عندك. علّقها', 'سكووب وبالإيصالات. نادر زي شباك نضيف', 'التايم لاين كله بيعمل كوت ليك انت', 'انت فجّرتها والباقي لسه بيعمل ريفريش', 'سكووب. الكلمة رجعلها معنى', 'تخيّل تبقى من المنافسين دلوقتي 😭', 'ده البوست اللي الناس هتصوّره بعد خمس سنين', 'الأول في {p} ومكنش في منافسة أصلاً', 'طاقة العلامة الزرقا من غير العلامة', 'بتوع الـITK بيعملوا إنهم كانوا عارفين. مكانوش', 'بوكمارك، تثبيت، تاتو', 'بدري وصح. قالوا اختار واحدة', 'صحافة نضيفة بتلمع', 'منتدى {c} وقع. بسببك'],
        late: ['صح بس متأخر. زي أتوبيس يوم الجمعة', 'وصلت {p} مع الزحمة', 'صح ومتأخر بشياكة', 'المنافسين خدوها مع الفطار. انت خدتها مع العشا', 'أخبار؟ ده تاريخ يا عم', 'إجابة صح، مركز تاني', 'أهلاً بيك في الحفلة. الحفلة خلصت التلات', 'قراية حلوة. قراية بطيئة', 'التايم لاين راح للي بعدها خلاص', 'متأخر يوم وناقص متابع', 'صح زي نشرة الجو بعد ما المطرة تنزل', 'أكّدت اللي كلنا عارفينه. شكراً؟', 'متأخر وصح برضه صح. بس أهدى', 'المرة الجاية كلّم حد قبل المنافسين', 'بوست المنافس أقدم من قهوتك'],
        dd: ['بطل يوم الديدلاين 🕛', 'ستين ثانية وجبتها. أعصاب تلج', 'دماغك فضلت ثابتة والساعة لأ', 'آخر دقيقة وصح. سينما', 'طاقة يوم الديدلاين في دي', 'الكل كان مرعوب وانت نشرت الحقيقة', 'أسرع صوابع، أنضف معلومة', 'يوم الديدلاين بيدّي تاني', 'انت والفاكس شغالين أوفر تايم', 'الساعة قالت اتخض. انت قلت {p}', 'الفترة اتقفلت وانت في الناحية الصح', 'W يوم الديدلاين. سكرين للفيديو', 'على الجرس بالظبط', 'عشان كده بنسهر يوم الديدلاين', 'أعصاب حديد ومصادر دهب'],
        softRight: ['حذر وصح. بنحترم ملك التلميح', 'قلتها بهدوء ونزلت بصوت عالي', 'تلميح بس؟ كان ممكن تكبّرها', 'لعبتها آمن وبرضه صح. شاطر', 'قرار آمن، صح، صغير', 'قلّلت منها. متواضع', 'صح بس همست بيها', 'الهادي دايماً صح', 'درجة أعلى وكنت هتبقى تريند', 'تلميح وصح. بتبني ثقة', 'هادي، واثق، مظبوط', 'سبت نقط على الترابيزة بس حافظت على كرامتك', 'خجول بس دقيق', 'المرة الجاية قولها من قلبك', 'رهان صغير، إيد نضيفة'],
        softWrong: ['الحمد لله إنك وقفت عند تلميح 😅', 'غلط بس بهدوء. هنعدّيها', 'أمّنت رهانك وخسرته برضه', 'قرار صغير، L صغيرة', 'التلميح كان في الخيال', 'غلطة على الحافة. على الحافة', 'كويس إنك مرفعتش صوتك في دي', 'نزول ناعم على الممر الغلط', 'همسة L', 'دخلت الأوضة الغلط على طراطيف صوابعك', 'مفيش ضرر. في شوية ضرر', 'حظك إنه كان تلميح', 'الغلط الهادي بيتحسب برضه', 'L خفيفة. صوص خفيف. كله خفيف', 'التأمين نجّاك. بالعافية'],
        loudWrong: ['بكله؟ على أساس إيه', 'كابيتال كلها، ولا معلومة', 'علّيت صوتك وغلطت. الكومبو', 'زرار الدروب مش لعبة', 'تخيّل الثقة دي. وبعدين تخيّل تبقى صح', 'جريء. غلط. جريء وغلط', 'مسح البوست ده هيبقى أول قرار صح', 'رحت بكله كأنها مود', 'أعلى L في الفترة', 'السكرين شوت في تلات جروبات خلاص', 'بكله على كلام مين؟ تيتة؟', 'كلام كبير، ولا كشف طبي', 'الميكروفون شغال والمعلومات قافلة', 'سمعناك. كلنا سمعناك. غلط', 'المرة الجاية أكّدها مع حد غيرك'],
        silence: ['ولا كلمة عن {p}. خايف ولا نايم؟', 'قصة {p} جت وراحت. وانت بتتفرج', 'مفيش قرار؟ السور مريح يعني', 'عملت غوستينج لـ{p} زي ديت وحش', 'ساكت عن {p}. خايف من الريبلايز؟', 'صفر بوستات، صفر مخاطرة، صفر شهرة', 'استنينا رأيك. مجاش', 'ولا حتى تلميح؟', 'سكوتك كان أعلى من المنافسين', 'بتتفرج من المدرجات في دي', 'لو منشرتش مش هتغلط. ولا هتبقى صح', 'سبت {p} على سين', 'مفيش رأي هو رأي. رأي ممل', 'بتوع الـITK عملوا حفلة وانت نايم', 'امتناع عن {p}. استراتيجية جريئة'],
        uturnJab: ['اللفّة وصلت. البوست الأول لسه في الجاليري عندي', 'صح في الآخر. النص كان فوضى', 'غيّرت رأيك وحظك حلو. أو شاطر. لسه بنفكّر', 'صحافة جي بي إس. أعاد الحساب صح', 'مسح، نشر تاني، صح. التلات خطوات', 'شفنا النسختين 📸', 'الريبوست صح. الأصلي بقى ميم', 'قلبت بس صح', 'المسودة التانية: صح. الأولى: متصوّرة', 'تصحيح حلو. سكرين أحلى', 'لفّيت ووصلت للحقيقة', 'زرار المسح شالك', 'صح من المحاولة التانية. بنعدّ الأولى برضه', 'قصة الرجوع كانت سريعة', 'عكست وجبتها. زي حارس شاطر'],
        pity: ['صعبة. {p} ضحك على الكل', 'حظ وحش. المصادر كانت عالية', 'بتحصل. انفض', 'القصة لفّت وانت لأ. حظ وحش', 'غلط بس صادق. ده ليه قيمة', 'قوم نفّض نفسك. الفترة الجاية', 'كلنا مرينا بيها. في مننا مرتين', 'مش ذنبك إن الوكيل كان بيصطاد', 'باعتلك شاي ومواساة ☕', 'الحلّاق وقعك. الحلّاق بيوقّع الكل', 'انساها. {p} مكنش يستاهل', 'ضربة وحشة. مجهود حلو', 'المرة الجاية كلّم العلاج الطبيعي', 'لسه متابعينك. لحد دلوقتي', 'ارفع راسك. يوم الديدلاين جاي'],
        twistCalled: ['شفت اللفّة جاية زي بينية', 'قريت {p} قبل الحبكة', 'لفّة؟ انت كنت هناك أصلاً', 'توقعت اللفّة. عالمي', 'الكل اتضحك عليه غيرك', 'كان معاك الجزء التاني قبل ما الأول يخلص', 'درع الحبكة: {name}', 'اللفّة كانت في الدرافتس عندك', 'محدش شافها جاية. انت شفتها', 'القصة لفّت وانت كنت مستني', 'قريت الأوضة، قريت اللفّة', 'قلت اللفّة قبل النادي', 'تاجر اللفّات', 'جبت النهاية صح', 'في حد قاري السيناريو'],
        twistCaught: ['اتلفّيت زي البريتزل 🥨', 'القصة اتحركت. وانت فضلت', 'الحبكة سابتك ورا', 'اللفّة مسكتك', 'صح يوم الاتنين، غلط يوم الجمعة', 'اللفّة دي كان عليها اسمك', 'القصة جريت مع حد تاني', 'كنت صح قبل ما تبقى غلط', 'رمشت وفاتتك اللفّة. ورمشت', 'القصة عملت فيك كرويف تيرن', 'السجادة اتسحبت', 'اللفّة: انت', 'القصة غيّرت الحارة من غير إشارة', 'محدش نبّهك. محدش نبّه حد', 'اتلفّيت ومتقلّبتش'],
        twistUpdated: ['شفت التغيير وغيّرت القرار. محترف', 'اتحدّثت أسرع من موقع النادي', 'اتأقلمت زي حارس ليبرو', 'القصة اتحركت واتحركت معاها', 'لحقت اللفّة. رجلين حلوين', 'مفيش كبرياء، معلومات بس. احترام', 'غيّرت الاتجاه وفضلت صح', 'مشيت معاها. دماغ رايقة', 'التحديث هو القصة', 'قريت اللفّة وكتبت التويتة من جديد', 'الصحفي الشاطر بيغيّر رأيه', 'لحقت اللفّة في وقتها', 'لفّيت مع القصة زي ظهير', 'تغيير متأخر، تغيير صح', 'اللفّة حاولت. انت ظبطت'],
        call: {
          right: ['«{call}» يوم {day}. ونزلت. بوسة شيف', 'قلت {call}. النادي قال آه', '{call} كان القرار. والقرار صح', 'صوّر الـ{call}. تاريخ', 'قلت {call} ومشيت زي المحترفين', '{call} يوم {day}؟ تصرفات نبي', 'بوست {call} عتّق زي النبيذ', '{call}. كلمتين. W واحدة', 'قلت {call} والورق وافق', '{call} كان الرأي الوحيد المهم', 'نشرت {call} والباقي نايم', 'لو {call} سهم كنت اشتريته'],
          wrong: ['«{call}» يوم {day}. شجاع. غلط', 'قلت {call}. النادي قال مين؟', '{call} كان اختيار. الغلط', 'بوست {call} في متحف الـL', '{call}؟ يوم {day}؟ بالمصادر دي؟', '{call} اتعمله ريبورت معلومات مضللة', 'رأي {call} بقى ميم خلاص', 'تخيّل تكتب {call} بكل ثقة', '{call} ولا كشف طبي واحد', 'محتفظ بـ{call} لفيديو الأخطاء', 'قرار {call} ساب المبنى', '{call}: كلام كبير، ولا إيصال'],
        },
      },
      rival: {
        gloat: {
          tabloid: ['كانت معايا الأول. بصوت أعلى. وصح. {p} بيسلّم عليك.', 'اليوم {n}. الصفحة الأخيرة. وانت؟ ولا حاجة. 😂', 'في ناس بتنشر. وناس بتتفرج.', 'الفيديو كان محتاج مقدمة. شكراً.', 'كنت على {p} يوم {n}. انت كنت في أجازة، واضح.', 'سكووب: أنا كسبت. تاني.', 'صوّرت تويتتي أنا. لدولاب الكؤوس.', 'بطيء. زي العادة.'],
          itk: ['يوم {n}. 👀', 'مصدري قال {p}. مصدري مبيغلطش.', 'قبلها بيوم، زي كل مرة. 🔜', 'قلتلك. قلت للكل يعني. انت مكنتش سامع.', 'الجراج مبيكدبش.', '🤫 قريباً أكتر. ليك: أقل.', 'كان معايا {p} يوم {n}. غامض بس كان معايا.', 'الشبكة بتتحرك. انت لأ.'],
          insider: ['نشرت يوم {n}. كان صح. بس كده.', 'أنا مبشمتش. بسجّل بس.', 'اليوم {n}، سطر واحد، صح. المنهج شغال.', 'انت مكنتش عليها. أنا كنت. بهدوء.', 'مركز التدريب قالي. اتأكدت. نشرت.', 'راجعت مرتين، نشرت مرة. يوم {n}.', 'الصبر يا ابني. بيجيب.', 'السجل هيقول مين كان عنده {p}.'],
        },
        concede: {
          tabloid: ['ماشي. بتاعتك. همسح الفيديو. (لأ مش همسح.)', 'أوكي. دي كانت حلوة. متتعوّدش.', 'الكريدت لصاحبه. كريدت صغير.', 'هعملك ميوت يوم. احتراماً.', 'اتغلبت. في {p}. منك انت. بشع.', 'أنا غلطت. انت صح. المكتب بيضحك عليّا دلوقتي.', 'احترام على مضض. التركيز على المضض.', 'لعبتها صح. بعملك أنفولو عشان أتعايش.'],
          itk: ['ماشي. 👀', 'مصدري بيكلّم نفسه.', 'ماشي دي بتاعتك. 🤫', 'الشبكة كان عندها يوم وحش. انت لأ.', 'بمسح الدرافتس. بهدوء.', 'احترام. بحروف صغيرة، بس احترام.', 'سبقتني. نادرة.', 'متسجّلة. 🔜 راجع أقوى.'],
          insider: ['لقطة حلوة. بجد.', 'انت كنت صح وأنا لأ. بتحصل. نادراً.', 'شغل حلو. دي صحافة.', 'هكلّم الراجل بتاعي.', 'برافو. انت اللي تعبت.', 'الكريدت ليك. مبقولهاش كتير.', 'قرار محترم. كنت هفتخر بيه.', 'صح. وبدري. برافو.'],
        },
        smug: {
          tabloid: ['آه انت صح دلوقتي؟ أنا كنت صح يوم {n}. 😂', 'متأخر عالحفلة. ومجبتش حاجة معاك.', 'أهلاً بيك في أخبار امبارح.', 'صح، بس أنا اللي خدت الكليكات.', 'صح. وتاني. غالباً تاني.', 'نزلتها في الصفحة الأخيرة من أيام. لاحق.', 'ذوق منك إنك تأكّد خبري.', 'اتسبقت. مني. تاني.'],
          itk: ['قلت دي يوم {n}. 👀', 'البدري طريقة تفكير. المتأخر مجرد توقيت.', 'كويس إنك وصلت. أخيراً.', 'انت وباقي التايم لاين. 🔜', 'الشبكة كان عندها دي امبارح.', 'اللحاق برضه مهارة، على ما أظن.', 'صح، بس متأخر يوم. تخصصي إني بدري يوم.', '🤫 رحت للي بعدها خلاص.'],
          insider: ['نشرت يوم {n}. انت صح، بس متأخر.', 'صح. السجل بيقول مين كان الأول.', 'الصح المتأخر برضه صح. بس أقل فايدة.', 'مبسوط إننا متفقين. أنا اتفقت الأول.', 'انت وصلت. أنا كنت هناك.', 'إجابة صح. منهج بطيء.', 'يوم {n}. افتكره المرة الجاية.', 'برافو. بتاعتي منشورة من يوم {n}.'],
        },
        alsoWrong: {
          tabloid: ['الاتنين غلطنا. بتاعتي كانت أظرف.', 'منتكلمش عن {p} تاني أبداً.', 'الاتنين استوينا. بتاعتي على الأقل كانت كابيتال.', 'L مشتركة. نقسم الحساب.', 'أنا همسح بتاعتي. وانت امسح بتاعتك. اتفقنا؟', 'محدش شافها جاية. محدش.', 'غلطانين سوا. منافسين في الفضيحة.', 'الفيديو واقف دقيقة حداد.'],
          itk: ['منتكلمش عن دي.', 'مصدري ومصدرك كان عندهم نفس اليوم الوحش.', 'الاتنين غلط. 🤫 نكمّل.', 'النادي ضحك علينا احنا الاتنين. قلة ذوق.', 'الدرافت اتمسح. أنصحك تعمل كده.', 'الشبكة بتلمّ نفسها.', 'حتى الجراج غلط في {p}.', 'L مشتركة. بس اللوم مش مشترك.'],
          insider: ['الاتنين غلطنا في {p}. النادي لعب بالكل.', 'أسبوع وحش للمهنة.', 'مبيضايقنيش أغلط في صحبة كويسة.', 'هنتعلم من دي. انت أكتر مني.', 'غلطانين سوا. الكشف كان في حتة تانية.', 'كل صحفي بتحصله واحدة. واحنا حصلتلنا نفسها.', 'درس تواضع. للاتنين.', 'الورق ضحك علينا احنا الاتنين.'],
        },
        uturn: ['اتمسح واتنشر تاني في {p}. شفنا الأول. 📸', 'لفّة {p} في صفحة ميمز خلاص.', 'صحافة جي بي إس في {p}. جاري إعادة الحساب…', 'البوست الأول: غلط. التاني: نشوف. السكرين: للأبد.', 'بوستين عن {p}. واحد منهم في الفيديو.', 'زرار المسح شال الشيلة في {p}.'],
      },
    },
    voice: more(V(ar), {
      kitman: {
        0: ['دوجي: «شال التيكت اللي عليه اسمه من الشمّاعة. قالي احتفظ بيه. واد عاطفي.»', 'دوجي: «رجّع لبس التمرين مغسول ومتطبّق. محدش بيعمل كده إلا لو ماشي.»', 'دوجي: «خد فوطة الحظ بتاعته البيت. الفوطة دي هنا من أربع سنين.»'],
        1: ['دوجي: «طلب مني استادز جديدة للشهر الجاي. الشهر الجاي. قاعد.»', 'دوجي: «نفس الكرسي في غرفة اللبس. نفس الشكوى من التكييف. مش ماشي.»', 'دوجي: «طلب جوانتيات شتوي بمقاسه. ده واحد مخطط يقضي الشتا هنا.»'],
      },
      barber: {
        0: ['سال: «يا عم. يا عم! خلصت. صاحب ابن أخويا خطيبته شغالة في {to}. القميص اتطبع.»', 'سال: «تلات زباين على الكرسي الصبح، التلاتة قالوا {to}. تلاتة! ده إجماع.»', 'سال: «طلب قصّة يوم التوقيع. قصّة يوم التوقيع. خلصت الحكاية.»'],
        1: ['سال: «{to}؟ لا لا لا. في حد دخل بعرض أعلى. سمعتها وأنا بعمل ديجراديه.»', 'سال: «الكلام في المحل إن {to} اتسبقوا. اتسبقوا! زي فوتو فينيش.»', 'سال: «ماشي، بس {to} يصفّروا. نادي تاني. ثق فيا. أو ثق في المحل.»'],
        2: ['سال: «ماتت زي المكنة القديمة بتاعتي. {from} عايزين فلوس مجنونة.»', 'سال: «باظت. عمولة الوكيل، بيقولوا. الكل بيتكلم.»', 'سال: «ساقعة. أسقع من الحنفية اللي هنا.»'],
        3: ['سال: «عمرها ما كانت حقيقية يا عم. حد عايز عقد جديد وشوية دوشة.»', 'سال: «متألّفة. أنا كنت بألّف أحسن من كده في المدرسة.»', 'سال: «دخان. مفيش نار. ولا حتى كبريت.»'],
      },
      agent: {
        0: ['روزا: «احنا قريبين جداً من {to}. جداً. بختار الجزمة للصور.»', 'روزا: «موكّلي و{to}؟ خلّينا نقول الأقلام طلعت.»', 'روزا: «بطّلت أرد على أندية تانية. افهمها زي ما تحب.»'],
        1: ['روزا: «{to} استنوا. السوق مبيستناش. باب تاني فتح.»', 'روزا: «بنحب {to}. بنحب حد تاني أكتر، مادياً.»', 'روزا: «{to} كانوا الخطة. الخطط بتتغيّر لما خطة أحسن ترن.»'],
        2: ['روزا: «اتكلمنا. ومشينا. {from} كانوا عايزين القمر.»', 'روزا: «كانت حقيقية. خلصت. موكّلي رايق. أنا أقل.»', 'روزا: «مفيش صفقة. الأرقام عمرها ما سلّمت على بعض.»'],
        3: ['روزا: «{to}؟ عمري ما سمعت منهم. جايب الكلام ده منين؟»', 'روزا: «مكنش في صفقة. كان في تجديد عقد، وشوية دوشة مفيدة.»', 'روزا: «محدش في {to} معاه رقمي. اتأكدت.»'],
      },
      spotter: {
        0: ['توني: «بوابة ٤، ٦:١٠. طيارة خاصة، رقم الذيل مظبوط. رايحة {to}. الترمس لسه سخن.»', 'توني: «عربية النادي على الممر وخطة طيران لمدينة {to}. معايا صورة. مهزوزة، بس هو.»', 'توني: «راكبين، واحد طويل جداً، وواحد واخد فلوس جداً. الوجهة: {to}.»'],
        1: ['توني: «الطيارة طلعت. الاتجاه الغلط لـ{to}. راجعت خطة الطيران مرتين. تلاتة.»', 'توني: «طار، آه. مش {to}. الناحية التانية خالص.»', 'توني: «الطيارة المستأجرة طلعت الفجر. مش مطرح ما {to} بيتمرنوا. سجّلتها.»'],
        2: ['توني: «ولا حاجة. لا طيارة ولا عربية ولا ريحة. هادي زي الوصول يوم العيد.»', 'توني: «أنا في الترمينال من خمسة. ولا قرّب.»', 'توني: «مفيش حركة. أنا والترمس كنا هنعرف.»'],
      },
      physio: {
        0: ['د. إينيس: «الكشف متحدّد. {to}، ٨:٠٠. الأشعة اتطلبت ٩:٤٠ بالليل امبارح.»', 'د. إينيس: «ملفه خرج الصبح على ورق {to}. ده ليه معنى واحد.»', 'د. إينيس: «رسم قلب اتحجز، أشعة ركبة اتحجزت. دكاترة {to}. بكرة.»'],
        1: ['د. إينيس: «الأشعة رايحة نادي تاني. مش {to}. شفت العنوان.»', 'د. إينيس: «في كشف متحجز. الورق مش بتاع {to}.»', 'د. إينيس: «نادي تالت طلب الملف ٧:١٥. {to} مطلبوش.»'],
        2: ['د. إينيس: «مفيش طلب. مفيش أشعة. مفيش ميعاد. إكلينيكياً: لا شيء.»', 'د. إينيس: «كان على الترابيزة عندي ٩:٠٠. محدش تاني سأل عليه.»', 'د. إينيس: «صفر طلبات الأسبوع ده. الملف لسه في الدرج.»'],
      },
      leak: {
        0: ['المكتب الإعلامي: «بيني وبينك: اتفقنا. فيديو الإعلان بيتمنتج.»', 'المكتب الإعلامي: «مسمعتهاش مننا. خلصت. الجرافيكس جاهزة.»'],
        1: ['المكتب الإعلامي: «بيني وبينك، حد تاني اتحرك الأول. هنسيبه يمشي.»', 'المكتب الإعلامي: «ماشي. بس البيان مش هيقول {to}.»'],
        2: ['المكتب الإعلامي: «اتكلموا. وخلصت. هيفضل.»', 'المكتب الإعلامي: «النادي قال لأ. البيان هيقولها بأدب.»'],
        3: ['المكتب الإعلامي: «عمر ما كان في عرض. محدش اتصل.»', 'المكتب الإعلامي: «متألّفة. كنا هنعرف. احنا بنرد على التليفون.»'],
      },
    }),
  },
  es: {
    bnx: {
      fan: {
        excl: ['PRIMERO. BIEN. FUERTE. la santísima trinidad', 'nadie tenía lo de {p}. tú sí. enmárcalo', 'Scoop con recibos. más raro que una portería a cero', 'todo el timeline te está citando A TI', 'lo soltaste y los demás siguen dándole a F5', 'Scoop. la palabra vuelve a significar algo', 'imagina ser los rivales ahora mismo 😭', 'este es el post que se capturará dentro de cinco años', 'primero con {p} y ni fue ajustado', 'energía de check azul sin check azul', 'los ITK fingen que lo tenían. no lo tenían', 'guardado, fijado, tatuado', 'pronto Y bien. elige uno, decían', 'periodismo tan limpio que brilla', 'el foro del {c} se ha caído. culpa tuya'],
        late: ['bien, pero tarde. como el autobús del domingo', 'llegaste a lo de {p} con la multitud', 'correcto y elegantemente tarde', 'los rivales lo tenían en el desayuno. tú en la cena', '¿noticia? esto es historia, hermano', 'respuesta buena, segundo puesto', 'bienvenido a la fiesta. acabó el martes', 'buena lectura. lectura lenta', 'el timeline ya va por el siguiente', 'un día tarde y un seguidor menos', 'acertaste como acierta el hombre del tiempo después de llover', 'confirmaste lo que todos sabíamos. ¿gracias?', 'tarde pero bien sigue siendo bien. más bajito', 'la próxima llama a alguien ANTES que los rivales', 'el post del rival es más viejo que tu café'],
        dd: ['héroe del día de cierre 🕛', 'sesenta segundos y la clavaste. sangre fría', 'mantuviste la cabeza y el reloj no', 'último minuto y bien. cine', 'la energía de día de cierre de esto', 'mientras todos entraban en pánico tú publicaste la verdad', 'dedos rápidos, datos rectos', 'el día de cierre cumple otra vez', 'tú y el fax haciendo horas extra', 'el reloj dijo pánico. tú dijiste {p}', 'se cerró el mercado y estabas en el lado bueno', 'W de día de cierre. captura para el vídeo', 'sobre la bocina', 'por esto trasnochamos el día de cierre', 'nervios de acero, fuentes de oro'],
        softRight: ['prudente y bien. respetamos al rey de los Contactos', 'lo dijiste bajito y sonó fuerte', '¿solo Contactos? podías haber ido a por todas', 'cubierto y aun así bien. listo', 'apuesta segura, buena, pequeña', 'te quedaste corto. humilde', 'bien, pero en susurro', 'los callados siempre aciertan', 'un punto más alto y serías tendencia', 'Contactos y verdad. construyendo confianza', 'suave, seguro y exacto', 'dejaste puntos en la mesa pero salvaste la dignidad', 'tímido pero preciso', 'la próxima dilo con el pecho', 'poco riesgo, manos limpias'],
        softWrong: ['menos mal que solo dijiste Contactos 😅', 'mal, pero bajito. te la pasamos', 'te cubriste y aun así perdiste', 'apuesta pequeña, L pequeña', 'los contactos eran imaginarios', 'fallo por poco. por poco', 'menos mal que no fuiste fuerte con esta', 'aterrizaje suave en la pista equivocada', 'un susurro de L', 'entraste de puntillas en la habitación equivocada', 'sin daños. algún daño', 'suerte que solo eran Contactos', 'el fallo bajito también cuenta', 'L suave. salsa suave. todo suave', 'la cobertura te salvó. por los pelos'],
        loudWrong: ['¿CON TODO? ¿con qué pruebas?', 'todo mayúsculas, cero datos', 'fuiste fuerte y fuiste mal. el combo', 'el botón de Drop no es un juguete', 'imagina la seguridad. ahora imagina acertar', 'valiente. mal. valiente y mal', 'borrar esto sería la primera buena decisión', 'fuiste con todo como si fuera un estado de ánimo', 'la L más ruidosa del mercado', 'la captura ya está en tres grupos', '¿Con todo según quién? ¿tu abuela?', 'mucho hablar, cero reconocimiento', 'el megáfono encendido y los datos apagados', 'te oímos. todos te oímos. mal', 'la próxima confírmalo con alguien que no seas tú'],
        silence: ['ni una palabra de {p}. ¿prudencia o siesta?', 'el culebrón de {p} vino y se fue. tú mirando', '¿sin apuesta? se está cómodo en la valla', 'le hiciste ghosting a {p} como a una mala cita', 'callado con {p}. ¿miedo a las respuestas?', 'cero posts, cero riesgo, cero caché', 'esperamos tu opinión. nunca llegó', '¿ni un Contactos?', 'tu silencio sonó más que los rivales', 'viéndolo desde la grada', 'si no publicas no fallas. ni aciertas', 'dejaste a {p} en visto', 'no opinar es opinar. aburrido', 'los ITK de fiesta y tú de siesta', 'abstención con {p}. estrategia atrevida'],
        uturnJab: ['el cambio de rumbo llegó. el primer post sigue en mi galería', 'bien al final. el medio fue un caos', 'cambiaste de idea y tuviste suerte. o eres bueno. no está claro', 'periodismo GPS. recalculó bien', 'borrar, republicar, acertar. los tres pasos', 'vimos las dos versiones 📸', 'la republicación acertó. el original es un meme', 'chaquetero pero correcto', 'segundo borrador: bien. primero: capturado', 'buena rectificación. mejor captura', 'giraste hasta la verdad', 'el botón de borrar te llevó en brazos', 'bien al segundo intento. contamos el primero también', 'el arco de redención fue rápido', 'diste la vuelta y acertaste. como un buen portero'],
        pity: ['difícil. {p} engañó a todos', 'mala suerte. las fuentes gritaban mucho', 'pasa. sacúdetelo', 'la historia giró y tú no. mala suerte', 'mal pero honesto. eso cuenta', 'levántate. próximo mercado', 'todos hemos pasado por ahí. algunos dos veces', 'no es culpa tuya que el agente estuviera pescando', 'te mando un café y un abrazo ☕', 'te la coló el barbero. se la cuela a todos', 'olvídalo. {p} no valía la pena', 'mala mano. buen esfuerzo', 'la próxima llama al fisio', 'te seguimos. de momento', 'arriba ese ánimo. llega el día de cierre'],
        twistCalled: ['viste venir el giro como un pase al hueco', 'leíste lo de {p} antes que el guion', '¿giro? tú ya estabas allí', 'cantaste el giro. nivel', 'todos picaron menos tú', 'tenías la secuela antes de que acabara la peli', 'inmunidad de guion: {name}', 'el giro estaba en tus borradores', 'nadie lo vio venir. tú sí', 'la historia dio un volantazo y tú esperabas', 'leíste el vestuario, leíste el giro', 'cantaste el cambio antes que el club', 'maestro de giros', 'acertaste el final', 'alguien se ha leído el guion'],
        twistCaught: ['retorcido como un churro 🌀', 'la historia se movió. tú no', 'la trama te dejó atrás', 'te pilló el volantazo', 'bien el lunes, mal el viernes', 'ese giro llevaba tu nombre', 'la historia se fue con otro', 'acertabas antes de fallar', 'parpadeaste y te perdiste el giro. parpadeaste', 'el culebrón te hizo un Cruyff', 'te quitaron la alfombra', 'giro de guion: tú', 'la historia cambió de carril sin intermitente', 'nadie te avisó. nadie avisó a nadie', 'agitado y revuelto'],
        twistUpdated: ['vio el cambio, cambió la apuesta. pro', 'actualizaste más rápido que la web del club', 'te adaptaste como un portero líbero', 'la historia se movió y tú con ella', 'seguiste el giro. buen juego de pies', 'sin orgullo, solo datos. respeto', 'cambiaste de rumbo y seguiste bien', 'fluiste. cabeza fría', 'la actualización fue la noticia', 'leíste el giro, reescribiste el tuit', 'un buen periodista cambia de opinión', 'pillaste el volantazo a tiempo', 'giraste con la historia como un lateral', 'cambio tardío, cambio bueno', 'el giro lo intentó. tú ajustaste'],
        call: {
          right: ['“{call}” el día {day}. y entró. beso de chef', 'dijiste {call}. el club dijo sí', '{call} era la apuesta. y era buena', 'captura del {call}. historia', 'dijiste {call} y te fuiste como un pro', '¿{call} el día {day}? profeta', 'el post de {call} ha envejecido como el buen vino', '{call}. dos palabras. una W', 'fuiste a {call} y los papeles te dieron la razón', '{call} era la única opinión que importaba', 'publicaste {call} mientras los demás dormían', 'si {call} cotizara en bolsa, compraba'],
          wrong: ['“{call}” el día {day}. valiente. mal', 'dijiste {call}. el club dijo ¿quién?', '{call} fue una elección. la mala', 'el post de {call} está en el museo de las L', '¿{call}? ¿el día {day}? ¿con esas fuentes?', '{call} ha sido denunciado por desinformación', 'lo de {call} ya es meme', 'imagina escribir {call} con todo el pecho', '{call} y ni un reconocimiento médico', 'guardo tu {call} para las tomas falsas', 'la apuesta {call} ha abandonado el edificio', '{call}: mucho titular, cero recibos'],
        },
      },
      rival: {
        gloat: {
          tabloid: ['Lo tuve primero. Más alto. Y bien. {p} te saluda.', 'Día {n}. En el timeline. ¿Tú? Nada. 😂', 'Unos publicamos. Otros miran.', 'Al vídeo le faltaba intro. Gracias.', 'Estaba con {p} el día {n}. Tú de vacaciones, parece.', 'EXCLUSIVA: gano yo. Otra vez.', 'Capturé mi propio tuit. Para la vitrina.', 'Lento. Como siempre.'],
          itk: ['día {n}. 👀', 'mi fuente dijo {p}. mi fuente no falla.', 'un día antes, como siempre. 🔜', 'te lo dije. se lo dije a todos. tú no escuchabas.', 'el parking no miente.', '🤫 más pronto. para ti: menos.', 'tenía lo de {p} el día {n}. críptico, pero lo tenía.', 'la red se mueve. tú no.'],
          insider: ['Publiqué el día {n}. Era correcto. Nada más.', 'Yo no presumo. Anoto el historial.', 'Día {n}, una línea, correcta. El método funciona.', 'Tú no estabas. Yo sí. En silencio.', 'Me lo dijeron en la ciudad deportiva. Lo comprobé. Lo publiqué.', 'Comprobado dos veces, publicado una. Día {n}.', 'Paciencia, chaval. Compensa.', 'El historial dirá quién tuvo lo de {p}.'],
        },
        concede: {
          tabloid: ['Vale. Tuya. Borro el vídeo. (No.)', 'OK. Esa fue buena. No te acostumbres.', 'Mérito a quien lo tiene. Poco mérito.', 'Te silencio un día. Por respeto.', 'Ganado. Con {p}. Por TI. Horrible.', 'Me equivoqué. Acertaste. La redacción se ríe de mí.', 'Respeto a regañadientes. Mucho regañadientes.', 'Bien jugado. Te dejo de seguir para superarlo.'],
          itk: ['vale. 👀', 'mi fuente está hablando consigo misma.', 'vale, esa es tuya. 🤫', 'la red tuvo un mal día. tú no.', 'borrando borradores. en silencio.', 'respeto. en minúsculas, pero respeto.', 'me ganaste. raro.', 'anotado. 🔜 vuelvo más fuerte.'],
          insider: ['Bien visto. De verdad.', 'Tú acertaste y yo no. Pasa. Poco.', 'Buen trabajo. Eso es periodismo.', 'Tendré unas palabras con mi contacto.', 'Justo. Tú hiciste el trabajo de calle.', 'Mérito tuyo. No lo digo a menudo.', 'Una apuesta como es debido. Me habría enorgullecido.', 'Correcto. Y pronto. Bien hecho.'],
        },
        smug: {
          tabloid: ['¿Ahora aciertas? Yo acerté el día {n}. 😂', 'Tarde a la fiesta. Y sin traer nada.', 'Bienvenido a las noticias de ayer.', 'Bien, pero los clics me los llevé yo.', 'Correcto. Y segundo. Sobre todo segundo.', 'Lo publiqué hace días. Espabila.', 'Muy amable confirmando mi noticia.', 'Te ganaron. Yo. Otra vez.'],
          itk: ['dije esto el día {n}. 👀', 'llegar pronto es una mentalidad. tarde es una hora.', 'me alegro de que llegaras. al final.', 'tú y el resto del timeline. 🔜', 'la red lo tenía ayer.', 'ponerse al día también es un talento, supongo.', 'bien, pero un día tarde. lo mío es un día antes.', '🤫 ya voy por la siguiente.'],
          insider: ['Publicado el día {n}. Aciertas, pero tarde.', 'Correcto. El historial anota quién fue primero.', 'Acertar tarde sigue siendo acertar. Solo sirve menos.', 'Me alegra que coincidamos. Coincidí antes.', 'Llegaste. Yo ya estaba.', 'Respuesta buena. Método lento.', 'Día {n}. Recuérdalo la próxima.', 'Bien hecho. Lo mío está publicado desde el día {n}.'],
        },
        alsoWrong: {
          tabloid: ['Fallamos los dos. Lo mío tuvo más gracia.', 'No volvamos a hablar de {p}.', 'Los dos fritos. Lo mío al menos en mayúsculas.', 'L compartida. A medias la cuenta.', 'Yo borro el mío. Tú el tuyo. ¿Trato?', 'Nadie lo vio venir. Nadie.', 'Fallando juntos. Rivales en la vergüenza.', 'El vídeo guarda un minuto de silencio.'],
          itk: ['de esta no se habla.', 'mi fuente y la tuya tuvieron el mismo mal día.', 'los dos mal. 🤫 seguimos.', 'el club nos engañó a los dos. qué feo.', 'borrador borrado. te sugiero lo mismo.', 'la red se está reagrupando.', 'hasta el parking falló con {p}.', 'L compartida. la culpa no la comparto.'],
          insider: ['Los dos fallamos con {p}. El club jugó con todos.', 'Mala semana para el oficio.', 'No me importa fallar en buena compañía.', 'Aprenderemos de esto. Tú más que yo.', 'Fallamos juntos. El reconocimiento fue en otro sitio.', 'A todo periodista le pasa una. Nos pasó la misma.', 'Lección de humildad. Para los dos.', 'Los papeles nos engañaron a ambos.'],
        },
        uturn: ['Borrado y republicado con {p}. Vimos el primero. 📸', 'El cambio de rumbo con {p} ya está en una página de memes.', 'Periodismo GPS con {p}. Recalculando…', 'Primer post: mal. Segundo: ya veremos. Captura: para siempre.', 'Dos posts sobre {p}. Uno está en el vídeo.', 'El botón de borrar hizo todo el trabajo con {p}.'],
      },
    },
    voice: more(V(es), {
      kitman: {
        0: ['Dougie: «Ha quitado la etiqueta con su nombre de la percha. Me ha pedido que la guarde. Sentimental el chaval.»', 'Dougie: «Ha devuelto la ropa de entrenar lavada y doblada. Nadie hace eso si se queda.»', 'Dougie: «Se ha llevado a casa su toalla de la suerte. Esa toalla lleva aquí cuatro años.»'],
        1: ['Dougie: «Me ha pedido tacos nuevos para el mes que viene. El mes que viene. Se queda.»', 'Dougie: «Misma silla en el vestuario. Misma queja de la calefacción. No se va.»', 'Dougie: «Ha pedido guantes de invierno de su talla. Ese piensa pasar el invierno aquí.»'],
      },
      barber: {
        0: ['Sal: «Tío. ¡TÍO! Hecho. La novia del amigo de mi sobrino trabaja en el {to}. Camiseta impresa.»', 'Sal: «Tres clientes en la silla esta mañana y los tres dicen {to}. ¡Tres! Eso es consenso.»', 'Sal: «Me pidió el corte de día de firma. El corte de día de firma. No digo más.»'],
        1: ['Sal: «¿El {to}? Que no, que no. Alguien ha pujado más. Me lo contaron en pleno degradado.»', 'Sal: «En la barbería dicen que al {to} se lo han levantado. ¡Levantado! Como una foto finish.»', 'Sal: «Se va, pero el {to} que espere sentado. Otro club. Hazme caso. Bueno, hazle caso a la barbería.»'],
        2: ['Sal: «Muerto como mi maquinilla vieja. El {from} pide una locura.»', 'Sal: «Se cayó. La comisión del agente, dicen. Lo comenta todo el mundo.»', 'Sal: «Frío. Más frío que el grifo de aquí.»'],
        3: ['Sal: «Nunca fue real, tío. Alguien quería contrato nuevo y un poco de ruido.»', 'Sal: «Inventado. Yo inventaba mejores historias en el colegio.»', 'Sal: «Humo. Nada de fuego. Ni una cerilla.»'],
      },
      agent: {
        0: ['Rosa: «Estamos muy cerca del {to}. Muy. Estoy eligiendo zapatos para las fotos.»', 'Rosa: «¿Mi cliente y el {to}? Digamos que ya han sacado los bolis.»', 'Rosa: «He dejado de contestar a otros clubes. Interprétalo.»'],
        1: ['Rosa: «El {to} esperó. El mercado no espera. Se abrió otra puerta.»', 'Rosa: «Queremos al {to}. Queremos más a otro, económicamente.»', 'Rosa: «El {to} era el plan. Los planes cambian cuando llama uno mejor.»'],
        2: ['Rosa: «Hablamos. Nos levantamos de la mesa. El {from} pedía la luna.»', 'Rosa: «Fue real. Se acabó. Mi cliente está tranquilo. Yo menos.»', 'Rosa: «No hay acuerdo. Los números nunca se dieron la mano.»'],
        3: ['Rosa: «¿El {to}? Nunca he sabido nada de ellos. ¿De dónde sacas eso?»', 'Rosa: «No hubo negociación. Hubo una renovación, y algo de ruido útil.»', 'Rosa: «Nadie del {to} tiene mi número. Lo he comprobado.»'],
      },
      spotter: {
        0: ['Tony: «Puerta 4, 06:10. Jet privado, la matrícula cuadra. Rumbo al {to}. El termo aún caliente.»', 'Tony: «Coche del club en la pista y plan de vuelo a la ciudad del {to}. Tengo foto. Movida, pero es él.»', 'Tony: «Dos pasajeros, uno muy alto, otro muy bien pagado. Destino: {to}.»'],
        1: ['Tony: «El jet salió. Dirección equivocada para el {to}. Revisé el plan de vuelo dos veces. Tres.»', 'Tony: «Voló, sí. No al {to}. Justo al otro lado.»', 'Tony: «El chárter salió al amanecer. No a donde entrena el {to}. Anotado.»'],
        2: ['Tony: «Nada. Ni jet, ni coche, ni rastro. Tranquilo como llegadas en Navidad.»', 'Tony: «Llevo en la terminal desde las cinco. Ni se ha acercado.»', 'Tony: «Cero movimientos. Mi termo y yo lo sabríamos.»'],
      },
      physio: {
        0: ['Dra. Inès: «Reconocimiento programado. {to}, 08:00. Pruebas pedidas anoche a las 21:40.»', 'Dra. Inès: «Su historial salió esta mañana con membrete del {to}. Eso solo significa una cosa.»', 'Dra. Inès: «Prueba cardíaca y resonancia de rodilla reservadas. Médicos del {to}. Mañana.»'],
        1: ['Dra. Inès: «Las pruebas van a otro club. No al {to}. Vi la dirección.»', 'Dra. Inès: «Hay un reconocimiento reservado. El membrete no es del {to}.»', 'Dra. Inès: «Un tercer club pidió el historial a las 07:15. El {to} no lo ha pedido.»'],
        2: ['Dra. Inès: «Ninguna petición. Ninguna prueba. Ninguna cita. Clínicamente: nada.»', 'Dra. Inès: «Estaba en mi camilla a las 09:00. Nadie más ha preguntado por él.»', 'Dra. Inès: «Cero peticiones esta semana. El historial sigue en mi cajón.»'],
      },
      leak: {
        0: ['Prensa del club: «Off the record: acordado. Están montando el vídeo del anuncio.»', 'Prensa del club: «No lo has oído aquí. Está hecho. Los gráficos están listos.»'],
        1: ['Prensa del club: «Entre nosotros, otro se movió antes. Le dejamos ir.»', 'Prensa del club: «Se va. El comunicado no dirá {to}.»'],
        2: ['Prensa del club: «Hubo conversaciones. Se acabaron. Se queda.»', 'Prensa del club: «El club dijo que no. El comunicado lo dirá con educación.»'],
        3: ['Prensa del club: «Nunca hubo una oferta. No ha llamado nadie.»', 'Prensa del club: «Inventado. Lo sabríamos. Cogemos el teléfono.»'],
      },
    }),
  },
};

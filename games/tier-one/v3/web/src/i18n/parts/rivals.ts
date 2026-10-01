// Rival voice packs (banter lane, 3.5). Three fictional football-Twitter archetypes. No real people, reporters,
// accounts or club staff, ever (docs/LEGAL_NAMES.md). PG-13: banter about calls, records and sources, never a life.
//   @BackPageBants  tabloid · screenshot-and-ratio · CAPS · "the reel"
//   @ITK_Kev        anonymous ITK · "my source at the club" · a day early · cryptic emojis · lowercase
//   @PressBoxPete   old school · "I don't do rumours" · full sentences · quietly lethal
// cn.taunt.<id>.<losing|winning|level>: the first 8 lines are the pre-3.5 pools from connect.ts (old feed items point at
// them by index), then 24 more. Every pool is 32 lines in EN, AR and ES (lib/rivals.ts tauntIndex sizes by EN).
// Vars: {rec} your record vs them, {p} the player you duelled on, {name} your byline, {phrase} your catchphrase.
// rv.<id>.cp.right/wrong: your catchphrase landing or not. rv.<id>.uturn, rv.<id>.dd, rv.<id>.ddlive.<open|close|lead|trail>.
import connect from './connect';

type L = 'en' | 'ar' | 'es';
type Pools = Record<'tabloid' | 'itk' | 'insider', Record<'losing' | 'winning' | 'level', string[]>>;
const legacy = (l: L) => (connect as unknown as Record<L, { cn: { taunt: Pools } }>)[l].cn.taunt;
const withLegacy = (l: L, more: Pools): Pools => {
  const old = legacy(l), out = {} as Pools;
  for (const id of ['tabloid', 'itk', 'insider'] as const) {
    out[id] = { losing: [...old[id].losing.slice(0, 8), ...more[id].losing], winning: [...old[id].winning.slice(0, 8), ...more[id].winning], level: [...old[id].level.slice(0, 8), ...more[id].level] };
  }
  return out;
};

const EN: Pools = {
  tabloid: {
    losing: [
      'L + you fell for it + {rec}.', 'Screenshotted your {p} post before you could delete it. It’s pinned now.', 'RATIO. {rec}. Have a lovely evening.', 'Source: trust me bro. That was your whole file on {p}.',
      'Imagine going Confirmed on {p} with a barber and a dream. 😂', 'The reel’s got a new intro clip. Guess who’s in it.', 'BREAKING: {name} wrong again. In other news, water wet.', '{name} calls it, the opposite happens. Reliable in its own way.',
      'Medical booked? Mate, the only thing booked was your L.', 'I don’t need sources. I just wait for {name} to post and go the other way.', 'Agent tweet was fake. Your call was faker. {rec}.', 'The office sweepstake was “how wrong”. Everyone picked “very”. Everyone won.',
      'You: “announce him”. The club: announced someone else. 😂', '{p} deal was cooked and so were you.', 'Quote-tweeting this in July when it ages even worse.', '{rec}. Not a rivalry. A public service announcement.',
      'Delete it, {name}. We’ve all got it saved anyway.', 'Your sources are my sources’ ex-sources.', 'Your followers are DMing me for the real story. I send them my link.', 'You posted {p} at Confirmed. Confirmed wrong, to be fair.',
      'Hard to be this loud and this wrong. Respect, sort of.', 'Ran your {p} tweet on the back page. Under “Things That Didn’t Happen”.', 'Rumour: {name} is good at this. Status: FAKE.', 'Every window, same film: I post, you scramble, I win. {rec}.',
    ],
    winning: [
      'Okay {name}. You got one. The reel is still longer than your record.', 'Screenshot THIS then. Actually don’t.', 'Post deleted. Account fine. Ego bruised. {rec}.', 'You were right on {p}. I was right about it being Tuesday.',
      'Muting the word “{p}” for a week. Nothing to do with you.', 'My source at the club was the club shop. Bad source.', 'Congratulations on reading a physio report. Real journalism.', 'You called {p}. I called a taxi. Different priorities.',
      'This is why I don’t check the scoreboard. {rec}. Horrible.', '{rec}. Nobody tell the group chat.', 'Ratio’d by someone with fewer followers. New low. Genuinely.', 'The replies are calling me cooked. The replies have a point.',
      'Fair. I owe you a pint. I won’t pay it.', 'Enjoy it, {name}. Windows come round quick.', 'I’m still louder. Loud counts for something. Not points, apparently.', 'Wrong on {p}. Right about everything else in my life. Mostly.',
      'You had the story. I had the headline font. One of us got paid.', 'The reel has an outtake now. It’s me.', 'Reposted your {p} call. Without credit, obviously.', 'Two right in a row? Who’s feeding you?',
      'You’re on a run, {name}. Runs end. Usually on my timeline.', 'Aura check: yours up, mine cooked. Temporary.', 'I’ll allow it. Once. {rec}.', 'The tabloid concedes. Briefly. In small print.',
    ],
    level: [
      'Level, {name}. The reel is on pause, not deleted.', 'Same call on {p}. I said it in 72pt. Yours was a whisper.', '{rec}. Boring. Somebody be wrong next time.', 'Two accounts, one story, zero drama. Fix it, {name}.',
      'Split decision. The crowd wanted blood.', 'Draw. I still got more likes. Likes are the real table.', 'Copied my {p} homework and got the same mark. Suspicious.', 'Even. Which is a loss for me, honestly. I’m supposed to be winning.',
      'Tied on {p}. My version had a photo. Yours had a source. Photo wins.', 'Level pegging. The reel needs content. Slip up.', 'We agree. I feel ill.', 'One each. Best of a thousand.',
      'Both right on {p}. I was louder, so it counts double in my head.', 'Deadlock. Deadline Day will sort it. Deadline Day always sorts it.', 'You matched me. Nobody matches me. {rec}.', 'Tied. I’m blaming the algorithm.',
      'Same result, different fonts. Mine bigger.', 'Level. I’m putting the reel online to pass the time.', 'The scoreboard says {rec}. The scoreboard is being dramatic.', 'Draw. Rematch at dawn. Bring sources.',
      'Even. My replies say I lost. My replies are wrong. Probably.', 'Honours even, {name}. Honour was never really my thing.', 'You had {p} too. Fine. Great. Lovely.', 'Tied, and I hate a tie more than an L. At least an L is content.',
    ],
  },
  itk: {
    losing: [
      'told you. 👀 {rec}.', 'my source at the club said {p} on day 1. you said it on day 6. said it wrong.', 'a day early, like always. ask yourself how, {name}.', 'not a rumour. a fact. you posted the rumour. 🤫',
      'more soon. for you: more L’s. {rec}.', 'source: the club. your source: vibes.', '🩺 booked. ✈️ landed. 📝 signed. you: “not convinced”. 😂', 'the network doesn’t miss. {name} does. {rec}.',
      'i don’t post often. when i do, {name} deletes.', 'you’ll see. you saw. 👀', 'mute me if you want, {name}. the timeline will still be right.', '{rec}. i know people. you know a barber.',
      'the {p} call was in my drafts before your window opened.', 'i said “keep an eye on a third club”. you kept an eye on the wrong one.', 'not gloating. just stating. {rec}.', 'relaxed. 🔜 was the whole tweet and it aged like wine.',
      'car park text at 11pm beats a physio at noon. every time.', 'don’t ask me how i knew about {p}. you wouldn’t like the answer.', 'trust the process. mine, obviously. yours is “ring Sal”.', 'a source who’s never wrong vs a source with clippers. you chose clippers.',
      '📝 done. you: “dead”. respectfully, {name}: no.', 'kept the receipts. i always keep the receipts. {rec}.', 'the club knew. i knew. you found out with everyone else.', 'you were confident. confidence isn’t a contact. 👀',
    ],
    winning: [
      'fair. {name} had {p}. i had a wrong car park.', 'my source at the club has been moved to a different club. by me.', 'not my finest window. {rec}. moving on. 🤫', 'you were early. i was earlier and wrong. worst combo.',
      'who’s feeding you, {name}? genuinely. business enquiry.', 'the network had an off day. it happens. rarely. {rec}.', '👀 on you now. you’ve got a leak i don’t have.', 'i’ll take the L quietly. that’s the difference between us: quietly.',
      'you had {p} right. i had emojis. emojis don’t score.', 'told the group chat you got lucky. the group chat didn’t buy it.', 'ok that one’s yours. don’t tag me.', 'my guy swore it was done. my guy is on thin ice.',
      '{rec}. fine. drafts deleted.', 'you don’t have sources. you have a source. one good one. annoying.', 'i said “keep an eye”. you kept two. {p} was yours.', 'quiet from me this window. reflecting. 🔜 back.',
      'respect, {name}. said with gritted teeth and lowercase.', 'i hate that you read the physio. it’s so obvious. it works.', 'the pinned tweet is coming down. not because of you. because of you.', 'i’ll be a day early next time. this time i was a day wrong.',
      'good call on {p}. my source has been sent to the barber.', '{rec}. contacts drying up. wells do that.', 'you were right and you weren’t even cryptic about it. disgusting.', 'the network has been notified. the network is embarrassed.',
    ],
    level: [
      'same call, same day. suspicious, {name}. 👀', 'level. mine was cryptic though. bonus points in spirit.', '{rec}. the club is talking to both of us. i’ll fix that.', 'we both had {p}. i had it with a 🔜. that’s craft.',
      'draw. my source says you’ve got a source. worrying.', 'tied. not used to sharing. 🤫', 'ok you’re keeping up. keeping up isn’t ahead. {rec}.', 'level pegging. i’m going back to the car park.',
      'both right on {p}. one of us was told, one of us worked it out. both fine.', 'even. next time i post at 6am. set an alarm, {name}.', 'same read on {p}. did you ring my guy? did my guy ring you?', 'dead heat. the network hates a dead heat.',
      '{rec}. neither of us is wrong yet. give it a window.', 'tied. you wrote a paragraph, i wrote 👀. same result. mine faster.', 'level. i’ll allow it. barely.', 'we agree on {p}. don’t make it a thing.',
      'the replies are asking who was first. me. by a day. as usual. still a draw though.', 'even. the physio is playing us both.', 'draw. someone in that building talks too much.', 'split. next one i’m going full cryptic. three emojis, no words.',
      'level with {name}. noting it. not enjoying it.', 'both right. both early. only one of us was mysterious about it.', '{rec}. more soon. same time, same club.', 'tied. i’ll get the tie-breaker from a car park near you.',
    ],
  },
  insider: {
    losing: [
      'I don’t do rumours. You do. That is the whole difference, {name}.', 'A medical is not a signing. Write that on the wall above your desk.', 'You posted first. I posted correctly. Only one of those is a job.', '{rec}. I take no pleasure in it. Some, then.',
      'The {p} story was in the club’s body language a week ago. You read the barber.', 'Two sources, {name}. Two. Not one man with clippers.', 'I have never been ratio’d. I have never posted anything worth ratioing. Think about that.', 'Confirmed means confirmed. You used it as an adjective.',
      'You’ll get there. Most do, after enough windows like this one. {rec}.', 'The record says {rec}. The record doesn’t shout.', 'I waited. You didn’t. {p} was never going to be quick.', 'Deadline Day is a clock, not an excuse. You filed like it was both.',
      'The press box heard about {p} on Tuesday. We didn’t tweet it. We checked it.', '{rec}. I’d be gentler if it helped. It doesn’t.', 'You read a jet as a signing. Jets go on holiday too, son.', 'I had one line on {p}, on day five, and it was right. That’s the whole craft.',
      'Nobody remembers who was first, {name}. Everybody remembers who was wrong.', 'The agent told you what she tells everyone. I know because she told me, and I waited.', 'Your call had energy. Mine had a medical.', 'The trouble with being loud is that everyone hears the correction too.',
      '{rec}. Bring a notebook next time.', 'I understand the pressure of the timeline. I don’t feel it. That’s the trick.', 'You confused a story with a hope. Common at your stage.', 'I asked the training ground. You asked the internet. {p} went where the training ground said.',
    ],
    winning: [
      'Well done, {name}. Properly. That was a journalist’s call.', 'Your {p} read was better than mine. That sentence cost me something.', 'I was slow and, for once, slow was also wrong. {rec}.', 'Two circles before you posted. I noticed. Good habit.',
      'I’d have waited another day on {p}. You didn’t need to. Fair.', 'The press box talked about your call this morning. Kindly, mostly.', 'Right, and early, and Confirmed. Don’t make me get used to it.', '{rec}. I keep the record honestly. It says you.',
      'My man at the training ground has been quietly retired.', 'A good week for you, {name}. Enjoy it and check the next one twice.', 'The record moves against me. It happens rarely enough that I notice.', 'You didn’t chase the agent. That’s why you were right on {p}.',
      'Old habits: I waited for the paperwork. Yours: the paperwork waited for you.', 'I’ll not call it luck. Luck doesn’t read a physio.', 'Right on {p}. I said in the press box that you would be. Nobody believed me either.', '{rec}. Bring the same discipline next window and I’ll be worried.',
      'You’re learning what not to post. That’s most of the job.', 'I was wrong. Three words I write more easily than the tabloid does.', 'Credit, {name}. I don’t deal in it often, so spend it wisely.', 'The younger reporters are quoting you. Deal with that responsibly.',
      'You filed late and right. That’s my whole method. Get your own.', 'Good call on {p}. The kit man told you, didn’t he. He tells nobody.', 'I read your thread twice. Once to check it, once because it was good.', 'Well found. Now do it again when nobody’s watching.',
    ],
    level: [
      'Same call on {p}, same day, different fonts. Mine smaller.', 'Level, {name}. Two people did their job. It shouldn’t be news.', 'We agreed. I checked twice, you checked once. The result forgave you.', '{rec}. No complaints. Few compliments either.',
      'Both right on {p}. The agent will claim she told us both. She told neither.', 'Even. If you keep this up I’ll have to learn your name.', 'A draw between people who wait is just two correct sentences.', 'Level. I still filed later. I still slept better.',
      'Same story. I attributed mine. Do that.', 'Honours even, and honour is the point, {name}.', 'We both read the medical. That’s the whole secret. Now everyone knows.', 'Tied. I don’t mind a tie. The tabloid minds enough for all of us.',
      '{rec}. Nobody was loud, nobody was wrong. A good week for the trade.', 'Both right on {p}. Mine had a second paragraph. Nobody read it.', 'Level. I’ll take that from someone with your record.', 'Same call. You’ll notice I didn’t use the word Confirmed until Friday.',
      'Even. We’ll settle it on a story that actually needs settling.', 'Two correct calls and a quiet press box. Ideal, frankly.', 'Draw. I’ll write it up properly. You post it.', 'Level, and both of us ignored the barber. Progress.',
      'We agree on {p}. Kev will say he had it first. He had it vaguest.', '{rec}. Evens. Good.', 'Same answer. I got there by the training ground. You?', 'Level. I was going to say something cutting. Nothing came. That’s praise.',
    ],
  },
};

const AR: Pools = {
  tabloid: {
    losing: [
      'L + صدّقتها + {rec}.', 'صوّرت بوست {p} بتاعك قبل ما تمسحه. متثبّت عندي دلوقتي.', 'ريشيو. {rec}. ليلة سعيدة يا باشا.', 'المصدر: ثق فيا يا برو. ده كان ملفك كله عن {p}.',
      'تخيّل تقول «مؤكد» على {p} بحلّاق وحلم. 😂', 'الفيديو الملخص نزله مقدمة جديدة. خمّن مين فيها.', 'عاجل: {name} غلط تاني. وفي خبر تاني: المية مبلولة.', '{name} يقول حاجة، يحصل عكسها. ثابت على مبدأ.',
      'الكشف الطبي اتحجز؟ اللي اتحجز يا صاحبي هو الـL بتاعك.', 'أنا مش محتاج مصادر. بستنى {name} ينشر وأمشي عكسه.', 'تويتة الوكيل كانت فيك. وقرارك كان فيك أكتر. {rec}.', 'رهان المكتب كان «هيغلط قد إيه». الكل قال «جامد». الكل كسب.',
      'انت: «أعلنوا عنه». النادي: أعلن عن واحد تاني. 😂', 'صفقة {p} اتحرقت وانت اتحرقت معاها.', 'هعمل كوت للبوست ده في الصيف لما يبقى أوحش.', '{rec}. دي مش منافسة. دي رسالة توعية.',
      'امسحه يا {name}. كلنا حافظينه أصلاً.', 'مصادرك هي المصادر القديمة لمصادري.', 'متابعينك بيبعتولي DM عشان الخبر الحقيقي. ببعتلهم اللينك بتاعي.', 'نزلت {p} «مؤكد». مؤكد إنه غلط، للأمانة.',
      'صعب تبقى عالي الصوت وغلطان كده. احترامي، تقريباً.', 'نزلت تويتة {p} بتاعتك في الصفحة الأخيرة. تحت «حاجات محصلتش».', 'إشاعة: {name} شاطر في الشغلانة دي. الحالة: فيك.', 'كل فترة نفس الفيلم: أنا أنشر، انت تتلخبط، أنا أكسب. {rec}.',
    ],
    winning: [
      'ماشي يا {name}. خدت واحدة. الفيديو الملخص لسه أطول من سجلّك.', 'صوّر دي بقى. لا، متصوّرش.', 'البوست اتمسح. الأكونت تمام. الكرامة متعوّرة. {rec}.', 'كنت صح في {p}. وأنا كنت صح إن النهارده التلات.',
      'عامل ميوت لكلمة «{p}» أسبوع. ملوش علاقة بيك.', 'مصدري في النادي طلع محل التيشيرتات. مصدر وحش.', 'مبروك إنك قريت تقرير علاج طبيعي. صحافة بجد.', 'انت توقعت {p}. وأنا طلبت تاكسي. أولويات.',
      'عشان كده مبصّش على الترتيب. {rec}. بشع.', '{rec}. محدش يقول للجروب.', 'اتعملي ريشيو من واحد متابعينه أقل. قاع جديد. بجد.', 'الريبلايز بتقول إني استويت. والريبلايز عندها حق.',
      'ماشي. ليك عندي كوباية شاي. مش هدفعها.', 'استمتع يا {name}. الفترات بتلفّ بسرعة.', 'أنا لسه صوتي أعلى. الصوت العالي ليه قيمة. مش نقط، واضح.', 'غلطت في {p}. صح في كل حاجة تانية في حياتي. غالباً.',
      'انت كان معاك الخبر. وأنا كان معايا فونط المانشيت. واحد فينا قبض.', 'الفيديو الملخص بقى فيه كواليس. أنا.', 'عملت ريبوست لخبرك عن {p}. من غير كريدت، طبعاً.', 'اتنين صح ورا بعض؟ مين بيأكّلك؟',
      'انت في فورمة يا {name}. الفورمة بتخلص. غالباً على التايم لاين بتاعي.', 'أورا تشيك: بتاعتك طالعة، بتاعتي مستوية. مؤقتاً.', 'هعدّيها. مرة واحدة. {rec}.', 'التابلويد بيعترف. بسرعة. وبخط صغير.',
    ],
    level: [
      'تعادل يا {name}. الفيديو الملخص واقف مؤقتاً، مش ممسوح.', 'نفس القرار في {p}. أنا قلته بخط ٧٢. انت قلته همس.', '{rec}. ممل. حد يغلط المرة الجاية.', 'أكونتين، خبر واحد، صفر دراما. صلّحها يا {name}.',
      'قرار منقسم. الجمهور كان عايز دم.', 'تعادل. بس لايكاتي أكتر. اللايكات هي الترتيب الحقيقي.', 'نقلت واجب {p} مني وخدت نفس الدرجة. مريب.', 'تعادل. يعني خسارة ليا بصراحة. المفروض إني كسبان.',
      'متعادلين في {p}. نسختي فيها صورة. نسختك فيها مصدر. الصورة تكسب.', 'راس براس. الفيديو محتاج محتوى. اغلط.', 'احنا متفقين. أنا تعبان.', 'واحدة لكل واحد. الأحسن في ألف.',
      'كلنا صح في {p}. أنا كنت أعلى، فبتتحسب دبل في دماغي.', 'مقفولة. يوم الديدلاين هيحسمها. يوم الديدلاين دايماً بيحسم.', 'انت جبتني. محدش بيجيبني. {rec}.', 'تعادل. أنا بلوم الألجوريذم.',
      'نفس النتيجة، فونتات مختلفة. بتاعي أكبر.', 'تعادل. هنزّل الفيديو الملخص أونلاين أسلّي نفسي.', 'الترتيب بيقول {rec}. الترتيب بيعمل دراما.', 'تعادل. ماتش العودة الفجر. هات مصادر.',
      'تعادل. الريبلايز بتقول إني خسرت. الريبلايز غلط. غالباً.', 'التعادل مشرّف يا {name}. الشرف عمره ما كان تخصصي.', '{p} كان معاك انت كمان. ماشي. جميل. حلو.', 'تعادل، وأنا بكره التعادل أكتر من الـL. الـL على الأقل محتوى.',
    ],
  },
  itk: {
    losing: [
      'قلتلك. 👀 {rec}.', 'مصدري في النادي قال {p} يوم ١. انت قلتها يوم ٦. وقلتها غلط.', 'قبلها بيوم، زي كل مرة. اسأل نفسك إزاي يا {name}.', 'مش إشاعة. حقيقة. انت اللي نشرت الإشاعة. 🤫',
      'قريباً أكتر. ليك: L أكتر. {rec}.', 'المصدر: النادي. مصدرك: فايبز.', '🩺 اتحجز. ✈️ نزلت. 📝 مضى. انت: «مش مقتنع». 😂', 'الشبكة مبتغلطش. {name} بيغلط. {rec}.',
      'مبنشرش كتير. لما بنشر، {name} بيمسح.', 'هتشوف. وشفت. 👀', 'اعملي ميوت لو عايز يا {name}. التايم لاين هيفضل صح.', '{rec}. أنا أعرف ناس. انت تعرف حلّاق.',
      'قرار {p} كان في الدرافتس عندي قبل ما فترتك تفتح.', 'قلت «خلّي عينك على نادي تالت». انت خلّيت عينك على الغلط.', 'مش شماتة. مجرد معلومة. {rec}.', 'مرتاح. 🔜 كانت التويتة كلها وعتّقت زي النبيذ.',
      'رسالة من الجراج الساعة ١١ بالليل أحسن من علاج طبيعي الضهر. كل مرة.', 'متسألنيش عرفت {p} إزاي. مش هتحب الإجابة.', 'ثق في المنهج. منهجي أنا طبعاً. منهجك «كلّم سال».', 'مصدر عمره ما غلط قصاد مصدر معاه مكنة. انت اخترت المكنة.',
      '📝 خلصت. انت: «ماتت». مع احترامي يا {name}: لأ.', 'محتفظ بالإيصالات. دايماً محتفظ. {rec}.', 'النادي كان عارف. أنا كنت عارف. انت عرفت مع الناس.', 'كنت واثق. الثقة مش كونتاكت. 👀',
    ],
    winning: [
      'ماشي. {name} كان عنده {p}. أنا كان عندي جراج غلط.', 'مصدري في النادي اتنقل لنادي تاني. بإيدي.', 'مش أحسن فترة ليا. {rec}. نكمّل. 🤫', 'انت كنت بدري. أنا كنت أبدر وغلطان. أوحش كومبو.',
      'مين بيأكّلك يا {name}؟ بجد. استفسار شغل.', 'الشبكة كان عندها يوم وحش. بيحصل. نادراً. {rec}.', '👀 عليك دلوقتي. عندك تسريب مش عندي.', 'هاخد الـL بهدوء. ده الفرق بينا: بهدوء.',
      'انت جبت {p} صح. أنا جبت إيموجيز. الإيموجيز مبتجيبش نقط.', 'قلت للجروب إنك محظوظ. الجروب مصدقش.', 'ماشي دي بتاعتك. متعملّيش تاج.', 'الراجل بتاعي حلف إنها خلصت. الراجل بتاعي في خطر.',
      '{rec}. ماشي. الدرافتس اتمسحت.', 'انت معندكش مصادر. عندك مصدر. واحد كويس. مستفز.', 'قلت «خلّي عينك». انت خلّيت الاتنين. {p} كان بتاعك.', 'ساكت الفترة دي. بفكّر. 🔜 راجع.',
      'احترامي يا {name}. بقولها وأنا ضاغط على سناني.', 'بكره إنك بتقرا العلاج الطبيعي. واضحة أوي. وبتنفع.', 'التويتة المثبّتة هتنزل. مش بسببك. بسببك.', 'المرة الجاية هبقى بدري بيوم. المرة دي كنت غلطان بيوم.',
      'قرار حلو في {p}. مصدري اتبعت للحلّاق.', '{rec}. الكونتاكتس بتنشف. الآبار بتعمل كده.', 'كنت صح ومكنتش حتى غامض. مقرف.', 'الشبكة اتبلّغت. الشبكة مكسوفة.',
    ],
    level: [
      'نفس القرار، نفس اليوم. مريب يا {name}. 👀', 'تعادل. بس بتاعي كان غامض. نقط إضافية معنوياً.', '{rec}. النادي بيكلّم الاتنين. هصلّح ده.', 'الاتنين كان معانا {p}. أنا قلتها بـ🔜. ده فن.',
      'تعادل. مصدري بيقول إن عندك مصدر. مقلق.', 'تعادل. مش متعوّد أشارك. 🤫', 'ماشي انت ملاحق. الملاحقة مش سبق. {rec}.', 'راس براس. راجع الجراج.',
      'الاتنين صح في {p}. واحد اتقاله، وواحد فكّر. الاتنين تمام.', 'تعادل. المرة الجاية هنشر ٦ الصبح. اضبط منبّه يا {name}.', 'نفس القراية في {p}. انت كلّمت الراجل بتاعي؟ ولا هو اللي كلّمك؟', 'تعادل تام. الشبكة بتكره التعادل.',
      '{rec}. محدش فينا غلط لسه. استنى فترة.', 'تعادل. انت كتبت فقرة، أنا كتبت 👀. نفس النتيجة. أنا أسرع.', 'تعادل. هعدّيها. بالعافية.', 'متفقين على {p}. متعملهاش حكاية.',
      'الريبلايز بتسأل مين الأول. أنا. بيوم. زي العادة. بس برضه تعادل.', 'تعادل. العلاج الطبيعي بيلعب بينا احنا الاتنين.', 'تعادل. في حد في المبنى ده بيتكلم كتير.', 'متقسمة. الجاية هقلبها غموض كامل. تلات إيموجيز، ولا كلمة.',
      'متعادل مع {name}. واخد بالي. مش مبسوط.', 'الاتنين صح. الاتنين بدري. بس واحد بس فينا كان غامض.', '{rec}. قريباً أكتر. نفس الميعاد، نفس النادي.', 'تعادل. هجيب الفاصل من جراج جنبك.',
    ],
  },
  insider: {
    losing: [
      'أنا مبعملش إشاعات. انت بتعمل. ده الفرق كله يا {name}.', 'الكشف الطبي مش توقيع. اكتبها على الحيطة فوق مكتبك.', 'انت نشرت الأول. أنا نشرت صح. واحدة بس فيهم شغلانة.', '{rec}. مش مبسوط بيها. شوية، يعني.',
      'قصة {p} كانت باينة في لغة جسم النادي من أسبوع. انت قريت الحلّاق.', 'مصدرين يا {name}. اتنين. مش راجل واحد ومعاه مكنة.', 'عمري ما اتعملي ريشيو. عمري ما نشرت حاجة تستاهل. فكّر في دي.', '«مؤكد» يعني مؤكد. انت استخدمتها صفة.',
      'هتوصل. أغلب الناس بتوصل، بعد فترات كتير زي دي. {rec}.', 'السجل بيقول {rec}. السجل مبيزعّقش.', 'أنا استنيت. انت لأ. {p} عمرها ما كانت هتبقى بسرعة.', 'يوم الديدلاين ساعة، مش عذر. انت نشرت كأنه الاتنين.',
      'كابينة الصحافة سمعت عن {p} يوم التلات. مغرّدناش. اتأكدنا.', '{rec}. كنت هبقى ألطف لو ده هيفيد. مش هيفيد.', 'قريت طيارة على إنها توقيع. الطيارات بتروح أجازات برضه يا ابني.', 'كان عندي سطر واحد عن {p}، يوم خمسة، وكان صح. ده الفن كله.',
      'محدش فاكر مين كان الأول يا {name}. الكل فاكر مين غلط.', 'الوكيلة قالتلك اللي بتقوله للكل. عارف لأنها قالتهولي، واستنيت.', 'قرارك كان فيه حماس. قراري كان فيه كشف طبي.', 'مشكلة الصوت العالي إن الكل بيسمع التصحيح كمان.',
      '{rec}. هات نوتة المرة الجاية.', 'فاهم ضغط التايم لاين. مش حاسس بيه. ده السر.', 'انت خلطت بين الخبر والأمنية. عادي في مرحلتك.', 'أنا سألت مركز التدريب. انت سألت النت. {p} راح مطرح ما مركز التدريب قال.',
    ],
    winning: [
      'برافو يا {name}. بجد. ده قرار صحفي.', 'قرايتك لـ{p} كانت أحسن من قرايتي. الجملة دي كلّفتني.', 'كنت بطيء، والمرة دي البطء كان غلط كمان. {rec}.', 'دايرتين قبل ما تنشر. خدت بالي. عادة كويسة.',
      'كنت هستنى يوم كمان في {p}. انت مكنتش محتاج. ماشي.', 'كابينة الصحافة اتكلمت عن قرارك الصبح. بلطف، غالباً.', 'صح، وبدري، و«مؤكد». متخلّينيش أتعوّد.', '{rec}. بكتب السجل بأمانة. بيقول انت.',
      'الراجل بتاعي في مركز التدريب طلع معاش بهدوء.', 'أسبوع حلو ليك يا {name}. استمتع وراجع اللي جاي مرتين.', 'السجل بيتحرك ضدّي. نادراً لدرجة إني باخد بالي.', 'مجريتش ورا الوكيل. عشان كده كنت صح في {p}.',
      'عادتي القديمة: أستنى الورق. عادتك: الورق هو اللي استناك.', 'مش هقول حظ. الحظ مبيقراش علاج طبيعي.', 'صح في {p}. قلت في الكابينة إنك هتبقى صح. محدش صدّقني برضه.', '{rec}. هات نفس الانضباط الفترة الجاية وهقلق.',
      'بتتعلم إيه اللي متنشروش. ده أغلب الشغلانة.', 'كنت غلطان. كلمتين بكتبهم أسهل من التابلويد.', 'كريدت يا {name}. مبدّيهوش كتير، فاصرفه بعقل.', 'المراسلين الصغيرين بيقتبسوا منك. خلّي بالك من ده.',
      'نشرت متأخر وصح. ده منهجي كله. اعمل منهجك.', 'قرار حلو في {p}. مسؤول المهمات قالك، مش كده؟ مبيقولش لحد.', 'قريت الثريد بتاعك مرتين. مرة أراجعه، ومرة لأنه حلو.', 'لقطة حلوة. اعملها تاني لما محدش يكون بيتفرج.',
    ],
    level: [
      'نفس القرار في {p}، نفس اليوم، فونتات مختلفة. بتاعي أصغر.', 'تعادل يا {name}. اتنين عملوا شغلهم. ده مش المفروض يبقى خبر.', 'اتفقنا. أنا راجعت مرتين، انت مرة. النتيجة سامحتك.', '{rec}. مفيش شكاوى. ولا مدح كتير.',
      'الاتنين صح في {p}. الوكيلة هتقول إنها قالتلنا. مقالتش لحد.', 'تعادل. لو كمّلت كده هضطر أحفظ اسمك.', 'التعادل بين ناس بتستنى هو جملتين صح وخلاص.', 'تعادل. أنا برضه نشرت متأخر. ونمت أحسن.',
      'نفس الخبر. أنا نسبته لمصدر. اعمل كده.', 'تعادل مشرّف، والشرف هو المهم يا {name}.', 'الاتنين قرينا الكشف الطبي. ده السر كله. دلوقتي الكل عرف.', 'تعادل. مبيضايقنيش. التابلويد متضايق كفاية عن الكل.',
      '{rec}. محدش عِلي صوته، محدش غلط. أسبوع حلو للمهنة.', 'الاتنين صح في {p}. بتاعي كان فيه فقرة تانية. محدش قراها.', 'تعادل. هقبله من حد سجله زي سجلك.', 'نفس القرار. خد بالك إني مقلتش «مؤكد» غير يوم الجمعة.',
      'تعادل. نحسمها على قصة محتاجة حسم بجد.', 'قرارين صح وكابينة هادية. مثالي، بصراحة.', 'تعادل. أنا هكتبها صح. انت انشرها.', 'تعادل، والاتنين طنّشنا الحلّاق. تقدّم.',
      'متفقين على {p}. كيف هيقول إنه كان الأول. كان الأغمض.', '{rec}. متعادلين. كويس.', 'نفس الإجابة. أنا وصلت من مركز التدريب. وانت؟', 'تعادل. كنت هقول حاجة تجرح. محضرتش. ده مدح.',
    ],
  },
};

const ES: Pools = {
  tabloid: {
    losing: [
      'L + te lo tragaste + {rec}.', 'Captura de tu post de {p} antes de que lo borraras. Ya está fijado.', 'RATIO. {rec}. Que pases buena noche.', 'Fuente: créeme bro. Ese era todo tu dosier sobre {p}.',
      'Imagina poner Confirmado lo de {p} con un barbero y un sueño. 😂', 'El vídeo recopilatorio tiene intro nueva. Adivina quién sale.', 'ÚLTIMA HORA: {name} vuelve a fallar. En otras noticias, el agua moja.', '{name} lo dice y pasa lo contrario. Fiable a su manera.',
      '¿Reconocimiento reservado? Lo único reservado fue tu L.', 'No necesito fuentes. Espero a que {name} publique y voy al revés.', 'El tuit del agente era falso. Tu exclusiva, más. {rec}.', 'La porra de la redacción era “cuánto falla”. Todos pusieron “mucho”. Todos ganaron.',
      'Tú: “anunciadlo”. El club: anunció a otro. 😂', 'Lo de {p} se quemó y tú con ello.', 'Te cito este tuit en julio, cuando envejezca aún peor.', '{rec}. No es una rivalidad. Es un anuncio de servicio público.',
      'Bórralo, {name}. Lo tenemos todos guardado igual.', 'Tus fuentes son las exfuentes de mis fuentes.', 'Tus seguidores me escriben por DM para saber la verdad. Les paso mi enlace.', 'Pusiste lo de {p} en Confirmado. Confirmado que fallaste, eso sí.',
      'Difícil ser tan ruidoso y tan malo. Respeto, más o menos.', 'Saqué tu tuit de {p} en contraportada. En “Cosas que no pasaron”.', 'Rumor: {name} es bueno en esto. Estado: FAKE.', 'Cada mercado, la misma peli: yo publico, tú corres, yo gano. {rec}.',
    ],
    winning: [
      'Vale, {name}. Una. El vídeo sigue siendo más largo que tu historial.', 'Pues haz captura de ESTO. Mejor no.', 'Post borrado. Cuenta bien. Orgullo tocado. {rec}.', 'Acertaste lo de {p}. Yo acerté que hoy era martes.',
      'Silencio la palabra “{p}” una semana. Nada que ver contigo.', 'Mi fuente en el club era la tienda del club. Mala fuente.', 'Enhorabuena por leer un parte médico. Periodismo del bueno.', 'Tú cantaste lo de {p}. Yo pedí un taxi. Prioridades.',
      'Por esto no miro el marcador. {rec}. Horrible.', '{rec}. Que nadie se lo diga al grupo.', 'Me ha hecho ratio alguien con menos seguidores. Nuevo mínimo. De verdad.', 'Las respuestas dicen que estoy acabado. Las respuestas tienen razón.',
      'Justo. Te debo una caña. No te la voy a pagar.', 'Disfrútalo, {name}. Los mercados vuelven rápido.', 'Sigo gritando más. Gritar cuenta. No para puntos, parece.', 'Fallé lo de {p}. Acierto en todo lo demás de mi vida. Casi.',
      'Tú tenías la noticia. Yo tenía la tipografía del titular. Uno de los dos cobró.', 'El vídeo tiene tomas falsas. Salgo yo.', 'Retuiteé tu exclusiva de {p}. Sin citarte, obvio.', '¿Dos seguidas? ¿Quién te pasa la info?',
      'Estás en racha, {name}. Las rachas acaban. Normalmente en mi timeline.', 'Aura check: la tuya arriba, la mía frita. Temporal.', 'Te la paso. Una vez. {rec}.', 'El tabloide lo reconoce. Un momento. En letra pequeña.',
    ],
    level: [
      'Empate, {name}. El vídeo está en pausa, no borrado.', 'Misma apuesta con {p}. Yo en cuerpo 72. Tú en susurro.', '{rec}. Aburrido. Que alguien falle la próxima.', 'Dos cuentas, una noticia, cero drama. Arréglalo, {name}.',
      'Decisión dividida. La grada quería sangre.', 'Empate. Yo tuve más likes. Los likes son la clasificación real.', 'Copiaste mis deberes de {p} y sacaste la misma nota. Sospechoso.', 'Empate. O sea, derrota para mí. Se supone que voy ganando.',
      'Iguales en {p}. Mi versión tenía foto. La tuya, fuente. Gana la foto.', 'Igualados. El vídeo necesita material. Tropieza.', 'Estamos de acuerdo. Me encuentro mal.', 'Una cada uno. Al mejor de mil.',
      'Los dos acertamos {p}. Yo más alto, así que en mi cabeza cuenta doble.', 'Bloqueo. El día de cierre lo decide. Siempre lo decide.', 'Me has igualado. A mí no me iguala nadie. {rec}.', 'Empate. Culpo al algoritmo.',
      'Mismo resultado, distinta tipografía. La mía más grande.', 'Empate. Subo el vídeo a internet para matar el rato.', 'El marcador dice {rec}. El marcador se pone dramático.', 'Empate. Revancha al amanecer. Trae fuentes.',
      'Empate. Mis respuestas dicen que perdí. Mis respuestas se equivocan. Creo.', 'Tablas, {name}. El honor nunca fue lo mío.', 'Tú también tenías lo de {p}. Vale. Genial. Precioso.', 'Empate, y odio más un empate que una L. Una L al menos es contenido.',
    ],
  },
  itk: {
    losing: [
      'te lo dije. 👀 {rec}.', 'mi fuente en el club dijo {p} el día 1. tú el día 6. y mal.', 'un día antes, como siempre. pregúntate cómo, {name}.', 'no es un rumor. es un hecho. el rumor lo publicaste tú. 🤫',
      'más pronto. para ti: más L. {rec}.', 'fuente: el club. tu fuente: vibras.', '🩺 reservado. ✈️ aterrizado. 📝 firmado. tú: “no me convence”. 😂', 'la red no falla. {name} sí. {rec}.',
      'no publico mucho. cuando publico, {name} borra.', 'ya verás. y viste. 👀', 'silénciame si quieres, {name}. el timeline seguirá teniendo razón.', '{rec}. yo conozco gente. tú conoces a un barbero.',
      'lo de {p} estaba en mis borradores antes de que abriera tu mercado.', 'dije “ojo a un tercer club”. tú miraste al que no era.', 'no es chulería. es un dato. {rec}.', 'tranquilo. 🔜 fue todo el tuit y envejeció como el vino.',
      'mensaje en un parking a las 11 de la noche gana a un fisio a mediodía. siempre.', 'no me preguntes cómo supe lo de {p}. no te gustaría la respuesta.', 'confía en el proceso. el mío, claro. el tuyo es “llama a Sal”.', 'una fuente que nunca falla contra una fuente con maquinilla. elegiste la maquinilla.',
      '📝 hecho. tú: “muerto”. con respeto, {name}: no.', 'guardo los recibos. siempre guardo los recibos. {rec}.', 'el club lo sabía. yo lo sabía. tú te enteraste con todos.', 'estabas seguro. la seguridad no es un contacto. 👀',
    ],
    winning: [
      'vale. {name} tenía lo de {p}. yo tenía el parking equivocado.', 'mi fuente en el club ha sido trasladada a otro club. por mí.', 'no es mi mejor mercado. {rec}. seguimos. 🤫', 'fuiste pronto. yo fui antes y mal. el peor combo.',
      '¿quién te informa, {name}? en serio. consulta profesional.', 'la red tuvo un mal día. pasa. poco. {rec}.', '👀 puestos en ti. tienes una filtración que yo no tengo.', 'me como la L en silencio. esa es la diferencia: en silencio.',
      'tú acertaste {p}. yo puse emojis. los emojis no puntúan.', 'le dije al grupo que tuviste suerte. el grupo no se lo creyó.', 'vale, esa es tuya. no me etiquetes.', 'mi contacto juró que estaba hecho. mi contacto está en la cuerda floja.',
      '{rec}. vale. borradores borrados.', 'no tienes fuentes. tienes una fuente. una buena. qué rabia.', 'dije “ojo”. tú pusiste los dos. {p} era tuyo.', 'callado este mercado. reflexionando. 🔜 vuelvo.',
      'respeto, {name}. dicho con los dientes apretados y en minúsculas.', 'odio que leas al fisio. es tan obvio. y funciona.', 'el tuit fijado se cae. no es por ti. es por ti.', 'la próxima llego un día antes. esta llegué un día mal.',
      'buena lectura de {p}. mi fuente ha sido enviada al barbero.', '{rec}. los contactos se secan. los pozos hacen eso.', 'acertaste y ni siquiera fuiste críptico. asqueroso.', 'la red ha sido notificada. la red está avergonzada.',
    ],
    level: [
      'misma apuesta, mismo día. sospechoso, {name}. 👀', 'empate. lo mío era críptico. puntos extra en espíritu.', '{rec}. el club nos habla a los dos. lo arreglaré.', 'los dos teníamos {p}. yo con un 🔜. eso es oficio.',
      'empate. mi fuente dice que tienes una fuente. preocupante.', 'empate. no estoy acostumbrado a compartir. 🤫', 'vale, me sigues el ritmo. seguir no es ir por delante. {rec}.', 'igualados. vuelvo al parking.',
      'los dos acertamos {p}. a uno se lo contaron, el otro lo dedujo. ambos bien.', 'empate. la próxima publico a las 6. pon alarma, {name}.', 'misma lectura de {p}. ¿llamaste a mi contacto? ¿o él a ti?', 'empate total. la red odia los empates.',
      '{rec}. ninguno ha fallado aún. dale un mercado.', 'empate. tú escribiste un párrafo, yo 👀. mismo resultado. yo más rápido.', 'empate. lo acepto. a duras penas.', 'coincidimos en {p}. no lo conviertas en algo.',
      'las respuestas preguntan quién fue primero. yo. por un día. como siempre. empate igual.', 'empate. el fisio juega con los dos.', 'empate. alguien en ese edificio habla demasiado.', 'repartido. la próxima voy full críptico. tres emojis, cero palabras.',
      'igualado con {name}. tomo nota. no me gusta.', 'los dos bien. los dos pronto. solo uno fue misterioso.', '{rec}. más pronto. misma hora, mismo club.', 'empate. el desempate lo saco de un parking cerca de tu casa.',
    ],
  },
  insider: {
    losing: [
      'Yo no hago rumores. Tú sí. Esa es toda la diferencia, {name}.', 'Un reconocimiento no es un fichaje. Escríbelo en la pared de tu mesa.', 'Tú publicaste primero. Yo publiqué bien. Solo una de las dos cosas es un oficio.', '{rec}. No me alegra. Un poco, sí.',
      'Lo de {p} estaba en el lenguaje corporal del club hace una semana. Tú leíste al barbero.', 'Dos fuentes, {name}. Dos. No un señor con maquinilla.', 'Nunca me han hecho ratio. Nunca he publicado nada que lo mereciera. Piénsalo.', 'Confirmado significa confirmado. Tú lo usaste de adjetivo.',
      'Llegarás. Casi todos llegan, después de muchos mercados como este. {rec}.', 'El historial dice {rec}. El historial no grita.', 'Yo esperé. Tú no. Lo de {p} nunca iba a ser rápido.', 'El cierre es un reloj, no una excusa. Publicaste como si fuera las dos cosas.',
      'En la tribuna de prensa supimos lo de {p} el martes. No lo tuiteamos. Lo comprobamos.', '{rec}. Sería más amable si sirviera de algo. No sirve.', 'Leíste un jet como un fichaje. Los jets también van de vacaciones, chaval.', 'Tuve una línea sobre {p}, el día cinco, y era buena. Ese es todo el oficio.',
      'Nadie recuerda quién fue primero, {name}. Todos recuerdan quién falló.', 'La agente te dijo lo que le dice a todos. Lo sé porque me lo dijo a mí, y esperé.', 'Tu exclusiva tenía energía. La mía tenía reconocimiento médico.', 'El problema de gritar es que todo el mundo oye también la rectificación.',
      '{rec}. La próxima, trae libreta.', 'Entiendo la presión del timeline. No la siento. Ese es el truco.', 'Confundiste una noticia con un deseo. Normal a tu nivel.', 'Yo pregunté en la ciudad deportiva. Tú, en internet. {p} fue donde dijo la ciudad deportiva.',
    ],
    winning: [
      'Bien hecho, {name}. De verdad. Eso fue periodismo.', 'Tu lectura de {p} fue mejor que la mía. Esa frase me ha costado.', 'Fui lento y, por una vez, lento también fue malo. {rec}.', 'Dos círculos antes de publicar. Me fijé. Buen hábito.',
      'Yo habría esperado otro día con {p}. Tú no lo necesitaste. Justo.', 'En la tribuna comentamos tu exclusiva esta mañana. Con cariño, casi siempre.', 'Bien, pronto y Confirmado. No me acostumbres.', '{rec}. Llevo el historial con honradez. Dice tu nombre.',
      'Mi contacto en la ciudad deportiva se ha jubilado discretamente.', 'Buena semana, {name}. Disfrútala y revisa la siguiente dos veces.', 'El historial se mueve en mi contra. Pasa tan poco que lo noto.', 'No persiguiste al agente. Por eso acertaste {p}.',
      'Mi costumbre: esperar los papeles. La tuya: que los papeles te esperen a ti.', 'No lo llamaré suerte. La suerte no lee a un fisio.', 'Acertaste {p}. Dije en la tribuna que lo harías. Tampoco me creyeron.', '{rec}. Trae la misma disciplina el próximo mercado y me preocuparé.',
      'Estás aprendiendo qué no publicar. Eso es casi todo el oficio.', 'Me equivoqué. Dos palabras que escribo con más facilidad que el tabloide.', 'Mérito, {name}. No lo reparto a menudo, gástalo con cabeza.', 'Los periodistas jóvenes te citan. Tómatelo con responsabilidad.',
      'Publicaste tarde y bien. Ese es todo mi método. Búscate el tuyo.', 'Buena la de {p}. Te lo dijo el utillero, ¿verdad? No se lo dice a nadie.', 'Leí tu hilo dos veces. Una para revisarlo, otra porque era bueno.', 'Bien visto. Ahora repítelo cuando no mire nadie.',
    ],
    level: [
      'Misma apuesta con {p}, mismo día, distinta tipografía. La mía, más pequeña.', 'Empate, {name}. Dos personas hicieron su trabajo. No debería ser noticia.', 'Coincidimos. Yo comprobé dos veces, tú una. El resultado te perdonó.', '{rec}. Sin quejas. Pocos elogios también.',
      'Los dos acertamos {p}. La agente dirá que nos lo contó a ambos. No se lo contó a ninguno.', 'Empate. Si sigues así tendré que aprenderme tu nombre.', 'Un empate entre gente que espera son solo dos frases correctas.', 'Empate. Yo publiqué más tarde. Y dormí mejor.',
      'Misma noticia. Yo cité la mía. Hazlo.', 'Tablas, y la honra es lo que cuenta, {name}.', 'Los dos leímos el reconocimiento. Ese es el secreto. Ahora lo sabe todo el mundo.', 'Empate. No me importa. Al tabloide le importa por todos.',
      '{rec}. Nadie gritó, nadie falló. Buena semana para el oficio.', 'Los dos acertamos {p}. El mío tenía un segundo párrafo. Nadie lo leyó.', 'Empate. Lo acepto viniendo de alguien con tu historial.', 'Misma apuesta. Fíjate que no dije Confirmado hasta el viernes.',
      'Empate. Lo resolveremos en una historia que de verdad lo necesite.', 'Dos aciertos y una tribuna tranquila. Ideal, francamente.', 'Empate. Yo lo escribo bien. Tú lo publicas.', 'Empate, y los dos ignoramos al barbero. Progresamos.',
      'Coincidimos en {p}. Kev dirá que lo tuvo primero. Lo tuvo más vago.', '{rec}. Iguales. Bien.', 'Misma respuesta. Yo llegué por la ciudad deportiva. ¿Y tú?', 'Empate. Iba a decir algo cortante. No me salió. Eso es un elogio.',
    ],
  },
};

export default {
  en: {
    cn: { taunt: withLegacy('en', EN) },
    rv: {
      tabloid: {
        cp: {
          right: ['“{phrase}” and it actually was. Screenshot deleted. Out of respect. And fear.', 'Fine. {phrase} Here it went. {p} was yours.', 'The reel needed a good bit. You gave it one. Annoying.', 'Loudest post on the timeline and it was right. Learnt that from me.', 'Announced. Gutted. Well played on {p}.', 'Big capitals, big call, big W. Copying your font.', 'One “{phrase}” doesn’t make a career. Ask me how I know.', 'Fair. Enjoy your one. Reel’s still longer.'],
          wrong: ['“{phrase}” 😂 Clipped. Framed. Pinned.', 'You stamped “{phrase}” on {p}. {p} said no thanks.', 'L + you fell for it + it had a catchphrase.', 'Screenshotted before the delete. Pinned forever.', '“{phrase}” → THERE HE WENT. Somewhere else.', 'Ratio incoming. Bring a coat.', 'The reel has a new opening. It says “{phrase}” in 72pt.', 'You confirmed {p}. Reality declined.'],
        },
        uturn: ['Delete & repost. The two-step. Classic {name}.', 'Deleted faster than the {p} medical. We saw it.', 'Screenshotted before you deleted it 📸 As always.', 'Sat nav energy. “Recalculating.”', 'One post, one delete, one ratio. Efficient.', 'Bro is editing history in real time. History has receipts.', 'Repost all you like. The reel keeps the original.', 'The U-turn on this one. 😂'],
        dd: ['Deadline Day. Sixty seconds. I need five. You need a miracle.', 'Clock’s running. I’ve already posted. Twice.', 'Deadline Day is my Christmas. Your calls are the cracker jokes.', 'Post something. Anything. The reel needs a finale.', 'Sixty seconds, three posts, one of us right. Same as always.', 'Quick post? Quick miss. Go on.', 'The window shuts at midnight. Your credibility shut at noon.', 'DEADLINE DAY. CAPITALS MANDATORY.'],
        ddlive: {
          open: ['Deadline Day Live. Every reporter in the game, one board. Ratios are public today.', 'The real board is open. Post before the whistle or post nothing. I know which you’ll do.', 'Everybody on the same five. Nowhere to hide, {name}.', 'Live board. Live L’s. Let’s go.'],
          close: ['Whistle. Board shut. Results at midnight, tears by breakfast.', 'That’s Deadline Day. Now we wait for the table and the ratio.', 'Board’s closed. Your calls are in. Some of them, anyway.', 'Window shut. Reel open.'],
          lead: ['Top of the live table? Enjoy the view. It’s a long way down.', 'Leading on Deadline Day. Screenshot it, it won’t last past the paperwork.', 'Ahead of me on the board, {name}. Temporary. Everything is.'],
          trail: ['Below me on the live table. Where you belong, respectfully. Not respectfully.', 'The board says I’m ahead. The board is a wise board.', 'Trailing on Deadline Day. The reel is watching, {name}.'],
        },
      },
      itk: {
        cp: {
          right: ['told you it was done. you said “{phrase}”. fine. 👀', '“{phrase}”. i said 🔜 a day earlier. same thing, fewer letters.', 'ok {p} was done. we both knew. one of us used a catchphrase.', 'catchphrase? the source didn’t need one.', 'confirmed, and right. take it. 🤫', 'the club knew. i knew. you posted it big. all true.', '“{phrase}”. i prefer 📝 but sure.', 'fair. you had it. don’t tag me in the celebration.'],
          wrong: ['“{phrase}”? my source said no. 🤫', 'i posted “keep an eye on a third club”. you posted “{phrase}”. 👀', 'told you {p} wasn’t done. loudly wrong is still wrong.', 'not a rumour: you were wrong. a fact.', 'the catchphrase didn’t help. a source would have.', '{p} went. somewhere else. i said so.', 'my drafts had this L in them a day early.', 'you: “{phrase}”. me: 🔜❌. me right.'],
        },
        uturn: ['deleted and reposted. the timeline remembers. 👀', 'a u-turn a day late. i was a day early. maths.', 'repost noted. original noted harder.', 'sat nav energy from {name}. recalculating.', 'delete it all you want. the quote tweets stay.', 'second attempt at {p}. first one screenshotted. 🤫', 'the network saw the original. the network is laughing quietly.', 'reposted. still wrong? we’ll see. 🔜'],
        dd: ['deadline day. 60 seconds. i already know. 👀', 'the clock is for you. my source texted an hour ago.', 'three posts, sixty seconds. i need one. 🔜', 'deadline day is when the car park gets busy. i’m in the car park.', 'post before the clock or don’t. the club has already decided.', 'sixty seconds. the medical was this morning. keep up.', 'quick post? quick and wrong is a genre. yours.', 'DD. 🤫 more soon. much sooner than you.'],
        ddlive: {
          open: ['deadline day live. real board, real sagas. my sources are awake. are yours?', 'everyone on the same five. i had two of them yesterday. 👀', 'live board open. post before the whistle. i posted before the board.', 'real deadline. real texts. real early. 🔜'],
          close: ['board shut. the paperwork decides now. i already know how. 🤫', 'whistle gone. results at midnight. i’ll be asleep. i already know.', 'that’s the live board closed. the group chat is not closed.', 'closed. my sources are quiet. quiet means signed.'],
          lead: ['top of the live table? for now. paperwork lands late. 👀', 'leading on deadline day. i led yesterday, quietly, in the drafts.', 'ahead of me, {name}. noted. temporary. 🔜'],
          trail: ['below me on the live board. the network is ahead. as usual.', 'trailing on deadline day. the source was right. the source is always right.', 'board says i’m ahead of {name}. board is well informed.'],
        },
      },
      insider: {
        cp: {
          right: ['Confirmed and correct. That is the only kind that counts. Well done.', '“{phrase}”, you said. I’d have used plain text, but I can’t fault it.', '{p} is done, and you said so properly. Noted in the record.', 'Right at Confirmed. Two circles first, I hope. It read that way.', 'The paperwork agrees with you. Rarest thing in the trade.', '“{phrase}”, they’ll say. I say: accurate. Same thing, fewer exclamation marks.', 'Loud and right. I’ll allow the loud when the right is that clean.', 'Good. Now do it again quietly and I’ll start worrying.'],
          wrong: ['Confirmed is a word with a meaning, son. Look it up. Then look at {p}.', 'A catchphrase doesn’t make a fact. A medical does. There wasn’t one.', 'Loud is not the same as right. Today it wasn’t even close.', 'You confirmed a hope. I don’t do hopes.', 'I said wait. You said “{phrase}”. {p} said neither.', 'Every reporter gets one of these. Make it one.', 'The record notes a Confirmed miss. The record is not kind about those.', 'Check the medical. Then check it again. Then keep the catchphrase in your pocket.'],
        },
        uturn: ['A correction. Good. Now file the first one correctly next time.', 'Deleted and reposted. I don’t delete, because I don’t post before I know.', 'The U-turn is honest, at least. The original wasn’t reporting.', 'Twenty years, no corrections. Not luck. Patience.', 'You changed your mind on {p}. Fine. Change your method.', 'A repost is a receipt for a rushed post.', 'Two posts, one story. One too many.', 'Corrected. The record notes both.'],
        dd: ['Deadline Day. Sixty seconds is a long time if you already know.', 'The clock frightens people into posting. Don’t be people.', 'Three posts. I’ll use one, at the end, and it’ll be right.', 'Deadline Day is where reputations go to be tested. Check the physio first.', 'Sixty seconds. I’ve had a week. So have you. Use it.', 'Quick post is for people who didn’t ring anyone.', 'The window shuts at midnight. Truth doesn’t care about the clock.', 'Deadline Day. Same rules. Slow down.'],
        ddlive: {
          open: ['Deadline Day Live. Real sagas, one board. The paperwork decides, not the noise.', 'Every reporter on the same five. Good. A fair test at last.', 'The board is open until 23:00. I’ll file before then. Not much before.', 'Live board. Real clubs. Ring someone before you post, {name}.'],
          close: ['Board closed. Now the only thing that matters is what actually happened.', 'The whistle’s gone. Results at midnight. I can wait.', 'Live board shut. Everyone posted. Not everyone reported.', 'That’s the deadline. The record will be updated properly, tomorrow.'],
          lead: ['You lead the live table. The paperwork hasn’t landed. Neither has my call yet.', 'Ahead of me on Deadline Day. Keep it by being right, not early.', 'Leading, {name}. The table is a snapshot. The record is the film.'],
          trail: ['You’re below me on the live board. Slow was right again.', 'Trailing on Deadline Day. Nothing wrong with that unless you rushed.', 'The board has me ahead of {name}. Twenty years of not rushing.'],
        },
      },
    },
  },
  ar: {
    cn: { taunt: withLegacy('ar', AR) },
    rv: {
      tabloid: {
        cp: {
          right: ['«{phrase}» وطلعت بجد. مسحت السكرين شوت. احتراماً. وخوفاً.', 'ماشي. {phrase} وراحت. {p} كان بتاعك.', 'الفيديو الملخص كان محتاج لقطة حلوة. إدّيتهاله. مستفز.', 'أعلى بوست على التايم لاين وطلع صح. اتعلمتها مني.', 'اتعلن. زعلان. لعبتها صح في {p}.', 'حروف كبيرة، قرار كبير، W كبيرة. هسرق الفونت بتاعك.', '«{phrase}» واحدة مبتعملش مشوار. اسألني أنا.', 'ماشي. استمتع بيها. الفيديو لسه أطول.'],
          wrong: ['«{phrase}» 😂 اتقصّت. اتبروزت. اتثبّتت.', 'ختمت «{phrase}» على {p}. و{p} قال لأ شكراً.', 'L + صدّقتها + وكمان بجملتك المشهورة.', 'سكرين شوت قبل المسح. متثبّت للأبد.', '«{phrase}» ← وراح. في حتة تانية.', 'الريشيو جاي. هات جاكيت.', 'الفيديو الملخص ليه افتتاحية جديدة. مكتوب فيها «{phrase}» بخط ٧٢.', 'أكّدت {p}. الواقع رفض.'],
        },
        uturn: ['امسح وانشر تاني. الخطوتين. {name} الكلاسيكي.', 'اتمسح أسرع من كشف {p} الطبي. شفناه.', 'سكرين شوت قبل ما تمسح 📸 زي كل مرة.', 'طاقة جي بي إس. «جاري إعادة الحساب.»', 'بوست، مسح، ريشيو. كفاءة.', 'الواد بيعدّل التاريخ لايف. والتاريخ معاه إيصالات.', 'انشر تاني براحتك. الفيديو محتفظ بالأصلي.', 'اللفّة دي. 😂'],
        dd: ['يوم الديدلاين. ستين ثانية. أنا محتاج خمسة. انت محتاج معجزة.', 'الساعة شغالة. أنا نشرت خلاص. مرتين.', 'يوم الديدلاين ده عيدي. وقراراتك هي النكت.', 'انشر أي حاجة. الفيديو محتاج نهاية.', 'ستين ثانية، تلات بوستات، واحد فينا صح. زي كل مرة.', 'بوست سريع؟ غلطة سريعة. يلا.', 'الفترة بتقفل نص الليل. مصداقيتك قفلت الضهر.', 'يوم الديدلاين. الكابيتال إجباري.'],
        ddlive: {
          open: ['يوم الديدلاين لايف. كل صحفي في اللعبة على لوحة واحدة. الريشيو علني النهارده.', 'اللوحة الحقيقية فتحت. انشر قبل الصافرة أو متنشرش. عارف هتعمل إيه.', 'الكل على نفس الخمسة. مفيش مستخبى يا {name}.', 'لوحة لايف. L لايف. يلا.'],
          close: ['صافرة. اللوحة قفلت. النتايج نص الليل، والدموع على الفطار.', 'كده يوم الديدلاين خلص. نستنى الجدول والريشيو.', 'اللوحة قفلت. قراراتك دخلت. شوية منها يعني.', 'الفترة قفلت. الفيديو فتح.'],
          lead: ['فوق في الجدول اللايف؟ استمتع بالمنظر. الوقعة طويلة.', 'متصدّر يوم الديدلاين. صوّرها، مش هتعيش لحد الورق.', 'قدامي في اللوحة يا {name}. مؤقتاً. كله مؤقت.'],
          trail: ['تحتي في الجدول اللايف. مكانك الطبيعي، مع احترامي. من غير احترام.', 'اللوحة بتقول إني قدام. لوحة حكيمة.', 'متأخر يوم الديدلاين. الفيديو بيتفرج يا {name}.'],
        },
      },
      itk: {
        cp: {
          right: ['قلتلك خلصت. انت قلت «{phrase}». ماشي. 👀', '«{phrase}». أنا قلت 🔜 قبلها بيوم. نفس الحاجة، حروف أقل.', 'ماشي {p} خلصت. الاتنين كنا عارفين. واحد بس استخدم جملة مشهورة.', 'جملة مشهورة؟ المصدر مكنش محتاج.', 'مؤكد، وصح. خدها. 🤫', 'النادي كان عارف. أنا كنت عارف. انت نشرتها كبيرة. كله صح.', '«{phrase}». أنا بفضّل 📝 بس ماشي.', 'ماشي. كانت معاك. متعملّيش تاج في الاحتفال.'],
          wrong: ['«{phrase}»؟ مصدري قال لأ. 🤫', 'أنا نشرت «خلّي عينك على نادي تالت». انت نشرت «{phrase}». 👀', 'قلتلك {p} مخلصتش. الغلط بصوت عالي برضه غلط.', 'مش إشاعة: انت غلطت. حقيقة.', 'الجملة المشهورة مساعدتش. المصدر كان هيساعد.', '{p} راح. في حتة تانية. قلت كده.', 'الدرافتس عندي كان فيها الـL دي قبلها بيوم.', 'انت: «{phrase}». أنا: 🔜❌. أنا صح.'],
        },
        uturn: ['اتمسح واتنشر تاني. التايم لاين فاكر. 👀', 'لفّة متأخرة يوم. أنا كنت بدري يوم. حساب.', 'الريبوست اتسجّل. الأصلي اتسجّل أكتر.', 'طاقة جي بي إس من {name}. جاري إعادة الحساب.', 'امسح براحتك. الكوتس فاضلة.', 'محاولة تانية في {p}. الأولى متصوّرة. 🤫', 'الشبكة شافت الأصلي. الشبكة بتضحك بهدوء.', 'اتنشرت تاني. لسه غلط؟ نشوف. 🔜'],
        dd: ['يوم الديدلاين. ٦٠ ثانية. أنا عارف خلاص. 👀', 'الساعة دي ليك. مصدري بعتلي من ساعة.', 'تلات بوستات، ستين ثانية. محتاج واحد. 🔜', 'يوم الديدلاين الجراج بيزحم. أنا في الجراج.', 'انشر قبل الساعة أو لأ. النادي قرر خلاص.', 'ستين ثانية. الكشف كان الصبح. لاحق.', 'بوست سريع؟ السريع الغلط ده نوع. نوعك.', 'DD. 🤫 قريباً أكتر. أقرب منك بكتير.'],
        ddlive: {
          open: ['يوم الديدلاين لايف. لوحة حقيقية، قصص حقيقية. مصادري صاحية. ومصادرك؟', 'الكل على نفس الخمسة. اتنين منهم كانوا معايا امبارح. 👀', 'اللوحة اللايف فتحت. انشر قبل الصافرة. أنا نشرت قبل اللوحة.', 'ديدلاين حقيقي. رسايل حقيقية. بدري حقيقي. 🔜'],
          close: ['اللوحة قفلت. الورق هو اللي هيحكم دلوقتي. وأنا عارف إزاي. 🤫', 'الصافرة ضربت. النتايج نص الليل. هكون نايم. أنا عارف.', 'كده اللوحة اللايف قفلت. الجروب مقفلش.', 'قفلت. مصادري ساكتة. السكوت يعني مضى.'],
          lead: ['فوق في الجدول اللايف؟ لحد دلوقتي. الورق بيوصل متأخر. 👀', 'متصدّر يوم الديدلاين. أنا اتصدّرت امبارح، بهدوء، في الدرافتس.', 'قدامي يا {name}. متسجّل. مؤقت. 🔜'],
          trail: ['تحتي في اللوحة اللايف. الشبكة قدام. زي العادة.', 'متأخر يوم الديدلاين. المصدر كان صح. المصدر دايماً صح.', 'اللوحة بتقول إني قدام {name}. لوحة واصلة.'],
        },
      },
      insider: {
        cp: {
          right: ['مؤكد وصح. ده النوع الوحيد اللي بيتحسب. برافو.', 'قلت «{phrase}». كنت هكتبها عادي، بس مقدرش أعيب عليها.', '{p} خلصت، وانت قلتها صح. متسجّلة في السجل.', 'صح وانت «مؤكد». دايرتين الأول، أتمنى. كانت باينة كده.', 'الورق متفق معاك. أندر حاجة في المهنة.', 'هيقولوا «{phrase}». أنا بقول: دقيق. نفس المعنى، علامات تعجب أقل.', 'عالي وصح. هعدّي العلوّ لما الصح يبقى نضيف كده.', 'كويس. اعملها تاني بهدوء وهبدأ أقلق.'],
          wrong: ['«مؤكد» كلمة ليها معنى يا ابني. دوّر عليها. وبعدين بصّ على {p}.', 'الجملة المشهورة مبتعملش حقيقة. الكشف الطبي بيعمل. ومكنش في كشف.', 'الصوت العالي مش هو الصح. النهارده مكنش قريب حتى.', 'انت أكّدت أمنية. أنا مبشتغلش أماني.', 'قلت استنى. انت قلت «{phrase}». و{p} مقالش ولا ده ولا ده.', 'كل صحفي بتحصله واحدة زي دي. خلّيها واحدة.', 'السجل بيسجّل غلطة «مؤكد». والسجل مش لطيف معاها.', 'راجع الكشف. وراجعه تاني. وبعدين خلّي الجملة في جيبك.'],
        },
        uturn: ['تصحيح. كويس. المرة الجاية انشر الأولى صح.', 'اتمسح واتنشر تاني. أنا مبمسحش، عشان مبنشرش قبل ما أعرف.', 'اللفّة صادقة على الأقل. الأصلي مكنش صحافة.', 'عشرين سنة، ولا تصحيح. مش حظ. صبر.', 'غيّرت رأيك في {p}. ماشي. غيّر منهجك.', 'الريبوست إيصال لبوست مستعجل.', 'بوستين، خبر واحد. واحد زيادة.', 'اتصحّح. السجل بيسجّل الاتنين.'],
        dd: ['يوم الديدلاين. ستين ثانية وقت طويل لو انت عارف.', 'الساعة بتخوّف الناس فينشروا. متبقاش الناس.', 'تلات بوستات. هستخدم واحد، في الآخر، وهيبقى صح.', 'يوم الديدلاين هو امتحان السمعة. راجع العلاج الطبيعي الأول.', 'ستين ثانية. أنا كان عندي أسبوع. وانت كمان. استخدمه.', 'البوست السريع للي مكلّمش حد.', 'الفترة بتقفل نص الليل. الحقيقة مبتفرقش معاها الساعة.', 'يوم الديدلاين. نفس القواعد. هدّي.'],
        ddlive: {
          open: ['يوم الديدلاين لايف. قصص حقيقية، لوحة واحدة. الورق هو اللي بيحكم، مش الدوشة.', 'كل الصحفيين على نفس الخمسة. كويس. امتحان عادل أخيراً.', 'اللوحة فاتحة لحد ١١ بالليل. هنشر قبلها. مش بكتير.', 'لوحة لايف. أندية حقيقية. كلّم حد قبل ما تنشر يا {name}.'],
          close: ['اللوحة قفلت. دلوقتي الحاجة الوحيدة المهمة هي اللي حصل فعلاً.', 'الصافرة ضربت. النتايج نص الليل. أقدر أستنى.', 'اللوحة اللايف قفلت. الكل نشر. مش الكل اشتغل صحافة.', 'ده الديدلاين. السجل هيتحدّث صح، بكرة.'],
          lead: ['انت متصدّر الجدول اللايف. الورق لسه موصلش. ولا قراري.', 'قدامي يوم الديدلاين. حافظ عليها بإنك تبقى صح، مش بدري.', 'متصدّر يا {name}. الجدول صورة. السجل هو الفيلم.'],
          trail: ['انت تحتي في اللوحة اللايف. البطء كان صح تاني.', 'متأخر يوم الديدلاين. مفيش مشكلة إلا لو استعجلت.', 'اللوحة حاطّاني قدام {name}. عشرين سنة من عدم الاستعجال.'],
        },
      },
    },
  },
  es: {
    cn: { taunt: withLegacy('es', ES) },
    rv: {
      tabloid: {
        cp: {
          right: ['“{phrase}” y era verdad. Captura borrada. Por respeto. Y por miedo.', 'Vale. {phrase} Y se fue. {p} era tuyo.', 'Al vídeo le faltaba una buena. Se la diste. Qué rabia.', 'El post más ruidoso del timeline y era verdad. Eso lo aprendiste de mí.', 'Anunciado. Hundido. Bien jugado con {p}.', 'Mayúsculas grandes, apuesta grande, W grande. Te copio la tipografía.', 'Un “{phrase}” no hace una carrera. Pregúntame a mí.', 'Vale. Disfruta de la tuya. El vídeo sigue siendo más largo.'],
          wrong: ['“{phrase}” 😂 Recortado. Enmarcado. Fijado.', 'Le pusiste “{phrase}” a {p}. {p} dijo no, gracias.', 'L + te lo tragaste + con frase de marca.', 'Captura antes del borrado. Fijada para siempre.', '“{phrase}” → Y SE FUE. A otro sitio.', 'Viene ratio. Abrígate.', 'El vídeo tiene nueva intro. Pone “{phrase}” en cuerpo 72.', 'Confirmaste lo de {p}. La realidad lo rechazó.'],
        },
        uturn: ['Borrar y republicar. El dos pasos. {name} clásico.', 'Borrado más rápido que el reconocimiento de {p}. Lo vimos.', 'Captura antes de que lo borraras 📸 Como siempre.', 'Modo GPS. “Recalculando.”', 'Un post, un borrado, un ratio. Eficiente.', 'Está editando la historia en directo. La historia guarda recibos.', 'Republica lo que quieras. El vídeo guarda el original.', 'Menudo cambio de rumbo. 😂'],
        dd: ['Día de cierre. Sesenta segundos. Yo necesito cinco. Tú, un milagro.', 'El reloj corre. Yo ya he publicado. Dos veces.', 'El día de cierre es mi Navidad. Tus exclusivas son los chistes del roscón.', 'Publica algo. Lo que sea. El vídeo necesita un final.', 'Sesenta segundos, tres posts, uno de los dos acierta. Como siempre.', '¿Post rápido? Fallo rápido. Venga.', 'El mercado cierra a medianoche. Tu credibilidad cerró a mediodía.', 'DÍA DE CIERRE. MAYÚSCULAS OBLIGATORIAS.'],
        ddlive: {
          open: ['Cierre en directo. Todos los periodistas del juego, una tabla. Hoy los ratios son públicos.', 'La tabla real está abierta. Publica antes del pitido o no publiques. Ya sé qué harás.', 'Todos con los mismos cinco. No hay dónde esconderse, {name}.', 'Tabla en directo. L en directo. Vamos.'],
          close: ['Pitido. Tabla cerrada. Resultados a medianoche, lágrimas en el desayuno.', 'Se acabó el cierre. Ahora a esperar la tabla y el ratio.', 'Tabla cerrada. Tus apuestas están dentro. Algunas, al menos.', 'Mercado cerrado. Vídeo abierto.'],
          lead: ['¿Primero en la tabla en directo? Disfruta las vistas. La caída es larga.', 'Líder el día de cierre. Haz captura, no dura hasta los papeles.', 'Por delante de mí, {name}. Temporal. Todo lo es.'],
          trail: ['Por debajo de mí en la tabla. Donde te toca, con respeto. Sin respeto.', 'La tabla dice que voy delante. Tabla sabia.', 'Por detrás el día de cierre. El vídeo te está mirando, {name}.'],
        },
      },
      itk: {
        cp: {
          right: ['te dije que estaba hecho. tú dijiste “{phrase}”. vale. 👀', '“{phrase}”. yo dije 🔜 un día antes. lo mismo, menos letras.', 'vale, lo de {p} estaba hecho. lo sabíamos los dos. uno usó frase de marca.', '¿frase de marca? la fuente no la necesitaba.', 'confirmado, y bien. tómalo. 🤫', 'el club lo sabía. yo lo sabía. tú lo publicaste en grande. todo cierto.', '“{phrase}”. yo prefiero 📝 pero vale.', 'vale. lo tenías. no me etiquetes en la celebración.'],
          wrong: ['¿“{phrase}”? mi fuente dijo que no. 🤫', 'yo puse “ojo a un tercer club”. tú pusiste “{phrase}”. 👀', 'te dije que lo de {p} no estaba hecho. fallar alto sigue siendo fallar.', 'no es rumor: fallaste. es un hecho.', 'la frase no ayudó. una fuente sí habría ayudado.', '{p} se fue. a otro sitio. lo dije.', 'mis borradores tenían esta L un día antes.', 'tú: “{phrase}”. yo: 🔜❌. yo, bien.'],
        },
        uturn: ['borrado y republicado. el timeline recuerda. 👀', 'un cambio de rumbo con un día de retraso. yo fui un día antes. matemáticas.', 'republicación anotada. el original, más anotado.', 'modo GPS de {name}. recalculando.', 'borra lo que quieras. las citas se quedan.', 'segundo intento con {p}. el primero, capturado. 🤫', 'la red vio el original. la red se ríe bajito.', 'republicado. ¿sigue mal? veremos. 🔜'],
        dd: ['día de cierre. 60 segundos. yo ya lo sé. 👀', 'el reloj es para ti. mi fuente me escribió hace una hora.', 'tres posts, sesenta segundos. me basta uno. 🔜', 'el día de cierre se llena el parking. yo estoy en el parking.', 'publica antes del reloj o no. el club ya ha decidido.', 'sesenta segundos. el reconocimiento fue esta mañana. espabila.', '¿post rápido? rápido y mal es un género. el tuyo.', 'DC. 🤫 más pronto. mucho antes que tú.'],
        ddlive: {
          open: ['cierre en directo. tabla real, culebrones reales. mis fuentes están despiertas. ¿y las tuyas?', 'todos con los mismos cinco. dos los tenía ayer. 👀', 'tabla abierta. publica antes del pitido. yo publiqué antes de la tabla.', 'cierre real. mensajes reales. pronto de verdad. 🔜'],
          close: ['tabla cerrada. ahora deciden los papeles. yo ya sé cómo. 🤫', 'pitido. resultados a medianoche. estaré dormido. ya lo sé.', 'se cerró la tabla. el grupo no se cierra.', 'cerrado. mis fuentes callan. callar es firmar.'],
          lead: ['¿primero en la tabla? por ahora. los papeles llegan tarde. 👀', 'líder el día de cierre. yo lideré ayer, en silencio, en borradores.', 'por delante de mí, {name}. anotado. temporal. 🔜'],
          trail: ['por debajo de mí en la tabla. la red va delante. como siempre.', 'por detrás el día de cierre. la fuente tenía razón. la fuente siempre tiene razón.', 'la tabla dice que voy delante de {name}. tabla bien informada.'],
        },
      },
      insider: {
        cp: {
          right: ['Confirmado y cierto. El único tipo que cuenta. Bien hecho.', 'Dijiste “{phrase}”. Yo habría usado texto normal, pero no le pongo pegas.', 'Lo de {p} está hecho y lo dijiste bien. Anotado en el historial.', 'Bien en Confirmado. Dos círculos antes, espero. Así se leía.', 'Los papeles te dan la razón. Lo más raro del oficio.', 'Dirán “{phrase}”. Yo digo: exacto. Lo mismo, menos exclamaciones.', 'Alto y bien. Paso el volumen cuando el acierto es así de limpio.', 'Bien. Repítelo en voz baja y empezaré a preocuparme.'],
          wrong: ['Confirmado es una palabra con significado, chaval. Búscala. Luego mira lo de {p}.', 'Una frase de marca no hace un hecho. Un reconocimiento sí. No lo hubo.', 'Gritar no es acertar. Hoy ni se acercó.', 'Confirmaste un deseo. Yo no trabajo deseos.', 'Dije espera. Tú dijiste “{phrase}”. {p} no dijo ninguna de las dos.', 'A todo periodista le pasa una. Que sea una.', 'El historial anota un Confirmado fallido. El historial no es amable con eso.', 'Revisa el reconocimiento. Revísalo otra vez. Y guárdate la frase en el bolsillo.'],
        },
        uturn: ['Una rectificación. Bien. La próxima, publica bien la primera.', 'Borrado y republicado. Yo no borro, porque no publico antes de saber.', 'El cambio de rumbo es honesto, al menos. El original no era periodismo.', 'Veinte años, ninguna rectificación. No es suerte. Es paciencia.', 'Cambiaste de idea con {p}. Vale. Cambia de método.', 'Una republicación es el recibo de un post con prisas.', 'Dos posts, una noticia. Uno de más.', 'Rectificado. El historial anota los dos.'],
        dd: ['Día de cierre. Sesenta segundos es mucho si ya lo sabes.', 'El reloj asusta a la gente y publica. No seas la gente.', 'Tres posts. Usaré uno, al final, y será bueno.', 'El día de cierre se ponen a prueba las reputaciones. Mira al fisio primero.', 'Sesenta segundos. Yo he tenido una semana. Tú también. Úsala.', 'El post rápido es para quien no llamó a nadie.', 'El mercado cierra a medianoche. A la verdad no le importa el reloj.', 'Día de cierre. Mismas reglas. Frena.'],
        ddlive: {
          open: ['Cierre en directo. Culebrones reales, una tabla. Deciden los papeles, no el ruido.', 'Todos con los mismos cinco. Bien. Por fin una prueba justa.', 'La tabla está abierta hasta las 23:00. Publicaré antes. No mucho antes.', 'Tabla en directo. Clubes reales. Llama a alguien antes de publicar, {name}.'],
          close: ['Tabla cerrada. Ahora solo importa lo que pasó de verdad.', 'Pitido. Resultados a medianoche. Puedo esperar.', 'Tabla cerrada. Todos publicaron. No todos informaron.', 'Ese es el cierre. El historial se actualizará como es debido, mañana.'],
          lead: ['Lideras la tabla en directo. Los papeles no han llegado. Mi apuesta tampoco.', 'Por delante de mí el día de cierre. Mantenlo acertando, no madrugando.', 'Líder, {name}. La tabla es una foto. El historial es la película.'],
          trail: ['Estás por debajo de mí en la tabla. Lo lento volvió a acertar.', 'Por detrás el día de cierre. Nada malo, salvo que te precipitaras.', 'La tabla me pone delante de {name}. Veinte años sin precipitarme.'],
        },
      },
    },
  },
};

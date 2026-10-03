// 3.8 launch rework, core loop lane (LAUNCH_BRIEF §5–§10, §27, §30–§31, §39–§40, Addendum A). Every new line the
// player sees in the Player File, the publish sheet, Deadline Day, Results (the viral card), onboarding and Practice.
// Keys live under c38.* so nothing here collides with the older parts. Shape: { en, ar (Egyptian), es }.
export default {
  en: {
    c38: {
      // §5 qualitative reliability (ranked Daily never shows a percentage)
      rel: {
        kitman: 'Knows whether, not where', barber: 'Gossip · street chatter', agent: 'Direct but biased', spotter: 'Strong on destination',
        physio: 'Strong on medicals', leak: 'Club insider', tabloid: 'Gossip', itk: 'Street chatter', insider: 'Very reliable',
        short: { kitman: 'Reliable', barber: 'Gossip', agent: 'Biased', spotter: 'Very reliable', physio: 'Very reliable', leak: 'Insider' },
        corr: 'Correlated with the street', once: 'Count the street once',
      },
      // §6 evidence circles in words
      ev: {
        strong: 'Strong', split: 'Split', weak: 'Weak', none: 'No reads yet', leans: 'Leans {o}',
        agree: '{n} independent sources agree', one: 'One source so far', echo: 'Echo chamber: these reports trace back to the same story',
        rival: '{n} rivals posted', rivalOne: '1 rival posted', summary: 'Evidence', circles: '{n} independent', coach: 'Coach odds',
      },
      // §27 the Player File
      file: {
        back: 'Back to Board', call: 'Make the Call', change: 'Change the call', filed: 'Filed', sagaNo: 'Saga {n} of {m}', heat: 'Heat',
        heatN: ['Quiet', 'Warm', 'Hot', 'On fire'], tabs: { sources: 'Sources', clippings: 'Clippings', call: 'Your Call' },
        called: 'Called · day {d}', opens: 'Opens day {n}', cost: '{n} pt', costs: '{n} pts', route: '{from} → {to}', freeAgent: 'Free agent',
        noClips: 'Nothing on file yet. Ring a source.', ringFirst: 'Ring someone first. No sources, no story.',
      },
      // §7 the publish sheet
      pub: {
        what: 'What happens?', loud: 'How sure are you?', win: 'Right: +{n}', lose: 'Wrong: {n}',
        talksD: 'Low risk, low reward', advancedD: 'Medium risk, medium reward', confirmedD: 'High risk, highest reward · Exclusive possible',
        exOk: 'Exclusive is on: Confirmed, two independent sources, no rival has it. +{n} on top.',
        exNeedConf: 'Exclusive needs Confirmed. This publishes as a normal call.', exNeedTwo: 'Exclusive needs two different kinds of source backing this outcome. You have {n}. You can still publish it as a normal call.',
        exBeaten: 'No Exclusive: {r} got there first.', exRepost: 'No Exclusive on a repost.', hold: 'Hold to publish',
        early: 'Filed on day {d}: +{n} early bonus', dd: 'Deadline Day: no early bonus', coachOnly: 'Exact odds show in Practice Coach mode only.',
      },
      // §8 the Exclusive moment
      excl: { stamp: 'EXCLUSIVE', line: 'You broke it first.', lines: 'You broke {n} first.', followers: '+{n} followers', share: 'Share the scoop', feed: 'Exclusive: {p} to {c}' },
      // §9 Deadline Day
      dd: {
        open: 'Still open: {n}', allFiled: 'All filed. Ride it out.', quick: 'Quick Post', quickNote: 'One tap files your lean at Advanced.',
        unresolved: 'Unresolved', synced: 'Clock synced with the newsroom · {n} s grace', whistle: 'Final whistle. The window is shut.',
        phase: { heart: 'Thirty seconds.', quick: 'Fifteen. Quick Post is on.', tick: 'Ten.', pulse: 'Five.' }, left: '{n} s',
      },
      // §10 the viral object
      share: {
        head: 'TIER ONE #{no} · {tier} · {pts} PTS', headRoom: 'TIER ONE · {what} · {tier} · {pts} PTS', top: 'Top {p}%', streak: '{n}-day streak',
        excl: '{n} Exclusives', exclOne: '1 Exclusive', copy: 'Copy result', copied: 'Copied. Paste it in the group chat.', card: 'Your result card',
        line: {
          perfect: 'Perfect five', first: 'You broke it first', three: '3 Exclusives', beatAll: 'Beat all three rivals', dd: 'Survived Deadline Day',
          spiked: 'SPIKED. The editor would like a word.', firstT1: 'First Tier 1', longest: 'Longest streak yet', streak30: '30-day streak', streak100: '100-day streak',
          promoted: 'Promoted: {rank}', room: 'Won the Press Room', miss: 'Biggest miss: Confirmed {o}', early: 'Called it on day {d}',
        },
      },
      // §30 why a source misled you (post-game breakdown, Practice first)
      why: {
        street: 'Street voice: repeated the planted story.', agentDone: 'The agent sells moves. Her “Done” means little.',
        agentNeg: 'The agent’s Off or Fake is the one to trust.', spotterOF: 'The spotter can’t tell Off from Fake.',
        physioOF: 'The physio can’t tell Off from Fake.', kitman: 'The kit man knows whether he leaves, not where.',
        twist: 'Said before the twist: true then, not now.', right: 'Pointed the right way.', rivalStreet: 'A street rival: wrong together with the gossip.',
        honest: 'An honest miss. This source is right most of the time.', title: 'Why it misled you',
      },
      // §30 Practice as the learning lab
      pr: {
        k: 'OFF THE RECORD', hed: 'Nothing here affects your reputation.', sub: 'Coach odds, breakdowns, past Dailies, board codes.',
        coachOn: 'Coach is on: exact odds on every file', coachOff: 'Coach is off: plays like the ranked Daily',
        tools: 'What Practice teaches', t1: 'Exact odds on every file (Coach)', t2: 'Why each source misled you, after the board', t3: 'Replay any past Daily, no rank', t4: 'Board codes: same code, same board, send it to a friend',
      },
      // §31 onboarding in play
      onb: {
        firedK: 'Last season', firedH: 'You were fired.', firedBody: 'You got the biggest call of the window wrong. Confirmed. Front page. He signed somewhere else at 00:03.',
        editorLine: '“Clear your desk. Nothing personal.”', youLine: '“I’ll be back on the front page by summer.”', editor: 'Your old editor', you: 'You',
        start: 'Start the training board', skip: 'Skip the story', training: 'Training board', trainingSub: 'One saga, one day. Nothing counts.',
      },
      tut: {
        ring: 'Ring the Kit Man.', ringP: 'One point. He knows whether he’s leaving, never where. Whatever he says lands under Evidence.',
        second: 'Ring a different kind of source.', secondP: 'Two independent sources agreeing is what an Exclusive needs. Street voices only ever count once.',
        read: 'Read the evidence.', readP: 'Strong, Split or Weak. Then make the call.',
        result: 'Filed. Now the consequence.', resultP: 'A call only counts when the window shuts. Fast-forward the week and face it.',
        ff: 'See the consequence', keep: 'Play the week out', home: 'To the desk', done: 'Training done. Today’s Daily is waiting.',
      },
      hub: { ddSub: 'Real deadline days only · one shared board', ddNext: 'Next: {d}', ddOff: 'Not today' },
      win: { calls: '{n} calls left', noCalls: 'No calls left', day: 'Day {n} of {m}', backBoard: 'Board', newClue: 'Clipped to the file' },
      art: { portrait: 'Portrait of {n}', slot: 'Art slot' },
      res: { skip: 'Tap to skip', toDesk: 'To the desk', copyAria: 'Copy the result text' },
    },
  },
  ar: {
    c38: {
      rel: {
        kitman: 'عارف هيمشي ولا لأ، مش رايح فين', barber: 'كلام قهاوي · شائعات الشارع', agent: 'مباشر بس منحاز', spotter: 'قوي في الوجهة',
        physio: 'قوي في الكشف الطبي', leak: 'من جوه النادي', tabloid: 'كلام قهاوي', itk: 'شائعات الشارع', insider: 'موثوق جداً',
        short: { kitman: 'موثوق', barber: 'قهاوي', agent: 'منحاز', spotter: 'موثوق جداً', physio: 'موثوق جداً', leak: 'من جوه' },
        corr: 'بيكرر كلام الشارع', once: 'احسب الشارع مرة واحدة',
      },
      ev: {
        strong: 'قوي', split: 'منقسم', weak: 'ضعيف', none: 'لسه محدش اتكلم', leans: 'مايل لـ{o}',
        agree: '{n} مصادر مستقلة متفقة', one: 'مصدر واحد لحد دلوقتي', echo: 'صدى: الكلام ده كله راجع لنفس القصة',
        rival: '{n} منافسين نشروا', rivalOne: 'منافس واحد نشر', summary: 'الأدلة', circles: '{n} مستقل', coach: 'احتمالات الكوتش',
      },
      file: {
        back: 'رجوع للوحة', call: 'خد القرار', change: 'غيّر القرار', filed: 'اتنشر', sagaNo: 'قصة {n} من {m}', heat: 'السخونة',
        heatN: ['هادية', 'دافية', 'سخنة', 'ولعانة'], tabs: { sources: 'المصادر', clippings: 'القصاصات', call: 'قرارك' },
        called: 'اتكلم · يوم {d}', opens: 'بيفتح يوم {n}', cost: '{n} نقطة', costs: '{n} نقط', route: '{from} ← {to}', freeAgent: 'حر',
        noClips: 'مفيش حاجة في الملف. كلّم مصدر.', ringFirst: 'كلّم حد الأول. من غير مصادر مفيش قصة.',
      },
      pub: {
        what: 'هيحصل إيه؟', loud: 'متأكد قد إيه؟', win: 'لو صح: +{n}', lose: 'لو غلط: {n}',
        talksD: 'مخاطرة قليلة، مكسب قليل', advancedD: 'مخاطرة متوسطة، مكسب متوسط', confirmedD: 'مخاطرة عالية، أعلى مكسب · ممكن انفراد',
        exOk: 'الانفراد مفتوح: مؤكدة، مصدرين مستقلين، ومحدش من المنافسين نشرها. +{n} فوقيهم.',
        exNeedConf: 'الانفراد محتاج «مؤكدة».', exNeedTwo: 'الانفراد محتاج مصدرين مستقلين. عندك {n}.',
        exBeaten: 'مفيش انفراد: {r} سبقك.', exRepost: 'مفيش انفراد على إعادة نشر.', hold: 'اضغط مطوّل عشان تنشر',
        early: 'اتنشر يوم {d}: +{n} مكافأة تبكير', dd: 'يوم الديدلاين: مفيش مكافأة تبكير', coachOnly: 'الاحتمالات بالظبط بتظهر في التدريب مع الكوتش بس.',
      },
      excl: { stamp: 'انفراد', line: 'انت اللي نشرتها الأول.', lines: 'نشرت {n} الأول.', followers: '+{n} متابع', share: 'شارك السبق', feed: 'انفراد: {p} لـ{c}' },
      dd: {
        open: 'لسه مفتوحة: {n}', allFiled: 'كله اتنشر. استحمل للآخر.', quick: 'نشر سريع', quickNote: 'لمسة واحدة بتنشر ميلك بدرجة «متقدمة».',
        unresolved: 'لسه مفتوحة', synced: 'الساعة متظبطة مع غرفة الأخبار · {n} ث سماح', whistle: 'الصفارة الأخيرة. السوق قفل.',
        phase: { heart: 'تلاتين ثانية.', quick: 'خمستاشر. النشر السريع اتفتح.', tick: 'عشرة.', pulse: 'خمسة.' }, left: '{n} ث',
      },
      share: {
        head: 'TIER ONE #{no} · {tier} · {pts} نقطة', headRoom: 'TIER ONE · {what} · {tier} · {pts} نقطة', top: 'أعلى {p}%', streak: 'سلسلة {n} يوم',
        excl: '{n} انفرادات', exclOne: 'انفراد واحد', copy: 'انسخ النتيجة', copied: 'اتنسخت. حطها في الجروب.', card: 'كارت نتيجتك',
        line: {
          perfect: 'خمسة من خمسة', first: 'انت اللي نشرتها الأول', three: '٣ انفرادات', beatAll: 'كسبت المنافسين التلاتة', dd: 'عديت يوم الديدلاين',
          spiked: 'اترفضت. رئيس التحرير عايزك في كلمة.', firstT1: 'أول Tier 1', longest: 'أطول سلسلة ليك', streak30: 'سلسلة ٣٠ يوم', streak100: 'سلسلة ١٠٠ يوم',
          promoted: 'ترقية: {rank}', room: 'كسبت الغرفة', miss: 'أكبر غلطة: مؤكدة {o}', early: 'قلتها يوم {d}',
        },
      },
      why: {
        street: 'صوت شارع: كرر القصة المزروعة.', agentDone: 'الوكيل بيبيع انتقالات. «تمّت» بتاعته متعنيش كتير.',
        agentNeg: 'لما الوكيل يقول «باظت» أو «فشنك» صدّقه.', spotterOF: 'راصد المطار ميعرفش يفرّق بين «باظت» و«فشنك».',
        physioOF: 'الدكتور ميعرفش يفرّق بين «باظت» و«فشنك».', kitman: 'راجل الأدوات عارف هيمشي ولا لأ، مش رايح فين.',
        twist: 'اتقالت قبل التحول: كانت صح وقتها، مش دلوقتي.', right: 'شاور على الصح.', rivalStreet: 'منافس شارع: غلط مع القهاوي.',
        honest: 'غلطة بحسن نية. المصدر ده غالباً صح.', title: 'ليه ضللك',
      },
      pr: {
        k: 'خارج التسجيل', hed: 'مفيش حاجة هنا بتأثر على سمعتك.', sub: 'احتمالات الكوتش، تحليل بعد اللوحة، تحديات قديمة، أكواد لوحات.',
        coachOn: 'الكوتش شغال: الاحتمالات بالظبط على كل ملف', coachOff: 'الكوتش مقفول: زي التحدي المصنّف',
        tools: 'التدريب بيعلّمك إيه', t1: 'الاحتمالات بالظبط على كل ملف (الكوتش)', t2: 'ليه كل مصدر ضللك، بعد اللوحة', t3: 'أعد أي تحدي قديم، من غير ترتيب', t4: 'أكواد اللوحات: نفس الكود، نفس اللوحة، ابعته لصاحبك',
      },
      onb: {
        firedK: 'الموسم اللي فات', firedH: 'اترفدت.', firedBody: 'غلطت في أكبر قرار في السوق. مؤكدة. صفحة أولى. مضى لنادي تاني الساعة ١٢:٠٣.',
        editorLine: '«لمّ مكتبك. مفيش حاجة شخصية.»', youLine: '«هرجع الصفحة الأولى قبل الصيف.»', editor: 'رئيس تحريرك القديم', you: 'انت',
        start: 'ابدأ لوحة التدريب', skip: 'تخطي القصة', training: 'لوحة التدريب', trainingSub: 'قصة واحدة، يوم واحد. مفيش حاجة بتتحسب.',
      },
      tut: {
        ring: 'كلّم راجل الأدوات.', ringP: 'نقطة واحدة. عارف هيمشي ولا لأ، عمره ما يعرف فين. كلامه بينزل تحت «الأدلة».',
        second: 'كلّم مصدر من نوع تاني.', secondP: 'مصدرين مستقلين متفقين هو اللي الانفراد محتاجه. أصوات الشارع بتتحسب مرة واحدة بس.',
        read: 'اقرا الأدلة.', readP: 'قوي، منقسم أو ضعيف. وبعدين خد القرار.',
        result: 'اتنشر. دلوقتي النتيجة.', resultP: 'القرار بيتحسب لما السوق يقفل. قدّم الأسبوع وواجهها.',
        ff: 'شوف النتيجة', keep: 'العب الأسبوع', home: 'للمكتب', done: 'التدريب خلص. تحدي النهارده مستنيك.',
      },
      hub: { ddSub: 'أيام الديدلاين الحقيقية بس · لوحة واحدة للكل', ddNext: 'الجاي: {d}', ddOff: 'مش النهارده' },
      win: { calls: 'باقي {n} مكالمات', noCalls: 'مفيش مكالمات', day: 'يوم {n} من {m}', backBoard: 'اللوحة', newClue: 'اتحفظ في الملف' },
      art: { portrait: 'صورة {n}', slot: 'مكان الرسمة' },
      res: { skip: 'دوس للتخطي', toDesk: 'للمكتب', copyAria: 'انسخ نص النتيجة' },
    },
  },
  es: {
    c38: {
      rel: {
        kitman: 'Sabe si se va, no adónde', barber: 'Cotilleo · rumor de calle', agent: 'Directa pero parcial', spotter: 'Fuerte en el destino',
        physio: 'Fuerte en reconocimientos', leak: 'Desde dentro del club', tabloid: 'Cotilleo', itk: 'Rumor de calle', insider: 'Muy fiable',
        short: { kitman: 'Fiable', barber: 'Cotilleo', agent: 'Parcial', spotter: 'Muy fiable', physio: 'Muy fiable', leak: 'Interno' },
        corr: 'Repite lo de la calle', once: 'La calle cuenta una vez',
      },
      ev: {
        strong: 'Sólida', split: 'Dividida', weak: 'Floja', none: 'Nadie ha hablado', leans: 'Apunta a {o}',
        agree: '{n} fuentes independientes coinciden', one: 'Una fuente por ahora', echo: 'Cámara de eco: todos repiten la misma historia',
        rival: '{n} rivales publicaron', rivalOne: '1 rival publicó', summary: 'Pruebas', circles: '{n} independientes', coach: 'Odds del Coach',
      },
      file: {
        back: 'Al tablero', call: 'Hacer la apuesta', change: 'Cambiar la apuesta', filed: 'Publicado', sagaNo: 'Culebrón {n} de {m}', heat: 'Calor',
        heatN: ['Frío', 'Tibio', 'Caliente', 'Ardiendo'], tabs: { sources: 'Fuentes', clippings: 'Recortes', call: 'Tu apuesta' },
        called: 'Llamado · día {d}', opens: 'Abre el día {n}', cost: '{n} pt', costs: '{n} pts', route: '{from} → {to}', freeAgent: 'Agente libre',
        noClips: 'Nada en la carpeta. Llama a una fuente.', ringFirst: 'Llama a alguien primero. Sin fuentes no hay historia.',
      },
      pub: {
        what: '¿Qué pasa?', loud: '¿Cuánto te mojas?', win: 'Acierto: +{n}', lose: 'Fallo: {n}',
        talksD: 'Poco riesgo, poco premio', advancedD: 'Riesgo medio, premio medio', confirmedD: 'Mucho riesgo, el mayor premio · exclusiva posible',
        exOk: 'Exclusiva activa: Confirmado, dos fuentes independientes y ningún rival la tiene. +{n} extra.',
        exNeedConf: 'La exclusiva pide Confirmado.', exNeedTwo: 'La exclusiva pide dos fuentes independientes. Tienes {n}.',
        exBeaten: 'Sin exclusiva: {r} llegó antes.', exRepost: 'Sin exclusiva en una rectificación.', hold: 'Mantén pulsado para publicar',
        early: 'Publicado el día {d}: +{n} por adelantarte', dd: 'Día de cierre: sin bonus por adelantarte', coachOnly: 'Las odds exactas solo salen en Práctica con el Coach.',
      },
      excl: { stamp: 'EXCLUSIVA', line: 'Lo contaste primero.', lines: 'Contaste {n} primero.', followers: '+{n} seguidores', share: 'Comparte la exclusiva', feed: 'Exclusiva: {p} al {c}' },
      dd: {
        open: 'Aún abiertos: {n}', allFiled: 'Todo publicado. Aguanta.', quick: 'Publicación rápida', quickNote: 'Un toque publica tu lectura como Avanzado.',
        unresolved: 'Sin resolver', synced: 'Reloj sincronizado con la redacción · {n} s de margen', whistle: 'Pitido final. Se cerró el mercado.',
        phase: { heart: 'Treinta segundos.', quick: 'Quince. Publicación rápida activa.', tick: 'Diez.', pulse: 'Cinco.' }, left: '{n} s',
      },
      share: {
        head: 'TIER ONE #{no} · {tier} · {pts} PTS', headRoom: 'TIER ONE · {what} · {tier} · {pts} PTS', top: 'Top {p}%', streak: 'Racha de {n} días',
        excl: '{n} exclusivas', exclOne: '1 exclusiva', copy: 'Copiar resultado', copied: 'Copiado. Pégalo en el grupo.', card: 'Tu tarjeta de resultado',
        line: {
          perfect: 'Cinco de cinco', first: 'Lo contaste primero', three: '3 exclusivas', beatAll: 'Ganaste a los tres rivales', dd: 'Sobreviviste al cierre',
          spiked: 'A LA PAPELERA. El director quiere hablar contigo.', firstT1: 'Primer Tier 1', longest: 'Tu racha más larga', streak30: 'Racha de 30 días', streak100: 'Racha de 100 días',
          promoted: 'Ascenso: {rank}', room: 'Ganaste la sala', miss: 'Mayor fallo: Confirmado {o}', early: 'Lo dijiste el día {d}',
        },
      },
      why: {
        street: 'Voz de la calle: repitió la historia plantada.', agentDone: 'La agente vende traspasos. Su “Hecho” vale poco.',
        agentNeg: 'Cuando la agente dice Roto o Humo, créela.', spotterOF: 'El del aeropuerto no distingue Roto de Humo.',
        physioOF: 'El fisio no distingue Roto de Humo.', kitman: 'El utillero sabe si se va, no adónde.',
        twist: 'Dicho antes del giro: era verdad entonces, no ahora.', right: 'Apuntó bien.', rivalStreet: 'Rival de calle: falló junto al cotilleo.',
        honest: 'Un fallo honesto. Esta fuente acierta casi siempre.', title: 'Por qué te engañó',
      },
      pr: {
        k: 'OFF THE RECORD', hed: 'Nada de aquí toca tu reputación.', sub: 'Odds del Coach, análisis, Diarios pasados, códigos de tablero.',
        coachOn: 'Coach activo: odds exactas en cada carpeta', coachOff: 'Coach apagado: se siente como el Diario',
        tools: 'Lo que enseña Práctica', t1: 'Odds exactas en cada carpeta (Coach)', t2: 'Por qué te engañó cada fuente, al acabar', t3: 'Repite cualquier Diario pasado, sin ranking', t4: 'Códigos de tablero: mismo código, mismo tablero, envíaselo a un amigo',
      },
      onb: {
        firedK: 'La temporada pasada', firedH: 'Te despidieron.', firedBody: 'Fallaste la apuesta más grande del mercado. Confirmado. Portada. Fichó por otro club a las 00:03.',
        editorLine: '“Recoge tu mesa. Nada personal.”', youLine: '“Vuelvo a la portada antes del verano.”', editor: 'Tu antiguo director', you: 'Tú',
        start: 'Empezar el tablero de entrenamiento', skip: 'Saltar la historia', training: 'Tablero de entrenamiento', trainingSub: 'Un culebrón, un día. Nada cuenta.',
      },
      tut: {
        ring: 'Llama al utillero.', ringP: 'Un punto. Sabe si se va, nunca adónde. Lo que diga cae en Pruebas.',
        second: 'Llama a otro tipo de fuente.', secondP: 'Dos fuentes independientes de acuerdo: eso pide una exclusiva. La calle solo cuenta una vez.',
        read: 'Lee las pruebas.', readP: 'Sólida, dividida o floja. Luego apuesta.',
        result: 'Publicado. Ahora la consecuencia.', resultP: 'Una apuesta cuenta cuando cierra el mercado. Adelanta la semana y afróntala.',
        ff: 'Ver la consecuencia', keep: 'Jugar la semana', home: 'A la mesa', done: 'Entrenamiento hecho. El Diario de hoy te espera.',
      },
      hub: { ddSub: 'Solo en días de cierre reales · un tablero para todos', ddNext: 'Próximo: {d}', ddOff: 'Hoy no' },
      win: { calls: '{n} llamadas', noCalls: 'Sin llamadas', day: 'Día {n} de {m}', backBoard: 'Tablero', newClue: 'Guardado en la carpeta' },
      art: { portrait: 'Retrato de {n}', slot: 'Hueco de arte' },
      res: { skip: 'Toca para saltar', toDesk: 'A la mesa', copyAria: 'Copiar el texto del resultado' },
    },
  },
};

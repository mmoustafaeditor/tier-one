// Multiplayer rooms, 3.8 (brief §16–17, docs/spec/H-multiplayer-system.md): the lobby, the room page, the Press Box
// recap card and its share text, head-to-head stats, and the server's new error codes. Merges over en/ar/es and the
// older social.ts part (the room cap is 16 now; the taunt pool drops its catchphrase line; one taunt per 30 s).
// Voice: dry newsroom in EN, Egyptian colloquial in AR, Spain Spanish in ES. {n} in feed lines is a reporter's byline
// (rendered inside <bdi dir="ltr">); {p} a player's short name; {c} a call ("Confirmed Fake"); {pts} signed points.
export default {
  en: {
    rooms: {
      errors: {
        'not found': 'No room with that code.', full: 'That room is full (16).', nick: 'Pick a name first.', closed: 'That round has closed.', 'not open': 'That round isn’t open yet.',
        over: 'That room’s season is over. Ask the host to run it back.', seated: 'You already have a seat in that room on this device.', host: 'Only the host can do that.',
        'not over': 'The season isn’t over yet.', done: 'A new season already started. Join it from the feed.', round: 'No such round.', seat: 'Your seat in that room is gone.',
        forbidden: 'That seat isn’t yours.', busy: 'Try again.', net: 'Rooms need a connection.', dev: 'Rooms need a connection.', rate: 'Slow down a little.',
      },
    },
    hub: { rooms: { gone: '{n}: closed after 3 weeks without a visit' } },
    so: {
      room: {
        tauntSlow: 'One taunt every {s} seconds. Let it land.',
        taunts: ['Three sources and still wrong. Impressive.', 'I had that on day one, mate.', 'Confirmed on day two. Wrong by day seven.', 'Your barber is lying to you.', 'Filed at Confirmed on vibes. Bold.', 'The physio rang me, not you.', 'Sleep on it? You slept through it.', 'Nice front page. Shame about the score.'],
      },
      taunt: { losing: ['{rec} to me. Frame it.', 'Called {p} before you’d opened the app.', 'Your sources are my sources’ leftovers. {rec}.', 'Another round, another one on you.', 'I’d taunt you properly but I’m saving it for the table.', 'You went Confirmed. I went to sleep. {rec}.', 'Check the feed. Then check it again.', 'Confirmed on vibes again. {rec}.'] },
    },
    rm: {
      lobby: { hed: 'Your group chat, with a table.', sub: 'Same board for everyone, Daily rules, scored on our server. Best with {lo}–{hi} mates.', none: 'Start one and send the link, or join with a code from a mate.' },
      join: { sub: 'A code is five letters. An invite link fills it in.' },
      create: { cadence: 'Cadence', weekly: 'Weekly', weeklySub: 'One board a week, Monday to Sunday.', daily: 'Daily', dailySub: 'A board a day, each open 48 hours.', weeks: '{n} weeks', days: '{n} days', size: 'Best with {lo}–{hi} reporters. Hard cap {max}. Anyone can join until the last round closes.' },
      room: {
        invite: 'Invite', inviteText: 'Join my Tier One room “{room}”. Code {code}. Same board, Daily rules, one table.\n{u}', seats: '{n}/{m} seats', alone: 'Just you so far. Send the invite.',
        over: 'Season over. The table stays for {d} more days.', openH: 'Round {n} is open · {h} h left', openD: 'Round {n} is open · {d} days left', played: 'Round {n} filed · table in {h} h', soon: 'Round {n} opens {t}', closedLine: 'Round {n} has closed',
        tauntSlow: 'One taunt every {s} seconds. Let it land.', noSeat: '{n}: the host showed you the door.', rematch: 'Run it back', joinNext: 'Join the new season',
      },
      round: { missed: 'Missed · 0 pts', openFor: 'Open · {h} h left', recap: 'Press Box' },
      recap: {
        head: 'The Press Box · Round {n}', kicker: 'Round recap', title: 'THE PRESS BOX · {room} · ROUND {n}',
        scoop: 'Biggest scoop', disaster: 'Disaster of the round', first: 'First exclusive', missedT: 'Missed the round', missed: 'Missed the round: {n}',
        none: 'No call landed.', clean: 'Nobody was wrong. Suspicious.', noExcl: 'No exclusives this round.',
        scoopExcl: '{n} — Exclusive on {p} ({pts})', scoopPlain: '{n} — {c} on {p} ({pts})', disasterLine: '{n} — {c} on {p} ({pts})', firstLine: '{n} — {p}, day {d}',
        scoopExclS: '{n} — Exclusive on {p}', scoopPlainS: '{n} on {p}', disasterS: '{n} — {c}',
        exclN: '{n} exclusives', more: '+{n} more', up: 'Up {n}', down: 'Down {n}',
        share: 'Share', whatsapp: 'WhatsApp', copy: 'Copy text', copied: 'Copied. Paste it in the chat.', foot: 'Same board. Same sources. Different nerve.',
      },
      rival: {
        vs: 'Head to head in this room', wins: 'Round wins', excl: 'Exclusives', played: 'Played', none: 'No settled round with both of you in it yet.',
        runW: 'You’ve won the last {n}', runL: 'They’ve won the last {n}', level: 'Level', draws: '{n} drawn', best: 'Best round: you {a} · them {b}', kick: 'Show them the door',
      },
      feed: { exclT: 'Exclusive', excl: '{n} broke {p} first.', kick: '{n} was shown the door.', rematch: '{n} started a new season: code {code}. Tap to join.' },
    },
  },
  ar: {
    rooms: {
      errors: {
        'not found': 'مفيش أوضة بالكود ده.', full: 'الأوضة كاملة (١٦).', nick: 'اختار اسمك الأول.', closed: 'الجولة دي قفلت.', 'not open': 'الجولة دي مافتحتش لسه.',
        over: 'موسم الأوضة دي خلص. قول للمضيف يعيدها.', seated: 'إنت قاعد في الأوضة دي خلاص من الجهاز ده.', host: 'المضيف بس اللي يقدر يعمل كده.',
        'not over': 'الموسم لسه ما خلصش.', done: 'في موسم جديد بدأ خلاص. ادخله من الأخبار.', round: 'مفيش جولة بالرقم ده.', seat: 'مكانك في الأوضة دي راح.',
        forbidden: 'المكان ده مش بتاعك.', busy: 'جرّب تاني.', net: 'الأوض محتاجة نت.', dev: 'الأوض محتاجة نت.', rate: 'على مهلك شوية.',
      },
    },
    hub: { rooms: { gone: '{n}: اتقفلت بعد ٣ أسابيع من غير ما حد يفتحها' } },
    so: {
      room: {
        tauntSlow: 'رزّة واحدة كل {s} ثانية. سيبها توصل.',
        taunts: ['تلات مصادر ولسه غلطان. عظمة.', 'أنا كنت عارفها من أول يوم يا صاحبي.', 'أكّدتها يوم اتنين. وغلطت يوم سبعة.', 'الحلاق بتاعك بيكذب عليك.', 'نشرت «مؤكد» على إحساس. جرأة.', 'العلاج الطبيعي كلّمني أنا مش إنت.', 'نام عليها؟ نمت عنها خالص.', 'صفحة أولى حلوة. بس النتيجة خسارة.'],
      },
      taunt: { losing: ['{rec} ليا. علّقها على الحيطة.', 'قلت {p} قبل ما تفتح الأبلكيشن.', 'مصادرك هي بواقي مصادري. {rec}.', 'جولة كمان، وواحدة كمان عليك.', 'كنت هرزّع صح بس مخبيها للجدول.', 'إنت روحت «مؤكد». أنا روحت أنام. {rec}.', 'بص على الفيد. وبعدين بص تاني.', '«مؤكد» على إحساس تاني. {rec}.'] },
    },
    rm: {
      lobby: { hed: 'جروب الشات بتاعكم، بس بجدول.', sub: 'نفس اللوحة للكل، بقواعد اليومي، والنتيجة بتتحسب على سيرفرنا. أحلى ما تكون مع {lo}–{hi} صحاب.', none: 'افتح واحدة وابعت اللينك، أو ادخل بكود من صاحبك.' },
      join: { sub: 'الكود خمس حروف. لينك الدعوة بيكتبه لوحده.' },
      create: { cadence: 'الإيقاع', weekly: 'أسبوعي', weeklySub: 'لوحة واحدة في الأسبوع، من الاتنين للحد.', daily: 'يومي', dailySub: 'لوحة كل يوم، وكل واحدة مفتوحة ٤٨ ساعة.', weeks: '{n} أسابيع', days: '{n} أيام', size: 'أحلى ما تكون مع {lo}–{hi} صحفي. الحد الأقصى {max}. أي حد يقدر يدخل لحد ما آخر جولة تقفل.' },
      room: {
        invite: 'ادعي', inviteText: 'ادخل أوضتي على Tier One «{room}». الكود {code}. نفس اللوحة، قواعد اليومي، جدول واحد.\n{u}', seats: '{n}/{m} كراسي', alone: 'إنت لوحدك لحد دلوقتي. ابعت الدعوة.',
        over: 'الموسم خلص. الجدول هيفضل {d} يوم كمان.', openH: 'الجولة {n} مفتوحة · فاضل {h} ساعة', openD: 'الجولة {n} مفتوحة · فاضل {d} يوم', played: 'نشرت الجولة {n} · الجدول بعد {h} ساعة', soon: 'الجولة {n} بتفتح {t}', closedLine: 'الجولة {n} قفلت',
        tauntSlow: 'رزّة واحدة كل {s} ثانية. سيبها توصل.', noSeat: '{n}: المضيف طلّعك من الأوضة.', rematch: 'نعيدها تاني', joinNext: 'ادخل الموسم الجديد',
      },
      round: { missed: 'فاتتك · ٠ نقطة', openFor: 'مفتوحة · فاضل {h} ساعة', recap: 'كابينة الصحافة' },
      recap: {
        head: 'كابينة الصحافة · الجولة {n}', kicker: 'ملخص الجولة', title: 'كابينة الصحافة · {room} · الجولة {n}',
        scoop: 'أكبر انفراد', disaster: 'كارثة الجولة', first: 'أول انفراد', missedT: 'فاتتهم الجولة', missed: 'فاتتهم الجولة: {n}',
        none: 'ولا توقّع صاب.', clean: 'محدش غلط. مريب.', noExcl: 'مفيش انفرادات الجولة دي.',
        scoopExcl: '{n} — انفراد في {p} ({pts})', scoopPlain: '{n} — {c} في {p} ({pts})', disasterLine: '{n} — {c} في {p} ({pts})', firstLine: '{n} — {p}، اليوم {d}',
        scoopExclS: '{n} — انفراد في {p}', scoopPlainS: '{n} في {p}', disasterS: '{n} — {c}',
        exclN: '{n} انفرادات', more: '+{n} كمان', up: 'طلع {n}', down: 'نزل {n}',
        share: 'شارك', whatsapp: 'واتساب', copy: 'انسخ النص', copied: 'اتنسخ. حطّه في الجروب.', foot: 'نفس اللوحة. نفس المصادر. الجرأة مختلفة.',
      },
      rival: {
        vs: 'وش لوش في الأوضة دي', wins: 'جولات مكسوبة', excl: 'انفرادات', played: 'لعب', none: 'لسه مفيش جولة اتحسمت وإنتو الاتنين فيها.',
        runW: 'كسبت آخر {n}', runL: 'هو كسب آخر {n}', level: 'راس براس', draws: '{n} تعادل', best: 'أحسن جولة: إنت {a} · هو {b}', kick: 'طلّعه من الأوضة',
      },
      feed: { exclT: 'انفراد', excl: '{n} كسر خبر {p} الأول.', kick: '{n} اتطلّع من الأوضة.', rematch: '{n} فتح موسم جديد: الكود {code}. دوس عشان تدخل.' },
    },
  },
  es: {
    rooms: {
      errors: {
        'not found': 'No hay ninguna sala con ese código.', full: 'La sala está llena (16).', nick: 'Elige un nombre primero.', closed: 'Esa ronda ya cerró.', 'not open': 'Esa ronda aún no ha abierto.',
        over: 'La temporada de esa sala terminó. Pide al anfitrión que la repita.', seated: 'Ya tienes sitio en esa sala desde este dispositivo.', host: 'Solo el anfitrión puede hacer eso.',
        'not over': 'La temporada aún no ha terminado.', done: 'Ya empezó una temporada nueva. Entra desde el muro.', round: 'Esa ronda no existe.', seat: 'Tu sitio en esa sala ya no está.',
        forbidden: 'Ese sitio no es tuyo.', busy: 'Inténtalo otra vez.', net: 'Las salas necesitan conexión.', dev: 'Las salas necesitan conexión.', rate: 'Un poco más despacio.',
      },
    },
    hub: { rooms: { gone: '{n}: cerrada tras 3 semanas sin visitas' } },
    so: {
      room: {
        tauntSlow: 'Un pique cada {s} segundos. Deja que caiga.',
        taunts: ['Tres fuentes y sigues fallando. Impresionante.', 'Eso lo tenía yo el día uno, colega.', 'Confirmado el día dos. Fallado el día siete.', 'Tu barbero te miente.', 'Confirmado por intuición. Valiente.', 'A mí me llamó el fisio, no a ti.', '¿Consultarlo con la almohada? Te lo dormiste entero.', 'Bonita portada. Lástima el marcador.'],
      },
      taunt: { losing: ['{rec} para mí. Enmárcalo.', 'Dije {p} antes de que abrieras la app.', 'Tus fuentes son las sobras de las mías. {rec}.', 'Otra ronda, otra para ti.', 'Te picaría en serio, pero lo guardo para la tabla.', 'Tú fuiste a Confirmado. Yo, a dormir. {rec}.', 'Mira el muro. Luego míralo otra vez.', 'Confirmado por intuición otra vez. {rec}.'] },
    },
    rm: {
      lobby: { hed: 'Vuestro grupo de chat, con tabla.', sub: 'El mismo tablero para todos, reglas del Diario, puntuado en nuestro servidor. Mejor con {lo}–{hi} colegas.', none: 'Crea una y manda el enlace, o entra con el código de un colega.' },
      join: { sub: 'El código tiene cinco letras. El enlace de invitación lo rellena.' },
      create: { cadence: 'Ritmo', weekly: 'Semanal', weeklySub: 'Un tablero a la semana, de lunes a domingo.', daily: 'Diario', dailySub: 'Un tablero al día, cada uno abierto 48 horas.', weeks: '{n} semanas', days: '{n} días', size: 'Mejor con {lo}–{hi} periodistas. Tope {max}. Cualquiera puede entrar hasta que cierre la última ronda.' },
      room: {
        invite: 'Invitar', inviteText: 'Entra en mi sala de Tier One «{room}». Código {code}. Mismo tablero, reglas del Diario, una tabla.\n{u}', seats: '{n}/{m} sitios', alone: 'De momento solo tú. Manda la invitación.',
        over: 'Temporada terminada. La tabla sigue {d} días más.', openH: 'Ronda {n} abierta · quedan {h} h', openD: 'Ronda {n} abierta · quedan {d} días', played: 'Ronda {n} publicada · tabla en {h} h', soon: 'La ronda {n} abre {t}', closedLine: 'La ronda {n} ha cerrado',
        tauntSlow: 'Un pique cada {s} segundos. Deja que caiga.', noSeat: '{n}: el anfitrión te enseñó la puerta.', rematch: 'Repetirla', joinNext: 'Entrar en la nueva temporada',
      },
      round: { missed: 'Perdida · 0 pts', openFor: 'Abierta · quedan {h} h', recap: 'Tribuna' },
      recap: {
        head: 'La Tribuna · Ronda {n}', kicker: 'Resumen de la ronda', title: 'LA TRIBUNA · {room} · RONDA {n}',
        scoop: 'Mayor exclusiva', disaster: 'Desastre de la ronda', first: 'Primera exclusiva', missedT: 'Se perdieron la ronda', missed: 'Se perdieron la ronda: {n}',
        none: 'No cayó ninguna llamada.', clean: 'Nadie falló. Sospechoso.', noExcl: 'Sin exclusivas esta ronda.',
        scoopExcl: '{n} — Exclusiva con {p} ({pts})', scoopPlain: '{n} — {c} con {p} ({pts})', disasterLine: '{n} — {c} con {p} ({pts})', firstLine: '{n} — {p}, día {d}',
        scoopExclS: '{n} — Exclusiva con {p}', scoopPlainS: '{n} con {p}', disasterS: '{n} — {c}',
        exclN: '{n} exclusivas', more: '+{n} más', up: 'Sube {n}', down: 'Baja {n}',
        share: 'Compartir', whatsapp: 'WhatsApp', copy: 'Copiar texto', copied: 'Copiado. Pégalo en el chat.', foot: 'Mismo tablero. Mismas fuentes. Distinto valor.',
      },
      rival: {
        vs: 'Cara a cara en esta sala', wins: 'Rondas ganadas', excl: 'Exclusivas', played: 'Jugadas', none: 'Aún no hay ninguna ronda cerrada con los dos dentro.',
        runW: 'Has ganado las últimas {n}', runL: 'Ha ganado las últimas {n}', level: 'Empate', draws: '{n} empatadas', best: 'Mejor ronda: tú {a} · él {b}', kick: 'Enseñarle la puerta',
      },
      feed: { exclT: 'Exclusiva', excl: '{n} dio {p} primero.', kick: 'A {n} le enseñaron la puerta.', rematch: '{n} empezó una temporada nueva: código {code}. Toca para entrar.' },
    },
  },
};

// 3.8 shell (launch brief §25–§33, §43–§49, §54): the Home hierarchy, the five-destination bar, the morning
// briefing, the notification ask, the account protect flow and the settings sheet. Arabic is Egyptian; Spanish is Spain.
export default {
  en: {
    sh: {
      tabs: { home: 'Home', daily: 'Daily', career: 'Career', rooms: 'Rooms', me: 'My Press Card' },
      top: { wallet: '{c} coins, {k} credits. Open the Shop', menu: 'Settings', back: 'Back' },
      home: {
        kicker: 'The Daily Challenge', no: 'No. {n}', closes: 'Closes in {t}', play: 'Play today’s Daily', resume: 'Back to day {d}', result: 'See your result',
        filed: 'Filed · {p} pts', rank: '#{r} of {n}', streak: '{n}-day streak', streak0: 'Start a streak', here: '{n} reporters on it', hereOne: 'Be the first on it',
        hidden: 'Five sagas. Same board for everyone.', season: '{s} · Lv {n}', next: 'Next: {r} at Lv {n}', nextCoins: '{n} coins', nextLook: 'a look', seasonMax: 'Top of the track',
        modes: { career: 'Career Mode', market: 'Transfer Market', rooms: 'Multiplayer', practice: 'Practice' },
        sub: {
          careerNew: 'Start your comeback', careerAt: 'Ch. {c} · window {n}', careerLive: 'Window in progress',
          marketCalls: '{n} calls live', marketNone: 'Call real transfers', roomsNone: 'Play your friends', rooms1: '1 room', roomsN: '{n} rooms',
          practiceLive: 'Back to day {d}', practice: 'Off the record',
        },
        missions: 'Missions', missionsSub: '{a} of {b} done', missionsReady: '{n} to claim', shop: 'Shop', shopSub: 'Looks, never power', shopNew: 'New: {n}',
      },
      paper: {
        k: 'The morning papers', title: 'The Morning Papers', yesterday: 'Yesterday', overnight: 'Overnight', rival: 'Rival', today: 'Today’s desk',
        yRank: '{tier} · #{r}', yNoRank: '{tier} · {p} pts', yNone: 'No Daily filed', quiet: 'A quiet night on the wire', dailyNo: 'THE DAILY No. {n}', dailyDone: 'THE DAILY No. {n} · filed',
        welcome: '{d} days away. The desk kept your seat.', streakRisk: '{n}-day streak on the line', go: 'Open the desk', goPlayed: 'To the desk',
      },
      push: {
        title: 'Want a reminder when tomorrow’s desk opens?', body: 'One a day, at most. You choose what else.', yes: 'Remind me', no: 'Not now', later: 'Maybe later',
        row: 'Notifications', rowOn: 'On · {n} kinds', rowOff: 'Off', rowNo: 'Not available on this device', rowDenied: 'Blocked in your browser settings',
        topics: { daily: 'The Daily Challenge opens', streak: 'Streak at risk', market: 'A Market call settled', roomOpen: 'A room round opened', roomClose: 'A room round is closing', ddlive: 'Deadline Day Live begins' },
        done: 'Reminders on', failed: 'Couldn’t switch them on', off: 'Reminders off',
      },
      acct: {
        title: 'Protect your Press Card', body: 'Your name, streak and record live on this device. Link an email and they follow you anywhere.',
        email: 'Email address', send: 'Send me a link', sending: 'Sending…', sent: 'Check your inbox', sentBody: 'Tap the link in the email and this Press Card is yours.',
        linked: 'Protected', linkedBody: 'Linked to {e}', offline: 'Needs a connection', bad: 'That doesn’t look like an email', fail: 'Couldn’t send it. Try again.',
        claimed: 'This device was moved to another Press Card.', nudge: 'Protect your Press Card', nudgeSub: 'Keep your streak if you lose this phone',
        merged: 'Welcome back. Your record is here.',
      },
      settings: {
        k: 'The desk drawer', about: 'About', aboutLine: 'Same board for everyone. Nothing you buy changes a ranked score.', version: 'Tier One {v}',
        account: 'Account', play: 'Play', look: 'Look', howto: 'How to play',
      },
      howto: { rules: 'The full rules', step: 'Step {n} of {m}' },
      me: { season: 'Season track', seasonSub: 'Level {n} of {m}', settings: 'Settings' },
    },
  },
  ar: {
    sh: {
      tabs: { home: 'الرئيسية', daily: 'اليومي', career: 'المسيرة', rooms: 'الأوض', me: 'كارنيه الصحافة' },
      top: { wallet: '{c} كوينز و{k} كريدت. افتح المحل', menu: 'الإعدادات', back: 'رجوع' },
      home: {
        kicker: 'تحدي النهارده', no: 'رقم {n}', closes: 'بيقفل بعد {t}', play: 'العب تحدي النهارده', resume: 'ارجع لليوم {d}', result: 'شوف نتيجتك',
        filed: 'اتنشر · {p} نقطة', rank: '#{r} من {n}', streak: '{n} يوم ورا بعض', streak0: 'ابدأ سلسلة', here: '{n} صحفي عليها', hereOne: 'كن أول واحد عليها',
        hidden: 'خمس قصص. نفس اللوحة للكل.', season: '{s} · مستوى {n}', next: 'الجاي: {r} عند مستوى {n}', nextCoins: '{n} كوينز', nextLook: 'شكل جديد', seasonMax: 'آخر المسار',
        modes: { career: 'وضع المسيرة', market: 'سوق الانتقالات', rooms: 'جماعي', practice: 'تمرين' },
        sub: {
          careerNew: 'ابدأ رجوعك', careerAt: 'فصل {c} · فترة {n}', careerLive: 'فترة شغالة',
          marketCalls: '{n} توقعات شغالة', marketNone: 'توقع انتقالات حقيقية', roomsNone: 'العب مع صحابك', rooms1: 'أوضة واحدة', roomsN: '{n} أوض',
          practiceLive: 'ارجع لليوم {d}', practice: 'من غير ما يتحسب',
        },
        missions: 'المهمات', missionsSub: '{a} من {b} خلصت', missionsReady: '{n} جاهزين', shop: 'المحل', shopSub: 'أشكال، مش قوة', shopNew: 'جديد: {n}',
      },
      paper: {
        k: 'جرايد الصبح', title: 'جرايد الصبح', yesterday: 'امبارح', overnight: 'بالليل', rival: 'منافس', today: 'مكتب النهارده',
        yRank: '{tier} · #{r}', yNoRank: '{tier} · {p} نقطة', yNone: 'ملعبتش اليومي', quiet: 'ليلة هادية على الوير', dailyNo: 'تحدي النهارده رقم {n}', dailyDone: 'تحدي النهارده رقم {n} · اتنشر',
        welcome: '{d} يوم غايب. المكتب حافظ مكانك.', streakRisk: 'سلسلة {n} يوم على المحك', go: 'افتح المكتب', goPlayed: 'للمكتب',
      },
      push: {
        title: 'عايز تفكير لما مكتب بكرة يفتح؟', body: 'واحد في اليوم بالكتير. وانت اللي تختار الباقي.', yes: 'فكّرني', no: 'مش دلوقتي', later: 'يمكن بعدين',
        row: 'الإشعارات', rowOn: 'شغالة · {n} أنواع', rowOff: 'مقفولة', rowNo: 'مش متاحة على الجهاز ده', rowDenied: 'متقفلة من إعدادات المتصفح',
        topics: { daily: 'اليومي فتح', streak: 'السلسلة في خطر', market: 'توقع في السوق اتحسم', roomOpen: 'جولة أوضة فتحت', roomClose: 'جولة أوضة بتقفل', ddlive: 'يوم الديدلاين لايف بدأ' },
        done: 'التفكير شغال', failed: 'مقدرناش نشغله', off: 'التفكير مقفول',
      },
      acct: {
        title: 'احمي كارنيه الصحافة بتاعك', body: 'اسمك وسلسلتك وسجلك على الجهاز ده بس. اربط إيميل وهيمشوا معاك في أي مكان.',
        email: 'الإيميل', send: 'ابعتلي لينك', sending: 'بيتبعت…', sent: 'بص على الإيميل', sentBody: 'دوس على اللينك في الإيميل والكارنيه ده بقى بتاعك.',
        linked: 'محمي', linkedBody: 'مربوط بـ {e}', offline: 'محتاج اتصال', bad: 'ده مش شكله إيميل', fail: 'مقدرناش نبعته. جرب تاني.',
        claimed: 'الجهاز ده اتنقل لكارنيه تاني.', nudge: 'احمي كارنيه الصحافة', nudgeSub: 'خلي سلسلتك معاك لو التليفون ضاع',
        merged: 'أهلاً بيك تاني. سجلك هنا.',
      },
      settings: {
        k: 'درج المكتب', about: 'عن اللعبة', aboutLine: 'نفس اللوحة للكل. ولا حاجة تشتريها بتغير نقط الترتيب.', version: 'Tier One {v}',
        account: 'الحساب', play: 'اللعب', look: 'الشكل', howto: 'إزاي تلعب',
      },
      howto: { rules: 'القواعد كاملة', step: 'خطوة {n} من {m}' },
      me: { season: 'مسار الموسم', seasonSub: 'مستوى {n} من {m}', settings: 'الإعدادات' },
    },
  },
  es: {
    sh: {
      tabs: { home: 'Inicio', daily: 'Diario', career: 'Carrera', rooms: 'Salas', me: 'Mi carné' },
      top: { wallet: '{c} monedas, {k} créditos. Abrir la Tienda', menu: 'Ajustes', back: 'Atrás' },
      home: {
        kicker: 'El Diario', no: 'N.º {n}', closes: 'Cierra en {t}', play: 'Jugar el Diario de hoy', resume: 'Vuelve al día {d}', result: 'Ver tu resultado',
        filed: 'Publicado · {p} pts', rank: '#{r} de {n}', streak: 'Racha de {n} días', streak0: 'Empieza una racha', here: '{n} periodistas en ello', hereOne: 'Sé el primero',
        hidden: 'Cinco sagas. El mismo tablero para todos.', season: '{s} · Nv {n}', next: 'Siguiente: {r} en Nv {n}', nextCoins: '{n} monedas', nextLook: 'un estilo', seasonMax: 'Final del recorrido',
        modes: { career: 'Modo Carrera', market: 'Mercado de fichajes', rooms: 'Multijugador', practice: 'Práctica' },
        sub: {
          careerNew: 'Empieza tu regreso', careerAt: 'Cap. {c} · ventana {n}', careerLive: 'Ventana en curso',
          marketCalls: '{n} predicciones en juego', marketNone: 'Predice fichajes reales', roomsNone: 'Juega con tus amigos', rooms1: '1 sala', roomsN: '{n} salas',
          practiceLive: 'Vuelve al día {d}', practice: 'Sin que cuente',
        },
        missions: 'Misiones', missionsSub: '{a} de {b} hechas', missionsReady: '{n} por cobrar', shop: 'Tienda', shopSub: 'Estilos, nunca ventaja', shopNew: 'Nuevo: {n}',
      },
      paper: {
        k: 'La prensa de la mañana', title: 'La prensa de la mañana', yesterday: 'Ayer', overnight: 'Esta noche', rival: 'Rival', today: 'La mesa de hoy',
        yRank: '{tier} · #{r}', yNoRank: '{tier} · {p} pts', yNone: 'Sin Diario', quiet: 'Noche tranquila en el cable', dailyNo: 'EL DIARIO N.º {n}', dailyDone: 'EL DIARIO N.º {n} · publicado',
        welcome: '{d} días fuera. La mesa te guardó el sitio.', streakRisk: 'Racha de {n} días en juego', go: 'Abrir la mesa', goPlayed: 'A la mesa',
      },
      push: {
        title: '¿Te avisamos cuando abra la mesa de mañana?', body: 'Uno al día como mucho. Tú eliges el resto.', yes: 'Avísame', no: 'Ahora no', later: 'Quizá luego',
        row: 'Notificaciones', rowOn: 'Activadas · {n} tipos', rowOff: 'Desactivadas', rowNo: 'No disponible en este dispositivo', rowDenied: 'Bloqueadas en el navegador',
        topics: { daily: 'Abre el Diario', streak: 'Racha en peligro', market: 'Se resolvió una predicción', roomOpen: 'Se abrió una ronda de sala', roomClose: 'Una ronda de sala está por cerrar', ddlive: 'Empieza el Día de cierre en directo' },
        done: 'Avisos activados', failed: 'No se pudieron activar', off: 'Avisos desactivados',
      },
      acct: {
        title: 'Protege tu carné de prensa', body: 'Tu nombre, racha e historial viven en este dispositivo. Vincula un email y te siguen a cualquier parte.',
        email: 'Correo electrónico', send: 'Enviarme un enlace', sending: 'Enviando…', sent: 'Mira tu bandeja', sentBody: 'Toca el enlace del correo y este carné será tuyo.',
        linked: 'Protegido', linkedBody: 'Vinculado a {e}', offline: 'Necesita conexión', bad: 'Eso no parece un email', fail: 'No se pudo enviar. Inténtalo de nuevo.',
        claimed: 'Este dispositivo pasó a otro carné.', nudge: 'Protege tu carné de prensa', nudgeSub: 'Conserva tu racha si pierdes el móvil',
        merged: 'Bienvenido de nuevo. Tu historial está aquí.',
      },
      settings: {
        k: 'El cajón de la mesa', about: 'Acerca de', aboutLine: 'El mismo tablero para todos. Nada que compres cambia una puntuación de ranking.', version: 'Tier One {v}',
        account: 'Cuenta', play: 'Juego', look: 'Aspecto', howto: 'Cómo se juega',
      },
      howto: { rules: 'Las reglas completas', step: 'Paso {n} de {m}' },
      me: { season: 'Recorrido de temporada', seasonSub: 'Nivel {n} de {m}', settings: 'Ajustes' },
    },
  },
};

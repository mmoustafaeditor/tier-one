// 3.6 (owner decisions on the 3.x UI): four modes on Home, one-screen pages, first-time tips, Rooms-only multiplayer,
// the Career door, Transfer Market filters. Arabic is Egyptian; Spanish is Spain. Player-facing names:
// Daily Challenge · Career · Multiplayer (Rooms) · Transfer Market · Press Card · Leaderboards · Missions · Shop · Settings.
export default {
  en: {
    so: { room: { ev: { leave: '{n} left the room.' } } },
    hub: {
      page: 'Page {a} of {b}', prev: 'Previous page', next: 'Next page', back: 'Back', board: 'Leaderboard',
      tip: {
        home: 'Pick a mode. The Daily Challenge is new every day.',
        board: 'Tap a player to ring sources. Sleep moves you to the next day.',
        player: 'Ring two sources, then post your call before the rivals do.',
        career: 'Play windows to reach the goal and move up a chapter.',
        market: 'Real transfers. Filter, then tap a player to make your call.',
      },
      mode: { daily: 'Daily Challenge', career: 'Career', multi: 'Multiplayer', market: 'Transfer Market' },
      sub: {
        dailyPlay: 'Today’s five · closes in {t}', dailyFiled: 'Filed · {p} pts', dailyResume: 'Back to day {d}',
        careerNew: 'Start your comeback', careerAt: 'Chapter {c} · window {n}', careerLive: 'Window in progress',
        multiNone: 'Play friends in a room', multiN: '{n} rooms', multi1: '1 room',
        marketCalls: '{n} calls live', marketNone: 'Call real transfers before they happen',
      },
      row: { card: 'Press Card', boards: 'Leaderboards', missions: 'Missions', shop: 'Shop', settings: 'Settings' },
      daily: {
        title: 'Daily Challenge', play: 'Play today’s Daily', resume: 'Back to day {d}', read: 'See your result',
        dd: 'Deadline Day Live', ddSub: 'Sixty seconds, everyone at once', practice: 'Practice', practiceSub: 'Any board, no pressure, no rank',
      },
      missions: { title: 'Missions', reset: 'New missions at {t}', claimAll: 'Claim all', none: 'No missions today.' },
      tips: { again: 'Show tips again', againD: 'The one-line tips on each screen come back.', done: 'Tips are back' },
      expired: 'This link has expired.',
      rooms: {
        title: 'Rooms', leave: 'Leave room', leaveSure: 'Leave {n}? Your seat and results there go.', leaveYes: 'Leave', stay: 'Stay',
        left: 'You left {n}.', gone: '{n}: closed after 3 weeks without play', name: 'My room', create: 'New room', join: 'Join',
        tabs: { rounds: 'Rounds', table: 'Table', feed: 'Feed' },
      },
      boards: { daily: 'Daily', rooms: 'Rooms', wire: 'Transfer Market', roomsNone: 'Join a room to see its table here.', roomRow: '{r} of {n} · {p} pts' },
      career: {
        continue: 'Continue', newCareer: 'New career', newSure: 'Start a new career? This wipes your Career progress.', newYes: 'Wipe and start', cancel: 'Keep it',
        none: 'No career yet', where: 'You’re at {paper}, chapter {n}.', against: 'Against you: {r}.',
        need: 'You need {w} windows and {c} credibility.', needT1: 'You need {n} Tier 1 windows.', needDone: 'Nothing. You made it.',
        windows: '{n} windows played', goal: 'Goal', messages: 'Messages', more: 'More',
        case: 'Case file', record: 'Your record', sources: 'Sources', desk: 'Saves',
      },
      market: {
        tabs: { market: 'Market', mine: 'My calls' }, stars: 'Stars', heat: 'Heat', league: 'League', team: 'Team', all: 'All',
        starsN: '{n}★+', heatN: 'Heat {n}+', search: 'Search players or clubs', none: 'No transfers match.', mineNone: 'No calls yet. Pick a player in Market.',
      },
      card: { badges: 'Badges', films: 'Films', more: 'More' },
    },
  },
  ar: {
    so: { room: { ev: { leave: '{n} خرج من الأوضة.' } } },
    hub: {
      page: 'صفحة {a} من {b}', prev: 'الصفحة اللي فاتت', next: 'الصفحة الجاية', back: 'رجوع', board: 'الترتيب',
      tip: {
        home: 'اختار وضع اللعب. تحدي النهارده بيتجدد كل يوم.',
        board: 'دوس على لاعب عشان تكلم مصادرك. «نام» بتوديك لليوم اللي بعده.',
        player: 'كلم مصدرين، وبعدين انشر قبل المنافسين.',
        career: 'العب فترات انتقالات عشان توصل للهدف وتطلع فصل.',
        market: 'انتقالات حقيقية. فلتر، وبعدين دوس على لاعب وقول رأيك.',
      },
      mode: { daily: 'تحدي النهارده', career: 'المسيرة', multi: 'جماعي', market: 'سوق الانتقالات' },
      sub: {
        dailyPlay: 'خمسة النهارده · بيقفل بعد {t}', dailyFiled: 'اتنشر · {p} نقطة', dailyResume: 'ارجع لليوم {d}',
        careerNew: 'ابدأ رجوعك', careerAt: 'الفصل {c} · الفترة {n}', careerLive: 'فترة شغالة',
        multiNone: 'العب مع صحابك في أوضة', multiN: '{n} أوض', multi1: 'أوضة واحدة',
        marketCalls: '{n} توقعات شغالة', marketNone: 'توقع الانتقالات الحقيقية قبل ما تحصل',
      },
      row: { card: 'كارنيه الصحافة', boards: 'الترتيب', missions: 'المهمات', shop: 'المحل', settings: 'الإعدادات' },
      daily: {
        title: 'تحدي النهارده', play: 'العب تحدي النهارده', resume: 'ارجع لليوم {d}', read: 'شوف نتيجتك',
        dd: 'يوم الديدلاين لايف', ddSub: 'ستين ثانية، الكل مع بعض', practice: 'تمرين', practiceSub: 'أي لوحة، من غير ضغط ولا ترتيب',
      },
      missions: { title: 'المهمات', reset: 'مهمات جديدة الساعة {t}', claimAll: 'خد الكل', none: 'مفيش مهمات النهارده.' },
      tips: { again: 'ورّيني النصايح تاني', againD: 'النصيحة اللي في سطر في كل شاشة هترجع.', done: 'النصايح رجعت' },
      expired: 'اللينك ده خلص.',
      rooms: {
        title: 'الأوض', leave: 'اخرج من الأوضة', leaveSure: 'تخرج من {n}؟ مكانك ونتايجك هناك هيمشوا.', leaveYes: 'اخرج', stay: 'خليني',
        left: 'خرجت من {n}.', gone: '{n}: اتقفلت بعد ٣ أسابيع من غير لعب', name: 'أوضتي', create: 'أوضة جديدة', join: 'ادخل',
        tabs: { rounds: 'الجولات', table: 'الجدول', feed: 'الأخبار' },
      },
      boards: { daily: 'اليومي', rooms: 'الأوض', wire: 'سوق الانتقالات', roomsNone: 'ادخل أوضة عشان تشوف جدولها هنا.', roomRow: '{r} من {n} · {p} نقطة' },
      career: {
        continue: 'كمّل', newCareer: 'مسيرة جديدة', newSure: 'تبدأ مسيرة جديدة؟ ده هيمسح تقدمك في المسيرة.', newYes: 'امسح وابدأ', cancel: 'خليها',
        none: 'لسه مفيش مسيرة', where: 'انت في {paper}، الفصل {n}.', against: 'ضدك: {r}.',
        need: 'محتاج {w} فترات و{c} مصداقية.', needT1: 'محتاج {n} فترات Tier 1.', needDone: 'ولا حاجة. وصلت.',
        windows: 'لعبت {n} فترات', goal: 'الهدف', messages: 'الرسايل', more: 'كمان',
        case: 'ملف القضية', record: 'سجلك', sources: 'المصادر', desk: 'الحفظ',
      },
      market: {
        tabs: { market: 'السوق', mine: 'توقعاتي' }, stars: 'النجوم', heat: 'السخونية', league: 'الدوري', team: 'الفريق', all: 'الكل',
        starsN: '{n}★+', heatN: 'سخونية {n}+', search: 'دوّر على لاعب أو نادي', none: 'مفيش انتقالات بالشكل ده.', mineNone: 'لسه مفيش توقعات. اختار لاعب من السوق.',
      },
      card: { badges: 'الشارات', films: 'الأفلام', more: 'كمان' },
    },
  },
  es: {
    so: { room: { ev: { leave: '{n} ha salido de la sala.' } } },
    hub: {
      page: 'Página {a} de {b}', prev: 'Página anterior', next: 'Página siguiente', back: 'Atrás', board: 'Clasificación',
      tip: {
        home: 'Elige un modo. El Reto diario cambia cada día.',
        board: 'Toca un jugador para llamar a tus fuentes. Dormir te lleva al día siguiente.',
        player: 'Llama a dos fuentes y publica antes que los rivales.',
        career: 'Juega ventanas para cumplir el objetivo y subir de capítulo.',
        market: 'Fichajes reales. Filtra y toca un jugador para dar tu predicción.',
      },
      mode: { daily: 'Reto diario', career: 'Carrera', multi: 'Multijugador', market: 'Mercado de fichajes' },
      sub: {
        dailyPlay: 'Los cinco de hoy · cierra en {t}', dailyFiled: 'Publicado · {p} pts', dailyResume: 'Vuelve al día {d}',
        careerNew: 'Empieza tu regreso', careerAt: 'Capítulo {c} · ventana {n}', careerLive: 'Ventana en curso',
        multiNone: 'Juega con amigos en una sala', multiN: '{n} salas', multi1: '1 sala',
        marketCalls: '{n} predicciones en juego', marketNone: 'Predice fichajes reales antes de que pasen',
      },
      row: { card: 'Carné de prensa', boards: 'Clasificaciones', missions: 'Misiones', shop: 'Tienda', settings: 'Ajustes' },
      daily: {
        title: 'Reto diario', play: 'Jugar el reto de hoy', resume: 'Vuelve al día {d}', read: 'Ver tu resultado',
        dd: 'Día de cierre en directo', ddSub: 'Sesenta segundos, todos a la vez', practice: 'Práctica', practiceSub: 'Cualquier tablero, sin presión ni ranking',
      },
      missions: { title: 'Misiones', reset: 'Misiones nuevas a las {t}', claimAll: 'Cobrar todo', none: 'Hoy no hay misiones.' },
      tips: { again: 'Volver a mostrar consejos', againD: 'Vuelven los consejos de una línea de cada pantalla.', done: 'Consejos activados' },
      expired: 'Este enlace ha caducado.',
      rooms: {
        title: 'Salas', leave: 'Salir de la sala', leaveSure: '¿Salir de {n}? Pierdes tu sitio y tus resultados allí.', leaveYes: 'Salir', stay: 'Quedarme',
        left: 'Has salido de {n}.', gone: '{n}: cerrada tras 3 semanas sin jugar', name: 'Mi sala', create: 'Sala nueva', join: 'Entrar',
        tabs: { rounds: 'Rondas', table: 'Tabla', feed: 'Novedades' },
      },
      boards: { daily: 'Diario', rooms: 'Salas', wire: 'Mercado de fichajes', roomsNone: 'Entra en una sala para ver aquí su tabla.', roomRow: '{r} de {n} · {p} pts' },
      career: {
        continue: 'Continuar', newCareer: 'Nueva carrera', newSure: '¿Empezar una carrera nueva? Se borra tu progreso de Carrera.', newYes: 'Borrar y empezar', cancel: 'Mantenerla',
        none: 'Aún no hay carrera', where: 'Estás en {paper}, capítulo {n}.', against: 'Contra ti: {r}.',
        need: 'Necesitas {w} ventanas y {c} de credibilidad.', needT1: 'Necesitas {n} ventanas de Tier 1.', needDone: 'Nada. Lo lograste.',
        windows: '{n} ventanas jugadas', goal: 'Objetivo', messages: 'Mensajes', more: 'Más',
        case: 'El expediente', record: 'Tu historial', sources: 'Fuentes', desk: 'Partidas',
      },
      market: {
        tabs: { market: 'Mercado', mine: 'Mis predicciones' }, stars: 'Estrellas', heat: 'Calor', league: 'Liga', team: 'Equipo', all: 'Todas',
        starsN: '{n}★+', heatN: 'Calor {n}+', search: 'Busca jugadores o clubes', none: 'Ningún fichaje coincide.', mineNone: 'Aún no hay predicciones. Elige un jugador en Mercado.',
      },
      card: { badges: 'Insignias', films: 'Películas', more: 'Más' },
    },
  },
};

// 3.1 secondary screens: Wire, Friends (rooms + league), Practice, Pass, How to play, Settings.
// Voice: short, cheeky, newsroom. Arabic is Egyptian colloquial; Spanish is Spain Spanish.
export default {
  en: {
    g: {
      wire: {
        k: 'Real rumours', hed: 'Call it before it happens.', sub: 'Real transfer talk. Say YES or NO before the news breaks. Beat the Market, bank Cred.',
        how: ['Pick YES or NO', 'Choose how loud', 'Real news settles it'],
        live: 'Your live calls', pnl: 'Paper P&L', wall: 'The evidence wall', wallAside: 'Hottest first', heat: 'Heat', market: 'Market',
        stage: { interest: 'Keen', talks: 'Talks', bid: 'Bid in', agreed: 'Fee agreed' },
        you: 'You: {s}', yesSub: 'He moves', noSub: 'He stays', closed: 'Closed to new calls',
        left: '{n} of {m} calls left today', step1: 'Does he move?', step2: 'Extra credit', step2Aside: 'Optional', step3: 'How loud?',
        ifRight: 'If right', ifWrong: 'If wrong', crowd: 'The crowd', evidence: 'The evidence', reported: 'Reported by', linked: 'Linked clubs',
        scored: 'How’s this scored?', locked: 'Locked at {m}%', now: 'Market now {m}%', close: 'Close', empty: 'No calls yet. File early, when the Market is most wrong.',
        yourCall: 'Your call', settledPts: 'Settled',
      },
      rooms: {
        tabs: { rooms: 'Rooms', league: 'League' }, k: 'Play friends', hed: 'Same board. One table. Bragging rights.', sub: 'Daily rules exactly. One shared board per round, open 48 hours.',
        byline: 'Your byline', joinT: 'Got a code?', joinSub: 'A mate sent you one', createT: 'Start a room', createSub: 'Name it, pick the rounds, send the code',
        reporters: '{n} reporters', copy: 'Copy invite', copied: 'Invite copied', roundsT: 'Rounds', table: 'Standings', code: 'Code',
        state: { open: 'Open now', soon: 'Soon', closed: 'Closed', played: 'Filed' },
        leagueK: 'The weekly league', leagueSub: 'Top {u} go up, bottom {d} go down on Sunday night.', leagueUp: 'Top {u} go up on Sunday night.', leagueDown: 'Bottom {d} go down on Sunday night.', week: 'Week {w}', how: 'How points work',
        daily: 'Daily', wire: 'Wire',
      },
      practice: {
        k: 'Off the record', hed: 'Nothing counts. Everything teaches.', sub: 'A fresh board, no pressure, nothing on your record.',
        coachOn: 'On · odds shown on every saga', coachOff: 'Off · play it blind', codeT: 'Play a board code', pastT: 'Replay a past Daily', ago: '{n}d ago',
        played: '{n} played',
      },
      pass: {
        k: 'Season', hed: 'Level {n}', of: 'of 40', toNext: '{n} XP to level {l}', maxed: 'Top of the track',
        track: 'Season track', trackAside: '{s}', free: 'Free', lane: 'Pass', coins: '+{n}', here: 'You', xpEach: 'Every mode earns XP. 100 XP a level.',
        wallet: 'Wallet', shop: 'The shop', passT: 'Semba Pass', packs: 'Credit packs', recent: 'Recent', buyNow: 'Buy',
      },
      howto: {
        k: 'How to play', hed: 'How Tier One works in 60 seconds', swipe: 'Swipe', step: 'Step {n} of {m}', next: 'Next', prev: 'Back', go: 'Try it in Practice',
        steps: [
          ['Ring your sources', 'Spend contact points calling the kit man, the barber, the agent and friends.', 'The physio says: “Medical at Chelsea.”'],
          ['Read the evidence', 'Every answer adds a tally to one outcome. Street voices repeat each other, so count the street once.', 'Done ✓✓ · Hijack ✓ · Off · Fake'],
          ['Pick what happens', 'Exactly one is true: Done, Hijack, Off or Fake.', 'Done: he signs for the club in the story.'],
          ['Pick how loud', 'Talks, Advanced or Confirmed. Louder pays more and hurts more.', 'Confirmed and right: +{b}, plus +{e} for each day left. Wrong: −{l}.'],
          ['Beat the rivals', 'Post before the rivals for an exclusive, then survive a 60-second Deadline Day.', 'First right Confirmed call: +{x} exclusive.'],
        ],
        full: 'The full rules', fullSub: 'Every number, read from the rules the game runs on.',
      },
      settings: {
        k: 'The desk drawer', edition: { auto: 'Auto', morning: 'Morning', late: 'Late' }, soundD: 'Rings, stamps and the Deadline Day siren', motionD: 'Calmer screens, no shake or confetti',
        version: 'Version',
      },
    },
  },
  ar: {
    g: {
      wire: {
        k: 'إشاعات حقيقية', hed: 'قولها قبل ما تحصل.', sub: 'كلام انتقالات حقيقي. قول آه أو لأ قبل الخبر ما ينزل. اغلب السوق واكسب مصداقية.',
        how: ['اختار آه أو لأ', 'اختار صوتك عالي قد إيه', 'الأخبار الحقيقية بتحسمها'],
        live: 'توقعاتك الشغالة', pnl: 'مكسب على الورق', wall: 'حيطة الأدلة', wallAside: 'الأسخن الأول', heat: 'السخونية', market: 'السوق',
        stage: { interest: 'مهتم', talks: 'مفاوضات', bid: 'عرض رسمي', agreed: 'اتفقوا على المبلغ' },
        you: 'إنت: {s}', yesSub: 'هيتنقل', noSub: 'هيفضل', closed: 'مقفولة للتوقعات الجديدة',
        left: 'فاضلك {n} من {m} توقعات النهارده', step1: 'هيتنقل ولا لأ؟', step2: 'نقط زيادة', step2Aside: 'اختياري', step3: 'صوتك عالي قد إيه؟',
        ifRight: 'لو صح', ifWrong: 'لو غلط', crowd: 'الناس', evidence: 'الأدلة', reported: 'مين نشر', linked: 'الأندية المرتبطة',
        scored: 'النقط بتتحسب إزاي؟', locked: 'اتقفل على {m}%', now: 'السوق دلوقتي {m}%', close: 'اقفل', empty: 'مفيش توقعات لسه. سجّل بدري، لما السوق يكون غلطان أكتر.',
        yourCall: 'توقعك', settledPts: 'اتحسمت',
      },
      rooms: {
        tabs: { rooms: 'الأوض', league: 'الدوري' }, k: 'العب مع صحابك', hed: 'نفس اللوحة. ترتيب واحد. وحق التريقة.', sub: 'نفس قواعد اليومي بالظبط. لوحة واحدة لكل جولة، مفتوحة ٤٨ ساعة.',
        byline: 'اسمك الصحفي', joinT: 'معاك كود؟', joinSub: 'واحد صاحبك بعتهولك', createT: 'افتح أوضة', createSub: 'سمّيها، اختار الجولات، وابعت الكود',
        reporters: '{n} صحفيين', copy: 'انسخ الدعوة', copied: 'الدعوة اتنسخت', roundsT: 'الجولات', table: 'الترتيب', code: 'الكود',
        state: { open: 'مفتوحة دلوقتي', soon: 'قريب', closed: 'اتقفلت', played: 'اتسجلت' },
        leagueK: 'الدوري الأسبوعي', leagueSub: 'أول {u} بيطلعوا وآخر {d} بينزلوا ليلة الحد.', leagueUp: 'أول {u} بيطلعوا ليلة الحد.', leagueDown: 'آخر {d} بينزلوا ليلة الحد.', week: 'أسبوع {w}', how: 'النقط بتتحسب إزاي',
        daily: 'اليومي', wire: 'الواير',
      },
      practice: {
        k: 'بعيد عن الريكورد', hed: 'مفيش حاجة بتتحسب. كل حاجة بتعلّم.', sub: 'لوحة جديدة، من غير ضغط، ومش هتتسجل عليك.',
        coachOn: 'شغال · الاحتمالات باينة في كل قصة', coachOff: 'مقفول · العب على عماك', codeT: 'العب بكود لوحة', pastT: 'العب يومي قديم تاني', ago: 'من {n} يوم',
        played: 'لعبت {n}',
      },
      pass: {
        k: 'الموسم', hed: 'المستوى {n}', of: 'من ٤٠', toNext: 'فاضل {n} XP للمستوى {l}', maxed: 'في آخر المسار',
        track: 'مسار الموسم', trackAside: '{s}', free: 'مجاني', lane: 'الباس', coins: '+{n}', here: 'إنت', xpEach: 'كل وضع بيديك XP. ١٠٠ XP للمستوى.',
        wallet: 'المحفظة', shop: 'المحل', passT: 'سيمبا باس', packs: 'باقات الكريدت', recent: 'آخر حاجات', buyNow: 'اشتري',
      },
      howto: {
        k: 'إزاي تلعب', hed: 'تير وان في ٦٠ ثانية', swipe: 'اسحب', step: 'خطوة {n} من {m}', next: 'اللي بعده', prev: 'رجوع', go: 'جرّبها في التمرين',
        steps: [
          ['كلّم مصادرك', 'اصرف نقط الاتصال وكلّم مسؤول المهمات والحلاق والوكيل وغيرهم.', 'أخصائي العلاج بيقول: «كشف طبي في تشيلسي».'],
          ['اقرا الأدلة', 'كل إجابة بتزوّد علامة لنتيجة. كلام الشارع بيكرر بعضه، فاحسب الشارع مرة واحدة.', 'تمّت ✓✓ · اتخطف ✓ · باظت · فشنك'],
          ['اختار اللي هيحصل', 'حاجة واحدة بس صح: تمّت، اتخطف، باظت أو فشنك.', 'تمّت: هيمضي للنادي اللي في القصة.'],
          ['اختار صوتك', 'مفاوضات، متقدمة أو مؤكدة. كل ما صوتك يعلى المكسب يزيد والخسارة كمان.', 'مؤكدة وصح: +{b}، و+{e} لكل يوم فاضل. غلط: −{l}.'],
          ['اسبق المنافسين', 'انشر قبل المنافسين عشان تاخد انفراد، وبعدين اصمد في يوم الديدلاين ٦٠ ثانية.', 'أول توقع مؤكد صح: +{x} انفراد.'],
        ],
        full: 'القواعد كاملة', fullSub: 'كل رقم هنا جاي من القواعد اللي اللعبة شغالة بيها.',
      },
      settings: {
        k: 'درج المكتب', edition: { auto: 'تلقائي', morning: 'الصبح', late: 'بالليل' }, soundD: 'رنات وأختام وسارينة يوم الديدلاين', motionD: 'شاشات أهدى، من غير هز ولا كونفيتي',
        version: 'الإصدار',
      },
    },
  },
  es: {
    g: {
      wire: {
        k: 'Rumores reales', hed: 'Cántalo antes de que pase.', sub: 'Rumores de fichajes reales. Di SÍ o NO antes de que salte la noticia. Gana al Mercado y suma Crédito.',
        how: ['Elige SÍ o NO', 'Elige cuánto te mojas', 'La noticia real lo decide'],
        live: 'Tus apuestas vivas', pnl: 'Saldo en papel', wall: 'El muro de pruebas', wallAside: 'Lo más caliente primero', heat: 'Calor', market: 'Mercado',
        stage: { interest: 'Interés', talks: 'Negociación', bid: 'Oferta', agreed: 'Precio cerrado' },
        you: 'Tú: {s}', yesSub: 'Se va', noSub: 'Se queda', closed: 'Cerrado a nuevas apuestas',
        left: 'Te quedan {n} de {m} apuestas hoy', step1: '¿Se va?', step2: 'Puntos extra', step2Aside: 'Opcional', step3: '¿Cuánto te mojas?',
        ifRight: 'Si aciertas', ifWrong: 'Si fallas', crowd: 'La gente', evidence: 'Las pruebas', reported: 'Lo publican', linked: 'Clubes vinculados',
        scored: '¿Cómo se puntúa?', locked: 'Fijado al {m}%', now: 'Mercado ahora {m}%', close: 'Cerrar', empty: 'Aún no has apostado. Hazlo pronto, cuando el Mercado más se equivoca.',
        yourCall: 'Tu apuesta', settledPts: 'Resuelta',
      },
      rooms: {
        tabs: { rooms: 'Salas', league: 'Liga' }, k: 'Juega con amigos', hed: 'El mismo tablero. Una tabla. A presumir.', sub: 'Las reglas del Diario, tal cual. Un tablero compartido por ronda, abierto 48 horas.',
        byline: 'Tu firma', joinT: '¿Tienes un código?', joinSub: 'Te lo ha pasado un colega', createT: 'Crea una sala', createSub: 'Ponle nombre, elige rondas y pasa el código',
        reporters: '{n} periodistas', copy: 'Copiar invitación', copied: 'Invitación copiada', roundsT: 'Rondas', table: 'Clasificación', code: 'Código',
        state: { open: 'Abierta', soon: 'Pronto', closed: 'Cerrada', played: 'Enviada' },
        leagueK: 'La liga semanal', leagueSub: 'Los {u} primeros suben y los {d} últimos bajan el domingo por la noche.', leagueUp: 'Los {u} primeros suben el domingo por la noche.', leagueDown: 'Los {d} últimos bajan el domingo por la noche.', week: 'Semana {w}', how: 'Cómo se puntúa',
        daily: 'Diario', wire: 'Wire',
      },
      practice: {
        k: 'Extraoficial', hed: 'Nada cuenta. Todo enseña.', sub: 'Un tablero nuevo, sin presión y sin que quede registrado.',
        coachOn: 'Activado · verás las probabilidades', coachOff: 'Desactivado · a ciegas', codeT: 'Juega un código de tablero', pastT: 'Repite un Diario pasado', ago: 'hace {n} d',
        played: '{n} jugadas',
      },
      pass: {
        k: 'Temporada', hed: 'Nivel {n}', of: 'de 40', toNext: '{n} XP para el nivel {l}', maxed: 'Arriba del todo',
        track: 'Camino de temporada', trackAside: '{s}', free: 'Gratis', lane: 'Pase', coins: '+{n}', here: 'Tú', xpEach: 'Todos los modos dan XP. 100 XP por nivel.',
        wallet: 'Monedero', shop: 'La tienda', passT: 'Semba Pass', packs: 'Packs de créditos', recent: 'Recientes', buyNow: 'Comprar',
      },
      howto: {
        k: 'Cómo se juega', hed: 'Tier One en 60 segundos', swipe: 'Desliza', step: 'Paso {n} de {m}', next: 'Siguiente', prev: 'Atrás', go: 'Pruébalo en Práctica',
        steps: [
          ['Llama a tus fuentes', 'Gasta puntos de contacto llamando al utillero, al barbero, al agente y compañía.', 'El fisio dice: «Reconocimiento en el Chelsea».'],
          ['Lee las pruebas', 'Cada respuesta suma una marca a un desenlace. Las voces de la calle se repiten, así que cuenta la calle una vez.', 'Hecho ✓✓ · Robo ✓ · Roto · Humo'],
          ['Elige qué pasa', 'Solo una es verdad: Hecho, Robo, Roto o Humo.', 'Hecho: firma por el club de la historia.'],
          ['Elige cuánto te mojas', 'Contactos, Avanzado o Confirmado. Cuanto más alto, más ganas y más pierdes.', 'Confirmado y aciertas: +{b}, más +{e} por cada día que quede. Si fallas: −{l}.'],
          ['Gana a los rivales', 'Publica antes que los rivales para una exclusiva y sobrevive a un Deadline Day de 60 segundos.', 'Primer Confirmado acertado: +{x} de exclusiva.'],
        ],
        full: 'Las reglas completas', fullSub: 'Cada número sale de las reglas con las que funciona el juego.',
      },
      settings: {
        k: 'El cajón de la mesa', edition: { auto: 'Auto', morning: 'Mañana', late: 'Noche' }, soundD: 'Timbres, sellos y la sirena del Deadline Day', motionD: 'Pantallas más tranquilas, sin temblores ni confeti',
        version: 'Versión',
      },
    },
  },
};

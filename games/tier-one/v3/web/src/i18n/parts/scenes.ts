// 3.3 cutscenes (src/film): the cold open, the five contact intros, the season opener, the replay list and the player.
// Scene text is passed to the frame-driven scenes as props, so the game and the Remotion film render every language.
// Voice: newsroom, dry, short. The editor is gruff; each source sounds like themselves. AR is Egyptian colloquial.
export default {
  en: {
    film: {
      skip: 'Skip', continue: 'Continue', next: 'Tap for the next shot',
      name: { coldopen: 'First day at the paper', 'coldopen-career': 'A new desk', source: 'Meet {n}', season: '{n}' },
      gallery: { title: 'Cutscenes', aside: 'Replay the ones you’ve seen', play: 'Replay', locked: 'Plays when you get there' },
      cold: {
        memo: 'From the editor’s desk', note: 'Desk’s yours from tonight. Five people will call you with tips. Believe two of them.', sign: '— The Editor',
        by: 'By {n}', headline: '{n} joins the transfer desk', night: 'Night desk', anon: 'New reporter', stamp: 'TIER ONE',
        careerNote: 'New paper, same rules. Get it right before anyone else does.', careerHeadline: '{n} opens for business',
      },
      source: {
        calling: 'Incoming call', unknown: 'Unknown number',
        kitman: { trait: 'Washes the shirts. Counts the new ones.', line: '“New number’s been printed. Can’t say whose.”' },
        barber: { trait: 'Hears everything the street hears. Repeats most of it.', line: '“Chair three swears he’s signing. Chair four swears he isn’t.”' },
        agent: { trait: 'Sells moves for a living. Always has a flight to catch.', line: '“Between us? It’s done. It’s always done.”' },
        spotter: { trait: 'Lives at arrivals. Never wrong about a private jet.', line: '“Tail number checks out. Landed eight minutes ago.”' },
        physio: { trait: 'Sees the medicals. Says less than she knows.', line: '“Knee’s fine. Heart’s fine. The paperwork’s the problem.”' },
      },
      season: {
        kicker: 'New season',
        names: { rumour: 'The Rumour Mill', winter: 'Winter Window', spring: 'Spring Whispers', summer: 'Summer Window' },
        clips: ['Striker spotted at the airport', 'Agent flies in for talks', 'Medical booked for Monday', 'Barber says the fee is agreed', 'New shirt number printed', 'Club denies everything'],
      },
      hwg: { hwg: 'DONE DEAL!', called: 'Called it first', post: '{p} to {c}. Contracts signed, medical done.' },
    },
  },
  ar: {
    film: {
      skip: 'تخطّي', continue: 'كمّل', next: 'دوس للّقطة اللي بعدها',
      name: { coldopen: 'أول يوم في الجورنال', 'coldopen-career': 'مكتب جديد', source: 'اتعرّف على {n}', season: '{n}' },
      gallery: { title: 'المشاهد', aside: 'اتفرّج تاني على اللي شفته', play: 'اتفرّج تاني', locked: 'هيشتغل لما توصل له' },
      cold: {
        memo: 'من مكتب رئيس التحرير', note: 'المكتب بتاعك من النهارده. خمسة هيكلّموك بأخبار. صدّق اتنين منهم بس.', sign: '— رئيس التحرير',
        by: 'بقلم {n}', headline: '{n} ينضم لديسك الانتقالات', night: 'وردية الليل', anon: 'صحفي جديد', stamp: 'TIER ONE',
        careerNote: 'جورنال جديد، نفس القواعد. اعرف الخبر قبل أي حد.', careerHeadline: '{n} فتح أبوابه',
      },
      source: {
        calling: 'مكالمة جاية', unknown: 'رقم مش متسجّل',
        kitman: { trait: 'بيغسل الفانلات. وبيعدّ الجديدة.', line: '«فيه رقم جديد اتطبع. مقدرش أقول بتاع مين.»' },
        barber: { trait: 'بيسمع كل اللي الشارع بيسمعه. وبيعيد أغلبه.', line: '«اللي على الكرسي تلاتة حالف إنه هيمضي، واللي على أربعة حالف إنه لأ.»' },
        agent: { trait: 'شغلته يبيع صفقات. ودايمًا وراه طيارة.', line: '«بيني وبينك؟ خلصت. دايمًا بتبقى خلصت.»' },
        spotter: { trait: 'عايش في صالة الوصول. عمره ما غلط في طيارة خاصة.', line: '«رقم الطيارة مظبوط. نزلت من تمن دقايق.»' },
        physio: { trait: 'بتشوف الكشف الطبي. وبتقول أقل من اللي تعرفه.', line: '«الركبة تمام. القلب تمام. المشكلة في الورق.»' },
      },
      season: {
        kicker: 'موسم جديد',
        names: { rumour: 'طاحونة الإشاعات', winter: 'ميركاتو الشتا', spring: 'همسات الربيع', summer: 'ميركاتو الصيف' },
        clips: ['المهاجم اتشاف في المطار', 'الوكيل جاي بطيارة عشان يتفاوض', 'الكشف الطبي يوم الاتنين', 'الحلاق بيقول اتفقوا على المبلغ', 'رقم فانلة جديد اتطبع', 'النادي بينفي كل حاجة'],
      },
      hwg: { hwg: 'DONE DEAL!', called: 'أنا اللي قلتها الأول', post: '{p} رايح {c}. العقود اتمضت والكشف الطبي خلص.' },
    },
  },
  es: {
    film: {
      skip: 'Saltar', continue: 'Continuar', next: 'Toca para la siguiente toma',
      name: { coldopen: 'Primer día en el periódico', 'coldopen-career': 'Una mesa nueva', source: 'Conoce a {n}', season: '{n}' },
      gallery: { title: 'Escenas', aside: 'Vuelve a ver las que ya viste', play: 'Ver otra vez', locked: 'Se verá cuando llegues' },
      cold: {
        memo: 'Desde la mesa del director', note: 'Desde esta noche la mesa es tuya. Cinco personas te llamarán con soplos. Créete a dos.', sign: '— El Director',
        by: 'Por {n}', headline: '{n} se une a la sección de fichajes', night: 'Turno de noche', anon: 'Nuevo reportero', stamp: 'TIER ONE',
        careerNote: 'Periódico nuevo, mismas reglas. Acierta antes que nadie.', careerHeadline: '{n} abre sus puertas',
      },
      source: {
        calling: 'Llamada entrante', unknown: 'Número desconocido',
        kitman: { trait: 'Lava las camisetas. Cuenta las nuevas.', line: '«Ya han impreso un dorsal nuevo. No puedo decir de quién.»' },
        barber: { trait: 'Oye todo lo que oye la calle. Repite casi todo.', line: '«El de la silla tres jura que firma. El de la cuatro jura que no.»' },
        agent: { trait: 'Vende fichajes para vivir. Siempre tiene un vuelo que coger.', line: '«¿Entre nosotros? Está hecho. Siempre está hecho.»' },
        spotter: { trait: 'Vive en la zona de llegadas. Nunca falla con un jet privado.', line: '«La matrícula cuadra. Aterrizó hace ocho minutos.»' },
        physio: { trait: 'Ve los reconocimientos. Dice menos de lo que sabe.', line: '«La rodilla, bien. El corazón, bien. El problema son los papeles.»' },
      },
      season: {
        kicker: 'Nueva temporada',
        names: { rumour: 'El Molino de Rumores', winter: 'Mercado de Invierno', spring: 'Susurros de Primavera', summer: 'Mercado de Verano' },
        clips: ['Ven al delantero en el aeropuerto', 'El agente vuela para negociar', 'Reconocimiento médico el lunes', 'El barbero dice que hay acuerdo', 'Imprimen un dorsal nuevo', 'El club lo niega todo'],
      },
      hwg: { hwg: 'DONE DEAL!', called: 'Lo dije primero', post: '{p} al {c}. Contratos firmados, reconocimiento superado.' },
    },
  },
};

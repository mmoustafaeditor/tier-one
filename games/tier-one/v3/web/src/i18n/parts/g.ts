// 3.1 game layer: shell, Home, Me, missions, Story chapter names. Voice: short, cheeky, newsroom.
export default {
  en: {
    g: {
      coins: '{n} coins', level: 'Level {n}', lv: 'Lv {n}',
      tabs: { home: 'Home', story: 'Story', wire: 'Wire', friends: 'Friends', me: 'Me' },
      home: {
        noName: 'New reporter', freelance: 'Freelance · no paper yet', xp: 'XP {a}/{b}', followers: '{n} followers', streak: 'Streak',
        dailyNo: 'The Daily · No. {n}', todaysFive: 'Today’s five', filed: 'Filed.', tag: 'Five transfer sagas. Some are lying. Break them first or get ratio’d trying.',
        filedSub: '{p} points {r}', weekAria: 'This week', dow: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        play: 'Open the phones', resume: 'Back to day {d}', seePage: 'See your front page', fair: 'Same five for everyone · about 6 min', tomorrow: 'New five at 00:00 UTC',
        missions: 'Today’s missions', missionsReset: 'Reset at 00:00', claimed: 'Claimed', modes: 'Your desk',
        storyK: 'Story mode', storyNew: 'You blew it last season. Win it all back.', storySub: 'Chapter {c} · {name}',
        wireK: 'Real rumours', wireSub: 'Call real transfers before they happen', wireLive: '{n} calls live',
        roomsK: 'Play friends', roomsSub: 'Same board, one table', leaguePos: '{r} in your league',
        practiceK: 'No pressure', practiceSub: 'Coach shows the odds',
        passK: 'Season', passT: 'Pass & kit', passSub: 'Tier {n} of 40',
        tick: { interest: 'linked with {c}', talks: 'in talks with {c}', bid: 'bid from {c}', agreed: 'fee agreed with {c}' },
      },
      missions: {
        daily: 'Play today’s Daily', right3: 'Get {n} calls right', excl: 'Land an exclusive', confRight: 'Be right on a Confirmed call',
        physio: 'Ring the physio {n} times', spotter: 'Ring the airport spotter {n} times', barber: 'Ring the barber {n} times', agent: 'Ring the agent {n} times',
        practice: 'Play a Practice board', story: 'Play a Story window', wire: 'File a call on the Wire', twist: 'Be right on a twisted saga', room: 'Play a Friends room',
      },
      story: { ch: {
        blog: { name: 'Ch. 1 · The Blog' }, comeback: { name: 'Ch. 2 · The Comeback' }, stringer: { name: 'Ch. 3 · Stringer' },
        rival: { name: 'Ch. 4 · The Rival' }, chronicle: { name: 'Ch. 5 · Back at The Chronicle' }, front: { name: 'Ch. 6 · The Front Page' },
      } },
      me: {
        pressCard: 'Press card', level: 'Level', maxed: 'Max level', streak: 'Day streak', best: 'Best {n}', dailies: 'Dailies', t1s: '{n} × Tier 1', bestScore: 'Best score', points: 'points',
        followers: 'Followers', rep: 'Credibility {n}', noStory: 'Start Story mode', pass: 'Pass & store', training: 'Replay the training',
      },
    },
  },
  ar: {
    g: {
      coins: '{n} عملة', level: 'المستوى {n}', lv: 'مستوى {n}',
      tabs: { home: 'الرئيسية', story: 'القصة', wire: 'الوكالة', friends: 'الصحاب', me: 'أنا' },
      home: {
        noName: 'صحفي جديد', freelance: 'فري لانس · من غير جرنال لسه', xp: 'خبرة {a}/{b}', followers: '{n} متابع', streak: 'السلسلة',
        dailyNo: 'التحدي اليومي · رقم {n}', todaysFive: 'خمسة النهارده', filed: 'اتقفل.', tag: 'خمس صفقات. فيهم كدب. اكشفهم الأول ولا هتبقى تريند بالغلط.',
        filedSub: '{p} نقطة {r}', weekAria: 'الأسبوع ده', dow: ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'],
        play: 'افتح التليفونات', resume: 'ارجع لليوم {d}', seePage: 'شوف صفحتك الأولى', fair: 'نفس الخمسة للكل · حوالي ٦ دقايق', tomorrow: 'خمسة جداد الساعة ٠٠:٠٠ UTC',
        missions: 'مهام النهارده', missionsReset: 'بتتجدد ٠٠:٠٠', claimed: 'اتاخدت', modes: 'مكتبك',
        storyK: 'وضع القصة', storyNew: 'بوظتها الموسم اللي فات. رجّع كل حاجة.', storySub: 'الفصل {c} · {name}',
        wireK: 'إشاعات حقيقية', wireSub: 'اتوقع صفقات حقيقية قبل ما تحصل', wireLive: '{n} توقع شغال',
        roomsK: 'العب مع صحابك', roomsSub: 'نفس اللوحة، ترابيزة واحدة', leaguePos: 'المركز {r} في دوريك',
        practiceK: 'من غير ضغط', practiceSub: 'المدرب بيوريك النسب',
        passK: 'الموسم', passT: 'الباس واللبس', passSub: 'المرحلة {n} من ٤٠',
        tick: { interest: 'مرتبط بـ{c}', talks: 'في مفاوضات مع {c}', bid: 'عرض من {c}', agreed: 'اتفقوا على المبلغ مع {c}' },
      },
      missions: {
        daily: 'العب تحدي النهارده', right3: 'صيب في {n} توقعات', excl: 'اعمل سبق صحفي', confRight: 'صيب في توقع «مؤكد»',
        physio: 'كلم أخصائي العلاج {n} مرات', spotter: 'كلم مراقب المطار {n} مرات', barber: 'كلم الحلاق {n} مرات', agent: 'كلم الوكيل {n} مرات',
        practice: 'العب لوحة تدريب', story: 'العب فترة في القصة', wire: 'سجل توقع في الوكالة', twist: 'صيب في صفقة اتقلبت', room: 'العب أوضة مع صحابك',
      },
      story: { ch: {
        blog: { name: 'ف١ · المدونة' }, comeback: { name: 'ف٢ · الرجوع' }, stringer: { name: 'ف٣ · مراسل حر' },
        rival: { name: 'ف٤ · المنافس' }, chronicle: { name: 'ف٥ · راجع للكرونيكل' }, front: { name: 'ف٦ · الصفحة الأولى' },
      } },
      me: {
        pressCard: 'كارنيه الصحافة', level: 'مستوى', maxed: 'أعلى مستوى', streak: 'أيام متتالية', best: 'الأفضل {n}', dailies: 'التحديات', t1s: '{n} × المستوى الأول', bestScore: 'أعلى نتيجة', points: 'نقطة',
        followers: 'المتابعين', rep: 'المصداقية {n}', noStory: 'ابدأ وضع القصة', pass: 'الباس والمتجر', training: 'العب التدريب تاني',
      },
    },
  },
  es: {
    g: {
      coins: '{n} monedas', level: 'Nivel {n}', lv: 'Nv {n}',
      tabs: { home: 'Inicio', story: 'Historia', wire: 'Teletipo', friends: 'Amigos', me: 'Yo' },
      home: {
        noName: 'Nuevo periodista', freelance: 'Freelance · aún sin periódico', xp: 'XP {a}/{b}', followers: '{n} seguidores', streak: 'Racha',
        dailyNo: 'El Diario · N.º {n}', todaysFive: 'Los cinco de hoy', filed: 'Enviado.', tag: 'Cinco culebrones de fichajes. Alguno miente. Dalo antes que nadie o hazte viral por errar.',
        filedSub: '{p} puntos {r}', weekAria: 'Esta semana', dow: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
        play: 'Coge el teléfono', resume: 'Vuelve al día {d}', seePage: 'Ver tu portada', fair: 'Los mismos cinco para todos · unos 6 min', tomorrow: 'Nuevos cinco a las 00:00 UTC',
        missions: 'Misiones de hoy', missionsReset: 'Se renuevan a las 00:00', claimed: 'Cobrada', modes: 'Tu mesa',
        storyK: 'Modo historia', storyNew: 'La liaste la temporada pasada. Recupéralo todo.', storySub: 'Capítulo {c} · {name}',
        wireK: 'Rumores reales', wireSub: 'Adelanta fichajes reales', wireLive: '{n} apuestas vivas',
        roomsK: 'Con amigos', roomsSub: 'Mismo tablero, una mesa', leaguePos: '{r}.º en tu liga',
        practiceK: 'Sin presión', practiceSub: 'El entrenador te enseña las probabilidades',
        passK: 'Temporada', passT: 'Pase y equipación', passSub: 'Nivel {n} de 40',
        tick: { interest: 'vinculado al {c}', talks: 'negocia con el {c}', bid: 'oferta del {c}', agreed: 'traspaso acordado con el {c}' },
      },
      missions: {
        daily: 'Juega el Diario de hoy', right3: 'Acierta {n} exclusivas', excl: 'Consigue una exclusiva', confRight: 'Acierta un «Confirmado»',
        physio: 'Llama al fisio {n} veces', spotter: 'Llama al del aeropuerto {n} veces', barber: 'Llama al barbero {n} veces', agent: 'Llama al agente {n} veces',
        practice: 'Juega una práctica', story: 'Juega una ventana de historia', wire: 'Apuesta en el Teletipo', twist: 'Acierta un culebrón con giro', room: 'Juega una sala con amigos',
      },
      story: { ch: {
        blog: { name: 'Cap. 1 · El blog' }, comeback: { name: 'Cap. 2 · La vuelta' }, stringer: { name: 'Cap. 3 · Corresponsal' },
        rival: { name: 'Cap. 4 · El rival' }, chronicle: { name: 'Cap. 5 · De vuelta en The Chronicle' }, front: { name: 'Cap. 6 · La portada' },
      } },
      me: {
        pressCard: 'Carné de prensa', level: 'Nivel', maxed: 'Nivel máximo', streak: 'Racha', best: 'Mejor {n}', dailies: 'Diarios', t1s: '{n} × Tier 1', bestScore: 'Mejor puntuación', points: 'puntos',
        followers: 'Seguidores', rep: 'Credibilidad {n}', noStory: 'Empieza el modo historia', pass: 'Pase y tienda', training: 'Repetir el tutorial',
      },
    },
  },
};

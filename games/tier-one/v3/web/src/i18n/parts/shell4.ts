// 4.0 "Insider": the phone OS (CONCEPT4.md §2, §6). The words on the lock screen, the home screen, the app grid, the
// tray, the home bar and Settings. The words are CONCEPT4.md §3 only. Arabic is Egyptian; Spanish is Spain Spanish.
export default {
  en: {
    os: {
      app: { blurt: 'Blurt', dms: 'DMs', lens: 'Lens', story: 'Story', live: 'Live', market: 'Market', groups: 'Groups', boards: 'Boards', settings: 'Settings' },
      tag: {
        blurt: 'The timeline. Today’s window, your posts, the Scoop.', dms: 'Your contacts. 3 DMs a day.', lens: 'Your profile, your grid, your deals.',
        story: 'The Comeback, with Mags Doyle.', live: 'Deadline Day. 90 seconds.', market: 'Real rumours. Real outcomes. Your calls.',
        groups: 'The press box: rooms and crews.', boards: 'Leaderboards and prizes.', settings: 'Language, sound, motion, account.',
      },
      lock: { unlock: 'Tap to unlock', unlockAria: 'Unlock the phone', empty: 'No notifications', clear: 'Clear', nextUp: 'Next up' },
      tray: { title: 'Notifications', now: 'now', ago: '{n}m', agoH: '{n}h', open: 'Open', windowOpen: 'Today’s window is open', windowOpenB: '5 stories. Same for everyone.', resumeB: 'Day {d} is waiting', results: 'Results are in', resultsB: '{tier} · {n} points', level: 'Level {n}', levelB: 'New level. Keep going.', deal: '{brand} wants to talk', dealB: 'A deal landed in your DMs', unlock: '{app} unlocked', unlockB: 'Reach Level {n} · done', rival: '{rival} posted', dms: '{n} DMs left today', dmsB: 'Your contacts are awake' },
      home: { dock: 'Dock', apps: 'Apps', reach: 'Reach Level {n}', reachAria: '{app} unlocks at Level {n}', open: 'open', badgeAria: '{n} new', widget: { play: 'Play today’s window', resume: 'Back to day {d}', played: 'Filed', playedB: '{tier} · {n} points', nextB: 'New window at {t}', rep: 'Rep {n}/100', followers: '{n} followers', coins: '{n} coins', level: 'Level {n}' } },
      bar: { home: 'Home', back: 'Back', homeAria: 'Go to the home screen', backAria: 'Go back' },
      status: { battery: 'Battery {n}%', signal: 'Signal', charging: 'Charging' },
      desk: { board: 'Today’s board', grid: 'Your grid', tray: 'Tray', story: 'Story {i} of {n}', noGrid: 'Right Drops land here.', aboutApp: 'About this app', keys: 'Esc home · 1–9 apps' },
      settings: {
        title: 'Settings', k: 'The phone', language: 'Language', sound: 'Sound', soundD: 'Taps, DMs, the Drop, the Scoop', motion: 'Reduce motion', motionD: 'Fewer moves, same game',
        theme: 'Phone theme', themeD: 'Dark, light or with the OS', dark: 'Dark', light: 'Light', auto: 'Auto',
        account: 'Account', handle: 'Your handle', handleHint: 'This is your name on Blurt and the boards.', save: 'Save', saved: 'Saved',
        howto: 'How to play', restore: 'Restore purchases', restoring: 'Checking…', restored: 'Purchases restored', restoreNone: 'Nothing to restore', restoreOff: 'Only on the web build',
        about: 'About', version: 'Tier One {v} · build {b}', studio: 'Semba Studios', legal: 'Everything in this game is fiction: the people, the brands, the apps.',
        device: 'Device', deviceId: 'Device ID',
      },
    },
  },
  ar: {
    os: {
      app: { blurt: 'بلرت', dms: 'الرسايل', lens: 'لينس', story: 'القصة', live: 'لايف', market: 'الماركت', groups: 'الجروبات', boards: 'الترتيب', settings: 'الإعدادات' },
      tag: {
        blurt: 'التايملاين. شباك النهارده وبوستاتك والسكوب.', dms: 'معارفك. ٣ رسايل في اليوم.', lens: 'بروفايلك وجريدك وصفقاتك.',
        story: 'العودة، مع ماجز دويل.', live: 'يوم الديدلاين. ٩٠ ثانية.', market: 'إشاعات حقيقية. نتايج حقيقية. توقعاتك.',
        groups: 'كابينة الصحافة: أوض وفرق.', boards: 'الترتيب والجوايز.', settings: 'اللغة والصوت والحركة والحساب.',
      },
      lock: { unlock: 'دوس عشان تفتح', unlockAria: 'افتح التليفون', empty: 'مفيش إشعارات', clear: 'امسح', nextUp: 'الجاي' },
      tray: { title: 'الإشعارات', now: 'دلوقتي', ago: '{n}د', agoH: '{n}س', open: 'افتح', windowOpen: 'شباك النهارده مفتوح', windowOpenB: '٥ قصص. نفس الحاجة للكل.', resumeB: 'اليوم {d} مستنيك', results: 'النتايج وصلت', resultsB: '{tier} · {n} نقطة', level: 'المستوى {n}', levelB: 'مستوى جديد. كمّل.', deal: '{brand} عايز يتكلم', dealB: 'صفقة وصلت رسايلك', unlock: '{app} اتفتح', unlockB: 'وصلت المستوى {n}', rival: '{rival} نزّل بوست', dms: 'فاضل {n} رسايل النهارده', dmsB: 'معارفك صاحيين' },
      home: { dock: 'الدوك', apps: 'التطبيقات', reach: 'وصّل المستوى {n}', reachAria: '{app} بيتفتح عند المستوى {n}', open: 'مفتوح', badgeAria: '{n} جديد', widget: { play: 'العب شباك النهارده', resume: 'ارجع لليوم {d}', played: 'اتبعت', playedB: '{tier} · {n} نقطة', nextB: 'شباك جديد الساعة {t}', rep: 'السمعة {n}/100', followers: '{n} متابع', coins: '{n} عملة', level: 'المستوى {n}' } },
      bar: { home: 'الرئيسية', back: 'رجوع', homeAria: 'روح للشاشة الرئيسية', backAria: 'ارجع' },
      status: { battery: 'البطارية {n}٪', signal: 'الشبكة', charging: 'بيشحن' },
      desk: { board: 'لوحة النهارده', grid: 'جريدك', tray: 'الإشعارات', story: 'قصة {i} من {n}', noGrid: 'الدروب الصح بينزل هنا.', aboutApp: 'عن التطبيق', keys: 'Esc الرئيسية · ١–٩ التطبيقات' },
      settings: {
        title: 'الإعدادات', k: 'التليفون', language: 'اللغة', sound: 'الصوت', soundD: 'الضغطات والرسايل والدروب والسكوب', motion: 'قلّل الحركة', motionD: 'حركة أقل، نفس اللعبة',
        theme: 'شكل التليفون', themeD: 'غامق أو فاتح أو زي النظام', dark: 'غامق', light: 'فاتح', auto: 'تلقائي',
        account: 'الحساب', handle: 'اسمك', handleHint: 'ده اسمك على بلرت وفي الترتيب.', save: 'احفظ', saved: 'اتحفظ',
        howto: 'إزاي تلعب', restore: 'استرجع المشتريات', restoring: 'بنشوف…', restored: 'المشتريات رجعت', restoreNone: 'مفيش حاجة ترجع', restoreOff: 'على نسخة الويب بس',
        about: 'عن اللعبة', version: 'Tier One {v} · build {b}', studio: 'Semba Studios', legal: 'كل حاجة في اللعبة دي خيال: الناس والبراندات والتطبيقات.',
        device: 'الجهاز', deviceId: 'رقم الجهاز',
      },
    },
  },
  es: {
    os: {
      app: { blurt: 'Blurt', dms: 'DMs', lens: 'Lens', story: 'Historia', live: 'Live', market: 'Mercado', groups: 'Grupos', boards: 'Tablas', settings: 'Ajustes' },
      tag: {
        blurt: 'El timeline. La ventana de hoy, tus posts, el Scoop.', dms: 'Tus contactos. 3 DMs al día.', lens: 'Tu perfil, tu grid, tus acuerdos.',
        story: 'La vuelta, con Mags Doyle.', live: 'Día de cierre. 90 segundos.', market: 'Rumores reales. Resultados reales. Tus apuestas.',
        groups: 'La tribuna: salas y redacciones.', boards: 'Clasificaciones y premios.', settings: 'Idioma, sonido, movimiento, cuenta.',
      },
      lock: { unlock: 'Toca para desbloquear', unlockAria: 'Desbloquear el teléfono', empty: 'Sin notificaciones', clear: 'Borrar', nextUp: 'Lo siguiente' },
      tray: { title: 'Notificaciones', now: 'ahora', ago: '{n} min', agoH: '{n} h', open: 'Abrir', windowOpen: 'La ventana de hoy está abierta', windowOpenB: '5 historias. Las mismas para todos.', resumeB: 'El día {d} te espera', results: 'Ya hay resultados', resultsB: '{tier} · {n} puntos', level: 'Nivel {n}', levelB: 'Nuevo nivel. Sigue.', deal: '{brand} quiere hablar', dealB: 'Un acuerdo ha llegado a tus DMs', unlock: '{app} desbloqueado', unlockB: 'Nivel {n} · conseguido', rival: '{rival} ha publicado', dms: 'Te quedan {n} DMs hoy', dmsB: 'Tus contactos están despiertos' },
      home: { dock: 'Dock', apps: 'Apps', reach: 'Llega al nivel {n}', reachAria: '{app} se abre en el nivel {n}', open: 'abierto', badgeAria: '{n} nuevos', widget: { play: 'Juega la ventana de hoy', resume: 'Vuelve al día {d}', played: 'Enviado', playedB: '{tier} · {n} puntos', nextB: 'Nueva ventana a las {t}', rep: 'Rep {n}/100', followers: '{n} seguidores', coins: '{n} monedas', level: 'Nivel {n}' } },
      bar: { home: 'Inicio', back: 'Atrás', homeAria: 'Ir a la pantalla de inicio', backAria: 'Volver' },
      status: { battery: 'Batería {n}%', signal: 'Señal', charging: 'Cargando' },
      desk: { board: 'El tablero de hoy', grid: 'Tu grid', tray: 'Bandeja', story: 'Historia {i} de {n}', noGrid: 'Los Drops acertados caen aquí.', aboutApp: 'Sobre esta app', keys: 'Esc inicio · 1–9 apps' },
      settings: {
        title: 'Ajustes', k: 'El teléfono', language: 'Idioma', sound: 'Sonido', soundD: 'Toques, DMs, el Drop, el Scoop', motion: 'Reducir movimiento', motionD: 'Menos movimiento, el mismo juego',
        theme: 'Tema del teléfono', themeD: 'Oscuro, claro o como el sistema', dark: 'Oscuro', light: 'Claro', auto: 'Auto',
        account: 'Cuenta', handle: 'Tu nombre', handleHint: 'Es tu nombre en Blurt y en las tablas.', save: 'Guardar', saved: 'Guardado',
        howto: 'Cómo se juega', restore: 'Restaurar compras', restoring: 'Comprobando…', restored: 'Compras restauradas', restoreNone: 'Nada que restaurar', restoreOff: 'Solo en la versión web',
        about: 'Acerca de', version: 'Tier One {v} · build {b}', studio: 'Semba Studios', legal: 'Todo en este juego es ficción: las personas, las marcas, las apps.',
        device: 'Dispositivo', deviceId: 'ID del dispositivo',
      },
    },
  },
};

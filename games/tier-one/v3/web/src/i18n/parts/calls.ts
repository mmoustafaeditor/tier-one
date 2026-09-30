// 3.3 "One Byline" calls lane (GOTY.md §2): HERE WE GO, hold to publish, Delete & repost, the stake line, the rival
// race and the overnight breaking cards. {p} player, {to} buying club, {o} outcome, {r} rival handle.
export default {
  en: {
    calls: {
      hwg: { word: 'HERE WE GO!', stamp: 'Here we go!', card: 'HERE WE GO! · {p}', burst: 'HERE WE GO!' },
      hold: { hint: 'Hold to publish', aria: '{l}. Hold, tap or press Enter to publish.' },
      stake: { right: 'Right +{n}', wrong: 'Wrong {n}', open: 'Exclusive open: +{n}', beaten: 'Beaten by {r}', repost: 'No exclusive on a repost', loud: 'Only Confirmed can be exclusive', two: 'Two circles needed for an exclusive' },
      repost: {
        open: 'Delete & repost', btn: 'Delete & repost · {o}', deleted: 'Deleted', ratio: 'Ratio',
        replies: [
          'screenshotted before you deleted it 📸',
          'the U-turn on this man. Sat nav energy',
          'deleted faster than the {to} medical',
          'ratio + wrong + deleted',
          '“sources” = a dream you had last night',
          'we saw it. we all saw it.',
          'bro is rewriting history in real time',
          'another one for the receipts folder 🧾',
        ],
      },
      race: { h: 'The race', waiting: 'Not posted', posted: 'Posted {o}', rec: '{w}–{l}–{d}', recAria: 'You {w} wins, {l} losses, {d} draws against {r}' },
      night: {
        breaking: 'Breaking', skip: 'Tap to skip',
        beat: ['Got there first. Again.', 'Keep up, desk.', 'Were you asleep? We weren’t.', 'Too slow. It’s in the paper.'],
        copy: ['Nice to have company. Late company.', 'Same call as us. We just said it first.', 'Copying our homework now?'],
        clash: ['Bold call yesterday. Shame about it.', 'One of us is wrong. It isn’t us.', 'Delete button’s top right, friend.'],
        ahead: ['Check the head-to-head before you reply.', 'We’re up on you. Not close.'],
      },
    },
  },
  ar: {
    calls: {
      hwg: { word: 'HERE WE GO!', stamp: 'هير وي جو!', card: 'HERE WE GO! · {p}', burst: 'HERE WE GO!' },
      hold: { hint: 'دوس كتير عشان تنشر', aria: '{l}. دوس كتير أو دوسة أو Enter عشان تنشر.' },
      stake: { right: 'صح +{n}', wrong: 'غلط {n}', open: 'الانفراد لسه متاح: +{n}', beaten: 'سبقك {r}', repost: 'مفيش انفراد في إعادة النشر', loud: '«مؤكد» بس اللي ينفع يبقى انفراد', two: 'محتاج دايرتين مختلفتين عشان الانفراد' },
      repost: {
        open: 'امسح وانشر تاني', btn: 'امسح وانشر تاني · {o}', deleted: 'اتمسح', ratio: 'ريشيو',
        replies: [
          'خدت سكرين شوت قبل ما تمسح 📸',
          'اللف ده ولا جي بي إس بيعيد الحساب',
          'اتمسح أسرع من كشف طبي في {to}',
          'ريشيو + غلط + اتمسح',
          '«مصادري» = حلم امبارح بالليل',
          'شفناها. كلنا شفناها.',
          'الراجل بيعيد كتابة التاريخ على الهوا',
          'واحدة كمان لملف الفضايح 🧾',
        ],
      },
      race: { h: 'السباق', waiting: 'لسه منشرش', posted: 'نشر {o}', rec: '{w}–{l}–{d}', recAria: 'إنت {w} فوز و{l} خسارة و{d} تعادل قدام {r}' },
      night: {
        breaking: 'عاجل', skip: 'دوس عشان تعدّي',
        beat: ['وصلنا الأول. تاني.', 'فوق يا ديسك.', 'كنت نايم؟ إحنا لأ.', 'متأخر. الخبر في الجورنال خلاص.'],
        copy: ['منوّر. بس متأخر.', 'نفس كلامنا. بس إحنا قلناه الأول.', 'بتنقل مننا دلوقتي؟'],
        clash: ['جريء امبارح. خسارة.', 'واحد فينا غلطان. ومش إحنا.', 'زرار المسح فوق على اليمين يا صاحبي.'],
        ahead: ['بص على النتيجة بينا قبل ما ترد.', 'إحنا متقدمين عليك. ومش قريب حتى.'],
      },
    },
  },
  es: {
    calls: {
      hwg: { word: '¡HERE WE GO!', stamp: '¡Here we go!', card: '¡HERE WE GO! · {p}', burst: '¡HERE WE GO!' },
      hold: { hint: 'Mantén para publicar', aria: '{l}. Mantén, toca o pulsa Enter para publicar.' },
      stake: { right: 'Acierto +{n}', wrong: 'Fallo {n}', open: 'Exclusiva abierta: +{n}', beaten: 'Se adelantó {r}', repost: 'Sin exclusiva al republicar', loud: 'Solo Confirmado puede ser exclusiva', two: 'Hacen falta dos círculos para la exclusiva' },
      repost: {
        open: 'Borrar y republicar', btn: 'Borrar y republicar · {o}', deleted: 'Borrado', ratio: 'Ratio',
        replies: [
          'captura hecha antes de que lo borraras 📸',
          'el cambio de rumbo de este hombre. Energía de GPS',
          'borrado más rápido que un médico del {to}',
          'ratio + fallo + borrado',
          '«fuentes» = lo que soñaste anoche',
          'lo vimos. lo vimos todos.',
          'reescribiendo la historia en directo',
          'otro para la carpeta de pruebas 🧾',
        ],
      },
      race: { h: 'La carrera', waiting: 'Sin publicar', posted: 'Publicó {o}', rec: '{w}–{l}–{d}', recAria: 'Tú: {w} victorias, {l} derrotas, {d} empates contra {r}' },
      night: {
        breaking: 'Última hora', skip: 'Toca para saltar',
        beat: ['Llegamos primero. Otra vez.', 'Espabila, redacción.', '¿Dormías? Nosotros no.', 'Tarde. Ya está en el periódico.'],
        copy: ['Qué bien, compañía. Tardía.', 'Lo mismo que nosotros. Solo que antes.', '¿Ahora copias los deberes?'],
        clash: ['Valiente ayer. Lástima.', 'Uno de los dos se equivoca. No somos nosotros.', 'El botón de borrar está arriba a la derecha.'],
        ahead: ['Mira el cara a cara antes de contestar.', 'Te llevamos ventaja. Y no poca.'],
      },
    },
  },
};

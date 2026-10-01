// Moment films (src/film/scenes: PaperOut, TierUp, ContactGold, Scalp, Deadline, Official). Nobody speaks in these
// films: every string here is printed on something (a front page, a press pass, a card, a TV band, a phone).
// Voice: headline-short. AR is Egyptian colloquial; stamps stay short so they slam.
export default {
  en: {
    film: {
      name: { paper: 'The paper’s out', tier: 'Promoted', contact: 'Inner circle', scalp: 'Scalp', deadline: 'Deadline Day', official: 'Official' },
      m: {
        paper: { stamp: 'Out now', news: 'NEWS', edition: 'First post', demo: 'Your name at the top of the timeline', kicker: 'Scoop' },
        tier: { door: 'EDITOR', press: 'PRESS', stamp: 'Promoted', kicker: 'Accredited as' },
        contact: { kicker: 'Inner circle', lv: 'Level 5', perk: 'A free second opinion every window in Story and Practice.', stamp: 'Gold' },
        scalp: { viral: 'VIRAL', post: 'Called it first. Receipts below.', theirs: 'Trust me, that one’s dead.', record: 'You {w}–{l} {r}', stamp: 'Scalp', trophy: 'Rivalry won' },
        dd: { title: 'Deadline Day', kicker: 'Alert', gate: 'TRAINING GROUND', pings: ['Medical booked for tonight', 'Private jet just landed', 'Fee agreed in principle'] },
        official: { breaking: 'BREAKING', official: 'Official', ticker: 'OFFICIAL: {p} completes the move · first reported by {n}', credit: 'First called by', demo: 'The number 9' },
      },
    },
  },
  ar: {
    film: {
      name: { paper: 'الجورنال نزل', tier: 'ترقية', contact: 'الدايرة المقرّبة', scalp: 'غلبته', deadline: 'يوم الحسم', official: 'رسمي' },
      m: {
        paper: { stamp: 'نزل', news: 'أخبار', edition: 'أول بوست', demo: 'اسمك فوق التايملاين', kicker: 'سكووب' },
        tier: { door: 'رئيس التحرير', press: 'صحافة', stamp: 'ترقية', kicker: 'معتمد بصفة' },
        contact: { kicker: 'الدايرة المقرّبة', lv: 'المستوى ٥', perk: 'رأي تاني ببلاش كل فترة في القصة والتدريب.', stamp: 'دهب' },
        scalp: { viral: 'تريند', post: 'قلتها الأول. الدليل تحت.', theirs: 'صدّقني، الصفقة دي ماتت.', record: 'إنت {w}–{l} {r}', stamp: 'غلبته', trophy: 'كسبت المنافسة' },
        dd: { title: 'يوم الحسم', kicker: 'تنبيه', gate: 'ملعب التدريب', pings: ['الكشف الطبي النهارده بالليل', 'طيارة خاصة لسه نازلة', 'اتفقوا مبدئيًا على المبلغ'] },
        official: { breaking: 'عاجل', official: 'رسمي', ticker: 'رسميًا: {p} خلّص الانتقال · أول من نشر الخبر {n}', credit: 'أول واحد قالها', demo: 'رقم ٩' },
      },
    },
  },
  es: {
    film: {
      name: { paper: 'Ya está en la calle', tier: 'Ascenso', contact: 'Círculo íntimo', scalp: 'Cabellera', deadline: 'Último día', official: 'Oficial' },
      m: {
        paper: { stamp: 'Publicado', news: 'NOTICIA', edition: 'Primer post', demo: 'Tu nombre arriba del timeline', kicker: 'Scoop' },
        tier: { door: 'DIRECTOR', press: 'PRENSA', stamp: 'Ascendido', kicker: 'Acreditado como' },
        contact: { kicker: 'Círculo íntimo', lv: 'Nivel 5', perk: 'Una segunda opinión gratis cada ventana en Historia y Práctica.', stamp: 'Oro' },
        scalp: { viral: 'VIRAL', post: 'Lo dije primero. Pruebas abajo.', theirs: 'Hacedme caso: eso está muerto.', record: 'Tú {w}–{l} {r}', stamp: 'Cabellera', trophy: 'Rivalidad ganada' },
        dd: { title: 'Último día', kicker: 'Aviso', gate: 'CIUDAD DEPORTIVA', pings: ['Reconocimiento médico esta noche', 'Acaba de aterrizar un jet privado', 'Acuerdo de principio en el traspaso'] },
        official: { breaking: 'ÚLTIMA HORA', official: 'Oficial', ticker: 'OFICIAL: {p} cierra su fichaje · lo adelantó {n}', credit: 'Lo adelantó', demo: 'El número 9' },
      },
    },
  },
};

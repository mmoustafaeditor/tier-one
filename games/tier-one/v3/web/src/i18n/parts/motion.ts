// 3.4 motion pieces (src/film, GOTY.md §10/§12): the few words printed on things (departures board, day-end card,
// moment captions) and the house catchphrase that stands in until the player picks their own. Never "DONE DEAL".
export default {
  en: {
    film: { name: { catchphrase: 'Your line' }, m: { motion: { onAir: 'ON AIR', cp: 'Called it', promo: 'Promoted' } } },
    cp: { house: { default: 'It’s happening.' } },
    mo: { w: { boarding: 'BOARDING', cancelled: 'CANCELLED', gate: 'DEPARTURES', medical: 'MEDICAL', noShow: 'NO SHOW' }, dawn: 'Next morning' },
  },
  ar: {
    film: { name: { catchphrase: 'جملتك' }, m: { motion: { onAir: 'على الهوا', cp: 'قلتها', promo: 'ترقية' } } },
    cp: { house: { default: 'خلاص، هتحصل.' } },
    mo: { w: { boarding: 'صعود', cancelled: 'ملغاة', gate: 'المغادرة', medical: 'كشف طبي', noShow: 'غياب' }, dawn: 'صباح اليوم التالي' },
  },
  es: {
    film: { name: { catchphrase: 'Tu frase' }, m: { motion: { onAir: 'EN DIRECTO', cp: 'Lo dijiste', promo: 'Ascenso' } } },
    cp: { house: { default: 'Se viene.' } },
    mo: { w: { boarding: 'EMBARQUE', cancelled: 'CANCELADO', gate: 'SALIDAS', medical: 'MÉDICO', noShow: 'NO PRESENTADO' }, dawn: 'A la mañana siguiente' },
  },
};

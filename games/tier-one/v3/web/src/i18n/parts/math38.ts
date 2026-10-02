// 3.8 game-math strings (launch brief §5, §6, §7): the human-readable source characteristics ranked Daily shows instead of
// percentages, the two-source language, and the ladder guidance. The wording follows what the simulation found
// (docs/spec/D-game-math.md §3): the barber's "stay" lines are worth hearing, the agent's "no" is worth more than her
// "yes", the spotter is the day-3 turning point, the physio is the closer. Numbers in {…} come from RULES at run time.
export default {
  en: {
    m38: {
      src: {
        kitman: { trait: 'Reliable', line: 'Knows whether he leaves, not where.' },
        barber: { trait: 'Gossip', line: 'Repeats the street on a move. Worth hearing when he says it was never on.' },
        agent: { trait: 'Direct, but biased', line: 'Talks every deal up. Her “no” is worth more than her “yes”.' },
        spotter: { trait: 'Strong on destination', line: 'Sees the jet, not the paperwork. Can’t tell collapsed from invented.' },
        physio: { trait: 'Very reliable, late', line: 'Usually right about medicals. Opens day {d}.' },
        leak: { trait: 'Club insider', line: 'A club that trusts you. Career only.' },
      },
      circles: { n: '{n} independent sources agree', one: 'One circle. Not a confirmation yet.', echo: 'Echo chamber: these reports trace back to the same story.' },
      ladder: { confirmedWhen: 'Confirmed when you’d bet 3-to-2.', advancedWhen: 'Advanced when it’s more likely than not.', talksWhen: 'In talks when you just have a lean.', exclusive: 'Break it first at Confirmed with two circles: +{n}.' },
      points: { perDay: '{n} calls a day. They don’t carry over.', dd: 'Deadline Day: {n} calls, {p} posts, sixty seconds.' },
      tiers: { t1: 'Tier 1: {n} points and an exclusive.', t2: 'Tier 2: {n} points.', t3: 'Tier 3: {n} points.', t4: 'Tier 4: in the paper. Just.', spiked: 'Below zero: spiked.' },
    },
  },
  ar: {
    m38: {
      src: {
        kitman: { trait: 'موثوق', line: 'عارف هو ماشي ولا لأ، مش عارف رايح فين.' },
        barber: { trait: 'كلام شارع', line: 'بيكرر كلام الشارع لو في انتقال. اسمعه لما يقولك الموضوع ماكانش موجود أصلاً.' },
        agent: { trait: 'مباشرة بس منحازة', line: 'بتكبّر أي صفقة. “لأ” بتاعتها تسوى أكتر من “أيوه”.' },
        spotter: { trait: 'قوي في الوجهة', line: 'بيشوف الطيارة مش الورق. مايعرفش يفرّق بين صفقة وقعت وصفقة متألفة.' },
        physio: { trait: 'موثوق جداً، بس متأخر', line: 'غالباً صح في الكشف الطبي. بيفتح يوم {d}.' },
        leak: { trait: 'من جوه النادي', line: 'نادي واثق فيك. في الكارير بس.' },
      },
      circles: { n: '{n} مصادر مستقلة متفقة', one: 'دايرة واحدة. لسه مش تأكيد.', echo: 'صدى: كل التقارير دي راجعة لنفس الحكاية.' },
      ladder: { confirmedWhen: 'Confirmed لما تراهن ٣ على ٢.', advancedWhen: 'Advanced لما الاحتمال أكبر من النص.', talksWhen: 'In talks لما عندك ميل بس.', exclusive: 'انفرد بيها Confirmed بدايرتين: +{n}.' },
      points: { perDay: '{n} مكالمات في اليوم. مابتترحّلش.', dd: 'يوم الإغلاق: {n} مكالمات، {p} بوستات، ستين ثانية.' },
      tiers: { t1: 'Tier 1: {n} نقطة وانفراد.', t2: 'Tier 2: {n} نقطة.', t3: 'Tier 3: {n} نقطة.', t4: 'Tier 4: في الجورنال. بالعافية.', spiked: 'تحت الصفر: اتشطبت.' },
    },
  },
  es: {
    m38: {
      src: {
        kitman: { trait: 'Fiable', line: 'Sabe si se va, no adónde.' },
        barber: { trait: 'Cotilleo', line: 'Repite lo que dice la calle sobre un fichaje. Escúchale cuando dice que nunca hubo nada.' },
        agent: { trait: 'Directa, pero parcial', line: 'Infla cualquier operación. Su “no” vale más que su “sí”.' },
        spotter: { trait: 'Fuerte en el destino', line: 'Ve el jet, no los papeles. No distingue lo roto de lo inventado.' },
        physio: { trait: 'Muy fiable, tarde', line: 'Casi siempre acierta con los reconocimientos. Abre el día {d}.' },
        leak: { trait: 'Dentro del club', line: 'Un club que confía en ti. Solo en Carrera.' },
      },
      circles: { n: '{n} fuentes independientes coinciden', one: 'Un solo círculo. Aún no es confirmación.', echo: 'Cámara de eco: estos informes salen de la misma historia.' },
      ladder: { confirmedWhen: 'Confirmed cuando apostarías 3 a 2.', advancedWhen: 'Advanced cuando es más probable que no.', talksWhen: 'In talks cuando solo tienes una corazonada.', exclusive: 'Rómpela primero en Confirmed con dos círculos: +{n}.' },
      points: { perDay: '{n} llamadas al día. No se acumulan.', dd: 'Deadline Day: {n} llamadas, {p} publicaciones, sesenta segundos.' },
      tiers: { t1: 'Tier 1: {n} puntos y una exclusiva.', t2: 'Tier 2: {n} puntos.', t3: 'Tier 3: {n} puntos.', t4: 'Tier 4: en el periódico. Por los pelos.', spiked: 'Por debajo de cero: tirada.' },
    },
  },
};

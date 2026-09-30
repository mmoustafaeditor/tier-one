// Catchphrases (GOTY.md §12): your line replaces "HERE WE GO". A Confirmed call that lands fires it (stamp, share
// card, film title). cp.house.<id>: the ten house originals (default "Book it."); cp.unlock.<id>: how each one is
// earned (rank, streak, chapter); cp.react.*: fans and rivals reacting, templated on {phrase} (+ {p} player, {name} you).
// Nothing here is anyone else's catchphrase: every line is an original (docs/LEGAL_NAMES.md).
// Merge note: the longtail lane may add this file with the same keys; keep theirs and add these lines.
export default {
  en: {
    cp: {
      ui: { title: 'Your catchphrase', pick: 'Use this one', using: 'In use', locked: 'Locked', fresh: 'New catchphrase: {phrase}', card: 'Catchphrase card' },
      house: {
        default: 'Book it.', bookit: 'Book it.', pen: 'Pen on paper.', dusted: 'Done. Dusted.', announce: 'Announce him.', medical: 'Medical booked.',
        ink: 'Ink’s dry.', shirt: 'Shirt’s printed.', gates: 'Through the gates.', sealed: 'Signed. Sealed.', lockin: 'Lock it in.',
      },
      unlock: {
        default: 'Yours from day one.', bookit: 'Yours from day one.', pen: 'Reach level 5.', dusted: 'Land three right calls in a row.', announce: 'Win a Deadline Day.',
        medical: 'Land a Confirmed call off the physio.', ink: 'Finish Story chapter 2.', shirt: 'Hit a 7-day streak.', gates: 'Reach Tier 1 in a window.',
        sealed: 'Finish Story chapter 4.', lockin: 'Beat all three rivals in one window.',
      },
      react: {
        fan: {
          right: ['“{phrase}” and it WAS. goosebumps 🥶', 'the {phrase} post is going on my wall', 'when they say “{phrase}” you set an alarm', '“{phrase}” hits different when it’s true', 'the {phrase} merchant strikes again 🔥', 'screenshotting this “{phrase}” for the grandkids', '{p} done and the catchphrase called it. cinema', 'not the “{phrase}” 😭 we are SO back', 'saw “{phrase}” and started packing for the parade', '{name} said “{phrase}” and the club obeyed'],
          wrong: ['“{phrase}” 💀 book what, mate', 'the “{phrase}” post aged like milk in August', 'bro said “{phrase}” with his whole chest. chest was wrong', 'retire the catchphrase. or retire', '“{phrase}” → Not booked. Not even pencilled.', 'we need a new catchphrase. and a new source', 'the catchphrase is doing more work than the sources', 'saving this “{phrase}” for the end-of-season reel', '{p} went elsewhere and took “{phrase}” with him', 'imagine a catchphrase and no medical 😂'],
        },
        rival: {
          right: ['“{phrase}”. Fine. It was.', 'Copying the catchphrase. Not the method.', 'Catchphrase landed. The reel sulks.', '“{phrase}” and correct. Irritating combo.', 'The timeline will be saying “{phrase}” for a week. Great.', 'Your catchphrase got more likes than my career.'],
          wrong: ['“{phrase}”? Clipped. 📸', 'A catchphrase on a wrong call. The reel thanks you.', '“{phrase}” is now a meme. Not the good kind.', 'Catchphrase: loud. Call: wrong. Record: updated.', 'Nice catchphrase. Shame about the call.', 'Put “{phrase}” on a mug. Drink from it quietly.'],
        },
        card: { kicker: 'Called it', line: '{p} · {to}', foot: 'Filed first on Tier One' },
      },
    },
  },
  ar: {
    cp: {
      ui: { title: 'جملتك المشهورة', pick: 'استخدم دي', using: 'مستخدمة', locked: 'مقفولة', fresh: 'جملة جديدة: {phrase}', card: 'كارت الجملة' },
      house: {
        default: 'اتقفلت.', bookit: 'اتقفلت.', pen: 'القلم على الورق.', dusted: 'خلصت. وانتهت.', announce: 'أعلنوا عنه.', medical: 'الكشف اتحجز.',
        ink: 'الحبر نشف.', shirt: 'القميص اتطبع.', gates: 'عدّى البوابة.', sealed: 'مضى. واتختم.', lockin: 'ثبّتها.',
      },
      unlock: {
        default: 'بتاعتك من أول يوم.', bookit: 'بتاعتك من أول يوم.', pen: 'وصّل للمستوى ٥.', dusted: 'تلات قرارات صح ورا بعض.', announce: 'اكسب يوم ديدلاين.',
        medical: 'قرار «مؤكد» صح من العلاج الطبيعي.', ink: 'خلّص الفصل ٢ في القصة.', shirt: 'سلسلة ٧ أيام.', gates: 'وصّل للتير ١ في فترة.',
        sealed: 'خلّص الفصل ٤ في القصة.', lockin: 'اكسب التلات منافسين في فترة واحدة.',
      },
      react: {
        fan: {
          right: ['«{phrase}» وطلعت بجد. قشعريرة 🥶', 'بوست «{phrase}» ده هيتعلّق على حيطتي', 'لما يقول «{phrase}» اضبط منبّه', '«{phrase}» ليها طعم تاني لما تبقى صح', 'تاجر الـ«{phrase}» ضرب تاني 🔥', 'بصوّر «{phrase}» دي للأحفاد', '{p} خلص والجملة قالتها. سينما', 'مش «{phrase}» 😭 احنا رجعنا', 'شفت «{phrase}» وبدأت أجهّز للاحتفال', '{name} قال «{phrase}» والنادي سمع الكلام'],
          wrong: ['«{phrase}» 💀 اتقفلت فين يا عم', 'بوست «{phrase}» باظ زي اللبن في أغسطس', 'الواد قال «{phrase}» بكل ثقة. والثقة غلطت', 'اعتزل الجملة. أو اعتزل', '«{phrase}» ← لا اتقفلت ولا اتكتبت بالقلم الرصاص', 'محتاجين جملة جديدة. ومصدر جديد', 'الجملة شغالة أكتر من المصادر', 'محتفظ بـ«{phrase}» دي لفيديو آخر الموسم', '{p} راح في حتة تانية وخد «{phrase}» معاه', 'تخيّل جملة مشهورة من غير كشف طبي 😂'],
        },
        rival: {
          right: ['«{phrase}». ماشي. طلعت.', 'هسرق الجملة. مش المنهج.', 'الجملة نزلت صح. الفيديو زعلان.', '«{phrase}» وصح. كومبو مستفز.', 'التايم لاين هيقول «{phrase}» أسبوع. جميل.', 'جملتك خدت لايكات أكتر من مشواري.'],
          wrong: ['«{phrase}»؟ اتقصّت. 📸', 'جملة مشهورة على قرار غلط. الفيديو بيشكرك.', '«{phrase}» بقت ميم. مش النوع الحلو.', 'الجملة: عالية. القرار: غلط. السجل: اتحدّث.', 'جملة حلوة. خسارة في القرار.', 'اطبع «{phrase}» على مج. واشرب منه بهدوء.'],
        },
        card: { kicker: 'قلتها', line: '{p} · {to}', foot: 'اتنشرت الأول على Tier One' },
      },
    },
  },
  es: {
    cp: {
      ui: { title: 'Tu frase', pick: 'Usar esta', using: 'En uso', locked: 'Bloqueada', fresh: 'Frase nueva: {phrase}', card: 'Tarjeta de frase' },
      house: {
        default: 'Cerrado.', bookit: 'Cerrado.', pen: 'Boli y firma.', dusted: 'Hecho. Atado.', announce: 'Anunciadlo.', medical: 'Reconocimiento reservado.',
        ink: 'La tinta está seca.', shirt: 'Camiseta impresa.', gates: 'Ya está dentro.', sealed: 'Firmado. Sellado.', lockin: 'Atado y bien atado.',
      },
      unlock: {
        default: 'Tuya desde el primer día.', bookit: 'Tuya desde el primer día.', pen: 'Llega al nivel 5.', dusted: 'Tres aciertos seguidos.', announce: 'Gana un día de cierre.',
        medical: 'Acierta un Confirmado gracias al fisio.', ink: 'Termina el capítulo 2 de la Historia.', shirt: 'Racha de 7 días.', gates: 'Llega a Tier 1 en un mercado.',
        sealed: 'Termina el capítulo 4 de la Historia.', lockin: 'Gana a los tres rivales en un mercado.',
      },
      react: {
        fan: {
          right: ['“{phrase}” y ERA VERDAD. piel de gallina 🥶', 'el post de “{phrase}” va a la pared de mi cuarto', 'cuando dice “{phrase}” pones alarma', '“{phrase}” sabe distinto cuando es verdad', 'el rey del “{phrase}” vuelve a golpear 🔥', 'capturando este “{phrase}” para los nietos', '{p} hecho y la frase lo cantó. cine', 'no el “{phrase}” 😭 hemos vuelto', 'vi “{phrase}” y ya estoy preparando la rúa', '{name} dijo “{phrase}” y el club obedeció'],
          wrong: ['“{phrase}” 💀 cerrado el qué, hermano', 'el post de “{phrase}” ha envejecido como la leche en agosto', 'dijo “{phrase}” con todo el pecho. el pecho se equivocó', 'retira la frase. o retírate', '“{phrase}” → Ni cerrado. Ni a lápiz.', 'necesitamos frase nueva. y fuente nueva', 'la frase trabaja más que las fuentes', 'guardo este “{phrase}” para el vídeo de fin de temporada', '{p} se fue a otro sitio y se llevó el “{phrase}”', 'imagina tener frase y no tener reconocimiento 😂'],
        },
        rival: {
          right: ['“{phrase}”. Vale. Lo era.', 'Te copio la frase. El método no.', 'La frase ha acertado. El vídeo está de morros.', '“{phrase}” y cierto. Combo irritante.', 'El timeline va a decir “{phrase}” toda la semana. Genial.', 'Tu frase tiene más likes que mi carrera.'],
          wrong: ['¿“{phrase}”? Recortado. 📸', 'Una frase de marca en una apuesta fallida. El vídeo te lo agradece.', '“{phrase}” ya es meme. Del malo.', 'Frase: alta. Apuesta: mala. Historial: actualizado.', 'Bonita frase. Lástima de apuesta.', 'Ponte “{phrase}” en una taza. Y bebe en silencio.'],
        },
        card: { kicker: 'Lo canté', line: '{p} · {to}', foot: 'Publicado primero en Tier One' },
      },
    },
  },
};

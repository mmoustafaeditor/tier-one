// Catchphrases (GOTY.md §12): your line replaces "DONE DEAL". A right Drop fires it (stamp, share
// card, film title). cp.house.<id>: the ten house originals (default "It’s happening."); cp.unlock.<id>: how each one is
// earned, matching the catalog's earn rules in lib/catalog.ts (rank, streak, chapter); cp.react.*: fans and rivals reacting, templated on {phrase} (+ {p} player, {name} you).
// Nothing here is anyone else's catchphrase: every line is an original (docs/LEGAL_NAMES.md).
// Merge note: the longtail lane may add this file with the same keys; keep theirs and add these lines.
export default {
  en: {
    cp: {
      ui: { title: 'Your catchphrase', pick: 'Use this one', using: 'In use', locked: 'Locked', fresh: 'New catchphrase: {phrase}', card: 'Catchphrase card' },
      house: {
        default: 'It’s happening.', bookit: 'It’s happening.', pen: 'Pen down.', dusted: 'Bags packed.', announce: 'Live now.', medical: 'Medical done.',
        ink: 'Sunglasses on.', shirt: 'Shirt’s ready.', gates: 'Plane’s landed.', sealed: 'All agreed. All done.', lockin: 'Clock’s stopped.',
      },
      unlock: {
        default: 'Yours from day one.', bookit: 'Yours from day one.', pen: 'Reach Rising rank.', dusted: 'Reach ITK rank.', announce: 'Reach Insider rank.', sealed: 'Reach Tier One rank.',
        medical: 'Hit a 7-day streak.', bags: 'Hit a 30-day streak.', front: 'Hit a 100-day streak.', shirt: 'Finish Story chapter 1.', inkdry: 'Finish Story chapter 3.', wheels: 'Finish Story chapter 5.',
        custom: 'Reach Insider rank to write your own line.', ink: 'Finish Story chapter 3.', gates: 'One of the three lines you pick on day one.', lockin: 'One of the three lines you pick on day one.',
      },
      react: {
        fan: {
          right: ['“{phrase}” and it WAS. goosebumps 🥶', 'the {phrase} post is going on my wall', 'when they say “{phrase}” you set an alarm', '“{phrase}” hits different when it’s true', 'the {phrase} merchant strikes again 🔥', 'screenshotting this “{phrase}” for the grandkids', '{p} done and the catchphrase called it. cinema', 'not the “{phrase}” 😭 we are SO back', 'saw “{phrase}” and started packing for the parade', '{name} said “{phrase}” and the club obeyed'],
          wrong: ['“{phrase}” 💀 happening where, mate', 'the “{phrase}” post aged like milk in August', 'bro said “{phrase}” with his whole chest. chest was wrong', 'retire the catchphrase. or retire', '“{phrase}” → Not happening. Not even close.', 'we need a new catchphrase. and a new source', 'the catchphrase is doing more work than the sources', 'saving this “{phrase}” for the end-of-season reel', '{p} went elsewhere and took “{phrase}” with him', 'imagine a catchphrase and no medical 😂'],
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
        default: 'حصلت خلاص.', bookit: 'حصلت خلاص.', pen: 'القلم نزل.', dusted: 'الشنط جاهزة.', announce: 'على الهوا دلوقتي.', medical: 'الكشف خلص.',
        ink: 'النضارة اتلبست.', shirt: 'القميص جاهز.', gates: 'الطيارة نزلت.', sealed: 'اتفقوا. وخلصت.', lockin: 'الساعة وقفت.',
      },
      unlock: {
        default: 'بتاعتك من أول يوم.', bookit: 'بتاعتك من أول يوم.', pen: 'وصّل لرتبة طالع.', dusted: 'وصّل لرتبة عارف.', announce: 'وصّل لرتبة من جوّه.', sealed: 'وصّل لرتبة تير وان.',
        medical: 'سلسلة ٧ أيام.', bags: 'سلسلة ٣٠ يوم.', front: 'سلسلة ١٠٠ يوم.', shirt: 'خلّص الفصل ١ في القصة.', inkdry: 'خلّص الفصل ٣ في القصة.', wheels: 'خلّص الفصل ٥ في القصة.',
        custom: 'وصّل لرتبة من جوّه واكتب جملتك بنفسك.', ink: 'خلّص الفصل ٣ في القصة.', gates: 'واحدة من التلات جمل اللي بتختارهم أول يوم.', lockin: 'واحدة من التلات جمل اللي بتختارهم أول يوم.',
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
        default: 'Está pasando.', bookit: 'Está pasando.', pen: 'Firma puesta.', dusted: 'Maletas hechas.', announce: 'En directo.', medical: 'Reconocimiento hecho.',
        ink: 'Gafas de sol puestas.', shirt: 'Camiseta lista.', gates: 'El avión ha aterrizado.', sealed: 'Todo acordado. Todo hecho.', lockin: 'Reloj parado.',
      },
      unlock: {
        default: 'Tuya desde el primer día.', bookit: 'Tuya desde el primer día.', pen: 'Llega al rango En alza.', dusted: 'Llega al rango Enterado.', announce: 'Llega al rango Insider.', sealed: 'Llega al rango Tier One.',
        medical: 'Racha de 7 días.', bags: 'Racha de 30 días.', front: 'Racha de 100 días.', shirt: 'Termina el capítulo 1 de la Historia.', inkdry: 'Termina el capítulo 3 de la Historia.', wheels: 'Termina el capítulo 5 de la Historia.',
        custom: 'Llega al rango Insider para escribir tu propia frase.', ink: 'Termina el capítulo 3 de la Historia.', gates: 'Una de las tres frases que eliges el primer día.', lockin: 'Una de las tres frases que eliges el primer día.',
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

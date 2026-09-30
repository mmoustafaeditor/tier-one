// The saga desk, 3.2: the two-step "Make the call" panel, when locked sources open, and the post you fire out
// after Publish (the classic composer, rebuilt). Lines: [outcome][loudness] with {p} {to} {from}.
export default {
  en: {
    d2: {
      call: { make: 'Make a call', later: 'Decide later', lead: 'Ready to go public on {p}?' },
      opens: 'Opens day {n}',
      post: {
        you: 'You', typing: 'typing…', now: 'just now', send: 'Post', skip: 'Tap to skip',
        replies: 'Replies', reposts: 'Reposts', likes: 'Likes',
        line: {
          done: ['Hearing talks between {to} and {p}’s camp. One to watch.', '{p} to {to} is advancing. Terms being discussed as we speak.', 'HERE WE GO. {p} to {to}, done deal. Medical booked.'],
          hijack: ['Told {p} has other options beyond {to}. Keep an eye out.', 'A third club is moving for {p}. {to} could miss out.', 'CONFIRMED: {p} is off, but NOT to {to}. Hijack.'],
          off: ['Talks between {to} and {p} have cooled.', '{to} are stepping back from {p}. Gap too big.', 'CONFIRMED: {p} to {to} is OFF. Talks collapsed.'],
          fake: ['Not convinced the {p} to {to} story is real.', 'Checked with people close to {p}: no contact with {to}.', 'FAKE. There were never talks between {to} and {p}.'],
        },
        react: {
          done: ['if this is true I’m running down the street 😭', 'the ITK has spoken. {to} fans wake up', 'source: trust me bro? 👀'],
          hijack: ['WHO is the third club?? tell us', '{to} fans in shambles rn', 'knew it. never trust a medical rumour'],
          off: ['nooo not like this 💔', 'another one bites the dust', 'so the jet was just a holiday?'],
          fake: ['called it from day one', 'the tabloids in tears reading this 😂', 'bold. very bold.'],
        },
      },
    },
  },
  ar: {
    d2: {
      call: { make: 'خد قرار', later: 'بعدين', lead: 'جاهز تنشر عن {p}؟' },
      opens: 'بيفتح يوم {n}',
      post: {
        you: 'إنت', typing: 'بيكتب…', now: 'دلوقتي', send: 'انشر', skip: 'دوس عشان تعدّي',
        replies: 'ردود', reposts: 'إعادة نشر', likes: 'إعجابات',
        line: {
          done: ['سامع إن فيه كلام بين {to} ووكلاء {p}. خلّوا عينكم عليها.', 'انتقال {p} لـ{to} ماشي. بيتكلموا في الشروط دلوقتي.', 'خلصت! {p} رايح {to}، الصفقة اتقفلت. الكشف الطبي اتحدد.'],
          hijack: ['بيقولوا {p} عنده عروض تانية غير {to}. خليكم صاحيين.', 'نادي تالت داخل على {p}. و{to} ممكن تخسره.', 'مؤكد: {p} ماشي، بس مش لـ{to}. خطف.'],
          off: ['الكلام بين {to} و{p} برد.', '{to} بترجع خطوة لورا في موضوع {p}. الفرق كبير.', 'مؤكد: صفقة {p} لـ{to} اتلغت. المفاوضات وقعت.'],
          fake: ['مش مصدق إن حكاية {p} و{to} حقيقية.', 'سألت ناس قريبة من {p}: مفيش أي تواصل مع {to}.', 'فشنك. عمره ما كان فيه كلام بين {to} و{p}.'],
        },
        react: {
          done: ['لو ده حقيقي هنزل أجري في الشارع 😭', 'المصدر اتكلم. يا جماهير {to} اصحوا', 'مصدرك مين؟ ابن خالتك؟ 👀'],
          hijack: ['مين النادي التالت؟؟ قول', 'جماهير {to} مش مصدقة دلوقتي', 'كنت عارف. متصدقش إشاعة كشف طبي أبداً'],
          off: ['لأ مش كده 💔', 'واحدة كمان راحت', 'يعني الطيارة كانت فسحة؟'],
          fake: ['قلتها من أول يوم', 'الصحف الصفرا بتعيط دلوقتي 😂', 'جامدة. جامدة أوي.'],
        },
      },
    },
  },
  es: {
    d2: {
      call: { make: 'Hacer la apuesta', later: 'Decidir luego', lead: '¿Listo para publicar lo de {p}?' },
      opens: 'Abre el día {n}',
      post: {
        you: 'Tú', typing: 'escribiendo…', now: 'ahora', send: 'Publicar', skip: 'Toca para saltar',
        replies: 'Respuestas', reposts: 'Reposts', likes: 'Me gusta',
        line: {
          done: ['Me llegan contactos entre el {to} y el entorno de {p}. Atentos.', 'Lo de {p} al {to} avanza. Se negocian los términos ahora mismo.', 'HERE WE GO. {p} al {to}, cerrado. Revisión médica fijada.'],
          hijack: ['Me dicen que {p} tiene más opciones aparte del {to}. Ojo.', 'Un tercer club va a por {p}. El {to} puede quedarse sin él.', 'CONFIRMADO: {p} se va, pero NO al {to}. Robo.'],
          off: ['Las conversaciones entre el {to} y {p} se han enfriado.', 'El {to} se echa atrás con {p}. Demasiada distancia.', 'CONFIRMADO: lo de {p} al {to} se CAE. Negociación rota.'],
          fake: ['No me creo la historia de {p} al {to}.', 'He hablado con gente cercana a {p}: ningún contacto con el {to}.', 'FALSO. Nunca hubo conversaciones entre el {to} y {p}.'],
        },
        react: {
          done: ['si esto es verdad salgo corriendo a la calle 😭', 'habló el que sabe. Afición del {to}, despertad', '¿fuente: confía en mí? 👀'],
          hijack: ['¿¿QUIÉN es el tercer club?? cuéntalo', 'la afición del {to} hundida ahora mismo', 'lo sabía. nunca te fíes de un rumor de médico'],
          off: ['nooo así no 💔', 'otro que se cae', '¿entonces el jet era de vacaciones?'],
          fake: ['lo dije desde el primer día', 'los tabloides llorando al leer esto 😂', 'valiente. muy valiente.'],
        },
      },
    },
  },
};

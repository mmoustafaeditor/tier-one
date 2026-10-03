// Strings for the first-week guide (ui2/Guide.tsx). EN is the reference; AR is Egyptian Arabic.
type Steps = Record<'board' | 'staff' | 'xi' | 'report' | 'match', [string, string]>;
interface GuideStrings { title: string; lead: string; progress: (n: number, of: number) => string; show: string; hide: string; steps: Steps }

const en: GuideStrings = {
  title: 'Your first week',
  lead: 'Five things that set up a season. Each one ticks itself off when it’s done.',
  progress: (n, of) => `${n} of ${of}`,
  show: 'Show me',
  hide: 'Hide the guide',
  steps: {
    board: ['Agree the season with the board', 'Their target decides how they judge you. It’s the first card on this page.'],
    staff: ['Decide how hands-on you are', 'Pick what the staff run without asking. You can change it any time in Club › Staff.'],
    xi: ['Set your plan', 'Match › Tactics: the shape, who plays where, what each choice gains and risks. Lock it in, or leave it and the assistant picks at kick-off.'],
    report: ['Get the report on your opponent', 'On Today or in Tactics: the analyst tells you how they play and where to hurt them.'],
    match: ['Play your first match', 'Continue takes you to matchday. Watch it, or just take the result.'],
  },
};
const ar: GuideStrings = {
  title: 'أول أسبوع ليك',
  lead: 'خمس حاجات بيظبطوا الموسم. كل واحدة بتتعلّم لوحدها لما تخلص.',
  progress: (n, of) => `${n} من ${of}`,
  show: 'ورّيني',
  hide: 'اخفي الدليل',
  steps: {
    board: ['اتفق مع الإدارة على الموسم', 'الهدف بتاعهم هو اللي هيحاسبوك عليه. أول كارت في الصفحة دي.'],
    staff: ['قرّر هتمسك إيه بنفسك', 'اختار الجهاز يعمل إيه من غير ما يسألك. تقدر تغيّره في أي وقت من النادي › الجهاز.'],
    xi: ['ظبّط خطتك', 'الماتش › التكتيك: الشكل، مين بيلعب فين، وكل اختيار بيكسّبك إيه وبيخاطر بإيه. ثبّتها، أو سيبها والمساعد يختار قبل الماتش.'],
    report: ['هات تقرير عن الخصم', 'من النهارده أو التكتيك: المحلل هيقولك بيلعبوا إزاي وتوجعهم منين.'],
    match: ['العب أول ماتش', 'كمّل هتوديك ليوم الماتش. اتفرج عليه أو خد النتيجة على طول.'],
  },
};
const es: GuideStrings = {
  title: 'Tu primera semana',
  lead: 'Cinco cosas que preparan una temporada. Cada una se marca sola cuando está hecha.',
  progress: (n, of) => `${n} de ${of}`,
  show: 'Enséñamelo',
  hide: 'Ocultar la guía',
  steps: {
    board: ['Pacta la temporada con la directiva', 'Su objetivo decide cómo te juzgan. Es la primera tarjeta de esta página.'],
    staff: ['Decide cuánto llevas tú', 'Elige qué lleva el cuerpo técnico sin preguntar. Puedes cambiarlo en Club › Cuerpo técnico.'],
    xi: ['Fija tu plan', 'Partido › Táctica: el sistema, quién juega dónde y qué gana y arriesga cada opción. Fíjalo, o déjalo y el segundo elige antes del partido.'],
    report: ['Pide el informe del rival', 'En Hoy o en Táctica: el analista te dice cómo juegan y dónde hacerles daño.'],
    match: ['Juega tu primer partido', 'Continuar te lleva al día de partido. Míralo o quédate con el resultado.'],
  },
};
const fr: GuideStrings = {
  title: 'Ta première semaine',
  lead: 'Cinq choses qui lancent une saison. Chacune se coche toute seule une fois faite.',
  progress: (n, of) => `${n} sur ${of}`,
  show: 'Montre-moi',
  hide: 'Masquer le guide',
  steps: {
    board: ['Fixe la saison avec la direction', 'Son objectif décide comment elle te jugera. C’est la première carte de cette page.'],
    staff: ['Décide de ce que tu gères toi-même', 'Choisis ce que le staff fait sans demander. Modifiable à tout moment dans Club › Staff.'],
    xi: ['Fixe ton plan', 'Match › Tactique : le système, qui joue où, ce que chaque choix apporte et risque. Valide-le, ou laisse l’adjoint choisir avant le match.'],
    report: ['Demande le rapport sur l’adversaire', 'Sur Aujourd’hui ou en Tactique : l’analyste te dit comment ils jouent et où les blesser.'],
    match: ['Joue ton premier match', 'Continuer t’emmène au jour de match. Regarde-le ou prends juste le résultat.'],
  },
};
export const GD = { en, ar, es, fr } as const;

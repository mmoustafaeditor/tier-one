// V2.7 Club vision, Arabic (Egyptian colloquial). Type-checked against lang-club.ts.
import type { CLStrings } from './lang-club';
// جولة / جولتين / 3-10 جولات / 11+ جولة
const md = (n: number) => (n === 1 ? 'جولة' : n === 2 ? 'جولتين' : n <= 10 ? `${n} جولات` : `${n} جولة`);

export const CL_AR: CLStrings = {
  tag: 'اجتماع الإدارة',
  derby: 'ديربي',
  title: (season: string) => `خطة الإدارة لموسم ${season}`,
  advice: (target: string) => `هدفنا: ${target}. لو عايز تطمح لأكتر، صاحب النادي هيدعمك بفلوس، بس هنحاسبك أصعب.`,
  choices: {
    expected: () => 'هدفكم مظبوط',
    ambitious: (target: string) => `نطمح لأكتر: ${target}`,
  },
  fx: {
    goodwill: () => 'الإدارة +5',
    kitty: (v: string) => `${v} من صاحب النادي`,
    strict: () => 'إدارة أشد',
    target: (t: string) => t,
  },
  board: {
    none: 'الإدارة بتجتمع قبل أول جولات الموسم.',
    expected: (t: string) => `خطة الموسم: هدف الإدارة، ${t}.`,
    ambitious: (t: string, v: string) => `خطة الموسم: طموحة، ${t}. صاحب النادي حط ${v}، والإدارة هتحاسب أصعب.`,
  },
  build: {
    busy: (level: number, n: number) => `بنبني المستوى ${level} · يخلص بعد ${md(n)}`,
    takes: (n: number) => `بياخد ${md(n)}`,
    oneAtATime: 'مشروع بناء واحد في المرة',
    opened: (f: string, level: number) => `${f} الجديد اتفتح: المستوى ${level}.`,
  },
  ledger: { owner: 'استثمار صاحب النادي', parachute: 'تعويض الهبوط' },
  awards: {
    title: 'ليلة الجوايز',
    poty: 'أحسن لاعب في الموسم', young: 'أحسن لاعب صاعد', boot: 'الحذاء الذهبي', keeper: 'أحسن حارس في الموسم', manager: 'أحسن مدرب في الموسم',
    team: 'تشكيلة الموسم', elsewhere: 'في الدوريات التانية',
    goals: (n: number) => (n === 1 ? 'جول واحد' : n === 2 ? 'جولين' : n <= 10 ? `${n} أجوال` : `${n} جول`), rating: (v: number) => `متوسط ${v.toFixed(1)}`, you: 'إنت',
    ours: (n: number) => (n === 1 ? 'لاعب واحد من عندنا في تشكيلة الموسم.' : `${n} من لاعيبتنا في تشكيلة الموسم.`),
  },
  legends: {
    title: 'أساطير النادي',
    none: 'لسه مفيش أساطير. عايزة 200 ماتش دوري هنا، أو 80 جول، أو 100 ماتش وبطولتين.',
    way: 'في الطريق',
    line: (apps: number, goals: number, trophies: number) => `${apps} ماتش · ${goals} جول · ${trophies} بطولة`,
  },
  press: {
    tag: 'مؤتمر صحفي',
    q: {
      predict: (opp: string) => `تقدر تكسب ${opp}؟`,
      star: (pn: string) => `${pn} هو راجل الماتش ده؟`,
      rival: (opp: string) => `مدرب ${opp} بيقول إنك متوتر.`,
      blame: (opp: string) => `إيه اللي حصل قدام ${opp}؟`,
      ref: (opp: string) => `الكارت الأحمر قدام ${opp}. كان صح؟`,
    },
    adv: {
      predict: 'الرد الهادي عمره ما بيخسرنا. لو وعدت بالفوز لازم نكسب.',
      star: 'لو سندته قدام الناس هيكبر. وباقي اللاعيبة بيحبوا يسمعوا إن الفريق كله مهم.',
      rival: 'هو عايز رد فعل. لو رديت عليه الجمهور هيحبها، بس ساعتها لازم نكسب.',
      blame: 'خليها جوه غرفة اللبس لو تقدر. لو سميت لاعب قدام الناس هيزعل جامد.',
      ref: 'لو هاجمت الحكم الجمهور هيسقف والإدارة هتتضايق.',
    },
    a: {
      predict: { measured: 'بنحترمهم وهنكون جاهزين', confident: 'هنكسب', deflect: 'اسألني بعد الماتش' },
      star: { measured: 'الموضوع موضوع فريق', confident: (pn: string) => `${pn} هو اللي هيحسمها`, deflect: 'مش هتكلم عن أفراد' },
      rival: { measured: 'سيبه يتكلم، إحنا مركزين في نفسنا', confident: 'هنرد عليه في الملعب بالفوز', deflect: 'ماسمعتش هو قال إيه' },
      blame: { measured: 'هنراجعها مع بعض', confident: 'دي غلطتي أنا', deflect: 'يوم وحش وهنكمل', name: (pn: string) => `${pn} خذلنا` },
      ref: { measured: 'هسيبها للحكام', confident: 'الحكم غلط', deflect: 'ماشفتهاش كويس' },
    },
    fx: {
      squad: (n: string) => `معنويات الفريق ${n}`, morale: (n: string) => `معنوياته ${n}`, trust: (n: string) => `ثقته ${n}`,
      board: (n: string) => `الإدارة ${n}`, fans: (n: string) => `الجمهور ${n}`,
      claim: 'وعد قدام الناس: لو خسرنا منهم الإدارة −3 والجمهور −4', safe: 'مش هتكلفنا حاجة',
    },
  },
  store: {
    base: 'تيل سمبا', free: 'ببلاش', buy: (price: string) => `افتحه · ${price}`, use: 'استخدمه', inUse: 'مستخدم دلوقتي',
    short: (n: number) => `ناقصك ${n} كريدت`, bought: 'الشكل اتفتح.',
    seasonEarn: 'بتاخد 50 كريدت عن كل موسم تخلّصه (أول 10 مواسم في المشوار).',
    seasonToast: (n: number) => `+${n} كريدت سمبا عشان خلّصت الموسم.`,
  },
};

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
};

// V2.7 Club vision, Arabic (Egyptian colloquial). Type-checked against lang-club.ts.
import type { CLStrings } from './lang-club';
// جولة / جولتين / 3-10 جولات / 11+ جولة
const md = (n: number) => (n === 1 ? 'جولة' : n === 2 ? 'جولتين' : n <= 10 ? `${n} جولات` : `${n} جولة`);

export const CL_AR: CLStrings = {
  tag: 'اجتماع الإدارة',
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
};

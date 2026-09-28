import type { CountryCode, League, LocalizedName } from '../model/types';

// The big five are the main playable leagues. Arab leagues come from the old game's data and stay in.
// Names are generic/near-real on purpose (no trademarked league names).

export interface Country {
  code: CountryCode;
  flag: string;
  name: LocalizedName;
  main: boolean;
}

export const COUNTRIES: Country[] = [
  { code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: { en: 'England', ar: 'إنجلترا' }, main: true },
  { code: 'ESP', flag: '🇪🇸', name: { en: 'Spain', ar: 'إسبانيا' }, main: true },
  { code: 'ITA', flag: '🇮🇹', name: { en: 'Italy', ar: 'إيطاليا' }, main: true },
  { code: 'GER', flag: '🇩🇪', name: { en: 'Germany', ar: 'ألمانيا' }, main: true },
  { code: 'FRA', flag: '🇫🇷', name: { en: 'France', ar: 'فرنسا' }, main: true },
  { code: 'EGY', flag: '🇪🇬', name: { en: 'Egypt', ar: 'مصر' }, main: false },
  { code: 'KSA', flag: '🇸🇦', name: { en: 'Saudi Arabia', ar: 'السعودية' }, main: false },
  { code: 'MAR', flag: '🇲🇦', name: { en: 'Morocco', ar: 'المغرب' }, main: false },
  { code: 'TUN', flag: '🇹🇳', name: { en: 'Tunisia', ar: 'تونس' }, main: false },
  { code: 'ALG', flag: '🇩🇿', name: { en: 'Algeria', ar: 'الجزائر' }, main: false },
  { code: 'UAE', flag: '🇦🇪', name: { en: 'UAE', ar: 'الإمارات' }, main: false },
  { code: 'QAT', flag: '🇶🇦', name: { en: 'Qatar', ar: 'قطر' }, main: false },
];

const L = (id: string, country: CountryCode, tier: number, en: string, ar: string, clubs: number, main: boolean): League =>
  ({ id, country, tier, name: { en, ar }, clubs, main });

export const LEAGUES: League[] = [
  L('eng1', 'ENG', 1, 'English Premier Division', 'الدوري الإنجليزي الممتاز', 20, true),
  L('eng2', 'ENG', 2, 'English Championship', 'دوري البطولة الإنجليزي', 24, true),
  L('esp1', 'ESP', 1, 'Spanish Primera', 'الدوري الإسباني الأول', 20, true),
  L('esp2', 'ESP', 2, 'Spanish Segunda', 'الدوري الإسباني الثاني', 22, true),
  L('ita1', 'ITA', 1, 'Italian Serie Prima', 'الدوري الإيطالي الأول', 20, true),
  L('ita2', 'ITA', 2, 'Italian Serie Seconda', 'الدوري الإيطالي الثاني', 20, true),
  L('ger1', 'GER', 1, 'German Erste Liga', 'الدوري الألماني الأول', 18, true),
  L('ger2', 'GER', 2, 'German Zweite Liga', 'الدوري الألماني الثاني', 18, true),
  L('fra1', 'FRA', 1, 'French Première Ligue', 'الدوري الفرنسي الأول', 18, true),
  L('fra2', 'FRA', 2, 'French Deuxième Ligue', 'الدوري الفرنسي الثاني', 18, true),
  L('egy1', 'EGY', 1, 'Egyptian Premier League', 'الدوري المصري الممتاز', 18, false),
  L('egy2', 'EGY', 2, 'Egyptian Second Division', 'دوري المحترفين المصري', 20, false),
  L('ksa1', 'KSA', 1, 'Saudi Pro League', 'الدوري السعودي للمحترفين', 18, false),
  L('mar1', 'MAR', 1, 'Moroccan Pro League', 'البطولة المغربية الاحترافية', 16, false),
  L('tun1', 'TUN', 1, 'Tunisian Ligue 1', 'الرابطة التونسية الأولى', 16, false),
  L('alg1', 'ALG', 1, 'Algerian Ligue 1', 'الرابطة الجزائرية الأولى', 16, false),
  L('uae1', 'UAE', 1, 'UAE Pro League', 'دوري الإمارات للمحترفين', 14, false),
  L('qat1', 'QAT', 1, 'Qatar Stars League', 'دوري نجوم قطر', 12, false),
];

export const leaguesOf = (country: CountryCode) => LEAGUES.filter((l) => l.country === country).sort((a, b) => a.tier - b.tier);

// Sponsors with playful NEAR-REAL names (studio decision: same spirit as «Liverpool Reds»). Never the real brand, logo or colours.
// v0.4 shows each club's kit supplier and shirt sponsor; the sponsor contracts and money arrive with the economy (FEATURES.md §6).
import type { Club, CountryCode, LocalizedName } from '../model/types';

type S = [string, string];
const N = ([en, ar]: S): LocalizedName => ({ en, ar });

export const KIT_MAKERS: S[] = [
  ['Nikey', 'نايكاي'], ['Adibas', 'أديباس'], ['Pumba', 'بومبا'], ['Umbrello', 'أمبريلو'],
  ['Kappo', 'كابو'], ['New Balanz', 'نيو بالانز'], ['Jomo', 'جومو'], ['Makrono', 'ماكرونو'],
];

const GLOBAL: S[] = [
  ['Emiratez Air', 'طيران الإماراتز'], ['Qatar Airwaves', 'قطر إيرويفز'], ['Spotifly', 'سبوتيفلاي'], ['Rakutin', 'راكوتين'],
  ['Vodafun', 'فودافَن'], ['Samsong', 'سامسونغ'], ['Red Bool', 'ريد بوول'], ['Etihadd Airways', 'طيران الاتحادد'],
];

const LOCAL: Partial<Record<CountryCode, S[]>> = {
  EGY: [['Orangi', 'أورانجي'], ['WEE', 'ويي'], ['Etisalad', 'اتصالاد'], ['CIBB Bank', 'بنك سي آي بي بي'], ['Juhayma', 'جهايمة'], ['Chipsi', 'شيبسيه'], ['Vodafun', 'فودافَن'], ['Pepsy', 'بيبسيه'], ['Koshary Express', 'كشري إكسبريس']],
  KSA: [['Aramcoo', 'أرامكوو'], ['Riyad Air', 'رياض إير'], ['Mobily Plus', 'موبايلي بلس'], ['Almarae', 'المراعيه']],
  QAT: [['Qatar Airwaves', 'قطر إيرويفز'], ['Ooredooh', 'أوريدووه'], ['QNBB', 'كيو إن بي بي']],
  UAE: [['Emiratez Air', 'طيران الإماراتز'], ['Etisalad', 'اتصالاد'], ['Emaar Homes', 'إعمار هومز']],
  MAR: [['Maroq Telecom', 'ماروق تيليكوم'], ['Royal Air Maroq', 'الملكية الماروقية'], ['Inwii', 'إنوي']],
  TUN: [['Tunisaire', 'تونيسير'], ['Ooredooh', 'أوريدووه'], ['Délice Dairy', 'ديليس للألبان']],
  ALG: [['Djezzi', 'دجيزي'], ['Ooredooh', 'أوريدووه'], ['Sonatrakk', 'سوناطراك']],
  ENG: [['Pie & Mash Co.', 'باي آند ماش'], ['Brolly Insurance', 'برولي للتأمين'], ['Kebab King', 'ملك الكباب']],
  ESP: [['Churros Rápidos', 'تشوروس سريعة'], ['Banco Sol', 'بنك سول'], ['Paella Express', 'بايلا إكسبريس']],
  ITA: [['Pasta Nonna', 'باستا نونا'], ['Vespino', 'فيسبينو'], ['Caffè Forte', 'كافيه فورتي']],
  GER: [['Wurst & Co.', 'فورست وشركاه'], ['Autobahn Motors', 'أوتوبان موتورز'], ['Bier Garten', 'بير جارتن']],
  FRA: [['Croissant Club', 'نادي الكرواسون'], ['Baguette Bank', 'بنك الباغيت'], ['Fromage Plus', 'فروماج بلس']],
};

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 11);

// Shirt sponsors a club can attract: global brands for the big clubs of the big leagues, local ones for everyone else.
export function shirtBrands(country: CountryCode, tier: number, reputation: number): [string, string][] {
  const big = tier === 1 && reputation >= 84 && !['EGY', 'MAR', 'TUN', 'ALG'].includes(country);
  return big ? GLOBAL : LOCAL[country] ?? GLOBAL;
}

// Big clubs wear global brands; everyone else wears local ones. Fixed per club (same club, same sponsors).
export function sponsorsOf(club: Club, country: CountryCode, tier: number): { kit: LocalizedName; shirt: LocalizedName } {
  const h = hash(club.id);
  const kit = KIT_MAKERS[h % (club.reputation >= 80 ? 3 : KIT_MAKERS.length)];
  const local = LOCAL[country] ?? GLOBAL;
  const big = tier === 1 && club.reputation >= 84 && !['EGY', 'MAR', 'TUN', 'ALG'].includes(country);
  const shirt = big ? GLOBAL[(h >>> 3) % GLOBAL.length] : local[(h >>> 3) % local.length];
  return { kit: N(kit), shirt: N(shirt) };
}

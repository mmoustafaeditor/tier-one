// Sponsors with FICTIONAL brand names (studio decision, Sep 2026): no real brand and no parody of one.
// v0.4 shows each club's kit supplier and shirt sponsor; the sponsor contracts and money arrive with the economy (FEATURES.md §6).
import type { Club, CountryCode, LocalizedName, SponsorSlot } from '../model/types';

type S = [string, string];
const N = ([en, ar]: S): LocalizedName => ({ en, ar });

// Kit suppliers. The first three are the ones the big clubs wear.
export const KIT_MAKERS: S[] = [
  ['Stridon', 'ستريدون'], ['Vantrel', 'فانتريل'], ['Kestrel Sport', 'كستريل سبورت'], ['Halcyra', 'هالسيرا'],
  ['Tervo', 'تيرفو'], ['Ardent Athletic', 'أردنت أثليتيك'], ['Quintal', 'كوينتال'], ['Sahel Sport', 'ساحل سبورت'],
];

const GLOBAL: S[] = [
  ['Skyvale Airways', 'طيران سكايفيل'], ['Orbivo', 'أوربيفو'], ['Nimbra Cloud', 'نيمبرا كلاود'], ['Zephyra', 'زيفيرا'],
  ['Lumora', 'لومورا'], ['Voltade', 'فولتيد'], ['Crestmoor Bank', 'بنك كريستمور'], ['Tidewell Energy', 'تايدويل للطاقة'],
];

const LOCAL: Partial<Record<CountryCode, S[]>> = {
  EGY: [['Nile Link', 'نايل لينك'], ['Pharaoh Mobile', 'فرعون موبايل'], ['Masr Horizon Bank', 'بنك أفق مصر'], ['Delta Dairy', 'ألبان الدلتا'], ['Fawanees Snacks', 'سناكس فوانيس'], ['Tahrir Motors', 'تحرير موتورز'], ['Saeed Cola', 'سعيد كولا'], ['El Hara Bakery', 'مخبز الحارة'], ['Koshary Express', 'كشري إكسبريس']],
  KSA: [['Sahm Petroleum', 'بترول سهم'], ['Dunes Air', 'طيران الكثبان'], ['Najd Telecom', 'نجد للاتصالات'], ['Wahat Dairy', 'ألبان الواحات'], ['Rimal Dates', 'تمور رمال']],
  QAT: [['Pearl Airways', 'طيران اللؤلؤة'], ['Doha Wave', 'دوحة ويف'], ['Sadu Bank', 'بنك السدو']],
  UAE: [['Dune Jet', 'دون جيت'], ['Creek Mobile', 'كريك موبايل'], ['Marina Homes', 'مارينا هومز']],
  MAR: [['Toubkal Telecom', 'توبقال تيليكوم'], ['Argan Air', 'طيران أركان'], ['Medina Mint Tea', 'أتاي المدينة']],
  TUN: [['Jasmin Air', 'طيران الياسمين'], ['Kerkennah Link', 'قرقنة لينك'], ['Sahel Dairy', 'ألبان الساحل']],
  ALG: [['Kasbah Mobile', 'قصبة موبايل'], ['Hoggar Energy', 'طاقة الهقار'], ['Djurdjura Water', 'مياه جرجرة']],
  ENG: [['Pie & Mash Co.', 'باي آند ماش'], ['Brolly Insurance', 'برولي للتأمين'], ['Kebab King', 'ملك الكباب']],
  ESP: [['Churros Rápidos', 'تشوروس سريعة'], ['Banco Sol', 'بنك سول'], ['Paella Express', 'بايلا إكسبريس']],
  ITA: [['Pasta Nonna', 'باستا نونا'], ['Vespino', 'فيسبينو'], ['Caffè Forte', 'كافيه فورتي']],
  GER: [['Wurst & Co.', 'فورست وشركاه'], ['Autobahn Motors', 'أوتوبان موتورز'], ['Bier Garten', 'بير جارتن']],
  FRA: [['Croissant Club', 'نادي الكرواسون'], ['Baguette Bank', 'بنك الباغيت'], ['Fromage Plus', 'فروماج بلس']],
};

// Brands for the slots that are always open offers (the shirt uses shirtBrands, the kit KIT_MAKERS).
export const SLOT_BRANDS: Record<Exclude<SponsorSlot, 'shirt' | 'kit'>, S[]> = {
  stadium: [['Orbivo Arena', 'ساحة أوربيفو'], ['Skyvale Park', 'حديقة سكايفيل'], ['Nile Link Stadium', 'استاد نايل لينك'], ['Voltade Dome', 'قبة فولتيد'], ['Crestmoor Ground', 'ملعب كريستمور']],
  sleeve: [['Lumora', 'لومورا'], ['Zephyra', 'زيفيرا'], ['Koshary Express', 'كشري إكسبريس'], ['Kebab King', 'ملك الكباب'], ['Fawanees Snacks', 'سناكس فوانيس'], ['Nimbra Cloud', 'نيمبرا كلاود']],
  commercial: [['Masr Horizon Bank', 'بنك أفق مصر'], ['Bolt Rush Energy', 'بولت راش إنرجي'], ['Delta Dairy', 'ألبان الدلتا'], ['Saeed Cola', 'سعيد كولا'], ['Sahm Petroleum', 'بترول سهم'], ['Tidewell Energy', 'تايدويل للطاقة']],
};

// n different brands from a list (never the same brand twice in one slot's offers).
export function pickBrands(r: () => number, brands: S[], n: number): S[] {
  const left = [...brands];
  const out: S[] = [];
  while (out.length < n && left.length) out.push(left.splice(Math.floor(r() * left.length), 1)[0]);
  return out;
}

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

// For the save renamer: every list, by name, so an old save's brand maps to the brand at the same place today.
export const _BRAND_LISTS: Record<string, S[]> = {
  KIT: KIT_MAKERS, GLOBAL, ...Object.fromEntries(Object.entries(LOCAL).map(([k, v]) => [`LOCAL_${k}`, v!])),
  ...Object.fromEntries(Object.entries(SLOT_BRANDS).map(([k, v]) => [`SLOT_${k}`, v])),
};

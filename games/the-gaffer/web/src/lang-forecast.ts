// Strings for the spending forecast under a facility upgrade (ui2/Office.tsx Facilities). EN is the reference; AR is
// Egyptian Arabic.
import type { UiLang } from './i18n';

interface FcStrings { line: (cash: string, keep: string, low: string, month: string) => string; short: string }
const en: FcStrings = { line: (c, k, l, m) => `After paying: ${c} cash · +${k} a month upkeep · lowest point this season ${l} (${m})`, short: 'That would take the club into the red this season.' };
const ar: FcStrings = { line: (c, k, l, m) => `بعد الدفع: ${c} كاش · +${k} صيانة في الشهر · أقل نقطة الموسم ده ${l} (${m})`, short: 'كده النادي هيدخل في السالب الموسم ده.' };
const es: FcStrings = { line: (c, k, l, m) => `Tras pagar: ${c} en caja · +${k} al mes de mantenimiento · punto más bajo de la temporada ${l} (${m})`, short: 'Eso dejaría al club en números rojos esta temporada.' };
const fr: FcStrings = { line: (c, k, l, m) => `Après paiement : ${c} en caisse · +${k} par mois d’entretien · point le plus bas de la saison ${l} (${m})`, short: 'Le club passerait dans le rouge cette saison.' };
export const FC: Record<UiLang, FcStrings> = { en, ar, es, fr };

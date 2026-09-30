// Tactics v3 copy, all four languages.
import type { UiLang } from './i18n';
import { TX_EN, type TxStrings } from './lang-tac';
import { TX_AR } from './lang-tac-ar';
import { TX_ES } from './lang-tac-es';
import { TX_FR } from './lang-tac-fr';

export const TX: Record<UiLang, TxStrings> = { en: TX_EN, ar: TX_AR, es: TX_ES, fr: TX_FR };
// For code that only has the base Strings object (the Why text, commentary): pick by its language tag.
export const txOf = (t: { lang: string }): TxStrings => (t.lang === 'ES' ? TX_ES : t.lang === 'FR' ? TX_FR : t.lang === 'EN' ? TX_EN : TX_AR);
export type { TxStrings };

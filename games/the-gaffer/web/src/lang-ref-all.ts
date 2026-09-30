// The officials' copy (gf-ref), all four languages, type-checked against English (lang-ref.ts).
import type { UiLang } from './i18n';
import { R_EN, type RefStrings } from './lang-ref';
import { R_AR } from './lang-ref-ar';
import { R_ES } from './lang-ref-es';
import { R_FR } from './lang-ref-fr';

export const RF: Record<UiLang, RefStrings> = { en: R_EN, ar: R_AR, es: R_ES, fr: R_FR };
export type { RefStrings };

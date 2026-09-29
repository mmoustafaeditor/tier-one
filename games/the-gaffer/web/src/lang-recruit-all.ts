// Recruitment copy in every language, type-checked against English (lang-recruit.ts).
import type { UiLang } from './i18n';
import { R_EN, type RStrings } from './lang-recruit';
import { R_AR } from './lang-recruit-ar';
import { R_ES } from './lang-recruit-es';
import { R_FR } from './lang-recruit-fr';

export const R: Record<UiLang, RStrings> = { en: R_EN, ar: R_AR, es: R_ES, fr: R_FR };

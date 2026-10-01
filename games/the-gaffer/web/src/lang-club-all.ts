// V2.7 Club vision copy, all four languages.
import type { UiLang } from './i18n';
import { CL_EN, type CLStrings } from './lang-club';
import { CL_AR } from './lang-club-ar';
import { CL_ES } from './lang-club-es';
import { CL_FR } from './lang-club-fr';

export const CL: Record<UiLang, CLStrings> = { en: CL_EN, ar: CL_AR, es: CL_ES, fr: CL_FR };
export type { CLStrings };

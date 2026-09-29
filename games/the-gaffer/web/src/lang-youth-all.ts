// V2.6 Training & pathway copy, all four languages.
import type { UiLang } from './i18n';
import { Y_EN, type YStrings } from './lang-youth';
import { Y_AR } from './lang-youth-ar';
import { Y_ES } from './lang-youth-es';
import { Y_FR } from './lang-youth-fr';

export const Y: Record<UiLang, YStrings> = { en: Y_EN, ar: Y_AR, es: Y_ES, fr: Y_FR };
export type { YStrings };

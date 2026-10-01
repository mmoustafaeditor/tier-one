import type { UiLang } from './i18n';
import { NV_EN, type NVStrings } from './lang-nav';
import { NV_AR } from './lang-nav-ar';
import { NV_ES } from './lang-nav-es';
import { NV_FR } from './lang-nav-fr';
export const NV: Record<UiLang, NVStrings> = { en: NV_EN, ar: NV_AR, es: NV_ES, fr: NV_FR };

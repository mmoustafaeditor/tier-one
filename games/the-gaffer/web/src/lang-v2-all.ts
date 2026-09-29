// Every language's v2 copy, type-checked against English (lang-v2.ts).
import type { UiLang } from './i18n';
import { X_EN, type XStrings } from './lang-v2';
import { X_AR } from './lang-v2-ar';
import { X_ES } from './lang-v2-es';
import { X_FR } from './lang-v2-fr';

export const X: Record<UiLang, XStrings> = { en: X_EN, ar: X_AR, es: X_ES, fr: X_FR };

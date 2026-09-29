// Every language's dressing-room copy (V2.4), type-checked against English (lang-dressing.ts).
import { UI, type Strings, type UiLang } from './i18n';
import { D_EN, type DStrings } from './lang-dressing';
import { D_AR } from './lang-dressing-ar';
import { D_ES } from './lang-dressing-es';
import { D_FR } from './lang-dressing-fr';

export const D: Record<UiLang, DStrings> = { en: D_EN, ar: D_AR, es: D_ES, fr: D_FR };
// For helpers that are handed the core strings rather than the UI language (news, inbox, the Why card).
export const dOf = (t: Strings): DStrings => D[(Object.keys(UI) as UiLang[]).find((k) => UI[k] === t) ?? 'en'];

import { useSave, getSave } from './save';
import en, { type Dict } from '../i18n/en';
import ar from '../i18n/ar';
import es from '../i18n/es';

// 3.1: each screen area adds its strings in i18n/parts/<area>.ts as { en, ar, es }; they merge over the base editions.
type Part = { en?: object; ar?: object; es?: object };
const PARTS = Object.values(import.meta.glob<{ default: Part }>('../i18n/parts/*.ts', { eager: true })).map((m) => m.default);
function deep(a: any, b: any): any { if (!b) return a; const o: any = Array.isArray(a) ? [...a] : { ...a }; for (const k of Object.keys(b)) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a && typeof a[k] === 'object' ? deep(a[k], b[k]) : b[k]; return o; }
const merged = (base: Dict, lang: 'en' | 'ar' | 'es') => PARTS.reduce((acc, p) => deep(acc, p[lang]), base as any) as Dict;
const EN = merged(en, 'en');
const DICTS: Record<string, Dict> = { en: EN, ar: merged(ar, 'ar'), es: merged(es, 'es') };
export const LANGS = [['en', 'English'], ['ar', 'العربية'], ['es', 'Español']] as const;
export type Vars = Record<string, string | number>;

function get(d: any, path: string) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), d); }
export function fill(s: string, v?: Vars) { return v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m)) : s; }
export function tr(lang: string, key: string, v?: Vars): string {
  const x = get(DICTS[lang] || EN, key) ?? get(EN, key);
  return typeof x === 'string' ? fill(x, v) : key;
}
export function trList(lang: string, key: string): any { return get(DICTS[lang] || EN, key) ?? get(EN, key); }
export const t = (key: string, v?: Vars) => tr(getSave().lang, key, v);
export const tl = (key: string) => trList(getSave().lang, key);
export function useT() {
  const s = useSave();
  const f = (key: string, v?: Vars) => tr(s.lang, key, v);
  f.list = (key: string) => trList(s.lang, key);
  f.lang = s.lang;
  f.rtl = s.lang === 'ar';
  return f;
}
export type T = ReturnType<typeof useT>;
// Numbers: Western digits everywhere (tabular, matches the wood-type figures), with a real minus sign.
export const num = (n: number, sign = false) => (n < 0 ? '−' + Math.abs(n) : (sign && n > 0 ? '+' : '') + n);
export function fmtDate(ms: number, lang: string, o: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  try { return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : lang === 'es' ? 'es-ES' : 'en-GB', o).format(ms); } catch { return new Date(ms).toDateString(); }
}

// V2.4 dressing room words for shared surfaces: Today cards, news, inbox, the staff log and the Why card.
// Everything here only reads; keys that start with 'dr.' belong to the dressing room.
import type { Lang, Strings } from '../i18n';
import type { Career, Msg, NewsItem, Pledge, RoomCause } from '../model/types';
import type { Choice, Fx, Ref } from '../sim/decisions';
import type { Point } from '../sim/engine/story';
import { money, playerOf, type World } from '../sim/world';
import { D, dOf } from '../lang-dressing-all';
import type { DStrings } from '../lang-dressing';
import type { Game } from './game';

export const isRoom = (key: string | undefined) => !!key && key.startsWith('dr.');
const pn = (g: Game, r: { pn?: { en: string; ar: string } }) => (r.pn ? r.pn[g.lang] || r.pn.en : '');
const club = (w: World, lang: Lang, id?: string) => (id ? w.clubs.find((x) => x.id === id)?.name[lang] ?? '' : '');
const fn = (v: unknown, ...a: string[]) => (typeof v === 'function' ? (v as (...x: string[]) => string)(...a) : typeof v === 'string' ? v : '');

export const groupWord = (d: DStrings, key: string) => (key.startsWith('sign.') ? d.groups[Number(key.split('.')[1]) || 0] : '');
export const pledgeWhat = (d: DStrings, key: string) => d.pledge(key, groupWord(d, key));
export const pledgeKeyOf = (pl: Pick<Pledge, 'type' | 'role' | 'group'>) => (pl.type === 'role' ? `role.${pl.role}` : pl.type === 'sign' ? `sign.${pl.group ?? 1}` : pl.type);

export function roomTitle(g: Game, r: Ref): string {
  const d = D[g.ui];
  const k = r.key.slice(3);
  const f = d.titles[k];
  if (!f) return k;
  if (k === 'clause') return f(pn(g, r), money(r.n ?? 0), club(g.w, g.lang, r.club));
  if (k === 'due.sign') return f(pn(g, r), d.groups[r.n ?? 1]);
  return f(pn(g, r));
}

export function roomAdvice(g: Game, r: Ref): string {
  const d = D[g.ui];
  const k = r.key.slice(7); // 'dr.adv.'
  const a = d.arch[(r.s ?? 'steady') as keyof typeof d.arch] ?? '';
  if (k === 'reassure' || k === 'challenge') return d.advice[k](pn(g, r), a);
  if (k.startsWith('reassure.') || k.startsWith('challenge.')) return d.advice[k.split('.')[0]](pn(g, r), a);
  if (k === 'due.contract') return d.advice[k](pn(g, r), money(r.n ?? 0));
  if (k === 'due.sign') return d.advice[k](pn(g, r), d.groups[r.n ?? 1]);
  const f = d.advice[k];
  return f ? f(pn(g, r), String(r.n ?? ''), r.s ?? '') : '';
}

export function roomChoice(g: Game, ch: Choice): string {
  const d = D[g.ui];
  const k = ch.key.slice(6); // 'dr.ch.'
  if (k.startsWith('promise.')) return fn(d.choices.promise, pledgeWhat(d, k.slice(8)));
  return fn(d.choices[k], pn(g, ch));
}

export function roomFx(g: Game, f: Fx): string {
  const d = D[g.ui];
  const k = f.key.slice(6); // 'dr.fx.'
  if (k.startsWith('bind.')) return fn(d.fx.bind);
  return fn(d.fx[k], f.s ?? '');
}

export const roomTag = (g: Game, kind: string) => D[g.ui].tag[kind] ?? kind;

export function roomNews(t: Strings, lang: Lang, w: World, n: NewsItem): [string, string] {
  const d = dOf(t);
  const p = n.player ? (playerOf(w, n.player)?.name ?? n.pn)?.[lang] ?? '' : (n.pn?.[lang] ?? '');
  const f = d.news[n.key];
  if (!f) return [n.key, ''];
  const what = n.s && (n.s.startsWith('role.') || ['contract', 'keep'].includes(n.s) || n.s.startsWith('sign')) ? pledgeWhat(d, n.s) : n.s ?? '';
  if (n.key === 'dr.broken') return f(p, what);
  if (n.key === 'dr.clauseMet') return f(p, club(w, lang, n.club2), money(n.n ?? 0));
  if (n.key === 'dr.returns') return f(p, club(w, lang, n.club2), String(n.n ?? ''), n.s ?? '');
  return f(p, club(w, lang, n.club2), String(n.n ?? ''));
}

export function roomMsg(t: Strings, lang: Lang, w: World, m: Msg): [string, string] {
  const d = dOf(t);
  const p = m.player ? (playerOf(w, m.player)?.name ?? m.pn)?.[lang] ?? '' : '';
  const f = d.msg[m.key];
  if (!f) return [m.key, ''];
  if (m.key === 'dr.kept' || m.key === 'dr.broken') return f(p, pledgeWhat(d, m.s ?? ''));
  return f(p, club(w, lang, m.club), money(m.n ?? 0));
}

export const roomLog = (t: Strings, key: string, name: string) => { const f = dOf(t).log[key]; return f ? f(name) : ''; };

// The Why card's cohesion cause.
export function roomPoint(p: Point, t: Strings): string {
  const d = dOf(t);
  const x = `${(p.x ?? 0) > 0 ? '+' : '−'}${Math.abs(p.x ?? 0).toFixed(1)}`;
  return p.good ? d.whyGood(p.n ?? 0, x) : d.whyBad(p.n ?? 0, x);
}
export const roomPointHead = (p: Point, t: Strings) => dOf(t).whyHead[p.good ? 0 : 1];

export function causeText(d: DStrings, c: RoomCause, lang: Lang): string {
  const f = d.cause[c.k];
  return f ? f(c.pn ? c.pn[lang] || c.pn.en : '') : c.k;
}

export const levelText = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;
export type { Career };

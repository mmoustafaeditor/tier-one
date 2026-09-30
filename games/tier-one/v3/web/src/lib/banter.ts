// Banter picker (TIERONE-SAIF-01/02): turns a result into the thread under each call: your tweet, then fans, rival
// journalists and your own sources reacting to what actually happened. Pools live in i18n/parts/banter.ts.
// Deterministic: the same result (seed + saga) always gets the same lines and the same like counts, so share cards,
// reloads and screenshots agree. Within one results page a line is never used twice.
import type { CastSaga, ResultSaga, Rules, Tier } from './engine';
import { trList, fill } from './i18n';

export type Voice = 'fan' | 'rival' | 'source';
export interface Reply { who: Voice; id: string; name: string; handle: string; text: string; likes: number }
export type Verdict = 'excl' | 'right' | 'wrong' | 'none';
export interface Thread { i: number; verdict: Verdict; text: string; was: string; day: number; loud: boolean; likes: number; reposts: number; reps: number; replies: Reply[]; ratio: boolean; hot: boolean }

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const RIVAL_NAME: Record<string, string> = { tabloid: 'Back Page Bants', itk: 'ITK Kev', insider: 'Press Box Pete' };

export class Banter {
  private used = new Set<string>();
  constructor(private lang: string, private seed: string) {}
  private list(key: string): string[] { const v = trList(this.lang, 'bn.' + key); return Array.isArray(v) ? v : []; }
  private h(key: string) { return hash(this.seed + '|' + key); }
  /** A fresh line from a pool: starts at the hashed index and walks on past lines already used or not fitting. */
  pick(key: string, salt: string, ok: (s: string) => boolean = () => true): string | null {
    const L = this.list(key); if (!L.length) return null;
    const start = this.h(key + '|' + salt) % L.length;
    for (let k = 0; k < L.length; k++) { const s = L[(start + k) % L.length]; if (!this.used.has(s) && ok(s)) { this.used.add(s); return s; } }
    return null;
  }
  num(salt: string, lo: number, hi: number) { return lo + (this.h('n|' + salt) % Math.max(1, hi - lo)); }
  fan(salt: string): { name: string; handle: string } {
    const F = trList(this.lang, 'bn.fans') as [string, string][] | undefined;
    if (!Array.isArray(F) || !F.length) return { name: 'Fan', handle: '@fan' };
    const f = F[this.h('fan|' + salt) % F.length]; return { name: f[0], handle: f[1] };
  }

  thread(p: ResultSaga, c: CastSaga, R: Rules): Thread {
    const i = p.i, call = p.call;
    const V = { p: c.player.s, d: c.to.s, c: c.from.s, h: c.alt ? c.alt.s : c.to.s, n: 0 };
    const verdict: Verdict = !call ? 'none' : p.excl ? 'excl' : p.right ? 'right' : 'wrong';
    // {d} only where the line makes sense: the move you claimed, or the move that happened. {h} only on a real hijack.
    const dOk = call ? (p.right ? p.truth === 0 : call.o === 0) : p.truth === 0;
    const hOk = p.truth === 1 && !!c.alt;
    const fits = (s: string) => (dOk || !s.includes('{d}')) && (hOk || !s.includes('{h}'));
    const out: Reply[] = [];
    const fanLine = (pool: string, salt = '') => { const s = this.pick('fan.' + pool, i + salt, fits); if (s) { const f = this.fan(i + pool + salt); out.push({ who: 'fan', id: pool, ...f, text: fill(s, V), likes: this.num(i + pool + salt, 4, 900) }); } };
    const rivalLine = (kind: string, id: string, day = 0) => {
      const s = this.pick(kind === 'uturn' ? 'rival.uturn' : 'rival.' + kind + '.' + id, String(i), fits); if (!s) return;
      out.push({ who: 'rival', id, name: RIVAL_NAME[id] || id, handle: trList(this.lang, 'rival.' + id) || '@' + id, text: fill(s, { ...V, n: day }), likes: this.num(i + kind, 180, 2400) });
    };
    const srcLine = (src: string, mood: string) => { const s = this.pick('src.' + src + '.' + mood, String(i), fits); if (s) out.push({ who: 'source', id: src, name: src, handle: '', text: fill(s, V), likes: 0 }); };
    const rivals = R.RIVALS.map((r) => r.id);
    const anyRival = (salt: string) => rivals[this.h('rv|' + i + salt) % rivals.length];
    const wrongPost = p.posts.find((x) => !x.right);
    const read = (right: boolean) => p.reads.find((x) => x.right === right);

    if (verdict === 'none') {
      if (p.tw > 0) fanLine('twistCaught');
      fanLine('silence'); if (p.firstRight) rivalLine('gloat', p.firstRight.id, p.firstRight.day);
      fanLine('silence', 'b');
    } else if (p.right) {
      const ut = !!call!.from, dd = call!.day >= R.DAYS, beaten = p.why === 'beaten' && p.firstRight;
      if (verdict === 'excl') fanLine('excl');
      else if (ut) fanLine('uturnRight');
      else if (beaten) rivalLine('smug', p.firstRight!.id, p.firstRight!.day);
      else if (p.tw > 0) fanLine('twistUpdated');
      else if (dd) fanLine('dd');
      else if (call!.s === 0) fanLine('softRight');
      else fanLine('praise');
      if (verdict === 'excl') rivalLine('concede', (p.posts[0] && p.posts[0].id) || anyRival('c'));
      else if (ut) rivalLine('uturn', anyRival('u'));
      else if (beaten) fanLine('late');
      else if (wrongPost) rivalLine('concede', wrongPost.id);
      const r = read(true), w = read(false);
      if (r) srcLine(r.src, 'toldYou'); else if (w) srcLine(w.src, 'dodged');
      if (ut) fanLine('uturnJab');
      if (dd && verdict !== 'excl') fanLine('dd', 'b');
      if (verdict === 'excl') fanLine('excl', 'b');
      fanLine('praise', 'b'); fanLine('praise', 'c');
    } else {
      const ut = !!call!.from;
      if (ut) fanLine('uturnWrong');
      else if (call!.s === 2) fanLine('loudWrong');
      else if (call!.s === 0) fanLine('softWrong');
      else fanLine('roast');
      if (p.firstRight) rivalLine('gloat', p.firstRight.id, p.firstRight.day);
      else if (wrongPost) rivalLine('alsoWrong', wrongPost.id);
      else if (ut) rivalLine('uturn', anyRival('u'));
      const r = read(true), w = read(false);
      if (r) srcLine(r.src, 'ignored'); else if (w) srcLine(w.src, 'lied');
      fanLine('roast', 'b'); fanLine('roast', 'c');
      if (call!.s === 2) fanLine('roast', 'd');
      fanLine('pity');
    }

    let text = '', was = '';
    if (call) {
      const pre = this.list('tweet.pre'), body = this.pick('tweet.o.' + call.o, String(i)) || '';
      text = (call.from ? (trList(this.lang, 'bn.tweet.ut') || '') + ' ' : '') + (pre[call.s] || '') + ' ' + fill(body, V);
      if (call.from) { const b0 = this.pick('tweet.o.' + call.from.o, i + 'was') || ''; was = (pre[call.from.s] || '') + ' ' + fill(b0, V); }
    }
    const loud = !!call && call.s === 2;
    const base = verdict === 'excl' ? this.num(i + 'l', 9000, 42000) : verdict === 'right' ? (call!.s === 0 ? this.num(i + 'l', 300, 2200) : this.num(i + 'l', 1800, 12000)) : verdict === 'wrong' ? this.num(i + 'l', 20, loud ? 480 : 160) : 0;
    const reps = verdict === 'wrong' ? base * (loud ? 4 : 2) + this.num(i + 'r', 40, 900) : Math.round(base * 0.07) + out.length;
    return { i, verdict, text, was, day: call ? call.day : 0, loud, likes: base, reposts: Math.round(base * (verdict === 'wrong' ? 0.9 : 0.2)), reps, replies: out, ratio: verdict === 'wrong' && reps > base, hot: verdict === 'excl' || (verdict === 'right' && base > 9000) };
  }

  verdict(tier: Tier): { quip: string; idiom: string } {
    return { quip: this.pick('tierQuip.' + tier, 'v') || '', idiom: this.pick('idiom.' + (tier === 'T1' || tier === 'T2' ? 'up' : 'down'), 'v') || '' };
  }
}

/** One line under a settled Wire call: a fan, in your language, reacting to the real-world outcome. */
export function wireReply(lang: string, rid: string, right: boolean, loud: boolean, player: string) {
  const b = new Banter(lang, 'wire|' + rid);
  const pool = right ? (loud ? 'praise' : 'softRight') : loud ? 'loudWrong' : 'softWrong';
  const s = b.pick('fan.' + pool, '0', (x) => !/\{[dhcn]\}/.test(x)) || '';
  return { ...b.fan('w'), text: fill(s, { p: player || '' }) };
}

export function compact(n: number, lang: string) {
  try { return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : lang === 'es' ? 'es-ES' : 'en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(n); } catch { return String(n); }
}

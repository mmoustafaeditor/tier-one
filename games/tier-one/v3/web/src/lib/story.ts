// Newsroom reading of the public state: leans, circles, the six-line read, what to do next, and the voice lines.
// Everything is computed from the engine (DESIGN §13 rule 1: no number is typed into copy).
import { E, OUTS, STRENGTHS, type Game, type CastSaga, type Clue, type Post } from './engine';
import { hash, esc } from './kit';
import { tr, trList, type Vars } from './i18n';

export const CIRCLE_LETTER: Record<string, string> = { club: 'α', agent: 'β', travel: 'γ', street: 'δ', insider: 'ε', office: 'ζ' };
export const GRADE: Record<string, string> = { physio: 'A', insider: 'A', spotter: 'B', agent: 'B', kitman: 'B', leak: 'B', itk: 'C', barber: 'D', tabloid: 'D' };
export const INITIALS: Record<string, string> = { kitman: 'KM', barber: 'BA', agent: 'AG', spotter: 'SP', physio: 'PH', leak: 'PO', tabloid: 'BB', itk: 'IT', insider: 'PP' };

export interface Lean { o: number; top: number; second: number; split: boolean; none: boolean; tally: number[] }
export function leanOf(g: Game, i: number): Lean {
  const tl = E.tally(g, i);
  const order = [0, 1, 2, 3].sort((a, b) => tl[b] - tl[a] || a - b);
  const top = tl[order[0]], second = tl[order[1]];
  return { o: order[0], top, second: order[1], split: top > 0 && top - second <= 2 && second > 0, none: top === 0, tally: tl };
}
export const vars = (c: CastSaga): Vars => ({ p: c.player.s, to: c.to.s, from: c.from.s, player: c.player.n });
// The same, HTML-escaped, for the few lines rendered as markup.
export const varsH = (c: CastSaga): Vars => Object.fromEntries(Object.entries(vars(c)).map(([k, v]) => [k, esc(String(v))]));

// One line per (player, source, era): the same question gets the same words, and nothing repeats across sagas.
export function voiceLine(lang: string, c: CastSaga, cl: Clue): string {
  // voice.* (base + banterx personality) then voice3.* (parts/banter3*.ts): same outcome index, more of each source's voice.
  const pack = [...((trList(lang, `voice.${cl.src}.${cl.r}`) as string[] | undefined) || []), ...((trList(lang, `voice3.${cl.src}.${cl.r}`) as string[] | undefined) || [])];
  if (!pack.length) return '';
  const k = hash(c.player.id + '|' + cl.src + '|' + cl.era + (cl.again ? '|2' : '')) % pack.length;
  return fillV(pack[k], vars(c));
}
export function postLine(lang: string, c: CastSaga, p: Post): string {
  const pack = trList(lang, `post.${p.id}.${p.claim}`) as string[] | undefined;
  if (!pack || !pack.length) return '';
  return fillV(pack[hash(c.player.id + '|' + p.id + '|' + p.day) % pack.length], vars(c));
}
const fillV = (s: string, v: Vars) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m));

// What a report "says", in words (LEAVING / Jet to Chelsea / Done …).
export function saysWord(lang: string, src: string, r: number, c: CastSaga) {
  const key = src === 'leak' ? 'leak' : src;
  const arr = trList(lang, `src.says.${key}`) as string[] | undefined;
  if (arr && arr[r] != null) return fillV(arr[r], vars(c));
  return tr(lang, 'out.' + OUTS[r]);
}
// "+3 Off" / "+1 Done, +1 Hijack"
export function addsText(lang: string, w: number[]) {
  const parts = w.map((x, o) => (x > 0 ? `+${x} ${tr(lang, 'out.' + OUTS[o])}` : '')).filter(Boolean);
  return parts.join(', ');
}
export const outWord = (lang: string, o: number) => tr(lang, 'out.' + OUTS[o]);
export const strWord = (lang: string, s: number) => tr(lang, 'str.' + STRENGTHS[s]);

// The best next move for the "Next" line and the board's suggestion.
export function nextMove(g: Game, i: number): { kind: 'ask'; src: string } | { kind: 'wait'; src: string; day: number } | { kind: 'file'; o: number } | { kind: 'leave' } {
  const ln = leanOf(g, i), called = !!g.calls[i];
  const can = (s: string) => E.askState(g, i, s) === 'ok';
  const reads = E.curReads(g, i).map((c) => c.src);
  if (!reads.length) { for (const s of ['kitman', 'agent', 'barber', 'leak']) if (can(s)) return { kind: 'ask', src: s }; }
  if (!called && !ln.none && !ln.split && E.circlesFor(g, i, ln.o).size >= 2 && E.exclusiveOpen(g, i, ln.o)) return { kind: 'file', o: ln.o };
  const want = ln.none ? ['kitman', 'agent'] : ln.o <= 1 ? ['spotter', 'physio', 'agent', 'leak', 'kitman'] : ['agent', 'physio', 'spotter', 'leak', 'kitman'];
  for (const s of want) if (can(s)) return { kind: 'ask', src: s };
  for (const s of want) { const so = E.srcOf(g.R, i, s); if (so && E.askState(g, i, s) === 'closed') return { kind: 'wait', src: s, day: so.from }; }
  if (!called && !ln.none) return { kind: 'file', o: ln.o };
  return { kind: 'leave' };
}
// ---------- 4.0 (RULES4.md, CONCEPT4.md §3): the same reading of a v4 window. Words come from i18n/parts/rules4.ts.
import { E4, OUTS4, BACKING, type Game4, type Clue4, type Post4 } from './engine';
export const outWord4 = (lang: string, o: number) => tr(lang, 'out4.' + OUTS4[o]);
export const backWord4 = (lang: string, s: number) => tr(lang, 'back4.' + BACKING[s]);
/** What a contact's answer says, in words: LEAVING / SEEN THERE / the ending itself for the barber and the agent. */
export function saysWord4(lang: string, src: string, r: number) {
  const arr = trList(lang, `src4.says.${src}`) as string[] | undefined;
  return arr && arr[r] != null ? arr[r] : outWord4(lang, r);
}
/** The post screen's sentence (RULES4.md §4): "Win 46 if he signs. Lose 60 if he doesn't." */
export function dealLine4(lang: string, g: Game4, i: number, o: number, s: number, c?: CastSaga): string {
  const pv = E4.preview(g, i, o, s);
  const out = tr(lang, 'out4.' + OUTS4[o] + 'D', c ? vars(c) : { to: '' });
  return tr(lang, 'back4.deal', { w: pv.win, l: Math.abs(pv.lose), out });
}
export const rivalName4 = (lang: string, id: string) => tr(lang, 'rival4.' + id);
export const postLine4 = (lang: string, p: Post4) => tr(lang, 'rival4.posted', { who: rivalName4(lang, p.id), out: outWord4(lang, p.claim) });
/** A contact card's three lines: what they tell you, how often they're right, what they cost (RULES4.md §4: no hidden weights). */
export function contactCard4(lang: string, R: Game4['R'], src: string): { name: string; tells: string; right: string; cost: string; from: number } {
  const so = R.SOURCES[src];
  return { name: tr(lang, 'src4.name.' + src), tells: tr(lang, 'src4.tells.' + src), right: tr(lang, 'src4.right.' + src), cost: tr(lang, so && so.cost ? 'src4.cost.dm' : 'src4.cost.free'), from: so ? so.from : 1 };
}
/** The best next move on a story, for the Coach and the first window's hand-holding. Reads only what the player can
 *  see (E4.posterior), never the truth. */
export function nextMove4(g: Game4, i: number): { kind: 'ask'; src: string } | { kind: 'wait'; src: string; day: number } | { kind: 'post'; o: number; s: number } | { kind: 'leave' } {
  if (g.calls[i] || E4.isOver(g)) return { kind: 'leave' };
  const can = (s: string) => E4.askState(g, i, s) === 'ok';
  if (!g.clues[i].length) { for (const s of ['barber', 'kitman', 'agent']) if (can(s)) return { kind: 'ask', src: s }; }
  const p = E4.posterior(g, i), o = p.indexOf(Math.max(...p)), sure = p[o];
  // Post when the odds clear the bar for a backing (RULES4.md §1: ×1 above 1 in 3, ×2 above 3 in 5, All in above 4 in 5).
  const s = sure > 0.8 ? 2 : sure > 0.6 ? 1 : sure > 0.34 && g.day === g.R.DAYS ? 0 : -1;
  if (s >= 0 && (s === 2 || g.day === g.R.DAYS || g.left === 0)) return { kind: 'post', o, s };
  for (const src of ['physio', 'spotter', 'agent', 'kitman', 'barber']) if (can(src)) return { kind: 'ask', src };
  for (const src of ['physio', 'spotter']) { const so = g.R.SOURCES[src]; if (so && E4.askState(g, i, src) === 'closed') return { kind: 'wait', src, day: so.from }; }
  if (s >= 0) return { kind: 'post', o, s };
  return { kind: 'leave' };
}
/** The reads on a story, newest last, as words: "The kit man · LEAVING". */
export const readsText4 = (lang: string, clues: Clue4[]) => clues.map((c) => `${tr(lang, 'src4.name.' + c.src)} · ${saysWord4(lang, c.src, c.r)}`);

// How many items in the current era come from the street circle (the echo warning).
export function streetCount(g: Game, i: number) {
  return E.curReads(g, i).filter((c) => g.R.CIRCLE[c.src] === 'street').length + E.livePosts(g, i).filter((f) => g.R.CIRCLE[f.id] === 'street').length;
}

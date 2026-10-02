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
// How many items in the current era come from the street circle (the echo warning).
export function streetCount(g: Game, i: number) {
  return E.curReads(g, i).filter((c) => g.R.CIRCLE[c.src] === 'street').length + E.livePosts(g, i).filter((f) => g.R.CIRCLE[f.id] === 'street').length;
}

// ---------- 3.8 (LAUNCH_BRIEF §5–§6): the evidence in words, never in percentages.
/** The qualitative reliability line for a source or rival (c38.rel.<key>). Ranked modes show only this. */
export const relKey = (src: string) => 'c38.rel.' + (src in GRADE ? src : 'barber');
export type EvidenceWord = 'none' | 'weak' | 'split' | 'strong';
export interface Evidence { word: EvidenceWord; lean: Lean; circles: number; echo: boolean; reads: number; rivals: number; agree: number }
/**
 * What the file says at a glance: Strong (two independent circles back the lean and nothing close contests it),
 * Split (two outcomes within reach of each other), Weak (one circle, or only street voices), None (no reads).
 * `echo`: two or more street voices repeating the same line (the barber and the gossip rivals share one circle).
 * `agree`: how many independent circles back the lean (what "N independent sources agree" prints).
 */
export function evidenceOf(g: Game, i: number): Evidence {
  const lean = leanOf(g, i);
  const reads = E.curReads(g, i).length, rivals = E.livePosts(g, i).length;
  const circles = lean.none ? 0 : E.circlesFor(g, i, lean.o).size;
  const streetAgree = E.curReads(g, i).filter((c) => g.R.CIRCLE[c.src] === 'street' && E.weights(g.R, c.src, c.r)[lean.o] > 0).length + E.livePosts(g, i).filter((f) => g.R.CIRCLE[f.id] === 'street' && f.claim === lean.o).length;
  const echo = !lean.none && streetAgree >= 2;
  const word: EvidenceWord = lean.none ? 'none' : lean.split ? 'split' : circles >= 2 ? 'strong' : 'weak';
  return { word, lean, circles, echo, reads, rivals, agree: circles };
}
/** How hot a saga is on the board (0–3): rival posts and a twist raise it. Feel only. */
export function heatOf(g: Game, i: number): number {
  const posts = E.livePosts(g, i).length, tw = g.twist && g.twist.i === i ? 1 : 0;
  return Math.min(3, posts + tw);
}
/**
 * §30 "Why was this source misleading?": one line per read on a finished saga (c38.why.*). Explains the source's
 * nature (street echo, agent bias, Off/Fake blindness, kit man's "whether, not where"), the twist, or an honest miss.
 */
export function whyKey(R: Game['R'], read: { src: string; r: number; day: number; right: boolean }, truth: number, tw: number): string {
  if (tw && read.day < tw) return 'c38.why.twist';
  if (read.right) return 'c38.why.right';
  const so = E.srcOf(R, 0, read.src) || R.SOURCES[read.src];
  if (so && so.kind === 'street') return 'c38.why.street';
  if (read.src === 'agent') return read.r === 0 ? 'c38.why.agentDone' : 'c38.why.agentNeg';
  if (read.src === 'spotter' && truth >= 2) return 'c38.why.spotterOF';
  if (read.src === 'physio' && truth >= 2) return 'c38.why.physioOF';
  if (read.src === 'kitman') return 'c38.why.kitman';
  return 'c38.why.honest';
}

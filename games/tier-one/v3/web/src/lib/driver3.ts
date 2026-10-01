// LEGACY (3.x): the v3 driver, kept only until the play lane's screens (App.tsx, Window.tsx, Saga.tsx, Results.tsx) move
// to lib/driver.ts makeDriver(). Nothing new uses it; the 3.x engine stays for replaying the archive (Dailies before
// V4_FROM). Delete this file with the last v3 screen.
import { E, RULES, castFor, type Act, type CastSaga, type Clue, type Game, type Pub, type Result, type Rules, type Board } from './engine';
import { v3 } from './api';
import { getSave, update, type LocalWindow } from './save';
import { careerRules, castOpts, TRUST_AGAIN, careerTrust } from './career';

// Practice rules: the plain Daily rules plus the Contacts Book's one Practice perk (GOTY.md §1.2): a source at Lv5 can
// be asked a second time per saga. Never for the Daily or rooms, whose rules come from the server.
export function practiceRules(s = getSave()): Rules {
  const AGAIN = Object.keys(RULES.SOURCES).filter((k) => careerTrust(s, k) >= TRUST_AGAIN);
  return AGAIN.length ? { ...RULES, AGAIN } : RULES;
}

export type Mode = 'daily' | 'room' | 'practice' | 'career';
export interface View {
  mode: Mode; cast: CastSaga[]; state: Pub; R: Rules; done: boolean; result?: Result; no?: number; seed?: string;
  ddEndsAt?: number; coach?: boolean; posterior?: (i: number) => number[]; label?: string; room?: RoomRef;
}
export interface ActOut { view: View; answer?: Clue; error?: string }
export interface Driver { mode: Mode; start(): Promise<View | { error: string }>; act(a: Act): Promise<ActOut>; dd(): Promise<View>; finish(): Promise<View> }
export interface RoomRef { code: string; pid: string; sec: string; round: number }

type Remote = { ok: boolean; error?: string; cast: CastSaga[]; state: Pub; done: boolean; result?: Result; no?: number; ddLeftMs?: number; answer?: Clue; scope?: { kind: string } };
export function remoteDriver(room?: RoomRef): Driver {
  const mode: Mode = room ? 'room' : 'daily';
  const who = () => { const s = getSave(); return room ? { room } : { dev: s.dev, nick: s.nick }; };
  let last: View | null = null;
  const toView = (r: Remote): View => {
    const v: View = { mode, cast: r.cast, state: r.state, R: RULES, done: r.done, result: r.result, no: r.no, room };
    if (typeof r.ddLeftMs === 'number') v.ddEndsAt = Date.now() + r.ddLeftMs;
    last = v; return v;
  };
  return {
    mode,
    async start() { const r = await v3<Remote>('daily.start', who()); return r.ok ? toView(r as unknown as Remote) : { error: r.error }; },
    async act(a) {
      const r = (await v3<Remote>('daily.act', { ...who(), act: a })) as unknown as Remote;
      if (r.cast && r.state) { const view = toView(r); return { view, answer: r.answer, error: r.ok ? undefined : r.error }; }
      return { view: last!, error: r.error || 'net' };
    },
    async dd() { const r = (await v3<Remote>('daily.dd', who())) as unknown as Remote; return r.cast ? toView(r) : last!; },
    async finish() {
      for (let k = 0; k < 3; k++) { const r = (await v3<Remote>('daily.finish', who(), 15000)) as unknown as Remote; if (r.cast) return toView(r); }
      return last!;
    },
  };
}

// ---- local windows (Practice, Career) ----
function localView(mode: Mode, g: Game, cast: CastSaga[], lw: LocalWindow): View {
  const v: View = { mode, cast, state: E.pub(g), R: g.R, done: E.isOver(g), seed: lw.seed, label: lw.label, coach: !!lw.coach };
  if (lw.coach) v.posterior = (i) => E.posterior(g, i);
  if (g.day === g.R.DAYS && lw.ddAt) v.ddEndsAt = lw.ddAt + g.R.DD_SECONDS * 1000;
  if (v.done) { const r = E.resolve(g); v.result = { ...r, row: E.gridRow(r), cast }; }
  return v;
}
export function localDriver(mode: 'practice' | 'career', lw: LocalWindow, onDone?: (g: Game, v: View) => void): Driver & { game: () => Game } {
  const car = mode === 'career' ? getSave().career : null;
  const cast = mode === 'career' && car ? castFor(lw.seed, castOpts(car)) : castFor(lw.seed, { n: RULES.SAGAS });
  const R = mode === 'career' && car ? careerRules(car, cast) : practiceRules();
  const board: Board = E.buildBoard(lw.seed, R);
  let g = E.replay(board, lw.log, R) || E.newGame(board, R);
  let settled = E.isOver(g);
  const persist = () => update((s) => {
    const w = { ...lw, log: g.log.slice() };
    if (mode === 'practice') s.practice.live = E.isOver(g) ? null : w; else if (s.career) s.career.live = E.isOver(g) ? null : w;
    Object.assign(lw, w);
  });
  const view = () => localView(mode, g, cast, lw);
  const settle = () => { if (!settled && E.isOver(g)) { settled = true; onDone?.(g, view()); } };
  return {
    mode, game: () => g,
    async start() { return view(); },
    async act(a) {
      if (g.day === g.R.DAYS && !lw.ddAt && !E.isOver(g)) lw.ddAt = Date.now();
      if (lw.ddAt && g.day === g.R.DAYS && Date.now() > lw.ddAt + g.R.DD_SECONDS * 1000 + 1500) { E.finish(g); persist(); settle(); return { view: view(), error: 'clock' }; }
      const n = a[0] === 'a' ? g.clues[a[1]].length : 0;
      const ok = E.apply(g, a);
      persist();
      const out: ActOut = { view: view(), error: ok ? undefined : 'rule' };
      if (ok && a[0] === 'a') out.answer = g.clues[a[1]][n];
      settle();
      return out;
    },
    async dd() { if (g.day === g.R.DAYS && !lw.ddAt) { lw.ddAt = Date.now(); persist(); } return view(); },
    async finish() { E.finish(g); persist(); settle(); return view(); },
  };
}

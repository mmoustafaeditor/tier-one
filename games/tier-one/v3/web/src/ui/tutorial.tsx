// The First window's teaching layer (CONCEPT4.md §12, RULES4.md §2 and §4). Owned by the onboarding lane.
//
// CONTRACT (the play lane mounts it; keep the name and the props):
//   <TutorialLayer driver story/>   Blurt renders it when driver.mode === 'tutorial'. `story` is the story open on screen
//                                   (null on the timeline). It renders nothing else into Blurt: a portal on <body> holds
//                                   Mags Doyle's DM (the line for this step) and one ring around the thing to tap.
//   Targets it looks for (Blurt sets them): data-tut="story-<i>" · "dm-<src>" · "post" · "how-<o>" (role=radio,
//   aria-checked) · "loud-<s>" (same) · "publish" · "end-day"; an open sheet's [data-autofocus] button; the story view's
//   back button (.bl-sv .bl-bar__back). Overlays it waits behind: .dm-call (the call screen), .bl-fly, .bl-night.
//   The step machine is pure and exported for anyone who wants to read it:
//     TUT_STEPS                                  the script, one step per idea, in order
//     tutorialStep(pub, R, acks) → { step, n, m } the first step the player hasn't done yet (null when the window is over)
//     startTutorial(go)                          screens/Onboarding.tsx: a fresh First window (clears the live one)
// Each step waits for the player's own action on the real UI: no rules page, nothing is pressed for them (the only
// shortcut is "Skip to Deadline Day", which ends the quiet days 2–4 for a player who has nothing left to do in them).
// The board is fixed (TUTORIAL_SEED, career rank 0 rules: 3 stories), so the script can name its stories; every step
// still checks the live state, so a player who wanders off the script is picked up where they are, never stuck.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { update } from '../lib/save';
import { outWord4 } from '../lib/story';
import type { Driver4 } from '../lib/driver';
import type { Pub4, Rules4 } from '../lib/engine';
import { Typing } from './juice';

export type TutKind = 'ask' | 'read' | 'post' | 'end' | 'note' | 'skip' | 'close';
/** One step of the First window. `i` the story, `src` the contact, `s` the backing (0 Hint · 1 Post · 2 Drop), `day` the
 *  day it belongs to (a step whose day has passed is done: the player moved on). */
export interface TutStep { id: string; kind: TutKind; day: number; i?: number; src?: string; s?: number }
/** The script (CONCEPT4 §12.3): DM → read the chip → the agent → a Hint → end the day → @BackPageBants → the kit man →
 *  a Post → Deadline Day → the physio → a Drop → close. The six ideas, one at a time: Stories and DMs (barber), Contacts
 *  (agent, kit man), Post (Hint), Earlier pays more (Post), Scoop (the Drop's deal line). */
export const TUT_STEPS: TutStep[] = [
  { id: 'barber', kind: 'ask', day: 1, i: 0, src: 'barber' },
  { id: 'chip', kind: 'read', day: 1, i: 0 },
  { id: 'agent', kind: 'ask', day: 1, i: 0, src: 'agent' },
  { id: 'hint', kind: 'post', day: 1, i: 0, s: 0 },
  { id: 'night', kind: 'end', day: 1 },
  { id: 'bants', kind: 'note', day: 2 },
  { id: 'kitman', kind: 'ask', day: 2, i: 2, src: 'kitman' },
  { id: 'post', kind: 'post', day: 2, i: 2, s: 1 },
  { id: 'skip', kind: 'skip', day: 2 },
  { id: 'physio', kind: 'ask', day: 5, i: 1, src: 'physio' },
  { id: 'drop', kind: 'post', day: 5, i: 1, s: 2 },
  { id: 'close', kind: 'close', day: 5 },
];

const has = (pub: Pub4, i: number, src: string) => !!(pub.clues[i] || []).some((c) => c.src === src);
/** Is this step done (or no longer doable, so the script moves on)? Pure: the public state and the acknowledged notes. */
function done(st: TutStep, pub: Pub4, R: Rules4, acks: readonly string[]): boolean {
  if (pub.over) return true;
  const day = Math.min(pub.day, R.DAYS);
  if (st.kind === 'skip') return day >= R.DAYS;
  if (st.kind === 'end') return day > st.day;
  if (st.kind === 'close') return false;
  if (st.day < day && st.day < R.DAYS) return true;                 // that day is gone
  if (st.kind === 'read') return acks.includes(st.id) || (st.i != null && (pub.clues[st.i] || []).length > 1) || !!(st.i != null && pub.calls[st.i]);
  if (st.kind === 'note') return acks.includes(st.id) || !pub.feed.some((f) => f.id === 'tabloid');
  if (st.i == null) return true;
  if (pub.calls[st.i]) return true;                                   // the story is posted: nothing left to teach on it
  if (st.kind === 'ask') {
    const so = R.SOURCES[st.src || ''];
    if (!so) return true;
    if (has(pub, st.i, st.src!)) return true;
    return so.cost > pub.left;                                        // out of DMs: move on rather than wait forever
  }
  return !(pub.clues[st.i] || []).length;                            // post: until it's posted (no answer on it, nothing to post)
}
/** The first step not done yet, with its number. Null once the window is over. */
export function tutorialStep(pub: Pub4, R: Rules4, acks: readonly string[] = []): { step: TutStep; n: number; m: number } | null {
  if (pub.over) return null;
  for (let k = 0; k < TUT_STEPS.length; k++) if (!done(TUT_STEPS[k], pub, R, acks)) return { step: TUT_STEPS[k], n: k + 1, m: TUT_STEPS.length };
  return { step: TUT_STEPS[TUT_STEPS.length - 1], n: TUT_STEPS.length, m: TUT_STEPS.length };
}

// ---------------------------------------------------------------- acks (the two notes), per device
const ACK_KEY = 'tierone_tut4';
const readAcks = (): string[] => { try { const x = JSON.parse(localStorage.getItem(ACK_KEY) || '[]'); return Array.isArray(x) ? x.filter((v) => typeof v === 'string') : []; } catch { return []; } };
const writeAcks = (a: string[]) => { try { localStorage.setItem(ACK_KEY, JSON.stringify(a)); } catch { /* private mode: the notes come back next time */ } };
/** A fresh First window: clears the live one and the notes, then opens it in Blurt. */
export function startTutorial(go: (r: { n: 'play'; mode: 'tutorial'; key: number }) => void) {
  writeAcks([]);
  update((x) => { const v = (x.v4 = x.v4 || {}); v.live = { ...(v.live || {}), tutorial: null }; });
  go({ n: 'play', mode: 'tutorial', key: Date.now() });
}

// ---------------------------------------------------------------- what to say and where to point, right now
type Plan = { key: string; vars?: Record<string, string | number>; sel: string | null; btn?: 'ok' | 'skip' };
const q = (sel: string) => document.querySelector<HTMLElement>(sel);
const checked = (el: HTMLElement | null) => !!el && el.getAttribute('aria-checked') === 'true';
const BACK = '.bl-sv .bl-bar__back, .bl-sv .g-top__back';
function lead(d: Driver4, i: number): number { const p = d.coach ? d.coach(i) : null; return p ? p.indexOf(Math.max(...p)) : 0; }

function planFor(st: TutStep, d: Driver4, pub: Pub4, story: number | null, lang: string, t: (k: string, v?: Record<string, string | number>) => string): Plan {
  const name = (i: number) => { const c = d.cast[i]; return c ? c.player.s || c.player.n : ''; };
  // Get to the story first: back out of the wrong one, or open the right one.
  if (st.i != null && (st.kind === 'ask' || st.kind === 'post') && story !== st.i) {
    return story != null ? { key: 'ob4.mags.back', sel: BACK } : { key: st.kind === 'ask' && st.id === 'barber' ? 'ob4.mags.barber' : 'ob4.mags.open', vars: { p: name(st.i) }, sel: `[data-tut="story-${st.i}"]` };
  }
  switch (st.kind) {
    case 'ask': return { key: 'ob4.mags.' + st.id, vars: { p: name(st.i!) }, sel: `[data-tut="dm-${st.src}"]` };
    case 'read': return { key: 'ob4.mags.chip', sel: story === st.i ? '.bl-know__i, .bl-know' : `[data-tut="story-${st.i}"] .dm-chip`, btn: 'ok' };
    case 'note': return { key: 'ob4.mags.bants', sel: story == null ? '.bl-post--acct' : null, btn: 'ok' };
    case 'skip': return { key: 'ob4.mags.skip', sel: null, btn: 'skip' };
    case 'end': case 'close': {
      const key = st.kind === 'end' ? 'ob4.mags.night' : 'ob4.mags.close';
      if (story != null) return { key, sel: BACK };
      const confirm = q('.sheet [data-autofocus]');
      return { key, sel: confirm ? '.sheet [data-autofocus]' : '[data-tut="end-day"]' };
    }
    case 'post': {
      const i = st.i!, o = lead(d, i), s = st.s || 0, out = outWord4(lang, o);
      if (!q('[data-tut="publish"]')) return { key: 'ob4.mags.' + st.id, vars: { out, p: name(i) }, sel: '[data-tut="post"]' };
      const how = q(`[data-tut="how-${o}"]`);
      if (how && !checked(how) && !q('[data-tut^="how-"][aria-checked="true"]')) return { key: 'ob4.mags.pickOut', vars: { out }, sel: `[data-tut="how-${o}"]` };
      const loud = q(`[data-tut="loud-${s}"]`);
      if (loud && !checked(loud)) {
        if (s === 2) {
          const f = pub.feed.find((x) => x.i === i && x.claim === o);
          const note = f ? t('ob4.mags.noScoop', { who: t('rival4.' + f.id), n: d.R.SCOOP[2] }) : t('ob4.mags.scoop', { n: d.R.SCOOP[2] });
          return { key: 'ob4.mags.pickDrop', vars: { note }, sel: `[data-tut="loud-${s}"]` };
        }
        return { key: s === 1 ? 'ob4.mags.pickPost' : 'ob4.mags.pickLoud', sel: `[data-tut="loud-${s}"]` };
      }
      return { key: 'ob4.mags.publish', sel: '[data-tut="publish"]' };
    }
  }
  return { key: 'ob4.mags.close', sel: null };
}

// ---------------------------------------------------------------- the layer
type Geo = { r: { x: number; y: number; w: number; h: number } | null; ph: { x: number; y: number; w: number; h: number }; hidden: boolean };
const box = (r: DOMRect) => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
const same = (a: Geo, b: Geo) => a.hidden === b.hidden && JSON.stringify(a.r) === JSON.stringify(b.r) && JSON.stringify(a.ph) === JSON.stringify(b.ph);

export function TutorialLayer({ driver, story }: { driver: Driver4; story: number | null }) {
  const t = useT();
  const [, setVer] = useState(0);
  useEffect(() => driver.subscribe(() => setVer((v) => v + 1)), [driver]);
  const [acks, setAcks] = useState<string[]>(readAcks);
  const [tick, setTick] = useState(0);
  const pub = driver.pub();
  const cur = tutorialStep(pub, driver.R, acks);
  const st = cur ? cur.step : null;
  // The plan reads the DOM (is the post sheet open, which ending is picked), so it is re-read on the same beat as the ring.
  const plan = useMemo(() => (st ? planFor(st, driver, pub, story, t.lang, t) : null), [st, driver, pub, story, t, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const [geo, setGeo] = useState<Geo>({ r: null, ph: { x: 0, y: 0, w: innerWidth, h: innerHeight }, hidden: false });
  const scrolled = useRef('');

  useEffect(() => {
    if (!plan) return;
    const read = () => {
      const phEl = q('.ph'), ph = phEl ? box(phEl.getBoundingClientRect()) : { x: 0, y: 0, w: innerWidth, h: innerHeight };
      const hidden = !!q('.dm-call, .bl-fly, .bl-night');
      let r: Geo['r'] = null;
      const el = plan.sel ? q(plan.sel) : null;
      if (el && !hidden) {
        const b = el.getBoundingClientRect();
        if (b.width && b.height) {
          r = box(b);
          const sk = (st?.id || '') + plan.sel;
          if (scrolled.current !== sk && (b.top < ph.y + 60 || b.bottom > ph.y + ph.h - 60)) { scrolled.current = sk; el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); }
        }
      }
      const next: Geo = { r, ph, hidden };
      setGeo((g) => (same(g, next) ? g : next));
      setTick((k) => (k + 1) % 1e6);
    };
    read();
    const id = window.setInterval(read, 160);
    addEventListener('resize', read); addEventListener('scroll', read, true);
    return () => { clearInterval(id); removeEventListener('resize', read); removeEventListener('scroll', read, true); };
  }, [plan?.sel, st?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new line from Mags: typing dots first (the DM's own motion), then the line slides in with the DM sound.
  const [typing, setTyping] = useState(true);
  useEffect(() => {
    if (!st) return;
    if (prefersReducedMotion()) { setTyping(false); return; }
    setTyping(true);
    const id = setTimeout(() => { setTyping(false); sfx('dm.in'); }, 650);
    return () => clearTimeout(id);
  }, [st?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [busy, setBusy] = useState(false);
  if (!st || !plan || !cur) return null;
  const ack = () => { sfx('ui.tap'); const a = [...acks, st.id]; setAcks(a); writeAcks(a); };
  const skip = async () => {
    if (busy) return; setBusy(true); sfx('whoosh');
    for (let k = 0; k < 6 && !driver.isOver() && driver.pub().day < driver.R.DAYS; k++) { if (!(await driver.endDay())) break; }
    setBusy(false);
  };
  const { r, ph, hidden } = geo;
  // Mags sits where she doesn't cover the thing to tap: at the top when it's low on the screen, else at the bottom.
  const low = !r || r.y + r.h / 2 > ph.y + ph.h * 0.46;
  const pad = 6;
  const line = t(plan.key, plan.vars);
  const extra = plan.key === 'ob4.mags.pickDrop' && plan.vars ? String(plan.vars.note || '') : '';
  return createPortal(<div className={'tut4' + (hidden ? ' is-hidden' : '')} dir={t.rtl ? 'rtl' : 'ltr'}>
    {r && <span className="tut4-ring" aria-hidden="true" style={{ left: r.x - pad, top: r.y - pad, width: r.w + pad * 2, height: r.h + pad * 2 } as CSSProperties} />}
    <aside className={'tut4-dm ' + (low ? 'is-top' : 'is-bottom')} role="status" aria-live="polite"
      style={{ left: ph.x + 10, width: ph.w - 20, ...(low ? { top: ph.y + 40 } : { bottom: innerHeight - (ph.y + ph.h) + 44 }) } as CSSProperties}>
      <span className="tut4-dm__av" aria-hidden="true">MD</span>
      <div className="tut4-dm__b">
        <div className="tut4-dm__h"><b>{t('ob4.mags.name')}</b><small>{t('ob4.mags.step', { n: cur.n, m: cur.m })}</small></div>
        {typing ? <Typing name={t('ob4.mags.name')} sound={false} className="tut4-dm__typing" />
          : <p key={plan.key + line} className="tut4-dm__p" dir="auto">{line}{extra && <span className="tut4-dm__note">{extra}</span>}</p>}
        {!typing && plan.btn === 'ok' && <button type="button" className="tut4-dm__go" onClick={ack} autoFocus>{t('ob4.mags.ok')}</button>}
        {!typing && plan.btn === 'skip' && <button type="button" className="tut4-dm__go" onClick={skip} disabled={busy} autoFocus>{t('ob4.mags.skipGo')}</button>}
      </div>
    </aside>
  </div>, document.body);
}

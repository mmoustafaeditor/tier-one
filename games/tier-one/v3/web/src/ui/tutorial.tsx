// The first Daily Challenge's tips (UI41.md: onboarding goes straight into a short first Daily in tutorial mode).
// 4.1 cut the 12-step coach that ringed DOM targets; it is four short tips, one at a time, each shown when the
// board reaches its moment and gone with "Got it":
//   1. pick     no player open, nothing called yet     → tap a player
//   2. call     a player open, no answer on him yet    → tap a source; the barber is free, the rest cost a call
//   3. decide   an answer in, nothing posted           → Decide now (how it ends, how loud) or Decide later
//   4. end      something posted                        → End Day; results land after Deadline Day
// CONTRACT (the Daily lane mounts it; keep the name and props): <TutorialLayer driver story/> when driver.mode is
// 'tutorial'; `story` = the player open on screen (null on the board). startTutorial(go) starts a fresh one.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { update } from '../lib/save';
import type { Driver4 } from '../lib/driver';
import type { Pub4 } from '../lib/engine';

export type TipId = 'pick' | 'call' | 'decide' | 'end';
export const TIPS: TipId[] = ['pick', 'call', 'decide', 'end'];
const ACK_KEY = 'tierone_tut41';
const readAcks = (): TipId[] => { try { const x = JSON.parse(localStorage.getItem(ACK_KEY) || '[]'); return Array.isArray(x) ? x.filter((v): v is TipId => TIPS.includes(v)) : []; } catch { return []; } };
const writeAcks = (a: TipId[]) => { try { localStorage.setItem(ACK_KEY, JSON.stringify(a)); } catch { /* private mode: the tips come back next time */ } };

/** A fresh first Daily: clears the live tutorial window and the tips, then opens it. */
export function startTutorial(go: (r: { n: 'play'; mode: 'tutorial'; key: number }) => void) {
  writeAcks([]);
  update((x) => { const v = (x.v4 = x.v4 || {}); v.live = { ...(v.live || {}), tutorial: null }; });
  go({ n: 'play', mode: 'tutorial', key: Date.now() });
}

/** The tip for this moment (pure), or null. */
export function tipFor(pub: Pub4, story: number | null, acks: readonly TipId[]): TipId | null {
  if (pub.over) return null;
  const anyClue = pub.clues.some((c) => (c || []).length > 0), anyCall = pub.calls.some(Boolean);
  const want: TipId = anyCall ? 'end' : anyClue ? (story != null && !(pub.clues[story] || []).length ? 'call' : 'decide') : story == null ? 'pick' : 'call';
  return acks.includes(want) ? null : want;
}

export function TutorialLayer({ driver, story }: { driver: Driver4; story: number | null }) {
  const t = useT();
  const [, setVer] = useState(0);
  useEffect(() => driver.subscribe(() => setVer((v) => v + 1)), [driver]);
  const [acks, setAcks] = useState<TipId[]>(readAcks);
  const tip = tipFor(driver.pub(), story, acks);
  useEffect(() => { if (tip) sfx('dm.in'); }, [tip]);
  if (!tip) return null;
  const ok = () => { sfx('ui.tap'); const a = [...acks, tip]; setAcks(a); writeAcks(a); };
  const host = document.querySelector('.ph') || document.body;
  return createPortal(<aside className="tut41" role="status" aria-live="polite" dir={t.rtl ? 'rtl' : 'ltr'}>
    <span className="tut41__n">{TIPS.indexOf(tip) + 1}/{TIPS.length}</span>
    <p dir="auto">{t('s41.tip.' + tip)}</p>
    <button type="button" className="s41-btn s41-btn--sm" onClick={ok} autoFocus>{t('s41.tip.ok')}</button>
  </aside>, host);
}

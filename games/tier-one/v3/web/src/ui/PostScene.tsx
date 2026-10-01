// 4.1 post animation (UI41 §Daily Challenge, decide sheet → "the post animation, back to the board"). One orchestrated
// moment: the card rises in the club's colours, the surname lands, the ending is stamped. A Drop adds your catchphrase.
// Deadline Day plays the short cut. Tap skips. Lives inside the play screen.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useT } from '../lib/i18n';
import { sfx, haptic } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import type { CastSaga } from '../lib/engine';
import { outWord4, backWord4 } from '../lib/story';
import { inkOn } from '../screens/Saga';

const OUT = ['signs', 'elsewhere', 'stays'] as const;

export function PostScene({ c, o, s, handle, phrase, quick, onDone }: { c: CastSaga; o: number; s: number; handle: string; phrase: string; quick?: boolean; onDone: () => void }) {
  const t = useT();
  const [step, setStep] = useState(0); // 0 card · 1 stamp · 2 catchphrase (drop)
  const end = useRef(onDone); end.current = onDone;
  const drop = s === 2 && !quick;
  useEffect(() => {
    const reduce = prefersReducedMotion();
    const plan: [number, number][] = reduce ? [[1, 0]] : quick ? [[1, 160]] : drop ? [[1, 380], [2, 1100]] : [[1, 380]];
    const total = reduce ? 900 : quick ? 750 : drop ? 2500 : 1400;
    sfx(s === 2 ? 'whoosh' : 'post');
    const ids = plan.map(([k, ms]) => setTimeout(() => setStep(k), ms));
    ids.push(setTimeout(() => end.current(), total));
    return () => ids.forEach(clearTimeout);
  }, [quick, drop, s]);
  useEffect(() => { if (step === 1) { sfx(s === 2 ? 'drop' : 'thock'); haptic('stamp'); } if (step === 2) sfx('reveal'); }, [step, s]);
  const club = o === 2 ? c.from : c.to;
  const where = o === 0 ? c.to.n || c.to.s : o === 2 ? c.from.n || c.from.s : t('pl4.out.elsewhereC', { to: c.to.s });
  return <div className={'d41-post st-' + step + (quick ? ' is-quick' : '') + (s === 2 ? ' is-drop' : '')} role="dialog" aria-modal="true" aria-label={t('d41.post.done')} onClick={() => end.current()}
    style={{ ['--c1' as string]: club.c1, ['--c2' as string]: club.c2, ['--ci' as string]: inkOn(club.c1) } as CSSProperties}>
    <div className="d41-post__card">
      <span className="d41-post__who" dir="auto">{handle} · {backWord4(t.lang, s)}</span>
      <b className="d41-post__n" dir="auto">{c.player.s || c.player.n}</b>
      <span className="d41-post__c" dir="auto">{where}</span>
      <span className={'d41-post__stamp d41-o--' + OUT[o]}>{outWord4(t.lang, o)}</span>
      {drop && <span className="d41-post__phrase" dir="auto">“{phrase}”</span>}
    </div>
    <small className="d41-post__skip">{t('d41.post.done')}</small>
  </div>;
}

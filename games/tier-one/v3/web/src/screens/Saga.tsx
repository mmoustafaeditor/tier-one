// 4.1 player screen and decide sheet (UI41 §Daily Challenge). One screen per player: the header (kit, clubs in club
// colours), the five sources as five buttons (name, what they tell you or their answer, how often they're right, the
// cost in calls), rival posts one line each, and two buttons: Decide now / Decide later. The decide sheet: SIGNS /
// ELSEWHERE / STAYS with the clubs named, Hint / Post / Drop, the one-line deal from driver.preview, Post.
// Deadline Day uses the same screen; its sheet posts in two taps (ending, then how loud).
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { CastSaga, Pub4, WClub } from '../lib/engine';
import { coachLine, type Driver4 } from '../lib/driver';
import { useT, tr, num } from '../lib/i18n';
import { haptic } from '../lib/sfx';
import { saysWord4, outWord4, backWord4 } from '../lib/story';
import { Kit } from '../ui/game';
import { Crest } from '../ui/bits';
import { Pop } from '../ui/juice';
import { Hint } from '../ui/hint';
import { Screen } from '../ui/screen';
import { CONTACTS, ContactAvatar, accShort, lockShort } from '../ui/CallScene';

export const OUT_KEYS = ['signs', 'elsewhere', 'stays'] as const;
/** Readable ink on a club colour. */
export function inkOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#fff';
  const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  // WCAG: whichever of black / white reads better on this colour (one of them always clears 4.5:1).
  const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05) ? '#000' : '#fff';
}
export function ClubChip({ club }: { club: WClub }) {
  return <span className="d41-club" style={{ ['--c1' as string]: club.c1, ['--c2' as string]: club.c2, ['--ci' as string]: inkOn(club.c1) } as CSSProperties}><Crest club={club} size={14} /><b dir="auto">{club.s}</b></span>;
}
/** "Leeds → Arsenal" with the linked club in its colours. */
export function Route({ c }: { c: CastSaga }) {
  const t = useT();
  return <span className="d41-route"><span dir="auto">{c.from.s}</span><i aria-hidden="true">{t.rtl ? '←' : '→'}</i><ClubChip club={c.to} /></span>;
}
/** The window's name: "Daily Challenge #41", "Practice", "Career", "Deadline Day" … */
export function windowLabel(t: ReturnType<typeof useT>, d: Driver4): string {
  switch (d.mode) {
    case 'daily': return d.no ? t('d41.win.dailyN', { n: d.no }) : t('d41.win.daily');
    case 'room': return t('d41.win.room', { n: (d.room?.round || 0) + 1 });
    case 'career': { const m = /^story:(\d+):(\d+)$/.exec(d.label || ''); return m ? t('c41.sub', { n: m[1], w: m[2] }) : d.label || t('d41.win.career'); }
    case 'tutorial': return t('d41.win.tutorial');
    case 'deadline': return t('d41.win.deadline');
    case 'challenge': return t('d41.win.challenge');
    default: return d.label || t('d41.win.practice');
  }
}
/** "Day 2 of 5" / "Deadline Day". */
export function dayWord(t: ReturnType<typeof useT>, day: number, days: number): string {
  if (days <= 1) return t('d41.win.deadline');
  return day >= days ? t('d41.day.dd', { d: day, n: days }) : t('d41.day.of', { d: day, n: days });
}
export const callsWord = (t: ReturnType<typeof useT>, n: number) => (n === 1 ? t('d41.calls.one') : t('d41.calls.n', { n }));

/** A player's state as a chip: no info · 2 tips · your call stamped. */
export function StatusChip({ pub, i }: { pub: Pub4; i: number }) {
  const t = useT();
  const call = pub.calls[i], n = (pub.clues[i] || []).length;
  if (call) return <span className={'d41-stamp d41-o--' + OUT_KEYS[call.o]}><b>{outWord4(t.lang, call.o)}</b><small>{backWord4(t.lang, call.s)}</small></span>;
  return <span className={'d41-chip' + (n ? ' is-on' : '')}>{n === 0 ? t('d41.st.none') : n === 1 ? t('d41.st.tip1') : t('d41.st.tips', { n })}</span>;
}

// ---------------------------------------------------------------- the player screen
export function PlayerScreen({ driver, pub, i, landed, notes, right, onBack, onAsk, onDecide }: {
  driver: Driver4; pub: Pub4; i: number; landed: Record<string, number>; notes: string[]; right?: ReactNode;
  onBack: () => void; onAsk: (src: string) => void; onDecide: () => void;
}) {
  const t = useT();
  const R = driver.R, c = driver.cast[i];
  const clues = pub.clues[i] || [], call = pub.calls[i];
  const cs = driver.callState(i);
  const posts = pub.feed.filter((f) => f.i === i);
  const srcs = CONTACTS.filter((src) => !!R.SOURCES[src]);
  const lines: { k: string; who: string; text: ReactNode; tone?: string }[] = [
    ...posts.map((f) => ({ k: 'p' + f.id + f.day, who: tr(t.lang, 'rival4.' + f.id), text: <><b className={'d41-o d41-o--' + OUT_KEYS[f.claim]}>{outWord4(t.lang, f.claim)}</b><small>{t('rival4.right.' + f.id)}</small></>, tone: 'rival' })),
    ...notes.map((n, k) => ({ k: 'n' + k, who: '', text: <span dir="auto">{n}</span>, tone: 'tip' })),
  ];
  if (driver.coach && !call) { const cl = coachLine(t.lang, driver.coach(i)); lines.push({ k: 'coach', who: t('coach4.name'), text: <><b className={'d41-o d41-o--' + OUT_KEYS[cl.o]}>{outWord4(t.lang, cl.o)}</b><small>{cl.words}</small></>, tone: 'coach' }); }
  const hint = call ? null : cs === 'nosource' ? t('d41.player.needCall') : cs === 'over' ? t('d41.player.over') : null;
  const footer = call
    ? <Pop className="d41-btn" onTap={onBack}>{t('d41.player.board')}</Pop>
    : <>
      <Pop className="d41-btn d41-btn--quiet" onTap={onBack}>{t('d41.player.later')}</Pop>
      <Pop className="d41-btn" onTap={onDecide} disabled={cs !== 'ok'} sound="sheet.open" data-tut="post">{t('d41.player.now')}</Pop>
    </>;
  return <Screen title={c.player.n} sub={(R.DAYS > 1 ? dayWord(t, pub.day, R.DAYS) + ' · ' : '') + callsWord(t, pub.left)} onBack={onBack} right={right} footer={footer}>
    <div className="d41-ph" style={{ ['--c1' as string]: c.from.c1, ['--c2' as string]: c.from.c2 } as CSSProperties}>
      <Kit club={c.from} player={c.player} size={52} />
      <span className="d41-ph__b">
        <span className="d41-ph__meta">{[c.player.pos, c.player.age ? t('d41.player.age', { n: c.player.age }) : ''].filter(Boolean).join(' · ')}</span>
        <Route c={c} />
      </span>
      {call && <StatusChip pub={pub} i={i} />}
    </div>
    <div className="d41-srcs bl-know" role="group" aria-label={t('d41.player.sources')}>
      {srcs.map((src) => {
        const st = driver.askState(i, src), so = R.SOURCES[src];
        const clue = clues.find((x) => x.src === src);
        const cost = st === 'asked' ? t('d41.src.asked') : st === 'closed' ? lockShort(t.lang, src, R) : st === 'broke' ? t('d41.src.broke') : so && so.cost ? (so.cost === 1 ? t('d41.calls.cost1') : t('d41.calls.cost', { n: so.cost })) : t('d41.src.free');
        return <Pop key={src} className={'d41-src is-' + st + (clue ? ' has-clue' : '') + (so && !so.cost ? ' is-free' : '')} onTap={() => onAsk(src)} disabled={st === 'asked' || st === 'over' || st === 'none'} sound={st === 'ok' ? 'ui.tap' : null} data-tut={'dm-' + src} label={t('src4.name.' + src) + ' · ' + cost}>
          <ContactAvatar src={src} size={36} />
          <span className="d41-src__b">
            <b dir="auto">{t('src4.name.' + src)}</b>
            {clue ? <span key={landed[src] || 0} className={'d41-src__ans dm-chip' + (landed[src] ? ' is-land' : '')} dir="auto">{saysWord4(t.lang, src, clue.r)}</span>
              : <small dir="auto">{t('d41.src.tells', { x: t('src4.tells.' + src) })}</small>}
          </span>
          <span className="d41-src__r"><small className="g-num">{accShort(t.lang, R, src)}</small><em className={'d41-cost is-' + st}>{cost}</em></span>
        </Pop>;
      })}
    </div>
    <div className="d41-intel" aria-label={t('d41.player.intel')}>
      {hint && <p className="d41-intel__hint">{hint}</p>}
      {lines.slice(0, hint ? 2 : 3).map((l) => <p key={l.k} className={'d41-line is-' + l.tone}>{l.who && <span dir="ltr">{l.who}</span>}{l.text}</p>)}
      {!hint && !lines.length && <p className="d41-intel__quiet">{t('d41.player.quiet')}</p>}
    </div>
  {driver.mode !== 'tutorial' && <Hint id="player">{t('s41.hint.player')}</Hint>}</Screen>;
}

// ---------------------------------------------------------------- the decide sheet
export function DecideSheet({ driver, i, quick, onClose, onPost }: { driver: Driver4; i: number; quick?: boolean; onClose: () => void; onPost: (o: number, s: number) => void }) {
  const t = useT();
  const c = driver.cast[i];
  const [o, setO] = useState<number | null>(null);
  const [s, setS] = useState(1);
  const pv = o != null ? driver.preview(i, o, s) : null;
  const scoopWho = o != null ? driver.pub().feed.find((f) => f.i === i && f.claim === o) : undefined;
  const go = (s2 = s) => { if (o == null) return; haptic('publish'); onPost(o, s2); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);
  const sub = (k: number) => (k === 0 ? t('pl4.out.signsC', { to: c.to.s }) : k === 1 ? t('pl4.out.elsewhereC', { to: c.to.s }) : t('pl4.out.staysC', { from: c.from.s }));
  const deal = pv && o != null ? (t.list('pl4.deal') as string[])[o].replace('{w}', String(pv.win)).replace('{l}', String(Math.abs(pv.lose))).replace('{to}', c.to.s) : '';
  const extra = pv && o != null ? (s === 2 ? (pv.scoop ? t('pl4.sheet.scoopOn', { out: outWord4(t.lang, o) }) : scoopWho ? t('pl4.sheet.scoopOff', { who: tr(t.lang, 'rival4.' + scoopWho.id), out: outWord4(t.lang, o) }) : '') : '') + (pv.early > 0 ? ' ' + t('pl4.sheet.early', { n: pv.early }) : '') : '';
  return <div className="d41-sheet" onClick={onClose}>
    <div className={'d41-sheet__card' + (quick ? ' is-quick' : '')} role="dialog" aria-modal="true" aria-label={t('d41.decide.title')} onClick={(e) => e.stopPropagation()}>
      <header className="d41-sheet__h">
        <span><small>{t('d41.decide.title')}</small><b dir="auto">{c.player.n}</b></span>
        <button type="button" className="d41-x" onClick={onClose} aria-label={t('d41.decide.cancel')}>×</button>
      </header>
      <div className="d41-outs" role="radiogroup" aria-label={t('d41.decide.how')}>
        {OUT_KEYS.map((k, n) => <Pop key={k} role="radio" aria-checked={o === n} className={'d41-out d41-o--' + k + (o === n ? ' is-on' : '')} onTap={() => setO(n)} data-tut={'how-' + n}>
          <b>{outWord4(t.lang, n)}</b><small dir="auto">{sub(n)}</small>
        </Pop>)}
      </div>
      {quick
        ? <div className="d41-louds is-go">
          {[0, 1, 2].map((n) => { const p = o != null ? driver.preview(i, o, n) : null;
            return <Pop key={n} className={'d41-loud is-go' + (n === 2 ? ' is-drop' : '')} onTap={() => go(n)} disabled={o == null} sound={null} data-tut={'loud-' + n}>
              <b>{backWord4(t.lang, n)}</b><small className="g-num">{p ? '+' + num(p.win) + ' / −' + num(Math.abs(p.lose)) : t('back4.' + ['x1D', 'x2D', 'allinD'][n])}</small>
            </Pop>; })}
        </div>
        : <>
          <div className="d41-louds" role="radiogroup" aria-label={t('d41.decide.loud')}>
            {[0, 1, 2].map((n) => <Pop key={n} role="radio" aria-checked={s === n} className={'d41-loud' + (s === n ? ' is-on' : '') + (n === 2 ? ' is-drop' : '')} onTap={() => setS(n)} data-tut={'loud-' + n}>
              <b>{backWord4(t.lang, n)}</b><small className="g-num">{t('back4.' + ['x1D', 'x2D', 'allinD'][n])}</small>
            </Pop>)}
          </div>
          <p className={'d41-deal' + (pv ? '' : ' is-empty')} aria-live="polite" dir="auto">{pv ? deal : t('d41.decide.pick')}{extra && <small>{extra}</small>}</p>
          <Pop className={'d41-btn d41-btn--big' + (s === 2 ? ' is-drop' : '')} onTap={() => go()} disabled={o == null} sound={null} data-tut="publish">{(t.list('pl4.sheet.go') as string[])[s]}</Pop>
        </>}
      <p className="d41-sheet__fine">{quick && o == null ? t('d41.decide.quick') : t('pl4.sheet.final')}</p>
    </div>
  </div>;
}

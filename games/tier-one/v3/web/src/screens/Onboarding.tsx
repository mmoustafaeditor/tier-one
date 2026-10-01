// First launch and the moments around it (CONCEPT4.md §12; the onboarding lane). App mounts <Onboarding go route/> once,
// over the phone (also while it is locked); it decides for itself what, if anything, to show:
//   1. a new player:  the lock screen (09:41, one DM from Mags Doyle) → "Set up your account": your handle, then your
//                     line (one of three house catchphrases) → straight into the First window in Blurt (ui/tutorial.tsx)
//   2. after the First window, back on the home screen: the push card, once, with its reason
//   3. a player from 3.x: "What's new on your phone", once, with the new words (their save is already migrated)
// No rules page before the first post; How to play lives in Settings and behind Blurt's "?" (screens/HowTo.tsx).
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useT, LANGS, fmtDate } from '../lib/i18n';
import { update, useSave, type Save } from '../lib/save';
import { sfx } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { newCareer } from '../lib/career';
import { grantEarned } from '../lib/earned';
import { equipItem } from '../lib/wallet';
import { toast } from '../lib/meta';
import { pushSupported, pushPermission, subscribePush } from '../lib/push';
import { Pop, Stamp } from '../ui/juice';
import { AppIcon } from '../ui/phone';
import { Icon } from '../ui/game';
import { startTutorial } from '../ui/tutorial';
import type { Go } from '../App';

export { startTutorial };

/** The three house lines a new account picks from (lib/catalog.ts: the standard line plus two granted here). */
export const START_LINES = [
  { id: 'cp.house.default', key: 'cp.house.default', tone: 'loud' as const, c: '#F7B928' },
  { id: 'cp.lockin', key: 'cp.house.lockin', tone: 'cool' as const, c: '#1FA7D9' },
  { id: 'cp.gates', key: 'cp.house.gates', tone: 'dry' as const, c: '#1DB46A' },
];
/** A new account's followers before the First window (the Story prologue's "a 200-follower account"). */
export const START_FOLLOWERS = 200;

// A handle that sounds like the timeline: two words off the transfer beat and two digits. Latin only (handles are).
const H1 = ['Late', 'Quiet', 'Medical', 'Tunnel', 'Window', 'Bench', 'Sixth', 'Loan', 'Gate', 'Kit', 'Early', 'Deadline'];
const H2 = ['Whispers', 'Ledger', 'Notes', 'Watch', 'Room', 'Talk', 'Lens', 'Files', 'Line', 'Diary', 'Corner', 'Hours'];
export function suggestHandle(): string {
  const r = (n: number) => Math.floor(Math.random() * n);
  return H1[r(H1.length)] + H2[r(H2.length)] + String(10 + r(90));
}
const cleanHandle = (x: string) => x.replace(/^@+/, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16);

/** A 3.x player opening 4.0 for the first time: onboarded, has played, hasn't seen "What's new" or the First window. */
export const isReturning = (s: Save) => s.onboarded && !s.stats.whatsNew4 && !s.stats.tutorial && ((s.xp || s.pp || 0) > 0 || Object.keys(s.daily || {}).length > 0 || (s.stats.windows || 0) > 0);
/** The push card is due: the First window is done, we're on the home screen, the device can do push and hasn't been asked. */
const pushDue = (s: Save, route?: string) => !!s.stats.tutorial && !s.stats.push4 && route === 'front' && pushSupported() && pushPermission() === 'default';

export function Onboarding({ go, route }: { go: Go; route?: string }) {
  const s = useSave();
  if (!s.onboarded) return <FirstLaunch go={go} />;
  if (route === 'lock') return null; // the rest waits for the unlock
  if (isReturning(s)) return <WhatsNew go={go} />;
  if (pushDue(s, route)) return <PushCard />;
  return null;
}

// ---------------------------------------------------------------- 1. first launch
type Phase = 'lock' | 'handle' | 'line';
function FirstLaunch({ go }: { go: Go }) {
  const t = useT();
  const s = useSave();
  const [phase, setPhase] = useState<Phase>('lock');
  const [handle, setHandle] = useState(() => cleanHandle(s.nick) || suggestHandle());
  const [picked, setPicked] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const ok = handle.length >= 3;
  useEffect(() => { if (phase !== 'handle') return; const id = setTimeout(() => input.current?.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 320); return () => clearTimeout(id); }, [phase]);

  const toLine = () => { if (!ok) return; setPhase('line'); };
  const finish = (lineId: string) => {
    if (picked) return;
    setPicked(lineId);
    update((x) => {
      x.onboarded = true; x.nick = handle;
      x.stats.whatsNew4 = Date.now(); // a new player never needs "What's new"
      const b = (x.byline = x.byline || { followers: 0, rep: 30, hot: 0, best: 0, rank: 0 });
      if (!x.stats.windows && b.followers < START_FOLLOWERS) b.followers = START_FOLLOWERS;
      if (!x.career) { x.career = newCareer(); x.story = { ...(x.story || {}), chapterSeen: 0 }; }
    });
    if (lineId === START_LINES[0].id) equipItem(null, 'catchphrase');
    else { grantEarned(lineId); equipItem(lineId, 'catchphrase'); }
    // The stamp slams on the line they picked, then the First window opens in Blurt.
    setTimeout(() => startTutorial(go), prefersReducedMotion() ? 150 : 820);
  };
  const date = fmtDate(Date.now(), t.lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const step = phase === 'handle' ? 1 : phase === 'line' ? 2 : 0;

  return <div className={'ob4 ob4--' + phase} role="dialog" aria-modal="true" aria-label={phase === 'lock' ? t('ob4.lock.from') : t('ob4.setup.k')}>
    {phase === 'lock' && <div className="ob4-lock">
      <div className="ob4-lock__clock"><b className="ob4-lock__time">09:41</b><span className="ob4-lock__date">{date}</span></div>
      <Pop className="ob4-note" sound="os.unlock" onTap={() => setPhase('handle')} label={t('ob4.lock.from') + ': ' + t('ob4.lock.note')}>
        <AppIcon id="dms" size={40} />
        <span className="ob4-note__b">
          <span className="ob4-note__k"><span>{t('ob4.lock.app')}</span><span>{t('ob4.lock.now')}</span></span>
          <b dir="auto">{t('ob4.lock.from')}</b>
          <span dir="auto">{t('ob4.lock.note')}</span>
        </span>
      </Pop>
      <p className="ob4-lock__hint">{t('ob4.lock.open')}</p>
      <div className="ob4-langs" role="group" aria-label="Language · اللغة · Idioma">
        {LANGS.map(([k, n]) => <button key={k} type="button" lang={k} aria-pressed={s.lang === k} onClick={() => { sfx('ui.tap'); update((x) => { x.lang = k; }); }}>{n}</button>)}
      </div>
    </div>}

    {phase !== 'lock' && <div className="ob4-setup">
      <header className="ob4-setup__top">
        <span className="ob4-setup__k">{t('ob4.setup.k')}</span>
        <span className="ob4-setup__bars" aria-hidden="true"><i className={step >= 1 ? 'on' : ''} /><i className={step >= 2 ? 'on' : ''} /></span>
      </header>

      {phase === 'handle' && <section className="ob4-step" key="h">
        <h1 className="ob4-step__h">{t('ob4.setup.handle')}</h1>
        <p className="ob4-step__d">{t('ob4.setup.handleD')}</p>
        <label className={'ob4-handle' + (ok ? '' : ' is-short')} dir="ltr">
          <span aria-hidden="true">@</span>
          <input ref={input} value={handle} maxLength={16} autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="next"
            aria-label={t('ob4.setup.handle')} aria-describedby="ob4-hd" aria-invalid={!ok}
            onChange={(e) => setHandle(cleanHandle(e.target.value))}
            onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); sfx('ui.tap'); toLine(); } }} />
        </label>
        <p id="ob4-hd" className="ob4-step__note" aria-live="polite">{ok ? '' : t('ob4.setup.short')}</p>
        <button type="button" className="ob4-another" onClick={() => { sfx('ui.tap'); setHandle(suggestHandle()); }}><Icon n="repost" size={18} />{t('ob4.setup.another')}</button>
        <Pop className="ob4-go" onTap={toLine} disabled={!ok}>{t('ob4.setup.next')}</Pop>
      </section>}

      {phase === 'line' && <section className="ob4-step" key="l">
        <h1 className="ob4-step__h">{t('ob4.setup.line')}</h1>
        <p className="ob4-step__d">{t('ob4.setup.lineD')}</p>
        <div className="ob4-lines" role="radiogroup" aria-label={t('ob4.setup.line')}>
          {START_LINES.map((l, k) => {
            const text = t(l.key), on = picked === l.id;
            return <Pop key={l.id} role="radio" aria-checked={on} className={'ob4-line' + (on ? ' is-on' : '') + (picked && !on ? ' is-off' : '')} sound={null}
              style={{ ['--lc' as string]: l.c, ['--k' as string]: k } as CSSProperties} label={t('ob4.setup.pick', { l: text })} onTap={() => finish(l.id)}>
              {on ? <Stamp text={text} tone={l.tone} size="lg" /> : <span className="ob4-line__t" dir="auto">{text}</span>}
            </Pop>;
          })}
        </div>
      </section>}
    </div>}
  </div>;
}

// ---------------------------------------------------------------- 2. the push card (once, after the First window)
function PushCard() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const close = (why: number) => update((x) => { x.stats.push4 = why; });
  const yes = async () => {
    if (busy) return;
    setBusy(true);
    const on = await subscribePush().catch(() => false);
    close(on ? 2 : 1);
    if (on) toast('info', t('ob4.push.on'));
  };
  return <div className="ob4-scrim" role="dialog" aria-modal="true" aria-labelledby="ob4-push-h">
    <section className="ob4-card">
      <span className="ob4-card__ic" aria-hidden="true"><Bell /></span>
      <span className="ob4-setup__k">{t('ob4.push.k')}</span>
      <h2 id="ob4-push-h" className="ob4-card__h">{t('ob4.push.h')}</h2>
      <p className="ob4-card__p">{t('ob4.push.b')}</p>
      <Pop className="ob4-go" onTap={yes} disabled={busy} data-autofocus="">{t('ob4.push.yes')}</Pop>
      <button type="button" className="ob4-quiet" onClick={() => { sfx('ui.tap'); close(1); }}>{t('ob4.push.no')}</button>
    </section>
  </div>;
}
function Bell() {
  return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0" /></svg>;
}

// ---------------------------------------------------------------- 3. what's new (a 3.x player, once)
function WhatsNew({ go }: { go: Go }) {
  const t = useT();
  const items = (t.list('ob4.new.items') as string[][]) || [];
  const seen = () => update((x) => { x.stats.whatsNew4 = Date.now(); });
  return <div className="ob4 ob4--new" role="dialog" aria-modal="true" aria-labelledby="ob4-new-h">
    <div className="ob4-new">
      <span className="ob4-setup__k">{t('ob4.new.k')}</span>
      <h1 id="ob4-new-h" className="ob4-step__h">{t('ob4.new.h')}</h1>
      <p className="ob4-step__d">{t('ob4.new.sub')}</p>
      <dl className="ob4-words">
        {items.map(([w, d], k) => <div key={k} className="ob4-word" style={{ ['--k' as string]: k } as CSSProperties}><dt dir="auto">{w}</dt><dd dir="auto">{d}</dd></div>)}
      </dl>
      <div className="ob4-new__acts">
        <Pop className="ob4-go" onTap={() => { seen(); go({ n: 'front' }); }} sound="os.unlock" data-autofocus="">{t('ob4.new.go')}</Pop>
        <button type="button" className="ob4-quiet" onClick={() => { sfx('ui.tap'); seen(); startTutorial(go); }}>{t('ob4.new.first')}</button>
      </div>
    </div>
  </div>;
}

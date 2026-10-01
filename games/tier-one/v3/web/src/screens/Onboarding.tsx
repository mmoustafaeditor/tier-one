// First launch (UI41.md "Onboarding"): ONE screen, your handle and your catchphrase, then straight into a short first
// Daily Challenge in tutorial mode (ui/tutorial.tsx: four tips). After it, back home: the push card once. A player from
// 4.0 or 3.x gets one "Your phone, simplified" card, once. App mounts <Onboarding go route/> over the phone.
import { useState } from 'react';
import { useT, LANGS } from '../lib/i18n';
import { update, useSave, type Save } from '../lib/save';
import { sfx } from '../lib/sfx';
import { newCareer } from '../lib/career';
import { grantEarned } from '../lib/earned';
import { equipItem } from '../lib/wallet';
import { toast } from '../lib/meta';
import { pushSupported, pushPermission, subscribePush } from '../lib/push';
import { Screen } from '../ui/screen';
import { startTutorial } from '../ui/tutorial';
import type { Go } from '../App';

export { startTutorial };

/** The three house lines a new account picks from (lib/catalog.ts: the standard line plus two granted here). */
export const START_LINES = [
  { id: 'cp.house.default', key: 'cp.house.default' },
  { id: 'cp.lockin', key: 'cp.house.lockin' },
  { id: 'cp.gates', key: 'cp.house.gates' },
];
/** A new account's followers before the first Daily. */
export const START_FOLLOWERS = 200;

// A handle that sounds like the transfer beat: two words and two digits. Latin only (handles are).
const H1 = ['Late', 'Quiet', 'Medical', 'Tunnel', 'Window', 'Bench', 'Sixth', 'Loan', 'Gate', 'Kit', 'Early', 'Deadline'];
const H2 = ['Whispers', 'Ledger', 'Notes', 'Watch', 'Room', 'Talk', 'Files', 'Line', 'Diary', 'Corner', 'Hours', 'Desk'];
export function suggestHandle(): string {
  const r = (n: number) => Math.floor(Math.random() * n);
  return H1[r(H1.length)] + H2[r(H2.length)] + String(10 + r(90));
}
const cleanHandle = (x: string) => x.replace(/^@+/, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16);

/** A player who has played before and hasn't seen the 4.1 phone. */
export const isReturning = (s: Save) => s.onboarded && !s.stats.whatsNew41 && ((s.xp || s.pp || 0) > 0 || Object.keys(s.daily || {}).length > 0 || (s.stats.windows || 0) > 0);
const pushDue = (s: Save, route?: string) => !!s.stats.tutorial && !s.stats.push4 && route === 'front' && pushSupported() && pushPermission() === 'default';

export function Onboarding({ go, route }: { go: Go; route?: string }) {
  const s = useSave();
  if (!s.onboarded) return <FirstLaunch go={go} />;
  if (route === 'lock') return null;
  if (isReturning(s)) return <WhatsNew />;
  if (pushDue(s, route)) return <PushCard />;
  return null;
}

// ---------------------------------------------------------------- first launch: one screen
function FirstLaunch({ go }: { go: Go }) {
  const t = useT();
  const s = useSave();
  const [handle, setHandle] = useState(() => cleanHandle(s.nick) || suggestHandle());
  const [line, setLine] = useState(START_LINES[0].id);
  const [busy, setBusy] = useState(false);
  const ok = handle.length >= 3;
  const start = () => {
    if (!ok || busy) return;
    setBusy(true); sfx('stamp.done');
    update((x) => {
      x.onboarded = true; x.nick = handle;
      x.stats.whatsNew4 = Date.now(); x.stats.whatsNew41 = Date.now(); // a new player never needs "What's new"
      const b = (x.byline = x.byline || { followers: 0, rep: 30, hot: 0, best: 0, rank: 0 });
      if (!x.stats.windows && b.followers < START_FOLLOWERS) b.followers = START_FOLLOWERS;
      if (!x.career) { x.career = newCareer(); x.story = { ...(x.story || {}), chapterSeen: 0 }; }
    });
    if (line === START_LINES[0].id) equipItem(null, 'catchphrase');
    else { grantEarned(line); equipItem(line, 'catchphrase'); }
    startTutorial(go);
  };
  return <div className="ob41" role="dialog" aria-modal="true" aria-labelledby="ob41-h">
    <Screen title={<span id="ob41-h">{t('s41.ob.title')}</span>} sub={t('s41.ob.sub')}
      right={<span className="ob41-langs">{LANGS.map(([k]) => <button key={k} type="button" lang={k} aria-pressed={s.lang === k} onClick={() => { sfx('ui.tap'); update((x) => { x.lang = k; }); }}>{k.toUpperCase()}</button>)}</span>}
      footer={<button type="button" className="s41-btn s41-btn--main" disabled={!ok || busy} onClick={start}>{t('s41.ob.go')}</button>}>
      <label className="ob41-k" htmlFor="ob41-handle">{t('s41.ob.handle')}</label>
      <div className="ob41-handle" dir="ltr">
        <span aria-hidden="true">@</span>
        <input id="ob41-handle" value={handle} maxLength={16} autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-invalid={!ok}
          onChange={(e) => setHandle(cleanHandle(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); start(); } }} />
        <button type="button" className="s41-btn s41-btn--sm s41-btn--quiet" onClick={() => { sfx('ui.tap'); setHandle(suggestHandle()); }}>{t('s41.ob.another')}</button>
      </div>
      <p className="pc-line" aria-live="polite">{ok ? t('s41.ob.handleD') : t('ob4.setup.short')}</p>
      <span className="ob41-k" id="ob41-line">{t('s41.ob.line')}</span>
      <div className="ob41-lines" role="radiogroup" aria-labelledby="ob41-line">
        {START_LINES.map((l) => <button key={l.id} type="button" role="radio" aria-checked={line === l.id} className={line === l.id ? 'on' : ''} onClick={() => { sfx('ui.tap'); setLine(l.id); }}>“{t(l.key)}”</button>)}
      </div>
    </Screen>
  </div>;
}

// ---------------------------------------------------------------- the push card (once, after the first Daily)
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
  return <div className="ob41-scrim" role="dialog" aria-modal="true" aria-labelledby="ob41-push">
    <section className="ob41-card">
      <h2 id="ob41-push">{t('ob4.push.h')}</h2>
      <p>{t('ob4.push.b')}</p>
      <button type="button" className="s41-btn s41-btn--main" onClick={yes} disabled={busy}>{t('ob4.push.yes')}</button>
      <button type="button" className="s41-btn s41-btn--quiet" onClick={() => { sfx('ui.tap'); close(1); }}>{t('ob4.push.no')}</button>
    </section>
  </div>;
}

// ---------------------------------------------------------------- returning players: one card, once
function WhatsNew() {
  const t = useT();
  const seen = () => { sfx('ui.tap'); update((x) => { x.stats.whatsNew41 = Date.now(); x.stats.whatsNew4 = x.stats.whatsNew4 || Date.now(); }); };
  return <div className="ob41-scrim" role="dialog" aria-modal="true" aria-labelledby="ob41-new">
    <section className="ob41-card">
      <h2 id="ob41-new">{t('s41.new.h')}</h2>
      <p>{t('s41.new.b')}</p>
      <button type="button" className="s41-btn s41-btn--main" onClick={seen}>{t('s41.new.go')}</button>
    </section>
  </div>;
}

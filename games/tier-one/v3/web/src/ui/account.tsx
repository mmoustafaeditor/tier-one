// "Protect your Press Card" (brief §49): the game starts anonymous (lib/account.ts hello on boot) and never asks to
// register before play. Here the player can link an email so the name, streak and record follow them. The v4 magic
// link (account.link.start / finish) does the work; in sandbox mode the link finishes at once.
//   <ProtectCard />        Settings › Account and My Press Card: state + the email form
//   <ProtectNudge go />    My Press Card: one quiet line once there's something to lose (3+ Dailies), until linked
import { useState, type FormEvent } from 'react';
import { useT } from '../lib/i18n';
import { useSave } from '../lib/save';
import { sfx } from '../lib/sfx';
import { toast } from '../lib/meta';
import { useAccount, startLink } from '../lib/account';
import { track } from '../lib/analytics';
import { Icon } from './bits';
import { GBtn } from './game';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ProtectCard({ compact }: { compact?: boolean }) {
  const t = useT();
  const a = useAccount();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'bad' | 'fail'>('idle');
  const linked = !!a.account?.linked;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!EMAIL_RE.test(v)) { setState('bad'); return; }
    setState('busy'); sfx('ui.tap'); track('link.start');
    const r = await startLink(v);
    if (!r.ok) { setState('fail'); return; }
    setState('sent');
    if (r.sandbox) { toast('ach', t('sh.acct.linked')); track('link.done'); }
  };
  return <section className={'pc' + (linked ? ' is-linked' : '') + (compact ? ' pc--compact' : '')} aria-label={t('sh.acct.title')}>
    <span className="pc__ic" aria-hidden="true"><Icon n={linked ? 'shield' : 'mail'} size={22} /></span>
    <div className="pc__b">
      <b className="pc__t" dir="auto">{linked ? t('sh.acct.linked') : t('sh.acct.title')}</b>
      {linked ? <p className="pc__s">{t('sh.acct.linkedBody', { e: a.account?.email || '' })}</p>
        : a.status === 'claimed' ? <p className="pc__s">{t('sh.acct.claimed')}</p>
        : a.status === 'offline' || a.status === 'idle' ? <p className="pc__s">{t('sh.acct.offline')}</p>
        : state === 'sent' ? <p className="pc__s"><b>{t('sh.acct.sent')}</b> {t('sh.acct.sentBody')}</p>
        : <>
          {!compact && <p className="pc__s">{t('sh.acct.body')}</p>}
          <form className="pc__form" onSubmit={submit}>
            <input className="g-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); if (state === 'bad') setState('idle'); }} placeholder={t('sh.acct.email')} aria-label={t('sh.acct.email')} />
            <GBtn size="sm" kind="dark" type="submit" sound={null} loading={state === 'busy'}>{t('sh.acct.send')}</GBtn>
          </form>
          {state === 'bad' && <p className="pc__err">{t('sh.acct.bad')}</p>}
          {state === 'fail' && <p className="pc__err">{t('sh.acct.fail')}</p>}
        </>}
    </div>
  </section>;
}

export function ProtectNudge({ onOpen }: { onOpen: () => void }) {
  const t = useT(); const s = useSave(); const a = useAccount();
  if (a.account?.linked || Object.keys(s.daily).length < 3) return null;
  return <button type="button" className="pc-nudge" onClick={() => { sfx('ui.tap'); track('link.nudge'); onOpen(); }}>
    <Icon n="shield" size={18} /><span><b>{t('sh.acct.nudge')}</b><small>{t('sh.acct.nudgeSub')}</small></span><Icon n={t.rtl ? 'back' : 'arrow'} size={16} />
  </button>;
}

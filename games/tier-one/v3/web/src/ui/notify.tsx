// Notifications UI (brief §33): the one contextual ask after the first finished Daily, and the Settings row that
// switches the six topics on or off. Logic in lib/push.ts; the shell (App.tsx) mounts <PushAsk/> once.
import { useEffect, useState } from 'react';
import { useSave } from '../lib/save';
import { useT } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { toast } from '../lib/meta';
import { afterScenes } from '../lib/scenes';
import { ymdUTC } from '../lib/meta';
import { canAskPush, markPushAsked, subscribePush, setPushTopics, unsubscribePush, pushOn, pushTopics, pushSupported, pushPermission, PUSH_TOPICS, DEFAULT_TOPICS, type PushTopic } from '../lib/push';
import { track } from '../lib/analytics';
import { Sheet, Icon } from './bits';
import { GBtn } from './game';
import { Toggle } from './screenbits';

const TOPIC_KEY: Record<PushTopic, string> = { 'daily-ready': 'daily', 'streak-risk': 'streak', 'market-settled': 'market', 'room-open': 'roomOpen', 'room-closing': 'roomClose', 'ddlive-open': 'ddlive' };
const TOPIC_IC: Record<PushTopic, string> = { 'daily-ready': 'daily', 'streak-risk': 'flame', 'market-settled': 'market', 'room-open': 'rooms', 'room-closing': 'clock', 'ddlive-open': 'bolt' };

/** Mount once. Opens on Home the first time today's Daily is filed (and canAskPush() allows it), after any film. */
export function PushAsk({ route }: { route: string }) {
  const s = useSave();
  const [open, setOpen] = useState(false);
  const playedToday = !!s.daily[ymdUTC()];
  useEffect(() => {
    if (route !== 'front' || !playedToday || open || !canAskPush()) return;
    const id = setTimeout(() => afterScenes(() => { if (canAskPush()) { setOpen(true); track('push.ask'); } }), 900);
    return () => clearTimeout(id);
  }, [route, playedToday]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  return <PushAskSheet onClose={() => setOpen(false)} />;
}
export function PushAskSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const yes = async () => {
    setBusy(true); sfx('ui.tap');
    const ok = await subscribePush(DEFAULT_TOPICS);
    track(ok ? 'push.on' : 'push.refused');
    toast(ok ? 'ach' : 'info', t(ok ? 'sh.push.done' : 'sh.push.failed'));
    setBusy(false); onClose();
  };
  const no = () => { sfx('ui.tap'); markPushAsked(); track('push.later'); onClose(); };
  return <Sheet open onClose={no} label={t('sh.push.title')}>
    <div className="sheet__body pa">
      <span className="pa__ic" aria-hidden="true"><Icon n="bell" size={26} /></span>
      <h2 className="pa__t" dir="auto">{t('sh.push.title')}</h2>
      <p className="pa__s" dir="auto">{t('sh.push.body')}</p>
      <GBtn size="lg" primary loading={busy} sound={null} onClick={yes}><Icon n="bell" size={22} />{t('sh.push.yes')}</GBtn>
      <GBtn kind="ghost" size="sm" sound={null} onClick={no}>{t('sh.push.no')}</GBtn>
    </div>
  </Sheet>;
}

/** Settings: one row with a switch, and the six topics underneath while it is on. */
export function NotifyRows() {
  const t = useT();
  const [, tick] = useState(0);
  const [busy, setBusy] = useState(false);
  const on = pushOn(), topics = pushTopics(), sup = pushSupported(), perm = pushPermission();
  const sub = sup ? (perm === 'denied' ? t('sh.push.rowDenied') : on ? t('sh.push.rowOn', { n: topics.length }) : t('sh.push.rowOff')) : t('sh.push.rowNo');
  const flip = async () => {
    if (busy || !sup || perm === 'denied') return;
    setBusy(true);
    if (on) { await unsubscribePush(); toast('info', t('sh.push.off')); track('push.off'); }
    else { const ok = await subscribePush(topics.length ? topics : DEFAULT_TOPICS); toast(ok ? 'ach' : 'info', t(ok ? 'sh.push.done' : 'sh.push.failed')); track(ok ? 'push.on' : 'push.refused', { from: 'settings' }); }
    setBusy(false); tick((x) => x + 1);
  };
  const toggleTopic = async (k: PushTopic) => {
    const next = topics.includes(k) ? topics.filter((x) => x !== k) : [...topics, k];
    await setPushTopics(next); tick((x) => x + 1);
  };
  return <>
    <div className="trow"><span className="trow__ic"><Icon n="bell" /></span><span className="trow__t"><b>{t('sh.push.row')}</b><small>{sub}</small></span><Toggle on={on} label={t('sh.push.row')} onChange={flip} /></div>
    {on && <div className="gset__topics">{PUSH_TOPICS.map((k) => <button key={k} type="button" className={'gset__topic' + (topics.includes(k) ? ' is-on' : '')} aria-pressed={topics.includes(k)} onClick={() => { sfx('ui.tap'); void toggleTopic(k); }}>
      <Icon n={TOPIC_IC[k]} size={16} /><span dir="auto">{t('sh.push.topics.' + TOPIC_KEY[k])}</span>{topics.includes(k) && <Icon n="check" size={14} />}
    </button>)}</div>}
  </>;
}

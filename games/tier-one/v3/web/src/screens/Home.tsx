// The home screen (UI41.md "Structure: four modes"): a slim header (your handle, level and coins), four big mode tiles
// (Daily Challenge, Career, Multiplayer, Transfer Market) and a slim row of five utility icons (Press Card, Leaderboards,
// Missions, Shop, Settings). Nothing else. Deadline Day and Practice live inside the Daily Challenge tile. A red count
// sits on a tile when something needs you (ui/phone.tsx badgeOf). A locked tile says "Level N"; tapping it shakes.
// 1–9 on a keyboard open the tiles in order (App.tsx).
import { useRef } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { sfx, haptic } from '../lib/sfx';
import { shake } from '../ui/game';
import { useTray } from '../ui/juice';
import { chapterOf } from '../lib/storyMode';
import { ymdUTC } from '../lib/meta';
import { appById, AppIcon, badgeOf, isUnlocked, unlockLevel, levelInfo, HOME_MODES, HOME_UTILS, type AppKey } from '../ui/phone';
import { Hint } from '../ui/hint';
import type { Chrome, Route } from '../App';

export function Home(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const tray = useTray();
  const lv = levelInfo(s);
  const unread = tray.items.filter((i) => !i.read).map((i) => i.app as string);
  const today = s.daily[ymdUTC()];
  const ch = chapterOf(s);
  const status: Record<string, string> = {
    daily: today ? t('s41.home.st.played', { tier: t('tier.' + today.tier), n: num(today.total) }) : t('s41.home.st.daily'),
    career: ch ? t('s41.home.st.chapter', { n: ch.n }) : t('s41.home.st.career'),
    rooms: s.rooms.length ? t('s41.home.st.rooms', { n: s.rooms.length }) : t('s41.home.st.roomsNone'),
    wire: t('s41.home.st.wire'),
  };
  return <div className="hm">
    <header className="hm-head">
      <button type="button" className="hm-me" onClick={() => chrome.openApp('card')} aria-label={t('s41.app.card')}>
        <span className="hm-me__av" aria-hidden="true">{(s.nick || '?').slice(0, 1).toUpperCase()}</span>
        <span className="hm-me__b">
          <b dir="auto">@{s.nick || t('s41.lock.noName')}</b>
          <span className="hm-me__lv"><small>{t('s41.lv', { n: lv.n })}</small><i className="hm-bar" role="progressbar" aria-valuemin={0} aria-valuemax={lv.need} aria-valuenow={lv.into} aria-label={t('s41.lv', { n: lv.n })}><i style={{ width: lv.pct + '%' }} /></i></span>
        </span>
      </button>
      <button type="button" className="hm-coins" onClick={() => chrome.go({ n: 'shop', cat: 'coins' })} aria-label={t('s41.coinsAria', { n: num(s.credits) })}>
        <span className="g-coin" aria-hidden="true" /><b className="g-num">{num(s.credits)}</b>
      </button>
    </header>
    <nav className="hm-modes" aria-label={t('s41.home.modes')}>
      {HOME_MODES.map((id, k) => <Mode key={id} id={id} i={k} badge={badgeOf(id, s, unread)} status={status[id]} chrome={chrome}
        subs={id === 'daily' ? [{ app: 'deadline', label: t('s41.app.deadline'), to: { n: 'ddlive' } }, { app: 'daily', label: t('s41.home.practice'), to: { n: 'practice' } }] : undefined} />)}
    </nav>
    <nav className="hm-utils" aria-label={t('s41.home.apps')}>
      {HOME_UTILS.map((id, k) => <Util key={id} id={id} i={k + 4} badge={badgeOf(id, s, unread)} chrome={chrome} />)}
    </nav>
    <Hint id="home">{t('s41.hint.home')}</Hint>
  </div>;
}

type Sub = { app: AppKey; label: string; to: Route };
function useTap(id: AppKey, go: () => void) {
  const s = useSave();
  const ref = useRef<HTMLButtonElement>(null);
  const open = isUnlocked(id, s);
  const tap = () => {
    if (!open) { sfx('os.locked'); haptic('stamp'); shake(ref.current); return; }
    haptic('tap'); go();
  };
  return { ref, open, tap };
}

function Mode({ id, i, badge, status, subs, chrome }: { id: AppKey; i: number; badge: number; status: string; subs?: Sub[]; chrome: Chrome }) {
  const t = useT();
  const a = appById(id)!;
  const { ref, open, tap } = useTap(id, () => chrome.openApp(id));
  const name = t('s41.app.' + id);
  return <div className={'hm-mode' + (open ? '' : ' is-locked') + (subs ? ' has-subs' : '')} style={{ ['--i' as string]: i, ['--a' as string]: a.accent }}>
    <button ref={ref} type="button" className="hm-mode__main" onClick={tap}
      aria-label={open ? name + (badge ? ' · ' + t('s41.home.badge', { n: badge }) : '') : name + ' · ' + t('s41.home.level', { n: unlockLevel(id) })}>
      <span className="hm-mode__ic"><AppIcon id={id} size={44} locked={!open} />{badge > 0 && <b className="hm-badge" aria-hidden="true">{badge > 9 ? '9+' : badge}</b>}</span>
      <b className="hm-mode__l" dir="auto">{name}</b>
      <span className="hm-mode__s" dir="auto">{open ? status : t('s41.home.level', { n: unlockLevel(id) })}</span>
    </button>
    {subs && <span className="hm-mode__subs">{subs.map((x) => <SubBtn key={x.label} x={x} chrome={chrome} />)}</span>}
  </div>;
}
function SubBtn({ x, chrome }: { x: Sub; chrome: Chrome }) {
  const t = useT();
  const { ref, open, tap } = useTap(x.app, () => chrome.go(x.to));
  return <button ref={ref} type="button" className={'hm-sub' + (open ? '' : ' is-locked')} onClick={tap}>
    <span dir="auto">{x.label}</span>{!open && <small>{t('s41.home.lv', { n: unlockLevel(x.app) })}</small>}
  </button>;
}

function Util({ id, i, badge, chrome }: { id: AppKey; i: number; badge: number; chrome: Chrome }) {
  const t = useT();
  const a = appById(id)!;
  const { ref, tap } = useTap(id, () => chrome.openApp(id));
  const name = t('s41.app.' + id);
  return <button ref={ref} type="button" className="hm-util" style={{ ['--i' as string]: i, ['--a' as string]: a.accent }} onClick={tap}
    aria-label={name + (badge ? ' · ' + t('s41.home.badge', { n: badge }) : '')}>
    <span className="hm-util__ic"><AppIcon id={id} size={36} />{badge > 0 && <b className="hm-badge" aria-hidden="true">{badge > 9 ? '9+' : badge}</b>}</span>
    <span className="hm-util__l" dir="auto">{name}</span>
  </button>;
}

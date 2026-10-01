// The home screen (UI41.md "The phone"): a slim header (your handle, level and coins) and the nine app tiles in a 3×3
// grid, nothing else. A red count sits on a tile when something needs you (lib: ui/phone.tsx badgeOf). A locked tile
// says "Level N" plainly; tapping it shakes. 1–9 on a keyboard open the tiles in order (App.tsx).
import { useRef } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { sfx, haptic } from '../lib/sfx';
import { shake } from '../ui/game';
import { useTray } from '../ui/juice';
import { APPS, AppIcon, badgeOf, isUnlocked, unlockLevel, levelInfo, type AppDef } from '../ui/phone';
import type { Chrome } from '../App';

export function Home(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const tray = useTray();
  const lv = levelInfo(s);
  const unread = tray.items.filter((i) => !i.read).map((i) => i.app as string);
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
    <nav className="hm-grid" aria-label={t('s41.home.apps')}>
      {APPS.map((a, k) => <Tile key={a.id} a={a} i={k} badge={badgeOf(a, s, unread)} chrome={chrome} />)}
    </nav>
  </div>;
}

function Tile({ a, i, badge, chrome }: { a: AppDef; i: number; badge: number; chrome: Chrome }) {
  const t = useT();
  const s = useSave();
  const ref = useRef<HTMLButtonElement>(null);
  const open = isUnlocked(a.id, s);
  const need = unlockLevel(a.id);
  const name = t('s41.app.' + a.id);
  const tap = () => {
    if (!open) { sfx('os.locked'); haptic('stamp'); shake(ref.current); return; }
    haptic('tap'); chrome.openApp(a.id);
  };
  return <button ref={ref} type="button" className={'hm-tile' + (open ? '' : ' is-locked')} style={{ ['--i' as string]: i, ['--a' as string]: a.accent }} onClick={tap}
    aria-label={open ? name + (badge ? ' · ' + t('s41.home.badge', { n: badge }) : '') : name + ' · ' + t('s41.home.level', { n: need })}>
    <span className="hm-tile__ic"><AppIcon id={a.id} size={48} locked={!open} />{badge > 0 && <b className="hm-badge" aria-hidden="true">{badge > 9 ? '9+' : badge}</b>}</span>
    <span className="hm-tile__l" dir="auto">{name}</span>
    {!open && <span className="hm-tile__lock">{t('s41.home.level', { n: need })}</span>}
  </button>;
}

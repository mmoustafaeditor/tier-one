// The Morning Papers (brief §32): a compact newsroom briefing on the first open of the day. Four lines and one button:
//   Yesterday     Tier 2 · #418              (or "No Daily filed")
//   Overnight     Your market call on Osimhen settled.   (the newest feed line; or "A quiet night on the wire")
//   Rival         @ITK_Kev beat you to one.  (one taunt, only when there is one)
//   Today's desk  THE DAILY No. 148          (+ the streak at stake, + welcome back after 3 days away)
//   [ OPEN THE DESK ] → today's Daily (or just closes it once today's is filed)
// The data is lib/desk.ts morningPaper(); the short "paper's out" film still plays first (lib/scenes). Mounted once in
// App.tsx; it shows itself only on Home, after any other film, and marks itself read when closed.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSave, getSave, type Save } from '../lib/save';
import { useT, fmtDate, num, type T } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import type { Route } from '../App';
import { playScene, afterScenes, firstToday } from '../lib/scenes';
import { morningPaper, markPaperSeen, touchDesk, type Paper } from '../lib/desk';
import { markRead } from '../lib/byline';
import { ymdUTC } from '../lib/meta';
import { dailyNoToday } from '../screens/Front';
import { useDeskCtx } from './live';
import { feedText, navTo, Handle } from './connect';
import { Sheet } from './bits';
import { Icon } from './bits';
import { GBtn } from './game';
import { Portrait } from './portrait';

export function MorningPapers({ route }: { route: string }) {
  const t = useT(); const s = useSave(); const ctx = useDeskCtx();
  const [paper, setPaper] = useState<Paper | null>(null);
  const armed = useRef('');
  const routeRef = useRef(route); routeRef.current = route;
  useEffect(() => {
    if (route !== 'front' || !s.onboarded || paper) return;
    touchDesk();
    const p = morningPaper(getSave(), Date.now(), ctx);
    const day = p?.day || '';
    if (!p || armed.current === day) return;
    armed.current = day;
    afterScenes(() => {
      if (routeRef.current !== 'front') { armed.current = ''; return; }
      playScene(firstToday('paper') ? 'paper' : 'paper-short', { hed: hed(t, p, getSave()), what: t('sh.paper.k') });
      afterScenes(() => { if (routeRef.current === 'front') setPaper(p); else armed.current = ''; });
    });
  }, [route, s.onboarded]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = useCallback(() => { markPaperSeen(); setPaper(null); }, []);
  if (!paper) return null;
  return <MorningSheet paper={paper} onClose={close} />;
}
function hed(t: T, p: Paper, s: Save) {
  if (p.rank) return t('live.paper.hedRank', { n: p.rank.no, tier: t('tier.' + p.rank.tier) });
  const wire = p.items.find((f) => f.kind === 'wire');
  if (wire && wire.v?.p) return t('live.paper.hedWire', { p: wire.v.p });
  if (p.welcome) return t('live.paper.hedWelcome', { n: s.nick || t('g.home.noName') });
  return t('live.paper.hedQuiet');
}

export function MorningSheet({ paper: p, onClose }: { paper: Paper; onClose: () => void }) {
  const t = useT(); const s = useSave();
  useEffect(() => { sfx('typewriter'); }, []);
  const played = !!s.daily[ymdUTC()];
  const over = p.items[0] || null, taunt = p.taunts[0] || null;
  const go = (r: Route, feedId?: string) => { if (feedId) markRead([feedId]); onClose(); navTo(r); };
  const openDesk = () => { sfx('open'); if (played) { onClose(); return; } go({ n: 'daily' }); };
  const routeOf = (f: typeof over): Route => { const r = f?.to; if (!r) return { n: 'feed' }; if (r.n === 'wire') return { n: 'wire', rid: r.rid }; if (r.n === 'rooms') return { n: 'rooms', code: r.code }; return { n: r.n } as Route; };
  return <Sheet open onClose={onClose} label={t('sh.paper.title')}>
    <div className="sheet__body mp">
      <header className="mp__mast">
        <span className="g-mono">{fmtDate(Date.now(), t.lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <h2 className="mp__t">{t('sh.paper.title')}</h2>
      </header>
      {p.welcome && <p className="mp__welcome"><Icon n="desk" size={16} />{t('sh.paper.welcome', { d: p.welcome.days })}</p>}
      <dl className="mp__lines">
        <div className="mp__line">
          <dt>{t('sh.paper.yesterday')}</dt>
          <dd>{p.rank ? (p.rank.rank ? t('sh.paper.yRank', { tier: t('tier.' + p.rank.tier), r: p.rank.rank }) : t('sh.paper.yNoRank', { tier: t('tier.' + p.rank.tier), p: num(p.rank.total) })) : <span className="mp__quiet">{t('sh.paper.yNone')}</span>}</dd>
        </div>
        <div className="mp__line">
          <dt>{t('sh.paper.overnight')}</dt>
          <dd>{over ? <button type="button" className="mp__link" onClick={() => go(routeOf(over), over.id)} dir="auto">{feedText(t, over)}</button> : <span className="mp__quiet">{t('sh.paper.quiet')}</span>}</dd>
        </div>
        {taunt && taunt.from && <div className="mp__line mp__line--rival">
          <dt>{t('sh.paper.rival')}</dt>
          <dd><button type="button" className="mp__link" onClick={() => go({ n: 'rivals' }, taunt.id)}><Portrait id={'rival:' + taunt.from} size={22} shape="round" /><Handle id={taunt.from} /> <span dir="auto">{feedText(t, taunt)}</span></button></dd>
        </div>}
        <div className="mp__line mp__line--today">
          <dt>{t('sh.paper.today')}</dt>
          <dd><b>{t(played ? 'sh.paper.dailyDone' : 'sh.paper.dailyNo', { n: dailyNoToday() })}</b>{p.stake.atRisk && !played && <span className="mp__risk"><Icon n="flame" size={14} />{t('sh.paper.streakRisk', { n: p.stake.n })}</span>}</dd>
        </div>
      </dl>
      <GBtn size="lg" sound={null} primary onClick={openDesk}><Icon n={played ? 'desk' : 'phone'} size={22} />{t(played ? 'sh.paper.goPlayed' : 'sh.paper.go')}</GBtn>
    </div>
  </Sheet>;
}

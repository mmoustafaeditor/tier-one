// News and inbox: the papers on one side, your post on the other. Reading goes through inbox.read like any other
// change, so the event log knows what you have seen.
import { useState } from 'react';
import { I } from './kit';
import { Chips, Panel, PanelHead } from './shell';
import { useGame } from './game';
import { msgText, newsText } from './text';
import { shortDate } from '../sim/calendar';
import { stampDate } from '../sim/cups';
import { NF } from '../lang-newsf';
import type { NewsCat, NewsItem } from '../model/types';

// Rework §S: the world feed by section (each item already has its category), and "our club".
const CAT_ICON: Record<NewsCat, string> = { results: 'ball', transfers: 'swap', managers: 'whistle', youth: 'grad', records: 'star', crisis: 'alert', room: 'room' };

export function NewsScreen() {
  const g = useGame();
  const { w, c, x, t, lang, ui } = g;
  const N = x.news;
  const [tab, setTab] = useState<'inbox' | 'news'>('inbox');
  const [sec, setSec] = useState<'all' | 'mine' | NewsCat>('all');
  const F = NF[ui];
  const mineN = (n: NewsItem) => n.club === c.clubId || n.club2 === c.clubId;
  const all = c.news ?? [];
  const cats = (Object.keys(CAT_ICON) as NewsCat[]).filter((k) => all.some((n) => n.cat === k));
  const feed = all.filter((n) => sec === 'all' || (sec === 'mine' ? mineN(n) : n.cat === sec));
  const unread = c.inbox.filter((m) => !m.read);
  const when = (season: number, round: number) => shortDate(stampDate(c, season, round), ui); // F02: never after today
  return (
    <div className="sc-news">
      <div className="h-head on-ground">
        <span className="eyebrow">{g.club.name[lang]}</span>
        <h1 className="h-hero">{N.title}</h1>
      </div>
      <Chips label={N.title} value={tab} onChange={setTab}
        options={[{ v: 'inbox', label: <>{N.inbox}{unread.length ? <em className="count">{unread.length}</em> : null}</> }, { v: 'news', label: N.news }]} />
      {tab === 'inbox' ? (
        <Panel i={1} label={N.inbox}>
          <PanelHead title={N.inbox} right={unread.length ? <button className="link" onClick={() => void g.run({ type: 'inbox.read', ids: unread.map((m) => m.id) }, { toast: false })}>{N.read}</button> : undefined} />
          <div className="rows">
            {c.inbox.map((m) => {
              const [a, b] = msgText(t, lang, w, c, m);
              return (
                <button key={m.id} className={`row row--btn msg${m.read ? '' : ' unread'}`} onClick={() => { if (!m.read) void g.run({ type: 'inbox.read', ids: [m.id] }, { toast: false }); }}>
                  <span className="dot" aria-hidden="true" />
                  <span className="grow"><span className="name">{a}</span><span className="sub">{b}</span></span>
                  <span className="when small muted">{when(m.season, m.round)}</span>
                </button>
              );
            })}
            {!c.inbox.length && <p className="muted">{N.empty}</p>}
          </div>
        </Panel>
      ) : (
        <Panel i={1} label={N.news}>
          <PanelHead title={N.news} />
          <div className="chips news-secs" role="group" aria-label={N.news}>
            {(['all', 'mine', ...cats] as ('all' | 'mine' | NewsCat)[]).map((k) => (
              <button key={k} className="chip" aria-pressed={sec === k} onClick={() => setSec(k)}>
                {k === 'all' ? F.all : k === 'mine' ? F.mine : F.cat[k]} <em className="count">{k === 'all' ? all.length : k === 'mine' ? all.filter(mineN).length : all.filter((n) => n.cat === k).length}</em>
              </button>
            ))}
          </div>
          <div className="rows">
            {feed.slice(0, 40).map((n) => {
              const [a, b] = newsText(t, lang, w, c, n);
              return (
                <div key={n.id} className={`row news${mineN(n) ? ' mine' : ''}`}>
                  <I n={CAT_ICON[n.cat] ?? 'news'} size="sm" />
                  <span className="grow"><span className="name">{a}</span>{b && <span className="sub">{b}</span>}</span>
                  <span className="when small muted">{when(n.season, n.round)}</span>
                </div>
              );
            })}
            {!all.length ? <p className="muted">{N.empty}</p> : !feed.length ? <p className="muted">{F.none}</p> : null}
          </div>
        </Panel>
      )}
    </div>
  );
}

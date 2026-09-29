// News and inbox: the papers on one side, your post on the other. Reading goes through inbox.read like any other
// change, so the event log knows what you have seen.
import { useState } from 'react';
import { I } from './kit';
import { Chips, Panel, PanelHead } from './shell';
import { useGame } from './game';
import { msgText, newsText } from './text';
import { shortDate, dateOf } from '../sim/calendar';

export function NewsScreen() {
  const g = useGame();
  const { w, c, x, t, lang, ui } = g;
  const N = x.news;
  const [tab, setTab] = useState<'inbox' | 'news'>('inbox');
  const unread = c.inbox.filter((m) => !m.read);
  const when = (season: number, round: number) => shortDate(dateOf(season, Math.max(0, round)), ui);
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
          <div className="rows">
            {(c.news ?? []).slice(0, 40).map((n) => {
              const [a, b] = newsText(t, lang, w, c, n);
              return (
                <div key={n.id} className="row news">
                  <I n="news" size="sm" />
                  <span className="grow"><span className="name">{a}</span>{b && <span className="sub">{b}</span>}</span>
                  <span className="when small muted">{when(n.season, n.round)}</span>
                </div>
              );
            })}
            {!(c.news ?? []).length && <p className="muted">{N.empty}</p>}
          </div>
        </Panel>
      )}
    </div>
  );
}

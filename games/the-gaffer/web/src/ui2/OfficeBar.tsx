// The strip on top of every office screen: the club, where it stands, the date, and Continue.
import { useGame, cn } from './game';
import { Crest, I } from './kit';
import { leagueRows } from './util';
import { dateOf, shortDate } from '../sim/calendar';

export function OfficeBarInner({ openCount }: { openCount: number }) {
  const g = useGame();
  const { c, x, club, league, lang } = g;
  const rows = leagueRows(g.w, c);
  const pos = rows.findIndex((r) => r.clubId === c.clubId) + 1;
  const d = dateOf(c.season, Math.max(0, c.round), false);
  const today = new Date(d.getTime() - 2 * 86400000);
  return (
    <header className="topbar on-ground officebar">
      <div className="club">
        <Crest club={club} size={32} />
        <div className="grow"><b>{cn(club, lang)}</b><small>{league.name[lang]} · {x.place(pos)}</small></div>
      </div>
      <div className="when"><b>{shortDate(today, g.ui)}</b><span>{x.wk(x.seasonLabel(c.season), c.round + 1)}</span></div>
      <button className={`btn btn--accent continue${g.busy ? ' loading' : ''}`} disabled={g.busy} onClick={g.cont}>
        <span>{x.cont}</span> <small>{x.open(openCount)}</small><I n="arrowr" size="sm" />
      </button>
    </header>
  );
}

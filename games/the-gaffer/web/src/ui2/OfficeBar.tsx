// The strip on top of every office screen: the club, where it stands, the date, and Continue.
import { useGame, cn } from './game';
import { Crest, I } from './kit';
import { leagueRows } from './util';
import { shortDate } from '../sim/calendar';
import { todayOf } from '../sim/cups';
import { nextUserMatch } from '../sim/season';

export function OfficeBarInner({ openCount }: { openCount: number }) {
  const g = useGame();
  const { c, x, club, league, lang } = g;
  const rows = leagueRows(g.w, c);
  const pos = rows.findIndex((r) => r.clubId === c.clubId) + 1;
  const today = todayOf(c);
  // Continue names its next step, in the order App.cont takes them (live match, sacked, decisions, matchday, season end).
  const nextLabel = c.live ? x.next.live : c.sacked ? x.next.sacked : openCount ? x.next.dec(openCount) : nextUserMatch(g.w, c) ? x.next.match : x.next.season;
  // The masthead's own content (Shell places it): who we are and where we stand, the date, and Continue.
  return (
    <>
      <div className="mast-club">
        <Crest club={club} size={44} />
        <div className="grow"><b>{cn(club, lang)}</b><small>{league.name[lang]} · {x.place(pos)}</small></div>
      </div>
      <div className="mast-when"><b>{shortDate(today, g.ui)}</b><span>{x.wk(x.seasonLabel(c.season), c.round + 1)}</span></div>
      <button className={`btn btn--accent continue${g.busy ? ' loading' : ''}`} disabled={g.busy} onClick={g.cont}>
        <span>{x.cont}</span> <small>· {nextLabel}</small><I n="arrowr" size="sm" />
      </button>
    </>
  );
}

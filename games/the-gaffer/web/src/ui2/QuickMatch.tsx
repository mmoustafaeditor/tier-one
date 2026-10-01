// Quick match: any two clubs from the 2026/27 world, one game under the lights, nothing counts. It runs on a
// throwaway career that is never saved, so it can't touch a real one. The match screen is the real one: it reads
// that throwaway career through the same Game context.
import { loadPrefs } from '../sim/prefs';
import { useMemo, useState } from 'react';
import type { Strings, UiLang } from '../i18n';
import { dataLang } from '../i18n';
import type { XStrings } from '../lang-v2';
import type { Career } from '../model/types';
import { generateRealWorld } from '../sim/seed';
import { newCareer } from '../sim/season';
import { startMatch, type LiveMatch } from '../sim/match';
import { FIRST_SEASON, clubsOf, strengthOf, type World } from '../sim/world';
import { Crest, I } from './kit';
import { Chips, Panel } from './shell';
import { GameCtx, cn, type Game } from './game';
import { LiveScreen } from './Live';

const newSeed = () => (Math.random() * 2 ** 31) >>> 0;

export function QuickMatch({ t, x, ui, onExit }: { t: Strings; x: XStrings; ui: UiLang; onExit: () => void }) {
  const lang = dataLang(ui);
  const [seed] = useState(newSeed);
  const world = useMemo(() => generateRealWorld(seed), [seed]);
  const covered = world.leagues.filter((l) => world.clubs.some((c) => c.leagueId === l.id && c.real));
  const [leagueId, setLeagueId] = useState(covered[0]?.id ?? world.leagues[0].id);
  const [side, setSide] = useState<0 | 1>(0);
  const [picks, setPicks] = useState<[string, string]>(() => { const top = clubsOf(world, leagueId).sort((a, b) => b.reputation - a.reputation); return [top[0].id, top[1].id]; });
  const [game, setGame] = useState<{ m: LiveMatch; c: Career; w: World } | null>(null);
  const club = (id: string) => world.clubs.find((c) => c.id === id)!;

  const kickOff = () => {
    const c = newCareer(world, seed, picks[0], t.managerDefault, { age: 40, nationality: world.leagues.find((l) => l.id === club(picks[0]).leagueId)!.country }, FIRST_SEASON);
    setGame({ m: startMatch(world, c, picks[0], picks[1], `quick:${seed}:${picks.join(':')}`, 0), c, w: world });
  };

  if (game) {
    const home = club(game.c.clubId);
    const g: Game = {
      w: game.w, c: game.c, t, x, lang, ui, rtl: ui === 'ar', club: home, league: world.leagues.find((l) => l.id === home.leagueId)!, busy: false,
      run: async () => ({ ok: false, reason: 'quick' }), go: () => setGame(null), player: () => undefined, toast: () => undefined, sheet: () => undefined,
      play: () => undefined, cont: () => setGame(null),
    };
    return (
      <GameCtx.Provider value={g}>
        <div className="shell solo"><main className="main"><div className="page">
          <LiveScreen m={game.m} locked={false} speed0={loadPrefs().pace ?? 1} hl0={loadPrefs().hl ?? 2} onUpdate={(m) => setGame({ ...game, m })} onSave={() => undefined}
            onFinish={() => setGame(null)} />
        </div></main></div>
      </GameCtx.Provider>
    );
  }

  const list = clubsOf(world, leagueId).sort((a, b) => b.reputation - a.reputation);
  return (
    <div className="sc-quick title-page">
      <header className="topbar on-ground">
        <div className="club">
          <button className="icon-btn" aria-label={t.back} onClick={onExit}><I n="back" flip={ui === 'ar'} /></button>
          <div className="grow"><b>{x.title.quick}</b><small>{x.title.quickSub}</small></div>
        </div>
      </header>
      <div className="quick-pair">
        {([0, 1] as const).map((i) => (
          <button key={i} className="panel quick-side" aria-pressed={side === i} onClick={() => setSide(i)}>
            <span className="eyebrow">{i === 0 ? `${x.today.home} · ${x.table.you}` : x.today.away}</span>
            <Crest club={club(picks[i])} size={64} />
            <b>{cn(club(picks[i]), lang)}</b>
            <span className="small muted">{Math.round(strengthOf(world, picks[i]))}</span>
          </button>
        ))}
      </div>
      <Chips label={x.pick.league} value={leagueId} onChange={setLeagueId}
        options={covered.map((l) => ({ v: l.id, label: l.name[lang] }))} />
      <Panel i={1} label={x.pick.league}>
        <div className="rows">
          {list.map((c) => {
            const taken = c.id === picks[1 - side];
            return (
              <button key={c.id} className={`row row--btn${c.id === picks[side] ? ' mine' : ''}`} disabled={taken}
                onClick={() => { const p: [string, string] = [...picks]; p[side] = c.id; setPicks(p); if (side === 0) setSide(1); }}>
                <Crest club={c} size={32} />
                <span className="grow"><span className="name">{cn(c, lang)}</span></span>
                <span className="num">{Math.round(strengthOf(world, c.id))}</span>
              </button>
            );
          })}
        </div>
      </Panel>
      <div className="mbar" role="toolbar"><span className="grow" /><button className="btn btn--accent" onClick={kickOff}><I n="whistle" size="sm" />{t.kickOffT}</button></div>
    </div>
  );
}

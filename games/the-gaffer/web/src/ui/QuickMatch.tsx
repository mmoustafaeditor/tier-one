// Quick match: any two clubs, one game, nothing counts. You manage the home side live (subs, changes, team talk);
// it runs on a throwaway career that is never saved, so your real career is untouched.
import { useMemo, useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career } from '../model/types';
import { FIRST_SEASON, clubsOf, generateWorld, type World } from '../sim/world';
import { newCareer } from '../sim/season';
import { startMatch, type LiveMatch } from '../sim/match';
import type { Prefs } from '../sim/prefs';
import { Kit } from '../components/Kit';
import { AppBar } from './parts';
import { Live } from './Live';

export function QuickMatch({ source, lang, t, prefs, onExit, onToast }: {
  source: World | null; lang: Lang; t: Strings; prefs: Prefs; onExit: () => void; onToast: (s: string) => void;
}) {
  // The saved world (with your edits) when there is one, else a fresh one.
  const world = useMemo(() => source ?? generateWorld((Math.random() * 2 ** 31) >>> 0), [source]);
  const [side, setSide] = useState<0 | 1>(0);
  const [picks, setPicks] = useState<[string, string]>(() => {
    const top = clubsOf(world, world.leagues[0].id);
    return [top[0].id, top[1].id];
  });
  const [leagueId, setLeagueId] = useState(world.leagues[0].id);
  const [game, setGame] = useState<{ m: LiveMatch; c: Career } | null>(null);
  const club = (id: string) => world.clubs.find((c) => c.id === id)!;

  const kickOff = () => {
    const seed = (Math.random() * 2 ** 31) >>> 0;
    const c = newCareer(world, seed, picks[0], t.managerDefault, { age: 40, nationality: world.leagues.find((l) => l.id === club(picks[0]).leagueId)!.country }, FIRST_SEASON);
    const m = startMatch(world, c, picks[0], picks[1], `quick:${seed}`, 0);
    setGame({ m, c });
  };

  if (game) {
    return (
      <Live m={game.m} world={world} career={game.c} lang={lang} t={t} locked={false} speed0={prefs.speed} openOn={prefs.openOn} camera0={prefs.camera}
        label={t.quick} onToast={onToast} onUpdate={(m) => setGame({ ...game, m })} onSave={() => { /* a quick match is never saved */ }}
        onContinue={() => setGame(null)} />
    );
  }

  return (
    <>
      <AppBar back={onExit} backLabel={t.back} title={t.quick} sub={t.quickSub} />
      <div className="g-quickpair" style={{ marginTop: 'var(--s4)' }}>
        {([0, 1] as const).map((i) => (
          <button key={i} className={`card g-quickside${side === i ? ' on' : ''}`} onClick={() => setSide(i)}>
            <small className="over">{i === 0 ? `${t.home} · ${t.you}` : t.away}</small>
            <Kit colors={club(picks[i]).colors} size="lg" />
            <b>{club(picks[i]).name[lang]}</b>
          </button>
        ))}
      </div>
      <p className="muted" style={{ margin: 'var(--s3) 0' }}>{t.quickPick(side === 0 ? t.home : t.away)}</p>
      <select className="g-input" value={leagueId} onChange={(e) => setLeagueId(e.target.value)} aria-label={t.leagueT}>
        {world.leagues.map((l) => <option key={l.id} value={l.id}>{l.name[lang]}</option>)}
      </select>
      <div className="list" style={{ marginTop: 'var(--s3)' }}>
        {clubsOf(world, leagueId).map((c) => {
          const taken = c.id === picks[1 - side];
          return (
            <button key={c.id} className={`cell${c.id === picks[side] ? ' g-mine' : ''}`} disabled={taken}
              onClick={() => { const p: [string, string] = [...picks]; p[side] = c.id; setPicks(p); if (side === 0) setSide(1); }}>
              <Kit colors={c.colors} size="md" />
              <span className="cmain"><b>{c.name[lang]}</b><span>{t.reputation} {c.reputation}</span></span>
            </button>
          );
        })}
      </div>
      <div style={{ height: 110 }} />
      <div className="dock" style={{ position: 'fixed' }}>
        <button className="btn primary" style={{ width: '100%' }} onClick={kickOff}>{t.kickOffT}</button>
      </div>
    </>
  );
}

// World rankings of coaches and clubs, with region filters (E2E #57) and the same points everywhere (E2E #13).
import { useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career, CountryCode } from '../model/types';
import type { World } from '../sim/world';
import { clubTable, coachTable, countryOf, eloOf, inRegion, type Region } from '../sim/rankings';
import { Kit } from '../components/Kit';
import { AppBar } from './parts';

const REGIONS: Region[] = ['world', 'country', 'europe', 'africa', 'asia'];

export function Rankings({ world, career, lang, t, onBack }: { world: World; career: Career; lang: Lang; t: Strings; onBack: () => void }) {
  const [kind, setKind] = useState(0);
  const [region, setRegion] = useState<Region>('world');
  const home = countryOf(world, career.clubId) as CountryCode;
  const coaches = coachTable(world, career);
  const worldRank = coaches.findIndex((r) => r.you) + 1;
  const club = (id: string) => world.clubs.find((x) => x.id === id)!;
  const rows = kind === 0
    ? coaches.filter((r) => inRegion(world, r.clubId, region, home)).map((r) => ({ key: r.clubId, name: r.name[lang] || r.name.en, sub: club(r.clubId).name[lang], pts: r.points, me: r.you, clubId: r.clubId }))
    : clubTable(world).filter((c) => inRegion(world, c.id, region, home)).map((c) => ({ key: c.id, name: c.name[lang], sub: world.leagues.find((l) => l.id === c.leagueId)!.name[lang], pts: Math.round(eloOf(c)), me: c.id === career.clubId, clubId: c.id }));
  const myRow = rows.findIndex((r) => r.me);
  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.rankingsT} sub={t.rankingsSub(worldRank)} />
      <div className="seg" style={{ marginTop: 'var(--s4)' }}>
        {[t.coachesT, t.clubsT].map((l, i) => <button key={l} className={kind === i ? 'on' : ''} onClick={() => setKind(i)}>{l}</button>)}
      </div>
      <div className="g-chips">
        {REGIONS.map((r) => <button key={r} className={`chip g-toggle${region === r ? ' on' : ''}`} onClick={() => setRegion(r)}>{t.regions[r]}</button>)}
      </div>
      {myRow >= 0 && <p className="muted">#{myRow + 1} · {rows[myRow].name}</p>}
      <div className="list">
        {rows.slice(0, 50).map((r, i) => (
          <div key={r.key} className={`cell g-row${r.me ? ' g-rank-me' : ''}`}>
            <span className="g-rank num">{i + 1}</span>
            <Kit colors={club(r.clubId).colors} size="sm" />
            <span className="cmain"><b>{r.name}</b><span>{r.sub}</span></span>
            <span className="g-rating num">{r.pts}</span>
          </div>
        ))}
        {myRow >= 50 && (
          <div className="cell g-row g-rank-me">
            <span className="g-rank num">{myRow + 1}</span>
            <Kit colors={club(rows[myRow].clubId).colors} size="sm" />
            <span className="cmain"><b>{rows[myRow].name}</b><span>{rows[myRow].sub}</span></span>
            <span className="g-rating num">{rows[myRow].pts}</span>
          </div>
        )}
      </div>
    </>
  );
}

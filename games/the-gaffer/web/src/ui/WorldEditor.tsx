// World editor (the old admin panel's editor, now in the game): clubs (names, short name, colours, reputation, money)
// and players (name, position, age, rating, potential, shirt, nationality, club), add or release players, and
// export / import a world file. Nothing is saved until checkWorld() passes, so an edit can't break a career.
import { useMemo, useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career, Club, LocalizedName, Player, Position } from '../model/types';
import { FREE_AGENT } from '../model/types';
import { COUNTRIES } from '../data/leagues';
import { checkWorld, countryOf, freeShirt, makeAttrs, money, shiftAttrs, squadOf, valueOf, wageOf, type World } from '../sim/world';
import { makeRng } from '../sim/rng';
import { Kit } from '../components/Kit';
import { AppBar, Sheet, Stepper } from './parts';
import { download } from './share';

const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const FORMAT = 'the-gaffer-world';

// A world file: the world plus a version number that goes up every time the editor saves.
export interface WorldFile { format: typeof FORMAT; version: number; exported: string; world: World }

export function readWorldFile(text: string, current: World, clubId: string): { world: World; version: number } | { error: 'format' | 'mismatch' | 'invalid'; issues?: string[] } {
  let f: WorldFile;
  try { f = JSON.parse(text); } catch { return { error: 'format' }; }
  if (f?.format !== FORMAT || !f.world?.clubs || !f.world?.players || !f.world?.leagues) return { error: 'format' };
  // Same leagues and clubs as this career (fixtures and cups point at them); players may differ.
  const ids = (w: World) => w.clubs.map((c) => `${c.id}@${c.leagueId}`).sort().join();
  if (ids(f.world) !== ids(current)) return { error: 'mismatch' };
  const issues = checkWorld(f.world);
  if (issues.length || squadOf(f.world, clubId).length < 11) return { error: 'invalid', issues };
  return { world: f.world, version: Number(f.version) || 1 };
}

export function WorldEditor({ world, career, lang, t, onBack, onSave, onToast }: {
  world: World; career: Career; lang: Lang; t: Strings; onBack: () => void;
  onSave: (w: World, version: number, swaps: [string, string][]) => Promise<void>; onToast: (s: string) => void;
}) {
  const [draft, setDraft] = useState(world);
  const [edits, setEdits] = useState(0);
  const myLeague = world.clubs.find((c) => c.id === career.clubId)!.leagueId;
  const [leagueId, setLeagueId] = useState(myLeague);
  const [clubId, setClubId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [tab, setTab] = useState(0); // 0 clubs, 1 leagues, 2 countries
  const [swaps, setSwaps] = useState<[string, string][]>(career.pendingSwaps ?? []);
  const [leagueEdit, setLeagueEdit] = useState<string | null>(null);
  const [countryEdit, setCountryEdit] = useState<string | null>(null);
  const [swapA, setSwapA] = useState('');
  const [swapB, setSwapB] = useState('');
  const version = career.worldVersion ?? 0;
  const season = career.season;

  const edit = (w: World) => { setDraft(w); setEdits(edits + 1); setIssues([]); };
  const editClub = (id: string, patch: Partial<Club>) => edit({ ...draft, clubs: draft.clubs.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const editPlayer = (id: string, patch: Partial<Player>) => edit({
    ...draft,
    players: draft.players.map((p) => {
      if (p.id !== id) return p;
      const n = { ...p, ...patch };
      if (patch.rating !== undefined) n.attrs = shiftAttrs(p.attrs, n.rating - p.rating);
      if (patch.position && patch.position !== p.position) n.attrs = makeAttrs(makeRng(n.rating * 131 + n.birthYear), n.rating, n.position);
      n.potential = Math.max(n.potential, n.rating);
      n.marketValue = valueOf(n.rating, season - n.birthYear, n.potential);
      return n;
    }),
  });
  const moveTo = (p: Player, to: string) => edit({
    ...draft,
    players: draft.players.map((x) => (x.id === p.id
      ? { ...x, clubId: to, shirtNumber: to === FREE_AGENT ? 0 : freeShirt(draft, to, x.position), listed: undefined, contractUntil: to === FREE_AGENT ? season : Math.max(x.contractUntil, season + 1) }
      : x)),
  });
  const addPlayer = (club: Club) => {
    const r = makeRng(draft.players.length * 7 + edits);
    const pos: Position = 'CM';
    const value = valueOf(65, 22, 72);
    const lg = draft.leagues.find((l) => l.id === club.leagueId)!;
    const p: Player = {
      id: `ed${season}_${draft.players.length}_${edits}`, clubId: club.id, name: { ...t.newPlayer }, nationality: lg.country,
      birthYear: season - 22, position: pos, rating: 65, potential: 72, marketValue: value, wage: wageOf(value, lg.id),
      contractUntil: season + 3, shirtNumber: freeShirt(draft, club.id, pos), attrs: makeAttrs(r, 65, pos),
      fitness: 100, morale: 70, injured: 0, banned: 0,
    };
    edit({ ...draft, players: [...draft.players, p] });
    setPlayerId(p.id);
  };

  const save = async () => {
    const found = checkWorld(draft);
    for (const l of draft.leagues) if (!l.name.en.trim() || !l.name.ar.trim()) found.push(t.issueName(l.id));
    for (const c of draft.clubs) if (!c.name.en.trim() || !c.name.ar.trim() || !c.shortName) found.push(t.issueName(c.id));
    if (squadOf(draft, career.clubId).length < 11) found.push(t.editorMySquad);
    if (found.length) { setIssues(found); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    await onSave(draft, version + 1, swaps);
    setEdits(0);
    onToast(t.worldSaved(version + 1));
  };

  // checkWorld() speaks in ids; say it with names in the reader's language.
  const readable = (s: string) => {
    const cn = (id: string) => draft.clubs.find((c) => c.id === id)?.name[lang] ?? id;
    const pn = (id: string) => draft.players.find((p) => p.id === id)?.name[lang] ?? id;
    let m = s.match(/^(\S+): shirt (\d+) taken at (\S+)$/);
    if (m) return t.issueShirt(pn(m[1]), Number(m[2]), cn(m[3]));
    m = s.match(/^(\S+): only (\d+) players$/);
    if (m) return t.issueFew(cn(m[1]), Number(m[2]));
    return s;
  };
  const clubs = useMemo(() => draft.clubs.filter((c) => c.leagueId === leagueId).sort((a, b) => b.reputation - a.reputation), [draft, leagueId]);
  const club = clubId ? draft.clubs.find((c) => c.id === clubId)! : null;
  const player = playerId ? draft.players.find((p) => p.id === playerId) ?? null : null;
  const squad = club ? squadOf(draft, club.id).slice().sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || b.rating - a.rating) : [];

  return (
    <>
      <AppBar back={club ? () => setClubId(null) : onBack} backLabel={t.back} title={t.editorT} sub={t.worldVersion(version)} />
      {issues.length > 0 && (
        <div className="banner g-banner-bad" style={{ margin: 'var(--s3) 0' }}>
          <span className="bic">!</span>
          <div><b>{t.worldIssues(issues.length)}</b><br /><small>{issues.slice(0, 4).map(readable).join(' · ')}</small></div>
        </div>
      )}
      {!club && (
        <div className="seg" style={{ marginTop: 'var(--s3)' }}>
          {t.editorTabs.map((l, i) => <button key={l} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{l}</button>)}
        </div>
      )}
      {!club && tab === 1 && (
        <>
          <p className="muted" style={{ margin: 'var(--s3) 0' }}>{t.leaguesHint}</p>
          <div className="list">
            {draft.leagues.map((l) => (
              <button key={l.id} className="cell" onClick={() => { setLeagueEdit(l.id); setSwapA(''); setSwapB(''); }}>
                <span className="ico">{countryOf(draft, l.country)?.flag}</span>
                <span className="cmain"><b>{l.name[lang]}</b><span>{countryOf(draft, l.country)?.name[lang]} · {t.tier(l.tier)} · {t.clubs(draft.clubs.filter((c) => c.leagueId === l.id).length)}</span></span>
              </button>
            ))}
          </div>
          {swaps.length > 0 && (
            <>
              <div className="sechead"><span className="over">{t.queuedSwaps}</span></div>
              <div className="list">
                {swaps.map(([a, b], i) => (
                  <div key={i} className="cell g-row">
                    <span className="cmain"><b>{draft.clubs.find((c) => c.id === a)?.name[lang]} ⇄ {draft.clubs.find((c) => c.id === b)?.name[lang]}</b><span>{t.swapWhen}</span></span>
                    <button className="btn ghost sm" onClick={() => { setSwaps(swaps.filter((_, j) => j !== i)); setEdits(edits + 1); }}>{t.removeT}</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {!club && tab === 2 && (
        <div className="list" style={{ marginTop: 'var(--s3)' }}>
          {COUNTRIES.map((x) => (
            <button key={x.code} className="cell" onClick={() => setCountryEdit(x.code)}>
              <span className="ico">{x.flag}</span>
              <span className="cmain"><b>{countryOf(draft, x.code)!.name[lang]}</b><span>{x.code}</span></span>
            </button>
          ))}
        </div>
      )}
      {!club && tab !== 0 ? null : !club ? (
        <>
          <p className="muted" style={{ margin: 'var(--s3) 0' }}>{t.editorSub}</p>
          <select className="g-input" value={leagueId} onChange={(e) => setLeagueId(e.target.value)} aria-label={t.leagueT}>
            {draft.leagues.map((l) => <option key={l.id} value={l.id}>{l.name[lang]}</option>)}
          </select>
          <div className="list" style={{ marginTop: 'var(--s3)' }}>
            {clubs.map((c) => (
              <button key={c.id} className="cell" onClick={() => setClubId(c.id)}>
                <Kit colors={c.colors} size="md" />
                <span className="cmain"><b>{c.name[lang]}</b><span>{c.shortName} · {t.reputation} {c.reputation} · {squadOf(draft, c.id).length}</span></span>
              </button>
            ))}
          </div>
          <div className="sechead"><span className="over">{t.worldFile}</span></div>
          <div className="list">
            <button className="cell" onClick={() => {
              const f: WorldFile = { format: FORMAT, version, exported: new Date().toISOString(), world };
              const name = `the-gaffer-world-v${version}.json`;
              download(new Blob([JSON.stringify(f)], { type: 'application/json' }), name);
              onToast(t.savedAs(name));
            }}><span className="cmain"><b>{t.exportWorld}</b><span>{t.exportWorldSub}</span></span></button>
            <label className="cell" style={{ cursor: 'pointer' }}>
              <span className="cmain"><b>{t.importWorld}</b><span>{t.importWorldSub}</span></span>
              <input type="file" accept="application/json,.json" hidden onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                const r = readWorldFile(await f.text(), world, career.clubId);
                if ('error' in r) { onToast(t.importWorldBad[r.error]); if (r.issues) setIssues(r.issues); return; }
                await onSave(r.world, Math.max(version, r.version) + 1, []);
                setSwaps([]);
                setDraft(r.world);
                setEdits(0);
                onToast(t.worldSaved(Math.max(version, r.version) + 1));
              }} />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="card g-form" style={{ marginTop: 'var(--s3)' }}>
            <label><span className="over">{t.nameEn}</span><input className="g-input" dir="ltr" maxLength={40} value={club.name.en} onChange={(e) => editClub(club.id, { name: { ...club.name, en: e.target.value } })} /></label>
            <label><span className="over">{t.nameAr}</span><input className="g-input" dir="rtl" maxLength={40} value={club.name.ar} onChange={(e) => editClub(club.id, { name: { ...club.name, ar: e.target.value } })} /></label>
            <div className="g-filters">
              <label><span className="over">{t.shortNameT}</span><input className="g-input" dir="ltr" maxLength={3} value={club.shortName} onChange={(e) => editClub(club.id, { shortName: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} /></label>
              <label><span className="over">{t.colorsT}</span>
                <span className="g-colors">
                  <input type="color" value={club.colors[0]} onChange={(e) => editClub(club.id, { colors: [e.target.value, club.colors[1]] })} aria-label={t.colorsT} />
                  <input type="color" value={club.colors[1]} onChange={(e) => editClub(club.id, { colors: [club.colors[0], e.target.value] })} aria-label={t.colorsT} />
                  <Kit colors={club.colors} size="md" />
                </span>
              </label>
            </div>
            <div className="g-setrow"><span className="over">{t.reputation}</span><Stepper value={club.reputation} step={1} min={1} max={99} format={String} onChange={(v) => editClub(club.id, { reputation: v })} /></div>
            <div className="g-setrow"><span className="over">{t.budget}</span><Stepper value={club.budget} step={step(club.budget)} min={0} format={money} onChange={(v) => editClub(club.id, { budget: v })} /></div>
            <div className="g-setrow"><span className="over">{t.wageCap}</span><Stepper value={club.wageCap} step={step(club.wageCap)} min={10_000} format={money} onChange={(v) => editClub(club.id, { wageCap: v })} /></div>
          </div>
          <div className="sechead"><span className="over">{t.squad} · {squad.length}</span></div>
          <div className="list">
            {squad.map((p) => (
              <button key={p.id} className="cell" onClick={() => setPlayerId(p.id)}>
                <span className="tag">{p.position}</span>
                <span className="cmain"><b>{p.shirtNumber}. {p.name[lang]}</b><span>{season - p.birthYear} · {p.nationality} · {money(p.marketValue)}</span></span>
                <span className="g-rating num">{p.rating}</span>
              </button>
            ))}
          </div>
          <button className="btn" style={{ width: '100%', marginTop: 'var(--s3)' }} disabled={squad.length >= 40} onClick={() => addPlayer(club)}>{t.addPlayer}</button>
        </>
      )}

      <div style={{ height: 110 }} />
      <div className="dock" style={{ position: 'fixed' }}>
        <div className="g-livebtns g-two">
          <button className="btn ghost" disabled={!edits} onClick={() => { setDraft(world); setSwaps(career.pendingSwaps ?? []); setEdits(0); setIssues([]); }}>{t.discard}</button>
          <button className="btn primary" disabled={!edits} onClick={save}>{t.saveChanges}</button>
        </div>
      </div>

      {leagueEdit && (() => {
        const l = draft.leagues.find((x) => x.id === leagueEdit)!;
        const setName = (name: LocalizedName) => edit({ ...draft, leagues: draft.leagues.map((x) => (x.id === l.id ? { ...x, name } : x)) });
        const mine = draft.clubs.filter((c) => c.leagueId === l.id);
        const others = draft.leagues.filter((x) => x.country === l.country && x.id !== l.id);
        const busy = new Set(swaps.flat());
        return (
          <Sheet label={t.editLeague} onClose={() => setLeagueEdit(null)}>
            <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s3)' }}>{t.editLeague}</h2>
            <div className="g-form">
              <label><span className="over">{t.nameEn}</span><input className="g-input" dir="ltr" maxLength={40} value={l.name.en} onChange={(e) => setName({ ...l.name, en: e.target.value })} /></label>
              <label><span className="over">{t.nameAr}</span><input className="g-input" dir="rtl" maxLength={40} value={l.name.ar} onChange={(e) => setName({ ...l.name, ar: e.target.value })} /></label>
              {others.length > 0 && (
                <>
                  <div className="sechead" style={{ margin: 0 }}><span className="over">{t.swapT}</span></div>
                  <small className="muted">{t.swapHint}</small>
                  <select className="g-input" value={swapA} onChange={(e) => setSwapA(e.target.value)}>
                    <option value="">{l.name[lang]}…</option>
                    {mine.filter((c) => !busy.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name[lang]}</option>)}
                  </select>
                  <select className="g-input" value={swapB} onChange={(e) => setSwapB(e.target.value)}>
                    <option value="">{others.map((x) => x.name[lang]).join(' / ')}…</option>
                    {others.map((x) => (
                      <optgroup key={x.id} label={x.name[lang]}>
                        {draft.clubs.filter((c) => c.leagueId === x.id && !busy.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name[lang]}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <button className="btn" disabled={!swapA || !swapB} onClick={() => { setSwaps([...swaps, [swapA, swapB]]); setEdits(edits + 1); setSwapA(''); setSwapB(''); }}>{t.swapBtn}</button>
                </>
              )}
            </div>
            <button className="btn primary" style={{ width: '100%', marginTop: 'var(--s4)' }} onClick={() => setLeagueEdit(null)}>{t.done}</button>
          </Sheet>
        );
      })()}
      {countryEdit && (() => {
        const c = countryOf(draft, countryEdit)!;
        const setName = (name: LocalizedName) => edit({ ...draft, countries: { ...(draft.countries ?? {}), [c.code]: name } });
        return (
          <Sheet label={t.editCountry} onClose={() => setCountryEdit(null)}>
            <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s3)' }}>{c.flag} {t.editCountry}</h2>
            <div className="g-form">
              <label><span className="over">{t.nameEn}</span><input className="g-input" dir="ltr" maxLength={30} value={c.name.en} onChange={(e) => setName({ ...c.name, en: e.target.value })} /></label>
              <label><span className="over">{t.nameAr}</span><input className="g-input" dir="rtl" maxLength={30} value={c.name.ar} onChange={(e) => setName({ ...c.name, ar: e.target.value })} /></label>
            </div>
            <button className="btn primary" style={{ width: '100%', marginTop: 'var(--s4)' }} onClick={() => setCountryEdit(null)}>{t.done}</button>
          </Sheet>
        );
      })()}
      {player && (
        <Sheet label={t.editPlayer} onClose={() => setPlayerId(null)}>
          <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s3)' }}>{t.editPlayer}</h2>
          <div className="g-form">
            <label><span className="over">{t.nameEn}</span><input className="g-input" dir="ltr" maxLength={40} value={player.name.en} onChange={(e) => editPlayer(player.id, { name: { ...player.name, en: e.target.value } })} /></label>
            <label><span className="over">{t.nameAr}</span><input className="g-input" dir="rtl" maxLength={40} value={player.name.ar} onChange={(e) => editPlayer(player.id, { name: { ...player.name, ar: e.target.value } })} /></label>
            <div className="g-filters">
              <label><span className="over">{t.player.position}</span>
                <select className="g-input" value={player.position} onChange={(e) => editPlayer(player.id, { position: e.target.value as Position })}>
                  {POSITIONS.map((x) => <option key={x} value={x}>{x} · {t.pos[x]}</option>)}
                </select>
              </label>
              <label><span className="over">{t.player.nation}</span><input className="g-input" dir="ltr" maxLength={3} value={player.nationality} onChange={(e) => editPlayer(player.id, { nationality: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} /></label>
            </div>
            <div className="g-setrow"><span className="over">{t.player.age}</span><Stepper value={season - player.birthYear} step={1} min={15} max={45} format={String} onChange={(v) => editPlayer(player.id, { birthYear: season - v })} /></div>
            <div className="g-setrow"><span className="over">{t.player.rating}</span><Stepper value={player.rating} step={1} min={30} max={99} format={String} onChange={(v) => editPlayer(player.id, { rating: v })} /></div>
            <div className="g-setrow"><span className="over">{t.player.potential}</span><Stepper value={player.potential} step={1} min={player.rating} max={99} format={String} onChange={(v) => editPlayer(player.id, { potential: v })} /></div>
            {player.clubId !== FREE_AGENT && (
              <div className="g-setrow"><span className="over">{t.player.shirt}</span><Stepper value={player.shirtNumber} step={1} min={1} max={99} format={String} onChange={(v) => editPlayer(player.id, { shirtNumber: v })} /></div>
            )}
            <small className="muted">{t.player.value}: {money(player.marketValue)}</small>
            <label><span className="over">{t.moveToClub}</span>
              <select className="g-input" value={player.clubId} onChange={(e) => moveTo(player, e.target.value)}>
                <option value={FREE_AGENT}>{t.freeAgents}</option>
                {draft.leagues.map((l) => (
                  <optgroup key={l.id} label={l.name[lang]}>
                    {draft.clubs.filter((c) => c.leagueId === l.id).map((c) => <option key={c.id} value={c.id}>{c.name[lang]}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
          <button className="btn primary" style={{ width: '100%', marginTop: 'var(--s4)' }} onClick={() => setPlayerId(null)}>{t.done}</button>
        </Sheet>
      )}
    </>
  );
}

// Stepper steps that fit the amount: 10% rounded to a clean number.
function step(v: number) {
  const s = Math.max(10_000, v / 10);
  const p = 10 ** Math.floor(Math.log10(s));
  return Math.round(s / p) * p;
}

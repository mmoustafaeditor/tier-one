// The Gaffer v2. App owns the game state and is the only place that changes it: screens hand it Commands
// (sim/commands.ts) and clock requests (sim/clock.ts); App dispatches, tidies, saves to the active slot and re-renders.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UI, dataLang, type UiLang } from './i18n';
import { X } from './lang-v2-all';
import { loadPrefs, savePrefs, type Prefs } from './sim/prefs';
import type { Career } from './model/types';
import { dispatch, type Command, type Result } from './sim/commands';
import { advance, endOfSeason, finishSeason, simUntil } from './sim/clock';
import { decisions, type Choice, type Decision } from './sim/decisions';
import { nextUserMatch, seasonOver, type SeasonSummary } from './sim/season';
import { staffPrep } from './sim/staff';
import { store, tidyCareer, parseSave, metaOf } from './sim/save';
import { listSlots, migrate, clearSlot, setActiveSlot, freeSlot, FREE_SLOTS } from './sim/slots';
import type { World } from './sim/world';
import type { LiveMatch } from './sim/match';
import type { Aftermath } from './sim/aftermath';
import { backupToShell } from './update';
import { GameCtx, type Game, type Route, type SheetReq } from './ui2/game';
import { Shell, Toast, type Tab } from './ui2/shell';
import { Title, type SlotView } from './ui2/Title';
import { NewCareer } from './ui2/NewCareer';
import { Today } from './ui2/Today';
import { SquadScreen } from './ui2/Squad';
import { PlayerScreen } from './ui2/Player';
import { MatchScreen } from './ui2/Match';
import { PreMatch } from './ui2/PreMatch';
import { LiveScreen } from './ui2/Live';
import { FullTime } from './ui2/FullTime';
import { Digest } from './ui2/Digest';
import { TransfersScreen } from './ui2/Transfers';
import { OfficeScreen } from './ui2/Office';
import { CareerScreen } from './ui2/Career';
import { PassScreen } from './ui2/Pass';
import { SettingsScreen } from './ui2/Settings';
import { NewsScreen } from './ui2/News';
import { TrainingScreen } from './ui2/Training';
import { QuickMatch } from './ui2/QuickMatch';
import { Sheets } from './ui2/Sheets';
import { UpdateBanner } from './ui2/UpdateBanner';
import { OfficeBarInner } from './ui2/OfficeBar';
import { RoomScreen } from './ui2/Room';
import { D } from './lang-dressing-all';

type Top = { s: 'title' } | { s: 'new'; slot: number } | { s: 'quick' };
const TAB_OF: Partial<Record<Route['s'], Tab>> = {
  today: 'today', squad: 'squad', player: 'squad', train: 'squad', match: 'match', transfers: 'transfers', club: 'club', settings: 'club', news: 'today', career: 'career', pass: 'pass', world: 'club', room: 'squad',
};
const SOLO = new Set<Route['s']>(['pre', 'live', 'ft', 'digest']);

export function App() {
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const setPrefs = (p: Prefs) => { setPrefsState(p); savePrefs(p); };
  const ui: UiLang = prefs.lang;
  const t = UI[ui];
  const x = X[ui];
  const lang = dataLang(ui);
  const rtl = ui === 'ar';

  const [slots, setSlots] = useState<SlotView[] | null>(null);
  const [slot, setSlot] = useState(1);
  const [world, setWorld] = useState<World | null>(null);
  const [career, setCareer] = useState<Career | null>(null);
  const cur = useRef<{ w: World | null; c: Career | null }>({ w: null, c: null });
  const [top, setTop] = useState<Top | null>({ s: 'title' });
  const [route, setRoute] = useState<Route>({ s: 'today' });
  const [sheet, setSheet] = useState<SheetReq | null>(null);
  const [toastText, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<LiveMatch | null>(null);
  const [locked, setLocked] = useState(false);
  const [after, setAfter] = useState<Aftermath | null>(null);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [undo, setUndo] = useState<{ id: string; w: World; c: Career } | null>(null);
  const [badSave, setBadSave] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = ui; html.dir = rtl ? 'rtl' : 'ltr';
  }, [ui, rtl]);
  useEffect(() => {
    document.documentElement.dataset.light = top === null && SOLO.has(route.s) ? 'flood' : '';
  }, [top, route.s]);
  useEffect(() => { if (!toastText) return; const id = setTimeout(() => setToast(''), 2800); return () => clearTimeout(id); }, [toastText]);
  useEffect(() => { window.scrollTo(0, 0); }, [route.s, top?.s]);
  // Club colours drive crests, tokens and the identity stripe.
  useEffect(() => {
    const club = world && career ? world.clubs.find((c) => c.id === career.clubId) : null;
    const s = document.documentElement.style;
    if (club) { s.setProperty('--club-1', club.colors[0]); s.setProperty('--club-2', club.colors[1]); }
  }, [world, career?.clubId]);

  // ---------- slots ----------
  const refreshSlots = useCallback(async () => {
    const recs = await listSlots();
    const out: SlotView[] = [];
    for (let n = 1; n <= FREE_SLOTS; n++) {
      const r = recs.find((x) => x.slot === n);
      if (!r) { out.push({ slot: n, meta: null }); continue; }
      if (r.meta) { out.push({ slot: n, meta: r.meta }); continue; }
      // A save from before v2 (migrated into its slot without a description): open it once to describe it.
      const p = await parseSave(r.text);
      if (p.ok && p.save.career) out.push({ slot: n, meta: metaOf(p.save.world as World, p.save.career, n) ?? null, legacy: true });
      else { out.push({ slot: n, meta: null, bad: true }); setBadSave(true); }
    }
    setSlots(out);
  }, []);
  useEffect(() => { void migrate().then(refreshSlots); }, [refreshSlots]);

  // ---------- saving ----------
  const chain = useRef(Promise.resolve());
  const commit = useCallback(async (w: World, c: Career) => {
    const tidy = tidyCareer(w, c);
    cur.current = { w, c: tidy };
    setWorld(w); setCareer(tidy);
    const job = chain.current.then(async () => {
      const r = await store(w, tidy, slot);
      if (!r.ok) setToast(r.reason === 'storage' ? t.saveFailed : t.saveRefused(r.reason));
      else backupToShell();
    });
    chain.current = job.catch(() => undefined);
    await job;
  }, [slot, t]);

  const noteText = (n: NonNullable<Extract<Result, { ok: true }>['note']>, w: World): string => {
    const p = n.s ? w.players.find((q) => q.id === n.s) : undefined;
    const pn = p ? p.name[lang] : '';
    const N = x.note;
    switch (n.key) {
      case 'signed': return N.signed(pn); case 'sold': return N.sold(pn); case 'renewed': return N.renewed(pn);
      case 'loanedIn': return N.loanedIn(pn); case 'loanedOut': return N.loanedOut(pn); case 'counterOk': return N.counterOk; case 'counterNo': return N.counterNo;
      case 'dr.talk': return D[ui].note.talk; case 'dr.stays': return D[ui].note.stays(pn); case 'dr.clauseGo': return D[ui].note.clauseGo(pn);
      case 'haggleOk': return N.haggleOk; case 'haggleNo': return N.haggleNo; case 'rightsSold': return N.rightsSold(String(n.n)); case 'scoutFound': return N.scoutFound(n.n ?? 0);
      default: return N.done;
    }
  };

  const run = useCallback(async (cmd: Command, opt?: { toast?: string | false; quiet?: boolean }): Promise<Result> => {
    const { w, c } = cur.current;
    if (!w || !c) return { ok: false, reason: 'noCareer' };
    const r = dispatch(w, c, cmd);
    if (!r.ok) {
      if (opt?.toast !== false) setToast(`${x.note.refused} ${x.bid.no[r.reason] ?? D[ui].no[r.reason] ?? r.reason}`);
      return r;
    }
    await commit(r.world, r.career);
    if (typeof opt?.toast === 'string') setToast(opt.toast);
    else if (opt?.toast !== false && r.note) setToast(noteText(r.note, r.world));
    return r;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, x, lang]);

  // ---------- starting and loading ----------
  const openSlot = async (n: number) => {
    const recs = await listSlots();
    const rec = recs.find((r) => r.slot === n);
    if (!rec) return;
    setBusy(true);
    const p = await parseSave(rec.text);
    setBusy(false);
    if (!p.ok || !p.save.career) { setBadSave(true); setToast(x.set.importBad); return; }
    setSlot(n); setActiveSlot(n);
    const w = p.save.world as World, c = p.save.career;
    cur.current = { w, c };
    setWorld(w); setCareer(c); setTop(null);
    if (c.live) { setLive(c.live); setLocked(false); setRoute({ s: 'live' }); setToast(x.live.resumed(c.live.minute)); }
    else setRoute({ s: 'today' });
  };
  const started = async (w: World, c: Career, n: number) => {
    setSlot(n); setActiveSlot(n);
    cur.current = { w, c };
    setWorld(w); setCareer(c);
    const r = await store(w, c, n);
    if (!r.ok) setToast(r.reason === 'storage' ? t.saveFailed : t.saveRefused(r.reason));
    else backupToShell();
    setTop(null); setRoute({ s: 'today' });
    void refreshSlots();
  };
  const toTitle = () => { setTop({ s: 'title' }); void refreshSlots(); };

  // ---------- the clock ----------
  const paint = () => new Promise<void>((done) => requestAnimationFrame(() => setTimeout(done, 0)));
  const stopFor = (w: World, c: Career): string | null => {
    const ds = decisions(w, c);
    const level = prefs.stop ?? 1;
    if (ds.some((d) => level === 0 || d.score >= 60)) return 'decision';
    if (!nextUserMatch(w, c)) return 'season';
    return null;
  };
  const play = async (mode: 'live' | 'quick' | 'sim') => {
    const { w, c } = cur.current;
    if (!w || !c || busy) return;
    setBusy(true);
    await paint();
    if (mode === 'live') {
      const prep = staffPrep(w, c, nextUserMatch(w, c));
      const m = nextUserMatch(prep.world, prep.career);
      if (m) {
        await commit(prep.world, { ...prep.career, live: m });
        setLive(m); setLocked(false); setRoute({ s: 'live' });
      }
    } else if (mode === 'quick') {
      const s = advance(w, c);
      await commit(s.world, s.career);
      if (s.after) { setAfter(s.after); setRoute({ s: 'ft' }); } else setRoute({ s: 'today' });
    } else {
      const s = simUntil(w, c, stopFor, 8);
      await commit(s.world, s.career);
      setRoute({ s: 'digest' });
    }
    setBusy(false);
  };
  const finishLive = async (m: LiveMatch) => {
    const { w, c } = cur.current;
    if (!w || !c) return;
    setBusy(true);
    await paint();
    const s = advance(w, { ...c, live: null }, m);
    await commit(s.world, s.career);
    setLive(null);
    setBusy(false);
    if (s.after) { setAfter(s.after); setRoute({ s: 'ft' }); } else setRoute({ s: 'today' });
  };
  const saveLive = async (m: LiveMatch) => { setLive(m); await run({ type: 'match.save', live: m }, { toast: false }); };
  const cont = async () => {
    const { w, c } = cur.current;
    if (!w || !c || busy) return;
    if (c.live) { setLive(c.live); setLocked(false); setRoute({ s: 'live' }); return; }
    if (c.sacked) { setRoute({ s: 'career' }); return; }
    if (decisions(w, c).length && sheet?.k !== 'desk') { setSheet({ k: 'desk' }); return; }
    setSheet(null);
    if (nextUserMatch(w, c)) { setRoute({ s: 'pre' }); return; }
    setBusy(true);
    await paint();
    if (!seasonOver(c)) { const f = finishSeason(w, c); await commit(f.world, f.career); }
    const cc = cur.current;
    const e = endOfSeason(cc.w!, cc.c!);
    await commit(e.world, e.career);
    setSummary(e.summary);
    setBusy(false);
  };
  const takeStaffCalls = async () => {
    const { w, c } = cur.current;
    if (!w || !c) return;
    let ww = w, cc = c;
    for (const d of decisions(w, c)) {
      const ch = d.choices.find((q) => q.pick);
      for (const cmd of ch?.cmds ?? []) { const r = dispatch(ww, cc, cmd, d.role ?? 'me'); if (r.ok) { ww = r.world; cc = r.career; } }
      const r = dispatch(ww, cc, { type: 'decision.done', id: d.id }); if (r.ok) { ww = r.world; cc = r.career; }
    }
    await commit(ww, cc);
  };
  const leaveAll = async () => {
    const { w, c } = cur.current;
    if (!w || !c) return;
    let cc = c;
    for (const d of decisions(w, c)) { const r = dispatch(w, cc, d.pending ? { type: 'pending.decline', id: d.pending } : { type: 'decision.done', id: d.id }); if (r.ok) cc = r.career; }
    await commit(w, cc);
  };
  const resolve = async (d: Decision, ch: Choice): Promise<boolean> => {
    const { w, c } = cur.current;
    if (!w || !c) return false;
    let ww = w, cc = c;
    for (const cmd of ch.cmds) {
      const r = dispatch(ww, cc, cmd);
      if (!r.ok) { setToast(`${x.note.refused} ${x.bid.no[r.reason] ?? D[ui].no[r.reason] ?? r.reason}`); return false; }
      ww = r.world; cc = r.career;
    }
    const r = dispatch(ww, cc, { type: 'decision.done', id: d.id });
    if (r.ok) { ww = r.world; cc = r.career; }
    setUndo({ id: d.id, w, c });
    await commit(ww, cc);
    if (ch.open) { const o = ch.open; setRoute(o.to === 'transfers' ? { s: 'transfers' } : o.to === 'tactics' ? { s: 'match', tab: 0 } : { s: 'today' }); }
    return true;
  };
  const doUndo = async () => { if (undo) { await commit(undo.w, undo.c); setUndo(null); } };

  // ---------- Android back / Escape ----------
  useEffect(() => {
    (window as unknown as { __gafferBack?: () => string }).__gafferBack = () => {
      const scrims = document.querySelectorAll<HTMLElement>('.scrim');
      if (scrims.length) { scrims[scrims.length - 1].click(); return 'back'; }
      if (top) { if (top.s !== 'title') { setTop({ s: 'title' }); return 'back'; } return 'exit'; }
      if (route.s === 'live') return 'stay';
      if (route.s !== 'today') { setRoute({ s: 'today' }); return 'back'; }
      return 'exit';
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const scrims = document.querySelectorAll<HTMLElement>('.scrim');
      if (scrims.length) { e.preventDefault(); scrims[scrims.length - 1].click(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [top, route.s]);

  const club = world && career ? world.clubs.find((c) => c.id === career.clubId) : undefined;
  const league = world && club ? world.leagues.find((l) => l.id === club.leagueId) : undefined;
  const openCount = useMemo(() => (world && career ? decisions(world, career).length : 0), [world, career]);

  const game: Game | null = world && career && club && league ? {
    w: world, c: career, t, x, lang, ui, rtl, club, league, busy,
    run, go: (r) => { setSheet(null); setRoute(r); }, player: (id) => { setSheet(null); setRoute({ s: 'player', id }); }, toast: setToast, sheet: setSheet,
    play: (m) => void play(m), cont: () => void cont(),
  } : null;

  // ---------- title, new career, quick match ----------
  if (top || !game) {
    const langBtn = { ui, onLang: (l: UiLang) => setPrefs({ ...prefs, lang: l }) };
    return (
      <>
        {(!top || top.s === 'title') && (
          <Title t={t} x={x} slots={slots} bad={badSave} busy={busy} {...langBtn}
            onOpen={(n) => void openSlot(n)} onQuick={() => setTop({ s: 'quick' })}
            onNew={async (replace) => {
              const n = replace ?? (await freeSlot());
              if (n === null) return;
              if (replace) await clearSlot(replace);
              setTop({ s: 'new', slot: n });
            }} />
        )}
        {top?.s === 'new' && <NewCareer t={t} x={x} ui={ui} slot={top.slot} onBack={toTitle} onStart={(w, c) => void started(w, c, top.slot)} />}
        {top?.s === 'quick' && <QuickMatch t={t} x={x} ui={ui} onExit={toTitle} />}
        {toastText && <Toast text={toastText} />}
        <UpdateBanner t={t} />
      </>
    );
  }

  const tab = TAB_OF[route.s] ?? null;
  const solo = SOLO.has(route.s);
  const labels = x.nav as Record<Tab, string>;
  return (
    <GameCtx.Provider value={game}>
      <Shell tab={tab} club={club} labels={labels} solo={solo} badge={{ today: openCount }}
        onTab={(tb) => { setSheet(null); setRoute(tb === 'today' ? { s: 'today' } : tb === 'squad' ? { s: 'squad' } : tb === 'match' ? { s: 'match', tab: 0 } : tb === 'transfers' ? { s: 'transfers' } : tb === 'club' ? { s: 'club' } : tb === 'career' ? { s: 'career' } : { s: 'pass' }); }}>
        {!solo && <OfficeBarInner openCount={openCount} />}
        {route.s === 'today' && <Today onResolve={resolve} onUndo={() => void doUndo()} canUndo={undo?.id ?? null} />}
        {route.s === 'squad' && <SquadScreen lens={route.lens} />}
        {route.s === 'player' && <PlayerScreen id={route.id} />}
        {route.s === 'train' && <TrainingScreen />}
        {route.s === 'match' && <MatchScreen tab={route.tab ?? 0} onTab={(n) => setRoute({ s: 'match', tab: n })} />}
        {route.s === 'pre' && <PreMatch />}
        {route.s === 'live' && live && <LiveScreen m={live} locked={locked} speed0={prefs.speed} onUpdate={setLive} onSave={(m) => void saveLive(m)} onFinish={(m) => void finishLive(m)} />}
        {route.s === 'ft' && after && <FullTime a={after} onDone={() => { setAfter(null); setRoute({ s: 'today' }); }} />}
        {route.s === 'digest' && <Digest onDone={() => setRoute({ s: 'today' })} />}
        {route.s === 'transfers' && <TransfersScreen tab={route.tab ?? 0} onTab={(n) => setRoute({ s: 'transfers', tab: n })} />}
        {route.s === 'club' && <OfficeScreen tab={route.tab ?? 0} onTab={(n) => setRoute({ s: 'club', tab: n })} />}
        {route.s === 'career' && <CareerScreen />}
        {route.s === 'pass' && <PassScreen prefs={prefs} onPrefs={setPrefs} />}
        {route.s === 'settings' && <SettingsScreen prefs={prefs} onPrefs={setPrefs} onTitle={toTitle} slot={slot}
          onDelete={async () => { await clearSlot(slot); setWorld(null); setCareer(null); cur.current = { w: null, c: null }; toTitle(); }}
          onImported={async (w, c) => { await commit(w, c); setRoute({ s: 'today' }); setToast(x.set.importOk); }} />}
        {route.s === 'news' && <NewsScreen />}
        {route.s === 'room' && <RoomScreen />}
      </Shell>
      <Sheets req={sheet} onClose={() => setSheet(null)} summary={summary} onSummaryDone={() => setSummary(null)}
        onTakeCalls={async () => { await takeStaffCalls(); setSheet(null); void cont(); }} onLeave={async () => { await leaveAll(); setSheet(null); void cont(); }} />
      {toastText && <Toast text={toastText} />}
      {route.s !== 'live' && <UpdateBanner t={t} />}
    </GameCtx.Provider>
  );
}


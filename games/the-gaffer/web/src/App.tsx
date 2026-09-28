import { useEffect, useMemo, useRef, useState } from 'react';
import { UI, dataLang, type Lang, type UiLang } from './i18n';
import { loadPrefs, savePrefs, type Prefs } from './sim/prefs';
import { Settings, TextPage } from './ui/Settings';
import { WorldEditor } from './ui/WorldEditor';
import { QuickMatch } from './ui/QuickMatch';
import { COUNTRIES, leaguesOf } from './data/leagues';
import type { Career, Club, CountryCode, League, Player, SaveFile } from './model/types';
import {
  endSeason, seasonOver, newCareer, nextUserMatch, playDay, type LiveMatch, type SeasonSummary,
} from './sim/season';
import {
  FIRST_SEASON, clubsOf, generateWorld, money, playerOf, objectiveOf, sortSquad, squadOf, starsOf, strengthOf, wageBill, type World,
} from './sim/world';
import { clearStored, loadStored, store } from './sim/save';
import { Kit } from './components/Kit';
import { AppBar, Empty, GROUP, Icon, PlayerRow, Stars, Stat } from './ui/parts';
import { PlayerSheet } from './ui/PlayerSheet';
import { BidSheet, OffersSheet, RenewSheet, SaveSheet } from './ui/Deals';
import { setListed } from './sim/transfers';
import { DEFAULT_TACTICS, fmt } from './sim/tactics';
import { Tactics } from './ui/Tactics';
import { Live } from './ui/Live';
import { Inbox } from './ui/Inbox';
import { CoachScreen } from './ui/CoachScreen';
import { ClubScreen } from './ui/ClubScreen';
import { Rankings } from './ui/Rankings';
import { News } from './ui/News';
import { AcademyScreen, HospitalScreen, TrainingScreen } from './ui/Development';
import { EditName, renameIn, type NameTarget } from './ui/EditName';
import { moveTo } from './sim/coach';
import { Home, type Go } from './ui/Home';
import { MatchHub } from './ui/MatchHub';
import { Transfers } from './ui/Transfers';
import { ClubHub, type ClubDoor } from './ui/ClubHub';
import { StaffRoom } from './ui/StaffRoom';
import { History } from './ui/History';
import { FullTime } from './ui/FullTime';
import { SupportCard, applyLook } from './ui/Support';
import { ICONS } from './ui/icons';
import { aftermath, type Aftermath } from './sim/aftermath';
import { staffPrep } from './sim/staff';
import { checkPurchase, loadAds } from './monet';
import { avgRating } from './sim/ratings';
import { UpdateBanner } from './ui/UpdateBanner';
import { backupToShell } from './update';
import gearIcon from '../../../../design/assets/icons/ui/gear.svg?raw';
import homeIcon from '../../../../design/assets/icons/ui/home.svg?raw';
import friendsIcon from '../../../../design/assets/icons/ui/friends.svg?raw';
import playIcon from '../../../../design/assets/icons/ui/play.svg?raw';
import globeIcon from '../../../../design/assets/icons/ui/globe.svg?raw';
import sembaLogo from '../../../../design/assets/logos/semba-logo-192.png';

type Screen =
  | { id: 'home' }
  | { id: 'country' }
  | { id: 'league'; country: CountryCode }
  | { id: 'clubs'; league: string }
  | { id: 'confirm'; club: string }
  | { id: 'squad' }
  | { id: 'match' }
  | { id: 'live' }
  | { id: 'transfers' }
  | { id: 'tactics' }
  | { id: 'inbox' }
  | { id: 'club' }
  | { id: 'finances'; tab: number }
  | { id: 'staff' }
  | { id: 'history' }
  | { id: 'rankings' }
  | { id: 'news' }
  | { id: 'training' }
  | { id: 'hospital' }
  | { id: 'academy' }
  | { id: 'coach' }
  | { id: 'more' }
  | { id: 'settings' }
  | { id: 'howto' }
  | { id: 'privacy' }
  | { id: 'editor' }
  | { id: 'quick' };

const SEMBA_URL = 'https://sembagames.app';
const TAB_SCREENS: Screen['id'][] = ['home', 'squad', 'match', 'transfers', 'club'];
const HUBS: Screen['id'][] = TAB_SCREENS;
// Interface languages that are ready; the globe button cycles through them.
const READY: UiLang[] = ['en', 'ar', 'es', 'fr'];
const nextLang = (l: UiLang) => READY[(READY.indexOf(l) + 1) % READY.length];
const newSeed = () => (Math.random() * 2 ** 31) >>> 0;

export function App() {
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const setPrefs = (p: Prefs) => { setPrefsState(p); savePrefs(p); };
  const lang: Lang = dataLang(prefs.lang);
  const setLang = (l: UiLang) => setPrefs({ ...prefs, lang: l });
  const [screen, setScreen] = useState<Screen>({ id: 'home' });
  const [picked, setPicked] = useState<League | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [career, setCareer] = useState<Career | null>(null);
  const [draft, setDraft] = useState<{ world: World; seed: number } | null>(null);
  const [saved, setSaved] = useState<{ world: World; career: Career } | null>(null);
  const [badSave, setBadSave] = useState(false);
  const [managerName, setManagerName] = useState('');
  const [managerAge, setManagerAge] = useState('35');
  const [managerNation, setManagerNation] = useState('');
  const [managerNation2, setManagerNation2] = useState('');
  const [clubQuery, setClubQuery] = useState('');
  const [tacticsBack, setTacticsBack] = useState<'match' | 'squad'>('match');
  const [naming, setNaming] = useState<NameTarget | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [askReset, setAskReset] = useState(false);
  const [group, setGroup] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<LiveMatch | null>(null);
  const [liveLocked, setLiveLocked] = useState(false);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [matchTab, setMatchTab] = useState(0);
  const [trTab, setTrTab] = useState(0);
  const [squadView, setSquadView] = useState(0);
  const [ft, setFt] = useState<Aftermath | null>(null);
  const [bid, setBid] = useState<Player | null>(null);
  const [renewing, setRenewing] = useState<Player | null>(null);
  const [showOffers, setShowOffers] = useState(false);
  const [saveMode, setSaveMode] = useState<'export' | 'import' | null>(null);
  const [toast, setToast] = useState('');
  const [squadSort, setSquadSort] = useState(0);
  const t = UI[prefs.lang];

  useEffect(() => {
    const html = document.documentElement;
    html.lang = prefs.lang;
    html.dir = prefs.lang === 'ar' ? 'rtl' : 'ltr';
  }, [prefs.lang]);
  // Club look (Supporter pack) and web ads (only when configured, never for supporters).
  useEffect(() => { applyLook(prefs); loadAds(prefs.supporter); }, [prefs.look, prefs.supporter]);
  // Back from a Stripe payment: our server confirms it before anything unlocks.
  useEffect(() => {
    checkPurchase(prefs.paid ?? []).then((r) => {
      if (!r) return;
      const p = loadPrefs();
      setPrefs({ ...p, paid: [...(p.paid ?? []), r.session], ...(r.ok ? { supporter: true } : {}) });
      if (r.ok) setToast(UI[p.lang].supportThanks);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Look for a saved career once. A save that fails its checksum or world check is refused (E2E #41), and we say so.
  useEffect(() => {
    loadStored().then((r) => {
      if (r.ok && r.save.career) setSaved({ world: r.save.world, career: r.save.career });
      else if (!r.ok && r.reason !== 'none') setBadSave(true);
    });
  }, []);

  useEffect(() => {
    // Keep this effect setup strictly void. React treats any returned value as an effect cleanup,
    // and Android WebView may expose a non-void return from scrollTo().
    window.scrollTo(0, 0);
  }, [screen.id]);

  // Android back button (android/…/MainActivity asks the page): close the open sheet, else press the screen's own
  // back arrow, else go to the home tab; 'exit' only from home.
  useEffect(() => {
    (window as unknown as { __gafferBack?: () => string }).__gafferBack = () => {
      const scrims = document.querySelectorAll<HTMLElement>('.scrim');
      if (scrims.length) { scrims[scrims.length - 1].click(); return 'back'; }
      const arrow = document.querySelector<HTMLElement>('.appbar > button.iconbtn:first-child');
      if (arrow) { arrow.click(); return 'back'; }
      if (screen.id === 'live') return 'stay';
      if (screen.id !== 'home') { setScreen({ id: 'home' }); return 'back'; }
      return 'exit';
    };
  }, [screen.id]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  // Deals and renewals: save, close the sheets, keep the open player sheet in sync.
  const afterDeal = async (w: World, c: Career, message: string) => {
    await commit(w, c);
    setBid(null);
    setRenewing(null);
    if (player) setPlayer(w.players.find((p) => p.id === player.id) ?? null);
    if (message) { setToast(message); setPlayer(null); }
    if (!c.offers.length) setShowOffers(false);
  };

  // Saves after every change; the match is stored BEFORE it is shown, so leaving mid-match can't re-roll it.
  const commit = async (w: World, c: Career) => {
    setWorld(w);
    setCareer(c);
    setSaved({ world: w, career: c });
    if (!(await store(w, c))) setToast(t.saveFailed);
    else backupToShell();
  };

  // Live: the match is stored at kick-off (and at half-time and after changes), and only counted at full time.
  // Quick result: the whole matchday is played and saved before the score is shown.
  const commitMsg = async (w: World, c: Career, msg?: string) => { await commit(w, c); if (msg) setToast(msg); };

  // Quick results are counted before they're shown; this keeps the before/after for the full-time card.
  const [pending, setPending] = useState<Aftermath | null>(null);
  const playNext = async (watch: boolean) => {
    if (!world || !career || busy) return;
    setBusy(true);
    // Delegated duties (line-up, tactics, opponent report) are done right before kick-off.
    const prep = staffPrep(world, career, nextUserMatch(world, career));
    if (watch) {
      const m = nextUserMatch(prep.world, prep.career);
      if (m) {
        await commit(prep.world, { ...prep.career, live: m });
        setLive(m);
        setLiveLocked(false);
        setScreen({ id: 'live' });
      }
    } else {
      const { world: nw, career: next, mine } = playDay(prep.world, prep.career);
      await commit(nw, next);
      if (mine) { setPending(aftermath(prep.world, prep.career, nw, next, mine)); setLive(mine); setLiveLocked(true); setScreen({ id: 'live' }); }
    }
    setBusy(false);
  };

  const finishMatch = async () => {
    if (!world || !career || !live) return;
    if (!liveLocked) {
      const { world: nw, career: next } = playDay(world, career, live);
      await commit(nw, next);
      setFt(aftermath(world, career, nw, next, live));
    } else setFt(pending);
    setPending(null);
    setLive(null);
    setScreen({ id: 'home' });
  };

  // After the user's league ends, the other leagues still have matchdays to play.
  // Plays the other leagues' remaining matchdays, then shows the season review on the home screen.
  const finishSeason = async () => {
    if (!world || !career || busy) return;
    setBusy(true);
    let c = career, w = world;
    while (!seasonOver(c) && !c.sacked) ({ world: w, career: c } = playDay(w, c));
    await commit(w, c);
    setBusy(false);
    setScreen({ id: 'home' });
  };

  const startNextSeason = async () => {
    if (!world || !career || busy) return;
    setBusy(true);
    const e = endSeason(world, career);
    await commit(e.world, e.career);
    setSummary(e.summary);
    setBusy(false);
  };

  const myClub = world && career ? world.clubs.find((c) => c.id === career.clubId)! : null;
  const myLeague = world && myClub ? world.leagues.find((l) => l.id === myClub.leagueId)! : null;
  const draftWorld = draft?.world ?? null;
  const clubName = (c: Club) => c.name[lang];
  const matchLabel = (m: LiveMatch) => {
    // From the match itself: after a quick result the career has already moved on to the next matchday.
    if (!m.cup || !career) return t.matchday(m.round + 1);
    const cup = career.cups[m.cup];
    const gd = cup.groups?.days.indexOf(m.round) ?? -1;
    if (m.group && gd >= 0) return `${cup.name[lang]} · ${t.groupDay(gd + 1)}`;
    return `${cup.name[lang]} · ${t.roundName(cup.days.indexOf(m.round), cup.days.length)}`;
  };


  const startNewCareer = () => {
    // A fresh world per new career; it only becomes the saved world when the contract is signed.
    const seed = newSeed();
    setDraft({ world: generateWorld(seed), seed });
    setPicked(null);
    setScreen({ id: 'country' });
  };

  // Coach age: 20-80, said in the game's own words, never silently changed (E2E #55).
  const ageOk = /^\d+$/.test(managerAge) && Number(managerAge) >= 20 && Number(managerAge) <= 80;

  const signContract = async (club: Club, nationality: string) => {
    if (!draft || busy) return;
    setBusy(true);
    const c = newCareer(draft.world, draft.seed, club.id, managerName.trim() || t.managerDefault, { age: Number(managerAge), nationality, ...(managerNation2 && managerNation2 !== nationality ? { nationality2: managerNation2 } : {}) }, FIRST_SEASON);
    await store(draft.world, c);
    setWorld(draft.world);
    setCareer(c);
    setSaved({ world: draft.world, career: c });
    setBadSave(false);
    setDraft(null);
    setBusy(false);
    setScreen({ id: 'home' });
  };

  const continueCareer = () => {
    if (!saved) return;
    setWorld(saved.world);
    setCareer(saved.career);
    // A match that was being played when the app closed picks up where it stopped.
    if (saved.career.live) { setLive(saved.career.live); setLiveLocked(false); setScreen({ id: 'live' }); }
    else setScreen({ id: 'home' });
  };

  const resetCareer = () => {
    clearStored();
    setWorld(null);
    setCareer(null);
    setSaved(null);
    setAskReset(false);
    setScreen({ id: 'home' });
  };

  const squad = useMemo(() => {
    if (!world || !career) return [];
    const sq = sortSquad(squadOf(world, career.clubId));
    const key: ((p: Player) => number)[] = [() => 0, (p) => p.rating, (p) => p.marketValue, (p) => p.wage, (p) => -(career.season - p.birthYear), (p) => p.fitness];
    return squadSort ? [...sq].sort((a, b) => key[squadSort](b) - key[squadSort](a)) : sq;
  }, [world, career, squadSort]);

  // Loading a save from a file: same checks as the stored one, then it becomes the stored career.
  const loadSave = async (s: SaveFile) => {
    if (!s.career) return;
    await commit(s.world, s.career);
    setSaveMode(null);
    setToast(t.importOk);
    setScreen({ id: 'home' });
  };
  const resumeLive = () => { if (career?.live) { setLive(career.live); setLiveLocked(false); setScreen({ id: 'live' }); } };
  const goFromHome = (g: Go) => {
    switch (g) {
      case 'offers': setShowOffers(true); break;
      case 'contracts': setSquadView(2); setScreen({ id: 'squad' }); break;
      case 'tactics': setTacticsBack('match'); setScreen({ id: 'tactics' }); break;
      case 'transfers': setTrTab(0); setScreen({ id: 'transfers' }); break;
      case 'sponsors': setScreen({ id: 'finances', tab: 2 }); break;
      case 'finances': setScreen({ id: 'finances', tab: 0 }); break;
      case 'match': setMatchTab(0); setScreen({ id: 'match' }); break;
      default: setScreen({ id: g } as Screen);
    }
  };
  const goFromClub = (d: ClubDoor) => {
    const tabs: Partial<Record<ClubDoor, number>> = { finances: 0, tickets: 1, sponsors: 2, facilities: 3, hire: 4 };
    if (tabs[d] !== undefined) setScreen({ id: 'finances', tab: tabs[d]! });
    else setScreen({ id: d } as Screen);
  };
  const onTab = Math.max(0, TAB_SCREENS.indexOf(screen.id));
  const hub = HUBS.includes(screen.id);
  // Screens reachable from more than one hub (News, Inbox, Career, Quick match) go back to the hub they were opened from.
  const lastHub = useRef<Screen['id']>('home');
  if (hub) lastHub.current = screen.id;
  const backToHub = () => setScreen({ id: lastHub.current } as Screen);

  return (
    <div className={`app${hub ? ' tabs' : ''}`}>
      {/* ---------- Home: title screen without a career, club hub with one ---------- */}
      {screen.id === 'home' && !career && (
        <>
          <div className="g-top">
            <span className="g-live">{t.live}</span>
            <LangButton lang={prefs.lang} label={t.lang} onClick={() => setLang(nextLang(prefs.lang))} />
          </div>
          <h1 className="wordmark lg">THE <b>GAFFER</b></h1>
          <p className="g-tagline">
            {t.tagline[0]} <b>{t.tagline[1]}</b>
          </p>
          {badSave && (
            <div className="banner warn" style={{ marginBottom: 'var(--s4)' }}>
              <span className="bic">⚠️</span>
              <div><b>{t.badSave}</b></div>
            </div>
          )}
          <section className="card g-hero">
            <div className="over">{t.heroOver}</div>
            <h2 className="d2">{t.heroTitle}</h2>
            <div className="g-leagues">
              {COUNTRIES.filter((c) => c.main).map((c) => (
                <span key={c.code} className="chip">{c.flag} {c.name[lang]}</span>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 0 }}>{t.heroBody}</p>
            <button className="btn primary xl" onClick={startNewCareer}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {t.newCareer}
                <span className="sub">{t.newCareerSub}</span>
              </span>
            </button>
          </section>

          <div className="sechead"><span className="over">{t.moreWays}</span></div>
          <div className="g-tiles">
            <button className="g-tile" disabled={!saved} onClick={continueCareer}>
              {saved ? <Kit colors={saved.world.clubs.find((c) => c.id === saved.career.clubId)!.colors} size="sm" /> : <span className="ico">📋</span>}
              <span className="d5">{t.continue}</span>
              <small>{saved ? clubName(saved.world.clubs.find((c) => c.id === saved.career.clubId)!) : t.continueSub}</small>
            </button>
            <button className="g-tile" disabled>
              <span className="ico">🏟️</span>
              <span className="d5">{t.friends}</span>
              <small>{t.friendsSub}</small>
            </button>
            <button className="g-tile" onClick={() => setScreen({ id: 'quick' })}>
              <span className="ico">⚽</span>
              <span className="d5">{t.quick}</span>
              <small>{t.quickSub}</small>
            </button>
          </div>
          <p className="g-foot">{t.foot}</p>
        </>
      )}

      {screen.id === 'home' && career && world && myClub && myLeague && (
        <Home world={world} career={career} lang={lang} t={t} ui={prefs.lang} myClub={myClub} myLeague={myLeague} busy={busy} matchLabel={matchLabel}
          langButton={<LangButton lang={prefs.lang} label={t.lang} onClick={() => setLang(nextLang(prefs.lang))} />}
          onGo={goFromHome} onPlay={() => (career.live ? resumeLive() : playNext(true))} onFinishSeason={finishSeason} onNextSeason={startNextSeason}
          onPlayer={(id) => { const p = playerOf(world, id); if (p) setPlayer(p); }} />
      )}

      {/* ---------- New career: country → league → club → contract ---------- */}
      {screen.id === 'country' && (
        <>
          <AppBar back={() => setScreen({ id: 'home' })} backLabel={t.back} title={t.chooseCountry} sub={t.newCareer} />
          <input className="g-input" style={{ width: '100%', marginTop: 'var(--s4)' }} placeholder={`🔍 ${t.searchClub}`} value={clubQuery} onChange={(e) => setClubQuery(e.target.value)} />
          {draftWorld && clubQuery.trim().length >= 2 && (
            <div className="list" style={{ marginTop: 'var(--s3)' }}>
              {draftWorld.clubs.filter((c) => c.name.en.toLowerCase().includes(clubQuery.trim().toLowerCase()) || c.name.ar.includes(clubQuery.trim())).slice(0, 12).map((c) => (
                <button key={c.id} className="cell" onClick={() => setScreen({ id: 'confirm', club: c.id })}>
                  <Kit colors={c.colors} size="sm" />
                  <span className="cmain"><b>{clubName(c)}</b><span>{draftWorld.leagues.find((l) => l.id === c.leagueId)!.name[lang]}</span></span>
                  <span className="g-rating num">{strengthOf(draftWorld, c.id)}</span>
                </button>
              ))}
            </div>
          )}
          {[true, false].map((main) => (
            <section key={String(main)}>
              <div className="sechead"><span className="over">{main ? t.mainLeagues : t.arabLeagues}</span></div>
              <div className="g-grid">
                {COUNTRIES.filter((c) => c.main === main).map((c) => (
                  <button key={c.code} className="g-pick" onClick={() => { setPicked(null); setScreen({ id: 'league', country: c.code }); }}>
                    <span className="flag">{c.flag}</span>
                    <span className="d5">{c.name[lang]}</span>
                    <small>{t.leagues(leaguesOf(c.code).length)}</small>
                    {c.main && <span className="tag g-main-tag">{t.main}</span>}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {screen.id === 'league' && (
        <>
          <AppBar back={() => setScreen({ id: 'country' })} backLabel={t.back} title={t.chooseLeague}
            sub={COUNTRIES.find((c) => c.code === screen.country)!.name[lang]} />
          <div className="sechead"><span className="over">{t.chooseLeague}</span></div>
          <div style={{ display: 'grid', gap: 'var(--s3)' }}>
            {leaguesOf(screen.country).map((l) => (
              <button key={l.id} className={`g-pick${picked?.id === l.id ? ' on' : ''}`} onClick={() => setPicked(l)}>
                <span className="d5">{l.name[lang]}</span>
                <small>{t.tier(l.tier)} · {t.clubs(l.clubs)}</small>
              </button>
            ))}
          </div>
          <div className="dock" style={{ position: 'fixed' }}>
            {!picked && <div className="hint">{t.soon}</div>}
            <button className="btn primary" disabled={!picked} onClick={() => picked && setScreen({ id: 'clubs', league: picked.id })}>{t.nextClub}</button>
          </div>
        </>
      )}

      {screen.id === 'clubs' && draftWorld && (
        <>
          <AppBar back={() => setScreen({ id: 'league', country: draftWorld.leagues.find((l) => l.id === screen.league)!.country })}
            backLabel={t.back} title={t.chooseClub} sub={draftWorld.leagues.find((l) => l.id === screen.league)!.name[lang]} />
          <p className="muted" style={{ margin: 'var(--s4) 0' }}>{t.pickClubHint}</p>
          <div className="list">
            {clubsOf(draftWorld, screen.league).map((c) => (
              <button key={c.id} className="cell" onClick={() => setScreen({ id: 'confirm', club: c.id })}>
                <Kit colors={c.colors} size="md" />
                <span className="cmain">
                  <b>{clubName(c)}</b>
                  <span><Stars n={starsOf(draftWorld, c)} /> · {t.budget} <span className="num ltr">{money(c.budget)}</span></span>
                </span>
                <span className="g-rating num">{strengthOf(draftWorld, c.id)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {screen.id === 'confirm' && draftWorld && (() => {
        const c = draftWorld.clubs.find((x) => x.id === screen.club)!;
        const lg = draftWorld.leagues.find((l) => l.id === c.leagueId)!;
        return (
          <>
            <AppBar back={() => setScreen({ id: 'clubs', league: c.leagueId })} backLabel={t.back} title={t.takeJob} sub={lg.name[lang]} />
            <section className="g-club" style={{ marginTop: 'var(--s5)' }}>
              <Kit colors={c.colors} size="lg" />
              <div>
                <div className="over">{t.season(FIRST_SEASON)}</div>
                <h1 className="d2">{clubName(c)}</h1>
                <Stars n={starsOf(draftWorld, c)} />
              </div>
            </section>
            <section className="card g-hero">
              <div className="over">{t.boardWants}</div>
              <h2 className="d2">{t.objective[objectiveOf(draftWorld, c)]}</h2>
              <div className="g-stats">
                <Stat label={t.strength} value={String(strengthOf(draftWorld, c.id))} />
                <Stat label={t.budget} value={money(c.budget)} />
                <Stat label={t.squadSize} value={String(squadOf(draftWorld, c.id).length)} />
              </div>
            </section>
            <div className="g-field">
              <label className="g-form">
                <span className="over">{t.managerName}</span>
                <input className="g-input" value={managerName} maxLength={24} placeholder={t.managerDefault} onChange={(e) => setManagerName(e.target.value)} />
              </label>
              <div className="g-filters">
                <label className="g-form">
                  <span className="over">{t.coachAge}</span>
                  <input className="g-input" type="number" inputMode="numeric" min={20} max={80} value={managerAge} onChange={(e) => setManagerAge(e.target.value)} />
                </label>
                <label className="g-form">
                  <span className="over">{t.coachNation}</span>
                  <select className="g-input g-select" value={managerNation || lg.country} onChange={(e) => setManagerNation(e.target.value)}>
                    {COUNTRIES.map((x) => <option key={x.code} value={x.code}>{x.flag} {x.name[lang]}</option>)}
                  </select>
                </label>
              </div>
              <label className="g-form">
                <span className="over">{t.coachNation2}</span>
                <select className="g-input g-select" value={managerNation2} onChange={(e) => setManagerNation2(e.target.value)}>
                  <option value="">{t.noneT}</option>
                  {COUNTRIES.filter((x) => x.code !== (managerNation || lg.country)).map((x) => <option key={x.code} value={x.code}>{x.flag} {x.name[lang]}</option>)}
                </select>
              </label>
              {!ageOk && <p className="g-bad" role="alert" style={{ margin: 0 }}>{t.ageRule}</p>}
            </div>
            <div className="dock" style={{ position: 'fixed' }}>
              {saved && <div className="hint">{t.replaceWarn}</div>}
              <button className={`btn primary${busy ? ' loading' : ''}`} disabled={busy || !ageOk} onClick={() => signContract(c, managerNation || lg.country)}>{t.signContract}</button>
            </div>
          </>
        );
      })()}

      {/* ---------- Squad ---------- */}
      {screen.id === 'squad' && (
        <>
          <AppBar title={t.squad} sub={myClub ? clubName(myClub) : undefined} />
          {!career || !world ? (
            <Empty text={t.noCareer} action={{ label: t.newCareer, onClick: startNewCareer }} />
          ) : (
            <>
              {myClub && (
                <div className="g-stats g-stats-4" style={{ marginTop: 'var(--s4)' }}>
                  <Stat label={t.squadSize} value={String(squad.length)} />
                  <Stat label={t.avgRating} value={(squad.reduce((a, p) => a + p.rating, 0) / Math.max(1, squad.length)).toFixed(1)} />
                  <Stat label={t.avgAge} value={(squad.reduce((a, p) => a + career.season - p.birthYear, 0) / Math.max(1, squad.length)).toFixed(1)} />
                  <Stat label={t.wageCap} value={`${Math.round((wageBill(world, myClub.id) / myClub.wageCap) * 100)}%`} />
                </div>
              )}
              <div className="g-links">
                {([
                  [ICONS.tactics, t.tactics, `${fmt((career.tactics ?? DEFAULT_TACTICS).formation)}`, () => { setTacticsBack('squad'); setScreen({ id: 'tactics' }); }],
                  [ICONS.training, t.trainingT, `${t.loads[career.ops.training.load]} · ⚡${career.ops.devPoints}`, () => setScreen({ id: 'training' })],
                  [ICONS.medical, t.hospitalT, t.hospitalSub(squad.filter((p) => p.injured > 0).length), () => setScreen({ id: 'hospital' })],
                  [ICONS.academy, t.academyT, t.academySub(career.ops.academy.length), () => setScreen({ id: 'academy' })],
                ] as [string, string, string, () => void][]).map(([ico, title, sub, go]) => (
                  <button key={title} className="g-link" onClick={go}>
                    <span className="g-duty-ico"><Icon svg={ico} /></span>
                    <span className="cmain"><b>{title}</b><small>{sub}</small></span>
                  </button>
                ))}
              </div>
              <div className="seg" style={{ margin: 'var(--s4) 0 var(--s2)' }}>
                {[t.all, ...t.groups].map((g, i) => (
                  <button key={g} className={group === i - 1 ? 'on' : ''} onClick={() => setGroup(i - 1)}>{g}</button>
                ))}
              </div>
              <div className="g-filters" style={{ marginBottom: 'var(--s3)' }}>
                <select className="g-input g-select" value={squadSort} onChange={(e) => setSquadSort(Number(e.target.value))} aria-label={t.sorts[0]}>
                  {t.sorts.map((label, i) => <option key={label} value={i}>{label}</option>)}
                </select>
                <select className="g-input g-select" value={squadView} onChange={(e) => setSquadView(Number(e.target.value))} aria-label={t.showT}>
                  {t.squadViews.map((label, i) => <option key={label} value={i}>{t.showT}: {label}</option>)}
                </select>
              </div>
              <div className="list">
                {(squadView === 2 ? [...squad].sort((a, b) => a.contractUntil - b.contractUntil) : squad)
                  .filter((p) => group < 0 || GROUP[p.position] === group).map((p) => {
                    const right = squadView === 1 ? <span className={`g-rating num${p.fitness < 75 ? ' g-low' : ''}`}>{p.fitness}%</span>
                      : squadView === 2 ? <span className={`g-rating num${p.contractUntil <= career.season + 1 ? ' g-low' : ''}`}>{p.contractUntil}</span>
                      : squadView === 3 ? <span className="g-rating num ltr">{money(p.marketValue)}</span>
                      : squadView === 4 ? <span className="g-rating num">{avgRating(career.ratings?.[p.id]) ? avgRating(career.ratings?.[p.id]).toFixed(1) : '–'}</span>
                      : undefined;
                    return <PlayerRow key={p.id} p={p} lang={lang} t={t} season={career.season} onClick={() => setPlayer(p)} right={right} />;
                  })}
              </div>
            </>
          )}
        </>
      )}

      {/* ---------- Match ---------- */}
      {screen.id === 'match' && (!career || !world || !myClub || !myLeague ? (
        <><AppBar title={t.match} /><Empty text={t.noCareer} action={{ label: t.newCareer, onClick: startNewCareer }} /></>
      ) : (
        <MatchHub world={world} career={career} lang={lang} t={t} myClub={myClub} myLeague={myLeague} busy={busy} tab={matchTab} onTab={setMatchTab}
          matchLabel={matchLabel} onPlay={() => playNext(true)} onQuick={() => playNext(false)} onResume={resumeLive}
          onTactics={() => { setTacticsBack('match'); setScreen({ id: 'tactics' }); }} onFinishSeason={finishSeason}
          onPlayer={setPlayer} onRankings={() => setScreen({ id: 'rankings' })} onChange={commitMsg} onToast={setToast} />
      ))}

      {screen.id === 'live' && live && world && career && (
        <Live m={live} world={world} career={career} lang={lang} t={t} locked={liveLocked} speed0={prefs.speed} openOn={prefs.openOn} camera0={prefs.camera} onCamera={(c) => setPrefs({ ...prefs, camera: c })} label={matchLabel(live)} onToast={setToast}
          onUpdate={setLive} onSave={(m) => commit(world, { ...career, live: m })} onContinue={finishMatch} />
      )}

      {screen.id === 'tactics' && world && career && (
        <Tactics world={world} career={career} lang={lang} t={t} onBack={() => setScreen({ id: tacticsBack })}
          onSave={async (tac) => { await commit(world, { ...career, tactics: tac }); setToast(t.tacticsSaved); }} />
      )}

      {screen.id === 'quick' && (
        <QuickMatch source={world ?? saved?.world ?? null} lang={lang} t={t} prefs={prefs} onToast={setToast} onExit={backToHub} />
      )}
      {screen.id === 'editor' && world && career && (
        <WorldEditor world={world} career={career} lang={lang} t={t} onBack={() => setScreen({ id: 'more' })} onToast={setToast}
          onSave={async (w, v, swaps) => { await commit(w, { ...career, worldVersion: v, pendingSwaps: swaps.length ? swaps : undefined }); }} />
      )}
      {screen.id === 'settings' && (
        <Settings prefs={prefs} career={career} t={t} langs={READY} onPrefs={setPrefs}
          onBalance={async (b) => { if (world && career) { await commit(world, { ...career, balance: b }); setToast(t.balanceSaved); } }}
          onBack={() => setScreen({ id: 'more' })} onHowTo={() => setScreen({ id: 'howto' })} onPrivacy={() => setScreen({ id: 'privacy' })} />
      )}
      {screen.id === 'howto' && <TextPage title={t.howTo} body={t.howToBody} t={t} onBack={() => setScreen({ id: 'more' })} />}
      {screen.id === 'privacy' && <TextPage title={t.privacy} body={t.privacyBody} foot={t.privacyUpdated} t={t} onBack={() => setScreen({ id: 'more' })} />}
      {screen.id === 'rankings' && world && career && (
        <Rankings world={world} career={career} lang={lang} t={t} onBack={() => { setMatchTab(1); setScreen({ id: 'match' }); }} />
      )}
      {screen.id === 'news' && world && career && (
        <News world={world} career={career} lang={lang} t={t} onBack={backToHub} onToast={setToast} />
      )}
      {screen.id === 'finances' && world && career && (
        <ClubScreen key={screen.tab} world={world} career={career} lang={lang} t={t} tab0={screen.tab} onBack={() => setScreen({ id: 'club' })} onChange={commitMsg} />
      )}
      {screen.id === 'training' && world && career && (
        <TrainingScreen world={world} career={career} lang={lang} t={t} onBack={() => setScreen({ id: 'squad' })} onChange={commitMsg} />
      )}
      {screen.id === 'hospital' && world && career && (
        <HospitalScreen world={world} career={career} lang={lang} t={t} onBack={() => setScreen({ id: 'squad' })} onChange={commitMsg} />
      )}
      {screen.id === 'academy' && world && career && (
        <AcademyScreen world={world} career={career} lang={lang} t={t} onBack={() => setScreen({ id: 'squad' })} onChange={commitMsg} />
      )}

      {screen.id === 'inbox' && world && career && (
        <Inbox world={world} career={career} lang={lang} t={t} onBack={backToHub} onChange={(c) => commit(world, c)} />
      )}

      {screen.id === 'coach' && world && career && (
        <CoachScreen world={world} career={career} lang={lang} ui={prefs.lang} t={t} onBack={backToHub}
          onChange={async (c, msg) => { await commit(world, c); if (msg) setToast(msg); }}
          onJob={async (id) => { const r = moveTo(world, career, id); await commit(r.world, r.career); setScreen({ id: 'home' }); }} onToast={setToast} />
      )}

      {/* ---------- Transfers ---------- */}
      {screen.id === 'transfers' && (!career || !world ? (
        <><AppBar title={t.transfersT} /><Empty text={t.noCareer} action={{ label: t.newCareer, onClick: startNewCareer }} /></>
      ) : (
        <Transfers world={world} career={career} lang={lang} t={t} tab={trTab} onTab={setTrTab} onPick={setPlayer} onOffers={() => setShowOffers(true)} />
      ))}

      {/* ---------- Club ---------- */}
      {screen.id === 'club' && (!career || !world ? (
        <><AppBar title={t.tabs[4]} right={<button className="iconbtn" aria-label={t.settingsMore} onClick={() => setScreen({ id: 'more' })}><Icon svg={gearIcon} /></button>} /><Empty text={t.noCareer} action={{ label: t.newCareer, onClick: startNewCareer }} /></>
      ) : (
        <ClubHub world={world} career={career} lang={lang} t={t} onGo={goFromClub} />
      ))}
      {screen.id === 'staff' && world && career && (
        <StaffRoom world={world} career={career} lang={lang} t={t} onBack={() => setScreen({ id: 'club' })}
          onChange={(c, msg) => commitMsg(world, c, msg)} onHire={() => setScreen({ id: 'finances', tab: 4 })} />
      )}
      {screen.id === 'history' && world && career && (
        <History world={world} career={career} lang={lang} t={t} onBack={() => setScreen({ id: 'club' })} />
      )}

      {/* ---------- Settings and more (from the Club tab's gear) ---------- */}
      {screen.id === 'more' && (
        <>
          <AppBar back={() => setScreen({ id: career ? 'club' : 'home' })} backLabel={t.back} title={t.settingsMore} />
          <div className="sechead" />
          <SupportCard t={t} prefs={prefs} onPrefs={setPrefs} />
          <div className="sechead" />
          <div className="list">
            <button className="cell" onClick={() => setScreen({ id: 'settings' })}><span className="cmain"><b>{t.settings}</b><span>{t.languageT} · {t.matchPrefs}{career ? ` · ${t.balanceT}` : ''}</span></span></button>
            <button className="cell" onClick={() => setScreen({ id: 'quick' })}><span className="cmain"><b>{t.quick}</b><span>{t.quickSub}</span></span></button>
            {career && world && (
              <>
                <button className="cell" onClick={() => setScreen({ id: 'editor' })}><span className="cmain"><b>{t.editorT}</b><span>{t.editorMoreSub}</span></span></button>
                <button className="cell" onClick={() => myClub && setNaming({ kind: 'club', id: myClub.id, name: myClub.name })}><span className="cmain"><b>{t.editName}</b><span>{myClub?.name[lang]}</span></span></button>
              </>
            )}
          </div>
          <div className="sechead" />
          <div className="list">
            {career && world && (
              <button className="cell" onClick={() => setSaveMode('export')}><span className="cmain"><b>{t.exportSave}</b><span>{t.exportSub}</span></span></button>
            )}
            <button className="cell" onClick={() => setSaveMode('import')}><span className="cmain"><b>{t.importSave}</b><span>{t.importSub}</span></span></button>
          </div>
          <div className="sechead" />
          <div className="list">
            <button className="cell" onClick={() => setScreen({ id: 'howto' })}><span className="cmain"><b>{t.howTo}</b><span>{t.howToSub}</span></span></button>
            <button className="cell" onClick={() => setScreen({ id: 'privacy' })}><span className="cmain"><b>{t.privacy}</b><span>{t.privacySub}</span></span></button>
          </div>
          <div className="sechead" />
          {/* Semba Games button: replaces the old game's Facebook button (see games/the-gaffer/README.md). */}
          <a className="card g-semba" href={SEMBA_URL} target="_blank" rel="noopener" style={{ textDecoration: 'none', color: 'var(--text)' }}>
            <img src={sembaLogo} alt="Semba Games" />
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <b>{t.followSemba}</b>
              <small className="muted">{t.followSembaSub}</small>
            </span>
          </a>
          {career && (
            <>
              <div className="sechead" />
              <div className="list">
                <button className="cell" onClick={() => setAskReset(true)}>
                  <span className="cmain"><b style={{ color: 'var(--bad)' }}>{t.startOver}</b><span>{t.startOverSub}</span></span>
                </button>
              </div>
            </>
          )}
          <div style={{ height: 24 }} />
        </>
      )}

      {hub && (
        <nav className="tabbar">
          {[homeIcon, friendsIcon, playIcon, ICONS.transfers, ICONS.club].map((svg, i) => (
            <button key={i} className={i === onTab ? 'on' : ''}
              onClick={() => setScreen({ id: TAB_SCREENS[i] } as Screen)}>
              <Icon svg={svg} />
              {t.tabs[i]}
            </button>
          ))}
        </nav>
      )}

      {/* ---------- Bottom sheets ---------- */}
      {player && career && world && !bid && !renewing && !naming && (
        <PlayerSheet p={world.players.find((x) => x.id === player.id) ?? player} world={world} career={career} lang={lang} t={t}
          onClose={() => setPlayer(null)} onOffer={() => setBid(player)} onRenew={() => setRenewing(player)}
          onList={(listed) => afterDeal(setListed(world, player.id, listed), career, '')}
          onRename={() => { const cur = world.players.find((x) => x.id === player.id) ?? player; setNaming({ kind: 'player', id: player.id, name: cur.name, nick: cur.nick }); }}
          onApply={async (w, c, msg) => { await commit(w, c); if (msg) { setToast(msg); setPlayer(null); } }} />
      )}
      {bid && world && career && (
        <BidSheet p={bid} world={world} career={career} lang={lang} t={t} onClose={() => setBid(null)} onDone={afterDeal} />
      )}
      {renewing && world && career && (
        <RenewSheet p={world.players.find((x) => x.id === renewing.id) ?? renewing} world={world} career={career} lang={lang} t={t}
          onClose={() => setRenewing(null)} onDone={afterDeal} />
      )}
      {showOffers && world && career && career.offers.length > 0 && (
        <OffersSheet world={world} career={career} lang={lang} t={t} onClose={() => setShowOffers(false)} onDone={afterDeal} />
      )}
      {saveMode && (
        <SaveSheet mode={saveMode} world={world} career={career} t={t} onClose={() => setSaveMode(null)} onLoaded={loadSave} />
      )}
      {naming && world && career && (
        <EditName target={naming} t={t} onClose={() => setNaming(null)}
          onSave={async (n, nick) => { await commit(renameIn(world, naming, n, nick), career); setNaming(null); setPlayer(null); }} />
      )}
      {ft && world && !player && !summary && <FullTime a={ft} world={world} lang={lang} t={t} onClose={() => setFt(null)} />}
      {toast && <div className="g-toast toast" role="status">{toast}</div>}
      {screen.id !== 'live' && <UpdateBanner t={t} />}

      {summary && world && career && myClub && myLeague && (
        <>
          <div className="scrim" onClick={() => setSummary(null)} />
          <div className="sheet" role="dialog" aria-label={t.seasonOver}>
            <div className="grab" />
            <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s2)' }}>{t.season(summary.record.season)}</h2>
            <p className={summary.record.met ? 'g-ok' : 'g-bad'}>{t.finished(t.ordinal(summary.record.position))} {summary.record.met ? t.met : t.missed}</p>
            <p><b>
              {summary.promoted.includes(myClub.id) ? t.promotedTo(myLeague.name[lang])
                : summary.relegated.includes(myClub.id) ? t.relegatedTo(myLeague.name[lang]) : t.stayIn(myLeague.name[lang])}
            </b></p>
            {(() => {
              const country = myLeague.country;
              const mine = (ids: string[]) => ids.map((id) => world.clubs.find((x) => x.id === id)!).filter((c) => world.leagues.find((l) => l.id === c.leagueId)!.country === country);
              const up = mine(summary.promoted), down = mine(summary.relegated);
              if (!up.length) return null;
              return (
                <>
                  <div className="sechead"><span className="over">{t.moves}</span></div>
                  <div className="list">
                    {up.map((c) => <div key={c.id} className="cell g-row"><Kit colors={c.colors} size="xs" /><span className="cmain"><b>{clubName(c)}</b></span><span className="tag g-up">▲ {t.up}</span></div>)}
                    {down.map((c) => <div key={c.id} className="cell g-row"><Kit colors={c.colors} size="xs" /><span className="cmain"><b>{clubName(c)}</b></span><span className="tag g-down">▼ {t.down}</span></div>)}
                  </div>
                </>
              );
            })()}
            {[[t.leftClub, summary.left], [t.academyUp, summary.academy]].map(([label, ps]) =>
              (ps as Player[]).length > 0 && (
                <div key={label as string}>
                  <div className="sechead"><span className="over">{label as string}</span></div>
                  <div className="list">
                    {(ps as Player[]).map((p) => (
                      <div key={p.id} className="cell g-row">
                        <span className="tag">{p.position}</span>
                        <span className="cmain"><b>{p.name[lang]}</b></span>
                        <span className="g-rating num">{p.rating}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            {summary.cups.length > 0 && (
              <>
                <div className="sechead"><span className="over">{t.cupsTab}</span></div>
                <div className="list">
                  {summary.cups.map((cu) => (
                    <div key={cu.id} className="cell g-row">
                      <span className="g-shirt">{cu.won ? '🏆' : '⚽'}</span>
                      <span className="cmain"><b>{cu.name[lang]}</b><span>{cu.won ? t.cupWonT : t.cupOut(t.roundName(cu.round, cu.rounds))}</span></span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="muted">{t.retiredN(summary.retired)}</p>
            <button className="btn primary" style={{ width: '100%' }} onClick={() => setSummary(null)}>{t.done}</button>
          </div>
        </>
      )}

      {askReset && (
        <>
          <div className="scrim" onClick={() => setAskReset(false)} />
          <div className="sheet" role="alertdialog" aria-label={t.startOverAsk}>
            <div className="grab" />
            <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s2)' }}>{t.startOverAsk}</h2>
            <p className="muted">{t.startOverBody}</p>
            <div style={{ display: 'grid', gap: 'var(--s3)', marginTop: 'var(--s5)' }}>
              <button className="btn danger" onClick={resetCareer}>{t.delete}</button>
              <button className="btn" onClick={() => setAskReset(false)}>{t.cancel}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LangButton({ label, onClick }: { lang: UiLang; label: string; onClick: () => void }) {
  return (
    <button className="g-lang" onClick={onClick} aria-label="Language">
      <Icon svg={globeIcon} />
      {label}
    </button>
  );
}


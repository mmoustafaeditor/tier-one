// Manager home: "what should I do next?" A short Today list of things that need the manager (each with one button),
// then the next match, the table snapshot, board and fans, and the headlines. Duties handed to staff drop off the list.
import type { ReactNode } from 'react';
import type { Lang, Strings, UiLang } from '../i18n';
import type { Career, Club, League } from '../model/types';
import { squadOf, starsOf, type World } from '../sim/world';
import { nextUserMatch, seasonOver, table, objectiveMet, leaders, type LiveMatch } from '../sim/season';
import { objectiveOf } from '../sim/world';
import { expiring } from '../sim/transfers';
import { xiFor } from '../sim/tactics';
import { SLOTS } from '../sim/economy';
import { DEV_COST } from '../sim/training';
import { delegated } from '../sim/staff';
import { balanceOf, sackLine } from '../sim/balance';
import { isDeadlineDay, windowLeft, windowOf } from '../sim/windows';
import { Kit } from '../components/Kit';
import { Icon, Score, Stars } from './parts';
import { ICONS } from './icons';
import { newsText } from './News';
import { AdSlot } from './Support';
import bellIcon from '../../../../../design/assets/icons/ui/mega.svg?raw';

export type Go = 'offers' | 'contracts' | 'tactics' | 'transfers' | 'sponsors' | 'finances' | 'coach' | 'training' | 'staff' | 'match' | 'news' | 'inbox' | 'squad';

interface Item { key: keyof Strings['todayItems']; text: string; icon: string; go: Go; warn?: boolean }

// Below this the board is a Today item: the sack should never be a surprise (GF-23).
const BOARD_WARN = 30;

export function todayItems(w: World, c: Career, t: Strings): Item[] {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const squad = squadOf(w, c.clubId);
  const over = seasonOver(c);
  const items: Item[] = [];
  if (c.sacked) return items;
  if (c.board.confidence < BOARD_WARN) {
    // Roughly how many more defeats the board will take (each costs about six points of confidence).
    const defeats = Math.max(1, Math.ceil((c.board.confidence - sackLine(balanceOf(c))) / 6));
    items.push({ key: 'board', text: t.todayItems.board(Math.round(c.board.confidence), defeats), icon: ICONS.board, go: 'coach', warn: true });
  }
  if (isDeadlineDay(c) && !delegated(c, 'signing')) items.push({ key: 'deadline', text: t.todayItems.deadline, icon: ICONS.alert, go: 'transfers', warn: true });
  if (c.offers.length && !delegated(c, 'selling')) items.push({ key: 'offers', text: t.todayItems.offers(c.offers.length), icon: ICONS.money, go: 'offers' });
  if (!delegated(c, 'lineup')) {
    const { xi, replaced } = xiFor(w, c);
    if (replaced.length) items.push({ key: 'unavailable', text: t.todayItems.unavailable(replaced.length), icon: ICONS.medical, go: 'tactics', warn: true });
    const tired = xi.filter((p) => p.fitness < 75).length;
    if (tired >= 3) items.push({ key: 'tired', text: t.todayItems.tired(tired), icon: ICONS.heart, go: 'tactics' });
  }
  const exp = over ? [] : expiring(w, c);
  if (exp.length && !delegated(c, 'contracts') && c.round >= 3) items.push({ key: 'contracts', text: t.todayItems.contracts(exp.length), icon: ICONS.shirt, go: 'contracts' });
  if (club.budget < 0) items.push({ key: 'red', text: t.todayItems.red, icon: ICONS.board, go: 'finances', warn: true });
  if (squad.length < 18 && !delegated(c, 'signing')) items.push({ key: 'thin', text: t.todayItems.thin(squad.length), icon: ICONS.transfers, go: 'transfers', warn: true });
  const empty = SLOTS.filter((sl) => !c.ops.sponsors.some((d) => d.slot === sl)).length;
  if (empty && c.ops.sponsorOffers.length && !delegated(c, 'sponsors')) items.push({ key: 'sponsors', text: t.todayItems.sponsors(empty), icon: ICONS.sponsor, go: 'sponsors' });
  if (c.jobs.length) items.push({ key: 'jobs', text: t.todayItems.jobs(c.jobs.length), icon: ICONS.club, go: 'coach' });
  if (c.ops.devPoints >= DEV_COST.rating && !delegated(c, 'training')) items.push({ key: 'dev', text: t.todayItems.dev(c.ops.devPoints), icon: ICONS.training, go: 'training' });
  if (windowOf(c) && !isDeadlineDay(c) && !delegated(c, 'signing')) items.push({ key: 'windowOpen', text: t.todayItems.windowOpen(windowLeft(c)), icon: ICONS.calendar, go: 'transfers' });
  const since = c.season * 100 + c.round - 1;
  const done = (c.staffLog ?? []).filter((l) => l.season * 100 + l.round >= since).length;
  if (done) items.push({ key: 'staff', text: t.todayItems.staff(done), icon: ICONS.staff, go: 'staff' });
  return items;
}

const FORM_IDX: Record<string, number> = { W: 0, D: 1, L: 2 };

export function Home({ world, career, lang, t, ui, myClub, myLeague, busy, matchLabel, langButton, onGo, onPlay, onFinishSeason, onNextSeason, onPlayer }: {
  world: World; career: Career; lang: Lang; t: Strings; ui: UiLang; myClub: Club; myLeague: League; busy: boolean;
  matchLabel: (m: LiveMatch) => string; langButton: ReactNode;
  onGo: (g: Go) => void; onPlay: () => void; onFinishSeason: () => void; onNextSeason: () => void; onPlayer: (id: string) => void;
}) {
  void ui;
  const rows = table(world, career, myLeague.id);
  const pos = rows.findIndex((x) => x.clubId === myClub.id) + 1;
  const me = rows[pos - 1];
  const nf = career.sacked ? null : nextUserMatch(world, career);
  const over = seasonOver(career);
  const last = [...career.fixtures[myLeague.id]].reverse().flat().find((f) => f[2] >= 0 && (f[0] === myClub.id || f[1] === myClub.id));
  const club = (id: string) => world.clubs.find((x) => x.id === id)!;
  const items = todayItems(world, career, t);
  const unread = career.inbox.filter((m) => !m.read).length;
  // The manager's name keeps its own direction inside the sentence (GF-32).
  const [welcomeA, welcomeB] = t.welcome('\u0000').split('\u0000');
  return (
    <>
      <div className="g-top">
        <span className="g-live">{t.season(career.season)}</span>
        <span style={{ display: 'flex', gap: 'var(--s2)' }}>
          <button className="iconbtn g-bell" aria-label={t.inbox} onClick={() => onGo('inbox')}>
            <Icon svg={bellIcon} />
            {unread > 0 && <span className="badge">{unread}</span>}
          </button>
          {langButton}
        </span>
      </div>
      <section className="g-club">
        <Kit colors={myClub.colors} size="lg" />
        <div style={{ minWidth: 0 }}>
          <div className="over">{myLeague.name[lang]}</div>
          <h1 className="d2">{myClub.name[lang]}</h1>
          <div className="g-clubmeta">
            <Stars n={starsOf(world, myClub)} />
            {me.p > 0 && <span className="chip">{t.position} <b className="num">{t.ordinal(pos)}</b> · <span className="num">{me.pts}</span> {t.points}</span>}
            {me.form.length > 0 && (
              <span className="g-formrun" aria-label={t.formT}>
                {me.form.slice(-5).map((f, i) => <i key={i} className={`g-f${f}`}>{t.formLetters[FORM_IDX[f] ?? 1]}</i>)}
              </span>
            )}
          </div>
        </div>
      </section>
      <button className="chip g-welcome" onClick={() => onGo('coach')}>
        <span>{welcomeA}<span dir="auto">{career.managerName}</span>{welcomeB}</span> <b>{t.career} ›</b>
      </button>

      {career.sacked && (
        <button className="card g-hero g-next" onClick={() => onGo('coach')}>
          <h2 className="d3" style={{ margin: 0 }}>{t.sackedTitle}</h2>
          <p className="muted" style={{ margin: 0 }}>{t.sackedBody}</p>
          <span className="btn primary">{t.jobsT}</span>
        </button>
      )}

      <div className="g-homecols">
        <div>
          {!career.sacked && (
            <section className="card g-today">
              <div className="g-today-head">
                <h2 className="d4" style={{ margin: 0 }}>{t.today(items.length)}</h2>
              </div>
              {items.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t.allClear}</p> : (
                <div className="list g-today-list">
                  {items.map((it) => (
                    <button key={it.key} className={`cell g-today-item${it.warn ? ' warn' : ''}`} onClick={() => onGo(it.go)}>
                      <span className="g-duty-ico"><Icon svg={it.icon} /></span>
                      <span className="cmain"><b>{it.text}</b></span>
                      <span className="g-today-act">{t.todayActions[it.key]} ›</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
        <div>
          <div className="sechead"><span className="over">{over ? t.seasonOver : t.nextMatchT}</span></div>
          {nf && (
            <div className="card g-next">
              <button className="g-next-open" onClick={() => onGo('match')} aria-label={t.match}>
                <div className="over">{matchLabel(nf)} · {nf.sides[0].clubId === myClub.id ? t.home : t.away}</div>
                <div className="g-vs">
                  <span><Kit colors={club(nf.sides[0].clubId).colors} size="md" /><b>{club(nf.sides[0].clubId).name[lang]}</b></span>
                  <i>{t.vs}</i>
                  <span><Kit colors={club(nf.sides[1].clubId).colors} size="md" /><b>{club(nf.sides[1].clubId).name[lang]}</b></span>
                </div>
              </button>
              <button className={`btn primary${busy ? ' loading' : ''}`} disabled={busy} onClick={onPlay}>{career.live ? t.resumeMatch : t.watch}</button>
            </div>
          )}
          {!nf && !over && !career.sacked && (
            <div className="card">
              <p className="muted" style={{ marginTop: 0 }}>{t.leagueOver}</p>
              <button className="btn primary" style={{ width: '100%' }} disabled={busy} onClick={onFinishSeason}>{t.finishSeason}</button>
            </div>
          )}
          {over && (
            <div className="card g-hero">
              <h2 className="d3" style={{ margin: 0 }}>{t.finished(t.ordinal(pos))}</h2>
              <p className={objectiveMet(objectiveOf(world, myClub), pos, rows.length) ? 'g-ok' : 'g-bad'}>
                {objectiveMet(objectiveOf(world, myClub), pos, rows.length) ? t.met : t.missed}
              </p>
              <div className="list" style={{ marginBottom: 'var(--s4)' }}>
                <div className="cell g-row"><Kit colors={club(rows[0].clubId).colors} size="sm" /><span className="cmain"><span>{t.champion}</span><b>{club(rows[0].clubId).name[lang]}</b></span></div>
                {(() => {
                  const ts = leaders(world, career, myLeague.id, 1, 1)[0];
                  return ts ? <button className="cell" onClick={() => onPlayer(ts.player.id)}><span className="g-shirt num">{ts.value}</span><span className="cmain"><span>{t.topScorer}</span><b>{ts.player.name[lang]} · {club(ts.player.clubId).name[lang]}</b></span></button> : null;
                })()}
              </div>
              <button className={`btn primary${busy ? ' loading' : ''}`} style={{ width: '100%' }} disabled={busy} onClick={onNextSeason}>{t.nextSeason(career.season + 1)}</button>
            </div>
          )}
          {last && (
            <div className="g-leagues" style={{ marginTop: 'var(--s3)' }}>
              <span className="chip">{t.lastResult} <Score f={last} me={myClub.id} /> {t.vs} {club(last[0] === myClub.id ? last[1] : last[0]).name[lang]}</span>
            </div>
          )}
          <div className="sechead"><span className="over">{t.boardFans}</span></div>
          <button className="card g-next g-boardcard" onClick={() => onGo('coach')}>
            {([[t.confidence, career.board.confidence], [t.fansT, career.board.fans]] as const).map(([k, v]) => (
              <div key={k} className="g-barrow"><span>{k}</span><div className={`bar${v < 30 ? ' low' : ''}`}><i style={{ width: `${v}%` }} /></div><b className="num">{Math.round(v)}</b></div>
            ))}
            <small className="muted">{t.boardWants}: {t.objective[objectiveOf(world, myClub)]}</small>
          </button>
          {(career.news ?? []).length > 0 && (
            <>
              <div className="sechead"><span className="over">{t.newsT}</span></div>
              <button className="card g-news g-next" onClick={() => onGo('news')}>
                {(career.news ?? []).slice(0, 2).map((n) => { const [h, b] = newsText(t, lang, world, career, n); return <span key={n.id} className="g-news"><b>{h}</b><span className="muted">{b}</span></span>; })}
              </button>
            </>
          )}
          <AdSlot t={t} placement="home" />
        </div>
      </div>
    </>
  );
}

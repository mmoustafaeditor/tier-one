// Club tab: the board and its objectives, then one door to each part of running the club.
import type { Lang, Strings } from '../i18n';
import type { Career } from '../model/types';
import { money, objectiveOf, type World } from '../sim/world';
import { cupAimMet, objectivesOf, youthApps, levelOf } from '../sim/coach';
import { DUTIES, delegated } from '../sim/staff';
import { AppBar, Icon } from './parts';
import { FACILITIES, capacityOf } from '../sim/economy';
import { ICONS } from './icons';
import gearIcon from '../../../../../design/assets/icons/ui/gear.svg?raw';

export type ClubDoor = 'staff' | 'finances' | 'tickets' | 'sponsors' | 'facilities' | 'hire' | 'history' | 'coach' | 'more';

export function ClubHub({ world, career, lang, t, onGo }: { world: World; career: Career; lang: Lang; t: Strings; onGo: (d: ClubDoor) => void }) {
  const club = world.clubs.find((c) => c.id === career.clubId)!;
  const aims = objectivesOf(world, career);
  const cupOk = cupAimMet(world, career, aims.cup);
  const yApps = youthApps(world, career);
  const n = DUTIES.filter((d) => delegated(career, d)).length;
  const doors: [ClubDoor, string, string, string][] = [
    ['staff', ICONS.staff, t.staffRoomT, t.staffRoomSub(n, DUTIES.length)],
    ['finances', ICONS.money, t.financesT, `${t.budget} ${money(club.budget)}`],
    ['tickets', ICONS.stadium, t.ticketsT, `${career.ops.ticket < 10 ? `€${career.ops.ticket.toFixed(1)}` : money(Math.round(career.ops.ticket))} · ${capacityOf(career.ops).toLocaleString()}`],
    ['sponsors', ICONS.sponsor, t.sponsorsT, `${career.ops.sponsors.length}/5`],
    ['facilities', ICONS.club, t.facilitiesT, FACILITIES.map((f) => career.ops.facilities[f]).join(' · ')],
    ['history', ICONS.history, t.historyT, t.historySub],
    ['coach', ICONS.whistle, t.career, `${t.careerSub} · Lv ${levelOf(career.coach.xp)}`],
  ];
  return (
    <>
      <AppBar title={t.tabs[4]} sub={club.name[lang]} right={<button className="iconbtn" aria-label={t.settingsMore} onClick={() => onGo('more')}><Icon svg={gearIcon} /></button>} />

      <section className="card g-hero" style={{ marginTop: 'var(--s4)' }}>
        <div className="over">{t.boardT}</div>
        <h2 className="d3" style={{ margin: 'var(--s2) 0 var(--s3)' }}>{t.objective[objectiveOf(world, club)]}</h2>
        {([[t.confidence, career.board.confidence], [t.fansT, career.board.fans]] as const).map(([k, v]) => (
          <div key={k} className="g-barrow" style={{ marginTop: 8 }}>
            <span>{k}</span><div className={`bar${v < 30 ? ' low' : ''}`}><i style={{ width: `${v}%` }} /></div><b className="num">{Math.round(v)}</b>
          </div>
        ))}
        <ul className="g-aims">
          <li>{t.objective[aims.league]}</li>
          <li className={cupOk === true ? 'g-ok' : cupOk === false ? 'g-bad' : ''}>{t.cupAim[aims.cup]}</li>
          <li className={yApps >= aims.youth ? 'g-ok' : ''}>{t.youthAim(aims.youth, yApps)}</li>
          <li className={club.budget < 0 ? 'g-bad' : ''}>{t.financeAim}</li>
        </ul>
      </section>

      <div className="list g-doors" style={{ marginTop: 'var(--s4)' }}>
        {doors.map(([id, icon, title, sub]) => (
          <button key={id} className="cell" onClick={() => onGo(id)}>
            <span className="g-duty-ico"><Icon svg={icon} /></span>
            <span className="cmain"><b>{title}</b><span>{sub}</span></span>
            <span className="g-chev" aria-hidden="true"><Icon svg={ICONS.chevron} /></span>
          </button>
        ))}
      </div>
      <div className="list" style={{ marginTop: 'var(--s4)' }}>
        <button className="cell" onClick={() => onGo('more')}>
          <span className="g-duty-ico"><Icon svg={gearIcon} /></span>
          <span className="cmain"><b>{t.settingsMore}</b><span>{t.settingsMoreSub}</span></span>
          <span className="g-chev" aria-hidden="true"><Icon svg={ICONS.chevron} /></span>
        </button>
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}

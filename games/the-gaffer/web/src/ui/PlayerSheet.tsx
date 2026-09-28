// Player sheet: attributes, condition, season stats, contract, and the actions that fit (offer, renew, list for sale).
import type { Lang, Strings } from '../i18n';
import { FREE_AGENT, type Career, type Player } from '../model/types';
import { FLAG } from '../data/names';
import { ageOf, money, type World } from '../sim/world';
import { askingPrice } from '../sim/transfers';
import { Kit } from '../components/Kit';
import { Line, Sheet, Stat } from './parts';
import { balanceOf } from '../sim/balance';

export function PlayerSheet({ p, world, career, lang, t, onClose, onOffer, onRenew, onList, onRename }: {
  p: Player; world: World; career: Career; lang: Lang; t: Strings;
  onClose: () => void; onOffer: () => void; onRenew: () => void; onList: (listed: boolean) => void; onRename: () => void;
}) {
  const mine = p.clubId === career.clubId;
  const club = world.clubs.find((c) => c.id === p.clubId);
  const st = career.stats[p.id] ?? [0, 0, 0, 0, 0];
  const attrIdx = p.position === 'GK' ? [6, 2, 5, 0] : [0, 1, 2, 3, 4, 5];
  return (
    <Sheet label={p.name[lang]} onClose={onClose}>
      <div className="g-sheet-head">
        <span className="g-shirt num">{p.shirtNumber || '–'}</span>
        <div style={{ minWidth: 0 }}>
          <h2 className="d3 ltr-auto">{p.name[lang]}</h2>
          {p.nick && <div className="g-nick">«{p.nick[lang]}»</div>}
          <span className="muted">{t.pos[p.position]} · {FLAG[p.nationality] ?? ''} {p.nationality}</span>
        </div>
      </div>
      {club && !mine && (
        <div className="g-leagues" style={{ margin: 'var(--s3) 0 0' }}>
          <span className="chip"><Kit colors={club.colors} size="xs" /> {club.name[lang]}</span>
        </div>
      )}
      {p.clubId === FREE_AGENT && <div className="g-leagues" style={{ margin: 'var(--s3) 0 0' }}><span className="chip">{t.freeAgents}</span></div>}
      {(p.injured > 0 || p.banned > 0) && (
        <p className="g-bad" style={{ margin: 'var(--s3) 0 0' }}>{p.injured > 0 ? t.statusInj(p.injured) : t.statusBan(p.banned)}</p>
      )}
      <div className="g-stats g-stats-4">
        <Stat label={t.player.rating} value={String(p.rating)} />
        <Stat label={t.player.potential} value={String(p.potential)} />
        <Stat label={t.player.age} value={String(ageOf(p, career.season))} />
        <Stat label={t.player.shirt} value={p.shirtNumber ? `#${p.shirtNumber}` : '–'} />
      </div>
      <div className="g-bars">
        {[[t.fitness, p.fitness], [t.morale, p.morale]].map(([k, v]) => (
          <div key={k as string} className="g-barrow"><span>{k}</span><div className="bar"><i style={{ width: `${v}%` }} /></div><b className="num">{v}</b></div>
        ))}
        {attrIdx.map((i) => (
          <div key={i} className="g-barrow"><span>{t.attrs[i]}</span><div className="bar attr"><i style={{ width: `${p.attrs[i]}%` }} /></div><b className="num">{p.attrs[i]}</b></div>
        ))}
      </div>
      <div className="sechead"><span className="over">{t.seasonStats}</span></div>
      <div className="g-stats g-stats-5">
        {t.statCols.map((k, i) => <Stat key={k} label={k} value={String(st[i])} />)}
      </div>
      <div className="list" style={{ margin: 'var(--s4) 0' }}>
        <Line k={t.player.value} v={money(p.marketValue)} />
        {!mine && p.clubId !== FREE_AGENT && <Line k={t.askPrice} v={money(askingPrice(world, p, balanceOf(career).prices))} />}
        <Line k={t.player.wage} v={money(p.wage)} unit={t.perMonth} />
        {p.clubId !== FREE_AGENT && <Line k={t.player.contract} v={String(p.contractUntil)} />}
        {!!p.savings && <Line k={t.playerSavings} v={money(p.savings)} />}
      </div>
      <div style={{ display: 'grid', gap: 'var(--s3)' }}>
        {!mine && <button className="btn primary" onClick={onOffer}>{t.makeOffer}</button>}
        {mine && <button className="btn primary" onClick={onRenew}>{t.renewTitle}</button>}
        {mine && <button className="btn" onClick={() => onList(!p.listed)}>{p.listed ? t.unlist : t.listForSale}</button>}
        <button className="btn ghost" onClick={onRename}>✎ {t.editName}</button>
        <button className="btn ghost" onClick={onClose}>{t.close}</button>
      </div>
    </Sheet>
  );
}

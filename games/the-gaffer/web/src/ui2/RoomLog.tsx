// Rework §E: the dressing room's history this season — talks, answers, the armband, promises kept or broken, requests,
// new leaders, departures — read from the season's event log (sim/events.ts), so nothing is invented. Turning points
// (a promise kept or broken, a request to leave, a departure) are marked. With `playerId`: only that player's.
import type { DomainEvent, TalkWhy } from '../model/types';
import { anyPlayer } from '../sim/youth';
import { roomOf } from '../sim/room';
import { dateOf, shortDate } from '../sim/calendar';
import { RL } from '../lang-roomlog';
import { D } from '../lang-dressing-all';
import { Panel, PanelHead } from './shell';
import { useGame } from './game';

const TURN = new Set(['promise.kept', 'promise.broken', 'room.request', 'room.exit']);

export function roomLine(e: DomainEvent, ui: keyof typeof RL, name: (id: string) => string): string | null {
  const T = RL[ui];
  const id = e.refs?.p?.[0];
  if (!id) return null;
  const n = name(id), d = e.data ?? {};
  switch (e.name) {
    case 'room.talk': return e.type === 'cmd' && typeof d.tone === 'string' && d.tone in T.talk ? T.talk[d.tone as 'reassure'](n) : null;
    case 'room.answer': return e.type === 'cmd' && typeof d.answer === 'string' && d.answer in T.answer ? T.answer[d.answer as 'list'](n) : null;
    case 'room.captain': return e.type === 'room' ? T.captain(n) : null;
    case 'promise.kept': return T.kept(n);
    case 'promise.broken': return T.broken(n);
    case 'room.ask': return T.ask(n, D[ui].talk.why[d.why as TalkWhy] ?? '');
    case 'room.request': return T.request(n);
    case 'room.settled': return T.settled(n);
    case 'room.leader': return T.leader(n);
    case 'room.core': return T.core(n);
    case 'room.exit': return d.why === 'leader' ? T.exitLeader(n) : T.exitReq(n);
    case 'room.return': return T.ret(n);
    case 'room.stayed': return T.stayed(n);
    default: return null;
  }
}

export function RoomLog({ playerId, max = 10 }: { playerId?: string; max?: number }) {
  const g = useGame();
  const { w, c, lang } = g;
  const T = RL[g.ui];
  const name = (id: string) => { const p = anyPlayer(w, id); return p ? p.name[lang] || p.name.en : '—'; };
  // The event log first; then the room's memory (its turning points) for what the log no longer holds.
  // (the log is capped by size, not cleared each season: skip a remembered moment it still holds)
  const inLog = new Set((c.events ?? []).filter((e) => e.type === 'room').map((e) => `${e.t[0]}:${e.t[1]}:${e.name}:${e.refs?.p?.[0]}`));
  const past: DomainEvent[] = (roomOf(c).memory ?? []).filter((m) => !inLog.has(`${m.t[0]}:${m.t[1]}:${m.n}:${m.p}`))
    .map((m, i) => ({ id: `memo${i}`, t: m.t, type: 'room', name: m.n, refs: { p: [m.p] }, data: m.why ? { why: m.why } : undefined }));
  const rows = [...[...(c.events ?? [])].reverse(), ...past]
    .filter((e) => !playerId || e.refs?.p?.includes(playerId))
    .map((e) => ({ e, text: roomLine(e, g.ui, name) }))
    .filter((r): r is { e: DomainEvent; text: string } => !!r.text)
    .slice(0, max);
  if (playerId && !rows.length) return null;
  const list = (
    <ol className="rl-list">
      {rows.map(({ e, text }) => (
        <li key={e.id} className={TURN.has(e.name) ? `turn ${e.name === 'promise.kept' ? 'good' : 'bad'}` : ''}>
          <span className="rl-when">{shortDate(dateOf(e.t[0], e.t[1]), g.ui)}{e.t[0] < c.season ? ` ${String(e.t[0]).slice(2)}` : ''}</span>
          <span className="rl-what">{text}</span>
        </li>
      ))}
    </ol>
  );
  // On the player page it sits inside his panel: a plain section, not a panel in a panel.
  if (playerId) return <section className="roomlog one"><h3 className="h3">{T.titleOne}</h3>{list}</section>;
  return (
    <Panel className="roomlog" i={6} label={T.title}>
      <PanelHead title={T.title} right={<span className="eyebrow">{T.sub}</span>} />
      {!rows.length ? <p className="small muted">{T.none}</p> : (
        list
      )}
    </Panel>
  );
}

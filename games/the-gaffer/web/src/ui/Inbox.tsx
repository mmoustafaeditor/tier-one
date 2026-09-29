// Inbox: messages from the board, fans, club, cups and the coach's career. Written out in the reader's language
// when shown; the list trims itself to the last 60 (E2E #37). Mark all read and clear all, with a filter per kind.
import { useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career, Msg, MsgKind } from '../model/types';
import type { World } from '../sim/world';
import { playerOf } from '../sim/world';
import { AppBar, Empty } from './parts';

export function msgText(t: Strings, lang: Lang, w: World, c: Career, m: Msg): [string, string] {
  const club = m.club ? w.clubs.find((x) => x.id === m.club)?.name[lang] ?? '' : '';
  const player = m.player ? (playerOf(w, m.player)?.name ?? m.pn)?.[lang] ?? '' : '';
  let s = m.s ?? '';
  if (m.key === 'milestone') s = t.msNames[s] ?? s;
  if (m.key === 'course') s = t.courseNames[s] ?? s;
  if (m.kind === 'cup') s = c.cups[s]?.name[lang] ?? s;
  const f = t.msg[m.key];
  const [a, b] = f ? f({ club, player, n: m.n ?? 0, s }) : [m.key, ''];
  return [a, b];
}

const KINDS: ('all' | MsgKind)[] = ['all', 'board', 'fans', 'club', 'contract', 'offer', 'cup', 'coach', 'job'];

export function Inbox({ world, career, lang, t, onBack, onChange }: {
  world: World; career: Career; lang: Lang; t: Strings; onBack: () => void; onChange: (c: Career) => void;
}) {
  const [kind, setKind] = useState<'all' | MsgKind>('all');
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const list = career.inbox.filter((m) => (kind === 'all' || m.kind === kind)
    && (!needle || msgText(t, lang, world, career, m).join(' ').toLowerCase().includes(needle)));
  const read = (ids: Set<string>) => onChange({ ...career, inbox: career.inbox.map((m) => (ids.has(m.id) ? { ...m, read: true } : m)) });
  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.inbox} sub={`${career.inbox.filter((m) => !m.read).length}`} />
      <div className="g-chips">
        {KINDS.filter((k) => k === 'all' || career.inbox.some((m) => m.kind === k)).map((k) => (
          <button key={k} className={`chip g-toggle${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>{t.inboxKinds[k]}</button>
        ))}
      </div>
      <input className="g-input g-search" style={{ width: '100%', marginTop: 'var(--s3)' }} placeholder={t.searchT} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="g-filters" style={{ margin: 'var(--s3) 0' }}>
        <button className="btn sm" onClick={() => read(new Set(career.inbox.map((m) => m.id)))}>{t.markAllRead}</button>
        <button className="btn sm ghost" onClick={() => onChange({ ...career, inbox: [] })}>{t.clearAll}</button>
      </div>
      {!list.length ? <Empty text={t.noMsgs} /> : (
        <div className="list">
          {list.map((m) => {
            const [title, body] = msgText(t, lang, world, career, m);
            return (
              <button key={m.id} className={`cell g-msg${m.read ? '' : ' unread'}`} onClick={() => read(new Set([m.id]))}>
                <span className="g-msg-dot" />
                <span className="cmain"><b>{title}</b><span>{body}</span><small className="muted">{t.season(m.season)} · {t.matchday(m.round + 1)}</small></span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

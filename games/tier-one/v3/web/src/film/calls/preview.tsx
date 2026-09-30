// Dev-only preview of the call films (never in a build: CallScene imports this behind import.meta.env.DEV).
//   ?callfilm=barber|kitman|physio|spotter|agent|leak  [&short=1] [&r=0..3] [&lang=ar]
//   ?postfilm=1 | hwg | ut                              [&s=0..2] [&o=0..3] [&lang=ar]
// The film replays a moment after it closes.
import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import worldJson from '../../data/world.json';
import { RULES, type World, type CastSaga, type Clue } from '../../lib/engine';
import { update } from '../../lib/save';
import { CallScene } from '../../ui/CallScene';
import { PostScene } from '../../ui/PostScene';

const q = new URLSearchParams(location.search);
const cf = q.get('callfilm'), pf = q.get('postfilm');
if (cf || pf) {
  const lang = q.get('lang');
  update((s) => {
    if (lang === 'en' || lang === 'ar' || lang === 'es') s.lang = lang;
    if (cf) s.scenes = { ...(s.scenes || {}), [cf]: q.get('short') ? Date.now() : 0 };
  });
  const W = worldJson as unknown as World;
  const player = W.players.find((p) => p.id === (q.get('p') || 'p-martin-odegaard')) || W.players[0];
  const from = W.clubs.find((c) => c.id === player.c) || W.clubs[0];
  const to = W.clubs.find((c) => c.id === (q.get('to') || 'esp-real-madrid')) || W.clubs.find((c) => c.id !== from.id)!;
  const cast: CastSaga = { i: 0, player, from, to };
  const Host = () => {
    const [k, setK] = useState(0);
    const again = () => setTimeout(() => setK((n) => n + 1), 900);
    if (k < 0) return null;
    if (cf) {
      const clue: Clue = { src: cf, day: 1, r: Number(q.get('r') || 0), era: 0 };
      return createElement(CallScene, { key: k, src: cf, clue, c: cast, R: RULES, mode: 'practice', onDone: again });
    }
    const hwg = pf === 'hwg', ut = pf === 'ut';
    return createElement(PostScene, { key: k, c: cast, o: hwg ? 0 : Number(q.get('o') || 0), s: hwg ? 2 : Number(q.get('s') || 1), ut, prev: ut ? { o: 1, s: 1 } : null, onDone: again });
  };
  const el = document.createElement('div'); el.id = 't1-callfilm-preview'; document.body.appendChild(el);
  createRoot(el).render(createElement(Host));
}

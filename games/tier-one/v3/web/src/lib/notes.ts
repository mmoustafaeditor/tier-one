// The bell (3.7, owner): not the feed. Only a short list of what matters, newest first, at most five:
//   a new Daily Challenge is out (until you play it) · a Transfer Market call of yours resolved · a rumour you called
//   moved a stage · now and then, something new in the Shop.
// Calls that resolve already land in the feed (lib/byline.ts recordWireResolution); the bell reads those rows. Rumour
// moves are noticed when the Wire refreshes (lib/wireData.ts → noteRumourMoves). Read state lives in save.notes.
import { update, getSave, type Save } from './save';
import { ymdUTC } from './meta';
import { newThisWeek } from './catalog';
import type { FeedItem } from './byline';

export type NoteKind = 'daily' | 'call' | 'moved' | 'shop';
export interface Note { id: string; at: number; k: NoteKind; key: string; v?: Record<string, string | number>; rid?: string; item?: string; feed?: FeedItem; tone?: 'good' | 'bad' | 'gold' }
interface NotesSave { read: string[]; moved: Note[]; stage: Record<string, string> }
declare module './save' { interface Save { notes?: NotesSave } }
const ns = (s: Save): NotesSave => (s.notes = s.notes || { read: [], moved: [], stage: {} });

export const NOTES_MAX = 5;
const CALL_KEYS = /^cn\.feed\.wire(Right|Wrong|Shield)$/;
const STAGES = ['interest', 'talks', 'bid', 'agreed'];

export function notesOf(s: Save = getSave(), now = Date.now()): Note[] {
  const out: Note[] = [];
  const today = ymdUTC();
  if (!s.daily[today]) out.push({ id: 'daily:' + today, at: Date.parse(today + 'T00:00:00Z'), k: 'daily', key: 'hub.note.daily', tone: 'gold' });
  for (const f of s.feed || []) if (f.kind === 'wire' && CALL_KEYS.test(f.key)) out.push({ id: f.id, at: f.at, k: 'call', key: f.key, feed: f, rid: f.to?.rid, tone: f.tone });
  for (const m of s.notes?.moved || []) out.push(m);
  // "New in the Shop": at most one, only in the week a look arrives.
  const fresh = newThisWeek(now)[0];
  if (fresh) out.push({ id: 'shop:' + fresh.id, at: Math.min(now, fresh.drop || now), k: 'shop', key: 'hub.note.shop', item: fresh.id });
  return out.sort((a, b) => b.at - a.at).slice(0, NOTES_MAX);
}
export const unreadNotes = (s: Save = getSave()) => { const read = s.notes?.read || []; return notesOf(s).filter((n) => !read.includes(n.id)); };
export function markNotesRead(ids: string[]) {
  if (!ids.length) return;
  update((s) => { const n = ns(s); n.read = [...new Set([...ids, ...n.read])].slice(0, 80); });
}

/** After a Wire refresh: one note when a rumour you have an open call on moves up a stage. The first sighting only
 *  records the stage (no note), so an old call never fires on a fresh device. */
export function noteRumourMoves(open: { rid: string; stage: string; p: string; c: string }[]) {
  const s = getSave(); const cur = s.notes?.stage || {};
  const moves = open.filter((x) => cur[x.rid] !== x.stage);
  if (!moves.length) return;
  update((x) => {
    const n = ns(x);
    for (const m of moves) {
      const was = n.stage[m.rid];
      n.stage[m.rid] = m.stage;
      if (!was || STAGES.indexOf(m.stage) <= STAGES.indexOf(was)) continue;
      n.moved = [{ id: 'moved:' + m.rid + ':' + m.stage, at: Date.now(), k: 'moved' as const, key: 'hub.note.moved', v: { p: m.p, s: m.stage, c: m.c }, rid: m.rid }, ...n.moved].slice(0, 10);
    }
  });
}

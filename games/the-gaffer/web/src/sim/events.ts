// The event log (V2_DESIGN §7.3). Every command the manager (or a member of staff) runs and every clock step appends a
// DomainEvent with its cause. Messages, news, staff-log lines and decisions created by that step carry its id in `ev`,
// so every card can say where it came from. Ids come from `career.tickSeq`, so replaying the same commands on the same
// seed gives the same ids.
import type { Career, DomainEvent, EvType } from '../model/types';

export const EVENTS_MAX = 3000;

export const lastEvent = (c: Career): DomainEvent | undefined => c.events?.[c.events.length - 1];

export function emit(c: Career, type: EvType, name: string, extra: Pick<DomainEvent, 'refs' | 'cause' | 'data'> = {}): { career: Career; id: string } {
  const seq = c.tickSeq ?? 0;
  const id = `s${c.season}.r${c.round}.n${seq}`;
  const ev: DomainEvent = { id, t: [c.season, c.round], type, name, ...extra };
  const events = [...(c.events ?? []), ev];
  return { career: { ...c, tickSeq: seq + 1, events: events.length > EVENTS_MAX ? events.slice(-EVENTS_MAX) : events }, id };
}

// Everything a step added to the inbox, the news and the staff log points back at the event that caused it.
export function stamp(prev: Career, next: Career, ev: string): Career {
  const tag = <T extends { ev?: string }>(before: T[] | undefined, after: T[] | undefined): T[] | undefined => {
    if (!after || after === before) return after;
    const old = new Set(before ?? []);
    let changed = false;
    const out = after.map((x) => { if (old.has(x) || x.ev) return x; changed = true; return { ...x, ev }; });
    return changed ? out : after;
  };
  const inbox = tag(prev.inbox, next.inbox);
  const news = tag(prev.news, next.news);
  const staffLog = tag(prev.staffLog, next.staffLog);
  if (inbox === next.inbox && news === next.news && staffLog === next.staffLog) return next;
  return { ...next, inbox: inbox ?? next.inbox, news, staffLog };
}

// At the end of a season the log starts over; the last few events stay so a card from the final day still resolves.
export const compactEvents = (c: Career): Career => ({ ...c, events: (c.events ?? []).slice(-100) });

// Invariant: ids are unique and increasing.
export function checkEvents(c: Career): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let last = -1;
  for (const e of c.events ?? []) {
    if (seen.has(e.id)) out.push(`event ${e.id} twice`);
    seen.add(e.id);
    const n = Number(e.id.split('.n')[1]);
    if (!(n > last)) out.push(`event ${e.id} out of order`);
    last = n;
  }
  return out;
}

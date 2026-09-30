// Moment films, raised by the game's logic (lib/byline.ts, the Wire) without pulling the film player into it.
// A moment is held here until the player is off the play surface: lib/scenes.ts drains it when Results finish
// revealing (flushDeferredScenes) or when the route leaves a window, and plays each one through the scene queue.
// `once` moments (tier ups, gold contacts, scalps) are skipped if already seen (save.film).
export type Moment = { id: string; v?: Record<string, unknown>; once?: boolean };
let held: Moment[] = [];
const subs = new Set<() => void>();
let pending = 0;

/** Raise a moment film. Safe to call inside an update() mutator: it only records the id and notifies later. */
export function moment(id: string, v?: Record<string, unknown>, once = false) {
  if (held.some((m) => m.id === id)) return;
  held.push({ id, v, once });
  if (!pending) pending = setTimeout(() => { pending = 0; subs.forEach((f) => f()); }, 0) as unknown as number;
}
export const takeMoments = (): Moment[] => held.splice(0);
export const heldMoments = () => held.length;
export function onMoment(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }

// Sound hooks. Every cue comes from the classic game's synth engine (lib/synth.ts): no files, nothing fetched.
// Off when the player mutes it; never plays before the first tap.
import SYN from './synth';
import { getSave } from './save';
import { prefersReducedMotion } from './motion';

const MAP = {
  'ui.tap': 'select', 'ui.pop': 'pop', 'page.turn': 'flip', 'sheet.open': 'whoosh',
  'stamp.done': 'stamp', 'stamp.exclusive': 'fanfare', 'stamp.fake': 'stamp', 'stamp.wrong': 'bad',
  'publish.talks': 'send', 'publish.advanced': 'stamp', 'publish.confirmed': 'boom',
  'dd.tick': 'clock', 'dd.whistle': 'whistle', 'dd.siren': 'siren', 'dd.heart': 'heartbeat',
  'phone.ring': 'ringonce', 'twist': 'twist', 'heat.up': 'pop', 'shred': 'shred',
  'good': 'good', 'bad': 'bad', 'star': 'star', 'count': 'count', 'levelup': 'levelup', 'unlock': 'unlock',
  'open': 'open', 'dayhit': 'dayhit', 'reveal': 'reveal', 'fanfare': 'fanfare', 'sad': 'sad', 'coin': 'register',
  'sparkle': 'sparkle', 'thock': 'thock', 'type': 'key', 'typewriter': 'typewriter', 'whoosh': 'whoosh',
  'scene.agent': 'agentcall', 'scene.barber': 'salon', 'scene.spotter': 'airport', 'scene.physio': 'monitor',
  'scene.kitman': 'kitman', 'scene.leak': 'fax', 'voice': 'voice',
  'publish.hwg': 'herewego', 'stop.press': 'glitch',
} as const;
export type Sfx = keyof typeof MAP;

export function sfx(name: Sfx, arg?: unknown) {
  // Publishing and stamping also buzz (where the device supports it), so every caller gets haptics for free.
  if (name.startsWith('publish.')) haptic('publish'); else if (name.startsWith('stamp.')) haptic('stamp');
  if (!getSave().sound) return;
  try { SYN.play(MAP[name], arg); } catch { /* audio unavailable */ }
}
// Mumbled phone voices, one pitch per character, so a regular caller is recognisable before the subtitle lands.
export const VOICE: Record<string, number> = { kitman: 118, barber: 142, agent: 128, spotter: 205, physio: 190, leak: 210, editor: 104, tabloid: 150, itk: 135, insider: 112 };
export function voice(who: string, dur = 1.2) { sfx('voice', { base: VOICE[who] || 150, dur }); }
export function buzz(ms: number | number[]) { try { if (!prefersReducedMotion()) navigator.vibrate?.(ms); } catch { /* */ } }

// Haptics (GOTY.md §4): short, distinct patterns. Off with Reduce motion; silently absent where vibrate isn't supported (iOS Safari, desktop).
const HAPTIC = { tap: 8, publish: [14, 50, 28], stamp: [26] } as const;
export type Haptic = keyof typeof HAPTIC;
export function haptic(kind: Haptic) { buzz(HAPTIC[kind] as number | number[]); }

// One timeline for every place (GOTY.md §10.2): the loop rests on frame 0 of the film; the pick-up beat lights the
// phone (0.6 s); the call film runs 3.5 s (a repeat call starts at SHORT: 2 s) and tells the tip in its final second
// with the outcome object as the brightest, most saturated thing in frame. All frames at 30 fps.
import type { ReactNode } from 'react';
import type { Key } from '../kit';
import type { Col } from './world';
import { k, cl } from './world';

export const FPS = 30;
/** The pick-up beat: the phone rings and lights up (18 frames = 0.6 s). */
export const PICKUP = 18;
/** The call film: last frame, where a repeat call starts, where the tell begins, the hero frame. */
export const END = 105, SHORT = 45, TELL = 60, HERO = 96;
export const OUT = { done: 0, hijack: 1, off: 2, fake: 3 } as const;

export type Phase = 'loop' | 'pickup' | 'call';
export type Words = { boarding: string; cancelled: string; gate: string; medical: string; noShow: string };
export type PlaceZ = {
  f: number; phase: Phase; o: number;
  /** The clubs: the buying club, the player's own club, the third club (hijack). */
  to: Col; from: Col; alt: Col;
  /** The source's accent (SRC_C / the leak's violet). */
  acc: string;
  /** This month and next month, from Intl (the calendar's tell). */
  month: string; next: string;
  words: Words;
};
export type Cue = { f: number; k: string };
export type PlaceSpec = {
  Scene: (z: PlaceZ) => ReactNode;
  /** Camera keyframes for the film (frame 0 is the loop's framing; the last one frames the hero). */
  cam: (o: number) => Key[];
  cues: (o: number) => Cue[];
};

/** The phone's screen: dark in the loop, ringing up in the pick-up, lit through the call until the tell takes the light. */
export function phoneLit(z: PlaceZ): number {
  if (z.phase === 'loop') return 0;
  if (z.phase === 'pickup') { const on = k(z.f, 1, 6); return on * (0.72 + 0.28 * Math.abs(Math.sin(z.f * 0.9))); }
  if (z.o === OUT.hijack) return 1;
  return 1 - 0.65 * k(z.f, TELL + 4, TELL + 22);
}
/** The phone's shiver while it rings (pick-up only). */
export const phoneBuzz = (z: PlaceZ) => (z.phase === 'pickup' ? cl(z.f / 4) * (1 - k(z.f, 13, 18)) * z.f : 0);
/** 0 before the tell, 1 at the hero frame: the bloom on the outcome object. */
export const bloom = (z: PlaceZ) => (z.phase === 'call' ? k(z.f, TELL + 10, HERO - 6) : 0);

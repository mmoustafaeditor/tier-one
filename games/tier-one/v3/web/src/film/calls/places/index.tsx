// The six places (GOTY.md §10): one drawn set per source, shared by the ambient loop (CSS-animated, `live`) and the
// call film (frame-driven). `PlaceView` frames a place through its camera, mirrored for RTL, and fits any stage.
import type { ReactNode } from 'react';
import { camAt } from '../../kit';
import { barber } from './barber';
import { kitman } from './bootroom';
import { physio } from './treatment';
import { spotter } from './airport';
import { agent } from './car';
import { leak } from './office';
import { LiveCtx, MirrorCtx, type Col } from './world';
import type { PlaceSpec, PlaceZ, Words, Phase } from './spec';
import './places.css';

export const PLACES: Record<string, PlaceSpec> = { kitman, barber, agent, spotter, physio, leak };
export const placeOf = (src: string) => PLACES[src] || PLACES.leak;
export const LEAK_C = '#A77BFF';
const SRC_ACC: Record<string, string> = { kitman: '#2FBF71', barber: '#FF9A1F', agent: '#F7B928', spotter: '#35C3E6', physio: '#FF5A7A' };
export const accentOf = (src: string) => SRC_ACC[src] || LEAK_C;

/** This month and next, in the game's language (the calendar tell). */
export function monthsOf(lang: string, d = new Date()): { month: string; next: string } {
  const fmt = (x: Date) => { try { return new Intl.DateTimeFormat(lang, { month: 'long' }).format(x); } catch { return x.toDateString().slice(4, 7); } };
  return { month: fmt(d), next: fmt(new Date(d.getFullYear(), d.getMonth() + 1, 1)) };
}
export const HOUSE = { from: { c1: '#C9381A', c2: '#F4EFE4' }, to: { c1: '#1B4FD8', c2: '#F7B928' }, alt: { c1: '#6B3FA0', c2: '#F7B928' } };
export const WORDS_EN: Words = { boarding: 'BOARDING', cancelled: 'CANCELLED', gate: 'DEPARTURES', medical: 'MEDICAL', noShow: 'NO SHOW' };

export type PlaceProps = { src: string; f: number; phase: Phase; o: number; to: Col; from: Col; alt: Col; words: Words; month: string; next: string };
export function placeZ(p: PlaceProps): PlaceZ {
  return { f: p.f, phase: p.phase, o: p.o, to: p.to, from: p.from, alt: p.alt, acc: accentOf(p.src), month: p.month, next: p.next, words: p.words };
}

/**
 * The place through its camera. `camF` is the camera's frame (the film's clock); `portrait` zooms in so the action reads
 * on a phone; `live` renders the loop (CSS-animated parts, the camera's rest framing with a slow push by CSS).
 */
export function PlaceView({ spec, z, camF, rtl, portrait, live, className, children }: { spec: PlaceSpec; z: PlaceZ; camF: number; rtl?: boolean; portrait?: boolean; live?: boolean; className?: string; children?: ReactNode }) {
  const cam = camAt(camF, spec.cam(z.o));
  const zoom = cam.z * (portrait ? 1.55 : 1);
  const M = rtl ? -1 : 1;
  return <svg className={className || 'cf'} viewBox="200 0 1200 900" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <LiveCtx.Provider value={!!live}><MirrorCtx.Provider value={M}>
      <g transform={M < 0 ? 'matrix(-1 0 0 1 1600 0)' : undefined}>
        <g className={live ? 'lp lp-push' : undefined}>
          <g transform={`translate(800 ${portrait ? 430 : 450}) scale(${zoom}) translate(${-cam.x} ${-cam.y})`}>
            <spec.Scene {...z} />
          </g>
        </g>
      </g>
      {children}
    </MirrorCtx.Provider></LiveCtx.Provider>
  </svg>;
}

// Sound hooks (LOOK.md §4), synthesised with WebAudio: no files, nothing fetched. Every hook is named like the
// data-sfx attributes in the mockups. Off when the player mutes it; never plays before the first tap.
import { getSave } from './save';

let ctx: AudioContext | null = null;
function ac() {
  if (!getSave().sound) return null;
  try { ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; } catch { return null; }
}
function noise(a: AudioContext, dur: number, gain: number, freq: number, q = 0.8, when = 0) {
  const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.value = gain;
  s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + when);
}
function tone(a: AudioContext, f0: number, f1: number, dur: number, gain: number, type: OscillatorType = 'sine', when = 0) {
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + when;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
export type Sfx = 'ui.tap' | 'page.turn' | 'stamp.done' | 'stamp.exclusive' | 'stamp.fake' | 'stamp.wrong' | 'publish.talks' | 'publish.advanced' | 'publish.confirmed' | 'dd.tick' | 'dd.whistle' | 'phone.ring' | 'twist' | 'heat.up';
export function sfx(name: Sfx) {
  const a = ac(); if (!a) return;
  switch (name) {
    case 'ui.tap': tone(a, 1800, 1200, 0.025, 0.04, 'square'); break;
    case 'page.turn': noise(a, 0.28, 0.18, 2400, 0.6); break;
    case 'stamp.done': case 'stamp.fake': case 'stamp.wrong':
      tone(a, 140, 55, 0.18, 0.5); noise(a, 0.09, 0.35, 900, 1.2); if (name === 'stamp.wrong') tone(a, 220, 180, 0.35, 0.08, 'sawtooth', 0.05); break;
    case 'stamp.exclusive': tone(a, 150, 50, 0.22, 0.6); noise(a, 0.12, 0.45, 800, 1); tone(a, 660, 660, 0.5, 0.06, 'triangle', 0.12); tone(a, 990, 990, 0.6, 0.05, 'triangle', 0.2); break;
    case 'publish.talks': tone(a, 420, 300, 0.08, 0.12, 'triangle'); noise(a, 0.05, 0.1, 3000); break;
    case 'publish.advanced': tone(a, 200, 80, 0.12, 0.3); noise(a, 0.07, 0.2, 1500); break;
    case 'publish.confirmed': tone(a, 130, 45, 0.2, 0.55); noise(a, 0.11, 0.4, 900); break;
    case 'dd.tick': tone(a, 1000, 1000, 0.04, 0.12, 'square'); break;
    case 'dd.whistle': tone(a, 2600, 2400, 0.25, 0.12, 'sine'); tone(a, 2600, 2350, 0.6, 0.12, 'sine', 0.32); break;
    case 'phone.ring': tone(a, 440, 440, 0.12, 0.05, 'sine'); tone(a, 480, 480, 0.12, 0.05, 'sine', 0.16); break;
    case 'twist': tone(a, 90, 60, 0.6, 0.3, 'sawtooth'); noise(a, 0.3, 0.2, 400); break;
    case 'heat.up': tone(a, 500, 900, 0.12, 0.06, 'triangle'); break;
  }
}
// Haptics where the device has them (Android WebView, most phones).
export function buzz(ms: number | number[]) { try { if (!getSave().reduced) navigator.vibrate?.(ms); } catch { /* */ } }

// Match sounds, synthesised with WebAudio (no files): a crowd roar and horn for goals, the referee's whistle, the
// "ooh" of a big chance. Only ever played after the user has tapped (the browser's rule), and switchable off.
let ctx: AudioContext | null = null;
const KEY = 'gaffer.sound';
export const soundOn = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
export const setSound = (on: boolean) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode */ } };

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function noise(a: AudioContext, dur: number, from: number, to: number, peak: number, attack: number) {
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.7;
  f.frequency.setValueAtTime(from, a.currentTime); f.frequency.linearRampToValueAtTime(to, a.currentTime + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(peak, a.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(); src.stop(a.currentTime + dur);
}
function tone(a: AudioContext, freq: number, at: number, dur: number, vol: number, type: OscillatorType = 'sine', vib = 0) {
  const o = a.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, a.currentTime + at);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur);
  if (vib) {
    const l = a.createOscillator(); l.frequency.value = 28; const lg = a.createGain(); lg.gain.value = vib;
    l.connect(lg).connect(o.frequency); l.start(a.currentTime + at); l.stop(a.currentTime + at + dur);
  }
  o.connect(g).connect(a.destination); o.start(a.currentTime + at); o.stop(a.currentTime + at + dur + 0.05);
}

export function sfx(kind: 'goal' | 'whistle' | 'chance' | 'card') {
  if (!soundOn()) return;
  const a = audio();
  if (!a) return;
  try {
    if (kind === 'goal') { noise(a, 2.4, 500, 1400, 0.22, 0.35); tone(a, 523, 0.05, 0.35, 0.05, 'triangle'); tone(a, 784, 0.18, 0.6, 0.05, 'triangle'); }
    if (kind === 'whistle') { tone(a, 2900, 0, 0.28, 0.035, 'sine', 90); tone(a, 2900, 0.36, 0.5, 0.035, 'sine', 90); }
    if (kind === 'chance') noise(a, 0.9, 300, 700, 0.1, 0.2);
    if (kind === 'card') tone(a, 2900, 0, 0.45, 0.03, 'sine', 60);
  } catch { /* audio refused: silent */ }
}

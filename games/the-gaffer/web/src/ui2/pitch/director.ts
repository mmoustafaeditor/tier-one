// The director (plan "محرك ماتش FM26", phase 4). The engine decides a whole minute before the pitch shows it, and since
// foundation step 3 it says when each action happens (flow `t`, seconds into the minute). The director:
//   1. times the minute's beats by the engine's own clock instead of spreading them evenly, keeping every beat long
//      enough to be seen (set pieces need time for players to take their spots);
//   2. lets players read what is coming: the beats due within the next moments, so a full-back starts his overlap
//      before the ball goes wide and a defender is in the shooting lane before the shot, as in FM, where players
//      anticipate from what they see rather than reacting only once the ball arrives.
export interface Timed { at?: number } // engine seconds into the minute (missing: placed between its neighbours)

// When each beat starts (ms into the minute). `w` = each beat's weight (1 ordinary, more for a set piece).
export function timeBeats(beats: Timed[], w: number[], msPerMinute: number, engineClock = true): number[] {
  const n = beats.length;
  if (!n) return [];
  const even = msPerMinute / Math.max(1, w.reduce((t, x) => t + x, 0));
  const evenStarts = w.map((_, i) => w.slice(0, i).reduce((t, x) => t + x, 0) * even);
  const span = msPerMinute * 0.94; // the last beat still has a moment to play out
  // The engine's times (seconds of play, up to 60) on the display clock; beats without one sit between neighbours.
  const s: (number | undefined)[] = beats.map((b) => (b.at === undefined ? undefined : (Math.max(0, Math.min(60, b.at)) / 60) * span));
  for (let i = 0; i < n; i++) {
    if (s[i] !== undefined) continue;
    let j = i; while (j < n && s[j] === undefined) j++;
    const lo = i ? s[i - 1]! : 0, hi = j < n ? s[j]! : span;
    for (let k = i; k < j; k++) s[k] = lo + ((hi - lo) * (k - i + 1)) / (j - i + 1);
    i = j - 1;
  }
  // Every beat gets at least part of its even share (more for a set piece): push later beats back where needed.
  const need = w.map((x) => x * even * 0.55);
  const out = s as number[];
  out[0] = Math.max(0, Math.min(out[0], msPerMinute * 0.3));
  for (let i = 1; i < n; i++) out[i] = Math.max(out[i], out[i - 1] + need[i - 1]);
  // Too much to fit in the minute: the even spread (the old timing) is the fallback.
  if (!engineClock || out[n - 1] + need[n - 1] > msPerMinute) return evenStarts;
  return out;
}

// The beats due from now until `within` ms ahead (index into the minute's beats, and how soon).
export function upcoming<B>(beats: B[], starts: number[], from: number, clock: number, within: number): { b: B; i: number; in: number }[] {
  const out: { b: B; i: number; in: number }[] = [];
  for (let i = from; i < beats.length; i++) {
    const dt = (starts[i] ?? Infinity) - clock;
    if (dt > within) break;
    out.push({ b: beats[i], i, in: Math.max(0, dt) });
  }
  return out;
}

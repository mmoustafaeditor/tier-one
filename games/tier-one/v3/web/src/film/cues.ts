// Scene timing shared by the game player and the film project: length, skip beats and sound cues, all in frames at 30 fps.
// A cue names a cue of the synth engine (lib/synth.ts); the game plays it live, the film project bakes it to a WAV.
export type Cue = { f: number; k: string; a?: unknown };
/** `hold`: ms the last frame stays up before the scene ends (default 900). */
export type SceneMeta = { dur: number; beats: number[]; cues: Cue[]; hold?: number };
export const FPS = 30;

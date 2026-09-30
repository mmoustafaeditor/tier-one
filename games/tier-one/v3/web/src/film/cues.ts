// Scene timing shared by the game player and the film project: length, skip beats and sound cues, all in frames at 30 fps.
// A cue names a cue of the synth engine (lib/synth.ts); the game plays it live, the film project bakes it to a WAV.
export type Cue = { f: number; k: string; a?: unknown };
export type SceneMeta = { dur: number; beats: number[]; cues: Cue[] };
export const FPS = 30;

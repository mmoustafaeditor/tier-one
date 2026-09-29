// Tier One v3 rules engine: moved to api/tier-one/v3/_lib/engine.mjs so the Daily server (Vercel function) and the
// web app (games/tier-one/v3/web) run the exact same file. This re-export keeps DESIGN.md's references working.
export * from '../../../../api/tier-one/v3/_lib/engine.mjs';

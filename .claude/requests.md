# Open requests between teammates

The session hook shows every request below at the start of each Claude Code session.
Claude: tell the user about each one before starting their task, and say who it is for.
When the person it's for says it's done, delete that request here and log it in `UPDATES.md`.

Template:

```markdown
## YYYY-MM-DD · from <github user> → for <github user> · <short title>
<what to do, why, links>
```

<!-- requests start -->

## 2026-09-30 · from saifsaber → for mmoustafaeditor · OK to merge Saif's proposal files (docs only)
Branch `ccr-692b713a-3z28u5` adds `games/tier-one/SAIF_IMPROVEMENTS.md` (4 Tier One proposals, all `Proposed`),
`games/the-gaffer/SAIF_IMPROVEMENTS.md` (empty) and `CLAUDE.md` › 1c so your sessions show Saif's open proposals for the
game you're working on and ask before including any. No game code changes. It touches `games/tier-one/`, so it needs your
OK before `main`. Merging runs the Tier One APK build and The Gaffer build/deploy workflow. Then decide on each proposal.

## 2026-09-28 · from saifsaber → for mmoustafaeditor · Vercel deploy hook for The Gaffer's live updates
The Gaffer's workflow publishes each build to `main` as github-actions[bot], and Vercel skips commits from outside your team.
Please create a deploy hook (Vercel › tier-one › Settings › Git › Deploy Hooks, branch `main`) and save its URL as the GitHub
Actions secret `VERCEL_DEPLOY_HOOK` (repo Settings › Secrets and variables › Actions). Details: `games/the-gaffer/README.md` › Live updates.

## 2026-09-28 · from saifsaber → for mmoustafaeditor · OK to publish The Gaffer on sembagames.app?
The Gaffer (game 02) is ready on branch `ccr-dc1851aa-6gusor`. It adds new files only: `the-gaffer/`, `games/the-gaffer/`,
`api/the-gaffer/`, `downloads/TheGaffer.apk`, `vercel.json`, `design/` (a few shared files). No Tier One files change.
Because it adds files under `api/` and `downloads/`, it needs your OK before it goes to `main`. If you say yes: merge the branch
into `main` and push it yourself so Vercel deploys it. Then check sembagames.app/the-gaffer and /api/the-gaffer/latest.
The branch now also has The Gaffer 0.12.0 (manager overhaul, see `UPDATES.md`) and `api/the-gaffer/verify-purchase.js`
for its optional Supporter pack. That file is off until `MONET.supporterUrl` is set.

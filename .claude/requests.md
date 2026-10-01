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

## 2026-09-28 · from saifsaber → for mmoustafaeditor · Vercel deploy hook for The Gaffer's live updates
The Gaffer's workflow publishes each build to `main` as github-actions[bot], and Vercel skips commits from outside your team.
Please create a deploy hook (Vercel › tier-one › Settings › Git › Deploy Hooks, branch `main`) and save its URL as the GitHub
Actions secret `VERCEL_DEPLOY_HOOK` (repo Settings › Secrets and variables › Actions). Details: `games/the-gaffer/README.md` › Live updates.


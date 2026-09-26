#!/usr/bin/env bash
# SessionStart hook: shows Claude (and you) what the rest of the team changed
# before any work starts. Output is added to the session context. Never fails.
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" 2>/dev/null || exit 0

echo "=== TEAM SYNC (Semba Studios) ==="
# Only warn inside a clone of the retired repo, not in the team repo itself.
case "$(git remote get-url origin 2>/dev/null)" in
  *saifsaber/tier-one*) echo "⛔ This repo (saifsaber/tier-one) is RETIRED. The team works in mmoustafaeditor/tier-one. Do not make changes here." ;;
esac
if git rev-parse --git-dir >/dev/null 2>&1; then
  timeout 20 git fetch --quiet origin 2>/dev/null
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  echo "Current branch: $branch"
  for ref in origin/main "origin/$branch"; do
    git rev-parse --verify --quiet "$ref" >/dev/null || continue
    behind=$(git rev-list --count "HEAD..$ref" 2>/dev/null)
    if [ "${behind:-0}" -gt 0 ]; then
      echo ""
      echo "⚠️  $ref has $behind commit(s) that are NOT in your checkout yet (teammate updates?):"
      git log --format='  %h %ad %an: %s' --date=short "HEAD..$ref" | head -20
      echo "  → Pull/merge these before editing, and tell the user what changed."
    fi
  done
  # Is the latest main live on the site? Vercel blocks commits from accounts outside its team.
  main_sha=$(git rev-parse --verify --quiet origin/main 2>/dev/null)
  if [ -n "$main_sha" ]; then
    vstatus=$(timeout 8 curl -fsS "https://api.github.com/repos/mmoustafaeditor/tier-one/commits/$main_sha/status" 2>/dev/null)
    if printf '%s' "$vstatus" | grep -q "Deployment was blocked"; then
      echo ""
      echo "🚫 The latest main (${main_sha:0:7}) is NOT live on sembagames.app: Vercel blocked its deploy."
      echo "  → Tell the user. mmoustafaeditor fixes it by pushing to main, or at"
      echo "    https://vercel.com/semba-game-studios/tier-one/deployments → latest main deployment → ⋯ → Redeploy."
    fi
  fi
  echo ""
  echo "Last 8 commits on this branch:"
  git log -8 --format='  %h %ad %an: %s' --date=short
fi

# Open requests between teammates (.claude/requests.md), read from origin/main so a stale checkout still sees them.
requests=$(git show origin/main:.claude/requests.md 2>/dev/null || cat .claude/requests.md 2>/dev/null)
requests=$(printf '%s\n' "$requests" | awk 'f; /<!-- requests start -->/{f=1}' | sed '/./,$!d')
if [ -n "$requests" ]; then
  echo ""
  echo "📌 OPEN REQUESTS FROM TEAMMATES (.claude/requests.md) — tell the user about these FIRST, and say who each is for:"
  printf '%s\n' "$requests"
  echo "  → When the person it's for confirms it's done, delete it from .claude/requests.md and log it in UPDATES.md."
fi

if [ -f UPDATES.md ]; then
  echo ""
  echo "Latest entries in UPDATES.md (newest first):"
  awk '/^## [0-9]{4}-/{n++} n>=1 && n<=3' UPDATES.md
fi
echo ""
echo "Reminder: summarize anything new from teammates for the user, and add an UPDATES.md entry for your own changes before you push."
exit 0

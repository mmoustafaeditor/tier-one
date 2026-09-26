#!/usr/bin/env bash
# SessionStart hook: shows Claude (and you) what the rest of the team changed
# before any work starts. Output is added to the session context. Never fails.
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" 2>/dev/null || exit 0

echo "=== TEAM SYNC (Semba Studios) ==="
echo "⛔ This repo (saifsaber/tier-one) is RETIRED. The team works in mmoustafaeditor/tier-one. Do not make changes here."
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
  echo ""
  echo "Last 8 commits on this branch:"
  git log -8 --format='  %h %ad %an: %s' --date=short
fi

if [ -f UPDATES.md ]; then
  echo ""
  echo "Latest entries in UPDATES.md (newest first):"
  awk '/^## [0-9]{4}-/{n++} n>=1 && n<=3' UPDATES.md
fi
echo ""
echo "Reminder: summarize anything new from teammates for the user, and add an UPDATES.md entry for your own changes before you push."
exit 0

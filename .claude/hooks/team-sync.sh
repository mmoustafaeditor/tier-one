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
  # Owner policy (CLAUDE.md §1b): the site is shared, the game is mmoustafaeditor's. Classify what teammates changed.
  if git rev-parse --verify --quiet origin/main >/dev/null; then
    since=$(git merge-base HEAD origin/main 2>/dev/null)
    # Everyone's Claude sessions commit as "Claude", so don't filter by author: anything not in this checkout is a teammate's.
    mates=$(git log --format='%h|%an|%ae|%s' --date=short "${since:-HEAD}..origin/main" 2>/dev/null)
    if [ -n "$mates" ]; then
      echo ""
      echo "👥 TEAMMATE CHANGES ON origin/main — tell the user about EVERY one of these, site changes included:"
      printf '%s\n' "$mates" | while IFS='|' read -r h an ae s; do
        files=$(git diff-tree --no-commit-id --name-only -r "$h" 2>/dev/null)
        if printf '%s\n' "$files" | grep -qE '^(tier-one/|games/tier-one/|api/|downloads/)'; then
          kind="🎮 GAME change — needs mmoustafaeditor's OK (was it approved? if not, ask him: keep or revert)"
        else
          kind="🌐 site change — allowed, no approval needed"
        fi
        echo "  $h $an: $s"
        echo "     $kind"
        printf '%s\n' "$files" | sed 's/^/     - /' | head -12
      done
    fi
    # Teammate branches on origin that are ahead of main (work in progress / waiting for approval).
    for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin 2>/dev/null | grep -vE '^origin/(main|HEAD)$'); do
      ahead=$(git rev-list --count "origin/main..$b" 2>/dev/null); [ "${ahead:-0}" -gt 0 ] || continue
      [ "$b" = "origin/$branch" ] && continue
      who=$(git log -1 --format='%an' "$b" 2>/dev/null)
      touched=$(git diff --name-only "origin/main...$b" 2>/dev/null)
      if printf '%s\n' "$touched" | grep -qE '^(tier-one/|games/tier-one/|api/|downloads/)'; then k="🎮 GAME (needs approval before main)"; else k="🌐 site (free to merge)"; fi
      echo "  ⤷ branch $b by $who: $ahead commit(s) ahead of main — $k"
    done
  fi
  # Open pull requests (public API; silent if it fails).
  prs=$(timeout 8 curl -fsS "https://api.github.com/repos/mmoustafaeditor/tier-one/pulls?state=open&per_page=10" 2>/dev/null | grep -E '"(title|login|html_url)"' | sed 's/^ *//' | paste - - - 2>/dev/null)
  if [ -n "$prs" ]; then
    echo ""
    echo "🔀 OPEN PULL REQUESTS — tell the user; a PR touching tier-one/, games/tier-one/, api/ or downloads/ needs mmoustafaeditor's OK:"
    printf '%s\n' "$prs" | head -10 | sed 's/^/  /'
  fi
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

# Saif's work and proposals for mmoustafaeditor (CLAUDE.md § 1c). Read from origin/main so a stale checkout still sees them.
updates=$(git show origin/main:UPDATES.md 2>/dev/null || cat UPDATES.md 2>/dev/null)
saif=$(printf '%s\n' "$updates" | awk '
  /^## [0-9]{4}-[0-9]{2}-[0-9]{2} · / { if ($0 ~ / · mmoustafaeditor · /) exit; keep = ($0 ~ / · saifsaber · /); if (keep) print "  " substr($0, 4); next }
  keep && /^- \*\*(Files|Heads-up for the team):\*\*/ { print "     " substr($0, 3) }')
if [ -n "$saif" ]; then
  echo ""
  echo "🧑‍💻 SAIF'S UPDATES since mmoustafaeditor's last UPDATES.md entry (newest first; details in UPDATES.md):"
  printf '%s\n' "$saif" | cut -c1-400
fi
for g in tier-one:"Tier One" the-gaffer:"The Gaffer"; do
  f="games/${g%%:*}/SAIF_IMPROVEMENTS.md"
  open=$( (git show "origin/main:$f" 2>/dev/null || cat "$f" 2>/dev/null) | grep -E '^\| [A-Z]+-SAIF-[0-9]+ \|.*\| (Proposed|Approved|In Progress) \|$')
  [ -n "$open" ] || continue
  echo ""
  echo "💡 SAIF'S OPEN PROPOSALS — ${g#*:} ($f):"
  printf '%s\n' "$open" | sed 's/^| /  /; s/ |$//; s/ | / — /g'
done
if [ -n "$saif" ] || git show origin/main:games/tier-one/SAIF_IMPROVEMENTS.md >/dev/null 2>&1; then
  echo "  → Working for mmoustafaeditor: before starting his task, tell him what Saif updated and what Saif recommends"
  echo "    for the game he is working on (CLAUDE.md § 1c), then ask whether to include any proposals."
fi

if [ -f UPDATES.md ]; then
  echo ""
  echo "Latest entries in UPDATES.md (newest first):"
  awk '/^## [0-9]{4}-/{n++} n>=1 && n<=3' UPDATES.md
fi
echo ""
echo "Reminder: summarize anything new from teammates for the user, and add an UPDATES.md entry for your own changes before you push."
exit 0

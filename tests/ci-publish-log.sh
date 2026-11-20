#!/usr/bin/env bash
# CI-only helper: pushes a test log to the throw-away `ci-results` branch.
# Never touches main or the audit branch. Silently does nothing elsewhere.
set -uo pipefail

LOG="${1:-}"
[ -n "$LOG" ] && [ -f "$LOG" ] || exit 0
[ "${GITHUB_ACTIONS:-}" = "true" ] || exit 0
[ "${GITHUB_HEAD_REF:-}" = "audit-reparation-gestilys" ] || exit 0

SHA="${PR_HEAD_SHA:-$(git rev-parse HEAD)}"
blob="$(git hash-object -w "$LOG")" || exit 0
tree="$(printf '100644 blob %s\tlatest-test-log.txt\n' "$blob" | git mktree)" || exit 0
commit="$(git -c user.name='ci-results' -c user.email='ci-results@users.noreply.github.com' \
  commit-tree "$tree" -m "test log for run ${GITHUB_RUN_ID:-?} (merge ${SHA})")" || exit 0

if git push --force origin "$commit:refs/heads/ci-results" > /dev/null 2>&1; then
  echo "Published test log to branch ci-results"
else
  echo "Could not publish test log (token is probably read-only)"
fi
exit 0

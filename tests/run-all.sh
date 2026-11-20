#!/usr/bin/env bash
# Runs every mandatory test stage (never stops at the first failure), writes a
# per-stage diagnostic to the GitHub Actions job summary, and exits non-zero if
# ANY mandatory stage failed. Nothing here can turn a failing test into a pass.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/summary.sh
source "$here/lib/summary.sh"

SUMMARY_DIR="$(mktemp -d)"
export SUMMARY_DIR
: > "$SUMMARY_DIR/rows.md"
: > "$SUMMARY_DIR/blocks.md"
LOG="$(mktemp)"
overall=0

flush_summary() {
  {
    echo "## Diagnostic de \`npm test\`"
    echo
    if [ "$overall" -eq 0 ]; then
      echo "**Verdict : tous les tests obligatoires ont réussi.**"
    else
      echo "**Verdict : au moins un test obligatoire a échoué (\`npm test\` retourne un code d'erreur ; \`npm run build\` est donc ignoré).**"
    fi
    echo
    echo "| Étape | Résultat | Détail |"
    echo "|---|---|---|"
    cat "$SUMMARY_DIR/rows.md"
    cat "$SUMMARY_DIR/blocks.md"
  } >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
}

run_stage() { # label, command...  -> sets $stage_status and $stage_out
  local label="$1"; shift
  local out
  echo "### $label" | tee -a "$LOG"
  out="$("$@" 2>&1)"
  stage_status=$?
  printf '%s\n' "$out" | tee -a "$LOG"
  stage_out="$out"
}

echo "### node $(node --version) | npm $(npm --version) | $(date -u +%FT%TZ)" | tee -a "$LOG"
summary_row "Environnement" "ℹ️" "node $(node --version), npm $(npm --version)"

# 1. Dependencies (npm ci runs in the workflow just before; we verify its result)
if [ -d node_modules ] && [ -x node_modules/.bin/vite ] && [ -x node_modules/.bin/tsc ]; then
  summary_row "Installation des dépendances (npm ci)" "✅" "node_modules présent (vite, tsc disponibles)"
else
  summary_row "Installation des dépendances (npm ci)" "❌" "node_modules incomplet : vite ou tsc manquant"
  overall=1
fi

# 2. Student import tests (pre-existing suite)
run_stage "student-import test" node tests/student-import.test.mjs
if [ "$stage_status" -eq 0 ]; then
  summary_row "Tests d'import des élèves" "✅" "tests/student-import.test.mjs"
else
  summary_row "Tests d'import des élèves" "❌" "code de sortie $stage_status"
  summary_block "Sortie des tests d'import" "$stage_out"
  overall=1
fi

# 3. Edge Function admin-auth guard
run_stage "edge function admin auth guard" node tests/edge-function-auth.static.test.mjs
if [ "$stage_status" -eq 0 ]; then
  summary_row "Edge Function scolaria-admin : garde d'authentification" "✅" "tests/edge-function-auth.static.test.mjs"
else
  summary_row "Edge Function scolaria-admin : garde d'authentification" "❌" "voir le détail ci-dessous"
  summary_block "Sortie du test d'authentification Edge Function" "$stage_out"
  overall=1
fi

# 4. PostgreSQL + migrations replay + security scenarios (rows added by the scripts).
# A hard timeout turns any hang into a reported failure instead of a stuck job.
echo "### security DB tests" | tee -a "$LOG"
timeout 900 bash tests/security/run-ephemeral.sh 2>&1 | tee -a "$LOG"
security_status=${PIPESTATUS[0]}
if [ "$security_status" -ne 0 ]; then
  overall=1
  if [ "$security_status" -eq 124 ]; then
    summary_row "Tests de sécurité base de données" "❌" "délai maximum de 900 s dépassé (blocage)"
  fi
fi

echo "### exit status: $overall" | tee -a "$LOG"
flush_summary
bash tests/ci-publish-log.sh "$LOG" || true

exit "$overall"

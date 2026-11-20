#!/usr/bin/env bash
# Replays every committed Supabase migration on a throw-away PostgreSQL database
# (with a minimal Supabase-like stub) and runs the security scenarios.
#
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bash tests/security/run.sh
#   bash tests/security/run-ephemeral.sh      # starts its own temporary PostgreSQL
#
# NEVER point DATABASE_URL at a real Supabase project: the script creates roles,
# fixtures and replays all migrations.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required (throw-away database only)}"

case "$DATABASE_URL" in
  *supabase.co*|*supabase.com*|*pooler.supabase*)
    echo "Refusing to run against a Supabase-hosted database." >&2
    exit 2
    ;;
esac

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/summary.sh
source "$here/../lib/summary.sh"

PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)

echo "== Preparing Supabase-like stub =="
if ! err=$("${PSQL[@]}" -f tests/security/00_supabase_stub.sql 2>&1 > /dev/null); then
  echo "$err" >&2
  summary_row "Environnement Supabase simulé (rôles, auth.*)" "❌" "$err"
  summary_block "Erreur du stub Supabase" "$err"
  echo "::error::Supabase stub failed -- ${err//$'\n'/ | }"
  exit 1
fi

echo "== Replaying migrations =="
count=0
for f in $(ls supabase/migrations/*.sql | LC_ALL=C sort); do
  "${PSQL[@]}" -c "SELECT test_support.apply_known_schema_drift()" > /dev/null
  echo "applying $f"
  if ! err=$("${PSQL[@]}" -f "$f" 2>&1 > /dev/null); then
    echo "$err" >&2
    summary_row "Rejeu des migrations sur une base vide" "❌" "échec sur $f après $count migration(s) réussie(s) : $err"
    summary_block "Erreur de migration : $f" "$err"
    echo "::error::Migration failed on a clean database: $f -- ${err//$'\n'/ | }"
    exit 1
  fi
  count=$((count + 1))
done
"${PSQL[@]}" -c "SELECT test_support.apply_known_schema_drift()" > /dev/null
summary_row "Rejeu des migrations sur une base vide" "✅" "$count fichiers rejoués sans erreur (colonnes absentes des migrations ajoutées par le banc de test)"

echo "== Running security scenarios =="
LOG="$(mktemp)"
overall=0
for t in tests/security/[0-9][0-9]_*.test.sql; do
  echo "-- $t"
  set +e
  "${PSQL[@]}" -f "$t" 2>&1 | tee -a "$LOG"
  st=${PIPESTATUS[0]}
  set -e
  if [ "$st" -ne 0 ]; then
    overall=1
  fi
done

# One summary row per scenario (each scenario is recorded exactly once).
pass=0
fail=0
while IFS= read -r line; do
  case "$line" in
    "[PASS] "*) pass=$((pass + 1)); summary_row "Scénario : ${line#\[PASS\] }" "✅" "" ;;
    "[FAIL] "*) fail=$((fail + 1)); summary_row "Scénario : ${line#\[FAIL\] }" "❌" "" ;;
  esac
done < <(grep -oE '\[(PASS|FAIL)\] .*' "$LOG" | awk '!seen[$0]++')

summary_row "Scénarios de sécurité (total)" "$([ "$fail" -eq 0 ] && [ "$overall" -eq 0 ] && echo ✅ || echo ❌)" "$pass réussi(s), $fail échoué(s)"

if [ "$fail" -gt 0 ] || [ "$overall" -ne 0 ]; then
  summary_block "Détail des scénarios en échec" "$(grep -E 'FAILED:|ERROR|error' "$LOG" | awk '!seen[$0]++' | head -60)"
fi

# Also surface failures as GitHub annotations.
grep -E 'NOTICE:  FAILED:' "$LOG" | awk '!seen[$0]++' | sed -E 's/^.*NOTICE:  FAILED: /::error::FAILED scenario: /' || true
if [ "$overall" -ne 0 ] && [ "$fail" -eq 0 ]; then
  echo "::error::Security test run aborted: $(tr '\n' ' ' < "$LOG" | tail -c 1500)"
fi
rm -f "$LOG"
exit "$overall"

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

PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)

echo "== Preparing Supabase-like stub =="
"${PSQL[@]}" -f tests/security/00_supabase_stub.sql

echo "== Replaying migrations =="
for f in $(ls supabase/migrations/*.sql | LC_ALL=C sort); do
  "${PSQL[@]}" -c "SELECT test_support.apply_known_schema_drift()" > /dev/null
  echo "applying $f"
  if ! err=$("${PSQL[@]}" -f "$f" 2>&1 > /dev/null); then
    echo "$err" >&2
    echo "::error::Migration failed on a clean database: $f -- ${err//$'\n'/ | }"
    exit 1
  fi
done
"${PSQL[@]}" -c "SELECT test_support.apply_known_schema_drift()" > /dev/null

echo "== Running security scenarios =="
LOG="$(mktemp)"
set +e
"${PSQL[@]}" -f tests/security/10_subscription_and_payment_integrity.test.sql 2>&1 | tee "$LOG"
status=${PIPESTATUS[0]}
set -e

# Surface each failed scenario as a GitHub annotation (visible on the check run).
grep -E 'NOTICE:  FAILED:' "$LOG" | sed -E 's/^.*NOTICE:  FAILED: /::error::FAILED scenario: /' || true
grep -E 'NOTICE:  =+ [0-9]+ scenarios' "$LOG" | sed -E 's/^.*NOTICE:  /::notice::/' || true
if [ "$status" -ne 0 ] && ! grep -q 'NOTICE:  FAILED:' "$LOG"; then
  echo "::error::Security test run aborted: $(tr '\n' ' ' < "$LOG" | tail -c 1500)"
fi
rm -f "$LOG"
exit "$status"

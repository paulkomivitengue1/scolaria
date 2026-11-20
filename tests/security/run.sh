#!/usr/bin/env bash
# Replays every committed Supabase migration on a throw-away PostgreSQL database
# (with a minimal Supabase-like stub) and runs the security scenarios.
#
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bash tests/security/run.sh
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
  if ! "${PSQL[@]}" -f "$f" > /dev/null; then
    echo "::error::Migration failed on a clean database: $f" >&2
    exit 1
  fi
done
"${PSQL[@]}" -c "SELECT test_support.apply_known_schema_drift()" > /dev/null

echo "== Running security scenarios =="
"${PSQL[@]}" -f tests/security/10_subscription_and_payment_integrity.test.sql

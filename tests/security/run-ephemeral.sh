#!/usr/bin/env bash
# Starts a temporary local PostgreSQL cluster (no root, no Docker), runs the
# security scenarios against it, then removes everything.
# Used by `npm test`, so the existing CI workflow executes the DB tests too.
set -euo pipefail

BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
if [ -z "$BIN" ] && command -v pg_ctl > /dev/null 2>&1; then
  BIN="$(dirname "$(command -v pg_ctl)")"
fi
if [ -z "$BIN" ] || [ ! -x "$BIN/initdb" ]; then
  echo "::error::PostgreSQL server binaries (initdb/pg_ctl) not found: cannot run DB security tests" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() {
  "$BIN/pg_ctl" -D "$TMP/data" -m immediate stop > /dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

"$BIN/initdb" -D "$TMP/data" -U postgres --auth=trust --encoding=UTF8 --locale=C > /dev/null
"$BIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -c listen_addresses='' -p 54329" -w start > /dev/null

export DATABASE_URL="postgresql:///postgres?host=$TMP&port=54329&user=postgres"
bash tests/security/run.sh

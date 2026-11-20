#!/usr/bin/env bash
# Starts a temporary local PostgreSQL cluster (no root, no Docker), runs the
# security scenarios against it, then removes everything.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/summary.sh
source "$here/../lib/summary.sh"

BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
if [ -z "$BIN" ] && command -v pg_ctl > /dev/null 2>&1; then
  BIN="$(dirname "$(command -v pg_ctl)")"
fi
if [ -z "$BIN" ] || [ ! -x "$BIN/initdb" ]; then
  summary_row "PostgreSQL : binaires serveur" "❌" "initdb/pg_ctl introuvables sur ce runner"
  echo "::error::PostgreSQL server binaries (initdb/pg_ctl) not found: cannot run DB security tests" >&2
  exit 1
fi
version="$("$BIN/postgres" --version 2>/dev/null || echo 'version inconnue')"
summary_row "PostgreSQL : binaires serveur" "✅" "$BIN ($version)"

TMP="$(mktemp -d)"
PGLOG="$TMP/postgres.log"
cleanup() {
  "$BIN/pg_ctl" -D "$TMP/data" -m immediate stop > /dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

if ! out="$("$BIN/initdb" -D "$TMP/data" -U postgres --auth=trust --encoding=UTF8 --locale=C 2>&1)"; then
  summary_row "PostgreSQL : initialisation du cluster temporaire" "❌" "initdb a échoué"
  summary_block "Erreur initdb" "$out"
  echo "$out" >&2
  exit 1
fi

# The server daemon must NOT inherit our stdout/stderr (a captured or piped
# descriptor would keep this script waiting forever): log to a file instead.
if ! "$BIN/pg_ctl" -D "$TMP/data" -l "$PGLOG" -o "-k $TMP -c listen_addresses='' -p 54329" -w start > /dev/null 2>&1 < /dev/null; then
  out="$(cat "$PGLOG" 2>/dev/null || true)"
  summary_row "PostgreSQL : démarrage" "❌" "pg_ctl start a échoué"
  summary_block "Journal de démarrage PostgreSQL" "$out"
  echo "$out" >&2
  exit 1
fi

export DATABASE_URL="postgresql:///postgres?host=$TMP&port=54329&user=postgres"
if ! out="$(psql "$DATABASE_URL" -tAc 'select version()' 2>&1)"; then
  summary_row "PostgreSQL : connexion" "❌" "psql n'a pas pu se connecter"
  summary_block "Erreur de connexion psql" "$out"
  echo "$out" >&2
  exit 1
fi
summary_row "PostgreSQL : initialisation, démarrage et connexion" "✅" "$out"

bash tests/security/run.sh

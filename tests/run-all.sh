#!/usr/bin/env bash
# Runs every test suite, keeps going after a failure, and (in CI on the audit
# branch only) publishes the combined log to the `ci-results` branch so it can
# be read without access to the Actions logs.
set -uo pipefail

LOG="$(mktemp)"
STATUS_DIR="$(mktemp -d)"

{
  echo "### node $(node --version) | $(date -u +%FT%TZ)"
  echo "### student-import test"
  node tests/student-import.test.mjs
  echo $? > "$STATUS_DIR/import"
  echo "### security DB tests"
  bash tests/security/run-ephemeral.sh
  echo $? > "$STATUS_DIR/security"
} 2>&1 | tee "$LOG"

import_status="$(cat "$STATUS_DIR/import" 2>/dev/null || echo 1)"
security_status="$(cat "$STATUS_DIR/security" 2>/dev/null || echo 1)"
{
  echo "### exit codes: student-import=$import_status security-db=$security_status"
} | tee -a "$LOG"

bash tests/ci-publish-log.sh "$LOG" || true

if [ "$import_status" -ne 0 ] || [ "$security_status" -ne 0 ]; then
  exit 1
fi

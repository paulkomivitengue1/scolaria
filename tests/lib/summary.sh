# shellcheck shell=bash
# Helpers that collect a per-stage diagnostic table for the GitHub Actions job
# summary ($GITHUB_STEP_SUMMARY). Only tests/run-all.sh owns the buffers; when
# SUMMARY_DIR is unset (standalone runs) every helper is a no-op.

summary_row() { # stage, result, detail
  [ -n "${SUMMARY_DIR:-}" ] || return 0
  local detail="${3:-}"
  detail="${detail//$'\n'/ }"
  detail="${detail//|/\\|}"
  printf '| %s | %s | %s |\n' "$1" "$2" "${detail:0:400}" >> "$SUMMARY_DIR/rows.md"
}

summary_block() { # title, text
  [ -n "${SUMMARY_DIR:-}" ] || return 0
  {
    echo
    echo "<details><summary>$1</summary>"
    echo
    echo '```'
    printf '%s\n' "${2:0:6000}"
    echo '```'
    echo '</details>'
  } >> "$SUMMARY_DIR/blocks.md"
}

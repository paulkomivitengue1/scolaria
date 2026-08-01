/*
# Restrict SECURITY DEFINER function execute permissions

## Purpose
The security advisor flagged that both helper functions are callable by the
`anon` role. This migration tightens permissions:

1. `handle_new_school` — revoke from `anon`, keep `authenticated` (a brand-new
   user has an authenticated session immediately after signUp, so this works).
2. `current_school_id` — revoke from both `anon` and `authenticated`. This
   function is only used internally by RLS policies; it should never be called
   directly via the REST API.

## Security
- No data changes, no schema changes — only EXECUTE grants on two functions.
*/

REVOKE EXECUTE ON FUNCTION current_school_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION handle_new_school(text, text, text) FROM anon;
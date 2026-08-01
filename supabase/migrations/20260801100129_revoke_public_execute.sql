/*
# Tighten function execute grants (revoke from PUBLIC)

PostgreSQL defaults EXECUTE to PUBLIC. The previous migration revoked from
specific roles but the PUBLIC default grant remained. This migration:

1. Revoke EXECUTE from PUBLIC on both functions.
2. Grant EXECUTE on handle_new_school to authenticated only (needed for new
   signups — the user has an authenticated session immediately after signUp).
3. Leave current_school_id without any direct grant — it is only called
   internally by RLS policies, never directly via REST.
*/

REVOKE EXECUTE ON FUNCTION current_school_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION handle_new_school(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION handle_new_school(text, text, text) TO authenticated;
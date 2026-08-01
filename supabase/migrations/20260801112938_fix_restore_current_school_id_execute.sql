/*
# Fix: Restore EXECUTE on current_school_id() for authenticated role

## Root cause
A previous migration (revoke_public_execute) removed EXECUTE on
current_school_id() from everyone. But this function is called INSIDE every
RLS policy (e.g. `school_id = current_school_id()`). When PostgreSQL evaluates
an RLS policy, it runs with the privileges of the querying role (authenticated),
so the role MUST have EXECUTE on the function — otherwise the policy fails with
"permission denied for function current_school_id".

This caused the profile fetch to return null + error, so the app never
transitioned from the landing page to the dashboard after login.

## Fix
Re-grant EXECUTE on current_school_id() to authenticated only.
Keep it revoked from anon (no anonymous access needed — RLS policies on all
tables scope TO authenticated anyway).
*/

GRANT EXECUTE ON FUNCTION current_school_id() TO authenticated;
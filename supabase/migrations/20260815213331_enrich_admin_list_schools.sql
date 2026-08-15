/*
# Enrich admin_list_schools with director, phone, and student count

## Purpose
The super-admin panel needs richer data per school: the director's name,
the school's phone number, and the number of students enrolled. This
migration drops and recreates the `admin_list_schools()` function with
the expanded return columns.

## Changes

### Modified function: admin_list_schools()
- DROP existing function (return type changed, cannot use CREATE OR REPLACE)
- Recreate with additional columns: director_name (text), phone (text), student_count (bigint)
- student_count is a subquery counting rows in the students table for each school

### Security
- Function remains SECURITY DEFINER, executable only by service_role
- No new tables, columns, or policy changes
*/
DROP FUNCTION IF EXISTS admin_list_schools();

CREATE FUNCTION admin_list_schools()
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  plan text,
  subscription_status text,
  trial_ends_at timestamptz,
  created_at timestamptz,
  director_name text,
  phone text,
  student_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    s.id, s.name, s.city, s.plan, s.subscription_status, s.trial_ends_at, s.created_at,
    s.director_name,
    s.phone,
    (SELECT COUNT(*) FROM public.students st WHERE st.school_id = s.id) AS student_count
  FROM public.schools s
  ORDER BY s.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION admin_list_schools() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_schools() TO service_role;

NOTIFY pgrst, 'reload schema';

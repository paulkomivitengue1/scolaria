-- Reconcile the live student-card schema and allow the admin suspension workflow.
-- Additive/idempotent: existing school records and saved display preferences are preserved.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS student_card_fields jsonb
  NOT NULL DEFAULT '{"matricule":true,"sexe":true,"parentName":false,"birthDate":true,"birthPlace":true}'::jsonb;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS birth_place text;

-- Match the application defaults for newly created schools only.
-- Existing student_card_fields values are intentionally not rewritten.
ALTER TABLE public.schools
  ALTER COLUMN student_card_fields
  SET DEFAULT '{"matricule":true,"sexe":true,"parentName":false,"birthDate":true,"birthPlace":true}'::jsonb;

ALTER TABLE public.schools
  DROP CONSTRAINT IF EXISTS schools_subscription_status_check;

ALTER TABLE public.schools
  ADD CONSTRAINT schools_subscription_status_check
  CHECK (subscription_status = ANY (ARRAY['trial'::text, 'active'::text, 'expired'::text, 'suspended'::text]));

COMMENT ON COLUMN public.schools.student_card_fields IS
  'School-specific visibility preferences for student ID card fields.';
COMMENT ON COLUMN public.students.birth_place IS
  'Optional student place of birth.';

-- Per-school optional fields shown on student ID cards.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS student_card_fields jsonb
  NOT NULL DEFAULT '{"matricule":true,"sexe":true,"parentName":false,"birthDate":false,"birthPlace":false}'::jsonb;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS birth_place text;

COMMENT ON COLUMN public.schools.student_card_fields IS 'School-specific visibility preferences for student ID card fields.';
COMMENT ON COLUMN public.students.birth_place IS 'Optional student place of birth.';

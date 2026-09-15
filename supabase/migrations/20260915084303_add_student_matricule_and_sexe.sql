/*
# Add matricule and sexe columns to students

1. New Columns
- `students.matricule` (text, nullable) — auto-generated student ID per school, format ECOLE-2026-001, manually editable. Unique within a school.
- `students.sexe` (text, nullable, CHECK constraint 'M' or 'F') — student gender, required at creation but old rows may be NULL.

2. Modified Tables
- `students`: added `matricule` and `sexe` columns.
- Added a unique constraint on `(school_id, matricule)` to enforce uniqueness per school.

3. Security
- No RLS changes — existing policies on `students` already cover the new columns since they use school-level ownership checks.
*/

ALTER TABLE students ADD COLUMN IF NOT EXISTS matricule text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS sexe text CHECK (sexe IN ('M', 'F'));

-- Unique matricule per school (only when matricule is not null)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_school_matricule_key'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_school_matricule_key UNIQUE (school_id, matricule);
  END IF;
END $$;

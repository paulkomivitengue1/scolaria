-- Custom school classes: additive migration, preserving existing class and student records.
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS classes_school_id_name_unique
  ON public.classes (school_id, name);

-- Seed the standard classes for every existing school; custom class names remain untouched.
INSERT INTO public.classes (school_id, name, level, is_active)
SELECT s.id, c.name, c.level, true
FROM public.schools s
CROSS JOIN (VALUES
  ('Petite section', 'maternelle'),
  ('Moyenne section', 'maternelle'),
  ('Grande section', 'maternelle'),
  ('1ère année', 'fondamental'),
  ('2ème année', 'fondamental'),
  ('3ème année', 'fondamental'),
  ('4ème année', 'fondamental'),
  ('5ème année', 'fondamental'),
  ('6ème année', 'fondamental'),
  ('7ème année', 'fondamental'),
  ('8ème année', 'fondamental'),
  ('9ème année', 'fondamental')
) AS c(name, level)
ON CONFLICT (school_id, name) DO NOTHING;

-- "Jardin" was the old generic option. Keep its row for historical compatibility,
-- but stop offering it for new enrolments; the three sections replace it.
UPDATE public.classes
SET is_active = false
WHERE name = 'Jardin';

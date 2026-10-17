-- Persist student card photos per school and student.
-- Existing school/student records are not modified.
CREATE TABLE IF NOT EXISTS public.student_card_photos (
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  photo_data text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, student_id)
);

ALTER TABLE public.student_card_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_student_card_photos" ON public.student_card_photos;
CREATE POLICY "select_own_student_card_photos" ON public.student_card_photos
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id AND s.school_id = public.current_school_id()
    )
  );

DROP POLICY IF EXISTS "insert_own_student_card_photos" ON public.student_card_photos;
CREATE POLICY "insert_own_student_card_photos" ON public.student_card_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id AND s.school_id = public.current_school_id()
    )
  );

DROP POLICY IF EXISTS "update_own_student_card_photos" ON public.student_card_photos;
CREATE POLICY "update_own_student_card_photos" ON public.student_card_photos
  FOR UPDATE TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (
    school_id = public.current_school_id()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id AND s.school_id = public.current_school_id()
    )
  );

DROP POLICY IF EXISTS "delete_own_student_card_photos" ON public.student_card_photos;
CREATE POLICY "delete_own_student_card_photos" ON public.student_card_photos
  FOR DELETE TO authenticated
  USING (school_id = public.current_school_id());

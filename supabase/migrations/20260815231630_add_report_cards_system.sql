/*
# Report cards (bulletins scolaires)

## Purpose
Add a complete report card system: configurable grading periods (trimesters/semesters),
per-student report cards with grades by subject, automatic average calculation,
general appreciation, PDF export, and history of past report cards.

## New Tables

### 1. grade_periods
Configurable per school. Defines the grading periods (Trimestre 1, Semestre 2, etc.).
- school_id (uuid FK → schools, CASCADE)
- period_index (int, 1-based)
- label (text, e.g. "Trimestre 1")
- UNIQUE(school_id, period_index)

### 2. report_cards
One report card per student per period. Stores the period label as a snapshot
(so history stays correct even if the school renames its periods later).
- school_id (uuid FK → schools, CASCADE)
- student_id (uuid FK → students, CASCADE)
- period_index (int, which period this card is for)
- period_label (text, snapshot of the label at creation time)
- academic_year (text, e.g. "2025-2026")
- status (text: 'draft' or 'finalized')
- appreciation (text, general appreciation written by the teacher)
- created_at, updated_at (timestamps)
- UNIQUE(student_id, period_index, academic_year)

### 3. grades
Individual subject grades within a report card.
- report_card_id (uuid FK → report_cards, CASCADE)
- subject (text, e.g. "Mathématiques", "Lecture")
- score (numeric, the obtained score)
- max_score (numeric, the maximum possible score, default 20)
- coefficient (numeric, optional, default 1)
- UNIQUE(report_card_id, subject)

## RLS Policies
All three tables get school-scoped CRUD policies using current_school_id(),
identical to all other tables in the schema.

## Default Data
For each existing school, seed 3 default periods:
  (1, 'Trimestre 1'), (2, 'Trimestre 2'), (3, 'Trimestre 3')
*/

-- ══════════════════════════════════════════════════════════
-- 1. grade_periods
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS grade_periods (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  period_index  integer NOT NULL,
  label         text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, period_index)
);
CREATE INDEX IF NOT EXISTS idx_grade_periods_school ON grade_periods(school_id);

-- ══════════════════════════════════════════════════════════
-- 2. report_cards
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS report_cards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  period_index  integer NOT NULL,
  period_label  text NOT NULL DEFAULT '',
  academic_year text NOT NULL DEFAULT '2025-2026',
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized')),
  appreciation  text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, period_index, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_report_cards_school ON report_cards(school_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_student ON report_cards(student_id);

-- ══════════════════════════════════════════════════════════
-- 3. grades
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS grades (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id uuid NOT NULL REFERENCES report_cards(id) ON DELETE CASCADE,
  subject        text NOT NULL,
  score          numeric NOT NULL DEFAULT 0,
  max_score      numeric NOT NULL DEFAULT 20,
  coefficient    numeric NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_card_id, subject)
);
CREATE INDEX IF NOT EXISTS idx_grades_report_card ON grades(report_card_id);

-- ══════════════════════════════════════════════════════════
-- 4. Seed default 3 trimesters for existing schools
-- ══════════════════════════════════════════════════════════
INSERT INTO grade_periods (school_id, period_index, label)
SELECT s.id, idx, 'Trimestre ' || idx::text
FROM schools s
CROSS JOIN (VALUES (1),(2),(3)) AS v(idx)
WHERE NOT EXISTS (
  SELECT 1 FROM grade_periods gp WHERE gp.school_id = s.id
)
ORDER BY s.id, idx
ON CONFLICT (school_id, period_index) DO NOTHING;

-- ══════════════════════════════════════════════════════════
-- 5. RLS policies
-- ══════════════════════════════════════════════════════════
ALTER TABLE grade_periods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades         ENABLE ROW LEVEL SECURITY;

-- grade_periods policies
DROP POLICY IF EXISTS "select_own_grade_periods" ON grade_periods;
CREATE POLICY "select_own_grade_periods" ON grade_periods
  FOR SELECT TO authenticated USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_grade_periods" ON grade_periods;
CREATE POLICY "insert_own_grade_periods" ON grade_periods
  FOR INSERT TO authenticated WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_grade_periods" ON grade_periods;
CREATE POLICY "update_own_grade_periods" ON grade_periods
  FOR UPDATE TO authenticated USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_grade_periods" ON grade_periods;
CREATE POLICY "delete_own_grade_periods" ON grade_periods
  FOR DELETE TO authenticated USING (school_id = current_school_id());

-- report_cards policies
DROP POLICY IF EXISTS "select_own_report_cards" ON report_cards;
CREATE POLICY "select_own_report_cards" ON report_cards
  FOR SELECT TO authenticated USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_report_cards" ON report_cards;
CREATE POLICY "insert_own_report_cards" ON report_cards
  FOR INSERT TO authenticated WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_report_cards" ON report_cards;
CREATE POLICY "update_own_report_cards" ON report_cards
  FOR UPDATE TO authenticated USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_report_cards" ON report_cards;
CREATE POLICY "delete_own_report_cards" ON report_cards
  FOR DELETE TO authenticated USING (school_id = current_school_id());

-- grades policies (scoped through report_cards → school_id)
DROP POLICY IF EXISTS "select_own_grades" ON grades;
CREATE POLICY "select_own_grades" ON grades
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM report_cards rc WHERE rc.id = grades.report_card_id AND rc.school_id = current_school_id())
  );

DROP POLICY IF EXISTS "insert_own_grades" ON grades;
CREATE POLICY "insert_own_grades" ON grades
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM report_cards rc WHERE rc.id = grades.report_card_id AND rc.school_id = current_school_id())
  );

DROP POLICY IF EXISTS "update_own_grades" ON grades;
CREATE POLICY "update_own_grades" ON grades
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM report_cards rc WHERE rc.id = grades.report_card_id AND rc.school_id = current_school_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM report_cards rc WHERE rc.id = grades.report_card_id AND rc.school_id = current_school_id())
  );

DROP POLICY IF EXISTS "delete_own_grades" ON grades;
CREATE POLICY "delete_own_grades" ON grades
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM report_cards rc WHERE rc.id = grades.report_card_id AND rc.school_id = current_school_id())
  );

NOTIFY pgrst, 'reload schema';

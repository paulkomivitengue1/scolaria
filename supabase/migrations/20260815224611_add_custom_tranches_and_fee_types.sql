/*
# Custom tranches and fee types per school

## Purpose
Replace the fixed 3-tranche / 9-month / 3-service-type pricing system with a
fully configurable per-school system. Each school can now define:
  - Its own number of tranches (2, 3, 4, or more) with custom labels.
  - The amount of each tranche per class for tranche-based fees (e.g. scolarite).
  - Custom fee types (inscription, frais de fête, or anything the school names).
  - Each fee type is either "tranche" (split across N payments) or "single"
    (one-time payment).

## Changes

### 1. New table: school_tranches
  - school_id (uuid FK → schools)
  - tranche_index (int, 1-based: 1, 2, 3, ...)
  - label (text, e.g. "Tranche 1", "Premier versement", ...)
  - UNIQUE(school_id, tranche_index)

### 2. New table: fee_config
  - school_id (uuid FK → schools)
  - fee_type (text, free-form: 'scolarite', 'inscription', 'frais de fête', ...)
  - class_name (text, e.g. 'Jardin', '1ère année', ...)
  - payment_mode (text: 'tranche' or 'single')
  - tranche_index (int, 1-based — which tranche this amount applies to;
    NULL for single-payment fees)
  - amount (int, FCFA)
  - UNIQUE(school_id, fee_type, class_name, tranche_index)

### 3. payments table: new columns
  - fee_type (text, default 'scolarite') — which fee this payment is for.
    Replaces the role of the old `type` column but is free-form.
  - tranche_index (int, default 1) — which tranche this payment applies to.
    Replaces the role of the old `month_key` column.
  The old `type` and `month_key` columns are kept intact for backward
  compatibility and existing data. New payments populate both old and new
  columns so old code paths still work during the transition.

### 4. payments table: drop CHECK constraint on `type`
  The old constraint limited type to ('scolarite','cantine','transport').
  We drop it so the column can hold custom fee type names. The new
  `fee_type` column is used going forward, but `type` is still populated.

### 5. Data migration
  For every school that has rows in pricing_config:
  a) Create 3 default tranches in school_tranches:
     (1, 'Tranche 1'), (2, 'Tranche 2'), (3, 'Tranche 3')
  b) For each pricing_config row with service = 'scolarite':
     - Create 3 fee_config rows with payment_mode = 'tranche',
       one per tranche, amount = annual_fee / 3.
  c) For each pricing_config row with service in ('cantine', 'transport'):
     - Create 3 fee_config rows with payment_mode = 'tranche',
       amount = annual_fee / 3. (Kept as tranche-based for compatibility.)
  d) Create default 'inscription' and 'frais de fête' fee types as
     single-payment with amount = 0 (school configures later).

  For existing payments: map month_key to tranche_index:
    oct/nov/dec → 1, jan/fev/mar → 2, avr/mai/jun → 3.
  Set fee_type = type (copy the value).

### 6. RLS policies
  school_tranches and fee_config get the standard 4 CRUD policies scoped
  by current_school_id(), identical to all other tables.

## Security
  - No destructive operations on existing data.
  - Old columns (type, month_key) are preserved, not dropped.
  - All new tables get RLS enabled with school-scoped policies.
  - The pricing_config table is left intact as a backup.
*/

-- ══════════════════════════════════════════════════════════
-- 1. school_tranches table
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_tranches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  tranche_index integer NOT NULL,
  label         text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, tranche_index)
);
CREATE INDEX IF NOT EXISTS idx_school_tranches_school ON school_tranches(school_id);

-- ══════════════════════════════════════════════════════════
-- 2. fee_config table
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fee_config (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  fee_type      text NOT NULL,
  class_name    text NOT NULL DEFAULT '',
  payment_mode  text NOT NULL DEFAULT 'tranche'
                  CHECK (payment_mode IN ('tranche','single')),
  tranche_index integer,
  amount        integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, fee_type, class_name, tranche_index)
);
CREATE INDEX IF NOT EXISTS idx_fee_config_school ON fee_config(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_config_type  ON fee_config(school_id, fee_type);

-- ══════════════════════════════════════════════════════════
-- 3. payments: add fee_type and tranche_index columns
-- ══════════════════════════════════════════════════════════
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fee_type text NOT NULL DEFAULT 'scolarite';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tranche_index integer NOT NULL DEFAULT 1;

-- ══════════════════════════════════════════════════════════
-- 4. Drop the CHECK constraint on payments.type
--    (constraint name varies — find and drop dynamically)
-- ══════════════════════════════════════════════════════════
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'payments'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%scolarite%cantine%transport%';
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- 5. Data migration
-- ══════════════════════════════════════════════════════════

-- 5a. Create default 3 tranches for every school that doesn't have any yet
INSERT INTO school_tranches (school_id, tranche_index, label)
SELECT s.id, idx, 'Tranche ' || idx::text
FROM schools s
CROSS JOIN (VALUES (1),(2),(3)) AS v(idx)
WHERE NOT EXISTS (
  SELECT 1 FROM school_tranches st WHERE st.school_id = s.id
)
ORDER BY s.id, idx;

-- 5b. Migrate pricing_config → fee_config (only for schools without existing fee_config)
INSERT INTO fee_config (school_id, fee_type, class_name, payment_mode, tranche_index, amount)
SELECT pc.school_id, pc.service, pc.class_name, 'tranche', v.idx,
       ROUND(pc.annual_fee::numeric / 3.0)::int
FROM pricing_config pc
CROSS JOIN (VALUES (1),(2),(3)) AS v(idx)
WHERE NOT EXISTS (
  SELECT 1 FROM fee_config fc WHERE fc.school_id = pc.school_id
)
ORDER BY pc.school_id, pc.class_name, pc.service, v.idx
ON CONFLICT (school_id, fee_type, class_name, tranche_index) DO NOTHING;

-- 5c. Add default single-payment fee types (inscription, frais de fête) for migrated schools
INSERT INTO fee_config (school_id, fee_type, class_name, payment_mode, tranche_index, amount)
SELECT s.id, ft.fee_type, cls.class_name, 'single', NULL, 0
FROM schools s
CROSS JOIN (VALUES ('inscription'), ('frais de fête')) AS ft(fee_type)
CROSS JOIN (VALUES
  ('Jardin'),('1ère année'),('2ème année'),('3ème année'),('4ème année'),
  ('5ème année'),('6ème année'),('7ème année'),('8ème année'),('9ème année')
) AS cls(class_name)
WHERE EXISTS (SELECT 1 FROM fee_config fc WHERE fc.school_id = s.id)
  AND NOT EXISTS (
    SELECT 1 FROM fee_config fc2
    WHERE fc2.school_id = s.id AND fc2.fee_type = ft.fee_type
  )
ORDER BY s.id, ft.fee_type, cls.class_name
ON CONFLICT (school_id, fee_type, class_name, tranche_index) DO NOTHING;

-- 5d. Migrate existing payments: set fee_type and tranche_index from month_key
UPDATE payments SET fee_type = type WHERE fee_type = 'scolarite' AND type != 'scolarite';
UPDATE payments SET tranche_index = CASE
  WHEN month_key IN ('oct','nov','dec') THEN 1
  WHEN month_key IN ('jan','fev','mar') THEN 2
  WHEN month_key IN ('avr','mai','jun') THEN 3
  ELSE 1
END WHERE tranche_index = 1 AND month_key NOT IN ('oct');

-- ══════════════════════════════════════════════════════════
-- 6. RLS policies for new tables
-- ══════════════════════════════════════════════════════════
ALTER TABLE school_tranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_config     ENABLE ROW LEVEL SECURITY;

-- school_tranches policies
DROP POLICY IF EXISTS "select_own_tranches" ON school_tranches;
CREATE POLICY "select_own_tranches" ON school_tranches
  FOR SELECT TO authenticated USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_tranches" ON school_tranches;
CREATE POLICY "insert_own_tranches" ON school_tranches
  FOR INSERT TO authenticated WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_tranches" ON school_tranches;
CREATE POLICY "update_own_tranches" ON school_tranches
  FOR UPDATE TO authenticated USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_tranches" ON school_tranches;
CREATE POLICY "delete_own_tranches" ON school_tranches
  FOR DELETE TO authenticated USING (school_id = current_school_id());

-- fee_config policies
DROP POLICY IF EXISTS "select_own_fee_config" ON fee_config;
CREATE POLICY "select_own_fee_config" ON fee_config
  FOR SELECT TO authenticated USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_fee_config" ON fee_config;
CREATE POLICY "insert_own_fee_config" ON fee_config
  FOR INSERT TO authenticated WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_fee_config" ON fee_config;
CREATE POLICY "update_own_fee_config" ON fee_config
  FOR UPDATE TO authenticated USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_fee_config" ON fee_config;
CREATE POLICY "delete_own_fee_config" ON fee_config
  FOR DELETE TO authenticated USING (school_id = current_school_id());

NOTIFY pgrst, 'reload schema';

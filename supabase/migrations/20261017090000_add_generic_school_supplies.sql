-- Generic school supplies inventory. Existing stock rows and tenant RLS remain intact.
ALTER TABLE public.stock_items DROP CONSTRAINT IF EXISTS stock_items_category_check;
ALTER TABLE public.stock_items ADD CONSTRAINT stock_items_category_check
  CHECK (category IN ('tenue','livre','fourniture'));
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'unité',
  ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 3;
CREATE INDEX IF NOT EXISTS idx_stock_supplies_school
  ON public.stock_items(school_id, category, name)
  WHERE category = 'fourniture';

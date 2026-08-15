/*
# Add fees_json column to students table

## Purpose
The new fee system stores each student's subscribed fee types and their
total expected amounts in a fees_json column, replacing the old
services_json column (which only supported scolarite/cantine/transport
with an annualFee that was divided by 9 months).

## Changes
1. students: add fees_json jsonb (default '[]')
   - Stores: [{ "feeType": "scolarite", "paymentMode": "tranche", "totalExpected": 135000 }, ...]
2. Migrate existing services_json data to fees_json for backward compat:
   - Each entry { type, annualFee } becomes { feeType: type, paymentMode: 'tranche', totalExpected: annualFee }

## Security
- No policy changes needed; existing RLS policies already scope by school_id.
*/

ALTER TABLE students ADD COLUMN IF NOT EXISTS fees_json jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Migrate existing services_json → fees_json where fees_json is empty
UPDATE students
SET fees_json = (
  SELECT jsonb_agg(jsonb_build_object(
    'feeType', elem->>'type',
    'paymentMode', 'tranche',
    'totalExpected', (elem->>'annualFee')::numeric
  ))
  FROM jsonb_array_elements(services_json) AS elem
)
WHERE fees_json = '[]'::jsonb
  AND services_json IS NOT NULL
  AND services_json != '[]'::jsonb;

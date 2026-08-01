/*
# Add class_name and services_json columns to students

## Purpose
The frontend Student type stores the class as a string (e.g. "Jardin") and
a services array (which services the student is subscribed to + their annual
fee frozen at enrollment). These two columns let us persist that data without
requiring a join to the classes table for every read.

## Changes
1. students: add class_name text (default '')
2. students: add services_json jsonb (default '[]')
   - Stores: [{ "type": "scolarite", "annualFee": 135000 }, ...]
   - The monthly payment totals are reconstructed from the payments table.

## Security
- No policy changes needed; existing RLS policies already scope by school_id.
*/

ALTER TABLE students ADD COLUMN IF NOT EXISTS class_name text NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS services_json jsonb NOT NULL DEFAULT '[]'::jsonb;
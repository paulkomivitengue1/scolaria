-- New school accounts require activation; no free-trial access is granted by default.
-- Existing schools and their data are intentionally untouched.
ALTER TABLE public.schools
  ALTER COLUMN subscription_status SET DEFAULT 'expired',
  ALTER COLUMN trial_ends_at SET DEFAULT now();

UPDATE public.gestilys_public_settings
SET trial_days = 0
WHERE id = 1;

-- Allow Super-Admin to record a payment confirmed directly with a school.
-- This expands the accepted provider values and does not modify existing rows.
ALTER TABLE public.manual_payments
  DROP CONSTRAINT IF EXISTS manual_payments_provider_check;

ALTER TABLE public.manual_payments
  ADD CONSTRAINT manual_payments_provider_check
  CHECK (provider = ANY (ARRAY['Orange Money'::text, 'Wave'::text, 'Moov Money'::text, 'Paiement manuel'::text]));

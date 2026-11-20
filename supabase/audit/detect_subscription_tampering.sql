-- READ-ONLY audit queries to run by hand in the Supabase SQL editor (production).
-- They only SELECT; nothing here modifies data. Run them BEFORE and AFTER applying
-- the 20261120090000 migration to see whether any school already tampered with
-- its own subscription or payment records.

-- 1. Active schools with no validated payment record at all.
SELECT s.id, s.name, s.plan, s.subscription_status, s.trial_ends_at, s.created_at, s.last_paid_at
FROM public.schools s
WHERE s.subscription_status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.manual_payments p
    WHERE p.school_id = s.id AND p.status = 'valide'
  )
ORDER BY s.created_at DESC;

-- 2. Schools whose subscription end date is unusually far in the future
--    (more than 13 months ahead).
SELECT s.id, s.name, s.plan, s.subscription_status, s.trial_ends_at
FROM public.schools s
WHERE s.trial_ends_at > now() + interval '13 months'
ORDER BY s.trial_ends_at DESC;

-- 3. Payments whose timestamps look backdated (received long before creation).
SELECT p.id, p.school_id, p.school_name, p.provider, p.amount, p.status, p.received_at, p.created_at
FROM public.manual_payments p
WHERE p.received_at < p.created_at - interval '1 day'
ORDER BY p.created_at DESC;

-- 4. Validated payments whose school_name no longer matches the school.
SELECT p.id, p.school_id, p.school_name, s.name AS current_school_name, p.amount, p.status
FROM public.manual_payments p
JOIN public.schools s ON s.id = p.school_id
WHERE p.status = 'valide' AND p.school_name <> s.name;

-- 5. Partner commissions due for schools that have no validated payment.
SELECT c.id, c.affiliate_id, c.school_id, c.school_name, c.plan, c.commission_amount, c.status, c.created_at
FROM public.affiliate_commissions c
WHERE c.status = 'due'
  AND (
    c.school_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.manual_payments p
      WHERE p.school_id = c.school_id AND p.status = 'valide'
    )
  )
ORDER BY c.created_at DESC;

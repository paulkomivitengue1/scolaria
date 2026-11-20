-- Additional attack and regression scenarios (run after 10_*.test.sql, reuse its
-- helper functions and fixtures, and print a final summary over ALL scenarios).

\pset tuples_only on
\pset format unaligned

SELECT test_support.scenario(
  'ATTACK payment: school cannot spoof school_name on a declared payment',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$INSERT INTO public.manual_payments (school_id, school_name, provider, sender, amount)
        VALUES ('a1000000-0000-0000-0000-000000000001', 'Ecole B (usurpee)', 'Orange Money', 'SPOOF', 10000)$sql$,
  $sql$SELECT EXISTS (SELECT 1 FROM public.manual_payments WHERE sender = 'SPOOF' AND school_name = 'Ecole A')$sql$);

SELECT test_support.scenario(
  'ATTACK payment: school cannot backdate received_at on a declared payment',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$INSERT INTO public.manual_payments (school_id, school_name, provider, sender, amount, received_at, created_at)
        VALUES ('a1000000-0000-0000-0000-000000000001', 'Ecole A', 'Orange Money', 'BACKDATED', 10000,
                now() - interval '400 days', now() - interval '400 days')$sql$,
  $sql$SELECT EXISTS (SELECT 1 FROM public.manual_payments WHERE sender = 'BACKDATED' AND received_at > now() - interval '1 hour')$sql$);

SELECT test_support.scenario(
  'ATTACK subscription: school cannot rewrite its own created_at',
  $sql$SELECT test_support.reset_school('a1000000-0000-0000-0000-000000000001', 'expired')$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$UPDATE public.schools SET created_at = now() + interval '5 years' WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$,
  $sql$SELECT created_at < now() FROM public.schools WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.scenario(
  'ATTACK subscription: self-activation through a multi-row UPDATE without WHERE touches no other school',
  $sql$SELECT test_support.reset_school('a1000000-0000-0000-0000-000000000001', 'expired')$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$UPDATE public.schools SET subscription_status = 'active', plan = 'Élite'$sql$,
  $sql$SELECT (SELECT count(*) FROM public.schools WHERE subscription_status = 'active' AND name IN ('Ecole A', 'Ecole B')) = 0$sql$);

DO $$
DECLARE
  v_fail  integer;
  v_total integer;
  r       record;
BEGIN
  SELECT count(*) INTO v_total FROM test_support_results.results;
  SELECT count(*) INTO v_fail  FROM test_support_results.results WHERE NOT ok;
  RAISE NOTICE '================ % scenarios (all files), % failed ================', v_total, v_fail;
  FOR r IN SELECT name, detail FROM test_support_results.results WHERE NOT ok ORDER BY name LOOP
    RAISE NOTICE 'FAILED: % -- %', r.name, left(r.detail, 400);
  END LOOP;
  IF v_fail > 0 THEN
    RAISE EXCEPTION '% security scenario(s) failed', v_fail;
  END IF;
END $$;

-- Super-Admin deletion + coarse device metadata; no IP or precise location is stored.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz, ADD COLUMN IF NOT EXISTS last_device text, ADD COLUMN IF NOT EXISTS last_browser text, ADD COLUMN IF NOT EXISTS last_os text;

CREATE OR REPLACE FUNCTION public.record_my_device(p_device text, p_browser text, p_os text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
 UPDATE public.users SET last_seen_at=now(), last_device=left(coalesce(nullif(p_device,''),'Appareil inconnu'),80), last_browser=left(coalesce(nullif(p_browser,''),'Navigateur inconnu'),80), last_os=left(coalesce(nullif(p_os,''),'Système inconnu'),80) WHERE auth_uid=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Profil utilisateur introuvable.'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.record_my_device(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_my_device(text,text,text) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_list_schools();
CREATE FUNCTION public.admin_list_schools()
RETURNS TABLE (id uuid,name text,city text,plan text,subscription_status text,trial_ends_at timestamptz,created_at timestamptz,director_name text,phone text,email text,student_count bigint,billing_period text,subscription_amount integer,last_paid_at timestamptz,subscription_started_at timestamptz,last_seen_at timestamptz,last_device text,last_browser text,last_os text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public AS $$
 SELECT s.id,s.name,s.city,s.plan,s.subscription_status,s.trial_ends_at,s.created_at,s.director_name,s.phone,u.email,
 (SELECT COUNT(*) FROM public.students st WHERE st.school_id=s.id),s.billing_period,s.subscription_amount,s.last_paid_at,s.subscription_started_at,u.last_seen_at,u.last_device,u.last_browser,u.last_os
 FROM public.schools s LEFT JOIN LATERAL (
  SELECT usr.email,usr.last_seen_at,usr.last_device,usr.last_browser,usr.last_os FROM public.users usr
  WHERE usr.school_id=s.id AND usr.role='admin_ecole' ORDER BY usr.created_at ASC LIMIT 1
 ) u ON true ORDER BY s.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_schools() FROM anon,authenticated,PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_schools() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_school(p_school_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF p_school_id IS NULL THEN RAISE EXCEPTION 'Identifiant de l’école requis.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.schools WHERE id=p_school_id) THEN RAISE EXCEPTION 'École introuvable ou déjà supprimée.'; END IF;
 DELETE FROM public.grades g USING public.report_cards rc WHERE g.report_card_id=rc.id AND rc.school_id=p_school_id;
 DELETE FROM public.payments WHERE school_id=p_school_id;
 DELETE FROM public.student_card_photos WHERE school_id=p_school_id;
 DELETE FROM public.student_year_history WHERE school_id=p_school_id;
 DELETE FROM public.report_cards WHERE school_id=p_school_id;
 DELETE FROM public.salary_payments WHERE school_id=p_school_id;
 DELETE FROM public.expenses WHERE school_id=p_school_id;
 DELETE FROM public.stock_items WHERE school_id=p_school_id;
 DELETE FROM public.pricing_config WHERE school_id=p_school_id;
 DELETE FROM public.manual_payments WHERE school_id=p_school_id;
 DELETE FROM public.school_tranches WHERE school_id=p_school_id;
 DELETE FROM public.fee_config WHERE school_id=p_school_id;
 DELETE FROM public.grade_periods WHERE school_id=p_school_id;
 DELETE FROM public.school_year_stock_history WHERE school_id=p_school_id;
 DELETE FROM public.students WHERE school_id=p_school_id;
 DELETE FROM public.classes WHERE school_id=p_school_id;
 DELETE FROM public.teachers WHERE school_id=p_school_id;
 DELETE FROM public.users WHERE school_id=p_school_id;
 DELETE FROM public.schools WHERE id=p_school_id;
END; $$;
REVOKE ALL ON FUNCTION public.admin_delete_school(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_school(uuid) TO service_role;
NOTIFY pgrst,'reload schema';

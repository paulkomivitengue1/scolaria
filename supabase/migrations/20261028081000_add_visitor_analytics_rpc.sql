create or replace function public.admin_get_visitor_analytics(p_days integer default 30, p_limit integer default 500)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select *
    from public.visitor_visits
    where p_days <= 0 or created_at >= now() - make_interval(days => least(p_days, 3650))
  ),
  summary as (
    select
      (select count(*)::integer from filtered) as total,
      (select count(distinct visitor_id)::integer from filtered) as unique_visitors,
      (select count(*)::integer from public.visitor_visits where created_at >= date_trunc('day', now())) as today,
      (select count(*)::integer from public.visitor_visits where created_at >= now() - interval '7 days') as last_7_days,
      (select count(*)::integer from public.visitor_visits where created_at >= now() - interval '30 days') as last_30_days,
      (select count(*)::integer from (
        select visitor_id from public.visitor_visits group by visitor_id having count(*) > 1
      ) returning_users) as returning_visitors
  ),
  recent as (
    select coalesce(jsonb_agg(to_jsonb(v) order by v.created_at desc), '[]'::jsonb) as visits
    from (
      select * from filtered order by created_at desc limit greatest(1, least(p_limit, 1000))
    ) v
  )
  select jsonb_build_object(
    'summary', (select to_jsonb(summary) from summary),
    'visits', (select visits from recent)
  );
$$;

revoke all on function public.admin_get_visitor_analytics(integer, integer) from public, anon, authenticated;
grant execute on function public.admin_get_visitor_analytics(integer, integer) to service_role;

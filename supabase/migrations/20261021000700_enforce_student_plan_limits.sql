create or replace function public.enforce_student_plan_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_plan text;
  v_status text;
  v_trial_ends_at timestamptz;
  v_limit integer;
  v_count integer;
begin
  -- Service-role maintenance/imports without a user JWT are handled by trusted server code.
  if auth.uid() is null then
    return new;
  end if;

  if not exists (
    select 1 from public.users u
    where u.auth_uid = auth.uid() and u.school_id = new.school_id
  ) then
    raise exception 'Vous ne pouvez inscrire des élèves que dans votre école.'
      using errcode = '42501';
  end if;

  select s.plan, s.subscription_status, s.trial_ends_at
    into v_plan, v_status, v_trial_ends_at
  from public.schools s
  where s.id = new.school_id;

  if v_status = 'suspended' or v_status = 'expired'
     or (v_status = 'trial' and v_trial_ends_at is not null and v_trial_ends_at <= now()) then
    raise exception 'L’accès de cette école est suspendu ou expiré.'
      using errcode = 'check_violation';
  end if;

  if v_status <> 'active' then
    return new;
  end if;

  if lower(coalesce(v_plan, 'essentiel')) in ('élite', 'elite') then
    return new;
  elsif lower(coalesce(v_plan, 'essentiel')) = 'premium' then
    v_limit := 500;
  else
    v_limit := 150;
  end if;

  select count(*)::integer into v_count
  from public.students st
  where st.school_id = new.school_id;

  if v_count >= v_limit then
    raise exception 'La formule % est limitée à % élèves. Changez de formule pour continuer.', coalesce(v_plan, 'Essentiel'), v_limit
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_student_plan_limit_before_insert on public.students;
create trigger enforce_student_plan_limit_before_insert
before insert on public.students
for each row execute function public.enforce_student_plan_limit();

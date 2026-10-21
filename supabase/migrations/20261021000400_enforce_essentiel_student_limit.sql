create or replace function public.enforce_essentiel_student_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_plan text;
  v_amount integer;
  v_count integer;
begin
  select subscription_status, plan, subscription_amount
    into v_status, v_plan, v_amount
    from public.schools
    where id = new.school_id
    for update;

  if not found then
    raise exception 'Établissement introuvable.';
  end if;

  if v_status = 'active'
     and coalesce(v_amount, 0) < 20000
     and lower(coalesce(v_plan, 'essentiel')) not in ('premium', 'élite', 'elite') then
    select count(*) into v_count
      from public.students
      where school_id = new.school_id;

    if v_count >= 150 then
      raise exception 'La formule Essentiel est limitée à 150 élèves. Passez à Premium ou Élite pour inscrire davantage d’élèves.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_essentiel_student_limit on public.students;
create trigger enforce_essentiel_student_limit
before insert on public.students
for each row execute function public.enforce_essentiel_student_limit();

revoke all on function public.enforce_essentiel_student_limit() from public, anon, authenticated;

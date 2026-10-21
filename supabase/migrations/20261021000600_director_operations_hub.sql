create table if not exists public.school_operations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  kind text not null check (kind in ('cash', 'attendance', 'task', 'announcement')),
  title text not null check (char_length(trim(title)) between 1 and 180),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  occurred_on date not null default current_date,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_operations_school_kind_date_idx
  on public.school_operations (school_id, kind, occurred_on desc);

alter table public.school_operations enable row level security;
grant select, insert, update, delete on public.school_operations to authenticated;

drop policy if exists "school members read own operations" on public.school_operations;
create policy "school members read own operations" on public.school_operations
  for select to authenticated
  using (exists (
    select 1 from public.users u
    where u.auth_uid = auth.uid() and u.school_id = school_operations.school_id
  ));

drop policy if exists "school members insert own operations" on public.school_operations;
create policy "school members insert own operations" on public.school_operations
  for insert to authenticated
  with check (exists (
    select 1 from public.users u
    where u.auth_uid = auth.uid() and u.school_id = school_operations.school_id
  ));

drop policy if exists "school members update own operations" on public.school_operations;
create policy "school members update own operations" on public.school_operations
  for update to authenticated
  using (exists (
    select 1 from public.users u
    where u.auth_uid = auth.uid() and u.school_id = school_operations.school_id
  ))
  with check (exists (
    select 1 from public.users u
    where u.auth_uid = auth.uid() and u.school_id = school_operations.school_id
  ));

drop policy if exists "school members delete own operations" on public.school_operations;
create policy "school members delete own operations" on public.school_operations
  for delete to authenticated
  using (exists (
    select 1 from public.users u
    where u.auth_uid = auth.uid() and u.school_id = school_operations.school_id
  ));

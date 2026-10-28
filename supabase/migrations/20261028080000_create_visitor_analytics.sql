create table if not exists public.visitor_visits (
  id uuid primary key,
  visitor_id uuid not null,
  session_id uuid not null,
  page_path text not null default '/',
  referrer_origin text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text not null default 'Autre / non identifié',
  operating_system text not null default 'Autre / non identifié',
  browser text not null default 'Autre / non identifié',
  screen_size text,
  language text,
  timezone text,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  constraint visitor_visits_duration_check check (duration_seconds is null or duration_seconds between 0 and 86400),
  constraint visitor_visits_device_check check (device_type in ('Téléphone','Tablette','Ordinateur','Autre / non identifié'))
);

create index if not exists visitor_visits_created_at_idx on public.visitor_visits (created_at desc);
create index if not exists visitor_visits_visitor_id_idx on public.visitor_visits (visitor_id);
create index if not exists visitor_visits_session_id_idx on public.visitor_visits (session_id);

alter table public.visitor_visits enable row level security;
revoke all on public.visitor_visits from anon, authenticated;
grant select, insert, update, delete on public.visitor_visits to service_role;

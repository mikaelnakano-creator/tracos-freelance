create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('admin', 'freelancer');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_status as enum ('draft', 'open', 'assigned', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.assignment_mode as enum ('direct', 'open');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_source as enum ('manual', 'google_calendar');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.acceptance_status as enum ('accepted', 'rejected', 'expired');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.financial_entry_type as enum (
    'event_earning',
    'payment',
    'advance',
    'positive_adjustment',
    'negative_adjustment',
    'reversal'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Cuiaba',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  email text not null,
  phone text,
  pix_key text,
  avatar_url text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  service_name text not null,
  description text,
  location_name text,
  location_address text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  freelancer_fee numeric(12,2) not null check (freelancer_fee >= 0),
  status public.event_status not null default 'draft',
  assignment_mode public.assignment_mode not null default 'open',
  assigned_freelancer_id uuid references public.profiles(id),
  google_calendar_id text,
  google_event_id text,
  google_event_link text,
  source public.event_source not null default 'manual',
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_assignment_requires_freelancer check (
    (assignment_mode = 'direct' and assigned_freelancer_id is not null)
    or (assignment_mode = 'open')
  )
);

create table if not exists public.event_acceptances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  status public.acceptance_status not null,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  entry_type public.financial_entry_type not null,
  description text not null,
  amount numeric(12,2) not null,
  effective_date date not null default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  reversed_entry_id uuid references public.financial_entries(id),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.google_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connected_by uuid not null references public.profiles(id),
  google_account_email text,
  encrypted_refresh_token text not null,
  encrypted_access_token text,
  access_token_expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, google_account_email)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_organization_id_idx on public.profiles (organization_id);
create index if not exists events_organization_id_idx on public.events (organization_id);
create index if not exists events_assigned_freelancer_id_idx on public.events (assigned_freelancer_id);
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_status_idx on public.events (status);
create index if not exists events_created_at_idx on public.events (created_at);
create index if not exists event_acceptances_event_id_idx on public.event_acceptances (event_id);
create index if not exists event_acceptances_freelancer_id_idx on public.event_acceptances (freelancer_id);
create index if not exists financial_entries_organization_id_idx on public.financial_entries (organization_id);
create index if not exists financial_entries_freelancer_id_idx on public.financial_entries (freelancer_id);
create index if not exists financial_entries_event_id_idx on public.financial_entries (event_id);
create index if not exists financial_entries_created_at_idx on public.financial_entries (created_at);
create index if not exists audit_logs_organization_id_idx on public.audit_logs (organization_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at);

create unique index if not exists events_google_unique_idx
  on public.events (organization_id, google_calendar_id, google_event_id)
  where google_calendar_id is not null and google_event_id is not null;

create unique index if not exists financial_entries_event_earning_once_idx
  on public.financial_entries (event_id)
  where entry_type = 'event_earning' and event_id is not null;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid() limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  )
$$;

create or replace function public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old_values jsonb default null,
  p_new_values jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.current_organization_id();
begin
  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  )
  values (
    v_org_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values
  );
end;
$$;

create or replace function public.accept_open_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_event public.events;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if v_profile.id is null or v_profile.role <> 'freelancer' or v_profile.is_active = false then
    raise exception 'Freelancer inativo ou inválido.';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if v_event.id is null or v_event.organization_id <> v_profile.organization_id then
    raise exception 'Trabalho não encontrado.';
  end if;

  if v_event.status <> 'open' or v_event.assigned_freelancer_id is not null then
    raise exception 'Este trabalho acabou de ser aceito por outro freelancer.';
  end if;

  update public.events
  set
    assigned_freelancer_id = v_profile.id,
    assignment_mode = 'direct',
    status = 'assigned',
    updated_at = now()
  where id = p_event_id;

  insert into public.event_acceptances (
    organization_id,
    event_id,
    freelancer_id,
    status
  )
  values (
    v_profile.organization_id,
    p_event_id,
    v_profile.id,
    'accepted'
  );

  perform public.write_audit_log(
    'event.accepted',
    'events',
    p_event_id,
    to_jsonb(v_event),
    jsonb_build_object('assigned_freelancer_id', v_profile.id, 'status', 'assigned')
  );

  return jsonb_build_object('ok', true, 'event_id', p_event_id);
end;
$$;

create or replace function public.complete_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem concluir eventos.';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
    and organization_id = public.current_organization_id()
  for update;

  if v_event.id is null then
    raise exception 'Evento não encontrado.';
  end if;

  if v_event.assigned_freelancer_id is null then
    raise exception 'Não é possível concluir evento sem freelancer.';
  end if;

  update public.events
  set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
  where id = p_event_id;

  insert into public.financial_entries (
    organization_id,
    freelancer_id,
    event_id,
    entry_type,
    description,
    amount,
    effective_date,
    created_by
  )
  select
    v_event.organization_id,
    v_event.assigned_freelancer_id,
    v_event.id,
    'event_earning',
    'Evento concluído: ' || v_event.title,
    v_event.freelancer_fee,
    current_date,
    auth.uid()
  where not exists (
    select 1 from public.financial_entries
    where event_id = v_event.id
      and entry_type = 'event_earning'
  );

  perform public.write_audit_log(
    'event.completed',
    'events',
    p_event_id,
    to_jsonb(v_event),
    jsonb_build_object('status', 'completed')
  );

  return jsonb_build_object('ok', true, 'event_id', p_event_id);
end;
$$;

create or replace view public.event_financial_summary as
select
  e.id as event_id,
  e.organization_id,
  e.assigned_freelancer_id as freelancer_id,
  e.freelancer_fee,
  coalesce(sum(abs(fe.amount)) filter (where fe.entry_type in ('payment', 'advance')), 0)::numeric(12,2) as total_paid,
  (e.freelancer_fee - coalesce(sum(abs(fe.amount)) filter (where fe.entry_type in ('payment', 'advance')), 0))::numeric(12,2) as event_balance
from public.events e
left join public.financial_entries fe on fe.event_id = e.id
group by e.id;

create or replace view public.freelancer_financial_summary as
select
  p.organization_id,
  p.id as freelancer_id,
  p.full_name,
  coalesce(sum(fe.amount) filter (where fe.entry_type = 'event_earning'), 0)::numeric(12,2) as total_earned,
  coalesce(sum(abs(fe.amount)) filter (where fe.entry_type in ('payment', 'advance')), 0)::numeric(12,2) as total_paid,
  coalesce(sum(fe.amount) filter (where fe.entry_type = 'positive_adjustment'), 0)::numeric(12,2) as positive_adjustments,
  coalesce(sum(abs(fe.amount)) filter (where fe.entry_type = 'negative_adjustment'), 0)::numeric(12,2) as negative_adjustments,
  coalesce(sum(fe.amount), 0)::numeric(12,2) as balance
from public.profiles p
left join public.financial_entries fe on fe.freelancer_id = p.id
where p.role = 'freelancer'
group by p.organization_id, p.id, p.full_name;

create or replace view public.organization_financial_summary as
select
  organization_id,
  coalesce(sum(amount) filter (where entry_type = 'event_earning'), 0)::numeric(12,2) as total_generated,
  coalesce(sum(abs(amount)) filter (where entry_type in ('payment', 'advance')), 0)::numeric(12,2) as total_paid,
  greatest(coalesce(sum(amount), 0), 0)::numeric(12,2) as total_due,
  greatest(-coalesce(sum(amount), 0), 0)::numeric(12,2) as total_advances,
  coalesce(sum(amount), 0)::numeric(12,2) as net_balance
from public.financial_entries
group by organization_id;

create or replace view public.monthly_financials as
select
  organization_id,
  date_trunc('month', effective_date)::date as month,
  coalesce(sum(amount) filter (where entry_type = 'event_earning'), 0)::numeric(12,2) as generated,
  coalesce(sum(abs(amount)) filter (where entry_type in ('payment', 'advance')), 0)::numeric(12,2) as paid
from public.financial_entries
group by organization_id, date_trunc('month', effective_date);

create or replace view public.upcoming_events as
select *
from public.events
where starts_at >= now()
  and status in ('open', 'assigned');

create or replace view public.open_events as
select *
from public.events
where status = 'open';

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_acceptances enable row level security;
alter table public.financial_entries enable row level security;
alter table public.google_connections enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Admins read own organization" on public.organizations;
create policy "Admins read own organization"
on public.organizations for select
using (id = public.current_organization_id());

drop policy if exists "Profiles visible by role" on public.profiles;
create policy "Profiles visible by role"
on public.profiles for select
using (
  organization_id = public.current_organization_id()
  and (
    public.is_admin()
    or id = auth.uid()
  )
);

drop policy if exists "Admins manage profiles in organization" on public.profiles;
create policy "Admins manage profiles in organization"
on public.profiles for all
using (public.is_admin() and organization_id = public.current_organization_id())
with check (public.is_admin() and organization_id = public.current_organization_id());

drop policy if exists "Events visible by role" on public.events;
create policy "Events visible by role"
on public.events for select
using (
  organization_id = public.current_organization_id()
  and (
    public.is_admin()
    or status = 'open'
    or assigned_freelancer_id = auth.uid()
  )
);

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events"
on public.events for all
using (public.is_admin() and organization_id = public.current_organization_id())
with check (public.is_admin() and organization_id = public.current_organization_id());

drop policy if exists "Acceptances visible by owner or admin" on public.event_acceptances;
create policy "Acceptances visible by owner or admin"
on public.event_acceptances for select
using (
  organization_id = public.current_organization_id()
  and (public.is_admin() or freelancer_id = auth.uid())
);

drop policy if exists "Financial entries visible by owner or admin" on public.financial_entries;
create policy "Financial entries visible by owner or admin"
on public.financial_entries for select
using (
  organization_id = public.current_organization_id()
  and (public.is_admin() or freelancer_id = auth.uid())
);

drop policy if exists "Admins manage financial entries" on public.financial_entries;
create policy "Admins manage financial entries"
on public.financial_entries for all
using (public.is_admin() and organization_id = public.current_organization_id())
with check (public.is_admin() and organization_id = public.current_organization_id());

drop policy if exists "Admins manage google connections" on public.google_connections;
create policy "Admins manage google connections"
on public.google_connections for all
using (public.is_admin() and organization_id = public.current_organization_id())
with check (public.is_admin() and organization_id = public.current_organization_id());

drop policy if exists "Audit visible to admins" on public.audit_logs;
create policy "Audit visible to admins"
on public.audit_logs for select
using (public.is_admin() and organization_id = public.current_organization_id());

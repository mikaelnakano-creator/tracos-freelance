create extension if not exists pgcrypto;

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  alter column id set default gen_random_uuid(),
  alter column organization_id drop not null,
  alter column role drop not null,
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists google_avatar_url text,
  add column if not exists first_access_at timestamptz,
  add column if not exists last_access_at timestamptz;

update public.profiles
set
  email = lower(trim(email)),
  auth_user_id = coalesce(auth_user_id, id)
where email <> lower(trim(email))
   or auth_user_id is null;

do $$
begin
  alter table public.profiles
    add constraint profiles_email_lowercase check (email = lower(email));
exception when duplicate_object then null;
end $$;

create unique index if not exists profiles_auth_user_id_unique_idx
  on public.profiles (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists profiles_email_normalized_unique_idx
  on public.profiles (lower(email));

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table if not exists public.organization_member_roles (
  id uuid primary key default gen_random_uuid(),
  organization_member_id uuid not null references public.organization_members(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  unique (organization_member_id, role)
);

create index if not exists organization_members_organization_id_idx
  on public.organization_members (organization_id);

create index if not exists organization_members_profile_id_idx
  on public.organization_members (profile_id);

create index if not exists organization_member_roles_role_idx
  on public.organization_member_roles (role);

insert into public.organizations (name, slug, timezone)
values ('Traços Detalhados', 'tracos-detalhados', 'America/Cuiaba')
on conflict (slug) do nothing;

insert into public.organization_members (
  organization_id,
  profile_id,
  is_active,
  created_at,
  updated_at
)
select
  p.organization_id,
  p.id,
  p.is_active,
  p.created_at,
  now()
from public.profiles p
where p.organization_id is not null
on conflict (organization_id, profile_id) do update
set
  is_active = excluded.is_active,
  updated_at = now();

insert into public.organization_member_roles (organization_member_id, role)
select om.id, p.role
from public.organization_members om
join public.profiles p on p.id = om.profile_id
where p.role is not null
on conflict (organization_member_id, role) do nothing;

insert into public.profiles (
  organization_id,
  role,
  email,
  full_name,
  phone,
  pix_key,
  notes,
  is_active,
  auth_user_id,
  first_access_at,
  last_access_at
)
select
  au.organization_id,
  au.role,
  lower(au.email),
  au.full_name,
  coalesce(au.phone, ''),
  au.pix_key,
  'Migrado de authorized_users.',
  au.is_active,
  au.linked_auth_user_id,
  au.first_access_at,
  au.last_access_at
from public.authorized_users au
where not exists (
  select 1 from public.profiles p where lower(p.email) = lower(au.email)
);

with authorized_profiles as (
  select
    au.organization_id,
    au.role,
    au.is_active,
    p.id as profile_id
  from public.authorized_users au
  join public.profiles p on lower(p.email) = lower(au.email)
),
member_upsert as (
  insert into public.organization_members (
    organization_id,
    profile_id,
    is_active
  )
  select organization_id, profile_id, is_active
  from authorized_profiles
  on conflict (organization_id, profile_id) do update
  set is_active = excluded.is_active, updated_at = now()
  returning id, organization_id, profile_id
)
insert into public.organization_member_roles (organization_member_id, role)
select mu.id, ap.role
from member_upsert mu
join authorized_profiles ap
  on ap.organization_id = mu.organization_id
 and ap.profile_id = mu.profile_id
on conflict (organization_member_id, role) do nothing;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_member_id(p_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select om.id
  from public.organization_members om
  join public.profiles p on p.id = om.profile_id
  where p.auth_user_id = auth.uid()
    and p.is_active = true
    and om.organization_id = p_organization_id
    and om.is_active = true
  limit 1
$$;

create or replace function public.has_organization_role(
  p_organization_id uuid,
  p_role public.user_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.organization_member_roles omr
      on omr.organization_member_id = om.id
    join public.profiles p on p.id = om.profile_id
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and om.organization_id = p_organization_id
      and om.is_active = true
      and omr.role = p_role
  )
$$;

create or replace function public.is_active_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_member_id(p_organization_id) is not null
$$;

create or replace function public.can_access_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_organization_role(p_organization_id, 'admin')
$$;

create or replace function public.can_access_freelancer(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_organization_role(p_organization_id, 'freelancer')
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select om.organization_id
  from public.organization_members om
  join public.profiles p on p.id = om.profile_id
  where p.auth_user_id = auth.uid()
    and p.is_active = true
    and om.is_active = true
  order by om.created_at
  limit 1
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
    from public.organization_members om
    join public.organization_member_roles omr
      on omr.organization_member_id = om.id
    join public.profiles p on p.id = om.profile_id
    where p.auth_user_id = auth.uid()
      and p.is_active = true
      and om.is_active = true
      and omr.role = 'admin'
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
  v_profile_id uuid := public.current_profile_id();
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
    v_profile_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values
  );
end;
$$;

create or replace function public.prevent_freelancer_sensitive_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.auth_user_id then
    if old.auth_user_id is distinct from new.auth_user_id
      or old.email <> new.email
      or old.is_active <> new.is_active
      or old.first_access_at is distinct from new.first_access_at
      or old.last_access_at is distinct from new.last_access_at
    then
      raise exception 'Freelancers podem alterar apenas nome, telefone e chave Pix.';
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.bootstrap_google_user(
  p_auth_user_id uuid,
  p_email text,
  p_full_name text,
  p_avatar_url text,
  p_first_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_first_admin_email text := lower(trim(coalesce(p_first_admin_email, '')));
  v_now timestamptz := now();
  v_org_id uuid;
  v_profile_id uuid;
  v_member_id uuid;
  v_existing_auth_user_id uuid;
  v_profile_active boolean;
  v_member_active boolean;
  v_admin_count integer;
  v_roles public.user_role[];
begin
  if p_auth_user_id is null or v_email = '' then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  insert into public.organizations (name, slug, timezone)
  values ('Traços Detalhados', 'tracos-detalhados', 'America/Cuiaba')
  on conflict (slug) do update set updated_at = now()
  returning id into v_org_id;

  select count(*) into v_admin_count
  from public.organization_members om
  join public.organization_member_roles omr
    on omr.organization_member_id = om.id
  join public.profiles p on p.id = om.profile_id
  where om.organization_id = v_org_id
    and om.is_active = true
    and p.is_active = true
    and omr.role = 'admin';

  select id, auth_user_id, is_active
  into v_profile_id, v_existing_auth_user_id, v_profile_active
  from public.profiles
  where lower(email) = v_email
  for update;

  if v_profile_id is null
     and v_email = v_first_admin_email
     and v_admin_count = 0 then
    insert into public.profiles (
      organization_id,
      role,
      auth_user_id,
      email,
      full_name,
      phone,
      pix_key,
      avatar_url,
      google_avatar_url,
      notes,
      is_active,
      first_access_at,
      last_access_at
    )
    values (
      v_org_id,
      'admin',
      p_auth_user_id,
      v_email,
      coalesce(nullif(p_full_name, ''), 'Mikael Nakano'),
      '',
      null,
      p_avatar_url,
      p_avatar_url,
      'Primeiro administrador criado por FIRST_ADMIN_EMAIL.',
      true,
      v_now,
      v_now
    )
    returning id into v_profile_id;
    v_profile_active := true;
    v_existing_auth_user_id := p_auth_user_id;
  end if;

  if v_profile_id is null then
    return jsonb_build_object(
      'status', 'unauthorized',
      'message', 'Esta conta Google ainda não foi autorizada pela Traços Detalhados.'
    );
  end if;

  if v_existing_auth_user_id is not null
     and v_existing_auth_user_id <> p_auth_user_id then
    return jsonb_build_object(
      'status', 'unauthorized',
      'message', 'Este e-mail já está vinculado a outro usuário de autenticação.'
    );
  end if;

  insert into public.organization_members (
    organization_id,
    profile_id,
    is_active
  )
  select v_org_id, v_profile_id, true
  where v_email = v_first_admin_email
    and v_admin_count = 0
  on conflict (organization_id, profile_id) do update
  set is_active = true, updated_at = now();

  select id, is_active into v_member_id, v_member_active
  from public.organization_members
  where organization_id = v_org_id
    and profile_id = v_profile_id
  for update;

  if v_member_id is null then
    return jsonb_build_object(
      'status', 'unauthorized',
      'message', 'Esta conta Google ainda não foi autorizada pela Traços Detalhados.'
    );
  end if;

  if v_email = v_first_admin_email and v_admin_count = 0 then
    insert into public.organization_member_roles (
      organization_member_id,
      role
    )
    values
      (v_member_id, 'admin'),
      (v_member_id, 'freelancer')
    on conflict (organization_member_id, role) do nothing;
  end if;

  if not coalesce(v_profile_active, false)
     or not coalesce(v_member_active, false) then
    return jsonb_build_object(
      'status', 'inactive',
      'message', 'Seu acesso está inativo. Entre em contato com a Traços Detalhados.'
    );
  end if;

  update public.profiles
  set
    auth_user_id = p_auth_user_id,
    full_name = coalesce(nullif(full_name, ''), p_full_name, full_name),
    avatar_url = coalesce(p_avatar_url, avatar_url),
    google_avatar_url = coalesce(p_avatar_url, google_avatar_url),
    first_access_at = coalesce(first_access_at, v_now),
    last_access_at = v_now,
    updated_at = v_now
  where id = v_profile_id;

  select array_agg(omr.role order by omr.role) into v_roles
  from public.organization_member_roles omr
  where omr.organization_member_id = v_member_id;

  if v_roles is null or cardinality(v_roles) = 0 then
    return jsonb_build_object(
      'status', 'unauthorized',
      'message', 'Esta conta Google ainda não foi autorizada pela Traços Detalhados.'
    );
  end if;

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
    v_profile_id,
    case
      when v_email = v_first_admin_email and v_admin_count = 0
        then 'login.first_admin_bootstrap'
      else 'login.google_linked'
    end,
    'profiles',
    v_profile_id,
    null,
    jsonb_build_object('email', v_email, 'roles', v_roles)
  );

  return jsonb_build_object(
    'status', 'authorized',
    'profile_id', v_profile_id,
    'organization_id', v_org_id,
    'roles', to_jsonb(v_roles)
  );
end;
$$;

create or replace function public.assert_event_professional_slot_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_slots integer;
begin
  if not exists (
    select 1
    from public.event_services es
    where es.id = new.event_service_id
      and es.event_id = new.event_id
      and es.organization_id = new.organization_id
  ) then
    raise exception 'A vaga precisa pertencer a um serviço do mesmo evento.';
  end if;

  if new.assigned_freelancer_id is not null and not exists (
    select 1
    from public.organization_members om
    join public.organization_member_roles omr
      on omr.organization_member_id = om.id
    join public.profiles p on p.id = om.profile_id
    where p.id = new.assigned_freelancer_id
      and p.is_active = true
      and om.organization_id = new.organization_id
      and om.is_active = true
      and omr.role = 'freelancer'
  ) then
    raise exception 'Freelancer inválido para esta organização.';
  end if;

  if new.status <> 'cancelled' then
    select count(*) into v_active_slots
    from public.event_professional_slots eps
    where eps.event_id = new.event_id
      and eps.status <> 'cancelled'
      and eps.id <> coalesce(new.id, gen_random_uuid());

    if v_active_slots >= 5 then
      raise exception 'Este evento pode ter no máximo 5 profissionais.';
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.accept_open_event_slot(p_slot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := public.current_profile_id();
  v_profile public.profiles;
  v_event public.events;
  v_slot public.event_professional_slots;
begin
  select * into v_profile
  from public.profiles
  where id = v_profile_id
  for update;

  if v_profile.id is null
     or v_profile.is_active = false then
    raise exception 'Freelancer inativo ou inválido.';
  end if;

  select * into v_slot
  from public.event_professional_slots
  where id = p_slot_id
  for update;

  if v_slot.id is null
     or not public.can_access_freelancer(v_slot.organization_id) then
    raise exception 'Vaga não encontrada.';
  end if;

  select * into v_event
  from public.events
  where id = v_slot.event_id
  for update;

  if v_event.id is null or v_event.organization_id <> v_slot.organization_id then
    raise exception 'Evento não encontrado.';
  end if;

  if v_event.status not in ('open', 'partially_assigned') then
    raise exception 'Esta vaga não está aberta para aceite.';
  end if;

  if v_slot.status <> 'open' or v_slot.assigned_freelancer_id is not null then
    raise exception 'Esta vaga acabou de ser aceita por outro freelancer.';
  end if;

  if exists (
    select 1
    from public.event_professional_slots eps
    where eps.event_id = v_slot.event_id
      and eps.assigned_freelancer_id = v_profile.id
      and eps.status <> 'cancelled'
  ) then
    raise exception 'Você já faz parte da equipe deste evento.';
  end if;

  update public.event_professional_slots
  set
    assigned_freelancer_id = v_profile.id,
    assignment_mode = 'direct',
    status = 'assigned',
    accepted_at = now(),
    updated_at = now()
  where id = p_slot_id
  returning * into v_slot;

  insert into public.event_acceptances (
    organization_id,
    event_id,
    event_professional_slot_id,
    freelancer_id,
    status
  )
  values (
    v_slot.organization_id,
    v_slot.event_id,
    v_slot.id,
    v_profile.id,
    'accepted'
  );

  perform public.recalculate_event_status(v_slot.event_id);

  perform public.write_audit_log(
    'event_slot.accepted',
    'event_professional_slots',
    v_slot.id,
    null,
    jsonb_build_object(
      'event_id', v_slot.event_id,
      'assigned_freelancer_id', v_profile.id,
      'status', 'assigned'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'event_id', v_slot.event_id,
    'event_professional_slot_id', v_slot.id
  );
end;
$$;

drop view if exists public.freelancer_financial_summary;
create view public.freelancer_financial_summary as
select
  om.organization_id,
  p.id as freelancer_id,
  p.full_name,
  coalesce(sum(fe.amount) filter (where fe.entry_type = 'event_earning'), 0)::numeric(12,2) as total_earned,
  coalesce(sum(abs(fe.amount)) filter (where fe.entry_type in ('payment', 'advance')), 0)::numeric(12,2) as total_paid,
  coalesce(sum(fe.amount) filter (where fe.entry_type = 'positive_adjustment'), 0)::numeric(12,2) as positive_adjustments,
  coalesce(sum(abs(fe.amount)) filter (where fe.entry_type = 'negative_adjustment'), 0)::numeric(12,2) as negative_adjustments,
  coalesce(sum(fe.amount), 0)::numeric(12,2) as balance
from public.profiles p
join public.organization_members om on om.profile_id = p.id
join public.organization_member_roles omr on omr.organization_member_id = om.id
left join public.financial_entries fe on fe.freelancer_id = p.id
where omr.role = 'freelancer'
group by om.organization_id, p.id, p.full_name;

alter table public.organization_members enable row level security;
alter table public.organization_member_roles enable row level security;

drop policy if exists "Admins read own organization" on public.organizations;
create policy "Organizations visible to active members"
on public.organizations for select
using (public.is_active_member(id));

drop policy if exists "Profiles visible by role" on public.profiles;
drop policy if exists "Admins manage profiles in organization" on public.profiles;
drop policy if exists "Freelancers update own public profile" on public.profiles;

create policy "Profiles visible by membership"
on public.profiles for select
using (
  auth_user_id = auth.uid()
  or exists (
    select 1
    from public.organization_members target_member
    where target_member.profile_id = profiles.id
      and public.can_access_admin(target_member.organization_id)
  )
);

create policy "Admins manage profiles by organization"
on public.profiles for all
using (
  exists (
    select 1
    from public.organization_members target_member
    where target_member.profile_id = profiles.id
      and public.can_access_admin(target_member.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.organization_members target_member
    where target_member.profile_id = profiles.id
      and public.can_access_admin(target_member.organization_id)
  )
);

create policy "Members update own public profile"
on public.profiles for update
using (auth_user_id = auth.uid() and is_active = true)
with check (auth_user_id = auth.uid() and is_active = true);

drop policy if exists "Organization members visible by role" on public.organization_members;
create policy "Organization members visible by role"
on public.organization_members for select
using (
  profile_id = public.current_profile_id()
  or public.can_access_admin(organization_id)
);

drop policy if exists "Admins manage organization members" on public.organization_members;
create policy "Admins manage organization members"
on public.organization_members for all
using (public.can_access_admin(organization_id))
with check (public.can_access_admin(organization_id));

drop policy if exists "Organization member roles visible by role" on public.organization_member_roles;
create policy "Organization member roles visible by role"
on public.organization_member_roles for select
using (
  exists (
    select 1
    from public.organization_members om
    where om.id = organization_member_roles.organization_member_id
      and (
        om.profile_id = public.current_profile_id()
        or public.can_access_admin(om.organization_id)
      )
  )
);

drop policy if exists "Admins manage organization member roles" on public.organization_member_roles;
create policy "Admins manage organization member roles"
on public.organization_member_roles for all
using (
  exists (
    select 1
    from public.organization_members om
    where om.id = organization_member_roles.organization_member_id
      and public.can_access_admin(om.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.id = organization_member_roles.organization_member_id
      and public.can_access_admin(om.organization_id)
  )
);

drop policy if exists "Events visible by role" on public.events;
create policy "Events visible by membership"
on public.events for select
using (
  public.can_access_admin(organization_id)
  or (
    public.can_access_freelancer(organization_id)
    and (
      status in ('open', 'partially_assigned')
      or assigned_freelancer_id = public.current_profile_id()
      or exists (
        select 1
        from public.event_professional_slots eps
        where eps.event_id = events.id
          and eps.assigned_freelancer_id = public.current_profile_id()
          and eps.status <> 'cancelled'
      )
      or exists (
        select 1
        from public.event_professional_slots eps
        where eps.event_id = events.id
          and eps.status = 'open'
      )
    )
  )
);

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events"
on public.events for all
using (public.can_access_admin(organization_id))
with check (public.can_access_admin(organization_id));

drop policy if exists "Services visible by organization" on public.services;
create policy "Services visible by membership"
on public.services for select
using (
  public.can_access_admin(organization_id)
  or (is_active = true and public.is_active_member(organization_id))
);

drop policy if exists "Admins manage services" on public.services;
create policy "Admins manage services"
on public.services for all
using (public.can_access_admin(organization_id))
with check (public.can_access_admin(organization_id));

drop policy if exists "Event services visible by role" on public.event_services;
create policy "Event services visible by membership"
on public.event_services for select
using (
  public.can_access_admin(organization_id)
  or exists (
    select 1
    from public.events e
    where e.id = event_services.event_id
      and (
        public.can_access_admin(e.organization_id)
        or e.status in ('open', 'partially_assigned')
        or exists (
          select 1
          from public.event_professional_slots eps
          where eps.event_id = e.id
            and eps.assigned_freelancer_id = public.current_profile_id()
        )
      )
  )
);

drop policy if exists "Admins manage event services" on public.event_services;
create policy "Admins manage event services"
on public.event_services for all
using (public.can_access_admin(organization_id))
with check (public.can_access_admin(organization_id));

drop policy if exists "Event slots visible by role" on public.event_professional_slots;
create policy "Event slots visible by membership"
on public.event_professional_slots for select
using (
  public.can_access_admin(organization_id)
  or (
    public.can_access_freelancer(organization_id)
    and (
      status = 'open'
      or assigned_freelancer_id = public.current_profile_id()
    )
  )
);

drop policy if exists "Admins manage event slots" on public.event_professional_slots;
create policy "Admins manage event slots"
on public.event_professional_slots for all
using (public.can_access_admin(organization_id))
with check (public.can_access_admin(organization_id));

drop policy if exists "Acceptances visible by owner or admin" on public.event_acceptances;
create policy "Acceptances visible by owner or admin"
on public.event_acceptances for select
using (
  public.can_access_admin(organization_id)
  or freelancer_id = public.current_profile_id()
);

drop policy if exists "Financial entries visible by owner or admin" on public.financial_entries;
create policy "Financial entries visible by owner or admin"
on public.financial_entries for select
using (
  public.can_access_admin(organization_id)
  or freelancer_id = public.current_profile_id()
);

drop policy if exists "Admins manage financial entries" on public.financial_entries;
create policy "Admins manage financial entries"
on public.financial_entries for all
using (public.can_access_admin(organization_id))
with check (public.can_access_admin(organization_id));

drop policy if exists "Admins manage google connections" on public.google_connections;
create policy "Admins manage google connections"
on public.google_connections for all
using (public.can_access_admin(organization_id))
with check (public.can_access_admin(organization_id));

drop policy if exists "Audit visible to admins" on public.audit_logs;
create policy "Audit visible to admins"
on public.audit_logs for select
using (public.can_access_admin(organization_id));

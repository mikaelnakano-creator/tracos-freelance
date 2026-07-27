do $$
begin
  create type public.slot_status as enum (
    'draft',
    'open',
    'assigned',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  default_professionals integer not null default 1 check (
    default_professionals between 1 and 5
  ),
  default_fee numeric(12,2) check (default_fee is null or default_fee >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.event_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  quantity_required integer not null check (quantity_required between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_professional_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  event_service_id uuid not null references public.event_services(id) on delete cascade,
  slot_number integer not null check (slot_number between 1 and 5),
  assignment_mode public.assignment_mode not null default 'open',
  assigned_freelancer_id uuid references public.profiles(id),
  agreed_fee numeric(12,2) not null check (agreed_fee >= 0),
  status public.slot_status not null default 'open',
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_slot_requires_freelancer check (
    (assignment_mode = 'direct' and assigned_freelancer_id is not null)
    or assignment_mode = 'open'
  ),
  constraint assigned_slot_requires_freelancer check (
    status not in ('assigned', 'completed')
    or assigned_freelancer_id is not null
  )
);

alter table public.event_acceptances
  add column if not exists event_professional_slot_id uuid
  references public.event_professional_slots(id) on delete set null;

alter table public.financial_entries
  add column if not exists event_professional_slot_id uuid
  references public.event_professional_slots(id) on delete set null;

create index if not exists services_organization_active_idx
  on public.services (organization_id, is_active, name);

create index if not exists event_services_event_id_idx
  on public.event_services (event_id);

create index if not exists event_services_organization_id_idx
  on public.event_services (organization_id);

create unique index if not exists event_services_event_service_unique_idx
  on public.event_services (event_id, service_id)
  where service_id is not null;

create index if not exists event_professional_slots_event_id_idx
  on public.event_professional_slots (event_id);

create index if not exists event_professional_slots_event_service_id_idx
  on public.event_professional_slots (event_service_id);

create index if not exists event_professional_slots_freelancer_id_idx
  on public.event_professional_slots (assigned_freelancer_id);

create index if not exists event_professional_slots_status_idx
  on public.event_professional_slots (status);

create unique index if not exists event_professional_slots_number_unique_idx
  on public.event_professional_slots (event_service_id, slot_number);

create unique index if not exists event_professional_slots_freelancer_once_active_idx
  on public.event_professional_slots (event_id, assigned_freelancer_id)
  where assigned_freelancer_id is not null
    and status <> 'cancelled';

create index if not exists event_acceptances_slot_id_idx
  on public.event_acceptances (event_professional_slot_id);

create unique index if not exists event_acceptances_slot_accepted_once_idx
  on public.event_acceptances (event_professional_slot_id)
  where status = 'accepted'
    and event_professional_slot_id is not null;

create index if not exists financial_entries_slot_id_idx
  on public.financial_entries (event_professional_slot_id);

drop index if exists public.financial_entries_event_earning_once_idx;

create unique index if not exists financial_entries_event_slot_earning_once_idx
  on public.financial_entries (event_professional_slot_id)
  where entry_type = 'event_earning'
    and event_professional_slot_id is not null;

insert into public.services (
  organization_id,
  name,
  description,
  default_professionals,
  default_fee
)
select
  e.organization_id,
  e.service_name,
  'Serviço migrado do cadastro antigo de eventos.',
  1,
  max(e.freelancer_fee)
from public.events e
where e.service_name is not null
group by e.organization_id, e.service_name
on conflict (organization_id, name) do nothing;

insert into public.event_services (
  organization_id,
  event_id,
  service_id,
  service_name_snapshot,
  quantity_required
)
select
  e.organization_id,
  e.id,
  s.id,
  e.service_name,
  1
from public.events e
join public.services s
  on s.organization_id = e.organization_id
 and s.name = e.service_name
where not exists (
  select 1
  from public.event_services es
  where es.event_id = e.id
);

insert into public.event_professional_slots (
  organization_id,
  event_id,
  event_service_id,
  slot_number,
  assignment_mode,
  assigned_freelancer_id,
  agreed_fee,
  status,
  accepted_at,
  completed_at,
  cancelled_at,
  cancellation_reason,
  created_by
)
select
  e.organization_id,
  e.id,
  es.id,
  1,
  case when e.assigned_freelancer_id is null then 'open' else 'direct' end::public.assignment_mode,
  e.assigned_freelancer_id,
  e.freelancer_fee,
  case
    when e.status = 'cancelled' then 'cancelled'
    when e.status = 'completed' and e.assigned_freelancer_id is not null then 'completed'
    when e.status = 'assigned' and e.assigned_freelancer_id is not null then 'assigned'
    when e.status = 'draft' then 'draft'
    else 'open'
  end::public.slot_status,
  case when e.assigned_freelancer_id is not null then e.updated_at else null end,
  e.completed_at,
  e.cancelled_at,
  e.cancellation_reason,
  e.created_by
from public.events e
join public.event_services es on es.event_id = e.id
where not exists (
  select 1
  from public.event_professional_slots eps
  where eps.event_id = e.id
);

update public.financial_entries fe
set event_professional_slot_id = eps.id
from public.event_professional_slots eps
where fe.event_id = eps.event_id
  and fe.freelancer_id = eps.assigned_freelancer_id
  and fe.event_professional_slot_id is null;

update public.event_acceptances ea
set event_professional_slot_id = eps.id
from public.event_professional_slots eps
where ea.event_id = eps.event_id
  and ea.freelancer_id = eps.assigned_freelancer_id
  and ea.event_professional_slot_id is null;

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
    from public.profiles p
    where p.id = new.assigned_freelancer_id
      and p.organization_id = new.organization_id
      and p.role = 'freelancer'
      and p.is_active = true
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

drop trigger if exists event_professional_slots_integrity
  on public.event_professional_slots;

create trigger event_professional_slots_integrity
before insert or update
on public.event_professional_slots
for each row
execute function public.assert_event_professional_slot_integrity();

create or replace function public.assert_event_ready_to_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required integer;
  v_active integer;
begin
  select coalesce(sum(quantity_required), 0) into v_required
  from public.event_services
  where event_id = new.id;

  select count(*) into v_active
  from public.event_professional_slots
  where event_id = new.id
    and status <> 'cancelled';

  if v_required < 1 or v_active < 1 then
    raise exception 'Antes de publicar, o evento precisa ter ao menos 1 vaga.';
  end if;

  if v_required > 5 or v_active > 5 then
    raise exception 'Este evento pode ter no máximo 5 profissionais.';
  end if;

  if v_required <> v_active then
    raise exception 'A quantidade de vagas precisa bater com os serviços do evento.';
  end if;

  return new;
end;
$$;

drop trigger if exists events_publish_requires_slots on public.events;

create trigger events_publish_requires_slots
before update of status
on public.events
for each row
when (
  old.status = 'draft'
  and new.status in ('open', 'partially_assigned', 'fully_assigned')
)
execute function public.assert_event_ready_to_publish();

create or replace function public.recalculate_event_status(p_event_id uuid)
returns public.event_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status public.event_status;
  v_active_count integer;
  v_open_count integer;
  v_completed_count integer;
  v_next_status public.event_status;
begin
  select status into v_current_status
  from public.events
  where id = p_event_id;

  if v_current_status is null then
    raise exception 'Evento não encontrado.';
  end if;

  if v_current_status = 'cancelled' then
    return v_current_status;
  end if;

  select
    count(*) filter (where status <> 'cancelled'),
    count(*) filter (where status = 'open'),
    count(*) filter (where status = 'completed')
  into v_active_count, v_open_count, v_completed_count
  from public.event_professional_slots
  where event_id = p_event_id;

  if v_active_count = 0 then
    v_next_status := 'draft';
  elsif v_completed_count = v_active_count then
    v_next_status := 'completed';
  elsif v_current_status = 'draft' then
    v_next_status := 'draft';
  elsif v_open_count = v_active_count then
    v_next_status := 'open';
  elsif v_open_count > 0 then
    v_next_status := 'partially_assigned';
  else
    v_next_status := 'fully_assigned';
  end if;

  update public.events
  set
    status = v_next_status,
    completed_at = case
      when v_next_status = 'completed' then coalesce(completed_at, now())
      else completed_at
    end,
    updated_at = now()
  where id = p_event_id;

  return v_next_status;
end;
$$;

create or replace function public.recalculate_event_status_after_slot_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_event_status(coalesce(new.event_id, old.event_id));
  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists event_professional_slots_recalculate_event
  on public.event_professional_slots;

create trigger event_professional_slots_recalculate_event
after insert or update or delete
on public.event_professional_slots
for each row
execute function public.recalculate_event_status_after_slot_change();

create or replace function public.accept_open_event_slot(p_slot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_event public.events;
  v_slot public.event_professional_slots;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if v_profile.id is null or v_profile.role <> 'freelancer' or v_profile.is_active = false then
    raise exception 'Freelancer inativo ou inválido.';
  end if;

  select * into v_slot
  from public.event_professional_slots
  where id = p_slot_id
  for update;

  if v_slot.id is null or v_slot.organization_id <> v_profile.organization_id then
    raise exception 'Vaga não encontrada.';
  end if;

  select * into v_event
  from public.events
  where id = v_slot.event_id
  for update;

  if v_event.id is null or v_event.organization_id <> v_profile.organization_id then
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
    v_profile.organization_id,
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

create or replace function public.accept_open_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_id uuid;
begin
  select id into v_slot_id
  from public.event_professional_slots
  where event_id = p_event_id
    and status = 'open'
  order by created_at, slot_number
  limit 1;

  if v_slot_id is null then
    raise exception 'Este trabalho acabou de ser aceito por outro freelancer.';
  end if;

  return public.accept_open_event_slot(v_slot_id);
end;
$$;

create or replace function public.complete_event_slot(p_slot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.event_professional_slots;
  v_event public.events;
  v_service_name text;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem concluir vagas.';
  end if;

  select * into v_slot
  from public.event_professional_slots
  where id = p_slot_id
    and organization_id = public.current_organization_id()
  for update;

  if v_slot.id is null then
    raise exception 'Vaga não encontrada.';
  end if;

  select * into v_event
  from public.events
  where id = v_slot.event_id
  for update;

  if v_slot.assigned_freelancer_id is null then
    raise exception 'Não é possível concluir vaga sem freelancer.';
  end if;

  if v_slot.status = 'completed' then
    return jsonb_build_object('ok', true, 'event_professional_slot_id', p_slot_id);
  end if;

  if v_slot.status <> 'assigned' then
    raise exception 'Somente vagas confirmadas podem ser concluídas.';
  end if;

  select service_name_snapshot into v_service_name
  from public.event_services
  where id = v_slot.event_service_id;

  update public.event_professional_slots
  set
    status = 'completed',
    completed_at = coalesce(completed_at, now()),
    updated_at = now()
  where id = p_slot_id
  returning * into v_slot;

  insert into public.financial_entries (
    organization_id,
    freelancer_id,
    event_id,
    event_professional_slot_id,
    entry_type,
    description,
    amount,
    effective_date,
    created_by
  )
  select
    v_slot.organization_id,
    v_slot.assigned_freelancer_id,
    v_slot.event_id,
    v_slot.id,
    'event_earning',
    'Evento concluído: ' || v_event.title || ' - ' || coalesce(v_service_name, 'Serviço'),
    v_slot.agreed_fee,
    current_date,
    auth.uid()
  where not exists (
    select 1
    from public.financial_entries fe
    where fe.event_professional_slot_id = v_slot.id
      and fe.entry_type = 'event_earning'
  );

  perform public.recalculate_event_status(v_slot.event_id);

  perform public.write_audit_log(
    'event_slot.completed',
    'event_professional_slots',
    p_slot_id,
    null,
    jsonb_build_object('status', 'completed')
  );

  return jsonb_build_object(
    'ok', true,
    'event_id', v_slot.event_id,
    'event_professional_slot_id', p_slot_id
  );
end;
$$;

create or replace function public.complete_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot record;
  v_completed_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem concluir eventos.';
  end if;

  for v_slot in
    select id
    from public.event_professional_slots
    where event_id = p_event_id
      and organization_id = public.current_organization_id()
      and status = 'assigned'
      and assigned_freelancer_id is not null
    order by created_at, slot_number
  loop
    perform public.complete_event_slot(v_slot.id);
    v_completed_count := v_completed_count + 1;
  end loop;

  if v_completed_count = 0 and not exists (
    select 1
    from public.event_professional_slots
    where event_id = p_event_id
      and organization_id = public.current_organization_id()
      and status = 'completed'
  ) then
    raise exception 'Não há vagas confirmadas para concluir.';
  end if;

  perform public.recalculate_event_status(p_event_id);

  return jsonb_build_object(
    'ok', true,
    'event_id', p_event_id,
    'completed_slots', v_completed_count
  );
end;
$$;

create or replace view public.event_slot_financial_summary as
select
  eps.id as event_professional_slot_id,
  eps.organization_id,
  eps.event_id,
  eps.event_service_id,
  eps.assigned_freelancer_id as freelancer_id,
  eps.agreed_fee,
  coalesce(sum(fe.amount) filter (where fe.entry_type = 'event_earning'), 0)::numeric(12,2) as earned,
  coalesce(sum(abs(fe.amount)) filter (where fe.entry_type in ('payment', 'advance')), 0)::numeric(12,2) as total_paid,
  coalesce(sum(fe.amount), 0)::numeric(12,2) as balance
from public.event_professional_slots eps
left join public.financial_entries fe
  on fe.event_professional_slot_id = eps.id
group by eps.id;

drop view if exists public.event_financial_summary;

create view public.event_financial_summary as
with slot_totals as (
  select
    event_id,
    sum(agreed_fee) filter (where status <> 'cancelled')::numeric(12,2) as freelancer_fee
  from public.event_professional_slots
  group by event_id
),
entry_totals as (
  select
    event_id,
    sum(amount) filter (where entry_type = 'event_earning')::numeric(12,2) as earned,
    sum(abs(amount)) filter (where entry_type in ('payment', 'advance'))::numeric(12,2) as total_paid,
    sum(amount)::numeric(12,2) as event_balance
  from public.financial_entries
  group by event_id
)
select
  e.id as event_id,
  e.organization_id,
  coalesce(st.freelancer_fee, 0)::numeric(12,2) as freelancer_fee,
  coalesce(et.earned, 0)::numeric(12,2) as earned,
  coalesce(et.total_paid, 0)::numeric(12,2) as total_paid,
  coalesce(et.event_balance, 0)::numeric(12,2) as event_balance
from public.events e
left join slot_totals st on st.event_id = e.id
left join entry_totals et on et.event_id = e.id;

create or replace view public.upcoming_events as
select *
from public.events
where starts_at >= now()
  and status in ('open', 'assigned', 'partially_assigned', 'fully_assigned');

create or replace view public.open_events as
select distinct e.*
from public.events e
join public.event_professional_slots eps on eps.event_id = e.id
where e.status in ('open', 'partially_assigned')
  and eps.status = 'open';

alter table public.services enable row level security;
alter table public.event_services enable row level security;
alter table public.event_professional_slots enable row level security;

drop policy if exists "Events visible by role" on public.events;
create policy "Events visible by role"
on public.events for select
using (
  organization_id = public.current_organization_id()
  and (
    public.is_admin()
    or status in ('open', 'partially_assigned')
    or assigned_freelancer_id = auth.uid()
    or exists (
      select 1
      from public.event_professional_slots eps
      where eps.event_id = events.id
        and eps.assigned_freelancer_id = auth.uid()
        and eps.status <> 'cancelled'
    )
  )
);

drop policy if exists "Services visible by organization" on public.services;
create policy "Services visible by organization"
on public.services for select
using (
  organization_id = public.current_organization_id()
  and (public.is_admin() or is_active = true)
);

drop policy if exists "Admins manage services" on public.services;
create policy "Admins manage services"
on public.services for all
using (public.is_admin() and organization_id = public.current_organization_id())
with check (public.is_admin() and organization_id = public.current_organization_id());

drop policy if exists "Event services visible by role" on public.event_services;
create policy "Event services visible by role"
on public.event_services for select
using (
  organization_id = public.current_organization_id()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.events e
      where e.id = event_services.event_id
        and (
          e.status in ('open', 'partially_assigned')
          or e.assigned_freelancer_id = auth.uid()
          or exists (
            select 1
            from public.event_professional_slots eps
            where eps.event_id = e.id
              and eps.assigned_freelancer_id = auth.uid()
              and eps.status <> 'cancelled'
          )
        )
    )
  )
);

drop policy if exists "Admins manage event services" on public.event_services;
create policy "Admins manage event services"
on public.event_services for all
using (public.is_admin() and organization_id = public.current_organization_id())
with check (public.is_admin() and organization_id = public.current_organization_id());

drop policy if exists "Event slots visible by role" on public.event_professional_slots;
create policy "Event slots visible by role"
on public.event_professional_slots for select
using (
  organization_id = public.current_organization_id()
  and (
    public.is_admin()
    or status = 'open'
    or assigned_freelancer_id = auth.uid()
  )
);

drop policy if exists "Admins manage event slots" on public.event_professional_slots;
create policy "Admins manage event slots"
on public.event_professional_slots for all
using (public.is_admin() and organization_id = public.current_organization_id())
with check (public.is_admin() and organization_id = public.current_organization_id());

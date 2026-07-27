alter table public.profiles
  add column if not exists google_avatar_url text,
  add column if not exists first_access_at timestamptz,
  add column if not exists last_access_at timestamptz;

create table if not exists public.authorized_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.user_role not null,
  full_name text not null,
  phone text,
  pix_key text,
  is_active boolean not null default true,
  linked_auth_user_id uuid references auth.users(id) on delete set null,
  invited_by uuid references public.profiles(id),
  first_access_at timestamptz,
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authorized_users_email_lowercase check (email = lower(email)),
  unique (organization_id, email)
);

insert into public.authorized_users (
  organization_id,
  email,
  role,
  full_name,
  phone,
  pix_key,
  is_active,
  linked_auth_user_id,
  first_access_at,
  last_access_at
)
select
  organization_id,
  lower(email),
  role,
  full_name,
  phone,
  pix_key,
  is_active,
  id,
  first_access_at,
  last_access_at
from public.profiles
on conflict (organization_id, email) do update
set role = excluded.role,
    full_name = excluded.full_name,
    phone = excluded.phone,
    pix_key = excluded.pix_key,
    is_active = excluded.is_active,
    linked_auth_user_id = coalesce(public.authorized_users.linked_auth_user_id, excluded.linked_auth_user_id),
    updated_at = now();

create index if not exists authorized_users_organization_id_idx
  on public.authorized_users (organization_id);

create index if not exists authorized_users_email_idx
  on public.authorized_users (email);

create index if not exists authorized_users_linked_auth_user_id_idx
  on public.authorized_users (linked_auth_user_id);

create or replace function public.prevent_freelancer_sensitive_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    if old.organization_id <> new.organization_id
      or old.role <> new.role
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

drop trigger if exists profiles_prevent_sensitive_update on public.profiles;

create trigger profiles_prevent_sensitive_update
before update
on public.profiles
for each row
execute function public.prevent_freelancer_sensitive_profile_update();

alter table public.authorized_users enable row level security;

drop policy if exists "Admins manage authorized users" on public.authorized_users;
create policy "Admins manage authorized users"
on public.authorized_users for all
using (public.is_admin() and organization_id = public.current_organization_id())
with check (public.is_admin() and organization_id = public.current_organization_id());

drop policy if exists "Users read own authorization" on public.authorized_users;
create policy "Users read own authorization"
on public.authorized_users for select
using (
  linked_auth_user_id = auth.uid()
  and organization_id = public.current_organization_id()
);

drop policy if exists "Freelancers update own public profile" on public.profiles;
create policy "Freelancers update own public profile"
on public.profiles for update
using (
  id = auth.uid()
  and role = 'freelancer'
  and is_active = true
)
with check (
  id = auth.uid()
  and role = 'freelancer'
  and is_active = true
);

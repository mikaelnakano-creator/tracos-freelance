insert into public.organizations (id, name, slug, timezone)
values (
  '11111111-1111-4111-8111-111111111111',
  'Traços Detalhados',
  'tracos-detalhados',
  'America/Cuiaba'
)
on conflict (id) do update
set name = excluded.name,
    timezone = excluded.timezone;

-- Para Supabase local, crie usuários Auth primeiro pelo Studio ou CLI.
-- Depois substitua os UUIDs abaixo pelos IDs reais dos usuários criados.

insert into public.profiles (
  id,
  organization_id,
  role,
  full_name,
  email,
  phone,
  pix_key,
  notes,
  is_active
)
values
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', 'admin', 'Mikael Nakano', 'mikaelnakano@gmail.com', '(65) 99999-0001', null, 'Administrador principal e freelancer.', true),
  ('33333333-3333-4333-8333-333333333331', '11111111-1111-4111-8111-111111111111', 'freelancer', 'Ana Clara Mendes', 'ana@parceiros.com.br', '(65) 98888-1001', 'ana@pix.com', 'Fotografia social.', true),
  ('33333333-3333-4333-8333-333333333332', '11111111-1111-4111-8111-111111111111', 'freelancer', 'Bruno Reis', 'bruno@parceiros.com.br', '(65) 98888-1002', 'bruno@pix.com', 'Filmagem e making of.', true),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'freelancer', 'Lívia Santos', 'livia@parceiros.com.br', '(65) 98888-1003', '11988447766', 'Assistente de luz.', true),
  ('33333333-3333-4333-8333-333333333334', '11111111-1111-4111-8111-111111111111', 'freelancer', 'Carlos Eduardo', 'carlos@parceiros.com.br', '(65) 98888-1004', 'carlos@pix.com', 'Filmagem de cerimônias.', true),
  ('33333333-3333-4333-8333-333333333335', '11111111-1111-4111-8111-111111111111', 'freelancer', 'Maria Fernanda', 'maria@parceiros.com.br', '(65) 98888-1005', 'maria@pix.com', 'Selfie impressa e recepção.', true),
  ('33333333-3333-4333-8333-333333333336', '11111111-1111-4111-8111-111111111111', 'freelancer', 'João Pedro', 'joao@parceiros.com.br', '(65) 98888-1006', 'joao@pix.com', 'Selfie impressa.', true)
on conflict (id) do update
set full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    pix_key = excluded.pix_key,
    notes = excluded.notes,
    is_active = excluded.is_active;

insert into public.authorized_users (
  id,
  organization_id,
  email,
  role,
  full_name,
  phone,
  pix_key,
  is_active,
  invited_by,
  first_access_at
)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'mikaelnakano@gmail.com', 'admin', 'Mikael Nakano', '(65) 99999-0001', null, true, null, null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'ana@parceiros.com.br', 'freelancer', 'Ana Clara Mendes', '(65) 98888-1001', 'ana@pix.com', true, '22222222-2222-4222-8222-222222222221', null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '11111111-1111-4111-8111-111111111111', 'bruno@parceiros.com.br', 'freelancer', 'Bruno Reis', '(65) 98888-1002', 'bruno@pix.com', true, '22222222-2222-4222-8222-222222222221', null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '11111111-1111-4111-8111-111111111111', 'livia@parceiros.com.br', 'freelancer', 'Lívia Santos', '(65) 98888-1003', '11988447766', true, '22222222-2222-4222-8222-222222222221', null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '11111111-1111-4111-8111-111111111111', 'carlos@parceiros.com.br', 'freelancer', 'Carlos Eduardo', '(65) 98888-1004', 'carlos@pix.com', true, '22222222-2222-4222-8222-222222222221', null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', '11111111-1111-4111-8111-111111111111', 'maria@parceiros.com.br', 'freelancer', 'Maria Fernanda', '(65) 98888-1005', 'maria@pix.com', true, '22222222-2222-4222-8222-222222222221', null),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', '11111111-1111-4111-8111-111111111111', 'joao@parceiros.com.br', 'freelancer', 'João Pedro', '(65) 98888-1006', 'joao@pix.com', false, '22222222-2222-4222-8222-222222222221', null)
on conflict (id) do update
set email = excluded.email,
    role = excluded.role,
    full_name = excluded.full_name,
    phone = excluded.phone,
    pix_key = excluded.pix_key,
    is_active = excluded.is_active,
    invited_by = excluded.invited_by;

insert into public.organization_members (
  organization_id,
  profile_id,
  is_active
)
select organization_id, id, is_active
from public.profiles
where organization_id = '11111111-1111-4111-8111-111111111111'
on conflict (organization_id, profile_id) do update
set is_active = excluded.is_active,
    updated_at = now();

insert into public.organization_member_roles (
  organization_member_id,
  role
)
select om.id, p.role
from public.organization_members om
join public.profiles p on p.id = om.profile_id
where om.organization_id = '11111111-1111-4111-8111-111111111111'
  and p.role is not null
on conflict (organization_member_id, role) do nothing;

insert into public.organization_member_roles (
  organization_member_id,
  role
)
select om.id, 'freelancer'
from public.organization_members om
where om.organization_id = '11111111-1111-4111-8111-111111111111'
  and om.profile_id = '22222222-2222-4222-8222-222222222221'
on conflict (organization_member_id, role) do nothing;

insert into public.services (
  id,
  organization_id,
  name,
  description,
  default_professionals,
  default_fee,
  is_active
)
values
  ('66666666-6666-4666-8666-666666666661', '11111111-1111-4111-8111-111111111111', 'Fotografia', 'Cobertura fotográfica principal.', 1, 250.00, true),
  ('66666666-6666-4666-8666-666666666662', '11111111-1111-4111-8111-111111111111', 'Filmagem', 'Vídeo, making of e cerimônia.', 1, 300.00, true),
  ('66666666-6666-4666-8666-666666666663', '11111111-1111-4111-8111-111111111111', 'Selfie impressa', 'Operação de cabine ou totem de selfie.', 2, 150.00, true),
  ('66666666-6666-4666-8666-666666666664', '11111111-1111-4111-8111-111111111111', 'Assistente de fotografia', 'Apoio de luz, lentes e organização.', 1, 120.00, true),
  ('66666666-6666-4666-8666-666666666665', '11111111-1111-4111-8111-111111111111', 'Cobertura de cerimônia', 'Equipe focada na cerimônia.', 1, 180.00, true),
  ('66666666-6666-4666-8666-666666666666', '11111111-1111-4111-8111-111111111111', 'Cobertura de recepção', 'Equipe focada na festa e recepção.', 1, 180.00, true)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    default_professionals = excluded.default_professionals,
    default_fee = excluded.default_fee,
    is_active = excluded.is_active;

insert into public.events (
  id,
  organization_id,
  title,
  service_name,
  description,
  location_name,
  location_address,
  starts_at,
  ends_at,
  freelancer_fee,
  status,
  assignment_mode,
  assigned_freelancer_id,
  google_calendar_id,
  google_event_id,
  google_event_link,
  source,
  completed_at,
  created_by
)
values
  ('44444444-4444-4444-8444-444444444441', '11111111-1111-4111-8111-111111111111', 'Casamento João e Maria', 'Fotografia + Filmagem + Selfie impressa', 'Cerimônia externa e recepção com cabine de selfie.', 'Villa Toscana', 'Av. das Flores, 1200', '2026-08-15 15:00:00-04', '2026-08-15 23:00:00-04', 850.00, 'partially_assigned', 'open', null, null, null, null, 'manual', null, '22222222-2222-4222-8222-222222222221'),
  ('44444444-4444-4444-8444-444444444442', '11111111-1111-4111-8111-111111111111', 'Aniversário Helena 1 ano', 'Fotografia + Selfie impressa', 'Chegar antes para registrar detalhes da decoração.', 'Buffet Jardim das Artes', 'Várzea Grande', '2026-08-22 13:30:00-04', '2026-08-22 18:00:00-04', 500.00, 'fully_assigned', 'direct', null, null, null, null, 'manual', null, '22222222-2222-4222-8222-222222222221'),
  ('44444444-4444-4444-8444-444444444443', '11111111-1111-4111-8111-111111111111', 'Formatura Medicina UFMT', 'Fotografia + Filmagem + Assistente', 'Equipe máxima para palco, turma e recepção.', 'Centro de Eventos Pantanal', 'Av. Bernardo Antônio de Oliveira Neto', '2026-09-05 17:00:00-04', '2026-09-06 01:00:00-04', 1120.00, 'fully_assigned', 'direct', null, null, null, null, 'manual', null, '22222222-2222-4222-8222-222222222221'),
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'Evento concluído Grupo Áurea', 'Fotografia + Filmagem + Selfie impressa', 'Evento corporativo usado para demonstrar saldos por vaga.', 'Hotel Gran Odara', 'Av. Miguel Sutil, 8344', '2026-07-12 18:00:00-04', '2026-07-12 23:00:00-04', 850.00, 'completed', 'direct', null, null, null, null, 'manual', '2026-07-13 09:00:00-04', '22222222-2222-4222-8222-222222222221'),
  ('44444444-4444-4444-8444-444444444445', '11111111-1111-4111-8111-111111111111', 'Batizado Miguel', 'Fotografia', 'Evento importado do Google Agenda aguardando aceite.', 'Paróquia São Benedito', 'Cuiabá', '2026-09-12 08:30:00-04', '2026-09-12 11:30:00-04', 220.00, 'open', 'open', null, 'primary', 'google-event-batizado-miguel', 'https://calendar.google.com/event?eid=batizado-miguel', 'google_calendar', null, '22222222-2222-4222-8222-222222222221')
on conflict (id) do update
set title = excluded.title,
    service_name = excluded.service_name,
    description = excluded.description,
    location_name = excluded.location_name,
    location_address = excluded.location_address,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    freelancer_fee = excluded.freelancer_fee,
    status = excluded.status,
    assignment_mode = excluded.assignment_mode,
    assigned_freelancer_id = excluded.assigned_freelancer_id,
    source = excluded.source,
    completed_at = excluded.completed_at;

insert into public.event_services (
  id,
  organization_id,
  event_id,
  service_id,
  service_name_snapshot,
  quantity_required,
  notes
)
values
  ('77777777-7777-4777-8777-777777777701', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444441', '66666666-6666-4666-8666-666666666661', 'Fotografia', 1, null),
  ('77777777-7777-4777-8777-777777777702', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444441', '66666666-6666-4666-8666-666666666662', 'Filmagem', 1, null),
  ('77777777-7777-4777-8777-777777777703', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444441', '66666666-6666-4666-8666-666666666663', 'Selfie impressa', 2, 'Uma vaga confirmada e uma vaga aberta.'),
  ('77777777-7777-4777-8777-777777777704', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444442', '66666666-6666-4666-8666-666666666661', 'Fotografia', 1, null),
  ('77777777-7777-4777-8777-777777777705', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444442', '66666666-6666-4666-8666-666666666663', 'Selfie impressa', 2, null),
  ('77777777-7777-4777-8777-777777777706', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444443', '66666666-6666-4666-8666-666666666661', 'Fotografia', 2, null),
  ('77777777-7777-4777-8777-777777777707', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444443', '66666666-6666-4666-8666-666666666662', 'Filmagem', 2, null),
  ('77777777-7777-4777-8777-777777777708', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444443', '66666666-6666-4666-8666-666666666664', 'Assistente de fotografia', 1, null),
  ('77777777-7777-4777-8777-777777777709', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444', '66666666-6666-4666-8666-666666666661', 'Fotografia', 1, null),
  ('77777777-7777-4777-8777-777777777710', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444', '66666666-6666-4666-8666-666666666662', 'Filmagem', 1, null),
  ('77777777-7777-4777-8777-777777777711', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444', '66666666-6666-4666-8666-666666666663', 'Selfie impressa', 2, null),
  ('77777777-7777-4777-8777-777777777712', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444445', '66666666-6666-4666-8666-666666666661', 'Fotografia', 1, 'Vaga aberta importada do Google.')
on conflict (id) do update
set service_name_snapshot = excluded.service_name_snapshot,
    quantity_required = excluded.quantity_required,
    notes = excluded.notes;

insert into public.event_professional_slots (
  id,
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
  created_by
)
values
  ('88888888-8888-4888-8888-888888888801', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444441', '77777777-7777-4777-8777-777777777701', 1, 'direct', '33333333-3333-4333-8333-333333333331', 250.00, 'assigned', '2026-07-27 10:00:00-04', null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888802', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444441', '77777777-7777-4777-8777-777777777702', 1, 'direct', '33333333-3333-4333-8333-333333333332', 300.00, 'assigned', '2026-07-27 10:00:00-04', null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888803', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444441', '77777777-7777-4777-8777-777777777703', 1, 'direct', '33333333-3333-4333-8333-333333333335', 150.00, 'assigned', '2026-07-27 10:00:00-04', null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888804', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444441', '77777777-7777-4777-8777-777777777703', 2, 'open', null, 150.00, 'open', null, null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888805', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444442', '77777777-7777-4777-8777-777777777704', 1, 'direct', '33333333-3333-4333-8333-333333333331', 200.00, 'assigned', '2026-07-28 10:00:00-04', null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888806', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444442', '77777777-7777-4777-8777-777777777705', 1, 'direct', '33333333-3333-4333-8333-333333333336', 150.00, 'assigned', '2026-07-28 10:00:00-04', null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888807', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444442', '77777777-7777-4777-8777-777777777705', 2, 'direct', '33333333-3333-4333-8333-333333333335', 150.00, 'assigned', '2026-07-28 10:00:00-04', null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888808', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444443', '77777777-7777-4777-8777-777777777706', 1, 'direct', '33333333-3333-4333-8333-333333333331', 250.00, 'assigned', '2026-07-29 10:00:00-04', null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888809', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444443', '77777777-7777-4777-8777-777777777706', 2, 'direct', '33333333-3333-4333-8333-333333333333', 200.00, 'assigned', '2026-07-29 10:00:00-04', null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888810', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444443', '77777777-7777-4777-8777-777777777707', 1, 'direct', '33333333-3333-4333-8333-333333333332', 300.00, 'assigned', '2026-07-29 10:00:00-04', null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888811', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444443', '77777777-7777-4777-8777-777777777707', 2, 'direct', '33333333-3333-4333-8333-333333333334', 250.00, 'assigned', '2026-07-29 10:00:00-04', null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888812', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444443', '77777777-7777-4777-8777-777777777708', 1, 'direct', '33333333-3333-4333-8333-333333333336', 120.00, 'assigned', '2026-07-29 10:00:00-04', null, '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888813', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444', '77777777-7777-4777-8777-777777777709', 1, 'direct', '33333333-3333-4333-8333-333333333331', 250.00, 'completed', '2026-07-01 10:00:00-04', '2026-07-13 09:00:00-04', '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888814', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444', '77777777-7777-4777-8777-777777777710', 1, 'direct', '33333333-3333-4333-8333-333333333332', 300.00, 'completed', '2026-07-01 10:00:00-04', '2026-07-13 09:00:00-04', '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888815', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444', '77777777-7777-4777-8777-777777777711', 1, 'direct', '33333333-3333-4333-8333-333333333336', 150.00, 'completed', '2026-07-01 10:00:00-04', '2026-07-13 09:00:00-04', '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888816', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444', '77777777-7777-4777-8777-777777777711', 2, 'direct', '33333333-3333-4333-8333-333333333335', 150.00, 'completed', '2026-07-01 10:00:00-04', '2026-07-13 09:00:00-04', '22222222-2222-4222-8222-222222222221'),
  ('88888888-8888-4888-8888-888888888817', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444445', '77777777-7777-4777-8777-777777777712', 1, 'open', null, 220.00, 'open', null, null, '22222222-2222-4222-8222-222222222221')
on conflict (id) do update
set assigned_freelancer_id = excluded.assigned_freelancer_id,
    agreed_fee = excluded.agreed_fee,
    status = excluded.status,
    accepted_at = excluded.accepted_at,
    completed_at = excluded.completed_at;

insert into public.event_acceptances (
  id,
  organization_id,
  event_id,
  event_professional_slot_id,
  freelancer_id,
  status,
  created_at
)
values
  ('99999999-9999-4999-8999-999999999901', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444441', '88888888-8888-4888-8888-888888888801', '33333333-3333-4333-8333-333333333331', 'accepted', '2026-07-27 10:00:00-04'),
  ('99999999-9999-4999-8999-999999999902', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444441', '88888888-8888-4888-8888-888888888802', '33333333-3333-4333-8333-333333333332', 'accepted', '2026-07-27 10:00:00-04'),
  ('99999999-9999-4999-8999-999999999903', '11111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444441', '88888888-8888-4888-8888-888888888803', '33333333-3333-4333-8333-333333333335', 'accepted', '2026-07-27 10:00:00-04')
on conflict (id) do nothing;

insert into public.financial_entries (
  id,
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
values
  ('55555555-5555-4555-8555-555555555501', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333331', '44444444-4444-4444-8444-444444444444', '88888888-8888-4888-8888-888888888813', 'event_earning', 'Evento concluído: Grupo Áurea - Fotografia', 250.00, '2026-07-13', '22222222-2222-4222-8222-222222222221'),
  ('55555555-5555-4555-8555-555555555502', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333331', '44444444-4444-4444-8444-444444444444', '88888888-8888-4888-8888-888888888813', 'payment', 'Pagamento completo via Pix', -250.00, '2026-07-14', '22222222-2222-4222-8222-222222222221'),
  ('55555555-5555-4555-8555-555555555503', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333332', '44444444-4444-4444-8444-444444444444', '88888888-8888-4888-8888-888888888814', 'event_earning', 'Evento concluído: Grupo Áurea - Filmagem', 300.00, '2026-07-13', '22222222-2222-4222-8222-222222222221'),
  ('55555555-5555-4555-8555-555555555504', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333332', '44444444-4444-4444-8444-444444444444', '88888888-8888-4888-8888-888888888814', 'payment', 'Pagamento parcial', -100.00, '2026-07-14', '22222222-2222-4222-8222-222222222221'),
  ('55555555-5555-4555-8555-555555555505', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333336', '44444444-4444-4444-8444-444444444444', '88888888-8888-4888-8888-888888888815', 'event_earning', 'Evento concluído: Grupo Áurea - Selfie impressa 1', 150.00, '2026-07-13', '22222222-2222-4222-8222-222222222221'),
  ('55555555-5555-4555-8555-555555555506', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333336', '44444444-4444-4444-8444-444444444444', '88888888-8888-4888-8888-888888888815', 'payment', 'Pagamento maior que o valor da vaga', -200.00, '2026-07-14', '22222222-2222-4222-8222-222222222221'),
  ('55555555-5555-4555-8555-555555555507', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333335', '44444444-4444-4444-8444-444444444444', '88888888-8888-4888-8888-888888888816', 'event_earning', 'Evento concluído: Grupo Áurea - Selfie impressa 2', 150.00, '2026-07-13', '22222222-2222-4222-8222-222222222221'),
  ('55555555-5555-4555-8555-555555555508', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', null, null, 'advance', 'Adiantamento para agosto', -100.00, '2026-07-10', '22222222-2222-4222-8222-222222222221')
on conflict (id) do nothing;

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
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', 'admin', 'Mikael Nakano', 'admin@tracosdetalhados.com.br', '(65) 99999-0001', null, 'Administrador principal.', true),
  ('33333333-3333-4333-8333-333333333331', '11111111-1111-4111-8111-111111111111', 'freelancer', 'Ana Clara Mendes', 'ana@parceiros.com.br', '(65) 98888-1001', 'ana@pix.com', 'Fotografia social.', true),
  ('33333333-3333-4333-8333-333333333332', '11111111-1111-4111-8111-111111111111', 'freelancer', 'Bruno Reis', 'bruno@parceiros.com.br', '(65) 98888-1002', 'bruno@pix.com', 'Vídeo e making of.', true),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'freelancer', 'Lívia Santos', 'livia@parceiros.com.br', '(65) 98888-1003', '11988447766', 'Assistente de luz.', true)
on conflict (id) do update
set full_name = excluded.full_name,
    email = excluded.email,
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
  source,
  completed_at,
  created_by
)
values
  ('44444444-4444-4444-8444-444444444441', '11111111-1111-4111-8111-111111111111', 'Casamento Marina e Theo', 'Fotografia principal', 'Cerimônia externa e recepção.', 'Villa Toscana', 'Av. das Flores, 1200', '2026-07-03 15:00:00-04', '2026-07-03 22:00:00-04', 650.00, 'completed', 'direct', '33333333-3333-4333-8333-333333333331', 'manual', '2026-07-04 09:00:00-04', '22222222-2222-4222-8222-222222222221'),
  ('44444444-4444-4444-8444-444444444442', '11111111-1111-4111-8111-111111111111', 'Aniversário Helena 1 ano', 'Cobertura foto', 'Chegar antes para detalhes.', 'Buffet Jardim das Artes', 'Várzea Grande', '2026-07-26 13:30:00-04', '2026-07-26 17:30:00-04', 300.00, 'assigned', 'direct', '33333333-3333-4333-8333-333333333332', 'google_calendar', null, '22222222-2222-4222-8222-222222222221'),
  ('44444444-4444-4444-8444-444444444443', '11111111-1111-4111-8111-111111111111', 'Pré-wedding Rafa e Caio', 'Assistência de luz', 'Ensaio ao ar livre.', 'Parque Mãe Bonifácia', 'Cuiabá', '2026-08-02 16:00:00-04', '2026-08-02 19:00:00-04', 180.00, 'open', 'open', null, 'manual', null, '22222222-2222-4222-8222-222222222221')
on conflict (id) do nothing;

insert into public.financial_entries (
  id,
  organization_id,
  freelancer_id,
  event_id,
  entry_type,
  description,
  amount,
  effective_date,
  created_by
)
values
  ('55555555-5555-4555-8555-555555555551', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333331', '44444444-4444-4444-8444-444444444441', 'event_earning', 'Evento concluído: Casamento Marina e Theo', 650.00, '2026-07-04', '22222222-2222-4222-8222-222222222221'),
  ('55555555-5555-4555-8555-555555555552', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333331', '44444444-4444-4444-8444-444444444441', 'payment', 'Pagamento via Pix', -650.00, '2026-07-05', '22222222-2222-4222-8222-222222222221'),
  ('55555555-5555-4555-8555-555555555553', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333332', '44444444-4444-4444-8444-444444444442', 'payment', 'Pagamento parcial antecipado', -100.00, '2026-07-20', '22222222-2222-4222-8222-222222222221'),
  ('55555555-5555-4555-8555-555555555554', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', null, 'advance', 'Adiantamento para agosto', -100.00, '2026-07-10', '22222222-2222-4222-8222-222222222221')
on conflict (id) do nothing;

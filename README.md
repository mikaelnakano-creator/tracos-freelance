# Traços Freelance

Sistema web da Traços Detalhados para administrar eventos, serviços, vagas de
freelancers, aceite de trabalhos, pagamentos, saldos e importação do Google
Agenda.

## Acesso

O login é exclusivamente pelo Google via Supabase Auth.

- Não há login por senha.
- Não há cadastro público.
- Não há recuperação ou alteração de senha na interface.
- O usuário só acessa se o e-mail Google estiver previamente autorizado.
- A função `admin` ou `freelancer` vem somente do banco de dados.

Fluxo:

1. O administrador cadastra o e-mail Google autorizado.
2. O usuário entra em `/login` e clica em `Continuar com Google`.
3. O callback valida o usuário no Supabase.
4. O sistema procura o e-mail em `profiles` ou `authorized_users`.
5. Usuário autorizado é vinculado ao `auth.users.id`.
6. Usuário não autorizado vai para `/acesso-negado`.
7. Usuário inativo vai para `/conta-inativa`.

Redirecionamento:

- Administrador: `/admin/dashboard`
- Freelancer: `/freelancer`

## Primeiro Administrador

Configure:

```env
FIRST_ADMIN_EMAIL=admin@tracosdetalhados.com.br
```

No primeiro login Google, se esse e-mail bater com `FIRST_ADMIN_EMAIL` e ainda
não existir nenhum administrador, o sistema cria o primeiro perfil admin para a
organização Traços Detalhados.

Depois disso, administradores novos devem ser autorizados por outro
administrador.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Componentes locais no padrão shadcn/ui
- Supabase Auth, PostgreSQL, RPCs e RLS
- Google OAuth para login
- Google Calendar API para importação administrativa
- Recharts
- Vitest
- Playwright
- ChatGPT Sites / Vercel-ready

## Variáveis

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

FIRST_ADMIN_EMAIL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/google/calendar/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=
```

No Supabase, habilite o provider Google com os escopos básicos de login:

- `openid`
- `email`
- `profile`

A integração do Google Agenda é separada do login e usa somente:

- `https://www.googleapis.com/auth/calendar.readonly`

Não misture tokens de login com tokens da Agenda.

## Banco de Dados

Migrations:

- `0001_initial_schema.sql`: organização, perfis, eventos, financeiro, Google e
  auditoria.
- `0002_event_status_values.sql`: novos status de equipe.
- `0003_event_team_slots.sql`: serviços, vagas profissionais, RPC de aceite,
  financeiro por vaga e RLS.
- `0004_google_authorized_access.sql`: `authorized_users`, vínculo Google,
  primeiro acesso, último acesso e proteção de atualização de perfil.

Tabelas principais:

- `organizations`
- `profiles`
- `authorized_users`
- `services`
- `events`
- `event_services`
- `event_professional_slots`
- `financial_entries`
- `google_connections`
- `audit_logs`

## Regras de Eventos

Cada evento pode ter de 1 a 5 profissionais.

Exemplo:

- Fotografia: 1 profissional
- Filmagem: 1 profissional
- Selfie impressa: 2 profissionais

Cada vaga tem:

- serviço;
- número da vaga;
- forma de preenchimento;
- freelancer designado ou vaga aberta;
- valor combinado;
- status;
- pagamentos e saldo próprios.

Status:

- Rascunho
- Aberto
- Equipe parcial
- Equipe completa
- Concluído
- Cancelado

O aceite acontece por vaga pela RPC segura:

```sql
accept_open_event_slot(slot_id uuid)
```

Ela bloqueia a vaga, confirma que continua aberta, impede duas vagas para o
mesmo freelancer no mesmo evento e atualiza o status geral.

## Financeiro

Convenção em `financial_entries`:

- receita do freelancer: valor positivo;
- pagamento ao freelancer: valor negativo;
- adiantamento: valor negativo;
- estorno: lançamento novo, sem apagar histórico.

Exemplos:

- Receita `+R$ 150,00`
- Pagamento `-R$ 100,00`
- Saldo `R$ 50,00 a receber`

Outro caso:

- Receita `+R$ 150,00`
- Pagamento `-R$ 200,00`
- Saldo `R$ 50,00 adiantado`

Cada receita de vaga concluída é idempotente: não pode existir mais de um
`event_earning` para a mesma vaga.

## Área Administrativa

Rotas:

- `/admin/dashboard`
- `/admin/eventos`
- `/admin/eventos/novo`
- `/admin/eventos/[id]`
- `/admin/eventos/[id]/editar`
- `/admin/freelancers`
- `/admin/freelancers/novo`
- `/admin/freelancers/[id]`
- `/admin/servicos`
- `/admin/financeiro`
- `/admin/financeiro/lancamentos`
- `/admin/relatorios`
- `/admin/google-agenda`
- `/admin/configuracoes`

O administrador possui sidebar, dashboard completo, gestão de eventos,
freelancers, serviços, financeiro, relatórios, Google Agenda e configurações.

## Área do Freelancer

O freelancer usa apenas:

- `/freelancer`

Não há sidebar nem páginas separadas. O dashboard único mostra:

- resumo;
- próximos trabalhos;
- oportunidades abertas;
- eventos realizados;
- resumo financeiro;
- extrato próprio.

O freelancer vê somente seus próprios dados, vagas e lançamentos financeiros.

## Google Agenda

A Agenda é uma integração administrativa, separada do login.

Fluxo:

1. Administrador acessa `Google Agenda`.
2. Conecta a agenda com OAuth próprio.
3. Seleciona eventos.
4. O sistema importa nome, descrição, data, horário, local, endereço e link.
5. O administrador completa serviços, vagas, valores e equipe.

A constraint única evita importar o mesmo evento duas vezes.

## Seed

O seed em `supabase/seed/seed.sql` inclui:

- organização Traços Detalhados;
- perfis de demonstração;
- e-mails autorizados;
- catálogo de serviços;
- eventos futuros e concluídos;
- vagas abertas;
- equipe parcial e completa;
- pagamentos parciais;
- pagamentos completos;
- adiantamentos.

O seed não cria usuários reais no Google.

## Validação

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Produção

1. Criar projeto Supabase.
2. Executar as migrations `0001` a `0004`.
3. Configurar Google OAuth no Supabase.
4. Definir `FIRST_ADMIN_EMAIL`.
5. Configurar Google Calendar API com callback
   `/api/google/calendar/callback`.
6. Configurar variáveis no provedor.
7. Fazer login com o primeiro admin.
8. Autorizar freelancers pelo e-mail Google.

# Traços Freelance

Sistema web da Traços Detalhados para gestão de eventos, freelancers, vagas por serviço, aceite de trabalhos, financeiro por profissional e integração separada com Google Agenda.

## Funcionalidades

- Login exclusivo via Google usando Supabase Auth.
- Controle de acesso por organização, membro e múltiplos papéis.
- Um único usuário pode ser administrador e freelancer.
- Bootstrap do primeiro administrador por `FIRST_ADMIN_EMAIL`.
- Cadastro de freelancers pelo administrador sem senha.
- Eventos com vários serviços e até 5 vagas profissionais.
- Designação direta ou vaga aberta para aceite.
- RPC transacional `accept_open_event_slot(slot_id uuid)`.
- Financeiro com receitas positivas, pagamentos/adiantamentos negativos e saldo por freelancer.
- Dashboard administrativo e dashboard único do freelancer em `/freelancer`.
- Integração de Google Agenda separada do login, com escopo somente leitura.
- Tela segura de configuração pendente quando a produção ainda não tem Supabase configurado.

## Stack

- Next.js
- React
- TypeScript
- Supabase Auth e Postgres
- Row Level Security
- Tailwind CSS
- Vitest
- Playwright
- Vercel

## Desenvolvimento Local

```bash
npm install
npm run dev
```

Para validar:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

O modo de demonstração é permitido apenas em desenvolvimento/teste. Em produção, se as variáveis essenciais estiverem ausentes, o sistema mostra `/configuracao-pendente` e não carrega dados simulados como reais.

## Variáveis

Crie `.env.local` a partir de `.env.example`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

FIRST_ADMIN_EMAIL=mikaelnakano@gmail.com

GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/google/calendar/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=
```

Não use `NEXT_PUBLIC_SUPABASE_ANON_KEY`; o projeto está padronizado em `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Modelo de Acesso

`profiles` guarda a pessoa:

- `id`
- `auth_user_id`, preenchido no primeiro login
- `email`
- `full_name`
- `phone`
- `pix_key`
- `avatar_url`
- `google_avatar_url`
- `first_access_at`
- `last_access_at`
- `is_active`

`organization_members` associa o profile à organização.

`organization_member_roles` guarda os papéis:

- `admin`
- `freelancer`

O usuário `mikaelnakano@gmail.com` pode possuir os dois papéis no mesmo profile. Se tiver admin e freelancer, após login ele é enviado para `/selecionar-area`.

## Primeiro Administrador

Configure:

```bash
FIRST_ADMIN_EMAIL=mikaelnakano@gmail.com
```

No primeiro login desse e-mail, quando ainda não existir administrador ativo na organização Traços Detalhados, a função SQL `bootstrap_google_user` cria ou vincula:

- organização Traços Detalhados;
- profile;
- organization_member;
- papel `admin`;
- papel `freelancer`;
- datas de acesso;
- audit log.

Esse fluxo roda no servidor e não confia em papel enviado pelo frontend.

## Supabase

As migrations estão em `supabase/migrations` e devem ser aplicadas em ordem:

1. `0001_initial_schema.sql`
2. `0002_event_status_values.sql`
3. `0003_event_team_slots.sql`
4. `0004_google_authorized_access.sql`
5. `0005_multi_role_membership_rls.sql`

### Opção A: Supabase Dashboard

1. Crie um projeto Supabase.
2. Abra o SQL Editor.
3. Aplique os arquivos acima na ordem.
4. Configure as variáveis na Vercel.

### Opção B: Supabase CLI

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Seed de desenvolvimento:

```bash
supabase db reset
```

O seed cria organização, Mikael como admin + freelancer, freelancers fictícios, eventos e lançamentos. Ele não cria usuários reais do Google nem tokens.

## Segurança e RLS

A migration `0005_multi_role_membership_rls.sql` cria ou revisa:

- `current_profile_id()`
- `current_member_id(organization_id)`
- `has_organization_role(organization_id, role)`
- `is_active_member(organization_id)`
- `can_access_admin(organization_id)`
- `can_access_freelancer(organization_id)`
- `bootstrap_google_user(...)`
- `accept_open_event_slot(slot_id uuid)`

RLS fica ativa nas tabelas expostas. Administradores acessam dados da própria organização. Freelancers acessam apenas seu próprio profile, suas vagas, seus lançamentos e vagas abertas da organização.

## Google Login no Supabase

1. Crie ou escolha um projeto no Google Cloud.
2. Configure OAuth consent screen.
3. Crie um cliente OAuth para Supabase Auth.
4. No Google Cloud, adicione:

```text
https://SEU-PROJECT-REF.supabase.co/auth/v1/callback
```

5. No Supabase, habilite o provider Google.
6. Configure Client ID e Client Secret no Supabase.
7. Configure Site URL com a URL da Vercel.
8. Configure Redirect URL:

```text
https://URL-DA-VERCEL/auth/callback
```

Não coloque o Client Secret do login Google em variável pública do Next.js.

## Google Agenda

A Agenda é uma autorização separada e exclusiva da administração.

Callback:

```text
https://URL-DA-VERCEL/api/google/calendar/callback
```

Variáveis:

```bash
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=
GOOGLE_TOKEN_ENCRYPTION_KEY=
```

Gere a chave de criptografia com:

```bash
openssl rand -base64 32
```

Não versione essa chave.

## Deploy na Vercel

Projeto esperado:

- Nome: `tracos-freelance`
- Framework Preset: Next.js
- Production Branch: `main`
- Build Command: `npm run build`
- Output: padrão do Next.js

Configure imediatamente:

```bash
FIRST_ADMIN_EMAIL=mikaelnakano@gmail.com
```

Depois que a URL final da Vercel existir, configure:

```bash
NEXT_PUBLIC_APP_URL=https://URL-REAL-DA-VERCEL
```

Não configure valores fictícios para Supabase ou Google Agenda. Se Supabase ainda estiver ausente, o deploy deve abrir a tela de configuração pendente.

## Financeiro

Convenção dos lançamentos:

- Receita: positiva.
- Pagamento: negativa.
- Adiantamento: negativo.
- Ajuste positivo: positivo.
- Ajuste negativo: negativo.

Saldo é a soma dos lançamentos do freelancer.

Exemplos:

- `+ R$ 150,00` e `- R$ 100,00` resulta em `R$ 50,00 a receber`.
- `+ R$ 150,00` e `- R$ 200,00` resulta em `R$ 50,00 em adiantamento`.

O banco usa `numeric(12,2)` para dinheiro.

## Limitações Atuais

- As migrations estão prontas, mas não são aplicadas automaticamente em um Supabase real.
- Login real depende de Supabase Auth com Google configurado.
- Google Agenda depende de credenciais próprias e conexão administrativa.
- Sem variáveis reais em produção, o sistema mostra configuração pendente e não usa dados simulados.

## Checklist de Produção

- Aplicar migrations no Supabase.
- Configurar Google provider no Supabase.
- Configurar variáveis Supabase na Vercel.
- Configurar `FIRST_ADMIN_EMAIL`.
- Configurar `NEXT_PUBLIC_APP_URL` com a URL real.
- Fazer novo deploy após alterar variáveis.
- Entrar com `mikaelnakano@gmail.com`.
- Confirmar `/selecionar-area`.
- Cadastrar freelancers com e-mail Google.
- Testar aceite de vaga aberta.
- Testar lançamento financeiro.
- Configurar Google Agenda separadamente.

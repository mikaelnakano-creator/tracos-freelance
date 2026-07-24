# Traços Freelance

Aplicação web para a Traços Detalhados controlar eventos fotográficos,
freelancers parceiros, aceite de trabalhos abertos, pagamentos parciais,
adiantamentos, saldos e importação manual do Google Agenda.

## Stack

- Next.js com App Router
- TypeScript estrito
- React
- Tailwind CSS
- Componentes locais no padrão shadcn/ui
- Lucide Icons
- Supabase Auth, PostgreSQL e Row Level Security
- React Hook Form + Zod
- date-fns com pt-BR
- Recharts
- Vitest
- Playwright
- Vercel

## Pré-requisitos

- Node.js 22+
- Conta Supabase
- Conta Google Cloud
- Conta Vercel

## Instalação local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

## Variáveis de ambiente

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=
```

`GOOGLE_TOKEN_ENCRYPTION_KEY` deve ser base64 com 32 bytes. Gere localmente com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Copie `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Copie a `SUPABASE_SERVICE_ROLE_KEY` apenas para o servidor/Vercel.
4. Execute a migration `supabase/migrations/0001_initial_schema.sql`.
5. Ative as URLs permitidas no Supabase Auth:
   - `http://localhost:3000`
   - URL final da Vercel
6. Configure e-mails de convite/recuperação no painel de Auth.

Nunca exponha a Service Role Key no navegador.

## Migrations e RLS

A migration cria:

- `organizations`
- `profiles`
- `events`
- `event_acceptances`
- `financial_entries`
- `google_connections`
- `audit_logs`
- índices
- constraints de duplicidade do Google Agenda
- views financeiras
- RPC `accept_open_event(event_id uuid)`
- RPC `complete_event(event_id uuid)`
- políticas RLS por organização e perfil

Freelancers só veem os próprios eventos, eventos abertos da organização e o
próprio extrato. Administradores veem apenas dados da própria organização.

## Seed

O seed está em `supabase/seed/seed.sql`.

Para rodar em Supabase local:

1. Crie usuários Auth pelo Studio ou CLI.
2. Substitua os UUIDs do seed pelos IDs reais dos usuários.
3. Execute o seed no SQL Editor ou via CLI.

O seed inclui organização, administrador, três freelancers, eventos futuros,
abertos, concluídos, cancelados, pagamento parcial, pagamento completo e
adiantamento.

## Primeiro administrador

Crie o usuário no Supabase Auth e insira um registro em `profiles` com:

- `role = 'admin'`
- `organization_id` da Traços Detalhados
- `is_active = true`

## Google Cloud e Google Agenda

1. Crie ou selecione um projeto no Google Cloud.
2. Ative a Google Calendar API.
3. Configure a tela de consentimento OAuth.
4. Crie credenciais OAuth 2.0 para aplicação web.
5. Adicione URLs de redirecionamento:
   - `http://localhost:3000/api/google/callback`
   - `https://SEU_DOMINIO/api/google/callback`
6. Preencha `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI`.

O sistema solicita escopo somente leitura:

- `https://www.googleapis.com/auth/calendar.readonly`

Aplicativos públicos que acessam dados do Google podem precisar passar pelo
processo de verificação do Google.

## Deploy na Vercel

1. Suba o projeto para um repositório Git.
2. Importe o repositório na Vercel.
3. Configure as variáveis de ambiente.
4. Configure no Supabase Auth a URL da Vercel.
5. Configure no Google OAuth a URL de callback da Vercel.
6. Execute deploy.

O build padrão é:

```bash
npm run build
```

## Testes

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Os testes unitários cobrem:

- saldo positivo com pagamento parcial
- saldo zero com pagamento completo
- saldo negativo com pagamento superior
- múltiplos pagamentos
- adiantamento antes do evento
- compensação de adiantamento
- idempotência da conclusão
- estorno
- alteração de valor de evento concluído
- reversão de conclusão
- acesso entre freelancers
- acesso entre organizações
- aceite simultâneo de evento aberto

## Regras financeiras

O livro-caixa fica em `financial_entries`.

Convenção:

- valores positivos aumentam o valor devido ao freelancer
- valores negativos diminuem o valor devido ao freelancer

Exemplos:

- evento de R$ 150,00 gera `+150`
- pagamento de R$ 100,00 gera `-100`
- saldo `+50`: a empresa deve R$ 50,00
- pagamento/adiantamento de R$ 200,00 contra evento de R$ 150,00 deixa saldo `-50`
- saldo negativo significa adiantamento recebido pelo freelancer

Ao concluir evento, o sistema gera `event_earning` de forma idempotente. Se a
conclusão for revertida, não apaga histórico: cria lançamento `reversal`.

## Estrutura

- `app/`: rotas do App Router
- `components/`: componentes de UI, formulários e área do sistema
- `lib/domain/`: regras financeiras, tipos e validações
- `lib/demo/`: dados demonstrativos fora dos componentes
- `lib/google/`: OAuth, Calendar API e criptografia de tokens
- `lib/supabase/`: clientes Supabase
- `supabase/migrations/`: schema, RLS, views e RPCs
- `supabase/seed/`: seed de desenvolvimento
- `tests/unit/`: testes financeiros
- `tests/e2e/`: fluxos críticos Playwright

## Limitações do MVP

- A importação do Google Agenda é manual.
- A estrutura está preparada para sincronização futura, sem sincronização
  automática complexa neste MVP.
- Sem credenciais externas, o app roda em modo demonstração para avaliação da
  interface e regras.

## Próximos passos recomendados

- Conectar Supabase real.
- Executar migrations em produção.
- Criar o primeiro administrador.
- Configurar OAuth Google.
- Adicionar domínio próprio na Vercel.
- Evoluir permissões de convite e templates de e-mail.

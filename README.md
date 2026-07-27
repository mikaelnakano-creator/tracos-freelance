# Traços Freelance

Sistema web da Traços Detalhados para controlar eventos, equipes de freelancers,
vagas abertas, aceite pelos parceiros, conclusão dos serviços e financeiro por
profissional.

Cada evento pode ter de 1 a 5 profissionais. A empresa monta a equipe por
serviço, por exemplo:

- Fotografia: 1 profissional
- Filmagem: 1 profissional
- Selfie impressa: 2 profissionais

Cada vaga tem seu próprio freelancer, valor combinado, status, aceite,
conclusão, pagamentos e saldo.

## Stack

- Next.js com App Router
- TypeScript estrito
- React
- Tailwind CSS
- Componentes locais no padrão shadcn/ui
- Lucide Icons
- Supabase Auth, PostgreSQL, RPCs e Row Level Security
- Zod
- date-fns com pt-BR
- Recharts
- Vitest
- Playwright
- Deploy compatível com Vercel e ChatGPT Sites

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

`GOOGLE_TOKEN_ENCRYPTION_KEY` deve ser base64 com 32 bytes:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Modelo do banco

As migrations ficam em `supabase/migrations/`.

- `0001_initial_schema.sql`: base inicial de organização, perfis, eventos,
  financeiro, Google e auditoria.
- `0002_event_status_values.sql`: adiciona os status `partially_assigned` e
  `fully_assigned`.
- `0003_event_team_slots.sql`: adiciona serviços, vagas por profissional,
  aceite atômico por vaga, financeiro por vaga, novas views e políticas RLS.

Tabelas principais:

- `services`: catálogo de serviços da empresa.
- `event_services`: serviços escolhidos para cada evento e quantidade exigida.
- `event_professional_slots`: vagas individuais de cada serviço.
- `financial_entries`: lançamentos financeiros, agora com
  `event_professional_slot_id`.
- `event_acceptances`: histórico de aceite, também ligado à vaga.

Status de evento:

- `draft`
- `open`
- `partially_assigned`
- `fully_assigned`
- `completed`
- `cancelled`

Status de vaga:

- `draft`
- `open`
- `assigned`
- `completed`
- `cancelled`

Regras protegidas no banco:

- mínimo de 1 vaga antes de publicar;
- máximo de 5 vagas ativas por evento;
- quantidade de vagas precisa bater com a soma dos serviços ao publicar;
- mesmo freelancer não pode ocupar duas vagas ativas no mesmo evento;
- apenas uma receita `event_earning` por vaga;
- aceite de vaga aberta via RPC atômica `accept_open_event_slot(slot_id uuid)`.

## RLS e permissões

Administradores veem e gerenciam os dados da própria organização.

Freelancers veem:

- dados do próprio perfil;
- vagas abertas da organização;
- eventos em que fazem parte da equipe;
- extrato financeiro próprio;
- aceite próprio.

Freelancers não atualizam vagas diretamente. O aceite passa pela RPC
`accept_open_event_slot`, que bloqueia corrida quando duas pessoas tentam aceitar
a mesma vaga ao mesmo tempo.

## Regras financeiras

O financeiro é controlado em `financial_entries`.

Convenção:

- valores positivos aumentam o valor devido ao freelancer;
- valores negativos diminuem o valor devido ao freelancer.

Exemplos por vaga:

- vaga de R$ 150,00 concluída gera `+150`;
- pagamento de R$ 100,00 gera `-100`;
- saldo `+50`: a empresa ainda deve R$ 50,00;
- pagamento de R$ 200,00 em vaga de R$ 150,00 gera saldo `-50`;
- saldo negativo significa valor adiantado ao freelancer.

O dashboard da empresa soma eventos, equipe, vagas abertas, vagas preenchidas,
total contratado, pago e saldo. O dashboard de cada freelancer mostra eventos,
ganhos, pagamentos, adiantamentos e saldo próprio.

## Google Agenda

A integração é viável com a Google Calendar API.

Fluxo previsto:

1. A empresa conecta a conta Google por OAuth.
2. O sistema solicita escopo somente leitura:
   `https://www.googleapis.com/auth/calendar.readonly`.
3. A empresa abre a importação, escolhe um evento do Google Agenda e o sistema
   preenche nome, data, horário, local, descrição e link.
4. Depois da importação, a empresa define obrigatoriamente serviços, quantidade
   de profissionais, freelancers e valores.

O MVP usa importação manual selecionada pela empresa. Sincronização automática em
tempo real pode ser adicionada depois com webhooks/watch do Google Calendar,
armazenando `google_calendar_id` e `google_event_id`.

## Seed

O seed está em `supabase/seed/seed.sql`.

Ele inclui:

- organização Traços Detalhados;
- administrador;
- seis freelancers;
- catálogo de serviços;
- eventos com 1, 3, 4 e 5 profissionais;
- serviço Selfie impressa com 2 vagas no mesmo evento;
- evento importado do Google;
- evento concluído com saldo quitado, saldo a pagar e saldo negativo.

Para Supabase local:

1. Crie usuários Auth pelo Studio ou CLI.
2. Substitua os UUIDs do seed pelos IDs reais dos usuários.
3. Execute as migrations.
4. Execute o seed no SQL Editor ou via CLI.

## Testes

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Os testes unitários cobrem:

- evento com dois profissionais no mesmo serviço;
- combinação de serviços diferentes no mesmo evento;
- limite de cinco profissionais;
- bloqueio da sexta vaga;
- aceite simultâneo de vaga aberta;
- bloqueio de duas vagas para o mesmo freelancer no mesmo evento;
- conclusão financeira com receita por vaga;
- pagamento parcial, pagamento maior e saldo negativo;
- redução de quantidade preservando vaga preenchida;
- conclusão parcial sem concluir o evento inteiro.

## Estrutura

- `app/`: rotas do App Router
- `components/`: componentes de UI, formulários e área do sistema
- `lib/domain/`: regras financeiras, tipos e validações
- `lib/demo/`: dados demonstrativos fora dos componentes
- `lib/google/`: OAuth, Calendar API e criptografia de tokens
- `lib/supabase/`: clientes Supabase
- `supabase/migrations/`: schema, RLS, views e RPCs
- `supabase/seed/`: seed de desenvolvimento
- `tests/unit/`: testes financeiros e regras de equipe
- `tests/e2e/`: fluxos críticos Playwright

## Próximos passos de produção

- Conectar Supabase real.
- Executar as migrations `0001`, `0002` e `0003`.
- Criar o primeiro administrador.
- Configurar OAuth Google.
- Configurar variáveis de ambiente no provedor de hospedagem.
- Ativar domínio próprio, se necessário.

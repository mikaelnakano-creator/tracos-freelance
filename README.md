# Traços Detalhados - Controle de Freelances

MVP navegavel para controle de eventos fotograficos, parceiros freelancers e
financeiro por job.

## O que ja esta no painel

- Visao da empresa com eventos do mes, valores combinados, pagos e saldo.
- Cadastro rapido de evento com data, local, horario, servico, valor do job,
  valor pago e freelancer definido ou aberto.
- Aceite de job aberto pelo primeiro freelancer selecionado.
- Painel individual do freelancer com jobs realizados, valor recebido e saldo.
- Controle de pagamento parcial, quitacao e adiantamento por evento.
- Fluxo visual para selecionar eventos vindos do Google Agenda.

## Proximo passo para producao

Para uso real com varios parceiros, o front-end deve ser ligado a:

- Autenticacao: Supabase Auth, Clerk ou NextAuth no Vercel.
- Banco de dados: Supabase Postgres, Neon, Turso ou outro plano gratuito.
- Google Agenda: OAuth 2.0 + Google Calendar API para listar os eventos da
  agenda autorizada e importar titulo, data, horario, local e descricao.

## Rodar localmente

```bash
npm install
npm run dev
npm run build
```

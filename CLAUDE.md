# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ConciliaPro** — SaaS multi-tenant de conciliação de cartões de crédito para o varejo brasileiro. Produto da Velozyn. Reconcilia vendas PDV (Hipcom) contra repasses de adquirentes (Rede) e lançamentos bancários.

Produção:
- API: https://conciliapro-api.onrender.com
- Web: https://conciliapro-web.onrender.com
- GitHub: https://github.com/Matheusmrt/conciliapro
- Render PostgreSQL: `dpg-d8q2nv6gvqtc739s5qo0-a` (expira 2026-07-18 — plano free)

## Monorepo Structure

```
apps/api        — Fastify 4 + TypeScript (ESM), porta 3001
apps/web        — Next.js 16 + Tailwind 4, porta 3000
packages/db     — Prisma schema + client (@conciliacao/db)
packages/edi-parser   — Parser de arquivos EDI Cielo/Rede (@conciliacao/edi-parser)
packages/conciliador  — Lógica de conciliação venda↔repasse (@conciliacao/conciliador)
```

## Commands

```bash
# Desenvolvimento (roda api + web em paralelo)
pnpm dev

# Apenas API
pnpm --filter @conciliacao/api dev

# Apenas Web
pnpm --filter web dev

# Build completo
pnpm build

# Prisma
pnpm db:generate   # gera client após mudar schema
pnpm db:migrate    # cria nova migration (dev)
pnpm db:studio     # abre Prisma Studio
pnpm db:seed       # seed de taxas Rede

# Build individual de pacote
pnpm --filter @conciliacao/db build
pnpm --filter @conciliacao/api build
```

## Env Vars (apps/api/.env)

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
FRONTEND_URL=http://localhost:3000

# Rede — dois clientes OAuth distintos
REDE_CLIENT_ID=...          # gestao-vendas: client_credentials
REDE_CLIENT_SECRET=...
REDE_USERNAME=...           # gestao-acessos: password grant
REDE_PASSWORD=...
REDE_ENV=production         # omitir = sandbox

# Hipcom PDV (on-premise)
# Configurado por estabelecimento via UI — salvo no banco em HipcomConfig

# E-mail
RESEND_API_KEY=...          # Render bloqueia SMTP — usar Resend obrigatoriamente
SMTP_FROM=conciliacao@emporiovillaborghese.com.br

# Storage
AWS_BUCKET=... AWS_REGION=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...

# Open Finance
PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=...
```

## Architecture

### Multi-tenancy
Hierarquia: `Empresa` → `Estabelecimento` → dados. Todas as rotas protegidas extraem `empresaId` do JWT e filtram por ele. `Estabelecimento` mapeia para um PV (ponto de venda) da Rede.

### Auth
JWT via `@fastify/jwt`. Decorator `autenticar` aplicado por rota com `{ onRequest: [app.autenticar] }`. Reset de senha via token armazenado em `Usuario.resetToken` (TTL 2h), e-mail enviado pelo Resend.

### API (Fastify)
Cada domínio tem seu arquivo em `apps/api/src/routes/`. Todos exportam uma função `rotasXxx(app)` registrada em `server.ts` com prefix. Validação com Zod inline nas rotas. Logger pino (JSON em produção).

### Conciliação
Fluxo: importar EDI/CSV → `Venda` + `Repasse` → `conciliador` cruza NSU/valor/data → grava `Conciliacao` (status: CONCILIADA | DIVERGENTE | PENDENTE) + `Divergencia`. Hipcom PDV: `VendaHipcom` (cupom fiscal) cruzada com `Repasse` pelo NSU em `VendaHipcomPagto`.

### Rede API — dois clientes OAuth separados
- `lib/rede-api.ts` — gestão de vendas/repasses: `grant_type=client_credentials`
- `lib/rede-access.ts` — opt-in/gestão de acessos: `grant_type=password` + endpoint `/partner/v1/organizations/requests/features/merchant-statement`

### Hipcom PDV
API on-premise em `http://emporiovilla.dyndns.info:2222/api/hipcom`. Basic Auth + headers `cnpj` e `senha`. Cliente em `lib/hipcom-client.ts`. Credenciais salvas por estabelecimento em `HipcomConfig`. PVs: loja 1 e loja 6.

### Web (Next.js)
App Router. Rotas de dashboard em `app/(dashboard)/`. Layout compartilhado com sidebar em `layout.tsx`. Chamadas à API via `axios` com `NEXT_PUBLIC_API_URL`. Componentes UI reutilizáveis em `src/components/ui/`.

### Deploy (Render.com)
- `Dockerfile.api` — build multi-stage, executa `prisma migrate deploy` em loop com retry antes de iniciar o servidor
- `Dockerfile.web` — build Next.js standalone
- Redis não está provisionado no Render — o worker BullMQ (`workers/coletador.ts`) falha silenciosamente (sem `REDIS_URL` configurado, o retry strategy retorna null)
- Outbound SMTP bloqueado no plano free — usar Resend (`RESEND_API_KEY`)

### PVs Rede (Empório Villa Borghese)
`9060898`, `13501968`, `36477761`, `84700610`, `87076195` — todos precisam de opt-in aceito pelo estabelecimento no portal Rede para liberar o endpoint de extratos.

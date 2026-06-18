FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# ── Dependências ────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/edi-parser/package.json ./packages/edi-parser/
COPY packages/conciliador/package.json ./packages/conciliador/

RUN pnpm install --frozen-lockfile

# ── Build ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

# Gera Prisma client
RUN pnpm --filter @conciliacao/db generate

# Compila a API
RUN pnpm --filter @conciliacao/api build

# ── Runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/edi-parser ./packages/edi-parser
COPY --from=builder /app/packages/conciliador ./packages/conciliador
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copia e executa migration na inicialização
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma

EXPOSE 3001

CMD ["sh", "-c", "pnpm --filter @conciliacao/db migrate:prod && node apps/api/dist/server.js"]

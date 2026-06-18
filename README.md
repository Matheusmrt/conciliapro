# ConciliaPro — Sistema de Conciliação de Cartões

## Estrutura do Projeto

```
conciliacao-cartoes/
├── apps/
│   ├── api/          → Backend Fastify (porta 3001)
│   └── web/          → Frontend Next.js (porta 3000)
├── packages/
│   ├── db/           → Schema Prisma + cliente PostgreSQL
│   ├── edi-parser/   → Parser arquivos EDI Cielo, Rede, GetNet
│   ├── conciliador/  → Motor de conciliação
│   └── shared/       → Tipos e utilitários compartilhados
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## Como rodar

### 1. Instalar dependências
```bash
pnpm install
```

### 2. Subir banco de dados e Redis
```bash
docker-compose up -d
```

### 3. Configurar variáveis de ambiente
```bash
# API
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.local.example apps/web/.env.local
```

### 4. Rodar as migrations do banco
```bash
pnpm db:migrate
```

### 5. Rodar o projeto completo
```bash
pnpm dev
```

- API: http://localhost:3001
- Frontend: http://localhost:3000
- Prisma Studio: `pnpm db:studio`

## Endpoints principais da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /auth/login | Login |
| POST | /auth/registro | Criar conta |
| GET | /dashboard/resumo | KPIs da conciliação |
| POST | /importacao/upload | Upload arquivo EDI |
| GET | /conciliacao | Listar conciliações |
| POST | /conciliacao/executar/:id | Executar conciliação |
| GET | /conciliacao/divergencias | Listar divergências |

# Setup completo do ConciliaPro
Write-Host "`n🚀 ConciliaPro — Setup Inicial" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# 1. Verifica Docker
Write-Host "[ 1/5 ] Verificando Docker..." -ForegroundColor Yellow
$docker = docker --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker não encontrado. Instale o Docker Desktop e rode este script novamente." -ForegroundColor Red
    exit 1
}
Write-Host "✓ $docker" -ForegroundColor Green

# 2. Sobe banco e redis
Write-Host "`n[ 2/5 ] Subindo PostgreSQL e Redis..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Erro ao subir containers" -ForegroundColor Red; exit 1 }
Write-Host "✓ Containers rodando" -ForegroundColor Green

# Aguarda postgres ficar pronto
Write-Host "  Aguardando banco ficar pronto..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# 3. Gera o Prisma Client
Write-Host "`n[ 3/5 ] Gerando Prisma Client..." -ForegroundColor Yellow
Set-Location packages/db
pnpm prisma generate
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Erro no prisma generate" -ForegroundColor Red; exit 1 }
Write-Host "✓ Prisma Client gerado" -ForegroundColor Green

# 4. Roda migrations
Write-Host "`n[ 4/5 ] Criando tabelas no banco..." -ForegroundColor Yellow
pnpm prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Erro nas migrations" -ForegroundColor Red; exit 1 }
Write-Host "✓ Tabelas criadas" -ForegroundColor Green

# 5. Seed
Write-Host "`n[ 5/5 ] Inserindo dados de exemplo..." -ForegroundColor Yellow
pnpm seed
if ($LASTEXITCODE -ne 0) { Write-Host "✗ Erro no seed" -ForegroundColor Red; exit 1 }

Set-Location ../..

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Setup concluído! Rode agora:" -ForegroundColor Green
Write-Host ""
Write-Host "  pnpm dev" -ForegroundColor White
Write-Host ""
Write-Host "Acesse:" -ForegroundColor Cyan
Write-Host "  Frontend → http://localhost:3000" -ForegroundColor White
Write-Host "  API      → http://localhost:3001" -ForegroundColor White
Write-Host "  Banco    → pnpm db:studio`n" -ForegroundColor White

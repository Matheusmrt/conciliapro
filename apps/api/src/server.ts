import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'

import { rotasAuth } from './routes/auth.js'
import { rotasEmpresa } from './routes/empresa.js'
import { rotasConciliacao } from './routes/conciliacao.js'
import { rotasImportacao } from './routes/importacao.js'
import { rotasDashboard } from './routes/dashboard.js'
import { rotasContratosTaxas } from './routes/contratos-taxas.js'
import { rotasAuditoria } from './routes/auditoria.js'
import { rotasFluxoCaixa } from './routes/fluxo-caixa.js'
import { rotasAgenda } from './routes/agenda.js'
import { rotasCancelamentos } from './routes/cancelamentos.js'
import { rotasConferenciaBancaria } from './routes/conferencia-bancaria.js'
import { rotasConciliacaoManual } from './routes/conciliacao-manual.js'
import { rotasExportacao } from './routes/exportacao.js'
import { rotasJobs } from './routes/jobs.js'
import { rotasNotificacoes } from './routes/notificacoes.js'
import { rotasAntecipacao } from './routes/antecipacao.js'
import { rotasDomicilioBancario } from './routes/domicilio-bancario.js'
import { rotasAlertas } from './routes/alertas.js'
import { rotasBoletos } from './routes/boletos.js'
import { rotasGrupoEmpresarial } from './routes/grupo-empresarial.js'
import { rotasParcelas } from './routes/parcelas.js'
import { rotasRedeColeta } from './routes/rede-coleta.js'
import { rotasRedeAcesso } from './routes/rede-acesso.js'
import { rotasPublicas } from './routes/public.js'
import { rotasAdmin } from './routes/admin.js'
import { rotasOpenFinance } from './routes/open-finance.js'
import { rotasDocumentos } from './routes/documentos.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: process.env.FRONTEND_URL ?? '*' })
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret-change-me' })
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }) // 50MB

// Decorator de autenticação
app.decorate('autenticar', async function (request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ erro: 'Token inválido ou expirado' })
  }
})

// Rotas
await app.register(rotasAuth, { prefix: '/auth' })
await app.register(rotasEmpresa, { prefix: '/empresa' })
await app.register(rotasConciliacao, { prefix: '/conciliacao' })
await app.register(rotasImportacao, { prefix: '/importacao' })
await app.register(rotasDashboard, { prefix: '/dashboard' })
await app.register(rotasContratosTaxas, { prefix: '/contratos-taxas' })
await app.register(rotasAuditoria, { prefix: '/auditoria' })
await app.register(rotasFluxoCaixa, { prefix: '/fluxo-caixa' })
await app.register(rotasAgenda, { prefix: '/agenda' })
await app.register(rotasCancelamentos, { prefix: '/cancelamentos' })
await app.register(rotasConferenciaBancaria, { prefix: '/conferencia-bancaria' })
await app.register(rotasConciliacaoManual, { prefix: '/conciliacao-manual' })
await app.register(rotasExportacao, { prefix: '/exportacao' })
await app.register(rotasJobs, { prefix: '/jobs' })
await app.register(rotasNotificacoes, { prefix: '/notificacoes' })
await app.register(rotasAntecipacao, { prefix: '/antecipacao' })
await app.register(rotasDomicilioBancario, { prefix: '/domicilio-bancario' })
await app.register(rotasAlertas, { prefix: '/alertas' })
await app.register(rotasBoletos, { prefix: '/boletos' })
await app.register(rotasGrupoEmpresarial, { prefix: '/grupo-empresarial' })
await app.register(rotasParcelas, { prefix: '/parcelas' })
await app.register(rotasRedeColeta, { prefix: '/rede-coleta' })
await app.register(rotasRedeAcesso, { prefix: '/rede-acesso' })
await app.register(rotasPublicas,    { prefix: '/public' })
await app.register(rotasAdmin,       { prefix: '/admin' })
await app.register(rotasOpenFinance, { prefix: '/open-finance' })
await app.register(rotasDocumentos,  { prefix: '/documentos' })

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

try {
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' })
  console.log(`API rodando em http://localhost:${process.env.PORT ?? 3001}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

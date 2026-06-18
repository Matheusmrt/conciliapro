import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

const ADQUIRENTES_TODOS = [
  'CIELO', 'REDE', 'STONE', 'GETNET', 'PAGSEGURO', 'SAFRA', 'BIN',
  'ALELO', 'PLUXEE', 'VR_BENEFICIOS', 'TICKET', 'VEROCARD', 'UP_BRASIL', 'BEN_VISA_VALE', 'OUTROS',
] as const

export async function rotasEmpresa(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // ─── Empresa ───────────────────────────────────────────────────────────────

  app.get('/me', { ...opts }, async (request) => {
    const payload = (request as any).user
    return prisma.empresa.findUnique({
      where: { id: payload.empresaId },
      select: { id: true, nome: true, cnpj: true, email: true, plano: true, ativo: true },
    })
  })

  app.put('/me', { ...opts }, async (request) => {
    const payload = (request as any).user
    const dados = z.object({
      nome:  z.string().min(2).optional(),
      email: z.string().email().optional(),
      cnpj:  z.string().length(14).optional(),
    }).parse(request.body)
    return prisma.empresa.update({ where: { id: payload.empresaId }, data: dados })
  })

  // ─── Estabelecimentos ─────────────────────────────────────────────────────

  app.get('/estabelecimentos', { ...opts }, async (request) => {
    const payload = (request as any).user
    return prisma.estabelecimento.findMany({
      where: { empresaId: payload.empresaId },
      orderBy: { nome: 'asc' },
    })
  })

  app.post('/estabelecimentos', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const dados = z.object({
      nome: z.string().min(3),
      cnpj: z.string().min(11).max(18),
    }).parse(request.body)

    const cnpjLimpo = dados.cnpj.replace(/\D/g, '')
    const estab = await prisma.estabelecimento.create({
      data: { nome: dados.nome, cnpj: cnpjLimpo, empresaId: payload.empresaId },
    })
    return reply.code(201).send(estab)
  })

  app.put('/estabelecimentos/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user
    const dados = z.object({
      nome: z.string().min(3).optional(),
      cnpj: z.string().min(11).max(18).optional(),
    }).parse(request.body)

    const existe = await prisma.estabelecimento.findFirst({ where: { id, empresaId: payload.empresaId } })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })

    const cnpjLimpo = dados.cnpj ? dados.cnpj.replace(/\D/g, '') : undefined
    return prisma.estabelecimento.update({
      where: { id },
      data: { nome: dados.nome, cnpj: cnpjLimpo },
    })
  })

  app.delete('/estabelecimentos/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user

    const existe = await prisma.estabelecimento.findFirst({ where: { id, empresaId: payload.empresaId } })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })

    await prisma.estabelecimento.delete({ where: { id } })
    return reply.code(204).send()
  })

  // ─── Adquirentes Config (SFTP / API) ──────────────────────────────────────

  app.get('/adquirentes', { ...opts }, async (request) => {
    const payload = (request as any).user
    const configs = await prisma.adquirenteConfig.findMany({
      where: { empresaId: payload.empresaId },
      orderBy: { adquirente: 'asc' },
    })
    // Oculta credenciais sensíveis
    return configs.map(c => ({
      ...c,
      credenciais: Object.fromEntries(
        Object.entries(c.credenciais as Record<string, string>).map(([k, v]) => [
          k,
          k.toLowerCase().includes('pass') || k.toLowerCase().includes('secret')
            ? '••••••••'
            : v,
        ])
      ),
    }))
  })

  app.post('/adquirentes', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const dados = z.object({
      adquirente: z.enum(ADQUIRENTES_TODOS),
      tipoAcesso: z.enum(['EDI_SFTP', 'API_REST', 'WEBHOOK', 'UPLOAD_MANUAL']),
      credenciais: z.record(z.string()),
      ativo: z.boolean().default(true),
    }).parse(request.body)

    // Upsert — um config por adquirente por empresa
    const existente = await prisma.adquirenteConfig.findFirst({
      where: { empresaId: payload.empresaId, adquirente: dados.adquirente },
    })

    if (existente) {
      const config = await prisma.adquirenteConfig.update({
        where: { id: existente.id },
        data: { tipoAcesso: dados.tipoAcesso, credenciais: dados.credenciais, ativo: dados.ativo },
      })
      return config
    }

    const config = await prisma.adquirenteConfig.create({
      data: { ...dados, empresaId: payload.empresaId },
    })
    return reply.code(201).send(config)
  })

  app.delete('/adquirentes/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user

    const existe = await prisma.adquirenteConfig.findFirst({ where: { id, empresaId: payload.empresaId } })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })

    await prisma.adquirenteConfig.delete({ where: { id } })
    return reply.code(204).send()
  })

  // ─── Usuários ─────────────────────────────────────────────────────────────

  app.get('/usuarios', { ...opts }, async (request) => {
    const payload = (request as any).user
    return prisma.usuario.findMany({
      where: { empresaId: payload.empresaId },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, criadoEm: true },
      orderBy: { nome: 'asc' },
    })
  })

  app.post('/usuarios', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const dados = z.object({
      nome: z.string().min(3),
      email: z.string().email(),
      senha: z.string().min(6),
      perfil: z.enum(['ADMIN', 'GERENTE', 'OPERADOR']).default('OPERADOR'),
    }).parse(request.body)

    const { createHash } = await import('crypto')
    const hash = createHash('sha256').update(dados.senha + (process.env.SALT ?? 'salt-dev')).digest('hex')

    const existe = await prisma.usuario.findUnique({ where: { email: dados.email } })
    if (existe) return reply.code(409).send({ erro: 'E-mail já cadastrado' })

    const usuario = await prisma.usuario.create({
      data: { nome: dados.nome, email: dados.email, senha: hash, perfil: dados.perfil, empresaId: payload.empresaId },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, criadoEm: true },
    })
    return reply.code(201).send(usuario)
  })

  app.patch('/usuarios/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user
    const dados = z.object({
      nome: z.string().min(3).optional(),
      perfil: z.enum(['ADMIN', 'GERENTE', 'OPERADOR']).optional(),
      ativo: z.boolean().optional(),
      senha: z.string().min(6).optional(),
    }).parse(request.body)

    const existe = await prisma.usuario.findFirst({ where: { id, empresaId: payload.empresaId } })
    if (!existe) return reply.code(404).send({ erro: 'Usuário não encontrado' })

    const update: any = {}
    if (dados.nome) update.nome = dados.nome
    if (dados.perfil) update.perfil = dados.perfil
    if (dados.ativo !== undefined) update.ativo = dados.ativo
    if (dados.senha) {
      const { createHash } = await import('crypto')
      update.senha = createHash('sha256').update(dados.senha + (process.env.SALT ?? 'salt-dev')).digest('hex')
    }

    return prisma.usuario.update({
      where: { id },
      data: update,
      select: { id: true, nome: true, email: true, perfil: true, ativo: true },
    })
  })

  app.delete('/usuarios/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user

    // Não pode excluir a si mesmo
    if (id === payload.sub) return reply.code(400).send({ erro: 'Não é possível excluir seu próprio usuário' })

    const existe = await prisma.usuario.findFirst({ where: { id, empresaId: payload.empresaId } })
    if (!existe) return reply.code(404).send({ erro: 'Usuário não encontrado' })

    await prisma.usuario.delete({ where: { id } })
    return reply.code(204).send()
  })
}

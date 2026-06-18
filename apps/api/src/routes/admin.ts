// Painel administrativo — protegido por ADMIN_SECRET
import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'
import { cancelarAssinatura } from '../lib/pagarme.js'
import { enviarEmail } from '../lib/mailer.js'
import bcrypt from 'bcryptjs'

function autenticarAdmin(request: any, reply: any, done: Function) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return reply.code(503).send({ erro: 'ADMIN_SECRET não configurado' })
  const auth = request.headers['x-admin-secret']
  if (auth !== secret) return reply.code(401).send({ erro: 'Não autorizado' })
  done()
}

export async function rotasAdmin(app: FastifyInstance) {
  const opts = { onRequest: [autenticarAdmin] }

  // ── Estatísticas gerais ──────────────────────────────────────────────────
  app.get('/stats', { ...opts }, async () => {
    const [
      totalEmpresas,
      ativas,
      trial,
      inadimplentes,
      canceladas,
      totalUsuarios,
      totalVendas,
      totalRepasses,
    ] = await Promise.all([
      prisma.empresa.count(),
      prisma.empresa.count({ where: { statusSaas: 'ATIVO' } }),
      prisma.empresa.count({ where: { statusSaas: 'TRIAL' } }),
      prisma.empresa.count({ where: { statusSaas: 'INADIMPLENTE' } }),
      prisma.empresa.count({ where: { statusSaas: 'CANCELADO' } }),
      prisma.usuario.count(),
      prisma.venda.count(),
      prisma.repasse.count(),
    ])

    return {
      totalEmpresas,
      porStatus: { ativas, trial, inadimplentes, canceladas },
      totalUsuarios,
      totalTransacoes: totalVendas + totalRepasses,
    }
  })

  // ── Lista todas as empresas ──────────────────────────────────────────────
  app.get('/empresas', { ...opts }, async (request) => {
    const { busca, status, plano } = z.object({
      busca:  z.string().optional(),
      status: z.string().optional(),
      plano:  z.string().optional(),
    }).parse(request.query)

    const empresas = await prisma.empresa.findMany({
      where: {
        ...(busca ? { OR: [
          { nome: { contains: busca, mode: 'insensitive' } },
          { email: { contains: busca, mode: 'insensitive' } },
          { cnpj: { contains: busca } },
        ]} : {}),
        ...(status ? { statusSaas: status as any } : {}),
        ...(plano ? { plano: plano as any } : {}),
      },
      include: {
        _count: { select: { usuarios: true, estabelecimentos: true } },
        assinaturas: { orderBy: { criadoEm: 'desc' }, take: 1 },
      },
      orderBy: { criadoEm: 'desc' },
    })

    return empresas.map(e => ({
      id: e.id,
      nome: e.nome,
      cnpj: e.cnpj,
      email: e.email,
      telefone: e.telefone,
      plano: e.plano,
      statusSaas: e.statusSaas,
      trialEndsAt: e.trialEndsAt,
      ativo: e.ativo,
      criadoEm: e.criadoEm,
      usuarios: e._count.usuarios,
      estabelecimentos: e._count.estabelecimentos,
      assinaturaAtual: e.assinaturas[0] ?? null,
    }))
  })

  // ── Detalhes de uma empresa ──────────────────────────────────────────────
  app.get('/empresas/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)

    const empresa = await prisma.empresa.findUnique({
      where: { id },
      include: {
        usuarios: { select: { id: true, nome: true, email: true, perfil: true, ativo: true, criadoEm: true } },
        estabelecimentos: { select: { id: true, nome: true, cnpj: true } },
        assinaturas: { orderBy: { criadoEm: 'desc' } },
        _count: { select: { usuarios: true, estabelecimentos: true } },
      },
    })

    if (!empresa) return reply.code(404).send({ erro: 'Empresa não encontrada' })

    const [totalVendas, totalRepasses, divergenciasAbertas] = await Promise.all([
      prisma.venda.count({ where: { estabelecimento: { empresaId: id } } }),
      prisma.repasse.count({ where: { estabelecimento: { empresaId: id } } }),
      prisma.divergencia.count({ where: { estabelecimento: { empresaId: id }, resolvida: false } }),
    ])

    return { ...empresa, stats: { totalVendas, totalRepasses, divergenciasAbertas } }
  })

  // ── Atualiza plano / status ──────────────────────────────────────────────
  app.patch('/empresas/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const dados = z.object({
      plano:      z.enum(['BASICO', 'PROFISSIONAL', 'ENTERPRISE']).optional(),
      statusSaas: z.enum(['TRIAL', 'ATIVO', 'INADIMPLENTE', 'CANCELADO']).optional(),
      ativo:      z.boolean().optional(),
      trialEndsAt: z.string().optional(),
    }).parse(request.body)

    const empresa = await prisma.empresa.findUnique({ where: { id } })
    if (!empresa) return reply.code(404).send({ erro: 'Empresa não encontrada' })

    // Se cancelando e tem assinatura no Pagar.me, cancela lá também
    if (dados.statusSaas === 'CANCELADO' && empresa.pagarmeSubscriptionId) {
      await cancelarAssinatura(empresa.pagarmeSubscriptionId).catch(() => null)
    }

    return prisma.empresa.update({
      where: { id },
      data: {
        ...( dados.plano ? { plano: dados.plano } : {} ),
        ...( dados.statusSaas ? { statusSaas: dados.statusSaas } : {} ),
        ...( dados.ativo !== undefined ? { ativo: dados.ativo } : {} ),
        ...( dados.trialEndsAt ? { trialEndsAt: new Date(dados.trialEndsAt) } : {} ),
      },
    })
  })

  // ── Envia email para a empresa ───────────────────────────────────────────
  app.post('/empresas/:id/email', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { assunto, mensagem } = z.object({
      assunto: z.string().min(3),
      mensagem: z.string().min(10),
    }).parse(request.body)

    const empresa = await prisma.empresa.findUnique({ where: { id } })
    if (!empresa) return reply.code(404).send({ erro: 'Empresa não encontrada' })

    const result = await enviarEmail(
      empresa.email,
      assunto,
      `<div style="font-family:system-ui;max-width:560px;margin:32px auto">
        <h3 style="color:#1e40af">ConciliaPro</h3>
        <p>${mensagem.replace(/\n/g, '<br>')}</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">ConciliaPro — ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>`
    )

    return result
  })

  // ── Resetar senha do admin da empresa ───────────────────────────────────
  app.post('/empresas/:id/resetar-senha', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { novaSenha } = z.object({ novaSenha: z.string().min(6) }).parse(request.body)

    const admin = await prisma.usuario.findFirst({
      where: { empresaId: id, perfil: 'ADMIN' },
    })
    if (!admin) return reply.code(404).send({ erro: 'Admin não encontrado' })

    const hash = await bcrypt.hash(novaSenha, 10)
    await prisma.usuario.update({ where: { id: admin.id }, data: { senha: hash } })

    return { ok: true, email: admin.email }
  })

  // ── Lista assinaturas ────────────────────────────────────────────────────
  app.get('/assinaturas', { ...opts }, async () => {
    return prisma.assinatura.findMany({
      include: { empresa: { select: { nome: true, email: true, cnpj: true } } },
      orderBy: { criadoEm: 'desc' },
    })
  })

  // ── Gestão de usuários ───────────────────────────────────────────────────

  // Listar todos os usuários com empresa
  app.get('/usuarios', { ...opts }, async (request) => {
    const qs = request.query as any
    const where: any = {}
    if (qs.empresaId) where.empresaId = qs.empresaId
    if (qs.ativo !== undefined) where.ativo = qs.ativo === 'true'
    return prisma.usuario.findMany({
      where,
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, criadoEm: true,
        empresa: { select: { id: true, nome: true } } },
      orderBy: [{ empresa: { nome: 'asc' } }, { nome: 'asc' }],
    })
  })

  // Criar usuário para uma empresa
  app.post('/usuarios', { ...opts }, async (request, reply) => {
    const dados = z.object({
      empresaId: z.string(),
      nome:      z.string().min(2),
      email:     z.string().email(),
      senha:     z.string().min(8),
      perfil:    z.enum(['ADMIN', 'OPERADOR', 'VISUALIZADOR']).default('OPERADOR'),
    }).parse(request.body)

    const existe = await prisma.usuario.findUnique({ where: { email: dados.email } })
    if (existe) return reply.code(409).send({ erro: 'E-mail já cadastrado' })

    const { createHash } = await import('crypto')
    const salt = process.env.SALT ?? 'salt-dev'
    const hash = createHash('sha256').update(dados.senha + salt).digest('hex')

    const usuario = await prisma.usuario.create({
      data: { nome: dados.nome, email: dados.email, senha: hash, perfil: dados.perfil, empresaId: dados.empresaId },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, empresa: { select: { nome: true } } },
    })

    // Envia email de boas-vindas com a senha
    await enviarEmail(dados.email, 'ConciliaPro — Seu acesso foi criado', `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:32px auto;padding:28px;background:#fff;border-radius:12px;border:1px solid #e2e8f0">
        <h2 style="color:#1e40af;margin:0 0 12px">ConciliaPro</h2>
        <p style="color:#374151">Olá, <strong>${dados.nome}</strong>!</p>
        <p style="color:#374151">Seu acesso ao ConciliaPro foi criado. Utilize as credenciais abaixo:</p>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:4px 0;color:#374151"><strong>E-mail:</strong> ${dados.email}</p>
          <p style="margin:4px 0;color:#374151"><strong>Senha:</strong> ${dados.senha}</p>
        </div>
        <a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/login"
          style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Acessar sistema →
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:16px">Recomendamos alterar sua senha após o primeiro acesso.</p>
      </div>
    `).catch(() => null)

    return reply.code(201).send(usuario)
  })

  // Editar usuário
  app.patch('/usuarios/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const dados = z.object({
      nome:   z.string().min(2).optional(),
      email:  z.string().email().optional(),
      perfil: z.enum(['ADMIN', 'OPERADOR', 'VISUALIZADOR']).optional(),
      ativo:  z.boolean().optional(),
    }).parse(request.body)

    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario) return reply.code(404).send({ erro: 'Não encontrado' })

    return prisma.usuario.update({
      where: { id },
      data: dados,
      select: { id: true, nome: true, email: true, perfil: true, ativo: true },
    })
  })

  // Resetar senha de qualquer usuário
  app.post('/usuarios/:id/resetar-senha', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { novaSenha } = z.object({ novaSenha: z.string().min(8) }).parse(request.body)

    const usuario = await prisma.usuario.findUnique({ where: { id }, include: { empresa: true } })
    if (!usuario) return reply.code(404).send({ erro: 'Não encontrado' })

    const { createHash } = await import('crypto')
    const salt = process.env.SALT ?? 'salt-dev'
    const hash = createHash('sha256').update(novaSenha + salt).digest('hex')

    await prisma.usuario.update({ where: { id }, data: { senha: hash, resetToken: null, resetTokenExpira: null } })

    await enviarEmail(usuario.email, 'ConciliaPro — Senha redefinida', `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:32px auto;padding:28px;background:#fff;border-radius:12px;border:1px solid #e2e8f0">
        <h2 style="color:#1e40af;margin:0 0 12px">ConciliaPro</h2>
        <p style="color:#374151">Olá, <strong>${usuario.nome}</strong>.</p>
        <p style="color:#374151">Sua senha foi redefinida pelo administrador:</p>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:4px 0;color:#374151"><strong>Nova senha:</strong> ${novaSenha}</p>
        </div>
        <a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/login"
          style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Acessar sistema →
        </a>
      </div>
    `).catch(() => null)

    return { ok: true }
  })

  // Excluir usuário
  app.delete('/usuarios/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    await prisma.usuario.delete({ where: { id } })
    return reply.code(204).send()
  })

  // ── Gestão de grupos empresariais ────────────────────────────────────────

  // Lista todos os grupos com empresas vinculadas
  app.get('/grupos', { ...opts }, async () => {
    return prisma.grupoEmpresarial.findMany({
      include: {
        empresas: { select: { id: true, nome: true, cnpj: true } },
        _count: { select: { empresas: true } },
      },
      orderBy: { nome: 'asc' },
    })
  })

  // Cria grupo
  app.post('/grupos', { ...opts }, async (request, reply) => {
    const { nome } = z.object({ nome: z.string().min(2) }).parse(request.body)
    const grupo = await prisma.grupoEmpresarial.create({ data: { nome } })
    return reply.code(201).send(grupo)
  })

  // Vincula / desvincula empresa a grupo
  app.patch('/empresas/:id/grupo', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { grupoId } = z.object({ grupoId: z.string().nullable() }).parse(request.body)
    const empresa = await prisma.empresa.findUnique({ where: { id } })
    if (!empresa) return reply.code(404).send({ erro: 'Empresa não encontrada' })
    return prisma.empresa.update({ where: { id }, data: { grupoId } })
  })
}

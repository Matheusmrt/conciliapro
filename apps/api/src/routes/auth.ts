import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'
import { createHash, randomBytes } from 'crypto'
import { enviarEmail } from '../lib/mailer.js'

const schemaLogin = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
})

function hashSenha(senha: string): string {
  return createHash('sha256').update(senha + process.env.SALT ?? 'salt-dev').digest('hex')
}

export async function rotasAuth(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const { email, senha } = schemaLogin.parse(request.body)

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { empresa: true },
    })

    if (!usuario || !usuario.ativo || usuario.senha !== hashSenha(senha)) {
      return reply.code(401).send({ erro: 'Credenciais inválidas' })
    }

    // Bloqueia acesso se trial expirou
    const empresa = usuario.empresa as any
    if (empresa.statusSaas === 'TRIAL' && empresa.trialEndsAt && new Date(empresa.trialEndsAt) < new Date()) {
      return reply.code(403).send({ erro: 'TRIAL_EXPIRADO', mensagem: 'Seu período de teste encerrou. Entre em contato para contratar um plano.' })
    }

    const token = app.jwt.sign({
      sub: usuario.id,
      empresaId: usuario.empresaId,
      perfil: usuario.perfil,
      nome: usuario.nome,
      email: usuario.email,
    }, { expiresIn: '8h' })

    return { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, empresa: usuario.empresa.nome } }
  })

  // Esqueci a senha — gera token e envia email
  app.post('/esqueci-senha', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body)
    const usuario = await prisma.usuario.findUnique({ where: { email } })

    // Sempre retorna 200 para não revelar se email existe
    if (!usuario || !usuario.ativo) return { ok: true }

    const token = randomBytes(32).toString('hex')
    const expira = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2h

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { resetToken: token, resetTokenExpira: expira },
    })

    const url = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/redefinir-senha?token=${token}`

    await enviarEmail(email, 'ConciliaPro — Redefinir senha', `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:32px auto;padding:28px;background:#fff;border-radius:12px;border:1px solid #e2e8f0">
        <h2 style="color:#1e40af;margin:0 0 12px">ConciliaPro</h2>
        <p style="color:#374151">Olá, <strong>${usuario.nome}</strong>.</p>
        <p style="color:#374151">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>
        <a href="${url}" style="display:inline-block;margin:16px 0;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Redefinir senha →
        </a>
        <p style="color:#6b7280;font-size:12px">Este link expira em 2 horas. Se não foi você, ignore este email.</p>
      </div>
    `)

    return { ok: true }
  })

  // Validar token de reset
  app.get('/validar-reset/:token', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.params)
    const usuario = await prisma.usuario.findFirst({
      where: { resetToken: token, resetTokenExpira: { gt: new Date() }, ativo: true },
      select: { id: true, nome: true, email: true },
    })
    if (!usuario) return reply.code(400).send({ erro: 'Token inválido ou expirado' })
    return { ok: true, nome: usuario.nome, email: usuario.email }
  })

  // Redefinir senha com token
  app.post('/redefinir-senha', async (request, reply) => {
    const { token, senha } = z.object({ token: z.string(), senha: z.string().min(8) }).parse(request.body)
    const usuario = await prisma.usuario.findFirst({
      where: { resetToken: token, resetTokenExpira: { gt: new Date() }, ativo: true },
    })
    if (!usuario) return reply.code(400).send({ erro: 'Token inválido ou expirado' })

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senha: hashSenha(senha), resetToken: null, resetTokenExpira: null },
    })
    return { ok: true }
  })

  app.post('/registro', async (request, reply) => {
    const schema = z.object({
      nomeEmpresa: z.string().min(3),
      cnpj: z.string().length(14),
      email: z.string().email(),
      nome: z.string().min(3),
      senha: z.string().min(8),
    })

    const dados = schema.parse(request.body)

    const empresaExistente = await prisma.empresa.findUnique({ where: { cnpj: dados.cnpj } })
    if (empresaExistente) return reply.code(409).send({ erro: 'CNPJ já cadastrado' })

    const empresa = await prisma.empresa.create({
      data: {
        nome: dados.nomeEmpresa,
        cnpj: dados.cnpj,
        email: dados.email,
        usuarios: {
          create: {
            nome: dados.nome,
            email: dados.email,
            senha: hashSenha(dados.senha),
            perfil: 'ADMIN',
          },
        },
      },
      include: { usuarios: true },
    })

    return reply.code(201).send({ mensagem: 'Empresa criada com sucesso', empresaId: empresa.id })
  })
}

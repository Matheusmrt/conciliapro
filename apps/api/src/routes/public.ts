// Rotas públicas — sem autenticação
import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'
import { createHash } from 'crypto'
import { criarCliente } from '../lib/pagarme.js'
import { enviarEmail } from '../lib/mailer.js'

const TRIAL_DIAS = 14

function hashSenha(senha: string): string {
  return createHash('sha256').update(senha + (process.env.SALT ?? 'salt-dev')).digest('hex')
}

export async function rotasPublicas(app: FastifyInstance) {

  // POST /public/cadastro — cria nova empresa (onboarding SaaS)
  app.post('/cadastro', async (request, reply) => {
    const dados = z.object({
      nomeEmpresa: z.string().min(3),
      cnpj:        z.string().min(14),
      nomeAdmin:   z.string().min(3),
      email:       z.string().email(),
      senha:       z.string().min(6),
      telefone:    z.string().optional(),
      plano:       z.enum(['BASICO', 'PROFISSIONAL', 'ENTERPRISE']).default('BASICO'),
    }).parse(request.body)

    const cnpjLimpo = dados.cnpj.replace(/\D/g, '')

    // Verifica duplicatas
    const [cnpjExiste, emailExiste] = await Promise.all([
      prisma.empresa.findUnique({ where: { cnpj: cnpjLimpo } }),
      prisma.usuario.findUnique({ where: { email: dados.email } }),
    ])
    if (cnpjExiste) return reply.code(409).send({ erro: 'CNPJ já cadastrado' })
    if (emailExiste) return reply.code(409).send({ erro: 'E-mail já cadastrado' })

    const trialEndsAt = new Date(Date.now() + TRIAL_DIAS * 86400000)

    // Cria empresa + usuário admin em transação
    const empresa = await prisma.$transaction(async (tx) => {
      const emp = await tx.empresa.create({
        data: {
          nome: dados.nomeEmpresa,
          cnpj: cnpjLimpo,
          email: dados.email,
          telefone: dados.telefone,
          plano: dados.plano,
          statusSaas: 'TRIAL',
          trialEndsAt,
        },
      })

      await tx.usuario.create({
        data: {
          nome: dados.nomeAdmin,
          email: dados.email,
          senha: hashSenha(dados.senha),
          perfil: 'ADMIN',
          empresaId: emp.id,
        },
      })

      // Registra assinatura trial
      await tx.assinatura.create({
        data: {
          empresaId: emp.id,
          plano: dados.plano,
          status: 'trialing',
          inicioEm: new Date(),
          renovaEm: trialEndsAt,
        },
      })

      return emp
    })

    // Cria cliente no Pagar.me (sem cobrar ainda — trial)
    if (process.env.PAGARME_API_KEY) {
      try {
        const cliente = await criarCliente({
          nome: dados.nomeEmpresa,
          email: dados.email,
          cnpj: cnpjLimpo,
          telefone: dados.telefone,
        })
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: { pagarmeCustomerId: cliente.id },
        })
      } catch (e) {
        // Não bloqueia o cadastro se Pagar.me falhar
        console.error('[pagarme] Erro ao criar cliente:', e)
      }
    }

    // Email de boas-vindas
    await enviarEmail(
      dados.email,
      'Bem-vindo ao ConciliaPro!',
      `<div style="font-family:system-ui;max-width:560px;margin:32px auto">
        <h2 style="color:#1e40af">Conta criada com sucesso!</h2>
        <p>Ola <strong>${dados.nomeAdmin}</strong>,</p>
        <p>Seu periodo de teste de <strong>${TRIAL_DIAS} dias</strong> comecou hoje. Acesse o sistema e comece a conciliar:</p>
        <a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}"
          style="display:inline-block;background:#1e40af;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Acessar ConciliaPro
        </a>
        <p style="color:#64748b;font-size:13px">
          E-mail de acesso: <strong>${dados.email}</strong><br>
          Plano: ${dados.plano}<br>
          Trial gratuito ate: <strong>${trialEndsAt.toLocaleDateString('pt-BR')}</strong>
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
        <p style="color:#94a3b8;font-size:11px">Apos o periodo de teste, entre em contato para contratar um plano e continuar usando o sistema.</p>
      </div>`
    ).catch(() => null)

    // Retorna JWT para login automatico
    const token = app.jwt.sign({
      sub: empresa.id,
      empresaId: empresa.id,
      perfil: 'ADMIN',
      nome: dados.nomeAdmin,
      email: dados.email,
    })

    return reply.code(201).send({
      token,
      empresa: { id: empresa.id, nome: empresa.nome, plano: empresa.plano, trialEndsAt },
    })
  })

  // GET /public/planos — retorna os planos disponíveis
  app.get('/planos', async () => {
    return [
      {
        id: 'BASICO',
        nome: 'Basico',
        descricao: 'Ideal para pequenos negocios com 1 CNPJ',
        limiteEstabelecimentos: 1,
        limiteTransacoesMes: 5000,
        recursos: ['Importacao EDI', 'Conciliacao automatica', 'Relatorios basicos', 'Alertas por e-mail'],
        valorCentavos: 19700,
      },
      {
        id: 'PROFISSIONAL',
        nome: 'Profissional',
        descricao: 'Para empresas com multiplos estabelecimentos',
        limiteEstabelecimentos: 5,
        limiteTransacoesMes: 50000,
        recursos: ['Tudo do Basico', 'Multiplos CNPJs', 'API Rede integrada', 'Exportacao ERP (TOTVS)', 'Conferencia bancaria OFX'],
        valorCentavos: 39700,
      },
      {
        id: 'ENTERPRISE',
        nome: 'Enterprise',
        descricao: 'Grupos empresariais e grandes volumes',
        limiteEstabelecimentos: null,
        limiteTransacoesMes: null,
        recursos: ['Tudo do Profissional', 'Ilimitado', 'Grupo empresarial', 'Suporte prioritario', 'Onboarding dedicado'],
        valorCentavos: 79700,
      },
    ]
  })

  // POST /public/pagarme/webhook — recebe eventos do Pagar.me
  app.post('/pagarme/webhook', async (request, reply) => {
    const evento = request.body as any
    const tipo = evento?.type

    if (tipo === 'subscription.status_changed') {
      const sub = evento.data
      const empresa = await prisma.empresa.findFirst({
        where: { pagarmeSubscriptionId: sub.id },
      })
      if (!empresa) return reply.code(200).send()

      const novoStatus = sub.status === 'active' ? 'ATIVO'
        : sub.status === 'past_due' ? 'INADIMPLENTE'
        : sub.status === 'canceled' ? 'CANCELADO'
        : undefined

      if (novoStatus) {
        await prisma.empresa.update({
          where: { id: empresa.id },
          data: { statusSaas: novoStatus as any },
        })
        await prisma.assinatura.updateMany({
          where: { empresaId: empresa.id, pagarmeId: sub.id },
          data: { status: sub.status },
        })
      }
    }

    return reply.code(200).send()
  })
}

import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

const schemaItem = z.object({
  modalidade: z.enum(['CREDITO_A_VISTA', 'CREDITO_PARCELADO', 'DEBITO', 'PIX', 'VOUCHER']),
  bandeira: z.enum(['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OUTROS']).optional(),
  parcelas: z.number().int().min(1).max(24).optional(),
  taxa: z.number().min(0).max(100),
})

const schemaContrato = z.object({
  nome: z.string().min(2),
  adquirente: z.enum([
    'CIELO', 'REDE', 'STONE', 'GETNET', 'PAGSEGURO', 'SAFRA', 'BIN',
    'ALELO', 'PLUXEE', 'VR_BENEFICIOS', 'TICKET', 'VEROCARD', 'UP_BRASIL', 'BEN_VISA_VALE', 'OUTROS',
  ]),
  numeroMatriz: z.string().optional(),
  vigenciaInicio: z.string().optional(),
  vigenciaFim: z.string().optional(),
  itens: z.array(schemaItem).min(1),
})

export async function rotasContratosTaxas(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Listar contratos
  app.get('/', { ...opts }, async (request) => {
    const payload = (request as any).user
    return prisma.contratoTaxa.findMany({
      where: { empresaId: payload.empresaId },
      include: { itens: true },
      orderBy: { criadoEm: 'desc' },
    })
  })

  // Buscar contrato por ID
  app.get('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user
    const contrato = await prisma.contratoTaxa.findFirst({
      where: { id, empresaId: payload.empresaId },
      include: { itens: true },
    })
    if (!contrato) return reply.code(404).send({ erro: 'Contrato não encontrado' })
    return contrato
  })

  // Criar contrato
  app.post('/', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const dados = schemaContrato.parse(request.body)

    const contrato = await prisma.contratoTaxa.create({
      data: {
        nome: dados.nome,
        adquirente: dados.adquirente,
        numeroMatriz: dados.numeroMatriz,
        vigenciaInicio: dados.vigenciaInicio ? new Date(dados.vigenciaInicio) : new Date(),
        vigenciaFim: dados.vigenciaFim ? new Date(dados.vigenciaFim) : undefined,
        empresaId: payload.empresaId,
        itens: {
          create: dados.itens.map(item => ({
            modalidade: item.modalidade,
            bandeira: item.bandeira,
            parcelas: item.parcelas,
            taxa: item.taxa,
          })),
        },
      },
      include: { itens: true },
    })

    return reply.code(201).send(contrato)
  })

  // Atualizar contrato
  app.put('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user
    const dados = schemaContrato.parse(request.body)

    const existe = await prisma.contratoTaxa.findFirst({ where: { id, empresaId: payload.empresaId } })
    if (!existe) return reply.code(404).send({ erro: 'Contrato não encontrado' })

    // Recria os itens
    await prisma.itemContratoTaxa.deleteMany({ where: { contratoId: id } })

    const contrato = await prisma.contratoTaxa.update({
      where: { id },
      data: {
        nome: dados.nome,
        adquirente: dados.adquirente,
        numeroMatriz: dados.numeroMatriz,
        vigenciaInicio: dados.vigenciaInicio ? new Date(dados.vigenciaInicio) : undefined,
        vigenciaFim: dados.vigenciaFim ? new Date(dados.vigenciaFim) : null,
        itens: {
          create: dados.itens.map(item => ({
            modalidade: item.modalidade,
            bandeira: item.bandeira,
            parcelas: item.parcelas,
            taxa: item.taxa,
          })),
        },
      },
      include: { itens: true },
    })

    return contrato
  })

  // Ativar/desativar contrato
  app.patch('/:id/ativo', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { ativo } = z.object({ ativo: z.boolean() }).parse(request.body)
    const payload = (request as any).user

    const existe = await prisma.contratoTaxa.findFirst({ where: { id, empresaId: payload.empresaId } })
    if (!existe) return reply.code(404).send({ erro: 'Contrato não encontrado' })

    return prisma.contratoTaxa.update({ where: { id }, data: { ativo } })
  })

  // Deletar contrato
  app.delete('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const payload = (request as any).user

    const existe = await prisma.contratoTaxa.findFirst({ where: { id, empresaId: payload.empresaId } })
    if (!existe) return reply.code(404).send({ erro: 'Contrato não encontrado' })

    await prisma.contratoTaxa.delete({ where: { id } })
    return reply.code(204).send()
  })
}

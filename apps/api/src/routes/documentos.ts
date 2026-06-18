import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'
import path from 'path'
import { uploadArquivo, deletarArquivo, streamArquivo, arquivoExiste } from '../lib/storage.js'

export async function rotasDocumentos(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Admin: listar todas as empresas + seus documentos
  app.get('/admin', { ...opts }, async (request) => {
    const payload = (request as any).user
    if (payload.perfil !== 'ADMIN' && payload.perfil !== 'SUPER_ADMIN') {
      return { erro: 'Acesso restrito' }
    }
    return prisma.documento.findMany({
      include: { empresa: { select: { id: true, nome: true, cnpj: true } } },
      orderBy: { criadoEm: 'desc' },
    })
  })

  // Admin: upload de documento para uma empresa
  app.post('/admin/upload', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    if (payload.perfil !== 'ADMIN' && payload.perfil !== 'SUPER_ADMIN') {
      return reply.code(403).send({ erro: 'Acesso restrito' })
    }

    const data = await request.file()
    if (!data) return reply.code(400).send({ erro: 'Nenhum arquivo enviado' })

    const empresaId   = data.fields.empresaId   as any
    const tipo        = data.fields.tipo        as any
    const competencia = data.fields.competencia as any
    const descricao   = data.fields.descricao   as any

    const empresaIdVal   = typeof empresaId?.value   === 'string' ? empresaId.value   : ''
    const tipoVal        = typeof tipo?.value        === 'string' ? tipo.value        : 'OUTRO'
    const competenciaVal = typeof competencia?.value === 'string' ? competencia.value : ''
    const descricaoVal   = typeof descricao?.value   === 'string' ? descricao.value   : ''

    if (!empresaIdVal || !competenciaVal) {
      return reply.code(400).send({ erro: 'empresaId e competencia são obrigatórios' })
    }

    const ext      = path.extname(data.filename) || '.pdf'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

    const chunks: Buffer[] = []
    let tamanho = 0
    for await (const chunk of data.file) {
      chunks.push(chunk)
      tamanho += chunk.length
    }
    const buffer = Buffer.concat(chunks)

    await uploadArquivo(filename, buffer, data.mimetype)

    const doc = await prisma.documento.create({
      data: {
        tipo:         tipoVal as any,
        nome:         data.filename,
        competencia:  competenciaVal,
        descricao:    descricaoVal || null,
        caminho:      filename,
        tamanhoBytes: tamanho,
        empresaId:    empresaIdVal,
      },
      include: { empresa: { select: { nome: true } } },
    })

    return reply.code(201).send(doc)
  })

  // Admin: deletar documento
  app.delete('/admin/:id', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    if (payload.perfil !== 'ADMIN' && payload.perfil !== 'SUPER_ADMIN') {
      return reply.code(403).send({ erro: 'Acesso restrito' })
    }
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const doc = await prisma.documento.findUnique({ where: { id } })
    if (!doc) return reply.code(404).send({ erro: 'Não encontrado' })

    await deletarArquivo(doc.caminho)
    await prisma.documento.delete({ where: { id } })
    return reply.code(204).send()
  })

  // Cliente: listar seus próprios documentos
  app.get('/', { ...opts }, async (request) => {
    const payload = (request as any).user
    return prisma.documento.findMany({
      where: { empresaId: payload.empresaId },
      orderBy: [{ competencia: 'desc' }, { tipo: 'asc' }],
      select: { id: true, tipo: true, nome: true, competencia: true, descricao: true, tamanhoBytes: true, criadoEm: true },
    })
  })

  // Cliente: download do arquivo
  app.get('/download/:id', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const { id } = z.object({ id: z.string() }).parse(request.params)

    const doc = await prisma.documento.findFirst({
      where: { id, empresaId: payload.empresaId },
    })
    if (!doc) return reply.code(404).send({ erro: 'Documento não encontrado' })

    if (!arquivoExiste(doc.caminho)) {
      return reply.code(404).send({ erro: 'Arquivo não encontrado no servidor' })
    }

    const ext = path.extname(doc.nome).toLowerCase()
    const mime = ext === '.pdf' ? 'application/pdf'
      : ext === '.xml' ? 'application/xml'
      : 'application/octet-stream'

    reply.header('Content-Type', mime)
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nome)}"`)
    reply.header('Content-Length', doc.tamanhoBytes)

    const stream = await streamArquivo(doc.caminho)
    return reply.send(stream)
  })
}

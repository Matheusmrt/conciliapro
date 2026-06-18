import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { parseCieloEDI, parseRedeEDI, parseBeneficioCSV } from '@conciliacao/edi-parser'
import { z } from 'zod'

export async function rotasImportacao(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Upload de arquivo EDI
  app.post('/upload', { ...opts }, async (request, reply) => {
    const arquivo = await request.file()
    if (!arquivo) return reply.code(400).send({ erro: 'Nenhum arquivo enviado' })

    const query = z.object({
      estabelecimentoId: z.string(),
      adquirente: z.enum([
        'CIELO', 'REDE', 'GETNET', 'PAGSEGURO', 'SAFRA', 'BIN', 'STONE',
        'ALELO', 'PLUXEE', 'VR_BENEFICIOS', 'TICKET', 'VEROCARD', 'UP_BRASIL', 'BEN_VISA_VALE',
      ]),
    }).parse(request.query)

    const conteudo = (await arquivo.toBuffer()).toString('utf-8')
    const nomeArquivo = arquivo.filename

    let resultado
    if (query.adquirente === 'CIELO') {
      resultado = parseCieloEDI(conteudo, nomeArquivo)
    } else if (query.adquirente === 'REDE') {
      resultado = parseRedeEDI(conteudo, nomeArquivo)
    } else if (['ALELO', 'PLUXEE', 'VR_BENEFICIOS', 'TICKET', 'VEROCARD', 'UP_BRASIL', 'BEN_VISA_VALE'].includes(query.adquirente)) {
      resultado = parseBeneficioCSV(conteudo, nomeArquivo, query.adquirente as any)
    } else {
      return reply.code(400).send({ erro: `Parser para ${query.adquirente} ainda não implementado` })
    }

    // Salva registro do arquivo
    const arquivoImportado = await prisma.arquivoImportado.create({
      data: {
        nome: nomeArquivo,
        tipo: query.adquirente === 'REDE'
          ? (resultado.transacoes[0]?.tipoRegistro === 'C' ? 'EDI_REDE_C' : 'EDI_REDE_O')
          : ['ALELO', 'PLUXEE', 'VR_BENEFICIOS', 'TICKET', 'VEROCARD', 'UP_BRASIL', 'BEN_VISA_VALE'].includes(query.adquirente)
            ? 'CSV_VENDAS'
            : (nomeArquivo.includes('_C') ? 'EDI_CIELO_C' : nomeArquivo.includes('_F') ? 'EDI_CIELO_F' : 'EDI_CIELO_O'),
        adquirente: query.adquirente,
        totalLinhas: resultado.totalLinhas,
        totalImportadas: resultado.transacoes.length,
        status: resultado.erros.length > 0 ? 'CONCLUIDO' : 'CONCLUIDO',
        erros: resultado.erros.length > 0 ? resultado.erros : undefined,
      },
    })

    const isBeneficio = ['ALELO', 'PLUXEE', 'VR_BENEFICIOS', 'TICKET', 'VEROCARD', 'UP_BRASIL', 'BEN_VISA_VALE'].includes(query.adquirente)

    // Salva os repasses no banco (arquivo tipo C = pagamentos; benefício sempre tem pagamento)
    if (resultado.transacoes.length > 0 && (isBeneficio || resultado.transacoes[0]?.tipoRegistro === 'C')) {
      for (const t of resultado.transacoes) {
        await prisma.repasse.upsert({
          where: {
            nsu_adquirente_parcela_estabelecimentoId: {
              nsu: t.nsu,
              adquirente: t.adquirente,
              parcela: t.parcela,
              estabelecimentoId: query.estabelecimentoId,
            },
          },
          update: {},
          create: {
            nsu: t.nsu,
            tid: t.tid,
            dataVenda: t.dataVenda,
            dataPagamento: t.dataPagamento ?? t.dataVenda,
            valorBruto: t.valorBruto,
            taxaMdr: t.taxaMdr ?? 0,
            valorTaxa: t.valorTaxa ?? 0,
            valorLiquido: t.valorLiquido ?? t.valorBruto,
            parcela: t.parcela,
            totalParcelas: t.totalParcelas,
            bandeira: t.bandeira,
            modalidade: t.modalidade,
            adquirente: t.adquirente,
            tipoRegistro: t.tipoRegistro,
            arquivoOrigem: t.arquivoOrigem,
            estabelecimentoId: query.estabelecimentoId,
          },
        })
      }
    }

    return {
      mensagem: 'Arquivo importado com sucesso',
      arquivoId: arquivoImportado.id,
      totalTransacoes: resultado.transacoes.length,
      erros: resultado.erros.length,
    }
  })

  // Listar arquivos importados
  app.get('/arquivos', { ...opts }, async () => {
    return prisma.arquivoImportado.findMany({
      orderBy: { criadoEm: 'desc' },
      take: 100,
    })
  })
}

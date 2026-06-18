import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

const MODALIDADES: Record<string, string> = {
  CREDITO_A_VISTA: 'Crédito à Vista',
  CREDITO_PARCELADO: 'Crédito Parcelado',
  DEBITO: 'Débito',
  PIX: 'PIX',
  VOUCHER: 'Voucher',
}

function centToStr(v: number) {
  return (v / 100).toFixed(2).replace('.', ',')
}

export async function rotasExportacao(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // GET /exportacao/repasses — exporta repasses em CSV ou XML para ERP
  app.get('/repasses', { ...opts }, async (request, reply) => {
    const query = z.object({
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      adquirente: z.string().optional(),
      estabelecimentoId: z.string().optional(),
      formato: z.enum(['csv', 'csv_totvs', 'xml_nfe', 'json']).default('csv'),
    }).parse(request.query)

    const payload = (request as any).user

    const where: any = { estabelecimento: { empresaId: payload.empresaId } }
    if (query.dataInicio) where.dataPagamento = { gte: new Date(query.dataInicio) }
    if (query.dataFim) where.dataPagamento = { ...where.dataPagamento, lte: new Date(query.dataFim) }
    if (query.adquirente) where.adquirente = query.adquirente
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId

    const repasses = await prisma.repasse.findMany({
      where,
      include: { estabelecimento: true },
      orderBy: { dataPagamento: 'asc' },
    })

    const dataFmt = (d: Date) => d.toLocaleDateString('pt-BR')

    if (query.formato === 'csv') {
      const linhas = [
        'NSU;TID;Data Venda;Data Pagamento;Adquirente;Bandeira;Modalidade;Parcela;Total Parcelas;Vlr Bruto;Vlr Taxa;Taxa %;Vlr Líquido;Estabelecimento;CNPJ',
        ...repasses.map(r => [
          r.nsu, r.tid ?? '', dataFmt(r.dataVenda), dataFmt(r.dataPagamento),
          r.adquirente, r.bandeira, MODALIDADES[r.modalidade] ?? r.modalidade,
          r.parcela, r.totalParcelas,
          centToStr(Number(r.valorBruto)), centToStr(Number(r.valorTaxa)),
          (Number(r.taxaMdr) * 100).toFixed(4).replace('.', ',') + '%',
          centToStr(Number(r.valorLiquido)),
          r.estabelecimento.nome, r.estabelecimento.cnpj,
        ].join(';')),
      ]
      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="repasses-${query.dataInicio ?? 'all'}.csv"`)
      return reply.send('﻿' + linhas.join('\r\n'))
    }

    if (query.formato === 'csv_totvs') {
      // Formato TOTVS Protheus — lançamento financeiro
      // Campo: Empresa;Filial;Prefixo;Num;Parcela;Tipo;Natureza;Cliente;Loja;Emissão;Vencimento;Valor;Histórico;Centro Custo
      const linhas = [
        'Empresa;Filial;Prefixo;Numero;Parcela;Tipo;Natureza;Fornecedor;Loja;Emissao;Vencimento;Valor;Historico;CentroCusto',
        ...repasses.map(r => [
          '01',                          // Empresa
          '01',                          // Filial
          'NF',                          // Prefixo
          r.nsu.slice(-6),               // Número (últimos 6 dígitos do NSU)
          r.parcela.toString().padStart(2, '0'),
          'CR',                          // CR = Conta a Receber
          'REC-CARTAO',                  // Natureza financeira
          r.adquirente,                  // Fornecedor (adquirente)
          '01',                          // Loja
          r.dataVenda.toLocaleDateString('pt-BR').replace(/\//g, ''),
          r.dataPagamento.toLocaleDateString('pt-BR').replace(/\//g, ''),
          centToStr(Number(r.valorLiquido)),
          `${r.adquirente} ${MODALIDADES[r.modalidade] ?? r.modalidade} ${r.bandeira}`,
          'CARTOES',
        ].join(';')),
      ]
      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="totvs-repasses-${query.dataInicio ?? 'all'}.csv"`)
      return reply.send('﻿' + linhas.join('\r\n'))
    }

    if (query.formato === 'xml_nfe') {
      const itens = repasses.map(r => `
  <lancamento>
    <nsu>${r.nsu}</nsu>
    <dataVenda>${r.dataVenda.toISOString().slice(0, 10)}</dataVenda>
    <dataPagamento>${r.dataPagamento.toISOString().slice(0, 10)}</dataPagamento>
    <adquirente>${r.adquirente}</adquirente>
    <bandeira>${r.bandeira}</bandeira>
    <modalidade>${r.modalidade}</modalidade>
    <parcela>${r.parcela}</parcela>
    <totalParcelas>${r.totalParcelas}</totalParcelas>
    <valorBruto>${(Number(r.valorBruto) / 100).toFixed(2)}</valorBruto>
    <valorTaxa>${(Number(r.valorTaxa) / 100).toFixed(2)}</valorTaxa>
    <taxaMdr>${(Number(r.taxaMdr) * 100).toFixed(4)}</taxaMdr>
    <valorLiquido>${(Number(r.valorLiquido) / 100).toFixed(2)}</valorLiquido>
    <estabelecimento>${r.estabelecimento.nome}</estabelecimento>
    <cnpj>${r.estabelecimento.cnpj}</cnpj>
  </lancamento>`).join('')

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<repasses geradoEm="${new Date().toISOString()}" total="${repasses.length}">
${itens}
</repasses>`
      reply.header('Content-Type', 'application/xml; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="repasses-${query.dataInicio ?? 'all'}.xml"`)
      return reply.send(xml)
    }

    // JSON default
    return repasses.map(r => ({
      nsu: r.nsu, tid: r.tid,
      dataVenda: r.dataVenda.toISOString().slice(0, 10),
      dataPagamento: r.dataPagamento.toISOString().slice(0, 10),
      adquirente: r.adquirente, bandeira: r.bandeira,
      modalidade: r.modalidade,
      parcela: r.parcela, totalParcelas: r.totalParcelas,
      valorBruto: Number(r.valorBruto) / 100,
      valorTaxa: Number(r.valorTaxa) / 100,
      taxaMdrPct: Number(r.taxaMdr) * 100,
      valorLiquido: Number(r.valorLiquido) / 100,
      estabelecimento: r.estabelecimento.nome,
      cnpj: r.estabelecimento.cnpj,
    }))
  })

  // GET /exportacao/divergencias — exporta divergências em aberto
  app.get('/divergencias', { ...opts }, async (request, reply) => {
    const query = z.object({
      formato: z.enum(['csv', 'json']).default('csv'),
      resolvida: z.enum(['true', 'false']).default('false'),
    }).parse(request.query)

    const payload = (request as any).user

    const divs = await prisma.divergencia.findMany({
      where: {
        estabelecimento: { empresaId: payload.empresaId },
        resolvida: query.resolvida === 'true',
      },
      include: {
        estabelecimento: true,
        conciliacao: { include: { repasse: true, venda: true } },
      },
      orderBy: { criadoEm: 'desc' },
    })

    if (query.formato === 'csv') {
      const linhas = [
        'Tipo;Descrição;Valor Impacto;Estabelecimento;NSU;Adquirente;Data;Resolvida',
        ...divs.map(d => [
          d.tipo,
          d.descricao.replace(/;/g, ','),
          d.valorImpacto ? centToStr(Number(d.valorImpacto)) : '',
          d.estabelecimento.nome,
          d.conciliacao.repasse?.nsu ?? d.conciliacao.venda?.nsu ?? '',
          d.conciliacao.repasse?.adquirente ?? d.conciliacao.venda?.adquirente ?? '',
          d.criadoEm.toLocaleDateString('pt-BR'),
          d.resolvida ? 'Sim' : 'Não',
        ].join(';')),
      ]
      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', 'attachment; filename="divergencias.csv"')
      return reply.send('﻿' + linhas.join('\r\n'))
    }

    return divs
  })
}

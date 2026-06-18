import type { FastifyInstance } from 'fastify'
import { prisma } from '@conciliacao/db'
import { z } from 'zod'

// Parser OFX simplificado — extrai <STMTTRN> entries
function parseOFX(conteudo: string) {
  const lancamentos: {
    data: string
    descricao: string
    valor: number
    tipo: 'CREDITO' | 'DEBITO'
    documento: string
  }[] = []

  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match
  while ((match = regex.exec(conteudo)) !== null) {
    const bloco = match[1]
    const get = (tag: string) => {
      const m = new RegExp(`<${tag}>([^<\r\n]+)`, 'i').exec(bloco)
      return m ? m[1].trim() : ''
    }

    const trntype = get('TRNTYPE')
    const dtposted = get('DTPOSTED')
    const trnamt = get('TRNAMT')
    const memo = get('MEMO') || get('NAME') || ''
    const fitid = get('FITID')

    if (!dtposted || !trnamt) continue

    const valor = Math.round(Math.abs(parseFloat(trnamt.replace(',', '.'))) * 100)
    const tipo: 'CREDITO' | 'DEBITO' = parseFloat(trnamt.replace(',', '.')) >= 0 ? 'CREDITO' : 'DEBITO'

    // OFX date format: YYYYMMDDHHMMSS[.mmm[-tz]]
    const ano = dtposted.slice(0, 4)
    const mes = dtposted.slice(4, 6)
    const dia = dtposted.slice(6, 8)
    const data = `${ano}-${mes}-${dia}`

    lancamentos.push({ data, descricao: memo, valor, tipo, documento: fitid })
  }

  // Tenta também formato SGML (sem tags de fechamento)
  if (lancamentos.length === 0) {
    const linhas = conteudo.split(/\r?\n/)
    let atual: any = null
    for (const linha of linhas) {
      const l = linha.trim()
      if (l === '<STMTTRN>') { atual = {}; continue }
      if (l === '</STMTTRN>' && atual) {
        if (atual.data && atual.valor !== undefined) {
          lancamentos.push(atual)
        }
        atual = null; continue
      }
      if (!atual) continue
      if (l.startsWith('<TRNTYPE>')) atual.tipoRaw = l.replace('<TRNTYPE>', '')
      if (l.startsWith('<DTPOSTED>')) {
        const dt = l.replace('<DTPOSTED>', '').slice(0, 8)
        atual.data = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`
      }
      if (l.startsWith('<TRNAMT>')) {
        const v = parseFloat(l.replace('<TRNAMT>', '').replace(',', '.'))
        atual.valor = Math.round(Math.abs(v) * 100)
        atual.tipo = v >= 0 ? 'CREDITO' : 'DEBITO'
      }
      if (l.startsWith('<MEMO>')) atual.descricao = l.replace('<MEMO>', '')
      if (l.startsWith('<NAME>') && !atual.descricao) atual.descricao = l.replace('<NAME>', '')
      if (l.startsWith('<FITID>')) atual.documento = l.replace('<FITID>', '')
    }
  }

  return lancamentos
}

export async function rotasConferenciaBancaria(app: FastifyInstance) {
  const opts = { onRequest: [(app as any).autenticar] }

  // Upload OFX
  app.post('/upload', { ...opts }, async (request, reply) => {
    const payload = (request as any).user
    const data = await request.file()
    if (!data) return reply.code(400).send({ erro: 'Arquivo não enviado' })

    const query = z.object({
      estabelecimentoId: z.string(),
      banco: z.string().optional(),
      agencia: z.string().optional(),
      conta: z.string().optional(),
    }).parse(request.query)

    const estab = await prisma.estabelecimento.findFirst({
      where: { id: query.estabelecimentoId, empresaId: payload.empresaId },
    })
    if (!estab) return reply.code(404).send({ erro: 'Estabelecimento não encontrado' })

    const chunks: Buffer[] = []
    for await (const chunk of data.file) chunks.push(chunk)
    const conteudo = Buffer.concat(chunks).toString('utf-8')
    const nomeArquivo = data.filename

    const lancamentosRaw = parseOFX(conteudo)

    if (lancamentosRaw.length === 0) {
      return reply.code(400).send({ erro: 'Nenhum lançamento encontrado no arquivo OFX' })
    }

    // Insere lançamentos (ignora duplicatas por documento+estabelecimento)
    let importados = 0
    for (const l of lancamentosRaw) {
      try {
        await prisma.lancamentoBancario.create({
          data: {
            data: new Date(l.data + 'T12:00:00'),
            descricao: l.descricao || 'Sem descrição',
            valor: l.valor,
            tipo: l.tipo,
            documento: l.documento,
            banco: query.banco,
            agencia: query.agencia,
            conta: query.conta,
            arquivoOrigem: nomeArquivo,
            estabelecimentoId: query.estabelecimentoId,
          },
        })
        importados++
      } catch {
        // duplicata — ignora
      }
    }

    return { importados, total: lancamentosRaw.length, arquivo: nomeArquivo }
  })

  // Listar lançamentos com resumo e sugestões de conciliação
  app.get('/', { ...opts }, async (request) => {
    const query = z.object({
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      estabelecimentoId: z.string().optional(),
      status: z.string().optional(),
      tipo: z.string().optional(),
    }).parse(request.query)

    const payload = (request as any).user

    const where: any = {
      estabelecimento: { empresaId: payload.empresaId },
    }
    if (query.dataInicio) where.data = { gte: new Date(query.dataInicio) }
    if (query.dataFim) where.data = { ...where.data, lte: new Date(query.dataFim) }
    if (query.estabelecimentoId) where.estabelecimentoId = query.estabelecimentoId
    if (query.status) where.status = query.status
    if (query.tipo) where.tipo = query.tipo

    const lancamentos = await prisma.lancamentoBancario.findMany({
      where,
      include: { estabelecimento: true },
      orderBy: { data: 'desc' },
    })

    const totalCredito = lancamentos
      .filter(l => l.tipo === 'CREDITO')
      .reduce((s, l) => s + Number(l.valor), 0)
    const totalDebito = lancamentos
      .filter(l => l.tipo === 'DEBITO')
      .reduce((s, l) => s + Number(l.valor), 0)
    const pendentes = lancamentos.filter(l => l.status === 'PENDENTE').length
    const conciliados = lancamentos.filter(l => l.status === 'CONCILIADO').length

    return {
      totalCredito: Math.round(totalCredito),
      totalDebito: Math.round(totalDebito),
      saldo: Math.round(totalCredito - totalDebito),
      pendentes,
      conciliados,
      qtde: lancamentos.length,
      lancamentos,
    }
  })

  // Atualizar status de um lançamento
  app.patch('/:id', { ...opts }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const dados = z.object({
      status: z.enum(['CONCILIADO', 'PENDENTE', 'IGNORADO']),
    }).parse(request.body)
    const payload = (request as any).user

    const existe = await prisma.lancamentoBancario.findFirst({
      where: { id, estabelecimento: { empresaId: payload.empresaId } },
    })
    if (!existe) return reply.code(404).send({ erro: 'Não encontrado' })

    return prisma.lancamentoBancario.update({ where: { id }, data: { status: dados.status } })
  })

  // ── Mapeamento conta Itaú → bandeiras Rede ─────────────────────────────
  // Todos os 5 PVs têm a mesma distribuição de bandeiras por conta
  const CONTA_BANDEIRAS: Record<string, string[]> = {
    '001512-4':  ['VISA'],
    '0013417-2': ['MASTERCARD', 'CUP'],
    '0054267-1': ['AMEX', 'ELO', 'CABAL', 'DINERS', 'BANESCARD', 'HIPERCARD',
                  'JCB', 'SICREDI', 'CREDZ', 'SOROCRED', 'COOPERCRED'],
  }

  // ── Parser de descrição bancária da Rede ───────────────────────────────
  // Exemplos reais:
  //   "RECEBIMENTO REDE VISA DB0087076195"  → débito, PV 87076195, VISA
  //   "RECEBIMENTO REDE MAST AT0087076195"  → crédito à vista, PV 87076195, MASTERCARD
  //   "RECEBIMENTO REDE ELO AT0087076195"   → crédito à vista, PV 87076195, ELO
  function parsearDescricaoRede(descricao: string): {
    adquirente: 'REDE'
    bandeira: string | null
    modalidade: 'DEBITO' | 'CREDITO_A_VISTA' | 'CREDITO_PARCELADO' | null
    pv: string | null
  } | null {
    const d = descricao.toUpperCase()
    if (!d.includes('REDE')) return null

    // Bandeiras — ordem importa: MAST antes de MASTERCARD, HIPER antes de HIPERCARD
    const BANDEIRAS: [string, string][] = [
      ['MAST', 'MASTERCARD'], ['MASTERCARD', 'MASTERCARD'],
      ['VISA', 'VISA'],
      ['AMEX', 'AMEX'],
      ['HIPER', 'HIPERCARD'], ['HIPERCARD', 'HIPERCARD'],
      ['DINERS', 'DINERS'],
      ['CABAL', 'CABAL'],
      ['BANESCARD', 'BANESCARD'],
      ['SICREDI', 'SICREDI'],
      ['SOROCRED', 'SOROCRED'],
      ['COOPERCRED', 'COOPERCRED'],
      ['CREDZ', 'CREDZ'],
      ['JCB', 'JCB'],
      ['CUP', 'CUP'],
      ['ELO', 'ELO'],
    ]
    let bandeira: string | null = null
    for (const [abrev, nome] of BANDEIRAS) {
      if (d.includes(abrev)) { bandeira = nome; break }
    }

    // Modalidade: DB = débito, AT = crédito à vista, PA/CR/PC = parcelado
    let modalidade: 'DEBITO' | 'CREDITO_A_VISTA' | 'CREDITO_PARCELADO' | null = null
    if (/ DB\d/.test(d))      modalidade = 'DEBITO'
    else if (/ AT\d/.test(d)) modalidade = 'CREDITO_A_VISTA'
    else if (/ PA\d/.test(d) || / PC\d/.test(d) || / CR\d/.test(d)) modalidade = 'CREDITO_PARCELADO'

    // PV: sequência de dígitos após DB/AT/PA/PC/CR (remove zeros à esquerda)
    const pvMatch = d.match(/(?:DB|AT|PA|PC|CR)0*(\d+)/)
    const pv = pvMatch ? pvMatch[1] : null

    return { adquirente: 'REDE', bandeira, modalidade, pv }
  }

  // Conciliação automática — cruza lançamentos bancários com repasses
  app.post('/conciliar-auto', { ...opts }, async (request) => {
    const payload = (request as any).user
    const { estabelecimentoId } = z.object({
      estabelecimentoId: z.string().optional(),
    }).parse(request.body ?? {})

    const whereEstab: any = { empresaId: payload.empresaId }
    if (estabelecimentoId) whereEstab.id = estabelecimentoId

    const estabelecimentos = await prisma.estabelecimento.findMany({ where: whereEstab })

    let totalConciliados = 0
    let totalDivergencias = 0
    const detalhes: any[] = []

    for (const estab of estabelecimentos) {
      const creditos = await prisma.lancamentoBancario.findMany({
        where: { estabelecimentoId: estab.id, tipo: 'CREDITO', status: 'PENDENTE' },
        orderBy: { data: 'asc' },
      })

      for (const credito of creditos) {
        const valorCredito = Number(credito.valor)
        const dataCredito  = new Date(credito.data)
        const descricao    = credito.descricao ?? ''

        // Tenta identificar adquirente/bandeira/modalidade/PV pela descrição
        const info = parsearDescricaoRede(descricao)

        // Se não reconhecer como pagamento de adquirente → ignora (salário, boleto, etc.)
        if (!info) {
          detalhes.push({
            lancamento: credito.id,
            descricao,
            data: credito.data,
            valorExtrato: valorCredito,
            status: 'NAO_ADQUIRENTE',
          })
          continue
        }

        let matched = false
        for (const toleranciaDias of [0, 1, -1, 2, -2]) {
          const dataAlvo   = new Date(dataCredito)
          dataAlvo.setDate(dataAlvo.getDate() + toleranciaDias)
          const dataInicio = new Date(dataAlvo); dataInicio.setHours(0,0,0,0)
          const dataFim    = new Date(dataAlvo); dataFim.setHours(23,59,59,999)

          // Filtra repasses por adquirente, bandeira e modalidade
          const whereRepasse: any = {
            estabelecimentoId: estab.id,
            dataPagamento: { gte: dataInicio, lte: dataFim },
            adquirente: info.adquirente,
          }
          if (info.modalidade) whereRepasse.modalidade = info.modalidade

          // Bandeira: usa a da descrição; se não identificou, usa as bandeiras
          // esperadas para aquela conta bancária (conta do lançamento)
          if (info.bandeira) {
            whereRepasse.bandeira = info.bandeira
          } else if (credito.conta) {
            const bandeirasConta = CONTA_BANDEIRAS[credito.conta]
            if (bandeirasConta?.length) whereRepasse.bandeira = { in: bandeirasConta }
          }

          const repasses = await prisma.repasse.findMany({ where: whereRepasse })
          if (repasses.length === 0) continue

          const somaRepasses   = repasses.reduce((s, r) => s + Number(r.valorLiquido), 0)
          const somaArredondada = Math.round(somaRepasses)
          const diferenca       = Math.abs(somaArredondada - valorCredito)

          if (diferenca <= 100) {
            await prisma.lancamentoBancario.update({
              where: { id: credito.id },
              data:  { status: 'CONCILIADO' },
            })
            totalConciliados++
            matched = true
            detalhes.push({
              lancamento:    credito.id,
              descricao,
              adquirente:    info.adquirente,
              bandeira:      info.bandeira,
              modalidade:    info.modalidade,
              pv:            info.pv,
              data:          credito.data,
              valorExtrato:  valorCredito,
              somaRepasses:  somaArredondada,
              qtdeRepasses:  repasses.length,
              toleranciaDias,
              status: 'CONCILIADO',
            })
            break
          }

          if (diferenca > 100) {
            detalhes.push({
              lancamento:   credito.id,
              descricao,
              adquirente:   info.adquirente,
              bandeira:     info.bandeira,
              modalidade:   info.modalidade,
              data:         credito.data,
              valorExtrato: valorCredito,
              somaRepasses: somaArredondada,
              diferenca,
              qtdeRepasses: repasses.length,
              status: 'DIVERGENCIA',
            })
            totalDivergencias++
            matched = true
            break
          }
        }

        if (!matched) {
          detalhes.push({
            lancamento:   credito.id,
            descricao,
            adquirente:   info.adquirente,
            bandeira:     info.bandeira,
            data:         credito.data,
            valorExtrato: valorCredito,
            status: 'SEM_REPASSE',
          })
        }
      }
    }

    return {
      conciliados:     totalConciliados,
      divergencias:    totalDivergencias,
      semRepasse:      detalhes.filter(d => d.status === 'SEM_REPASSE').length,
      naoAdquirente:   detalhes.filter(d => d.status === 'NAO_ADQUIRENTE').length,
      detalhes,
    }
  })

  // Deletar todos os lançamentos de um arquivo
  app.delete('/arquivo/:nome', { ...opts }, async (request, reply) => {
    const { nome } = z.object({ nome: z.string() }).parse(request.params)
    const payload = (request as any).user
    const { count } = await prisma.lancamentoBancario.deleteMany({
      where: {
        arquivoOrigem: nome,
        estabelecimento: { empresaId: payload.empresaId },
      },
    })
    return { deletados: count }
  })
}

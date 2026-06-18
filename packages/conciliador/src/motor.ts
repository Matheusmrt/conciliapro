import { prisma, type Venda, type Repasse, StatusConciliacao, TipoDivergencia } from '@conciliacao/db'

const TOLERANCIA_VALOR_CENTAVOS = 1  // diferença de R$0,01 é aceita (arredondamento)

interface ResultadoConciliacao {
  conciliadas: number
  divergentes: number
  vendasSemRepasse: number
  repassesSemVenda: number
}

export async function conciliarEstabelecimento(
  estabelecimentoId: string
): Promise<ResultadoConciliacao> {
  const resultado: ResultadoConciliacao = {
    conciliadas: 0,
    divergentes: 0,
    vendasSemRepasse: 0,
    repassesSemVenda: 0,
  }

  // Busca vendas ainda não conciliadas
  const vendas = await prisma.venda.findMany({
    where: { estabelecimentoId, status: 'PENDENTE', conciliacao: null },
  })

  // Busca repasses ainda não conciliados
  const repasses = await prisma.repasse.findMany({
    where: { estabelecimentoId, conciliacao: null },
  })

  const repassesUsados = new Set<string>()

  for (const venda of vendas) {
    const repasse = encontrarRepasse(venda, repasses, repassesUsados)

    if (!repasse) {
      // Venda sem repasse correspondente
      await prisma.conciliacao.create({
        data: {
          status: StatusConciliacao.VENDA_SEM_REPASSE,
          vendaId: venda.id,
          estabelecimentoId,
          divergencias: {
            create: {
              tipo: TipoDivergencia.VENDA_NAO_REPASSADA,
              descricao: `Venda NSU ${venda.nsu} não encontrada nos repasses`,
              valorImpacto: venda.valor,
              estabelecimentoId,
            },
          },
        },
      })
      await prisma.venda.update({ where: { id: venda.id }, data: { status: 'NAO_ENCONTRADA' } })
      resultado.vendasSemRepasse++
      continue
    }

    repassesUsados.add(repasse.id)

    const divergencias = detectarDivergencias(venda, repasse)

    if (divergencias.length === 0) {
      await prisma.conciliacao.create({
        data: {
          status: StatusConciliacao.CONCILIADA,
          vendaId: venda.id,
          repasseId: repasse.id,
          estabelecimentoId,
        },
      })
      await prisma.venda.update({ where: { id: venda.id }, data: { status: 'CONCILIADA' } })
      resultado.conciliadas++
    } else {
      const status = resolverStatusDivergencia(divergencias)
      const diferencaValor = Number(repasse.valorBruto) - Number(venda.valor)

      await prisma.conciliacao.create({
        data: {
          status,
          vendaId: venda.id,
          repasseId: repasse.id,
          diferencaValor,
          estabelecimentoId,
          divergencias: {
            createMany: {
              data: divergencias.map(d => ({ ...d, estabelecimentoId })),
            },
          },
        },
      })
      await prisma.venda.update({ where: { id: venda.id }, data: { status: 'DIVERGENTE' } })
      resultado.divergentes++
    }
  }

  // Repasses que não tiveram venda correspondente
  for (const repasse of repasses) {
    if (repassesUsados.has(repasse.id)) continue

    await prisma.conciliacao.create({
      data: {
        status: StatusConciliacao.REPASSE_SEM_VENDA,
        repasseId: repasse.id,
        estabelecimentoId,
        divergencias: {
          create: {
            tipo: TipoDivergencia.VENDA_NAO_REPASSADA,
            descricao: `Repasse NSU ${repasse.nsu} sem venda correspondente`,
            valorImpacto: repasse.valorBruto,
            estabelecimentoId,
          },
        },
      },
    })
    resultado.repassesSemVenda++
  }

  return resultado
}

function encontrarRepasse(
  venda: Venda,
  repasses: Repasse[],
  usados: Set<string>
): Repasse | undefined {
  return repasses.find(r =>
    !usados.has(r.id) &&
    r.nsu === venda.nsu &&
    r.adquirente === venda.adquirente
  )
}

function detectarDivergencias(
  venda: Venda,
  repasse: Repasse
): Array<{ tipo: TipoDivergencia; descricao: string; valorImpacto?: number }> {
  const divergencias = []
  const diferencaValor = Math.abs(Number(repasse.valorBruto) - Number(venda.valor))

  if (diferencaValor > TOLERANCIA_VALOR_CENTAVOS) {
    divergencias.push({
      tipo: TipoDivergencia.VALOR_DIFERENTE,
      descricao: `Valor da venda R$${centavosParaReais(Number(venda.valor))} difere do repasse R$${centavosParaReais(Number(repasse.valorBruto))}`,
      valorImpacto: diferencaValor,
    })
  }

  return divergencias
}

function resolverStatusDivergencia(
  divergencias: Array<{ tipo: TipoDivergencia }>
): StatusConciliacao {
  if (divergencias.some(d => d.tipo === TipoDivergencia.TAXA_MAIOR_CONTRATADA)) {
    return StatusConciliacao.DIVERGENCIA_TAXA
  }
  if (divergencias.some(d => d.tipo === TipoDivergencia.VALOR_DIFERENTE)) {
    return StatusConciliacao.DIVERGENCIA_VALOR
  }
  if (divergencias.some(d =>
    d.tipo === TipoDivergencia.PRAZO_ANTECIPADO ||
    d.tipo === TipoDivergencia.PRAZO_ATRASADO
  )) {
    return StatusConciliacao.DIVERGENCIA_PRAZO
  }
  return StatusConciliacao.DIVERGENCIA_VALOR
}

function centavosParaReais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

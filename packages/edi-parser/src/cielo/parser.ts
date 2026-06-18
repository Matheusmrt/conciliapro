import type { TransacaoNormalizada, ResultadoParser, Bandeira, Modalidade } from '../types.js'

// Layout EDI Cielo — Arquivo Tipo O (vendas) e Tipo C (pagamentos)
// Documentação: Manual de Arquivo Eletrônico Cielo

const BANDEIRA_MAP: Record<string, Bandeira> = {
  '001': 'VISA',
  '002': 'MASTERCARD',
  '006': 'ELO',
  '007': 'AMEX',
  '009': 'HIPERCARD',
}

const PRODUTO_MAP: Record<string, Modalidade> = {
  '01': 'CREDITO_A_VISTA',
  '02': 'CREDITO_PARCELADO',
  '03': 'CREDITO_PARCELADO',
  '04': 'DEBITO',
  '08': 'DEBITO',
  '33': 'PIX',
  '35': 'PIX',
}

function parseDate(yyyymmdd: string): Date {
  const y = yyyymmdd.slice(0, 4)
  const m = yyyymmdd.slice(4, 6)
  const d = yyyymmdd.slice(6, 8)
  return new Date(`${y}-${m}-${d}T00:00:00`)
}

function parseCentavos(valor: string): number {
  return parseInt(valor.replace(/\D/g, ''), 10)
}

function parseTaxa(taxa: string): number {
  // EDI Cielo: taxa em formato "00229" = 2.29%
  return parseInt(taxa, 10) / 10000
}

export function parseCieloEDI(conteudo: string, nomeArquivo: string): ResultadoParser {
  const linhas = conteudo.split('\n').map(l => l.trimEnd())
  const transacoes: TransacaoNormalizada[] = []
  const erros: Array<{ linha: number; mensagem: string }> = []

  let tipoArquivo = ''

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    if (!linha || linha.length < 2) continue

    const tipoRegistro = linha.slice(0, 2)

    // Header do arquivo
    if (tipoRegistro === '00') {
      tipoArquivo = linha.slice(2, 4).trim() // 'O', 'C' ou 'F'
      continue
    }

    // Trailer
    if (tipoRegistro === '99') continue

    try {
      if (tipoArquivo === 'O') {
        // Arquivo tipo O — Registro de Venda (tipo 03)
        if (tipoRegistro === '03') {
          const nsu           = linha.slice(2, 17).trim()
          const dataVendaStr  = linha.slice(17, 25).trim()
          const bandeiraCod   = linha.slice(25, 28).trim()
          const produtoCod    = linha.slice(28, 30).trim()
          const totalParcelas = parseInt(linha.slice(30, 32), 10) || 1
          const valorBruto    = parseCentavos(linha.slice(32, 45))
          const tid           = linha.slice(45, 77).trim()

          transacoes.push({
            nsu,
            tid,
            dataVenda: parseDate(dataVendaStr),
            valorBruto,
            parcela: 1,
            totalParcelas,
            bandeira: BANDEIRA_MAP[bandeiraCod] ?? 'OUTROS',
            modalidade: PRODUTO_MAP[produtoCod] ?? 'CREDITO_A_VISTA',
            adquirente: 'CIELO',
            tipoRegistro: 'O',
            arquivoOrigem: nomeArquivo,
          })
        }
      } else if (tipoArquivo === 'C') {
        // Arquivo tipo C — Registro de Pagamento (tipo 05)
        if (tipoRegistro === '05') {
          const nsu             = linha.slice(2, 17).trim()
          const dataVendaStr    = linha.slice(17, 25).trim()
          const dataPagStr      = linha.slice(25, 33).trim()
          const bandeiraCod     = linha.slice(33, 36).trim()
          const produtoCod      = linha.slice(36, 38).trim()
          const parcela         = parseInt(linha.slice(38, 40), 10) || 1
          const totalParcelas   = parseInt(linha.slice(40, 42), 10) || 1
          const valorBruto      = parseCentavos(linha.slice(42, 55))
          const taxaStr         = linha.slice(55, 60).trim()
          const valorTaxa       = parseCentavos(linha.slice(60, 73))
          const valorLiquido    = parseCentavos(linha.slice(73, 86))
          const tid             = linha.slice(86, 118).trim()

          transacoes.push({
            nsu,
            tid,
            dataVenda: parseDate(dataVendaStr),
            dataPagamento: parseDate(dataPagStr),
            valorBruto,
            taxaMdr: parseTaxa(taxaStr),
            valorTaxa,
            valorLiquido,
            parcela,
            totalParcelas,
            bandeira: BANDEIRA_MAP[bandeiraCod] ?? 'OUTROS',
            modalidade: PRODUTO_MAP[produtoCod] ?? 'CREDITO_A_VISTA',
            adquirente: 'CIELO',
            tipoRegistro: 'C',
            arquivoOrigem: nomeArquivo,
          })
        }
      }
    } catch (err) {
      erros.push({ linha: i + 1, mensagem: String(err) })
    }
  }

  return {
    adquirente: 'CIELO',
    arquivo: nomeArquivo,
    totalLinhas: linhas.length,
    transacoes,
    erros,
  }
}

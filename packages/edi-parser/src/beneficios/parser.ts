import type { TransacaoNormalizada, ResultadoParser, Adquirente } from '../types.js'

// Parser para adquirentes de benefício (Alelo, Pluxee, VR Benefícios, Ticket, Verocard)
// Suporta CSV exportado pelo portal de cada operadora.
// Formato padrão esperado (separador ; ou ,):
//   Data Venda; NSU; Data Pagamento; Valor Bruto; Taxa (%); Valor Líquido; Produto/Tipo; CNPJ

function parseBRL(s: string): number {
  // "R$ 1.234,56" → 123456, "1234.56" → 123456, "1234,56" → 123456
  const limpo = s.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim()
  return Math.round(parseFloat(limpo) * 100)
}

function parsePct(s: string): number {
  // "5,40%" → 0.054
  return parseFloat(s.replace('%', '').replace(',', '.').trim()) / 100
}

function parseDataBR(s: string): Date {
  // dd/mm/yyyy ou yyyy-mm-dd
  const t = s.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return new Date(`${t}T00:00:00`)
  const [d, m, y] = t.split('/')
  return new Date(`${y}-${m}-${d}T00:00:00`)
}

function detectSep(linha: string): string {
  const semis = (linha.match(/;/g) ?? []).length
  const commas = (linha.match(/,/g) ?? []).length
  return semis >= commas ? ';' : ','
}

// Mapeia cabeçalho para índice de coluna de forma flexível
function mapearColunas(cabecalho: string[], sep: string) {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const idx = (termos: string[]) => {
    for (const t of termos) {
      const i = cabecalho.findIndex(c => norm(c).includes(norm(t)))
      if (i >= 0) return i
    }
    return -1
  }

  return {
    dataVenda:      idx(['data venda', 'data transacao', 'data compra', 'dt venda', 'data da venda']),
    dataPagamento:  idx(['data pagamento', 'data pag', 'dt pagamento', 'previsao', 'prev pagto']),
    nsu:            idx(['nsu', 'numero sequencial', 'seq', 'nr sequencial', 'transacao']),
    valorBruto:     idx(['valor bruto', 'vlr bruto', 'valor total', 'vlr total', 'bruto']),
    taxa:           idx(['taxa', 'mdr', 'desconto', '% taxa']),
    valorTaxa:      idx(['valor taxa', 'vlr taxa', 'valor desconto', 'desconto r$']),
    valorLiquido:   idx(['valor liquido', 'vlr liquido', 'liquido', 'valor liq']),
    produto:        idx(['produto', 'tipo', 'modalidade', 'beneficio']),
    cnpj:           idx(['cnpj', 'estabelecimento cnpj']),
    estabelecimento:idx(['estabelecimento', 'nome estab', 'razao social']),
    situacao:       idx(['situacao', 'status', 'tipo lancamento', 'tipo registro']),
  }
}

function mapProduto(s: string): 'VOUCHER' | 'DEBITO' | 'CREDITO_A_VISTA' {
  const v = s.toLowerCase()
  if (v.includes('alimenta') || v.includes('refeicao') || v.includes('beneficio') ||
      v.includes('voucher') || v.includes('vale')) return 'VOUCHER'
  if (v.includes('debito')) return 'DEBITO'
  return 'VOUCHER' // padrão para benefício
}

export function parseBeneficioCSV(
  conteudo: string,
  nomeArquivo: string,
  adquirente: Adquirente,
): ResultadoParser {
  // Remove BOM e normaliza quebras
  const texto = conteudo.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean)

  if (linhas.length < 2) {
    return { adquirente, arquivo: nomeArquivo, totalLinhas: 0, transacoes: [], erros: [{ linha: 0, mensagem: 'Arquivo vazio ou sem dados' }] }
  }

  // Detecta separador na primeira linha não-vazia
  const sep = detectSep(linhas[0])

  // Encontra linha de cabeçalho (primeira com coluna NSU ou Data)
  let headerIdx = 0
  for (let i = 0; i < Math.min(5, linhas.length); i++) {
    const norm = linhas[i].toLowerCase()
    if (norm.includes('nsu') || norm.includes('data') || norm.includes('valor')) {
      headerIdx = i
      break
    }
  }

  const cabecalho = linhas[headerIdx].split(sep).map(c => c.replace(/"/g, '').trim())
  const cols = mapearColunas(cabecalho, sep)

  const transacoes: TransacaoNormalizada[] = []
  const erros: Array<{ linha: number; mensagem: string }> = []

  for (let i = headerIdx + 1; i < linhas.length; i++) {
    const linha = linhas[i]
    if (!linha || linha.startsWith('Total') || linha.startsWith('Qtde')) continue

    const campos = linha.split(sep).map(c => c.replace(/"/g, '').trim())
    if (campos.length < 3) continue

    try {
      const get = (idx: number) => (idx >= 0 && idx < campos.length ? campos[idx] : '')

      // NSU obrigatório
      const nsuRaw = get(cols.nsu)
      if (!nsuRaw || nsuRaw === '0') continue
      const nsu = nsuRaw.padStart(12, '0')

      // Data de venda
      const dataVendaStr = get(cols.dataVenda)
      if (!dataVendaStr) continue
      const dataVenda = parseDataBR(dataVendaStr)

      // Data de pagamento
      const dataPagStr = get(cols.dataPagamento)
      const dataPagamento = dataPagStr ? parseDataBR(dataPagStr) : undefined

      // Valores
      const valorBrutoStr = get(cols.valorBruto)
      if (!valorBrutoStr) continue
      const valorBruto = parseBRL(valorBrutoStr)
      if (isNaN(valorBruto) || valorBruto <= 0) continue

      const taxaStr = get(cols.taxa)
      const taxaMdr = taxaStr ? parsePct(taxaStr) : undefined

      const valorTaxaStr = get(cols.valorTaxa)
      const valorTaxa = valorTaxaStr ? parseBRL(valorTaxaStr) : undefined

      const valorLiquidoStr = get(cols.valorLiquido)
      const valorLiquido = valorLiquidoStr ? parseBRL(valorLiquidoStr)
        : (taxaMdr !== undefined ? Math.round(valorBruto * (1 - taxaMdr)) : undefined)

      // Produto/modalidade
      const produtoStr = get(cols.produto) || 'voucher'
      const modalidade = mapProduto(produtoStr)

      // CNPJ estabelecimento
      const estabelecimentoCnpj = get(cols.cnpj).replace(/\D/g, '') || undefined

      // Filtra cancelamentos (valor negativo ou status indicando cancelamento)
      const situacao = get(cols.situacao).toLowerCase()
      if (situacao.includes('cancel') || situacao.includes('estorno') || situacao.includes('chargeback')) {
        // Registra como transação negativa (cancelamento)
        transacoes.push({
          nsu: `CANCEL_${nsu}`,
          dataVenda,
          dataPagamento,
          valorBruto: -Math.abs(valorBruto),
          taxaMdr,
          valorTaxa,
          valorLiquido: valorLiquido ? -Math.abs(valorLiquido) : undefined,
          parcela: 1,
          totalParcelas: 1,
          bandeira: 'OUTROS',
          modalidade,
          adquirente,
          tipoRegistro: 'CANCELAMENTO',
          arquivoOrigem: nomeArquivo,
          estabelecimentoCnpj,
        })
        continue
      }

      transacoes.push({
        nsu,
        dataVenda,
        dataPagamento,
        valorBruto,
        taxaMdr,
        valorTaxa,
        valorLiquido,
        parcela: 1,
        totalParcelas: 1,
        bandeira: 'OUTROS',
        modalidade,
        adquirente,
        tipoRegistro: 'C',
        arquivoOrigem: nomeArquivo,
        estabelecimentoCnpj,
      })
    } catch (err) {
      erros.push({ linha: i + 1, mensagem: String(err) })
    }
  }

  return { adquirente, arquivo: nomeArquivo, totalLinhas: linhas.length - headerIdx - 1, transacoes, erros }
}

// Wrappers específicos por adquirente (podem adaptar quirks se necessário)
export const parseAleloCSV    = (c: string, f: string) => parseBeneficioCSV(c, f, 'ALELO')
export const parsePluxeeCSV   = (c: string, f: string) => parseBeneficioCSV(c, f, 'PLUXEE')
export const parseVRCSV       = (c: string, f: string) => parseBeneficioCSV(c, f, 'VR_BENEFICIOS')
export const parseTicketCSV   = (c: string, f: string) => parseBeneficioCSV(c, f, 'TICKET')
export const parseVelocardCSV = (c: string, f: string) => parseBeneficioCSV(c, f, 'VEROCARD')
export const parseUpBrasilCSV = (c: string, f: string) => parseBeneficioCSV(c, f, 'UP_BRASIL')

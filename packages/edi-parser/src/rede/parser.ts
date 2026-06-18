import type { TransacaoNormalizada, ResultadoParser, Bandeira, Modalidade } from '../types.js'

// Layout EDI Rede — Extrato Eletrônico de Vendas e Pagamentos
// Referência: Manual de Arquivo Eletrônico Rede (v2.x)
// Tipo 0 = Header, Tipo 1 = Venda, Tipo 2 = Parcela/Pagamento, Tipo 9 = Trailer

const BANDEIRA_MAP: Record<string, Bandeira> = {
  '001': 'VISA',
  '002': 'MASTERCARD',
  '006': 'DINERS',   // mapeado como OUTROS
  '007': 'AMEX',
  '009': 'HIPERCARD',
  '010': 'ELO',
  '012': 'MASTERCARD', // Maestro débito
  '077': 'VISA',       // Visa Electron débito
}

const PRODUTO_MAP: Record<string, Modalidade> = {
  '01': 'CREDITO_A_VISTA',
  '02': 'CREDITO_PARCELADO',
  '03': 'CREDITO_PARCELADO', // parcelado emissor
  '06': 'DEBITO',
  '07': 'DEBITO',            // débito pré-datado
  '16': 'VOUCHER',
}

function parseDate(ddmmyyyy: string): Date {
  if (!ddmmyyyy || ddmmyyyy.trim() === '' || ddmmyyyy === '00000000') {
    return new Date()
  }
  const d = ddmmyyyy.slice(0, 2)
  const m = ddmmyyyy.slice(2, 4)
  const y = ddmmyyyy.slice(4, 8)
  return new Date(`${y}-${m}-${d}T00:00:00`)
}

function parseCentavos(valor: string): number {
  return parseInt(valor.replace(/\D/g, ''), 10) || 0
}

function parseTaxa(taxa: string): number {
  // Rede: taxa em formato "000229" = 2.29% (6 dígitos, 4 casas decimais implícitas)
  return parseInt(taxa, 10) / 1000000
}

export function parseRedeEDI(conteudo: string, nomeArquivo: string): ResultadoParser {
  const linhas = conteudo.split('\n').map(l => l.trimEnd())
  const transacoes: TransacaoNormalizada[] = []
  const erros: Array<{ linha: number; mensagem: string }> = []

  // Contexto da venda atual para associar com parcelas
  let vendaAtual: Partial<TransacaoNormalizada> | null = null

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    if (!linha || linha.length < 2) continue

    const tipoRegistro = linha.slice(0, 1)

    try {
      if (tipoRegistro === '0') {
        // Header — ignora, apenas identifica o arquivo
        continue
      }

      if (tipoRegistro === '9') {
        // Trailer — fim do arquivo
        break
      }

      if (tipoRegistro === '1') {
        // Registro de Venda
        // Pos  1:  tipo (1)
        // Pos  2-15: NSU (14)
        // Pos 16-23: data da venda DDMMAAAA (8)
        // Pos 24-26: código bandeira (3)
        // Pos 27-28: código produto (2)
        // Pos 29-30: total parcelas (2)
        // Pos 31-43: valor bruto em centavos (13)
        // Pos 44-75: TID / autorização (32)
        // Pos 76-90: CNPJ estabelecimento (15)

        const nsu            = linha.slice(1, 15).trim()
        const dataVendaStr   = linha.slice(15, 23).trim()
        const bandeiraCod    = linha.slice(23, 26).trim()
        const produtoCod     = linha.slice(26, 28).trim()
        const totalParcelas  = parseInt(linha.slice(28, 30), 10) || 1
        const valorBruto     = parseCentavos(linha.slice(30, 43))
        const tid            = linha.slice(43, 75).trim()
        const cnpj           = linha.slice(75, 90).trim()

        vendaAtual = {
          nsu,
          tid,
          dataVenda: parseDate(dataVendaStr),
          valorBruto,
          totalParcelas,
          bandeira: BANDEIRA_MAP[bandeiraCod] ?? 'OUTROS',
          modalidade: PRODUTO_MAP[produtoCod] ?? 'CREDITO_A_VISTA',
          adquirente: 'REDE',
          arquivoOrigem: nomeArquivo,
          estabelecimentoCnpj: cnpj,
        }

        // Para crédito à vista ou débito, registra a venda diretamente (parcela 1 de 1)
        if (totalParcelas <= 1) {
          transacoes.push({ ...vendaAtual, parcela: 1, totalParcelas: 1 } as TransacaoNormalizada)
          vendaAtual = null
        }
        // Para parcelados aguarda os registros tipo 2
        continue
      }

      if (tipoRegistro === '2') {
        // Registro de Parcela/Pagamento
        // Pos  1:  tipo (1)
        // Pos  2-15: NSU (14) — referência à venda
        // Pos 16-23: data da venda DDMMAAAA (8)
        // Pos 24-31: data do pagamento DDMMAAAA (8)
        // Pos 32-34: código bandeira (3)
        // Pos 35-36: código produto (2)
        // Pos 37-38: número da parcela (2)
        // Pos 39-40: total parcelas (2)
        // Pos 41-53: valor bruto em centavos (13)
        // Pos 54-59: taxa MDR em milionésimos (6)
        // Pos 60-72: valor da taxa em centavos (13)
        // Pos 73-85: valor líquido em centavos (13)
        // Pos 86-117: TID (32)

        const nsu           = linha.slice(1, 15).trim()
        const dataVendaStr  = linha.slice(15, 23).trim()
        const dataPagStr    = linha.slice(23, 31).trim()
        const bandeiraCod   = linha.slice(31, 34).trim()
        const produtoCod    = linha.slice(34, 36).trim()
        const parcela       = parseInt(linha.slice(36, 38), 10) || 1
        const totalParcelas = parseInt(linha.slice(38, 40), 10) || 1
        const valorBruto    = parseCentavos(linha.slice(40, 53))
        const taxaStr       = linha.slice(53, 59).trim()
        const valorTaxa     = parseCentavos(linha.slice(59, 72))
        const valorLiquido  = parseCentavos(linha.slice(72, 85))
        const tid           = linha.slice(85, 117).trim()

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
          adquirente: 'REDE',
          tipoRegistro: 'C',
          arquivoOrigem: nomeArquivo,
        })
      }
    } catch (err) {
      erros.push({ linha: i + 1, mensagem: String(err) })
    }
  }

  return {
    adquirente: 'REDE',
    arquivo: nomeArquivo,
    totalLinhas: linhas.length,
    transacoes,
    erros,
  }
}

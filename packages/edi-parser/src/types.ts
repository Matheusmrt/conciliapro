export type Adquirente =
  | 'CIELO' | 'REDE' | 'GETNET' | 'PAGSEGURO' | 'SAFRA' | 'BIN' | 'STONE'
  | 'ALELO' | 'PLUXEE' | 'VR_BENEFICIOS' | 'TICKET' | 'VEROCARD' | 'UP_BRASIL' | 'BEN_VISA_VALE'
  | 'OUTROS'
export type Bandeira = 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX' | 'HIPERCARD' | 'OUTROS'
export type Modalidade = 'CREDITO_A_VISTA' | 'CREDITO_PARCELADO' | 'DEBITO' | 'PIX' | 'VOUCHER'

export interface TransacaoNormalizada {
  nsu: string
  tid?: string
  dataVenda: Date
  dataPagamento?: Date
  valorBruto: number       // em centavos
  taxaMdr?: number         // ex: 0.0229
  valorTaxa?: number       // em centavos
  valorLiquido?: number    // em centavos
  parcela: number
  totalParcelas: number
  bandeira: Bandeira
  modalidade: Modalidade
  adquirente: Adquirente
  tipoRegistro?: string
  arquivoOrigem?: string
  estabelecimentoCnpj?: string
}

export interface ResultadoParser {
  adquirente: Adquirente
  arquivo: string
  totalLinhas: number
  transacoes: TransacaoNormalizada[]
  erros: Array<{ linha: number; mensagem: string }>
}

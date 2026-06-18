import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Taxas Rede — Empório Villa Borghese (todos os PVs)
// Fonte: portal Rede — extraído em 17/06/2026

const PVS = ['9060898', '13501968', '36477761', '84700610', '87076195']

// prazo: 1 = 1 dia útil | 31 = 31 dias corridos
const TAXAS: {
  bandeira: string
  debito?: number
  credito1x: number
  parcelas: { n: number; taxa: number }[]
  prazoDias: number
  prazoCredito1x?: number
}[] = [
  {
    bandeira: 'MASTERCARD',
    debito: 0.73,
    credito1x: 2.50,
    parcelas: [
      { n: 2,  taxa: 3.93 },
      { n: 3,  taxa: 4.66 },
      { n: 4,  taxa: 5.39 },
      { n: 5,  taxa: 6.12 },
      { n: 6,  taxa: 6.85 },
    ],
    prazoDias: 1,
  },
  {
    bandeira: 'VISA',
    debito: 0.73,
    credito1x: 2.50,
    parcelas: [
      { n: 2,  taxa: 3.93 },
      { n: 3,  taxa: 4.66 },
      { n: 4,  taxa: 5.39 },
      { n: 5,  taxa: 6.12 },
      { n: 6,  taxa: 6.85 },
    ],
    prazoDias: 1,
  },
  {
    bandeira: 'DINERS',
    credito1x: 3.30,
    parcelas: [
      { n: 2,  taxa: 4.73 },
      { n: 3,  taxa: 5.46 },
      { n: 4,  taxa: 6.19 },
      { n: 5,  taxa: 6.92 },
      { n: 6,  taxa: 7.65 },
    ],
    prazoDias: 1,
  },
  {
    bandeira: 'CABAL',
    debito: 1.53,
    credito1x: 3.30,
    parcelas: [
      { n: 2,  taxa: 4.73 },
      { n: 3,  taxa: 5.46 },
      { n: 4,  taxa: 6.19 },
      { n: 5,  taxa: 6.92 },
      { n: 6,  taxa: 7.65 },
    ],
    prazoDias: 1,
  },
  {
    bandeira: 'SICREDI',
    debito: 1.53,
    credito1x: 3.30,
    parcelas: [
      { n: 2,  taxa: 4.73 },
      { n: 3,  taxa: 5.46 },
      { n: 4,  taxa: 6.19 },
      { n: 5,  taxa: 6.92 },
      { n: 6,  taxa: 7.65 },
    ],
    prazoDias: 1,
  },
  {
    bandeira: 'SOROCRED',
    credito1x: 3.30,
    parcelas: [
      { n: 2,  taxa: 4.73 },
      { n: 3,  taxa: 5.46 },
      { n: 4,  taxa: 6.19 },
      { n: 5,  taxa: 6.92 },
      { n: 6,  taxa: 7.65 },
    ],
    prazoDias: 1,
  },
  {
    bandeira: 'CUP',
    credito1x: 2.00,
    parcelas: [],
    prazoDias: 31,
  },
  {
    bandeira: 'BANESCARD',
    debito: 1.53,
    credito1x: 3.30,
    parcelas: [
      { n: 2,  taxa: 4.73 },
      { n: 3,  taxa: 5.46 },
      { n: 4,  taxa: 6.19 },
      { n: 5,  taxa: 6.92 },
      { n: 6,  taxa: 7.65 },
    ],
    prazoDias: 1,
  },
  {
    bandeira: 'JCB',
    credito1x: 3.30,
    parcelas: [
      { n: 2,  taxa: 4.73 },
      { n: 3,  taxa: 5.46 },
      { n: 4,  taxa: 6.19 },
      { n: 5,  taxa: 6.92 },
      { n: 6,  taxa: 7.65 },
    ],
    prazoDias: 1,
  },
  {
    bandeira: 'CREDZ',
    credito1x: 3.30,
    parcelas: [
      { n: 2,  taxa: 4.73 },
      { n: 3,  taxa: 5.46 },
      { n: 4,  taxa: 6.19 },
      { n: 5,  taxa: 6.92 },
      { n: 6,  taxa: 7.65 },
    ],
    prazoDias: 1,
  },
  {
    bandeira: 'AMEX',
    credito1x: 3.30,
    parcelas: [
      { n: 2,  taxa: 4.73 },
      { n: 3,  taxa: 5.46 },
      { n: 4,  taxa: 6.19 },
      { n: 5,  taxa: 6.92 },
      { n: 6,  taxa: 7.65 },
    ],
    prazoDias: 1,
  },
  {
    bandeira: 'ELO',
    debito: 1.53,
    credito1x: 3.30,
    parcelas: [
      { n: 2,  taxa: 4.73 },
      { n: 3,  taxa: 5.46 },
      { n: 4,  taxa: 6.19 },
      { n: 5,  taxa: 6.92 },
      { n: 6,  taxa: 7.65 },
    ],
    prazoDias: 1,
  },
  {
    bandeira: 'COOPERCRED',
    credito1x: 2.00,
    parcelas: [
      { n: 2,  taxa: 4.73 },
      { n: 3,  taxa: 5.46 },
      { n: 4,  taxa: 6.19 },
      { n: 5,  taxa: 6.92 },
      { n: 6,  taxa: 7.65 },
    ],
    prazoDias: 31,
    prazoCredito1x: 31,
  },
]

async function main() {
  // Busca a empresa
  const empresa = await prisma.empresa.findFirst()
  if (!empresa) throw new Error('Nenhuma empresa encontrada. Faça login primeiro.')

  console.log(`Cadastrando taxas para empresa: ${empresa.nome}`)

  let totalContratos = 0
  let totalItens = 0

  for (const pv of PVS) {
    // Cria ou atualiza contrato para este PV
    const contrato = await prisma.contratoTaxa.upsert({
      where: {
        // usa combo único — se não existir unique, cria sempre
        id: `rede-${pv}`,
      },
      update: {
        nome: `Rede PV ${pv}`,
        ativo: true,
      },
      create: {
        id:           `rede-${pv}`,
        nome:         `Rede PV ${pv}`,
        adquirente:   'REDE',
        numeroMatriz: pv,
        empresaId:    empresa.id,
      },
    })

    // Remove itens antigos para recriar limpo
    await prisma.itemContratoTaxa.deleteMany({ where: { contratoId: contrato.id } })

    const itens: any[] = []

    for (const t of TAXAS) {
      const bandeira = t.bandeira as any

      // Débito
      if (t.debito !== undefined) {
        itens.push({
          contratoId: contrato.id,
          modalidade: 'DEBITO',
          bandeira,
          parcelas:   null,
          taxa:       t.debito,
          prazoDias:  t.prazoDias,
        })
      }

      // Crédito à vista
      itens.push({
        contratoId: contrato.id,
        modalidade: 'CREDITO_A_VISTA',
        bandeira,
        parcelas:   1,
        taxa:       t.credito1x,
        prazoDias:  t.prazoCredito1x ?? t.prazoDias,
      })

      // Parcelado
      for (const p of t.parcelas) {
        itens.push({
          contratoId: contrato.id,
          modalidade: 'CREDITO_PARCELADO',
          bandeira,
          parcelas:   p.n,
          taxa:       p.taxa,
          prazoDias:  t.prazoDias,
        })
      }
    }

    await prisma.itemContratoTaxa.createMany({ data: itens })
    totalContratos++
    totalItens += itens.length
    console.log(`  ✓ PV ${pv} — ${itens.length} itens`)
  }

  console.log(`\nConcluído: ${totalContratos} contratos, ${totalItens} itens de taxa cadastrados.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

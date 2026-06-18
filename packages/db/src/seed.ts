import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

function hashSenha(senha: string): string {
  return createHash('sha256').update(senha + 'conciliapro-salt-2024').digest('hex')
}

async function main() {
  console.log('🌱 Iniciando seed...')

  // Empresa principal
  const empresa = await prisma.empresa.upsert({
    where: { cnpj: '00000000000100' },
    update: {},
    create: {
      nome: 'Empório Villa Borghese',
      cnpj: '00000000000100',
      email: 'matheus@emporiovillaborghese.com.br',
      plano: 'PROFISSIONAL',
    },
  })
  console.log(`✓ Empresa: ${empresa.nome}`)

  // Usuário admin
  const usuario = await prisma.usuario.upsert({
    where: { email: 'matheus@emporiovillaborghese.com.br' },
    update: {},
    create: {
      nome: 'Matheus',
      email: 'matheus@emporiovillaborghese.com.br',
      senha: hashSenha('admin123'),
      perfil: 'ADMIN',
      empresaId: empresa.id,
    },
  })
  console.log(`✓ Usuário admin: ${usuario.email}`)

  // Estabelecimento de teste
  const estab = await prisma.estabelecimento.upsert({
    where: { cnpj_empresaId: { cnpj: '00000000000100', empresaId: empresa.id } },
    update: {},
    create: {
      nome: 'Empório Villa Borghese - Matriz',
      cnpj: '00000000000100',
      empresaId: empresa.id,
    },
  })
  console.log(`✓ Estabelecimento: ${estab.nome}`)

  // Dados de exemplo — vendas
  const vendas = [
    { nsu: '100000001', valor: 15000, bandeira: 'VISA' as const,       modalidade: 'CREDITO_A_VISTA' as const },
    { nsu: '100000002', valor: 8500,  bandeira: 'MASTERCARD' as const,  modalidade: 'DEBITO' as const },
    { nsu: '100000003', valor: 32000, bandeira: 'ELO' as const,         modalidade: 'CREDITO_PARCELADO' as const },
    { nsu: '100000004', valor: 12000, bandeira: 'VISA' as const,        modalidade: 'CREDITO_A_VISTA' as const },
    { nsu: '100000005', valor: 5500,  bandeira: 'MASTERCARD' as const,  modalidade: 'DEBITO' as const },
  ]

  for (const v of vendas) {
    await prisma.venda.upsert({
      where: { nsu_adquirente_estabelecimentoId: { nsu: v.nsu, adquirente: 'CIELO', estabelecimentoId: estab.id } },
      update: {},
      create: {
        nsu: v.nsu,
        dataVenda: new Date(),
        valor: v.valor,
        bandeira: v.bandeira,
        modalidade: v.modalidade,
        adquirente: 'CIELO',
        estabelecimentoId: estab.id,
        origem: 'PDV Seed',
      },
    })
  }
  console.log(`✓ ${vendas.length} vendas de exemplo criadas`)

  // Repasses de exemplo (3 das 5 vendas têm repasse — 2 ficam sem repasse para testar divergência)
  const repasses = [
    { nsu: '100000001', valorBruto: 15000, taxaMdr: 0.0229, valorLiquido: 14657 },
    { nsu: '100000002', valorBruto: 8500,  taxaMdr: 0.0149, valorLiquido: 8373 },
    { nsu: '100000003', valorBruto: 32100, taxaMdr: 0.0269, valorLiquido: 31238 }, // valor diferente — divergência!
  ]

  for (const r of repasses) {
    const valorTaxa = Math.round(r.valorBruto * r.taxaMdr)
    await prisma.repasse.upsert({
      where: { nsu_adquirente_parcela_estabelecimentoId: { nsu: r.nsu, adquirente: 'CIELO', parcela: 1, estabelecimentoId: estab.id } },
      update: {},
      create: {
        nsu: r.nsu,
        dataVenda: new Date(),
        dataPagamento: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // D+2
        valorBruto: r.valorBruto,
        taxaMdr: r.taxaMdr,
        valorTaxa,
        valorLiquido: r.valorLiquido,
        parcela: 1,
        totalParcelas: 1,
        bandeira: 'VISA',
        modalidade: 'CREDITO_A_VISTA',
        adquirente: 'CIELO',
        tipoRegistro: 'C',
        arquivoOrigem: 'seed',
        estabelecimentoId: estab.id,
      },
    })
  }
  console.log(`✓ ${repasses.length} repasses de exemplo criados`)

  // Agenda de recebíveis de exemplo
  const hoje = new Date()
  for (let i = 1; i <= 7; i++) {
    const data = new Date(hoje)
    data.setDate(data.getDate() + i)
    await prisma.agendaRecebiveis.create({
      data: {
        dataPrevista: data,
        valorPrevisto: Math.floor(Math.random() * 50000) + 10000,
        adquirente: i % 2 === 0 ? 'CIELO' : 'REDE',
        bandeira: i % 3 === 0 ? 'MASTERCARD' : 'VISA',
        modalidade: 'CREDITO_A_VISTA',
        estabelecimentoId: estab.id,
      },
    })
  }
  console.log(`✓ Agenda de recebíveis dos próximos 7 dias criada`)

  console.log('\n✅ Seed concluído!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Login: matheus@emporiovillaborghese.com.br')
  console.log('Senha: admin123')
  console.log(`Estabelecimento ID: ${estab.id}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

import { prisma } from './index.js'

async function main() {
  const d = await prisma.divergencia.deleteMany({})
  const c = await prisma.conciliacao.deleteMany({})
  const v = await prisma.venda.updateMany({ data: { status: 'PENDENTE' } })
  console.log(`Deletadas ${d.count} divergencias, ${c.count} conciliacoes, resetadas ${v.count} vendas`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })

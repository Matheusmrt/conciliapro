import { PrismaClient } from '@prisma/client'

process.env.DATABASE_URL = 'postgresql://postgres:senha123@localhost:5432/conciliacao'
const p = new PrismaClient()
const users = await p.usuario.findMany({ select: { email: true, perfil: true, ativo: true } })
console.log(JSON.stringify(users, null, 2))
await p.$disconnect()

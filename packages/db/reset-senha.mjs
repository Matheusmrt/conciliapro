import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

process.env.DATABASE_URL = 'postgresql://postgres:senha123@localhost:5432/conciliacao'
const p = new PrismaClient()
const hash = await bcrypt.hash('Villa@404', 10)
await p.usuario.update({ where: { email: 'matheus@emporiovillaborghese.com.br' }, data: { senha: hash } })
console.log('Senha atualizada com sucesso')
await p.$disconnect()

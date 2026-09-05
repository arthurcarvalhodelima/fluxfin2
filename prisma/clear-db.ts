import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Limpando banco de dados...')

  await prisma.auditLog.deleteMany()
  await prisma.documentoProjeto.deleteMany()
  await prisma.despesa.deleteMany()
  await prisma.milestone.deleteMany()
  await prisma.rubrica.deleteMany()
  await prisma.equipeProjeto.deleteMany()
  await prisma.projeto.deleteMany()
  await prisma.usuario.deleteMany()

  console.log('✅ Banco limpo com sucesso!')
  await prisma.$disconnect()
}

main()

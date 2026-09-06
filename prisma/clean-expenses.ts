import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Limpando despesas de seed e resetando valorGasto...')

  const deleted = await prisma.despesa.deleteMany()
  await prisma.rubrica.updateMany({ data: { valorGasto: 0 } })

  console.log(`✅ ${deleted.count} despesas removidas e valorGasto resetado em todas as rubricas`)
  await prisma.$disconnect()
}

main()

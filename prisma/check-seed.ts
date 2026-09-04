import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const counts = {
    usuarios: await prisma.usuario.count(),
    projetos: await prisma.projeto.count(),
    rubricas: await prisma.rubrica.count(),
    equipe: await prisma.equipeProjeto.count(),
    despesas: await prisma.despesa.count(),
    milestones: await prisma.milestone.count(),
  }
  console.log('Contagem de registros:', counts)

  if (counts.milestones < 300) {
    console.log('Faltam milestones. Criando...')
    const projetos = await prisma.projeto.findMany({ select: { id: true, dataInicio: true, dataTermino: true } })
    const fases = ['Levantamento de Requisitos', 'Desenvolvimento', 'Testes', 'Validacao', 'Entrega Final']
    
    for (const projeto of projetos) {
      const existing = await prisma.milestone.count({ where: { projetoId: projeto.id } })
      if (existing > 0) continue

      const inicio = new Date(projeto.dataInicio)
      const termino = new Date(projeto.dataTermino)
      const duracaoMs = termino.getTime() - inicio.getTime()
      const numMilestones = 3 + Math.floor(Math.random() * 3)

      const milestonesData = []
      for (let i = 0; i < numMilestones; i++) {
        const percentual = (i + 1) / numMilestones
        const dataPrevista = new Date(inicio.getTime() + duracaoMs * percentual)
        milestonesData.push({
          projetoId: projeto.id,
          nome: fases[i] || `Fase ${i + 1}`,
          dataPrevista,
          percentualPrevisto: Math.round(percentual * 100),
        })
      }
      await prisma.milestone.createMany({ data: milestonesData })
    }
    const totalMilestones = await prisma.milestone.count()
    console.log(`Total de milestones: ${totalMilestones}`)
  }

  await prisma.$disconnect()
}

main()

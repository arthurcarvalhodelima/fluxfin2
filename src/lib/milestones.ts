import { prisma } from '@/lib/prisma'

export async function recalcularProgresso(projetoId: string): Promise<void> {
  const milestones = await prisma.milestone.findMany({
    where: { projetoId },
  })
  if (milestones.length === 0) return
  const newProgress = milestones
    .filter(m => m.dataExecucao !== null)
    .reduce((sum, m) => sum + Number(m.percentualPrevisto), 0)
  await prisma.projeto.update({
    where: { id: projetoId },
    data: { progressoFisico: Math.min(newProgress, 100) },
  })
}

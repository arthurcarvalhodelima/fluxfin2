import { prisma } from '@/lib/prisma'

export async function checkProjectAccess(projetoId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === 'ADMIN') return true
  const membership = await prisma.equipeProjeto.findUnique({
    where: { projetoId_usuarioId: { projetoId, usuarioId: userId } }
  })
  return !!membership
}

export async function getUserProjectIds(userId: string, userRole: string): Promise<string[]> {
  if (userRole === 'ADMIN') return [] // empty means "all"
  const memberships = await prisma.equipeProjeto.findMany({
    where: { usuarioId: userId },
    select: { projetoId: true }
  })
  return memberships.map(m => m.projetoId)
}

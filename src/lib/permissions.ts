import { prisma } from '@/lib/prisma'

export async function checkProjectAccess(projetoId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === 'ADMIN') {
    const user = await prisma.usuario.findUnique({ where: { id: userId }, select: { ativo: true, deletedAt: true } })
    return !!user && user.ativo && !user.deletedAt
  }
  const membership = await prisma.equipeProjeto.findUnique({
    where: { projetoId_usuarioId: { projetoId, usuarioId: userId } },
  })
  if (!membership || membership.deletedAt) return false
  const user = await prisma.usuario.findUnique({ where: { id: userId }, select: { ativo: true, deletedAt: true } })
  return !!user && user.ativo && !user.deletedAt
}

export async function getUserProjectIds(userId: string, userRole: string): Promise<string[] | null> {
  if (userRole === 'ADMIN') return null
  const memberships = await prisma.equipeProjeto.findMany({
    where: { usuarioId: userId, deletedAt: null },
    select: { projetoId: true },
  })
  return memberships.map((m) => m.projetoId)
}

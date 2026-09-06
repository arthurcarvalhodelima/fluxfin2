import { prisma } from '@/lib/prisma'

export async function checkProjectAccess(projetoId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === 'ADMIN') return true
  return true
}

export async function getUserProjectIds(userId: string, userRole: string): Promise<string[]> {
  if (userRole === 'ADMIN') return [] // empty means "all"
  return [] // all users can see all projects
}

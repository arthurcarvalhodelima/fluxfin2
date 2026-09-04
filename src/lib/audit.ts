import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface AuditParams {
  userId?: string | null
  projetoId?: string | null
  entity: string
  entityId: string
  action: string
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  justification?: string | null
}

export async function createAuditLog({
  userId,
  projetoId,
  entity,
  entityId,
  action,
  oldData,
  newData,
  justification,
}: AuditParams) {
  return prisma.auditLog.create({
    data: {
      usuarioId: userId ?? null,
      projetoId: projetoId ?? null,
      entidade: entity,
      entidadeId: entityId,
      acao: action,
      dadosAnteriores: oldData ? (oldData as Prisma.InputJsonValue) : undefined,
      dadosNovos: newData ? (newData as Prisma.InputJsonValue) : undefined,
      justificativa: justification ?? null,
    },
  })
}

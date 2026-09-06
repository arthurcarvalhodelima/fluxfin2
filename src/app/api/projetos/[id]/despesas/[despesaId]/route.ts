import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { checkProjectAccess } from '@/lib/permissions'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['PENDENTE', 'APROVADA', 'REJEITADA', 'PAGA']),
})

const COUNTED_STATUSES = ['APROVADA', 'PAGA']

function shouldCount(status: string) {
  return COUNTED_STATUSES.includes(status)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; despesaId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem alterar dados' }, { status: 403 })
  }

  const { id, despesaId } = await params
  const body = await request.json()
  const parsed = updateStatusSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const existing = await prisma.despesa.findFirst({
    where: { id: despesaId, projetoId: id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
  }

  const newStatus = parsed.data.status
  const oldStatus = existing.status
  const wasCounted = shouldCount(oldStatus)
  const willCount = shouldCount(newStatus)

  let despesa
  try {
    despesa = await prisma.$transaction(async (tx) => {
      if (!wasCounted && willCount) {
        const rubrica = await tx.rubrica.findUnique({ where: { id: existing.rubricaId } })
        if (!rubrica) {
          throw new Error('Rubrica não encontrada')
        }
        const saldo = Number(rubrica.valorAlocado) - Number(rubrica.valorGasto)
        if (saldo < Number(existing.valor)) {
          throw new Error(`Saldo insuficiente na rubrica. Disponível: ${saldo}`)
        }
        await tx.rubrica.update({
          where: { id: existing.rubricaId },
          data: { valorGasto: { increment: Number(existing.valor) } },
        })
      } else if (wasCounted && !willCount) {
        await tx.rubrica.update({
          where: { id: existing.rubricaId },
          data: { valorGasto: { decrement: Number(existing.valor) } },
        })
      }

      return tx.despesa.update({
        where: { id: despesaId },
        data: { status: newStatus },
      })
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar despesa'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'Despesa',
    entityId: despesaId,
    action: 'ATUALIZAR',
    oldData: { status: oldStatus },
    newData: { status: newStatus },
  })

  return NextResponse.json(despesa)
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { checkProjectAccess } from '@/lib/permissions'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['PENDENTE', 'APROVADA', 'REJEITADA', 'PAGA']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; despesaId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
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

  const despesa = await prisma.despesa.update({
    where: { id: despesaId },
    data: { status: parsed.data.status },
  })

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'Despesa',
    entityId: despesaId,
    action: 'ATUALIZAR',
    oldData: { status: existing.status },
    newData: { status: parsed.data.status },
  })

  return NextResponse.json(despesa)
}

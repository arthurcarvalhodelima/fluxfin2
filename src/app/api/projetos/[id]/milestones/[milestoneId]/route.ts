import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { checkProjectAccess } from '@/lib/permissions'
import { recalcularProgresso } from '@/lib/milestones'
import { z } from 'zod'

const updateMilestoneSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  dataPrevista: z.string().datetime().optional(),
  dataExecucao: z.string().datetime().nullable().optional(),
  percentualPrevisto: z.number().min(0).max(100).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id, milestoneId } = await params
  const body = await request.json()
  const parsed = updateMilestoneSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const existing = await prisma.milestone.findFirst({
    where: { id: milestoneId, projetoId: id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Milestone não encontrada' }, { status: 404 })
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (data.dataPrevista) data.dataPrevista = new Date(data.dataPrevista as string)
  if (data.dataExecucao !== undefined) {
    data.dataExecucao = data.dataExecucao ? new Date(data.dataExecucao as string) : null
  }

  const milestone = await prisma.milestone.update({
    where: { id: milestoneId },
    data,
  })

  if (parsed.data.dataExecucao !== undefined && parsed.data.dataExecucao !== (existing.dataExecucao?.toISOString() ?? null)) {
    await recalcularProgresso(id)
  }

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'Milestone',
    entityId: milestoneId,
    action: 'ATUALIZAR',
    oldData: { nome: existing.nome, dataExecucao: existing.dataExecucao },
    newData: parsed.data,
  })

  return NextResponse.json(milestone)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id, milestoneId } = await params

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const existing = await prisma.milestone.findFirst({
    where: { id: milestoneId, projetoId: id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Milestone não encontrada' }, { status: 404 })
  }

  await prisma.milestone.delete({ where: { id: milestoneId } })
  await recalcularProgresso(id)

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'Milestone',
    entityId: milestoneId,
    action: 'EXCLUIR',
    oldData: { nome: existing.nome },
  })

  return NextResponse.json({ id: milestoneId })
}

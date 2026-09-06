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
  predecessorIds: z.array(z.string().uuid()).optional(),
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
    include: { predecessorDe: { select: { id: true, nome: true, dataExecucao: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Milestone não encontrada' }, { status: 404 })
  }

  const { predecessorIds, ...restData } = parsed.data

  if (predecessorIds !== undefined && predecessorIds.length > 0) {
    const checkDate = restData.dataPrevista ? new Date(restData.dataPrevista) : existing.dataPrevista
    const predecessors = await prisma.milestone.findMany({
      where: { id: { in: predecessorIds }, projetoId: id },
    })
    const invalid = predecessors.find((p) => new Date(p.dataPrevista) >= checkDate)
    if (invalid) {
      return NextResponse.json({
        error: `A data prevista deve ser posterior ao predecessor "${invalid.nome}" (${new Date(invalid.dataPrevista).toLocaleDateString("pt-BR")})`,
      }, { status: 400 })
    }
  }

  const data: Record<string, unknown> = { ...restData }
  if (data.dataPrevista) data.dataPrevista = new Date(data.dataPrevista as string)
  if (data.dataExecucao !== undefined) {
    data.dataExecucao = data.dataExecucao ? new Date(data.dataExecucao as string) : null
  }

  if (data.dataExecucao && existing.predecessorDe.length > 0) {
    const incomplete = existing.predecessorDe.filter((p) => !p.dataExecucao)
    if (incomplete.length > 0) {
      return NextResponse.json({
        error: `Não é possível concluir: o(s) predecessor(es) "${incomplete.map((p) => p.nome).join('", "')}" ainda não foi(foram) concluído(s)`,
      }, { status: 400 })
    }
  }

  if (predecessorIds !== undefined) {
    data.predecessorDe = { set: predecessorIds.map((pid) => ({ id: pid })) }
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

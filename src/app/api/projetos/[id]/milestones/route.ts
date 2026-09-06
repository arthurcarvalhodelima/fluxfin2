import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { checkProjectAccess } from '@/lib/permissions'
import { recalcularProgresso } from '@/lib/milestones'
import { z } from 'zod'

const createMilestoneSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  dataPrevista: z.string().datetime(),
  percentualPrevisto: z.number().min(0).max(100),
  predecessorIds: z.array(z.string().uuid()).optional(),
})

const updateMilestoneSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  dataPrevista: z.string().datetime().optional(),
  dataExecucao: z.string().datetime().nullable().optional(),
  percentualPrevisto: z.number().min(0).max(100).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const milestones = await prisma.milestone.findMany({
    where: { projetoId: id },
    orderBy: { dataPrevista: 'asc' },
    include: {
      _count: { select: { despesas: true } },
      predecessorDe: { select: { id: true, nome: true } },
    },
  })

  return NextResponse.json(milestones)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem alterar dados' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = createMilestoneSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const projeto = await prisma.projeto.findFirst({ where: { id, deletedAt: null } })
  if (!projeto) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  if (parsed.data.predecessorIds && parsed.data.predecessorIds.length > 0) {
    const predecessors = await prisma.milestone.findMany({
      where: { id: { in: parsed.data.predecessorIds }, projetoId: id },
    })
    const newDate = new Date(parsed.data.dataPrevista)
    const invalid = predecessors.find((p) => new Date(p.dataPrevista) >= newDate)
    if (invalid) {
      return NextResponse.json({
        error: `A data prevista deve ser posterior ao predecessor "${invalid.nome}" (${new Date(invalid.dataPrevista).toLocaleDateString("pt-BR")})`,
      }, { status: 400 })
    }
  }

  const milestone = await prisma.milestone.create({
    data: {
      projetoId: id,
      nome: parsed.data.nome,
      descricao: parsed.data.descricao,
      dataPrevista: new Date(parsed.data.dataPrevista),
      percentualPrevisto: parsed.data.percentualPrevisto,
      ...(parsed.data.predecessorIds && parsed.data.predecessorIds.length > 0
        ? { predecessorDe: { connect: parsed.data.predecessorIds.map((pid) => ({ id: pid })) } }
        : {}),
    },
    include: { _count: { select: { despesas: true } } },
  })

  await recalcularProgresso(id)

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'Milestone',
    entityId: milestone.id,
    action: 'CRIAR',
    newData: { nome: milestone.nome, dataPrevista: milestone.dataPrevista },
  })

  return NextResponse.json(milestone, { status: 201 })
}

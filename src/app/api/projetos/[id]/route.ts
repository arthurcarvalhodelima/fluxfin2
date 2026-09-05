import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { checkProjectAccess } from '@/lib/permissions'
import { maskEmail } from '@/lib/lgpd'
import { z } from 'zod'

const updateProjectSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional(),
  dataInicio: z.string().datetime().optional(),
  dataTermino: z.string().datetime().optional(),
  orcamentoGlobal: z.number().positive().optional(),
  status: z.enum(['ATIVO', 'CONCLUIDO', 'SUSPENSO', 'CANCELADO']).optional(),
  progressoFisico: z.number().min(0).max(100).optional(),
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

  const projeto = await prisma.projeto.findFirst({
    where: { id, deletedAt: null },
    include: {
      equipeProjeto: {
        include: {
          usuario: { select: { id: true, nome: true, email: true } },
        },
      },
      rubricas: true,
      despesas: {
        include: {
          rubrica: { select: { nome: true, categoria: true } },
          usuario: { select: { nome: true } },
        },
        orderBy: { dataDespesa: 'desc' },
      },
      documentosProjeto: {
        include: { usuario: { select: { nome: true } } },
        orderBy: { dataUpload: 'desc' },
      },
      milestones: { orderBy: { dataPrevista: 'asc' }, include: { _count: { select: { despesas: true } } } },
    },
  })

  if (!projeto) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    const masked = {
      ...projeto,
      equipeProjeto: projeto.equipeProjeto.map(e => ({
        ...e,
        usuario: { ...e.usuario, email: maskEmail(e.usuario.email) },
      })),
    }
    return NextResponse.json(masked)
  }

  return NextResponse.json(projeto)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = updateProjectSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const existing = await prisma.projeto.findFirst({ where: { id, deletedAt: null } })
  if (!existing) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (data.dataInicio) data.dataInicio = new Date(data.dataInicio as string)
  if (data.dataTermino) data.dataTermino = new Date(data.dataTermino as string)

  const projeto = await prisma.projeto.update({ where: { id }, data })

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'Projeto',
    entityId: id,
    action: 'ATUALIZAR',
    oldData: { titulo: existing.titulo, status: existing.status, orcamentoGlobal: existing.orcamentoGlobal },
    newData: parsed.data,
  })

  return NextResponse.json(projeto)
}

export async function DELETE(
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

  const existing = await prisma.projeto.findFirst({ where: { id, deletedAt: null } })
  if (!existing) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  const projeto = await prisma.projeto.update({
    where: { id },
    data: { status: 'CANCELADO', deletedAt: new Date() },
  })

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'Projeto',
    entityId: id,
    action: 'CANCELAR',
    oldData: { status: existing.status },
    newData: { status: 'CANCELADO', deletedAt: new Date().toISOString() },
  })

  return NextResponse.json({ id: projeto.id, status: projeto.status })
}

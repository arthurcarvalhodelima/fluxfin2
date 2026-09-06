import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { checkProjectAccess } from '@/lib/permissions'
import { z } from 'zod'

const createExpenseSchema = z.object({
  rubricaId: z.string().uuid(),
  milestoneId: z.string().uuid().optional(),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.number().positive('Valor deve ser positivo'),
  dataDespesa: z.string().datetime(),
  justificativa: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const where: Record<string, unknown> = { projetoId: id }
  if (status) {
    where.status = status
  }

  const despesas = await prisma.despesa.findMany({
    where,
    include: {
      rubrica: { select: { id: true, nome: true, categoria: true } },
      usuario: { select: { id: true, nome: true } },
      milestone: { select: { id: true, nome: true } },
    },
    orderBy: { dataDespesa: 'desc' },
  })

  return NextResponse.json(despesas)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = createExpenseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const projeto = await prisma.projeto.findUnique({ where: { id } })
  if (!projeto) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  if (projeto.status !== 'ATIVO') {
    return NextResponse.json({ error: 'Projeto não está ativo' }, { status: 400 })
  }

  const rubrica = await prisma.rubrica.findUnique({ where: { id: parsed.data.rubricaId } })
  if (!rubrica || rubrica.projetoId !== id) {
    return NextResponse.json({ error: 'Rubrica não encontrada neste projeto' }, { status: 404 })
  }

  if (parsed.data.milestoneId) {
    const milestone = await prisma.milestone.findUnique({ where: { id: parsed.data.milestoneId } })
    if (!milestone || milestone.projetoId !== id) {
      return NextResponse.json({ error: 'Milestone não encontrada neste projeto' }, { status: 404 })
    }
  }

  const despesa = await prisma.$transaction(async (tx) => {
    const currentRubrica = await tx.rubrica.findUnique({
      where: { id: parsed.data.rubricaId },
    })

    const saldo = Number(currentRubrica!.valorAlocado) - Number(currentRubrica!.valorGasto)
    if (saldo < parsed.data.valor) {
      throw new Error(`Saldo insuficiente na rubrica. Disponível: ${saldo}`)
    }

    const expense = await tx.despesa.create({
      data: {
        projetoId: id,
        rubricaId: parsed.data.rubricaId,
        usuarioId: session.user.id,
        descricao: parsed.data.descricao,
        valor: parsed.data.valor,
        dataDespesa: new Date(parsed.data.dataDespesa),
        justificativa: parsed.data.justificativa,
        milestoneId: parsed.data.milestoneId ?? null,
      },
    })

    return expense
  })

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'Despesa',
    entityId: despesa.id,
    action: 'CRIAR',
    newData: {
      descricao: parsed.data.descricao,
      valor: parsed.data.valor,
      rubricaId: parsed.data.rubricaId,
      milestoneId: parsed.data.milestoneId ?? null,
    },
  })

  return NextResponse.json(despesa, { status: 201 })
}

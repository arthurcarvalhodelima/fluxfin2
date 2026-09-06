import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { checkProjectAccess } from '@/lib/permissions'
import { z } from 'zod'

const RUBRIC_CATEGORIES = [
  'RECURSOS_HUMANOS', 'SERVICOS_TERCEIROS', 'MATERIAIS_CONSUMO',
  'MATERIAIS_PERMANENTES', 'VIAGENS_DIARIAS', 'CUSTOS_ADMINISTRATIVOS',
] as const

const updateRubricSchema = z.object({
  nome: z.string().min(1).optional(),
  categoria: z.enum(RUBRIC_CATEGORIES).optional(),
  valorAlocado: z.number().positive().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rubricaId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem alterar dados' }, { status: 403 })
  }

  const { id, rubricaId } = await params

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateRubricSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.rubrica.findFirst({ where: { id: rubricaId, projetoId: id } })
  if (!existing) {
    return NextResponse.json({ error: 'Rubrica não encontrada' }, { status: 404 })
  }

  if (parsed.data.categoria && parsed.data.categoria !== existing.categoria) {
    const conflict = await prisma.rubrica.findUnique({
      where: { projetoId_categoria: { projetoId: id, categoria: parsed.data.categoria } },
    })
    if (conflict) {
      return NextResponse.json({ error: 'Já existe uma rubrica para esta categoria' }, { status: 409 })
    }
  }

  if (parsed.data.valorAlocado !== undefined) {
    const projeto = await prisma.projeto.findUnique({ where: { id } })
    if (!projeto) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    const allRubricas = await prisma.rubrica.findMany({ where: { projetoId: id } })
    const totalAlocado = allRubricas.reduce((sum, r) => sum + Number(r.valorAlocado), 0) - Number(existing.valorAlocado) + parsed.data.valorAlocado
    if (totalAlocado > Number(projeto.orcamentoGlobal)) {
      return NextResponse.json({
        error: `Alocação excede o orçamento global. Disponível: ${Number(projeto.orcamentoGlobal) - (totalAlocado - parsed.data.valorAlocado)}`,
      }, { status: 400 })
    }
  }

  const rubrica = await prisma.rubrica.update({
    where: { id: rubricaId },
    data: parsed.data,
  })

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'Rubrica',
    entityId: rubricaId,
    action: 'ATUALIZAR',
    oldData: { nome: existing.nome, categoria: existing.categoria, valorAlocado: Number(existing.valorAlocado) },
    newData: parsed.data,
  })

  return NextResponse.json(rubrica)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; rubricaId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem alterar dados' }, { status: 403 })
  }

  const { id, rubricaId } = await params

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const existing = await prisma.rubrica.findFirst({ where: { id: rubricaId, projetoId: id } })
  if (!existing) {
    return NextResponse.json({ error: 'Rubrica não encontrada' }, { status: 404 })
  }

  if (Number(existing.valorGasto) > 0) {
    return NextResponse.json({ error: 'Não é possível excluir rubrica com despesas vinculadas' }, { status: 400 })
  }

  await prisma.rubrica.delete({ where: { id: rubricaId } })

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'Rubrica',
    entityId: rubricaId,
    action: 'EXCLUIR',
    oldData: { nome: existing.nome, categoria: existing.categoria, valorAlocado: Number(existing.valorAlocado) },
  })

  return NextResponse.json({ success: true })
}

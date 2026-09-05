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

const createRubricSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  categoria: z.enum(RUBRIC_CATEGORIES),
  valorAlocado: z.number().positive('Valor deve ser positivo'),
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

  const projeto = await prisma.projeto.findUnique({ where: { id } })
  if (!projeto) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  const rubricas = await prisma.rubrica.findMany({
    where: { projetoId: id },
    select: {
      id: true,
      nome: true,
      categoria: true,
      valorAlocado: true,
      valorGasto: true,
      criadoEm: true,
    },
    orderBy: { categoria: 'asc' },
  })

  const rubricasComSaldo = rubricas.map(r => ({
    ...r,
    saldo: Number(r.valorAlocado) - Number(r.valorGasto),
    percentualGasto: Number(r.valorAlocado) > 0
      ? (Number(r.valorGasto) / Number(r.valorAlocado) * 100).toFixed(2)
      : 0,
  }))

  return NextResponse.json(rubricasComSaldo)
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
  const parsed = createRubricSchema.safeParse(body)

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

  const existingCategory = await prisma.rubrica.findUnique({
    where: { projetoId_categoria: { projetoId: id, categoria: parsed.data.categoria } },
  })
  if (existingCategory) {
    return NextResponse.json({ error: 'Já existe uma rubrica para esta categoria' }, { status: 409 })
  }

  const allRubricas = await prisma.rubrica.findMany({ where: { projetoId: id } })
  const totalAlocado = allRubricas.reduce((sum, r) => sum + Number(r.valorAlocado), 0)
  if (totalAlocado + parsed.data.valorAlocado > Number(projeto.orcamentoGlobal)) {
    return NextResponse.json({
      error: `Alocação excede o orçamento global. Disponível: ${Number(projeto.orcamentoGlobal) - totalAlocado}`,
    }, { status: 400 })
  }

  const rubrica = await prisma.rubrica.create({
    data: {
      projetoId: id,
      nome: parsed.data.nome,
      categoria: parsed.data.categoria,
      valorAlocado: parsed.data.valorAlocado,
    },
  })

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'Rubrica',
    entityId: rubrica.id,
    action: 'CRIAR',
    newData: { nome: parsed.data.nome, categoria: parsed.data.categoria, valorAlocado: parsed.data.valorAlocado },
  })

  return NextResponse.json(rubrica, { status: 201 })
}

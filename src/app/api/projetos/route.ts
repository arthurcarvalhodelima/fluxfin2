import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { getUserProjectIds } from '@/lib/permissions'
import { z } from 'zod'

const createProjectSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório'),
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional(),
  dataInicio: z.string().datetime(),
  dataTermino: z.string().datetime(),
  orcamentoGlobal: z.number().positive('Orçamento deve ser positivo'),
  equipe: z.array(z.object({
    usuarioId: z.string().uuid(),
    papel: z.enum(['COORDENADOR', 'PESQUISADOR', 'BOLSISTA']),
  })).min(1, 'Equipe deve ter pelo menos 1 membro'),
  rubricas: z.array(z.object({
    nome: z.string().min(1),
    categoria: z.enum([
      'RECURSOS_HUMANOS', 'SERVICOS_TERCEIROS', 'MATERIAIS_CONSUMO',
      'MATERIAIS_PERMANENTES', 'VIAGENS_DIARIAS', 'CUSTOS_ADMINISTRATIVOS',
    ]),
    valorAlocado: z.number().positive(),
  })).optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const skip = (page - 1) * limit

  const userProjectIds = await getUserProjectIds(session.user.id, session.user.papelSistema)
  const where: Record<string, unknown> = { deletedAt: null }

  if (userProjectIds.length > 0) {
    where.id = { in: userProjectIds }
  }

  if (status) {
    where.status = status
  }

  if (search) {
    where.OR = [
      { titulo: { contains: search, mode: 'insensitive' } },
      { codigo: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [projetos, total] = await Promise.all([
    prisma.projeto.findMany({
      where,
      include: {
        equipeProjeto: {
          select: { papel: true, usuario: { select: { id: true, nome: true } } },
        },
        _count: { select: { despesas: true, documentosProjeto: true } },
      },
      skip,
      take: limit,
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.projeto.count({ where }),
  ])

  return NextResponse.json({ projetos, total, page, limit })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem alterar dados' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createProjectSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { codigo, titulo, descricao, dataInicio, dataTermino, orcamentoGlobal, equipe, rubricas } = parsed.data

  const existingCode = await prisma.projeto.findUnique({ where: { codigo } })
  if (existingCode) {
    return NextResponse.json({ error: 'Código do projeto já existe' }, { status: 409 })
  }

  const hasCoordenador = equipe.some(m => m.papel === 'COORDENADOR')
  if (!hasCoordenador) {
    return NextResponse.json({ error: 'Equipe deve ter pelo menos um COORDENADOR' }, { status: 400 })
  }

  if (rubricas && rubricas.length > 0) {
    const totalRubricas = rubricas.reduce((sum, r) => sum + r.valorAlocado, 0)
    if (totalRubricas > orcamentoGlobal) {
      return NextResponse.json({ error: 'Total das rubricas excede o orçamento global' }, { status: 400 })
    }
  }

  try {
    const projeto = await prisma.$transaction(async (tx) => {
      const proj = await tx.projeto.create({
        data: {
          codigo,
          titulo,
          descricao,
          dataInicio: new Date(dataInicio),
          dataTermino: new Date(dataTermino),
          orcamentoGlobal,
        },
      })

      await tx.equipeProjeto.createMany({
        data: equipe.map(m => ({
          projetoId: proj.id,
          usuarioId: m.usuarioId,
          papel: m.papel,
        })),
      })

      if (rubricas && rubricas.length > 0) {
        await tx.rubrica.createMany({
          data: rubricas.map(r => ({
            projetoId: proj.id,
            nome: r.nome,
            categoria: r.categoria,
            valorAlocado: r.valorAlocado,
          })),
        })
      }

      return proj
    })

    await createAuditLog({
      userId: session.user.id,
      projetoId: projeto.id,
      entity: 'Projeto',
      entityId: projeto.id,
      action: 'CRIAR',
      newData: { codigo, titulo, orcamentoGlobal },
    })

    return NextResponse.json(projeto, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Erro ao criar projeto' },
      { status: 500 }
    )
  }
}

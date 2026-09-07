import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserProjectIds } from '@/lib/permissions'
import { maskName } from '@/lib/lgpd'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const categoria = searchParams.get('categoria') || ''
    const projetoId = searchParams.get('projetoId') || ''
    const order = searchParams.get('order') || 'desc'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const skip = (page - 1) * limit

    const userProjectIds = await getUserProjectIds(session.user.id, session.user.papelSistema)

    await prisma.$queryRaw`SELECT 1`

    const where: any = { deletedAt: null }

    if (projetoId) {
      if (userProjectIds !== null && !userProjectIds.includes(projetoId)) {
        return NextResponse.json({ despesas: [], total: 0, page, limit })
      }
      where.projetoId = projetoId
    } else if (userProjectIds !== null) {
      where.projetoId = { in: userProjectIds }
    }

    if (search) {
      where.OR = [
        { descricao: { contains: search, mode: 'insensitive' } },
        { rubrica: { nome: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (categoria) {
      where.rubrica = { categoria }
    }

    const [despesas, total] = await Promise.all([
      prisma.despesa.findMany({
        where,
        include: {
          rubrica: { select: { id: true, nome: true, categoria: true } },
          usuario: { select: { nome: true } },
          projeto: { select: { id: true, codigo: true, titulo: true } },
        },
        orderBy: { dataDespesa: order === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
      prisma.despesa.count({ where }),
    ])

    if (session.user.papelSistema !== 'ADMIN') {
      const masked = despesas.map(d => ({
        ...d,
        usuario: d.usuario ? { ...d.usuario, nome: maskName(d.usuario.nome) } : d.usuario,
      }))
      return NextResponse.json({ despesas: masked, total, page, limit })
    }

    return NextResponse.json({ despesas, total, page, limit })
  } catch (error) {
    console.error('Erro ao buscar despesas:', error)
    return NextResponse.json({ error: 'Erro ao buscar despesas' }, { status: 500 })
  }
}

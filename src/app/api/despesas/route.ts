import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserProjectIds } from '@/lib/permissions'
import { maskName } from '@/lib/lgpd'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const categoria = searchParams.get('categoria') || ''
  const order = searchParams.get('order') || 'desc'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit

  const userProjectIds = await getUserProjectIds(session.user.id, session.user.papelSistema)

  const where: any = {}

  if (userProjectIds.length > 0) {
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
}

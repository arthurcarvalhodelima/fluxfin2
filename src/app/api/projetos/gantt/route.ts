import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserProjectIds } from '@/lib/permissions'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const userProjectIds = await getUserProjectIds(session.user.id, session.user.papelSistema)
  const where: Record<string, unknown> = { deletedAt: null }
  if (userProjectIds.length > 0) {
    where.id = { in: userProjectIds }
  }

  const projetos = await prisma.projeto.findMany({
    where,
    select: {
      id: true,
      codigo: true,
      titulo: true,
      dataInicio: true,
      dataTermino: true,
      status: true,
      progressoFisico: true,
    },
    orderBy: { criadoEm: 'desc' },
    take: 500,
  })

  const data = projetos.map(p => ({
    id: p.id,
    codigo: p.codigo,
    titulo: p.titulo,
    dataInicio: p.dataInicio.toISOString(),
    dataTermino: p.dataTermino.toISOString(),
    status: p.status,
    progresso: Number(p.progressoFisico),
  }))

  return NextResponse.json(data)
}

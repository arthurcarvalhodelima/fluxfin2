import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; rubricaId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id, rubricaId } = await params

  const rubrica = await prisma.rubrica.findFirst({
    where: { id: rubricaId, projetoId: id },
    select: {
      id: true,
      nome: true,
      categoria: true,
      valorAlocado: true,
      valorGasto: true,
    },
  })

  if (!rubrica) {
    return NextResponse.json({ error: 'Rubrica não encontrada' }, { status: 404 })
  }

  const saldo = Number(rubrica.valorAlocado) - Number(rubrica.valorGasto)

  return NextResponse.json({
    ...rubrica,
    saldo,
  })
}

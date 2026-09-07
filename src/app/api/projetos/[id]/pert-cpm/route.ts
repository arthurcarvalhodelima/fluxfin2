import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { checkProjectAccess } from '@/lib/permissions'
import { calcularCaminhoCritico } from '@/lib/pert-cpm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await params

    const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const result = await calcularCaminhoCritico(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao calcular PERT/CPM:', error)
    return NextResponse.json({ error: 'Erro ao calcular PERT/CPM' }, { status: 500 })
  }
}

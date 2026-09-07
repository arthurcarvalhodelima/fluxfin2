import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { checkProjectAccess } from '@/lib/permissions'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; documentoId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem alterar dados' }, { status: 403 })
  }

  const { id, documentoId } = await params

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const existing = await prisma.documentoProjeto.findFirst({
    where: { id: documentoId, projetoId: id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
  }

  await prisma.documentoProjeto.update({
    where: { id: documentoId },
    data: { deletedAt: new Date() },
  })

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'DocumentoProjeto',
    entityId: documentoId,
    action: 'EXCLUIR',
    oldData: { nomeArquivo: existing.nomeArquivo, extensao: existing.extensao },
  })

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { checkProjectAccess } from '@/lib/permissions'
import { maskEmail } from '@/lib/lgpd'
import { z } from 'zod'

const addMemberSchema = z.object({
  usuarioId: z.string().uuid(),
  papel: z.enum(['COORDENADOR', 'PESQUISADOR', 'BOLSISTA']),
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

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const projeto = await prisma.projeto.findUnique({ where: { id } })
  if (!projeto) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  const equipe = await prisma.equipeProjeto.findMany({
    where: { projetoId: id },
    include: {
      usuario: { select: { id: true, nome: true, email: true } },
    },
    orderBy: { criadoEm: 'asc' },
  })

  if (session.user.papelSistema !== 'ADMIN') {
    const masked = equipe.map(e => ({
      ...e,
      usuario: { ...e.usuario, email: maskEmail(e.usuario.email) },
    }))
    return NextResponse.json(masked)
  }

  return NextResponse.json(equipe)
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
  const parsed = addMemberSchema.safeParse(body)

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

  const usuario = await prisma.usuario.findUnique({ where: { id: parsed.data.usuarioId } })
  if (!usuario || !usuario.ativo) {
    return NextResponse.json({ error: 'Usuário não encontrado ou inativo' }, { status: 404 })
  }

  const existing = await prisma.equipeProjeto.findUnique({
    where: { projetoId_usuarioId: { projetoId: id, usuarioId: parsed.data.usuarioId } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Usuário já faz parte da equipe' }, { status: 409 })
  }

  const equipe = await prisma.$transaction(async (tx) => {
    const member = await tx.equipeProjeto.create({
      data: {
        projetoId: id,
        usuarioId: parsed.data.usuarioId,
        papel: parsed.data.papel,
      },
    })

    const allMembers = await tx.equipeProjeto.findMany({ where: { projetoId: id } })
    const hasCoordenador = allMembers.some(m => m.papel === 'COORDENADOR')

    if (!hasCoordenador) {
      throw new Error('A equipe deve ter pelo menos um COORDENADOR')
    }

    return member
  })

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'EquipeProjeto',
    entityId: equipe.id,
    action: 'ADICIONAR_MEMBRO',
    newData: { usuarioId: parsed.data.usuarioId, papel: parsed.data.papel },
  })

  return NextResponse.json(equipe, { status: 201 })
}

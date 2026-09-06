import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { maskEmail, maskName } from '@/lib/lgpd'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const updateUserSchema = z.object({
  nome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(6).optional(),
  papelSistema: z.enum(['ADMIN', 'USUARIO']).optional(),
  ativo: z.boolean().optional(),
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

  const usuario = await prisma.usuario.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      nome: true,
      email: true,
      papelSistema: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
      equipeProjeto: {
        select: {
          papel: true,
          projeto: { select: { id: true, codigo: true, titulo: true } },
        },
      },
    },
  })

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    const { equipeProjeto, ...rest } = usuario
    return NextResponse.json({ ...rest, nome: maskName(usuario.nome), email: maskEmail(usuario.email) })
  }

  return NextResponse.json(usuario)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem editar usuários' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = updateUserSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.usuario.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (data.senha) {
    data.senha = await bcrypt.hash(data.senha as string, 12)
  }

  if (data.email && data.email !== existing.email) {
    const emailExists = await prisma.usuario.findUnique({ where: { email: data.email as string } })
    if (emailExists) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }
  }

  const usuario = await prisma.usuario.update({ where: { id }, data })

  await createAuditLog({
    userId: session.user.id,
    entity: 'Usuario',
    entityId: id,
    action: 'ATUALIZAR',
    oldData: { nome: existing.nome, email: existing.email, papelSistema: existing.papelSistema, ativo: existing.ativo },
    newData: { nome: usuario.nome, email: usuario.email, papelSistema: usuario.papelSistema, ativo: usuario.ativo },
  })

  return NextResponse.json({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papelSistema: usuario.papelSistema,
    ativo: usuario.ativo,
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem desativar usuários' }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.usuario.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const usuario = await prisma.usuario.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await createAuditLog({
    userId: session.user.id,
    entity: 'Usuario',
    entityId: id,
    action: 'EXCLUIR',
    oldData: { nome: existing.nome, email: existing.email, ativo: existing.ativo },
    newData: { deletedAt: new Date().toISOString() },
  })

  return NextResponse.json({ id: usuario.id, ativo: false })
}

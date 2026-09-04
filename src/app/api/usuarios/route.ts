import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createUserSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  papelSistema: z.enum(['ADMIN', 'USUARIO']).optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const [usuarios, total] = await Promise.all([
    prisma.usuario.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        email: true,
        papelSistema: true,
        ativo: true,
        criadoEm: true,
      },
      skip,
      take: limit,
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.usuario.count({ where: { ativo: true } }),
  ])

  return NextResponse.json({ usuarios, total, page, limit })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem criar usuários' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createUserSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { nome, email, senha, papelSistema } = parsed.data

  const existing = await prisma.usuario.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(senha, 12)

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senha: hashedPassword,
      papelSistema: papelSistema ?? 'USUARIO',
    },
  })

  await createAuditLog({
    userId: session.user.id,
    entity: 'Usuario',
    entityId: usuario.id,
    action: 'CRIAR',
    newData: { nome, email, papelSistema: usuario.papelSistema },
  })

  return NextResponse.json({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papelSistema: usuario.papelSistema,
    ativo: usuario.ativo,
    criadoEm: usuario.criadoEm,
  }, { status: 201 })
}

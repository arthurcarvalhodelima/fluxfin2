import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  papelSistema: z.enum(['ADMIN', 'USUARIO']).default('USUARIO'),
})

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (session.user.papelSistema !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await request.json()
  const result = registerSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { nome, email, senha, papelSistema } = result.data

  const existingUser = await prisma.usuario.findUnique({
    where: { email },
  })

  if (existingUser) {
    return NextResponse.json(
      { error: 'Email já cadastrado' },
      { status: 409 }
    )
  }

  const hashedPassword = await bcrypt.hash(senha, 12)

  const user = await prisma.usuario.create({
    data: {
      nome,
      email,
      senha: hashedPassword,
      papelSistema,
    },
  })

  return NextResponse.json(
    {
      id: user.id,
      nome: user.nome,
      email: user.email,
      papelSistema: user.papelSistema,
    },
    { status: 201 }
  )
}

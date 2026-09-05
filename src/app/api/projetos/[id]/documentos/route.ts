import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { checkProjectAccess } from '@/lib/permissions'
import { z } from 'zod'

const ALLOWED_EXTENSIONS = ['pdf', 'xlsx', 'xls', 'doc', 'docx']

const createDocumentSchema = z.object({
  nomeArquivo: z.string().min(1, 'Nome do arquivo é obrigatório'),
  extensao: z.string().min(1, 'Extensão é obrigatória'),
  urlArmazenamento: z.string().url('URL inválida'),
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

  const projeto = await prisma.projeto.findUnique({ where: { id } })
  if (!projeto) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  const documentos = await prisma.documentoProjeto.findMany({
    where: { projetoId: id },
    include: {
      usuario: { select: { id: true, nome: true } },
    },
    orderBy: { dataUpload: 'desc' },
  })

  return NextResponse.json(documentos)
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
  const parsed = createDocumentSchema.safeParse(body)

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

  const ext = parsed.data.extensao.toLowerCase().replace('.', '')
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({
      error: `Extensão não permitida. Permitidas: ${ALLOWED_EXTENSIONS.join(', ')}`,
    }, { status: 400 })
  }

  const documento = await prisma.documentoProjeto.create({
    data: {
      projetoId: id,
      usuarioId: session.user.id,
      nomeArquivo: parsed.data.nomeArquivo,
      extensao: ext,
      urlArmazenamento: parsed.data.urlArmazenamento,
    },
  })

  await createAuditLog({
    userId: session.user.id,
    projetoId: id,
    entity: 'DocumentoProjeto',
    entityId: documento.id,
    action: 'CRIAR',
    newData: { nomeArquivo: parsed.data.nomeArquivo, extensao: ext },
  })

  return NextResponse.json(documento, { status: 201 })
}

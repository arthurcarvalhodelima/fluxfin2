import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { checkProjectAccess } from '@/lib/permissions'

const ALLOWED_EXTENSIONS = ['pdf', 'xlsx', 'xls', 'doc', 'docx']
const MAX_FILE_SIZE = 10 * 1024 * 1024

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

  if (session.user.papelSistema !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem alterar dados' }, { status: 403 })
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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const file = formData.get('file') as File | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 10MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({
      error: `Extensão não permitida. Permitidas: ${ALLOWED_EXTENSIONS.join(', ')}`,
    }, { status: 400 })
  }

  try {
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const documento = await prisma.documentoProjeto.create({
      data: {
        projetoId: id,
        usuarioId: session.user.id,
        nomeArquivo: file.name,
        extensao: ext,
        urlArmazenamento: `data:${file.type};base64,${base64}`,
      },
    })

    await createAuditLog({
      userId: session.user.id,
      projetoId: id,
      entity: 'DocumentoProjeto',
      entityId: documento.id,
      action: 'CRIAR',
      newData: { nomeArquivo: file.name, extensao: ext },
    })

    return NextResponse.json({
      id: documento.id,
      nomeArquivo: documento.nomeArquivo,
      extensao: documento.extensao,
      dataUpload: documento.dataUpload,
      urlArmazenamento: documento.urlArmazenamento,
      usuario: { id: session.user.id, nome: session.user.nome },
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: `Erro ao salvar arquivo: ${(err as Error).message}` }, { status: 500 })
  }
}

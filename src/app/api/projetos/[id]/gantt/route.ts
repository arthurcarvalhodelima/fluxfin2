import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.papelSistema);
  if (!hasAccess) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const projeto = await prisma.projeto.findUnique({
    where: { id },
    select: {
      id: true,
      codigo: true,
      titulo: true,
      dataInicio: true,
      dataTermino: true,
      status: true,
      progressoFisico: true,
    },
  });

  if (!projeto) {
    return NextResponse.json(
      { error: "Projeto não encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: projeto.id,
    codigo: projeto.codigo,
    titulo: projeto.titulo,
    dataInicio: projeto.dataInicio.toISOString(),
    dataTermino: projeto.dataTermino.toISOString(),
    status: projeto.status,
    progresso: Number(projeto.progressoFisico),
  });
}

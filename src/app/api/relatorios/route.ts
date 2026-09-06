import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkProjectAccess } from '@/lib/permissions'
import { maskEmail } from '@/lib/lgpd'
import { z } from 'zod'

const categoriaLabels: Record<string, string> = {
  RECURSOS_HUMANOS: "Recursos Humanos",
  SERVICOS_TERCEIROS: "Serviços de Terceiros",
  MATERIAIS_CONSUMO: "Materiais de Consumo",
  MATERIAIS_PERMANENTES: "Materiais Permanentes",
  VIAGENS_DIARIAS: "Viagens e Diárias",
  CUSTOS_ADMINISTRATIVOS: "Custos Administrativos",
}

const reportSchema = z.object({
  projetoId: z.string().uuid('ID do projeto inválido'),
  tipo: z.enum(['RESUMO', 'ORCAMENTO', 'DESPESAS', 'EQUIPE', 'COMPLETO']).optional().default('COMPLETO'),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = reportSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const hasAccess = await checkProjectAccess(parsed.data.projetoId, session.user.id, session.user.papelSistema)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const tipo = parsed.data.tipo

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const includeOptions: any = {
    equipeProjeto: {
      include: { usuario: { select: { id: true, nome: true, email: true } } },
    },
    rubricas: true,
    despesas: {
      where: { status: { in: ['APROVADA', 'PAGA'] } },
      include: {
        rubrica: { select: { id: true, nome: true, categoria: true } },
        usuario: { select: { nome: true } },
      },
      orderBy: { dataDespesa: 'asc' as const },
    },
    documentosProjeto: {
      include: { usuario: { select: { nome: true } } },
    },
    milestones: { orderBy: { dataPrevista: 'asc' as const } },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projeto: any = await prisma.projeto.findUnique({
    where: { id: parsed.data.projetoId },
    include: includeOptions,
  })

  if (!projeto) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  const totalGasto = (projeto.despesas as any[]).reduce((sum: number, d: any) => sum + Number(d.valor), 0)
  const orcamentoTotal = Number(projeto.orcamentoGlobal)
  const saldo = orcamentoTotal - totalGasto

  const breakdownRubricas = projeto.rubricas.map((r: any) => {
    const gastoNaRubrica = projeto.despesas
      .filter((d: any) => d.rubricaId === r.id)
      .reduce((sum: number, d: any) => sum + Number(d.valor), 0)

    return {
      nome: r.nome,
      categoria: categoriaLabels[r.categoria] || r.categoria,
      valorAlocado: Number(r.valorAlocado),
      valorGasto: gastoNaRubrica,
      saldo: Number(r.valorAlocado) - gastoNaRubrica,
      percentualExecutado: Number(r.valorAlocado) > 0
        ? (gastoNaRubrica / Number(r.valorAlocado) * 100).toFixed(2)
        : '0.00',
    }
  })

  const despesasPorMes: Record<string, number> = {}
  for (const despesa of projeto.despesas as any[]) {
    const mes = new Date(despesa.dataDespesa).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    despesasPorMes[mes] = (despesasPorMes[mes] || 0) + Number(despesa.valor)
  }
  const timelineDespesas = Object.entries(despesasPorMes).map(([mes, valor]) => ({ mes, valor }))

  const cpi = totalGasto > 0 ? orcamentoTotal / totalGasto : 0

  const reportData: Record<string, unknown> = {
    geradoEm: new Date().toISOString(),
    geradoPor: session.user.nome,
    tipo,
    projeto: {
      id: projeto.id,
      codigo: projeto.codigo,
      titulo: projeto.titulo,
      descricao: projeto.descricao,
      dataInicio: projeto.dataInicio,
      dataTermino: projeto.dataTermino,
      status: projeto.status,
      progressoFisico: Number(projeto.progressoFisico),
    },
  }

  if (tipo === 'RESUMO' || tipo === 'COMPLETO') {
    reportData.resumoFinanceiro = {
      orcamentoTotal,
      totalGasto,
      saldo,
      percentualExecutado: orcamentoTotal > 0 ? (totalGasto / orcamentoTotal * 100).toFixed(2) : '0.00',
      cpi: Math.round(cpi * 100) / 100,
    }
  }

  if (tipo === 'ORCAMENTO' || tipo === 'COMPLETO') {
    reportData.breakdownRubricas = breakdownRubricas
    reportData.timelineDespesas = timelineDespesas
  }

  if (tipo === 'DESPESAS' || tipo === 'COMPLETO') {
    reportData.despesas = (projeto.despesas as any[]).map((d: any) => ({
      descricao: d.descricao,
      valor: Number(d.valor),
      dataDespesa: d.dataDespesa,
      status: d.status,
      rubrica: d.rubrica.nome,
      categoria: categoriaLabels[d.rubrica.categoria] || d.rubrica.categoria,
      responsavel: d.usuario.nome,
    }))
    reportData.timelineDespesas = timelineDespesas
    reportData.totalDespesas = projeto.despesas.length
  }

  if (tipo === 'EQUIPE' || tipo === 'COMPLETO') {
    reportData.equipe = (projeto.equipeProjeto as any[]).map((e: any) => ({
      nome: e.usuario.nome,
      email: session.user.papelSistema !== 'ADMIN' ? maskEmail(e.usuario.email) : e.usuario.email,
      papel: e.papel,
    }))
  }

  if (tipo === 'COMPLETO') {
    reportData.documentos = (projeto.documentosProjeto as any[]).map((d: any) => ({
      nome: d.nomeArquivo,
      extensao: d.extensao,
      dataUpload: d.dataUpload,
      autor: d.usuario.nome,
    }))
    reportData.milestones = (projeto.milestones as any[]).map((m: any) => ({
      nome: m.nome,
      descricao: m.descricao,
      dataPrevista: m.dataPrevista,
      dataExecucao: m.dataExecucao,
      percentualPrevisto: Number(m.percentualPrevisto),
      concluido: m.dataExecucao !== null,
    }))
  }

  return NextResponse.json(reportData)
}

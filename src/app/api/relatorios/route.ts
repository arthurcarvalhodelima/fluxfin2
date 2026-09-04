import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reportSchema = z.object({
  projetoId: z.string().uuid('ID do projeto inválido'),
  tipo: z.enum(['RESUMO', 'DETALHADO']).optional(),
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

  const projeto = await prisma.projeto.findUnique({
    where: { id: parsed.data.projetoId },
    include: {
      equipeProjeto: {
        include: { usuario: { select: { id: true, nome: true, email: true } } },
      },
      rubricas: true,
      despesas: {
        where: { status: { in: ['APROVADA', 'PAGA'] } },
        include: {
          rubrica: { select: { nome: true, categoria: true } },
          usuario: { select: { nome: true } },
        },
        orderBy: { dataDespesa: 'asc' },
      },
      documentosProjeto: {
        include: { usuario: { select: { nome: true } } },
      },
      milestones: { orderBy: { dataPrevista: 'asc' } },
    },
  })

  if (!projeto) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  const totalGasto = projeto.despesas.reduce((sum, d) => sum + Number(d.valor), 0)
  const orcamentoTotal = Number(projeto.orcamentoGlobal)
  const saldo = orcamentoTotal - totalGasto

  const breakdownRubricas = projeto.rubricas.map(r => {
    const gastoNaRubrica = projeto.despesas
      .filter(d => d.rubricaId === r.id)
      .reduce((sum, d) => sum + Number(d.valor), 0)

    return {
      nome: r.nome,
      categoria: r.categoria,
      valorAlocado: Number(r.valorAlocado),
      valorGasto: gastoNaRubrica,
      saldo: Number(r.valorAlocado) - gastoNaRubrica,
      percentualExecutado: Number(r.valorAlocado) > 0
        ? (gastoNaRubrica / Number(r.valorAlocado) * 100).toFixed(2)
        : '0.00',
    }
  })

  const despesasPorMes: Record<string, number> = {}
  for (const despesa of projeto.despesas) {
    const mes = new Date(despesa.dataDespesa).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    despesasPorMes[mes] = (despesasPorMes[mes] || 0) + Number(despesa.valor)
  }

  const timelineDespesas = Object.entries(despesasPorMes).map(([mes, valor]) => ({ mes, valor }))

  const cpi = totalGasto > 0 ? orcamentoTotal / totalGasto : 0

  const reportData = {
    geradoEm: new Date().toISOString(),
    geradoPor: session.user.nome,
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
    resumoFinanceiro: {
      orcamentoTotal,
      totalGasto,
      saldo,
      percentualExecutado: orcamentoTotal > 0 ? (totalGasto / orcamentoTotal * 100).toFixed(2) : '0.00',
      cpi: Math.round(cpi * 100) / 100,
    },
    breakdownRubricas,
    timelineDespesas,
    equipe: projeto.equipeProjeto.map(e => ({
      nome: e.usuario.nome,
      email: e.usuario.email,
      papel: e.papel,
    })),
    documentos: projeto.documentosProjeto.map(d => ({
      nome: d.nomeArquivo,
      extensao: d.extensao,
      dataUpload: d.dataUpload,
      autor: d.usuario.nome,
    })),
    milestones: projeto.milestones.map(m => ({
      nome: m.nome,
      descricao: m.descricao,
      dataPrevista: m.dataPrevista,
      dataExecucao: m.dataExecucao,
      percentualPrevisto: Number(m.percentualPrevisto),
      concluido: m.dataExecucao !== null,
    })),
    totalDespesas: projeto.despesas.length,
  }

  return NextResponse.json(reportData)
}

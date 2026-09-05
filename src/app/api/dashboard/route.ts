import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserProjectIds } from '@/lib/permissions'
import { calculateCPI, calculateSPI, calculateEAC, calculateETC, calculateVAC, calculateTCPI } from '@/lib/evm'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const userProjectIds = await getUserProjectIds(session.user.id, session.user.papelSistema)
  const projectFilter = userProjectIds.length > 0 ? { id: { in: userProjectIds }, deletedAt: null } : { deletedAt: null }

  const [
    totalProjetos,
    projetosAtivos,
    projetosPorStatus,
    projetos,
    allDespesas,
    projetosConcluidos,
  ] = await Promise.all([
    prisma.projeto.count({ where: projectFilter }),
    prisma.projeto.count({ where: { ...projectFilter, status: 'ATIVO' } }),
    prisma.projeto.groupBy({ by: ['status'], where: projectFilter, _count: true }),
    prisma.projeto.findMany({
      where: projectFilter,
      select: {
        id: true,
        orcamentoGlobal: true,
        dataInicio: true,
        dataTermino: true,
        progressoFisico: true,
        status: true,
      },
    }),
    prisma.despesa.findMany({
      where: {
        status: { in: ['APROVADA', 'PAGA'] },
        ...(userProjectIds.length > 0 ? { projetoId: { in: userProjectIds } } : {}),
      },
      select: {
        valor: true,
        dataDespesa: true,
        projetoId: true,
        rubrica: { select: { categoria: true } },
      },
    }),
    prisma.projeto.findMany({
      where: { ...projectFilter, status: 'CONCLUIDO' },
      select: { id: true, orcamentoGlobal: true, dataTermino: true },
    }),
  ])

  const totalOrcamento = projetos.reduce((sum, p) => sum + Number(p.orcamentoGlobal), 0)
  const totalGasto = allDespesas.reduce((sum, d) => sum + Number(d.valor), 0)

  const projetosAtivosList = projetos.filter(p => p.status === 'ATIVO')
  const agora = new Date()

  const fluxoCaixa: { mes: string; entradas: number; saidas: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const mesRef = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    const mesFim = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0)
    const mesLabel = mesRef.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })

    const despesasMes = allDespesas
      .filter(d => {
        const data = new Date(d.dataDespesa)
        return data >= mesRef && data <= mesFim
      })
      .reduce((sum, d) => sum + Number(d.valor), 0)

    const orcamentosAtivosMes = projetosAtivosList
      .filter(p => {
        const inicio = new Date(p.dataInicio)
        return inicio <= mesFim
      })
      .reduce((sum, p) => sum + Number(p.orcamentoGlobal) / 12, 0)

    fluxoCaixa.push({
      mes: mesLabel,
      entradas: Math.round(orcamentosAtivosMes * 100) / 100,
      saidas: despesasMes,
    })
  }

  const burndown: { dia: string; previsto: number; real: number }[] = []
  const projetosComDatas = projetosAtivosList.filter(p => p.dataInicio && p.dataTermino)
  if (projetosComDatas.length > 0) {
    const duracaoTotal = projetosComDatas.reduce((sum, p) => {
      const inicio = new Date(p.dataInicio).getTime()
      const termino = new Date(p.dataTermino).getTime()
      return sum + (termino - inicio)
    }, 0)
    const mediaDuracao = duracaoTotal / projetosComDatas.length

    for (let i = 4; i >= 0; i--) {
      const dia = new Date(agora.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const progressoMedio = projetosAtivosList.reduce((sum, p) => sum + Number(p.progressoFisico), 0) / Math.max(projetosAtivosList.length, 1)
      const diasPassados = (agora.getTime() - new Date(projetosAtivosList[0]?.dataInicio ?? agora).getTime()) / (24 * 60 * 60 * 1000)

      burndown.push({
        dia: dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        previsto: Math.min((diasPassados / (mediaDuracao / (24 * 60 * 60 * 1000))) * 100, 100),
        real: progressoMedio,
      })
    }
  }

  let totalPV = 0
  let totalEV = 0
  const totalBAC = projetos.reduce((sum, p) => sum + Number(p.orcamentoGlobal), 0)

  for (const p of projetosAtivosList) {
    const inicio = new Date(p.dataInicio).getTime()
    const termino = new Date(p.dataTermino).getTime()
    const agoraMs = agora.getTime()
    const duracaoTotal = termino - inicio
    const tempoDecorrido = Math.min(Math.max(agoraMs - inicio, 0), duracaoTotal)
    const pv = duracaoTotal > 0 ? (tempoDecorrido / duracaoTotal) * Number(p.orcamentoGlobal) : 0
    const ev = (Number(p.progressoFisico) / 100) * Number(p.orcamentoGlobal)
    totalPV += pv
    totalEV += ev
  }
  const totalAC = totalGasto

  const cpi = calculateCPI(totalEV, totalAC)
  const spi = calculateSPI(totalEV, totalPV)
  const eac = calculateEAC(totalBAC, cpi)
  const etc = calculateETC(totalBAC, totalEV, cpi)
  const vac = calculateVAC(totalBAC, eac)
  const tcpi = calculateTCPI(totalBAC, totalEV, totalAC)

  return NextResponse.json({
    totalProjetos,
    projetosAtivos,
    projetosPorStatus: projetosPorStatus.map(s => ({ status: s.status, count: s._count })),
    totalOrcamento,
    totalGasto,
    saldoDisponivel: totalOrcamento - totalGasto,
    percentualExecutado: totalOrcamento > 0 ? (totalGasto / totalOrcamento * 100).toFixed(2) : 0,
    fluxoCaixa,
    burndown,
    cpi,
    projetosConcluidos: projetosConcluidos.length,
    despesasPorCategoria: allDespesas.reduce((acc, d) => {
      const cat = d.rubrica.categoria
      acc[cat] = (acc[cat] || 0) + Number(d.valor)
      return acc
    }, {} as Record<string, number>),
    evm: {
      cpi,
      spi,
      eac,
      etc,
      vac,
      tcpi,
      pv: Math.round(totalPV * 100) / 100,
      ev: Math.round(totalEV * 100) / 100,
      ac: totalAC,
    },
  })
}

import { prisma } from "@/lib/prisma";
import GanttChart from "@/components/GanttChart";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const projetos = await prisma.projeto.findMany({
    where: { deletedAt: null },
    orderBy: { criadoEm: "desc" },
    take: 500,
  });

  const projects = projetos.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    titulo: p.titulo,
    dataInicio: p.dataInicio.toISOString(),
    dataTermino: p.dataTermino.toISOString(),
    status: p.status,
    progresso: Number(p.progressoFisico) ?? 0,
  }));

  const total = projects.length;
  const active = projects.filter((p) => p.status === "ATIVO").length;
  const completed = projects.filter((p) => p.status === "CONCLUIDO").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Portfolio de Projetos - Gantt</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="fluxfin-card text-center">
          <p className="text-sm text-muted">Total de Projetos</p>
          <p className="text-3xl font-bold text-foreground mt-1">{total}</p>
        </div>
        <div className="fluxfin-card text-center">
          <p className="text-sm text-muted">Ativos</p>
          <p className="text-3xl font-bold text-primary-dark mt-1">{active}</p>
        </div>
        <div className="fluxfin-card text-center">
          <p className="text-sm text-muted">Concluidos</p>
          <p className="text-3xl font-bold text-success mt-1">{completed}</p>
        </div>
      </div>

      <GanttChart projects={projects} />
    </div>
  );
}

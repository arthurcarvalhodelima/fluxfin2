"use client";

import { useEffect, useState } from "react";
import GanttChart from "@/components/GanttChart";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ProjectData {
  id: string;
  codigo: string;
  titulo: string;
  dataInicio: string;
  dataTermino: string;
  status: string;
  progresso: number;
}

export default function PortfolioPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projetos")
      .then((res) => res.json())
      .then((json) => {
        const mapped = (json.projetos || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          codigo: p.codigo as string,
          titulo: p.titulo as string,
          dataInicio: p.dataInicio as string,
          dataTermino: p.dataTermino as string,
          status: p.status as string,
          progresso: (p.progressoFisico as number) ?? 0,
        }));
        setProjects(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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

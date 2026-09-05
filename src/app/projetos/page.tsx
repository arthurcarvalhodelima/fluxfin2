"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DataTable, { Column } from "@/components/DataTable";
import Badge from "@/components/Badge";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Projeto {
  id: string;
  codigo: string;
  titulo: string;
  status: string;
  orcamentoGlobal: number;
  dataInicio: string;
  dataTermino: string;
  progressoFisico: number;
}

const statusVariants: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  ATIVO: "success",
  CONCLUIDO: "info",
  SUSPENSO: "warning",
  CANCELADO: "danger",
};

export default function ProjetosPage() {
  const router = useRouter();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);

    fetch(`/api/projetos?${params}`)
      .then((res) => res.json())
      .then((json) => {
        setProjetos(json.projetos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  const columns: Column<Projeto>[] = [
    { key: "codigo", header: "Codigo", sortable: true },
    { key: "titulo", header: "Titulo", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <Badge variant={statusVariants[item.status] || "default"}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: "orcamentoGlobal",
      header: "Orcamento",
      sortable: true,
      render: (item) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
          item.orcamentoGlobal
        ),
    },
    {
      key: "dataInicio",
      header: "Data Inicio",
      render: (item) =>
        item.dataInicio
          ? new Date(item.dataInicio).toLocaleDateString("pt-BR")
          : "-",
    },
    {
      key: "dataTermino",
      header: "Data Termino",
      render: (item) =>
        item.dataTermino
          ? new Date(item.dataTermino).toLocaleDateString("pt-BR")
          : "-",
    },
    {
      key: "progressoFisico",
      header: "Progresso",
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${item.progressoFisico}%` }}
            />
          </div>
          <span className="text-sm text-muted">{item.progressoFisico}%</span>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Projetos</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/projetos/portfolio")}
            className="fluxfin-btn-secondary"
          >
            Ver Gantt
          </button>
          <button
            onClick={() => router.push("/projetos/novo")}
            className="fluxfin-btn-primary"
          >
            Novo Projeto
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="fluxfin-input w-auto"
        >
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="CONCLUIDO">Concluido</option>
          <option value="SUSPENSO">Suspenso</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      <DataTable
        data={projetos}
        columns={columns}
        searchPlaceholder="Buscar por codigo ou titulo..."
        onRowClick={(item) => router.push(`/projetos/${item.id}`)}
      />
    </div>
  );
}

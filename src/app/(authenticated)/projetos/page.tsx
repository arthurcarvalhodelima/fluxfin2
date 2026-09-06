"use client";

import { useEffect, useState, useRef } from "react";
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

const statusOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "SUSPENSO", label: "Suspenso" },
  { value: "CANCELADO", label: "Cancelado" },
];

function StatusDropdown({ projeto, onStatusChange }: { projeto: Projeto; onStatusChange: (id: string, status: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="cursor-pointer"
      >
        <Badge variant={statusVariants[projeto.status] || "default"}>
          {projeto.status}
        </Badge>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                if (opt.value !== projeto.status) {
                  onStatusChange(projeto.id, opt.value);
                }
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-hover transition-colors ${
                opt.value === projeto.status ? "font-semibold text-primary" : "text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

  async function handleStatusChange(id: string, newStatus: string) {
    setProjetos((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
    try {
      await fetch(`/api/projetos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/projetos?${params}`);
      const json = await res.json();
      setProjetos(json.projetos || []);
    }
  }

  const columns: Column<Projeto>[] = [
    { key: "codigo", header: "Código", sortable: true },
    { key: "titulo", header: "Título", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusDropdown projeto={item} onStatusChange={handleStatusChange} />
      ),
    },
    {
      key: "orcamentoGlobal",
      header: "Orçamento",
      sortable: true,
      render: (item) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
          item.orcamentoGlobal
        ),
    },
    {
      key: "dataInicio",
      header: "Data Início",
      render: (item) =>
        item.dataInicio
          ? new Date(item.dataInicio).toLocaleDateString("pt-BR")
          : "-",
    },
    {
      key: "dataTermino",
      header: "Data Término",
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
          <option value="CONCLUIDO">Concluído</option>
          <option value="SUSPENSO">Suspenso</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      <DataTable
        data={projetos}
        columns={columns}
        searchPlaceholder="Buscar por código ou título..."
        onRowClick={(item) => router.push(`/projetos/${item.id}`)}
      />
    </div>
  );
}

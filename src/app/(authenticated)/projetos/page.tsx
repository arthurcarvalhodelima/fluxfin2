"use client";

import { useEffect, useState, useRef, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Badge from "@/components/Badge";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProjetoDetailPage from "@/app/(authenticated)/projetos/[id]/page";

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
  const { data: session } = useSession();
  const isAdmin = session?.user?.papelSistema === "ADMIN";
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("limit", "1000");

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

  const filtered = useMemo(() => {
    let result = projetos;
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((p) =>
        p.codigo.toLowerCase().includes(lower) || p.titulo.toLowerCase().includes(lower)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[sortKey] ?? "";
        const bVal = (b as unknown as Record<string, unknown>)[sortKey] ?? "";
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [projetos, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function toggleExpand(id: string) {
    setExpandedProjectId(expandedProjectId === id ? null : id);
  }

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

      <div className="fluxfin-card">
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por código ou título..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="fluxfin-input"
              style={{ paddingLeft: "2.5rem" }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="fluxfin-table">
            <thead>
              <tr>
                {[
                  { key: "codigo", label: "Código", sortable: true },
                  { key: "titulo", label: "Título", sortable: true },
                  { key: "status", label: "Status", sortable: true },
                  { key: "orcamentoGlobal", label: "Orçamento", sortable: true },
                  { key: "dataInicio", label: "Data Início", sortable: false },
                  { key: "dataTermino", label: "Data Término", sortable: false },
                  { key: "progressoFisico", label: "Progresso", sortable: true },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 ${col.sortable ? "cursor-pointer select-none hover:text-primary-dark" : ""}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        <svg className={`w-4 h-4 ${sortDir === "asc" ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted">
                    Nenhum projeto encontrado
                  </td>
                </tr>
              ) : (
                paginated.map((projeto) => (
                  <Fragment key={projeto.id}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        expandedProjectId === projeto.id ? "bg-surface-hover" : "hover:bg-surface-hover"
                      }`}
                      onClick={() => toggleExpand(projeto.id)}
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <svg className={`w-4 h-4 text-muted transition-transform ${expandedProjectId === projeto.id ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          {projeto.codigo}
                        </div>
                      </td>
                      <td className="px-4 py-3">{projeto.titulo}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <StatusDropdown projeto={projeto} onStatusChange={handleStatusChange} />
                        ) : (
                          <Badge variant={statusVariants[projeto.status] || "default"}>{projeto.status}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(projeto.orcamentoGlobal)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {projeto.dataInicio ? new Date(projeto.dataInicio).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {projeto.dataTermino ? new Date(projeto.dataTermino).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${projeto.progressoFisico}%` }} />
                          </div>
                          <span className="text-sm text-muted">{projeto.progressoFisico}%</span>
                        </div>
                      </td>
                    </tr>
                    {expandedProjectId === projeto.id && (
                      <tr>
                        <td colSpan={7} className="p-0 border-t border-border bg-surface">
                          <div className="p-6">
                            <ProjetoDetailPage id={projeto.id} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted">
              Mostrando {(page - 1) * perPage + 1} a {Math.min(page * perPage, filtered.length)} de {filtered.length} registros
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="fluxfin-btn-ghost text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Anterior
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${pageNum === page ? "bg-primary text-white" : "hover:bg-surface-hover"}`}>
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="fluxfin-btn-ghost text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Proximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

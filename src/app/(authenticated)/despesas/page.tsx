"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import Badge from "@/components/Badge";
import DespesasRelatorioPreview from "@/components/DespesasRelatorioPreview";
import { maskName } from "@/lib/lgpd";

interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataDespesa: string;
  status: string;
  rubrica: { id: string; nome: string; categoria: string };
  usuario: { nome: string };
  projeto: { id: string; codigo: string; titulo: string };
}

const categoriaLabels: Record<string, string> = {
  RECURSOS_HUMANOS: "Recursos Humanos (RH)",
  SERVICOS_TERCEIROS: "Serviços de Terceiros",
  MATERIAIS_CONSUMO: "Materiais de Consumo",
  MATERIAIS_PERMANENTES: "Materiais Permanentes e Equipamentos",
  VIAGENS_DIARIAS: "Viagens e Diárias",
  CUSTOS_ADMINISTRATIVOS: "Custos Administrativos",
};

const statusVariants: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  APROVADA: "info",
  PAGA: "success",
  PENDENTE: "warning",
  REJEITADA: "danger",
};

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projetoId, setProjetoId] = useState("");
  const [projetos, setProjetos] = useState<{ id: string; codigo: string; titulo: string }[]>([]);
  const [categoria, setCategoria] = useState("");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/projetos?limit=1000")
      .then((r) => r.ok ? r.json() : { projetos: [] })
      .then((json) => setProjetos(json.projetos || []))
      .catch(() => setProjetos([]));
  }, []);

  const fetchDespesas = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (projetoId) params.set("projetoId", projetoId);
    if (categoria) params.set("categoria", categoria);
    params.set("order", order);
    params.set("page", String(page));
    params.set("limit", String(limit));

    try {
      const res = await fetch(`/api/despesas?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setDespesas(json.despesas || []);
      setTotal(json.total || 0);
    } catch {
      setDespesas([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, projetoId, categoria, order, page, limit]);

  useEffect(() => {
    fetchDespesas();
  }, [fetchDespesas]);

  function handleSearch(value: string) {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
        <p className="text-muted mt-1">
          Visualize todas as despesas de todos os projetos
        </p>
      </div>

      <div className="fluxfin-card">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Pesquisar por descrição..."
            onChange={(e) => handleSearch(e.target.value)}
            className="fluxfin-input"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select
            value={projetoId}
            onChange={(e) => { setProjetoId(e.target.value); setPage(1); }}
            className="fluxfin-input"
          >
            <option value="">Todos os projetos</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo} - {p.titulo}</option>
            ))}
          </select>
          <select
            value={categoria}
            onChange={(e) => { setCategoria(e.target.value); setPage(1); }}
            className="fluxfin-input"
          >
            <option value="">Todas as categorias</option>
            {Object.entries(categoriaLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => setOrder(order === "desc" ? "asc" : "desc")}
            className="fluxfin-btn-secondary flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={order === "desc" ? "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" : "M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"} />
            </svg>
            Data {order === "desc" ? "Recente" : "Antiga"}
          </button>
          <button
            onClick={() => setShowReport(true)}
            disabled={despesas.length === 0}
            className="fluxfin-btn-primary flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Emitir Relatório
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : despesas.length === 0 ? (
          <p className="text-muted text-center py-12">Nenhuma despesa encontrada</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="fluxfin-table">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Projeto</th>
                    <th className="px-4 py-3">Rubrica</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {despesas.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3 font-medium">{d.descricao}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-muted">{d.projeto.codigo}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{d.rubrica.nome}</td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {categoriaLabels[d.rubrica.categoria] || d.rubrica.categoria}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(d.valor))}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {new Date(d.dataDespesa).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariants[d.status] || "default"}>
                          {d.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{maskName(d.usuario.nome)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted">
                  {total} despesa(s) encontrada(s)
                </p>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="fluxfin-input w-auto text-sm"
                >
                  <option value={10}>10 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="fluxfin-btn-secondary disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-muted px-2">
                  {page} / {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="fluxfin-btn-secondary disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <DespesasRelatorioPreview
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        despesas={despesas}
        filtros={{
          projeto: projetos.find((p) => p.id === projetoId)
            ? `${projetos.find((p) => p.id === projetoId)!.codigo} - ${projetos.find((p) => p.id === projetoId)!.titulo}`
            : "",
          categoria: categoria ? categoriaLabels[categoria] || categoria : "",
          busca: search,
        }}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import RelatorioPreview from "@/components/RelatorioPreview";

interface ProjetoOption {
  id: string;
  codigo: string;
  titulo: string;
}

interface RelatorioData {
  geradoEm: string;
  geradoPor: string;
  tipo: string;
  projeto: {
    codigo: string;
    titulo: string;
    status: string;
    dataInicio: string;
    dataTermino: string;
    progressoFisico: number;
  };
  resumoFinanceiro: {
    orcamentoTotal: number;
    totalGasto: number;
    saldo: number;
    percentualExecutado: string;
    cpi: number;
  };
  breakdownRubricas: {
    nome: string;
    categoria: string;
    valorAlocado: number;
    valorGasto: number;
    saldo: number;
    percentualExecutado: string;
  }[];
  equipe: { nome: string; email: string; papel: string }[];
}

const REPORT_TYPES = [
  { value: "RESUMO", label: "Resumo", description: "Visão geral do projeto" },
  { value: "ORCAMENTO", label: "Orçamento", description: "Detalhes orçamentários e rubricas" },
  { value: "DESPESAS", label: "Despesas", description: "Histórico de despesas" },
  { value: "EQUIPE", label: "Equipe", description: "Membros e papéis" },
  { value: "COMPLETO", label: "Completo", description: "Relatório completo do projeto" },
] as const;

export default function RelatoriosPage() {
  const { status } = useSession();
  const router = useRouter();

  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [projetoId, setProjetoId] = useState("");
  const [tipoRelatorio, setTipoRelatorio] = useState("RESUMO");
  const [loading, setLoading] = useState(false);
  const [loadingProjetos, setLoadingProjetos] = useState(true);
  const [relatorioData, setRelatorioData] = useState<RelatorioData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/projetos")
        .then((res) => res.json())
        .then((data) => {
          const projetos = data.projetos || (Array.isArray(data) ? data : []);
          setProjetos(
            projetos.map((p: ProjetoOption) => ({
              id: p.id,
              codigo: p.codigo,
              titulo: p.titulo,
            }))
          );
          setLoadingProjetos(false);
        })
        .catch(() => setLoadingProjetos(false));
    }
  }, [status]);

  const handleGerar = async () => {
    if (!projetoId) {
      setError("Selecione um projeto");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/relatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projetoId,
          tipo: tipoRelatorio,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao gerar relatório");
      }

      const data = await res.json();
      setRelatorioData(data);
      setShowPreview(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao gerar relatório"
      );
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loadingProjetos) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted mt-1">
          Gere relatórios detalhados dos seus projetos
        </p>
      </div>

      <div className="fluxfin-card max-w-2xl">
        <div className="space-y-5">
          <div>
            <label className="fluxfin-label">Projeto</label>
            <select
              value={projetoId}
              onChange={(e) => setProjetoId(e.target.value)}
              className="fluxfin-input"
            >
              <option value="">Selecione um projeto</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} - {p.titulo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="fluxfin-label">Tipo de Relatório</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REPORT_TYPES.map((tipo) => (
                <button
                  key={tipo.value}
                  onClick={() => setTipoRelatorio(tipo.value)}
                  className={`text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                    tipoRelatorio === tipo.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      tipoRelatorio === tipo.value
                        ? "text-primary-dark"
                        : "text-foreground"
                    }`}
                  >
                    {tipo.label}
                  </span>
                  <p className="text-xs text-muted mt-0.5">{tipo.description}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handleGerar}
            disabled={loading || !projetoId}
            className="fluxfin-btn-primary w-full py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Gerando relatório...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Gerar Relatório
              </span>
            )}
          </button>
        </div>
      </div>

      <RelatorioPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        data={relatorioData}
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import FormField from "@/components/FormField";

const CATEGORIAS = [
  { value: "RECURSOS_HUMANOS", label: "Recursos Humanos" },
  { value: "SERVICOS_TERCEIROS", label: "Serviços de Terceiros" },
  { value: "MATERIAIS_CONSUMO", label: "Materiais de Consumo" },
  { value: "MATERIAIS_PERMANENTES", label: "Materiais Permanentes" },
  { value: "VIAGENS_DIARIAS", label: "Viagens e Diárias" },
  { value: "CUSTOS_ADMINISTRATIVOS", label: "Custos Administrativos" },
];

interface RubricaForm {
  nome: string;
  categoria: string;
  valorAlocado: string;
}

export default function NovoProjetoPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session && session.user?.papelSistema !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, router]);

  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataTermino, setDataTermino] = useState("");
  const [orcamentoGlobal, setOrcamentoGlobal] = useState("");
  const [rubricas, setRubricas] = useState<RubricaForm[]>([]);

  const addRubrica = () => {
    setRubricas([
      ...rubricas,
      { nome: "", categoria: CATEGORIAS[0].value, valorAlocado: "" },
    ]);
  };

  const removeRubrica = (index: number) => {
    setRubricas(rubricas.filter((_, i) => i !== index));
  };

  const updateRubrica = (index: number, field: keyof RubricaForm, value: string) => {
    const updated = [...rubricas];
    updated[index] = { ...updated[index], [field]: value };
    setRubricas(updated);
  };

  const totalRubricas = rubricas.reduce(
    (sum, r) => sum + (parseFloat(r.valorAlocado) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body = {
        codigo,
        titulo,
        descricao: descricao || undefined,
        dataInicio: new Date(dataInicio).toISOString(),
        dataTermino: new Date(dataTermino).toISOString(),
        orcamentoGlobal: parseFloat(orcamentoGlobal),
        equipe: [
          {
            usuarioId: session?.user?.id ?? "",
            papel: "COORDENADOR" as const,
          },
        ],
        rubricas: rubricas
          .filter((r) => r.nome && r.valorAlocado)
          .map((r) => ({
            nome: r.nome,
            categoria: r.categoria,
            valorAlocado: parseFloat(r.valorAlocado),
          })),
      };

      const res = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let message = "Erro ao criar projeto";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          // Response body was not valid JSON
        }
        throw new Error(message);
      }

      router.refresh();
      router.push("/projetos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar projeto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Novo Projeto</h1>
        <button
          onClick={() => router.back()}
          className="fluxfin-btn-ghost"
        >
          Voltar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="fluxfin-card space-y-5">
          <h2 className="text-lg font-semibold text-foreground">Informações Básicas</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Código"
              placeholder="Ex: PROJ-001"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
            <FormField
              label="Orçamento Global (R$)"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={orcamentoGlobal}
              onChange={(e) => setOrcamentoGlobal(e.target.value)}
              required
            />
          </div>

          <FormField
            label="Título"
            placeholder="Título do projeto"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="fluxfin-label">Descrição</label>
            <textarea
              className="fluxfin-input min-h-[100px] resize-y"
              placeholder="Descrição do projeto (opcional)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Data Início"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              required
            />
            <FormField
              label="Data Término"
              type="date"
              value={dataTermino}
              onChange={(e) => setDataTermino(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="fluxfin-card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Rubricas Orçamentárias</h2>
            <button
              type="button"
              onClick={addRubrica}
              className="fluxfin-btn-outline text-sm"
            >
              + Adicionar Rubrica
            </button>
          </div>

          {rubricas.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">
              Nenhuma rubrica adicionada. Clique em &quot;Adicionar Rubrica&quot; para começar.
            </p>
          ) : (
            <div className="space-y-4">
              {rubricas.map((rubrica, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border bg-surface-hover space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted">
                      Rubrica {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRubrica(index)}
                      className="text-danger hover:text-danger/80 text-sm"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FormField
                      label="Nome"
                      placeholder="Nome da rubrica"
                      value={rubrica.nome}
                      onChange={(e) => updateRubrica(index, "nome", e.target.value)}
                    />
                    <div className="space-y-1.5">
                      <label className="fluxfin-label">Categoria</label>
                      <select
                        className="fluxfin-input"
                        value={rubrica.categoria}
                        onChange={(e) =>
                          updateRubrica(index, "categoria", e.target.value)
                        }
                      >
                        {CATEGORIAS.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <FormField
                      label="Valor Alocado (R$)"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={rubrica.valorAlocado}
                      onChange={(e) =>
                        updateRubrica(index, "valorAlocado", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {rubricas.length > 0 && (
            <div className="flex justify-end pt-2 border-t border-border">
              <div className="text-sm">
                <span className="text-muted">Total das rubricas: </span>
                <span
                  className={`font-semibold ${
                    totalRubricas > parseFloat(orcamentoGlobal || "0")
                      ? "text-danger"
                      : "text-foreground"
                  }`}
                >
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalRubricas)}
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="fluxfin-btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="fluxfin-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando...
              </span>
            ) : (
              "Criar Projeto"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

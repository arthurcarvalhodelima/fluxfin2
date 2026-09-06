"use client";

import { useState, useEffect } from "react";

interface Rubrica {
  id: string;
  nome: string;
  categoria: string;
  saldo: number;
}

interface Milestone {
  id: string;
  nome: string;
}

const categoriaLabels: Record<string, string> = {
  RECURSOS_HUMANOS: "Recursos Humanos",
  SERVICOS_TERCEIROS: "Serviços de Terceiros",
  MATERIAIS_CONSUMO: "Materiais de Consumo",
  MATERIAIS_PERMANENTES: "Materiais Permanentes",
  VIAGENS_DIARIAS: "Viagens e Diárias",
  CUSTOS_ADMINISTRATIVOS: "Custos Administrativos",
};

interface ExpenseFormProps {
  projetoId: string;
  rubricas: Rubrica[];
  milestones: Milestone[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ExpenseForm({
  projetoId,
  rubricas,
  milestones,
  onSuccess,
  onCancel,
}: ExpenseFormProps) {
  const [descricao, setDescricao] = useState("");
  const [rubricaId, setRubricaId] = useState("");
  const [valor, setValor] = useState("");
  const [dataDespesa, setDataDespesa] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [saldo, setSaldo] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const valorNum = parseFloat(valor) || 0;
  const insufficientBalance = saldo !== null && valorNum > saldo;

  useEffect(() => {
    if (!rubricaId) return;

    let cancelled = false;
    fetch(`/api/projetos/${projetoId}/rubricas/${rubricaId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setSaldo(json.saldo ?? null);
      })
      .catch(() => {
        if (!cancelled) setSaldo(null);
      });
    return () => { cancelled = true; };
  }, [projetoId, rubricaId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (insufficientBalance) return;

    setLoading(true);
    setError("");

    try {
      const body = {
        descricao,
        rubricaId,
        valor: parseFloat(valor),
        dataDespesa: new Date(dataDespesa).toISOString(),
        milestoneId: milestoneId || undefined,
        justificativa: justificativa || undefined,
      };

      const res = await fetch(`/api/projetos/${projetoId}/despesas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Erro ao criar despesa");
        return;
      }

      onSuccess();
    } catch {
      setError("Erro ao criar despesa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="fluxfin-label">Descrição</label>
        <input
          type="text"
          className="fluxfin-input"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="fluxfin-label">Rubrica</label>
        <select
          className="fluxfin-input"
          value={rubricaId}
          onChange={(e) => setRubricaId(e.target.value)}
          required
        >
          <option value="">Selecione uma rubrica</option>
          {rubricas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome} - {categoriaLabels[r.categoria] || r.categoria}
            </option>
          ))}
        </select>

        {saldo !== null && (
          <p className={`text-sm mt-1 ${saldo >= 0 ? "text-primary-dark" : "text-danger"}`}>
            Saldo disponível:{" "}
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saldo)}
          </p>
        )}

        {insufficientBalance && (
          <div className="flex items-center gap-2 text-sm text-danger mt-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            Valor excede o saldo disponível nesta rubrica
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="fluxfin-label">Valor (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className={`fluxfin-input ${insufficientBalance ? "border-danger" : ""}`}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="fluxfin-label">Data da Despesa</label>
        <input
          type="date"
          className="fluxfin-input"
          value={dataDespesa}
          onChange={(e) => setDataDespesa(e.target.value)}
          required
        />
      </div>

      {milestones.length > 0 && (
        <div className="space-y-1.5">
          <label className="fluxfin-label">Milestone (opcional)</label>
          <select
            className="fluxfin-input"
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
          >
            <option value="">Nenhuma</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="fluxfin-label">Justificativa (opcional)</label>
        <textarea
          className="fluxfin-input"
          rows={3}
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="fluxfin-btn-secondary">
          Cancelar
        </button>
        <button
          type="submit"
          className="fluxfin-btn-primary"
          disabled={loading || insufficientBalance}
        >
          {loading ? "Salvando..." : "Criar Despesa"}
        </button>
      </div>
    </form>
  );
}

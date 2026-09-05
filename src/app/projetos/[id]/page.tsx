"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Badge from "@/components/Badge";
import LoadingSpinner from "@/components/LoadingSpinner";
import Modal from "@/components/Modal";
import ExpenseForm from "@/components/ExpenseForm";
import { calculateCPI, calculateSPI, calculateEAC, calculateETC, calculateVAC } from "@/lib/evm";

interface Projeto {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  status: string;
  orcamentoGlobal: number;
  dataInicio: string;
  dataTermino: string;
  progressoFisico: number;
  equipeProjeto: {
    id: string;
    papel: string;
    usuario: { id: string; nome: string; email: string };
  }[];
  rubricas: {
    id: string;
    nome: string;
    categoria: string;
    valorAlocado: number;
    valorGasto: number;
  }[];
  despesas: {
    id: string;
    descricao: string;
    valor: number;
    dataDespesa: string;
    status: string;
    rubrica: { nome: string; categoria: string };
    usuario: { nome: string };
  }[];
  documentosProjeto: {
    id: string;
    nomeArquivo: string;
    extensao: string;
    dataUpload: string;
    usuario: { nome: string };
  }[];
}

const tabs = ["Resumo", "Equipe", "Orcamento", "Despesas", "Documentos", "Gantt", "PERT/CPM"];

const statusVariants: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  ATIVO: "success",
  CONCLUIDO: "info",
  SUSPENSO: "warning",
  CANCELADO: "danger",
};

const categoriaLabels: Record<string, string> = {
  RECURSOS_HUMANOS: "Recursos Humanos",
  SERVICOS_TERCEIROS: "Servicos de Terceiros",
  MATERIAIS_CONSUMO: "Materiais de Consumo",
  MATERIAIS_PERMANENTES: "Materiais Permanentes",
  VIAGENS_DIARIAS: "Viagens e Diarias",
  CUSTOS_ADMINISTRATIVOS: "Custos Administrativos",
};

export default function ProjetoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Resumo");
  const [pertCpm, setPertCpm] = useState<{
    caminhoCritico: string[];
    duracaoTotal: number;
    folgas: Record<string, number>;
    atividades: { id: string; nome: string; duracao: number; predecessorIds: string[] }[];
  } | null>(null);
  const [pertCpmLoading, setPertCpmLoading] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  useEffect(() => {
    fetch(`/api/projetos/${id}`)
      .then((res) => res.json())
      .then((json) => {
        setProjeto(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  function fetchPertCpm() {
    if (pertCpm || pertCpmLoading) return;
    setPertCpmLoading(true);
    fetch(`/api/projetos/${id}/pert-cpm`)
      .then((res) => res.json())
      .then((json) => {
        setPertCpm(json);
        setPertCpmLoading(false);
      })
      .catch(() => setPertCpmLoading(false));
  }

  const totalGasto = projeto?.rubricas.reduce((sum, r) => sum + Number(r.valorGasto), 0) ?? 0;

  const evmMetrics = useMemo(() => {
    if (!projeto) return null;
    const agora = new Date();
    const inicio = new Date(projeto.dataInicio).getTime();
    const termino = new Date(projeto.dataTermino).getTime();
    const duracaoTotal = termino - inicio;
    const tempoDecorrido = Math.min(Math.max(agora.getTime() - inicio, 0), duracaoTotal);
    const BAC = Number(projeto.orcamentoGlobal);
    const PV = duracaoTotal > 0 ? (tempoDecorrido / duracaoTotal) * BAC : 0;
    const EV = (Number(projeto.progressoFisico) / 100) * BAC;
    const AC = totalGasto;
    const cpi = calculateCPI(EV, AC);
    const spi = calculateSPI(EV, PV);
    const eac = calculateEAC(BAC, cpi);
    const etc = calculateETC(BAC, EV, cpi);
    const vac = calculateVAC(BAC, eac);
    return { PV, EV, AC, BAC, cpi, spi, eac, etc, vac };
  }, [projeto, totalGasto]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="text-center py-20 text-muted">
        Projeto nao encontrado
      </div>
    );
  }

  const totalRubricas = projeto.rubricas.reduce((sum, r) => sum + Number(r.valorAlocado), 0);
  const saldo = Number(projeto.orcamentoGlobal) - totalGasto;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{projeto.titulo}</h1>
            <Badge variant={statusVariants[projeto.status] || "default"}>
              {projeto.status}
            </Badge>
          </div>
          <p className="text-muted">
            Codigo: {projeto.codigo}
          </p>
        </div>
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "PERT/CPM") fetchPertCpm();
              }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary-dark"
                  : "border-transparent text-muted hover:text-foreground hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "Resumo" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="fluxfin-card space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Informacoes do Projeto</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted">Descricao</p>
                <p className="text-foreground">{projeto.descricao || "Sem descricao"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted">Data Inicio</p>
                  <p className="text-foreground">
                    {new Date(projeto.dataInicio).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">Data Termino</p>
                  <p className="text-foreground">
                    {new Date(projeto.dataTermino).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted">Progresso Fisico</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${projeto.progressoFisico}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {projeto.progressoFisico}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="fluxfin-card space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Resumo Financeiro</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted">Orcamento Global</span>
                <span className="font-semibold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    Number(projeto.orcamentoGlobal)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total Alocado (Rubricas)</span>
                <span className="font-semibold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    totalRubricas
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total Gasto</span>
                <span className="font-semibold text-danger">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    totalGasto
                  )}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-muted">Saldo</span>
                <span className={`font-bold ${saldo >= 0 ? "text-primary-dark" : "text-danger"}`}>
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    saldo
                  )}
                </span>
              </div>
            </div>
          </div>
          </div>

          {evmMetrics && (
            <div className="fluxfin-card space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Analise EVM (Earned Value Management)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  {
                    label: "CPI",
                    value: evmMetrics.cpi.toFixed(2),
                    color: evmMetrics.cpi >= 1 ? "text-green-600" : "text-red-600",
                    desc: "Custo",
                  },
                  {
                    label: "SPI",
                    value: evmMetrics.spi.toFixed(2),
                    color: evmMetrics.spi >= 1 ? "text-green-600" : "text-red-600",
                    desc: "Cronograma",
                  },
                  {
                    label: "EAC",
                    value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(evmMetrics.eac),
                    color: evmMetrics.eac <= evmMetrics.BAC ? "text-green-600" : "text-red-600",
                    desc: "Estimativa Final",
                  },
                  {
                    label: "ETC",
                    value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(evmMetrics.etc),
                    color: "text-foreground",
                    desc: "Para Concluir",
                  },
                  {
                    label: "VAC",
                    value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(evmMetrics.vac),
                    color: evmMetrics.vac >= 0 ? "text-green-600" : "text-red-600",
                    desc: "Variacao",
                  },
                ].map((card) => (
                  <div key={card.label} className="p-4 rounded-lg bg-surface-hover">
                    <p className="text-sm text-muted">{card.label}</p>
                    <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                    <p className="text-xs text-muted mt-1">{card.desc}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="p-3 rounded-lg bg-surface-hover">
                  <p className="text-xs text-muted">PV (Planned Value)</p>
                  <p className="text-sm font-semibold text-foreground">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(evmMetrics.PV)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-hover">
                  <p className="text-xs text-muted">EV (Earned Value)</p>
                  <p className="text-sm font-semibold text-foreground">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(evmMetrics.EV)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-hover">
                  <p className="text-xs text-muted">AC (Actual Cost)</p>
                  <p className="text-sm font-semibold text-foreground">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(evmMetrics.AC)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "Equipe" && (
        <div className="fluxfin-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Equipe do Projeto</h2>
          </div>
          {projeto.equipeProjeto.length === 0 ? (
            <p className="text-muted text-center py-8">Nenhum membro na equipe</p>
          ) : (
            <div className="space-y-3">
              {projeto.equipeProjeto.map((membro) => (
                <div
                  key={membro.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-surface-hover"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary-dark font-semibold">
                      {membro.usuario.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{membro.usuario.nome}</p>
                      <p className="text-sm text-muted">{membro.usuario.email}</p>
                    </div>
                  </div>
                  <Badge variant={membro.papel === "COORDENADOR" ? "primary" : "default"}>
                    {membro.papel}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "Orcamento" && (
        <div className="fluxfin-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Rubricas Orcamentarias</h2>
          </div>
          {projeto.rubricas.length === 0 ? (
            <p className="text-muted text-center py-8">Nenhuma rubrica cadastrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="fluxfin-table">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Alocado</th>
                    <th className="px-4 py-3">Gasto</th>
                    <th className="px-4 py-3">Saldo</th>
                    <th className="px-4 py-3">Execucao</th>
                  </tr>
                </thead>
                <tbody>
                  {projeto.rubricas.map((rubrica) => {
                    const alocado = Number(rubrica.valorAlocado);
                    const gasto = Number(rubrica.valorGasto);
                    const saldoRubrica = alocado - gasto;
                    const percentual = alocado > 0 ? (gasto / alocado) * 100 : 0;

                    return (
                      <tr key={rubrica.id}>
                        <td className="px-4 py-3 font-medium">{rubrica.nome}</td>
                        <td className="px-4 py-3">
                          {categoriaLabels[rubrica.categoria] || rubrica.categoria}
                        </td>
                        <td className="px-4 py-3">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            alocado
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            gasto
                          )}
                        </td>
                        <td className={`px-4 py-3 font-medium ${saldoRubrica >= 0 ? "text-primary-dark" : "text-danger"}`}>
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            saldoRubrica
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  percentual > 90 ? "bg-danger" : percentual > 70 ? "bg-warning" : "bg-primary"
                                }`}
                                style={{ width: `${Math.min(percentual, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted">{percentual.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "Despesas" && (
        <div className="fluxfin-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Despesas</h2>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="fluxfin-btn-primary"
            >
              Nova Despesa
            </button>
          </div>
          {projeto.despesas.length === 0 ? (
            <p className="text-muted text-center py-8">Nenhuma despesa registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="fluxfin-table">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Descricao</th>
                    <th className="px-4 py-3">Rubrica</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Responsavel</th>
                  </tr>
                </thead>
                <tbody>
                  {projeto.despesas.map((despesa) => (
                    <tr key={despesa.id}>
                      <td className="px-4 py-3 font-medium">{despesa.descricao}</td>
                      <td className="px-4 py-3">{despesa.rubrica.nome}</td>
                      <td className="px-4 py-3">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          Number(despesa.valor)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(despesa.dataDespesa).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            despesa.status === "PAGA"
                              ? "success"
                              : despesa.status === "APROVADA"
                              ? "info"
                              : "warning"
                          }
                        >
                          {despesa.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{despesa.usuario.nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "Documentos" && (
        <div className="fluxfin-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Documentos</h2>
          </div>
          {projeto.documentosProjeto.length === 0 ? (
            <p className="text-muted text-center py-8">Nenhum documento anexado</p>
          ) : (
            <div className="space-y-3">
              {projeto.documentosProjeto.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-surface-hover"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-primary-dark"
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
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{doc.nomeArquivo}</p>
                      <p className="text-sm text-muted">
                        Enviado por {doc.usuario.nome} em{" "}
                        {new Date(doc.dataUpload).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">{doc.extensao.toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "Gantt" && (
        <div className="fluxfin-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Diagrama de Gantt</h2>
          <div className="space-y-4">
            {projeto.equipeProjeto.length > 0 && (
              <div className="p-6 text-center text-muted bg-surface-hover rounded-lg">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="font-medium">Diagrama de Gantt</p>
                <p className="text-sm mt-1">
                  Visualizacao cronograma de atividades do projeto
                </p>
                <div className="mt-6 space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="w-32 text-sm text-left text-muted">
                      Inicio do projeto
                    </span>
                    <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${projeto.progressoFisico}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{projeto.progressoFisico}%</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted">
                    <span className="w-32 text-left">
                      {new Date(projeto.dataInicio).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="flex-1" />
                    <span>
                      {new Date(projeto.dataTermino).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showExpenseModal && (
        <Modal
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          title="Nova Despesa"
          size="lg"
        >
          <ExpenseForm
            projetoId={id}
            rubricas={projeto.rubricas.map((r) => ({
              id: r.id,
              nome: r.nome,
              categoria: r.categoria,
              saldo: Number(r.valorAlocado) - Number(r.valorGasto),
            }))}
            milestones={[]}
            onSuccess={() => {
              setShowExpenseModal(false);
              fetch(`/api/projetos/${id}`)
                .then((res) => res.json())
                .then((json) => setProjeto(json));
            }}
            onCancel={() => setShowExpenseModal(false)}
          />
        </Modal>
      )}

      {activeTab === "PERT/CPM" && (
        <div className="fluxfin-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Analise PERT/CPM</h2>
          {pertCpmLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : !pertCpm || pertCpm.atividades.length === 0 ? (
            <p className="text-muted text-center py-8">Nenhum milestone encontrado para calcular o caminho critico</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-surface-hover">
                  <p className="text-sm text-muted">Duracao Total</p>
                  <p className="text-2xl font-bold text-foreground">{pertCpm.duracaoTotal} dias</p>
                </div>
                <div className="p-4 rounded-lg bg-surface-hover">
                  <p className="text-sm text-muted">Atividades no Caminho Critico</p>
                  <p className="text-2xl font-bold text-danger">{pertCpm.caminhoCritico.length}</p>
                </div>
              </div>

              {pertCpm.caminhoCritico.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Caminho Critico</h3>
                  <div className="flex flex-wrap gap-2">
                    {pertCpm.caminhoCritico.map((id) => {
                      const atividade = pertCpm.atividades.find(a => a.id === id);
                      return (
                        <Badge key={id} variant="danger">
                          {atividade?.nome || id}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Todas as Atividades</h3>
                <div className="overflow-x-auto">
                  <table className="fluxfin-table">
                    <thead>
                      <tr>
                        <th className="px-4 py-3">Atividade</th>
                        <th className="px-4 py-3">Duracao (dias)</th>
                        <th className="px-4 py-3">Folga (dias)</th>
                        <th className="px-4 py-3">Predecessores</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pertCpm.atividades.map((atividade) => {
                        const isCritico = pertCpm.caminhoCritico.includes(atividade.id);
                        const folga = pertCpm.folgas[atividade.id];
                        return (
                          <tr key={atividade.id}>
                            <td className="px-4 py-3 font-medium">{atividade.nome}</td>
                            <td className="px-4 py-3">{atividade.duracao}</td>
                            <td className="px-4 py-3">{folga}</td>
                            <td className="px-4 py-3">
                              {atividade.predecessorIds.length === 0
                                ? "-"
                                : atividade.predecessorIds
                                    .map(pid => pertCpm.atividades.find(a => a.id === pid)?.nome || pid)
                                    .join(", ")}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={isCritico ? "danger" : "success"}>
                                {isCritico ? "Critico" : "Normal"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

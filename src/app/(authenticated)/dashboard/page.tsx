"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import LoadingSpinner from "@/components/LoadingSpinner";

interface DashboardData {
  totalProjetos: number;
  projetosAtivos: number;
  totalOrcamento: number;
  totalGasto: number;
  saldoDisponivel: number;
  percentualExecutado: number;
  fluxoCaixa: { mes: string; entradas: number; saidas: number }[];
  burndown: { dia: string; previsto: number; real: number }[];
  cpi: number;
  projetosConcluidos: number;
  evm: {
    cpi: number;
    spi: number;
    eac: number;
    etc: number;
    vac: number;
    tcpi: number;
    pv: number;
    ev: number;
    ac: number;
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
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

  if (!data) {
    return (
      <div className="text-center py-20 text-muted">
        Erro ao carregar dados do dashboard
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Projetos",
      value: data.totalProjetos,
      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    },
    {
      label: "Orcamento Global",
      value: formatCurrency(data.totalOrcamento),
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      label: "Total Gasto",
      value: formatCurrency(data.totalGasto),
      icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    },
    {
      label: "CPI Geral",
      value: data.cpi.toFixed(2),
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      color: data.cpi >= 1 ? "text-green-600" : "text-danger",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="fluxfin-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color || "text-foreground"}`}>
                  {card.value}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary-dark"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={card.icon}
                  />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            label: "SPI",
            value: data.evm.spi.toFixed(2),
            color: data.evm.spi >= 1 ? "text-green-600" : "text-red-600",
            desc: "Schedule Performance Index",
          },
          {
            label: "EAC",
            value: formatCurrency(data.evm.eac),
            color: data.evm.eac <= data.totalOrcamento ? "text-green-600" : "text-red-600",
            desc: "Estimate At Completion",
          },
          {
            label: "ETC",
            value: formatCurrency(data.evm.etc),
            color: "text-foreground",
            desc: "Estimate To Complete",
          },
          {
            label: "VAC",
            value: formatCurrency(data.evm.vac),
            color: data.evm.vac >= 0 ? "text-green-600" : "text-red-600",
            desc: "Variance At Completion",
          },
          {
            label: "TCPI",
            value: data.evm.tcpi.toFixed(2),
            color: data.evm.tcpi <= 1 ? "text-green-600" : "text-red-600",
            desc: "To-Complete Performance Index",
          },
        ].map((card) => (
          <div key={card.label} className="fluxfin-card">
            <p className="text-sm text-muted">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted mt-1">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="fluxfin-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Fluxo de Caixa Mensal
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.fluxoCaixa}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="entradas"
                name="Entradas"
                stroke="#89BE30"
                strokeWidth={2}
                dot={{ fill: "#89BE30" }}
              />
              <Line
                type="monotone"
                dataKey="saidas"
                name="Saidas"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: "#ef4444" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="fluxfin-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Burndown Orcamentario
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.burndown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(1)}%`}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="previsto"
                name="Previsto"
                stroke="#89BE30"
                fill="#89BE30"
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="real"
                name="Real"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="fluxfin-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Indicador CPI (Cost Performance Index)
        </h2>
        <div className="flex items-center gap-8">
          <div className="flex-shrink-0">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={data.cpi >= 1 ? "#89BE30" : "#ef4444"}
                  strokeWidth="10"
                  strokeDasharray={`${Math.min(data.cpi / 2, 1) * 314} 314`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{data.cpi.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-muted">
              CPI = Earned Value / Custo Real
            </p>
            <p className="text-sm">
              <span className="font-medium text-foreground">Saldo disponivel: </span>
              <span className="text-primary-dark font-semibold">{formatCurrency(data.saldoDisponivel)}</span>
            </p>
            <p className="text-sm">
              <span className="font-medium text-foreground">Percentual executado: </span>
              <span className="font-semibold">{data.percentualExecutado}%</span>
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  data.cpi >= 1
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {data.cpi >= 1 ? "Dentro do orcamento" : "Acima do orcamento"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

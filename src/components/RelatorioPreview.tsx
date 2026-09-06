"use client";

import { useRef } from "react";
import jsPDF from "jspdf";
import Modal from "@/components/Modal";

interface RelatorioData {
  geradoEm: string;
  geradoPor: string;
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

interface RelatorioPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  data: RelatorioData | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function generatePDF(data: RelatorioData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(18);
  doc.setTextColor(137, 190, 48);
  doc.text("FluxFin - Relatório do Projeto", pageWidth / 2, y, {
    align: "center",
  });
  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Gerado em: ${new Date(data.geradoEm).toLocaleDateString("pt-BR")} por ${data.geradoPor}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 12;

  doc.setDrawColor(137, 190, 48);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  doc.setFontSize(12);
  doc.setTextColor(30);
  doc.text("Dados do Projeto", 20, y);
  y += 7;
  doc.setFontSize(10);
  doc.text(`Código: ${data.projeto.codigo}`, 20, y);
  y += 6;
  doc.text(`Título: ${data.projeto.titulo}`, 20, y);
  y += 6;
  doc.text(`Status: ${data.projeto.status}`, 20, y);
  y += 6;
  doc.text(
    `Período: ${new Date(data.projeto.dataInicio).toLocaleDateString("pt-BR")} a ${new Date(data.projeto.dataTermino).toLocaleDateString("pt-BR")}`,
    20,
    y
  );
  y += 6;
  doc.text(`Progresso: ${data.projeto.progressoFisico}%`, 20, y);
  y += 12;

  doc.setFontSize(12);
  doc.text("Resumo Financeiro", 20, y);
  y += 7;
  doc.setFontSize(10);
  doc.text(
    `Orçamento Total: ${formatCurrency(data.resumoFinanceiro.orcamentoTotal)}`,
    20,
    y
  );
  y += 6;
  doc.text(
    `Total Gasto: ${formatCurrency(data.resumoFinanceiro.totalGasto)}`,
    20,
    y
  );
  y += 6;
  doc.text(
    `Saldo: ${formatCurrency(data.resumoFinanceiro.saldo)}`,
    20,
    y
  );
  y += 6;
  doc.text(`CPI: ${data.resumoFinanceiro.cpi}`, 20, y);
  y += 12;

  if (data.breakdownRubricas.length > 0) {
    doc.setFontSize(12);
    doc.text("Breakdown por Rubricas", 20, y);
    y += 7;

    const rubricaData = data.breakdownRubricas.map((r) => [
      r.nome,
      formatCurrency(r.valorAlocado),
      formatCurrency(r.valorGasto),
      formatCurrency(r.saldo),
      `${r.percentualExecutado}%`,
    ]);

    (doc as unknown as { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
      startY: y,
      head: [["Rubrica", "Alocado", "Gasto", "Saldo", "% Executado"]],
      body: rubricaData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [137, 190, 48] },
      margin: { left: 20 },
    });

    y =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (data.equipe.length > 0 && y < 250) {
    doc.setFontSize(12);
    doc.text("Equipe", 20, y);
    y += 7;

    const equipeData = data.equipe.map((e) => [e.nome, e.email, e.papel]);

    (doc as unknown as { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
      startY: y,
      head: [["Nome", "Email", "Papel"]],
      body: equipeData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [137, 190, 48] },
      margin: { left: 20 },
    });
  }

  return doc;
}

export default function RelatorioPreview({
  isOpen,
  onClose,
  data,
}: RelatorioPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    const doc = generatePDF(data);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleDownload = () => {
    const doc = generatePDF(data);
    doc.save(
      `relatório-${data.projeto.codigo}-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pré-visualização do Relatório"
      size="xl"
      footer={
        <>
          <button onClick={handleDownload} className="fluxfin-btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Salvar
          </button>
          <button onClick={handlePrint} className="fluxfin-btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-white border border-border rounded-lg p-4 text-sm space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h3 className="font-bold text-foreground">
                {data.projeto.codigo} - {data.projeto.titulo}
              </h3>
              <p className="text-xs text-muted mt-1">
                Gerado por {data.geradoPor} em{" "}
                {new Date(data.geradoEm).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <span
              className={`fluxfin-badge ${
                data.projeto.status === "ATIVO"
                  ? "bg-primary/10 text-green-800"
                  : data.projeto.status === "CONCLUIDO"
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
              }`}
            >
              {data.projeto.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <p className="text-muted text-xs">Orçamento Total</p>
              <p className="font-semibold text-foreground">
                {formatCurrency(data.resumoFinanceiro.orcamentoTotal)}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">Total Gasto</p>
              <p className="font-semibold text-foreground">
                {formatCurrency(data.resumoFinanceiro.totalGasto)}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">Saldo</p>
              <p
                className={`font-semibold ${
                  data.resumoFinanceiro.saldo >= 0
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {formatCurrency(data.resumoFinanceiro.saldo)}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">CPI</p>
              <p className="font-semibold text-foreground">
                {data.resumoFinanceiro.cpi}
              </p>
            </div>
          </div>
        </div>

        {data.breakdownRubricas.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Breakdown por Rubricas
            </h4>
            <div className="overflow-x-auto">
              <table className="fluxfin-table text-xs">
                <thead>
                  <tr>
                    <th>Rubrica</th>
                    <th>Alocado</th>
                    <th>Gasto</th>
                    <th>Saldo</th>
                    <th>% Exec.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdownRubricas.map((r, i) => (
                    <tr key={i}>
                      <td className="font-medium">{r.nome}</td>
                      <td>{formatCurrency(r.valorAlocado)}</td>
                      <td>{formatCurrency(r.valorGasto)}</td>
                      <td
                        className={
                          r.saldo >= 0 ? "text-success" : "text-danger"
                        }
                      >
                        {formatCurrency(r.saldo)}
                      </td>
                      <td>{r.percentualExecutado}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.equipe.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Equipe do Projeto
            </h4>
            <div className="space-y-2">
              {data.equipe.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface text-xs"
                >
                  <div>
                    <span className="font-medium text-foreground">
                      {m.nome}
                    </span>
                    <span className="text-muted ml-2">{m.email}</span>
                  </div>
                  <span className="fluxfin-badge bg-primary/10 text-green-800">
                    {m.papel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <iframe ref={iframeRef} className="hidden" title="pdf-preview" />
      </div>
    </Modal>
  );
}

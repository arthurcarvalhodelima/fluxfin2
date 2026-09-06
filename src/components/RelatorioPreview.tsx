"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Modal from "@/components/Modal";

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
    descricao?: string;
  };
  resumoFinanceiro?: {
    orcamentoTotal: number;
    totalGasto: number;
    saldo: number;
    percentualExecutado: string;
    cpi: number;
  };
  breakdownRubricas?: {
    nome: string;
    categoria: string;
    valorAlocado: number;
    valorGasto: number;
    saldo: number;
    percentualExecutado: string;
  }[];
  timelineDespesas?: { mes: string; valor: number }[];
  despesas?: {
    descricao: string;
    valor: number;
    dataDespesa: string;
    status: string;
    rubrica: string;
    responsavel: string;
  }[];
  equipe?: { nome: string; email: string; papel: string }[];
  documentos?: { nome: string; extensao: string; dataUpload: string; autor: string }[];
  milestones?: {
    nome: string;
    descricao: string | null;
    dataPrevista: string;
    dataExecucao: string | null;
    percentualPrevisto: number;
    concluido: boolean;
  }[];
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

  const checkPageBreak = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFontSize(18);
  doc.setTextColor(137, 190, 48);
  doc.text("FluxFin - Relatório do Projeto", pageWidth / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Gerado em: ${new Date(data.geradoEm).toLocaleDateString("pt-BR")} por ${data.geradoPor} | Tipo: ${data.tipo}`,
    pageWidth / 2, y, { align: "center" }
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
  doc.text(`Código: ${data.projeto.codigo}`, 20, y); y += 6;
  doc.text(`Título: ${data.projeto.titulo}`, 20, y); y += 6;
  doc.text(`Status: ${data.projeto.status}`, 20, y); y += 6;
  doc.text(`Período: ${new Date(data.projeto.dataInicio).toLocaleDateString("pt-BR")} a ${new Date(data.projeto.dataTermino).toLocaleDateString("pt-BR")}`, 20, y); y += 6;
  doc.text(`Progresso: ${data.projeto.progressoFisico}%`, 20, y); y += 12;

  if (data.resumoFinanceiro) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.text("Resumo Financeiro", 20, y); y += 7;
    doc.setFontSize(10);
    doc.text(`Orçamento Total: ${formatCurrency(data.resumoFinanceiro.orcamentoTotal)}`, 20, y); y += 6;
    doc.text(`Total Gasto: ${formatCurrency(data.resumoFinanceiro.totalGasto)}`, 20, y); y += 6;
    doc.text(`Saldo: ${formatCurrency(data.resumoFinanceiro.saldo)}`, 20, y); y += 6;
    doc.text(`% Executado: ${data.resumoFinanceiro.percentualExecutado}%`, 20, y); y += 6;
    doc.text(`CPI: ${data.resumoFinanceiro.cpi}`, 20, y); y += 12;
  }

  if (data.breakdownRubricas && data.breakdownRubricas.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.text("Breakdown por Rubricas", 20, y); y += 7;
    autoTable(doc, {
      startY: y,
      head: [["Rubrica", "Categoria", "Alocado", "Gasto", "Saldo", "% Exec."]],
      body: data.breakdownRubricas.map(r => [
        r.nome, r.categoria, formatCurrency(r.valorAlocado),
        formatCurrency(r.valorGasto), formatCurrency(r.saldo), `${r.percentualExecutado}%`
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [137, 190, 48] },
      margin: { left: 20 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (data.despesas && data.despesas.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.text(`Despesas (${data.despesas.length} registros)`, 20, y); y += 7;
    autoTable(doc, {
      startY: y,
      head: [["Descrição", "Rubrica", "Valor", "Data", "Status", "Responsável"]],
      body: data.despesas.map(d => [
        d.descricao.length > 30 ? d.descricao.slice(0, 30) + "..." : d.descricao,
        d.rubrica,
        formatCurrency(d.valor),
        new Date(d.dataDespesa).toLocaleDateString("pt-BR"),
        d.status,
        d.responsavel,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [137, 190, 48] },
      margin: { left: 20 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (data.equipe && data.equipe.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.text("Equipe", 20, y); y += 7;
    autoTable(doc, {
      startY: y,
      head: [["Nome", "Email", "Papel"]],
      body: data.equipe.map(e => [e.nome, e.email, e.papel]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [137, 190, 48] },
      margin: { left: 20 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (data.milestones && data.milestones.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.text("Marcos", 20, y); y += 7;
    autoTable(doc, {
      startY: y,
      head: [["Marco", "Previsto", "Executado", "% Prev.", "Status"]],
      body: data.milestones.map(m => [
        m.nome,
        new Date(m.dataPrevista).toLocaleDateString("pt-BR"),
        m.dataExecucao ? new Date(m.dataExecucao).toLocaleDateString("pt-BR") : "-",
        `${m.percentualPrevisto}%`,
        m.concluido ? "Concluído" : "Pendente",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [137, 190, 48] },
      margin: { left: 20 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (data.documentos && data.documentos.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.text("Documentos", 20, y); y += 7;
    autoTable(doc, {
      startY: y,
      head: [["Arquivo", "Extensão", "Data Upload", "Autor"]],
      body: data.documentos.map(d => [
        d.nome, d.extensao, new Date(d.dataUpload).toLocaleDateString("pt-BR"), d.autor
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [137, 190, 48] },
      margin: { left: 20 },
    });
  }

  return doc;
}

export default function RelatorioPreview({ isOpen, onClose, data }: RelatorioPreviewProps) {
  if (!data) return null;

  const handlePrint = () => {
    const doc = generatePDF(data);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.onload = () => { printWindow.print(); };
    }
  };

  const handleDownload = () => {
    const doc = generatePDF(data);
    doc.save(`relatorio-${data.projeto.codigo}-${new Date().toISOString().slice(0, 10)}.pdf`);
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
            Salvar PDF
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
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="bg-white border border-border rounded-lg p-4 text-sm space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h3 className="font-bold text-foreground">{data.projeto.codigo} - {data.projeto.titulo}</h3>
              <p className="text-xs text-muted mt-1">
                Gerado por {data.geradoPor} em {new Date(data.geradoEm).toLocaleDateString("pt-BR")} | Tipo: {data.tipo}
              </p>
            </div>
            <span className={`fluxfin-badge ${
              data.projeto.status === "ATIVO" ? "bg-primary/10 text-green-800"
              : data.projeto.status === "CONCLUIDO" ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
            }`}>{data.projeto.status}</span>
          </div>
        </div>

        {data.resumoFinanceiro && (
          <div className="bg-white border border-border rounded-lg p-4 text-sm">
            <h4 className="text-sm font-semibold text-foreground mb-3">Resumo Financeiro</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted text-xs">Orçamento Total</p>
                <p className="font-semibold text-foreground">{formatCurrency(data.resumoFinanceiro.orcamentoTotal)}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Total Gasto</p>
                <p className="font-semibold text-foreground">{formatCurrency(data.resumoFinanceiro.totalGasto)}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Saldo</p>
                <p className={`font-semibold ${data.resumoFinanceiro.saldo >= 0 ? "text-success" : "text-danger"}`}>
                  {formatCurrency(data.resumoFinanceiro.saldo)}
                </p>
              </div>
              <div>
                <p className="text-muted text-xs">CPI</p>
                <p className="font-semibold text-foreground">{data.resumoFinanceiro.cpi}</p>
              </div>
            </div>
          </div>
        )}

        {data.breakdownRubricas && data.breakdownRubricas.length > 0 && (
          <div className="bg-white border border-border rounded-lg p-4 text-sm">
            <h4 className="text-sm font-semibold text-foreground mb-3">Breakdown por Rubricas</h4>
            <div className="overflow-x-auto">
              <table className="fluxfin-table text-xs">
                <thead>
                  <tr>
                    <th>Rubrica</th>
                    <th>Categoria</th>
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
                      <td>{r.categoria}</td>
                      <td>{formatCurrency(r.valorAlocado)}</td>
                      <td>{formatCurrency(r.valorGasto)}</td>
                      <td className={r.saldo >= 0 ? "text-success" : "text-danger"}>{formatCurrency(r.saldo)}</td>
                      <td>{r.percentualExecutado}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.despesas && data.despesas.length > 0 && (
          <div className="bg-white border border-border rounded-lg p-4 text-sm">
            <h4 className="text-sm font-semibold text-foreground mb-3">Despesas ({data.despesas.length} registros)</h4>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="fluxfin-table text-xs">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Rubrica</th>
                    <th>Valor</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {data.despesas.map((d, i) => (
                    <tr key={i}>
                      <td className="font-medium max-w-[200px] truncate">{d.descricao}</td>
                      <td>{d.rubrica}</td>
                      <td>{formatCurrency(d.valor)}</td>
                      <td>{new Date(d.dataDespesa).toLocaleDateString("pt-BR")}</td>
                      <td>
                        <span className={`fluxfin-badge ${
                          d.status === "PAGA" ? "bg-success/10 text-success"
                          : d.status === "APROVADA" ? "bg-info/10 text-info"
                          : "bg-warning/10 text-warning"
                        }`}>{d.status}</span>
                      </td>
                      <td>{d.responsavel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.equipe && data.equipe.length > 0 && (
          <div className="bg-white border border-border rounded-lg p-4 text-sm">
            <h4 className="text-sm font-semibold text-foreground mb-3">Equipe do Projeto</h4>
            <div className="space-y-2">
              {data.equipe.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface text-xs">
                  <div>
                    <span className="font-medium text-foreground">{m.nome}</span>
                    <span className="text-muted ml-2">{m.email}</span>
                  </div>
                  <span className="fluxfin-badge bg-primary/10 text-green-800">{m.papel}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.milestones && data.milestones.length > 0 && (
          <div className="bg-white border border-border rounded-lg p-4 text-sm">
            <h4 className="text-sm font-semibold text-foreground mb-3">Marcos</h4>
            <div className="space-y-2">
              {data.milestones.map((m, i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                  m.concluido ? "bg-success/5 border border-success/20" : "bg-surface"
                }`}>
                  <div>
                    <span className="font-medium text-foreground">{m.nome}</span>
                    {m.descricao && <span className="text-muted ml-2">- {m.descricao}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted">
                      {new Date(m.dataPrevista).toLocaleDateString("pt-BR")}
                      {m.dataExecucao && ` → ${new Date(m.dataExecucao).toLocaleDateString("pt-BR")}`}
                    </span>
                    <span className={`fluxfin-badge ${
                      m.concluido ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}>{m.concluido ? "Concluído" : "Pendente"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.documentos && data.documentos.length > 0 && (
          <div className="bg-white border border-border rounded-lg p-4 text-sm">
            <h4 className="text-sm font-semibold text-foreground mb-3">Documentos ({data.documentos.length})</h4>
            <div className="space-y-2">
              {data.documentos.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface text-xs">
                  <div>
                    <span className="font-medium text-foreground">{d.nome}</span>
                    <span className="text-muted ml-2">({d.extensao})</span>
                  </div>
                  <div className="text-muted">
                    {d.autor} - {new Date(d.dataUpload).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

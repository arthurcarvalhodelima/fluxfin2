"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Modal from "@/components/Modal";

interface DespesaRelatorio {
  descricao: string;
  valor: number;
  dataDespesa: string;
  status: string;
  rubrica: { nome: string; categoria: string };
  usuario: { nome: string };
  projeto: { codigo: string; titulo: string };
}

interface DespesasRelatorioPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  despesas: DespesaRelatorio[];
  filtros: {
    projeto: string;
    categoria: string;
    busca: string;
  };
}

const categoriaLabels: Record<string, string> = {
  RECURSOS_HUMANOS: "Recursos Humanos (RH)",
  SERVICOS_TERCEIROS: "Serviços de Terceiros",
  MATERIAIS_CONSUMO: "Materiais de Consumo",
  MATERIAIS_PERMANENTES: "Materiais Permanentes e Equipamentos",
  VIAGENS_DIARIAS: "Viagens e Diárias",
  CUSTOS_ADMINISTRATIVOS: "Custos Administrativos",
};

const statusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  APROVADA: "Aprovada",
  REJEITADA: "Rejeitada",
  PAGA: "Paga",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function generatePDF(despesas: DespesaRelatorio[], filtros: DespesasRelatorioPreviewProps["filtros"]): jsPDF {
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
  doc.text("FluxFin - Relatório de Despesas", pageWidth / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Gerado em: ${new Date().toLocaleDateString("pt-BR")} | ${despesas.length} despesa(s)`,
    pageWidth / 2, y, { align: "center" }
  );
  y += 10;

  doc.setDrawColor(137, 190, 48);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(60);
  const filtrosAtivos: string[] = [];
  if (filtros.projeto) filtrosAtivos.push(`Projeto: ${filtros.projeto}`);
  if (filtros.categoria) filtrosAtivos.push(`Categoria: ${filtros.categoria}`);
  if (filtros.busca) filtrosAtivos.push(`Busca: "${filtros.busca}"`);
  if (filtrosAtivos.length > 0) {
    doc.text(`Filtros: ${filtrosAtivos.join(" | ")}`, 20, y);
    y += 8;
  }

  const totalValor = despesas.reduce((sum, d) => sum + Number(d.valor), 0);
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(`Valor Total: ${formatCurrency(totalValor)}`, 20, y);
  y += 12;

  if (despesas.length > 0) {
    doc.setFontSize(12);
    doc.text(`Despesas (${despesas.length} registros)`, 20, y);
    y += 7;
    autoTable(doc, {
      startY: y,
      head: [["Descrição", "Projeto", "Rubrica", "Categoria", "Valor", "Data", "Status", "Responsável"]],
      body: despesas.map(d => [
        d.descricao.length > 25 ? d.descricao.slice(0, 25) + "..." : d.descricao,
        d.projeto.codigo,
        d.rubrica.nome,
        (categoriaLabels[d.rubrica.categoria] || d.rubrica.categoria).slice(0, 20),
        formatCurrency(d.valor),
        new Date(d.dataDespesa).toLocaleDateString("pt-BR"),
        statusLabels[d.status] || d.status,
        d.usuario.nome,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [137, 190, 48] },
      margin: { left: 20 },
    });
  }

  return doc;
}

export default function DespesasRelatorioPreview({
  isOpen,
  onClose,
  despesas,
  filtros,
}: DespesasRelatorioPreviewProps) {
  const totalValor = despesas.reduce((sum, d) => sum + Number(d.valor), 0);

  const handlePrint = () => {
    const doc = generatePDF(despesas, filtros);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        URL.revokeObjectURL(url);
      };
    } else {
      URL.revokeObjectURL(url);
    }
  };

  const handleDownload = () => {
    const doc = generatePDF(despesas, filtros);
    doc.save(`relatorio-despesas-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleDownloadXLSX = () => {
    const rows = despesas.map(d => ({
      "Descrição": d.descricao,
      "Projeto": d.projeto.codigo,
      "Rubrica": d.rubrica.nome,
      "Categoria": categoriaLabels[d.rubrica.categoria] || d.rubrica.categoria,
      "Valor": Number(d.valor),
      "Data": new Date(d.dataDespesa).toLocaleDateString("pt-BR"),
      "Status": statusLabels[d.status] || d.status,
      "Responsável": d.usuario.nome,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 30 }, { wch: 12 }, { wch: 20 }, { wch: 25 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Despesas");
    XLSX.writeFile(wb, `relatorio-despesas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Relatório de Despesas"
      footer={
        <>
          <button onClick={handleDownload} className="fluxfin-btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Salvar PDF
          </button>
          <button onClick={handleDownloadXLSX} className="fluxfin-btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Salvar XLSX
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
        <div className="bg-white border border-border rounded-lg p-4 text-sm">
          <h3 className="font-bold text-foreground mb-2">Resumo</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-muted text-xs">Total de Despesas</p>
              <p className="font-semibold text-foreground">{despesas.length}</p>
            </div>
            <div>
              <p className="text-muted text-xs">Valor Total</p>
              <p className="font-semibold text-foreground">{formatCurrency(totalValor)}</p>
            </div>
            <div>
              <p className="text-muted text-xs">Filtros Ativos</p>
              <p className="font-semibold text-foreground">
                {filtros.projeto || filtros.categoria || filtros.busca
                  ? [filtros.projeto, filtros.categoria, filtros.busca].filter(Boolean).join(", ")
                  : "Nenhum"}
              </p>
            </div>
          </div>
        </div>

        {despesas.length > 0 && (
          <div className="bg-white border border-border rounded-lg p-4 text-sm">
            <h4 className="text-sm font-semibold text-foreground mb-3">Despesas</h4>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="fluxfin-table text-xs">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Projeto</th>
                    <th>Rubrica</th>
                    <th>Categoria</th>
                    <th>Valor</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {despesas.map((d, i) => (
                    <tr key={i}>
                      <td className="font-medium max-w-[180px] truncate">{d.descricao}</td>
                      <td>{d.projeto.codigo}</td>
                      <td>{d.rubrica.nome}</td>
                      <td className="max-w-[150px] truncate">
                        {categoriaLabels[d.rubrica.categoria] || d.rubrica.categoria}
                      </td>
                      <td>{formatCurrency(d.valor)}</td>
                      <td>{new Date(d.dataDespesa).toLocaleDateString("pt-BR")}</td>
                      <td>
                        <span className={`fluxfin-badge ${
                          d.status === "PAGA" ? "bg-success/10 text-success"
                          : d.status === "APROVADA" ? "bg-info/10 text-info"
                          : d.status === "REJEITADA" ? "bg-danger/10 text-danger"
                          : "bg-warning/10 text-warning"
                        }`}>{statusLabels[d.status] || d.status}</span>
                      </td>
                      <td className="max-w-[120px] truncate">{d.usuario.nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

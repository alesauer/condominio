import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";
import type { DemonstrativoMensalResponse } from "@/services/cobrancas.service";

export interface CalculoApartamentoData {
  apartamentoNumero: string;
  bloco?: string | null;
  responsavelNome: string;
  competenciaFormatada: string;
  vencimento: string;
  status: string;
  dataPagamento?: string | null;
  fracaoAguaFormatada: string;
  fracaoAguaValor: number;
  despesasComuns: Array<{
    descricao: string;
    observacao?: string;
    valorTotal: number;
    valorApto: number;
  }>;
  totalDespesasComunsApto: number;
  agua?: {
    descricao: string;
    valorTotalCopasa: number;
    fracaoAplicada: string;
    valorApto: number;
  };
  gas?: {
    leituraAnterior: number;
    leituraAtual: number;
    m3Usado: number;
    precoM3: number;
    valorApto: number;
  };
  fundoReserva: {
    descricao: string;
    valorApto: number;
  };
  multaJuros?: number;
  totalGeral: number;
  acoesEventos?: Array<{
    titulo: string;
    descricao: string;
    data?: string | null;
  }>;
}

export function exportCalculoApartamentoPDF(calc: CalculoApartamentoData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // ── 1. CABEÇALHO ────────────────────────────────────────────────────────
  doc.setFillColor(15, 44, 89); // Azul corporativo (#0f2c59)
  doc.roundedRect(marginX, 10, contentWidth, 18, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(
    "CONDOMÍNIO RESIDENCIAL MONAZITA",
    pageWidth / 2,
    17,
    { align: "center" }
  );

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `MEMÓRIA DE CÁLCULO E DETALHAMENTO INDIVIDUAL — ${calc.competenciaFormatada.toUpperCase()}`,
    pageWidth / 2,
    23,
    { align: "center" }
  );

  // ── 2. BOX DE IDENTIFICAÇÃO DO APARTAMENTO ─────────────────────────────
  let currentY = 32;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(marginX, currentY, contentWidth, 24, 1.5, 1.5, "FD");

  // Coluna 1: Imóvel e Responsável
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 44, 89);
  doc.text(
    `APARTAMENTO ${calc.apartamentoNumero}${calc.bloco ? ` - ${calc.bloco}` : ""}`,
    marginX + 4,
    currentY + 6
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Responsável: ${calc.responsavelNome}`, marginX + 4, currentY + 11);
  doc.text(
    `Fração Ideal Água: ${calc.fracaoAguaFormatada}  |  Fração Despesas: Rateio Igualitário (1/7)`,
    marginX + 4,
    currentY + 16
  );
  doc.text(
    `Emissão do Extrato: ${new Date().toLocaleDateString("pt-BR")}`,
    marginX + 4,
    currentY + 21
  );

  // Coluna 2: Vencimento, Status e Total
  const col2X = marginX + contentWidth - 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Vencimento: ${calc.vencimento}`, col2X, currentY + 6, { align: "right" });

  const isPago = calc.status.toLowerCase() === "pago";
  const isAtrasado = calc.status.toLowerCase() === "atrasado";
  const statusLabel = isPago
    ? `STATUS: PAGO ${calc.dataPagamento ? `(${calc.dataPagamento})` : ""}`
    : isAtrasado
    ? "STATUS: EM ATRASO"
    : "STATUS: PENDENTE";

  if (isPago) {
    doc.setTextColor(22, 101, 52); // green-800
  } else if (isAtrasado) {
    doc.setTextColor(180, 83, 9); // amber-700
  } else {
    doc.setTextColor(190, 24, 93); // rose-700
  }
  doc.text(statusLabel, col2X, currentY + 11, { align: "right" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 44, 89);
  doc.text(
    `TOTAL: R$ ${calc.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    col2X,
    currentY + 19,
    { align: "right" }
  );

  currentY += 28;

  // ── 3. TABELA 1: DESPESAS ORDINÁRIAS COMPARTILHADAS ────────────────────
  const rowsDespesas = calc.despesasComuns.map((d) => [
    d.descricao + (d.observacao ? ` (${d.observacao})` : ""),
    `R$ ${d.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    "Rateio Igualitário (÷ 7)",
    `R$ ${d.valorApto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  ]);

  rowsDespesas.push([
    "SUBTOTAL DESPESAS ORDINÁRIAS COMUNS",
    "",
    "",
    `R$ ${calc.totalDespesasComunsApto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [
      [
        {
          content: "1. DESPESAS ORDINÁRIAS COMUNS DO CONDOMÍNIO (RATEIO IGUALITÁRIO)",
          colSpan: 4,
          styles: { halign: "left", fillColor: [217, 237, 247], textColor: [15, 44, 89], fontStyle: "bold" },
        },
      ],
      [
        { content: "Item de Despesa", styles: { halign: "left", fontStyle: "bold" } },
        { content: "Total Condomínio", styles: { halign: "right", fontStyle: "bold" } },
        { content: "Critério", styles: { halign: "center", fontStyle: "bold" } },
        { content: "Cota Apto", styles: { halign: "right", fontStyle: "bold" } },
      ],
    ],
    body: rowsDespesas,
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 32, halign: "right" },
      2: { cellWidth: 40, halign: "center" },
      3: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.row.index === rowsDespesas.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [15, 44, 89];
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // ── 4. TABELA 2: RATEIO DE ÁGUA (COPASA - FRAÇÃO IDEAL) ───────────────
  if (calc.agua) {
    const rowsAgua = [
      [
        calc.agua.descricao,
        `R$ ${calc.agua.valorTotalCopasa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `Fração Ideal: ${calc.agua.fracaoAplicada} (R$ ${calc.agua.valorTotalCopasa.toFixed(2)} × ${calc.fracaoAguaValor})`,
        `R$ ${calc.agua.valorApto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [
        [
          {
            content: "2. RATEIO DE ÁGUA (COPASA - POR FRAÇÃO IDEAL)",
            colSpan: 4,
            styles: { halign: "left", fillColor: [224, 242, 254], textColor: [7, 89, 133], fontStyle: "bold" },
          },
        ],
        [
          { content: "Descrição", styles: { halign: "left", fontStyle: "bold" } },
          { content: "Total Conta Copasa", styles: { halign: "right", fontStyle: "bold" } },
          { content: "Fórmula / Fração", styles: { halign: "center", fontStyle: "bold" } },
          { content: "Cota Apto", styles: { halign: "right", fontStyle: "bold" } },
        ],
      ],
      body: rowsAgua,
      styles: {
        fontSize: 7.5,
        cellPadding: 1.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [240, 249, 255],
        textColor: [3, 105, 161],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 32, halign: "right" },
        2: { cellWidth: 60, halign: "center" },
        3: { cellWidth: 30, halign: "right", fontStyle: "bold", textColor: [3, 105, 161] },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;
  }

  // ── 5. TABELA 3: CONSUMO INDIVIDUAL DE GÁS ─────────────────────────────
  if (calc.gas) {
    const rowsGas = [
      [
        `Apto ${calc.apartamentoNumero}`,
        `${calc.gas.leituraAnterior.toFixed(1)} m³`,
        `${calc.gas.leituraAtual.toFixed(1)} m³`,
        `${calc.gas.m3Usado.toFixed(1)} m³`,
        `R$ ${calc.gas.precoM3.toFixed(2).replace(".", ",")}`,
        `R$ ${calc.gas.valorApto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [
        [
          {
            content: "3. CONSUMO INDIVIDUAL DE GÁS (MEDIÇÃO DO MÊS)",
            colSpan: 6,
            styles: { halign: "left", fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: "bold" },
          },
        ],
        [
          { content: "Unidade", styles: { halign: "left", fontStyle: "bold" } },
          { content: "Leitura Anterior", styles: { halign: "right", fontStyle: "bold" } },
          { content: "Leitura Atual", styles: { halign: "right", fontStyle: "bold" } },
          { content: "Consumo m³", styles: { halign: "right", fontStyle: "bold" } },
          { content: "Preço / m³", styles: { halign: "right", fontStyle: "bold" } },
          { content: "Valor Gás", styles: { halign: "right", fontStyle: "bold" } },
        ],
      ],
      body: rowsGas,
      styles: {
        fontSize: 7.5,
        cellPadding: 1.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [255, 251, 235],
        textColor: [180, 83, 9],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 28, halign: "right" },
        2: { cellWidth: 28, halign: "right" },
        3: { cellWidth: 28, halign: "right", fontStyle: "bold" },
        4: { cellWidth: 28, halign: "right" },
        5: { cellWidth: 35, halign: "right", fontStyle: "bold", textColor: [180, 83, 9] },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;
  }

  // ── 6. TABELA 4: RESUMO CONSOLIDADO DA COBRANÇA ────────────────────────
  const rowsResumo = [
    [
      "Despesas Ordinárias Comuns",
      "Rateio igualitário de despesas de operação, manutenção e limpeza",
      `R$ ${calc.totalDespesasComunsApto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ],
    [
      "Rateio de Água (Copasa)",
      `Cota proporcional calculada pela fração ideal (${calc.fracaoAguaFormatada})`,
      `R$ ${(calc.agua?.valorApto || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ],
    [
      "Consumo Individual de Gás",
      calc.gas ? `Medição individual (${calc.gas.m3Usado.toFixed(1)} m³ a R$ ${calc.gas.precoM3.toFixed(2).replace(".", ",")}/m³)` : "Sem consumo apurado",
      `R$ ${(calc.gas?.valorApto || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ],
    [
      "Fundo de Reserva / Obras",
      calc.fundoReserva.descricao,
      `R$ ${calc.fundoReserva.valorApto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ],
  ];

  if (calc.multaJuros && calc.multaJuros > 0) {
    rowsResumo.push([
      "Multa e Juros por Atraso",
      "Acréscimos legais aplicados conforme regimento",
      `R$ ${calc.multaJuros.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ]);
  }

  rowsResumo.push([
    "TOTAL GERAL DO CONDOMÍNIO",
    `Valor total apurado para a competência ${calc.competenciaFormatada}`,
    `R$ ${calc.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [
      [
        {
          content: "4. RESUMO CONSOLIDADO DA COMPOSIÇÃO DO CONDOMÍNIO",
          colSpan: 3,
          styles: { halign: "left", fillColor: [220, 252, 231], textColor: [22, 101, 52], fontStyle: "bold" },
        },
      ],
      [
        { content: "Componente", styles: { halign: "left", fontStyle: "bold" } },
        { content: "Detalhamento / Regra de Cobrança", styles: { halign: "left", fontStyle: "bold" } },
        { content: "Valor", styles: { halign: "right", fontStyle: "bold" } },
      ],
    ],
    body: rowsResumo,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [240, 253, 244],
      textColor: [22, 101, 52],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 87 },
      2: { cellWidth: 35, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.row.index === rowsResumo.length - 1) {
        data.cell.styles.fillColor = [15, 44, 89];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontSize = 9;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // ── 7. SEÇÃO DE COMUNICADOS / AÇÕES REALIZADAS (SE HOUVER) ─────────────
  if (calc.acoesEventos && calc.acoesEventos.length > 0 && currentY < 250) {
    const rowsEventos = calc.acoesEventos.map((ev) => [
      ev.titulo,
      ev.descricao,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [
        [
          {
            content: "5. COMUNICADOS E AÇÕES REALIZADAS NO MÊS",
            colSpan: 2,
            styles: { halign: "left", fillColor: [243, 232, 255], textColor: [107, 33, 168], fontStyle: "bold" },
          },
        ],
      ],
      body: rowsEventos,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        textColor: [51, 65, 85],
        lineColor: [243, 232, 255],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold" },
        1: { cellWidth: 132 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── 8. RODAPÉ DO DOCUMENTO ─────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Extrato gerado pelo Sistema de Gestão Condominial em ${new Date().toLocaleString("pt-BR")} — Página 1 de 1`,
    pageWidth / 2,
    pageHeight - 6,
    { align: "center" }
  );

  const cleanComp = calc.competenciaFormatada.replace("/", "_");
  doc.save(`Calculo_Condominio_Apto_${calc.apartamentoNumero}_${cleanComp}.pdf`);
}

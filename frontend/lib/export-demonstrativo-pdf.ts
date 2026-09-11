import jsPDF from "jspdf";
import autoTable, { type UserOptions, type CellDef } from "jspdf-autotable";
import type { DemonstrativoMensalResponse } from "@/services/cobrancas.service";

export function exportDemonstrativoPDF(data: DemonstrativoMensalResponse) {
  // Configura documento A4 em modo Paisagem (Landscape)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2; // 277mm

  // ── CABEÇALHO DO DOCUMENTO ──────────────────────────────────────────
  doc.setFillColor(15, 44, 89); // Azul corporativo
  doc.rect(marginX, 8, contentWidth, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(
    "CONDOMÍNIO RESIDENCIAL MONAZITA — FECHAMENTO E DEMONSTRATIVO MENSAL",
    pageWidth / 2,
    14,
    { align: "center" }
  );

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `COMPETÊNCIA: ${data.competencia_formatada.toUpperCase()}  |  EMISSÃO: ${new Date().toLocaleDateString("pt-BR")}`,
    pageWidth / 2,
    19,
    { align: "center" }
  );

  let currentY = 25;

  const aptos = data.apartamentos_header || [];
  const aptosNumeros = aptos.map((a) => `Apto ${a.numero}`);

  // ── SEÇÃO 1: DESPESAS DO MÊS ────────────────────────────────────────
  const headDespesas: CellDef[][] = [
    [
      {
        content: "1. DESPESAS DO MÊS",
        colSpan: 3 + aptos.length,
        styles: {
          halign: "left",
          fillColor: [217, 237, 247],
          textColor: [15, 44, 89],
          fontStyle: "bold",
        },
      },
    ],
    [
      { content: "Descrição da Despesa", styles: { halign: "left", fontStyle: "bold" } },
      { content: "Obs / Venc.", styles: { halign: "left", fontStyle: "bold" } },
      { content: "Total (R$)", styles: { halign: "right", fontStyle: "bold" } },
      ...aptosNumeros.map((num) => ({
        content: num,
        styles: { halign: "right" as const, fontStyle: "bold" as const },
      })),
    ],
  ];

  const bodyDespesas = data.despesas_itens.map((item) => [
    item.descricao,
    item.observacao || "—",
    Number(item.valor).toFixed(2).replace(".", ","),
    ...aptos.map((a) =>
      Number(item.rateio_por_apto[a.numero] || 0)
        .toFixed(2)
        .replace(".", ",")
    ),
  ]);

  const footDespesas: CellDef[][] = [
    [
      {
        content: "TOTAL DAS DESPESAS DO MÊS:",
        colSpan: 2,
        styles: { fontStyle: "bold", halign: "left" },
      },
      {
        content: `R$ ${Number(data.total_despesas_mes).toFixed(2).replace(".", ",")}`,
        styles: { fontStyle: "bold", halign: "right" },
      },
      ...aptos.map((a) => ({
        content: `R$ ${Number(data.total_despesas_por_apto[a.numero] || 0).toFixed(2).replace(".", ",")}`,
        styles: { fontStyle: "bold" as const, halign: "right" as const },
      })),
    ],
  ];

  const optDespesas: UserOptions = {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: headDespesas,
    body: bodyDespesas,
    foot: footDespesas,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      textColor: [30, 30, 30],
      lineColor: [200, 210, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [235, 243, 250],
      textColor: [15, 44, 89],
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [225, 238, 248],
      textColor: [10, 30, 70],
      fontStyle: "bold",
    },
  };

  autoTable(doc, optDespesas);

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // ── SEÇÃO 2: FUNDO DE RESERVA / OUTRAS DESPESAS ─────────────────────
  const fundoRateioCols = aptos.map((a) =>
    Number(data.fundo_reserva.rateio_por_apto[a.numero] || data.fundo_reserva.valor_unitario)
      .toFixed(2)
      .replace(".", ",")
  );

  const headFundo: CellDef[][] = [
    [
      {
        content: "2. FUNDO DE RESERVA / OUTRAS DESPESAS",
        colSpan: 3 + aptos.length,
        styles: { halign: "left", fillColor: [240, 240, 245], textColor: [40, 40, 60], fontStyle: "bold" },
      },
    ],
    [
      { content: "Descrição", styles: { halign: "left", fontStyle: "bold" } },
      { content: "Obs / Fixo", styles: { halign: "left", fontStyle: "bold" } },
      { content: "Total (R$)", styles: { halign: "right", fontStyle: "bold" } },
      ...aptosNumeros.map((num) => ({
        content: num,
        styles: { halign: "right" as const, fontStyle: "bold" as const },
      })),
    ],
  ];

  const optFundo: UserOptions = {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: headFundo,
    body: [
      [
        data.fundo_reserva.descricao,
        "Fixo p/ unidade",
        `R$ ${Number(data.fundo_reserva.valor_total).toFixed(2).replace(".", ",")}`,
        ...fundoRateioCols.map((val) => `R$ ${val}`),
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      textColor: [30, 30, 30],
      lineColor: [200, 210, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [245, 245, 250],
      textColor: [40, 40, 60],
      fontStyle: "bold",
    },
  };

  autoTable(doc, optFundo);

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // ── SEÇÃO 3: VALOR TOTAL A PAGAR DOS MORADORES E PROPRIETÁRIOS ───────
  const bodyMoradores = data.cobrancas_moradores.map((c) => [
    `Apto ${c.apartamento_numero}`,
    c.responsavel_nome,
    `R$ ${Number(c.valor_a_pagar).toFixed(2).replace(".", ",")}`,
    c.vencimento ? new Date(c.vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—",
    c.status === "pago"
      ? `PAGO (${c.confirmacao_pgto || "OK"})`
      : "PENDENTE",
  ]);

  const headMoradores: CellDef[][] = [
    [
      {
        content: "3. VALOR TOTAL A PAGAR DOS MORADORES E PROPRIETÁRIOS",
        colSpan: 5,
        styles: { halign: "left", fillColor: [217, 237, 247], textColor: [15, 44, 89], fontStyle: "bold" },
      },
    ],
    [
      { content: "Apartamento", styles: { halign: "left", fontStyle: "bold", cellWidth: 35 } },
      { content: "Responsável", styles: { halign: "left", fontStyle: "bold", cellWidth: 100 } },
      { content: "Valor a Pagar", styles: { halign: "right", fontStyle: "bold", cellWidth: 45 } },
      { content: "Vencimento", styles: { halign: "center", fontStyle: "bold", cellWidth: 40 } },
      { content: "Confirmação Pgto", styles: { halign: "center", fontStyle: "bold", cellWidth: 57 } },
    ],
  ];

  const optMoradores: UserOptions = {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: headMoradores,
    body: bodyMoradores,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      textColor: [30, 30, 30],
      lineColor: [200, 210, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [235, 243, 250],
      textColor: [15, 44, 89],
      fontStyle: "bold",
    },
  };

  autoTable(doc, optMoradores);

  currentY = (doc as any).lastAutoTable.finalY + 2;

  // Faixa de Vencimento e Juros
  const vencStr = data.vencimento_padrao
    ? new Date(data.vencimento_padrao + "T00:00:00").toLocaleDateString("pt-BR")
    : `10/${data.competencia.split("-")[1]}/${data.competencia.split("-")[0]}`;

  const msgVenc =
    data.mensagem_vencimento ||
    `VENCIMENTO: ${vencStr}. APÓS ESSA DATA, O PAGAMENTO ACARRETARÁ JUROS E MULTA CONFORME ESTABELECIDO NA CONVENÇÃO DO CONDOMÍNIO.`;

  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(252, 165, 165);
  doc.rect(marginX, currentY, contentWidth, 5.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(185, 28, 28);
  doc.text(
    msgVenc,
    pageWidth / 2,
    currentY + 3.8,
    { align: "center", maxWidth: contentWidth - 4 }
  );

  currentY += 8;

  // Se o espaço restante na página for menor que 40mm, adiciona nova página
  if (currentY > 155) {
    doc.addPage("a4", "landscape");
    currentY = 12;
  }

  // ── SEÇÃO 4: AÇÕES / EVENTOS REALIZADOS NO MÊS ───────────────────────
  const bodyAcoes =
    data.acoes_eventos.length === 0
      ? [["Nenhum comunicado extraordinário registrado para este mês.", "—"]]
      : data.acoes_eventos.map((ev) => [ev.titulo, ev.descricao]);

  const headAcoes: CellDef[][] = [
    [
      {
        content: "4. AÇÕES / EVENTOS REALIZADOS NO MÊS",
        colSpan: 2,
        styles: { halign: "left", fillColor: [240, 240, 245], textColor: [40, 40, 60], fontStyle: "bold" },
      },
    ],
    [
      { content: "Ação / Evento", styles: { halign: "left", fontStyle: "bold", cellWidth: 80 } },
      { content: "Descrição dos Serviços / Comunicados", styles: { halign: "left", fontStyle: "bold" } },
    ],
  ];

  const optAcoes: UserOptions = {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: headAcoes,
    body: bodyAcoes,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      textColor: [30, 30, 30],
      lineColor: [200, 210, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [245, 245, 250],
      textColor: [40, 40, 60],
      fontStyle: "bold",
    },
  };

  autoTable(doc, optAcoes);

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // Se o espaço for insuficiente para o grid duplo da seção 5, cria página
  if (currentY > 140) {
    doc.addPage("a4", "landscape");
    currentY = 12;
  }

  // ── SEÇÃO 5: OUTRAS INFORMAÇÕES (GRID DUPLO) ─────────────────────────
  const halfWidth = (contentWidth - 4) / 2; // ~136.5mm

  const bodyFracoes = data.fracoes_agua.map((f) => [
    f.descricao,
    f.percentual_formatado,
  ]);

  const headFracoes: CellDef[][] = [
    [
      {
        content: "5.1. FRAÇÃO DE UTILIZAÇÃO DE ÁGUA",
        colSpan: 2,
        styles: { halign: "center", fillColor: [217, 237, 247], textColor: [15, 44, 89], fontStyle: "bold" },
      },
    ],
    [
      { content: "Apartamentos", styles: { halign: "left", fontStyle: "bold" } },
      { content: "Fração Ideal", styles: { halign: "right", fontStyle: "bold" } },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX + halfWidth + 4 },
    tableWidth: halfWidth,
    head: headFracoes,
    body: bodyFracoes,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [200, 210, 225],
      lineWidth: 0.15,
    },
  });

  const finalYAgua = (doc as any).lastAutoTable.finalY;

  // Sub-tabela 5.2: Troca do Gás (logo abaixo da água no lado esquerdo)
  const headTrocaGas: CellDef[][] = [
    [
      {
        content: "5.2. TROCA DO GÁS",
        colSpan: 2,
        styles: { halign: "center", fillColor: [240, 240, 245], textColor: [40, 40, 60], fontStyle: "bold" },
      },
    ],
  ];

  const bodyTrocaGas: (string | CellDef)[][] = [
    [
      `Última Troca: ${data.gas.troca_gas.ultima_troca || "08/2026"}`,
      `Previsão Próxima: ${data.gas.troca_gas.previsao_proxima_troca || "11/2026"}`,
    ],
    [
      {
        content: data.gas.troca_gas.observacao || "Aquisição e rateio conforme consumo.",
        colSpan: 2,
        styles: { fontStyle: "italic", fontSize: 6.5 },
      },
    ],
  ];

  autoTable(doc, {
    startY: finalYAgua + 2,
    margin: { left: marginX, right: marginX + halfWidth + 4 },
    tableWidth: halfWidth,
    head: headTrocaGas,
    body: bodyTrocaGas,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [200, 210, 225],
      lineWidth: 0.15,
    },
  });

  // Sub-tabela 5.3: Leitura e Medição do Gás (lado direito)
  const bodyGas = data.gas.leituras.map((g) => [
    `Apto ${g.apartamento_numero}`,
    g.leitura_anterior.toFixed(1),
    g.leitura_atual.toFixed(1),
    g.m3_usado.toFixed(1),
    `R$ ${Number(g.valor_a_pagar).toFixed(2).replace(".", ",")}`,
  ]);

  const footGas: CellDef[][] = [
    [
      { content: "TOTAL:", colSpan: 3, styles: { fontStyle: "bold", halign: "left" } },
      { content: `${Number(data.gas.total_m3).toFixed(1)} m³`, styles: { fontStyle: "bold", halign: "right" } },
      { content: `R$ ${Number(data.gas.total_valor).toFixed(2).replace(".", ",")}`, styles: { fontStyle: "bold", halign: "right" } },
    ],
  ];

  const headGas: CellDef[][] = [
    [
      {
        content: `5.3. LEITURA DO GÁS (R$ ${Number(data.gas.preco_m3).toFixed(2).replace(".", ",")} / m³)`,
        colSpan: 5,
        styles: { halign: "center", fillColor: [254, 243, 199], textColor: [120, 53, 15], fontStyle: "bold" },
      },
    ],
    [
      { content: "Apto", styles: { halign: "left", fontStyle: "bold" } },
      { content: "Anterior", styles: { halign: "right", fontStyle: "bold" } },
      { content: "Atual", styles: { halign: "right", fontStyle: "bold" } },
      { content: "m³ Usado", styles: { halign: "right", fontStyle: "bold" } },
      { content: "Valor (R$)", styles: { halign: "right", fontStyle: "bold" } },
    ],
  ];

  const optGas: UserOptions = {
    startY: currentY,
    margin: { left: marginX + halfWidth + 4, right: marginX },
    tableWidth: halfWidth,
    head: headGas,
    body: bodyGas,
    foot: footGas,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [200, 210, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [254, 243, 199],
      textColor: [120, 53, 15],
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [253, 230, 138],
      textColor: [120, 53, 15],
      fontStyle: "bold",
    },
  };

  autoTable(doc, optGas);

  // ── RODAPÉ COM NUMERAÇÃO DE PÁGINAS ─────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Página ${i} de ${pageCount}  —  Sistema de Gestão Condominial Monazita  —  Demonstrativo Mensal`,
      pageWidth / 2,
      205,
      { align: "center" }
    );
  }

  // Gera e faz download do arquivo
  const filename = `Demonstrativo_Condominio_${data.competencia.replace("-", "_")}.pdf`;
  doc.save(filename);
}

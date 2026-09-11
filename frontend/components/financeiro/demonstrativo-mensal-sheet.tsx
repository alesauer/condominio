"use client";

import React, { useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Printer,
  Download,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Sparkles,
  FileDown,
} from "lucide-react";
import {
  useSalvarAcoesEventos,
  useDeleteAcaoEvento,
  type DemonstrativoMensalResponse,
} from "@/services/cobrancas.service";
import { exportDemonstrativoPDF } from "@/lib/export-demonstrativo-pdf";
import { toast } from "sonner";

interface DemonstrativoMensalSheetProps {
  data?: DemonstrativoMensalResponse;
  isLoading: boolean;
  onRefresh?: () => void;
}

export function DemonstrativoMensalSheet({
  data,
  isLoading,
  onRefresh,
}: DemonstrativoMensalSheetProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItems, setEditItems] = useState<
    Array<{ id?: string; titulo: string; descricao: string; data?: string }>
  >([]);

  const salvarAcoesMut = useSalvarAcoesEventos();
  const deleteAcaoMut = useDeleteAcaoEvento();

  const handleOpenModal = () => {
    if (data?.acoes_eventos && data.acoes_eventos.length > 0) {
      setEditItems(
        data.acoes_eventos.map((a) => ({
          id: a.id,
          titulo: a.titulo,
          descricao: a.descricao,
          data: a.data || data.competencia,
        }))
      );
    } else {
      setEditItems([
        {
          titulo: "",
          descricao: "",
          data: data?.competencia || "",
        },
      ]);
    }
    setModalOpen(true);
  };

  const handleAddRow = () => {
    setEditItems((prev) => [
      ...prev,
      {
        titulo: "",
        descricao: "",
        data: data?.competencia || "",
      },
    ]);
  };

  const handleRemoveRow = async (index: number) => {
    const item = editItems[index];
    if (item.id && data?.competencia) {
      try {
        await deleteAcaoMut.mutateAsync({ id: item.id, competencia: data.competencia });
        toast.success("Ação/evento excluído com sucesso.");
        if (onRefresh) onRefresh();
      } catch {
        toast.error("Erro ao excluir item.");
      }
    }
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAcoes = async () => {
    if (!data?.competencia) return;
    const validItems = editItems.filter((i) => i.titulo.trim() && i.descricao.trim());
    try {
      await salvarAcoesMut.mutateAsync({
        competencia: data.competencia,
        acoes_eventos: validItems,
      });
      toast.success("Ações e eventos atualizados com sucesso!");
      setModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao salvar ações e eventos.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    if (!data) return;
    try {
      exportDemonstrativoPDF(data);
      toast.success("PDF profissional gerado e baixado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  };

  const handleExportCSV = () => {
    if (!data) return;

    const rows: string[][] = [];

    // Header
    rows.push([`DEMONSTRATIVO MENSAL DE COBRANCAS - ${data.competencia_formatada.toUpperCase()}`]);
    rows.push([]);

    // 1. Despesas
    const aptosNumeros = data.apartamentos_header.map((a) => a.numero);
    rows.push(["1. DESPESAS DO MES"]);
    rows.push(["Despesa", "Observacao", "Valor", ...aptosNumeros]);

    data.despesas_itens.forEach((item) => {
      const aptoCols = aptosNumeros.map((num) =>
        (item.rateio_por_apto[num] || 0).toFixed(2).replace(".", ",")
      );
      rows.push([
        `"${item.descricao.replace(/"/g, '""')}"`,
        `"${item.observacao.replace(/"/g, '""')}"`,
        item.valor.toFixed(2).replace(".", ","),
        ...aptoCols,
      ]);
    });

    const totCols = aptosNumeros.map((num) =>
      (data.total_despesas_por_apto[num] || 0).toFixed(2).replace(".", ",")
    );
    rows.push(["TOTAL DAS DESPESAS DO MES:", "", data.total_despesas_mes.toFixed(2).replace(".", ","), ...totCols]);
    rows.push([]);

    // 2. Fundo Reserva
    rows.push(["2. FUNDO DE RESERVA / OUTRAS DESPESAS"]);
    rows.push(["Descricao", "Valor Total", ...aptosNumeros.map((n) => `Apto ${n}`)]);
    const fundoAptoCols = aptosNumeros.map((num) =>
      (data.fundo_reserva.rateio_por_apto[num] || 0).toFixed(2).replace(".", ",")
    );
    rows.push([
      `"${data.fundo_reserva.descricao.replace(/"/g, '""')}"`,
      data.fundo_reserva.valor_total.toFixed(2).replace(".", ","),
      ...fundoAptoCols,
    ]);
    rows.push([]);

    // 3. Valor a Pagar
    rows.push(["3. VALOR TOTAL A PAGAR DOS MORADORES E PROPRIETARIOS"]);
    rows.push(["Apartamento", "Responsavel", "Valor a Pagar", "Vencimento", "Confirmacao Pgto"]);
    data.cobrancas_moradores.forEach((c) => {
      rows.push([
        `Apto ${c.apartamento_numero}`,
        `"${c.responsavel_nome.replace(/"/g, '""')}"`,
        c.valor_a_pagar.toFixed(2).replace(".", ","),
        c.vencimento,
        c.confirmacao_pgto || (c.status === "pago" ? "PAGO" : "PENDENTE"),
      ]);
    });
    rows.push([]);

    // 4. Gas
    rows.push([`4. LEITURA DO GAS (R$ ${data.gas.preco_m3.toFixed(2).replace(".", ",")} o M3)`]);
    rows.push(["Apartamento", "Mes Anterior", "Mes Atual", "M3 Usado", "Valor a Pagar"]);
    data.gas.leituras.forEach((g) => {
      rows.push([
        `Apto ${g.apartamento_numero}`,
        g.leitura_anterior.toFixed(2).replace(".", ","),
        g.leitura_atual.toFixed(2).replace(".", ","),
        g.m3_usado.toFixed(2).replace(".", ","),
        g.valor_a_pagar.toFixed(2).replace(".", ","),
      ]);
    });

    const csvContent = "\uFEFF" + rows.map((e) => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Demonstrativo_Cobrancas_${data.competencia_formatada.replace("/", "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">
        <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-60" />
        <p>Nenhum dado financeiro encontrado para o mês selecionado.</p>
      </div>
    );
  }

  const aptos = data.apartamentos_header;

  return (
    <div className="space-y-4">
      {/* Barra de Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden bg-card p-3 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">
            Demonstrativo de Fechamento —{" "}
            <span className="text-primary capitalize">{data.competencia_formatada}</span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1.5" /> Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" /> Imprimir (Paisagem)
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportPDF}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <FileDown className="h-4 w-4 mr-1.5" /> Salvar PDF
          </Button>
        </div>
      </div>

      {/* Folha de Demonstrativo Mensal (Estilo Planilha) */}
      <div
        ref={printRef}
        className="demonstrativo-print-area bg-card text-card-foreground border rounded-lg shadow-sm p-4 sm:p-6 space-y-6 overflow-x-auto text-xs sm:text-sm font-sans"
      >
        {/* CABEÇALHO DO DOCUMENTO */}
        <div className="text-center pb-3 border-b-2 border-primary/20">
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-primary">
            Condomínio Edifício Monazita
          </h1>
          <p className="text-xs text-muted-foreground uppercase font-medium">
            Demonstrativo Mensal de Cobranças / Prestação de Contas —{" "}
            <span className="font-bold text-foreground">{data.competencia_formatada}</span>
          </p>
        </div>

        {/* ── SEÇÃO 1: DESPESAS DO MÊS ─────────────────────────────────── */}
        <div className="space-y-1">
          <div className="bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-200 px-3 py-1.5 font-bold text-center uppercase tracking-wide rounded-t">
            Despesas do Mês
          </div>
          <div className="border border-sky-300 dark:border-sky-800 rounded-b overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
              <thead>
                <tr className="bg-sky-50 dark:bg-sky-950/40 border-b border-sky-200 dark:border-sky-800 font-semibold text-foreground">
                  <th className="p-2 border-r border-sky-200 dark:border-sky-800 min-w-[140px]">Despesa</th>
                  <th className="p-2 border-r border-sky-200 dark:border-sky-800 min-w-[130px]">Observação</th>
                  <th className="p-2 border-r border-sky-200 dark:border-sky-800 text-right min-w-[80px]">Valor</th>
                  {aptos.map((a) => (
                    <th
                      key={a.id}
                      className="p-2 border-r border-sky-200 dark:border-sky-800 text-right min-w-[70px] last:border-r-0"
                    >
                      {a.numero}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.despesas_itens.length === 0 ? (
                  <tr>
                    <td colSpan={3 + aptos.length} className="p-4 text-center text-muted-foreground italic">
                      Nenhuma despesa lançada nesta competência.
                    </td>
                  </tr>
                ) : (
                  data.despesas_itens.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="border-b border-sky-100 dark:border-sky-900/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-2 font-medium border-r border-sky-100 dark:border-sky-900/50">{item.descricao}</td>
                      <td className="p-2 text-muted-foreground border-r border-sky-100 dark:border-sky-900/50">
                        {item.observacao || "—"}
                      </td>
                      <td className="p-2 text-right font-semibold border-r border-sky-100 dark:border-sky-900/50">
                        {formatCurrency(item.valor)}
                      </td>
                      {aptos.map((a) => (
                        <td
                          key={a.id}
                          className="p-2 text-right border-r border-sky-100 dark:border-sky-900/50 last:border-r-0"
                        >
                          {formatCurrency(item.rateio_por_apto[a.numero] || 0)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-sky-100/70 dark:bg-sky-950/70 font-bold border-t-2 border-sky-300 dark:border-sky-800">
                  <td colSpan={2} className="p-2 text-left uppercase text-sky-950 dark:text-sky-200 border-r border-sky-200 dark:border-sky-800">
                    Total das Despesas do Mês:
                  </td>
                  <td className="p-2 text-right text-sky-950 dark:text-sky-200 border-r border-sky-200 dark:border-sky-800">
                    {formatCurrency(data.total_despesas_mes)}
                  </td>
                  {aptos.map((a) => (
                    <td
                      key={a.id}
                      className="p-2 text-right text-sky-950 dark:text-sky-200 border-r border-sky-200 dark:border-sky-800 last:border-r-0"
                    >
                      {formatCurrency(data.total_despesas_por_apto[a.numero] || 0)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── SEÇÃO 2: FUNDO DE RESERVA / OUTRAS DESPESAS ─────────────── */}
        <div className="space-y-1">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 px-3 py-1 font-bold text-center uppercase tracking-wide rounded-t text-xs">
            Fundo Reserva / Outras Despesas
          </div>
          <div className="border border-slate-300 dark:border-slate-800 rounded-b overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 min-w-[270px]">Descrição</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right min-w-[80px]">Valor</th>
                  {aptos.map((a) => (
                    <th
                      key={a.id}
                      className="p-2 border-r border-slate-200 dark:border-slate-800 text-right min-w-[70px] last:border-r-0"
                    >
                      Apto {a.numero}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 font-medium border-r border-slate-200 dark:border-slate-800">
                    {data.fundo_reserva.descricao}
                  </td>
                  <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800">
                    {formatCurrency(data.fundo_reserva.valor_total)}
                  </td>
                  {aptos.map((a) => (
                    <td
                      key={a.id}
                      className="p-2 text-right border-r border-slate-200 dark:border-slate-800 last:border-r-0 font-medium"
                    >
                      {formatCurrency(data.fundo_reserva.rateio_por_apto[a.numero] || data.fundo_reserva.valor_unitario)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SEÇÃO 3: VALOR TOTAL A PAGAR DOS MORADORES E PROPRIETÁRIOS ─ */}
        <div className="space-y-1">
          <div className="bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-200 px-3 py-1.5 font-bold text-center uppercase tracking-wide rounded-t">
            Valor Total a Pagar dos Moradores e Proprietários
          </div>
          <div className="border border-blue-300 dark:border-blue-800 rounded-b overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
              <thead>
                <tr className="bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800 font-semibold">
                  <th className="p-2.5 border-r border-blue-200 dark:border-blue-800 w-[120px]">APARTAMENTO</th>
                  <th className="p-2.5 border-r border-blue-200 dark:border-blue-800 min-w-[200px]">RESPONSÁVEL</th>
                  <th className="p-2.5 border-r border-blue-200 dark:border-blue-800 text-right min-w-[110px]">
                    Valor a pagar:
                  </th>
                  <th className="p-2.5 border-r border-blue-200 dark:border-blue-800 text-center min-w-[100px]">
                    Vencimento
                  </th>
                  <th className="p-2.5 text-center min-w-[130px]">Confirmação pgto:</th>
                </tr>
              </thead>
              <tbody>
                {data.cobrancas_moradores.map((c) => {
                  const isPago = c.status === "pago";
                  return (
                    <tr
                      key={c.apartamento_id}
                      className="border-b border-blue-100 dark:border-blue-900/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-2.5 font-bold border-r border-blue-100 dark:border-blue-900/50 text-foreground">
                        {c.apartamento_numero}
                      </td>
                      <td className="p-2.5 font-medium uppercase border-r border-blue-100 dark:border-blue-900/50 text-foreground">
                        {c.responsavel_nome}
                      </td>
                      <td className="p-2.5 text-right font-black text-sm border-r border-blue-100 dark:border-blue-900/50 text-rose-600 dark:text-rose-400">
                        {formatCurrency(c.valor_a_pagar)}
                      </td>
                      <td className="p-2.5 text-center font-medium border-r border-blue-100 dark:border-blue-900/50 text-foreground">
                        {c.vencimento ? new Date(c.vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="p-2.5 text-center">
                        {isPago ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[10px]"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {c.confirmacao_pgto || "PAGO"}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[10px]"
                          >
                            <Clock className="h-3 w-3" />
                            PENDENTE
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Aviso de Vencimento e Juros */}
          <div className="py-2.5 px-3 text-center text-xs font-bold italic tracking-wide text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded mt-1">
            VENCIMENTO:{" "}
            <span className="underline">
              {data.vencimento_padrao
                ? new Date(data.vencimento_padrao + "T00:00:00").toLocaleDateString("pt-BR")
                : "10/" + data.competencia.split("-")[1] + "/" + data.competencia.split("-")[0]}
            </span>
            . APÓS ESSA DATA, O PAGAMENTO ACARRETARÁ JUROS E MULTA CONFORME ESTABELECIDO NA CONVENÇÃO DO CONDOMÍNIO.
          </div>
        </div>

        {/* ── SEÇÃO 4: AÇÕES/EVENTOS REALIZADOS NO MÊS ─────────────────── */}
        <div className="space-y-1">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 px-3 py-1 font-bold flex items-center justify-between uppercase tracking-wide rounded-t text-xs">
            <div className="flex-1 text-center">Ações / Eventos Realizados no Mês</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenModal}
              className="h-6 text-[11px] gap-1 px-2.5 print:hidden bg-background text-primary hover:text-primary hover:bg-primary/10 shadow-xs border-slate-300 dark:border-slate-700"
            >
              <Plus className="h-3 w-3" /> Gerenciar Ações
            </Button>
          </div>
          <div className="border border-slate-300 dark:border-slate-800 rounded-b overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <th className="p-2 border-r border-slate-200 dark:border-slate-800 w-[240px]">AÇÃO / EVENTO</th>
                  <th className="p-2">DESCRIÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {data.acoes_eventos.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-3 text-center text-muted-foreground italic">
                      Nenhum comunicado ou evento extraordinário registrado no mês.
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleOpenModal}
                        className="text-xs text-primary p-0 ml-2 print:hidden h-auto"
                      >
                        + Adicionar Ação
                      </Button>
                    </td>
                  </tr>
                ) : (
                  data.acoes_eventos.map((ev, idx) => (
                    <tr key={ev.id || idx} className="border-b border-slate-100 dark:border-slate-900/50 last:border-b-0">
                      <td className="p-2 font-semibold border-r border-slate-200 dark:border-slate-800 text-foreground">
                        {ev.titulo}
                      </td>
                      <td className="p-2 text-muted-foreground">{ev.descricao}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SEÇÃO 5: OUTRAS INFORMAÇÕES (GRID DUPLO) ─────────────────── */}
        <div className="space-y-1">
          <div className="bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-200 px-3 py-1.5 font-bold text-center uppercase tracking-wide rounded-t">
            Outras Informações
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-sky-300 dark:border-sky-800 rounded-b bg-muted/10">
            {/* Bloco Esquerdo: Fração Água + Troca do Gás */}
            <div className="space-y-3">
              {/* Tabela de Frações de Água */}
              <div className="border border-sky-200 dark:border-sky-800 rounded overflow-hidden">
                <div className="bg-sky-50 dark:bg-sky-950/40 p-1.5 text-center font-bold text-xs uppercase border-b border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-200">
                  Fração de Utilização de Água dos Apartamentos
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {data.fracoes_agua.map((f, i) => (
                      <tr key={i} className="border-b border-sky-100 dark:border-sky-900/40 last:border-b-0">
                        <td className="p-2 font-medium border-r border-sky-100 dark:border-sky-900/40">{f.descricao}</td>
                        <td className="p-2 text-right font-mono font-bold text-primary">{f.percentual_formatado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bloco de Troca do Gás */}
              <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-900 p-1.5 text-center font-bold text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                  Troca do Gás
                </div>
                <div className="p-2 space-y-2 text-xs">
                  <div className="grid grid-cols-2 text-center gap-2 border-b pb-2">
                    <div className="p-1.5 bg-muted/40 rounded border">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Última Troca</span>
                      <span className="font-bold text-foreground">{data.gas.troca_gas.ultima_troca || "08/2026"}</span>
                    </div>
                    <div className="p-1.5 bg-muted/40 rounded border">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Previsão Próxima Troca</span>
                      <span className="font-bold text-foreground">{data.gas.troca_gas.previsao_proxima_troca || "11/2026"}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed italic text-[11px]">
                    {data.gas.troca_gas.observacao}
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco Direito: Leitura do Gás */}
            <div className="border border-amber-200 dark:border-amber-800 rounded overflow-hidden flex flex-col">
              <div className="bg-amber-100/80 dark:bg-amber-950/60 p-1.5 font-bold text-xs uppercase border-b border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 flex justify-between items-center">
                <span>Leitura do Gás</span>
                <span className="font-mono text-[11px] font-normal">
                  R$ {data.gas.preco_m3.toFixed(2).replace(".", ",")} o M³
                </span>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-[11px] sm:text-xs">
                  <thead>
                    <tr className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 font-semibold text-foreground">
                      <th className="p-1.5 border-r border-amber-200 dark:border-amber-800">Apt. / Medição</th>
                      <th className="p-1.5 border-r border-amber-200 dark:border-amber-800 text-right">Mês Anterior</th>
                      <th className="p-1.5 border-r border-amber-200 dark:border-amber-800 text-right">Mês Atual</th>
                      <th className="p-1.5 border-r border-amber-200 dark:border-amber-800 text-right">M³ Usado</th>
                      <th className="p-1.5 text-right font-bold">Valor a pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.gas.leituras.map((g) => (
                      <tr
                        key={g.apartamento_numero}
                        className="border-b border-amber-100 dark:border-amber-900/40 hover:bg-muted/30"
                      >
                        <td className="p-1.5 font-bold border-r border-amber-100 dark:border-amber-900/40 text-foreground">
                          Apto {g.apartamento_numero}
                        </td>
                        <td className="p-1.5 text-right border-r border-amber-100 dark:border-amber-900/40 text-muted-foreground">
                          {g.leitura_anterior.toFixed(1)}
                        </td>
                        <td className="p-1.5 text-right border-r border-amber-100 dark:border-amber-900/40 font-medium">
                          {g.leitura_atual.toFixed(1)}
                        </td>
                        <td className="p-1.5 text-right font-semibold border-r border-amber-100 dark:border-amber-900/40">
                          {g.m3_usado.toFixed(1)}
                        </td>
                        <td className="p-1.5 text-right font-bold text-amber-700 dark:text-amber-400">
                          {formatCurrency(g.valor_a_pagar)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-100/70 dark:bg-amber-950/70 font-bold border-t border-amber-300 dark:border-amber-800">
                      <td colSpan={3} className="p-1.5 uppercase text-amber-950 dark:text-amber-200">
                        Total Gás:
                      </td>
                      <td className="p-1.5 text-right font-bold text-amber-950 dark:text-amber-200">
                        {data.gas.total_m3.toFixed(1)} m³
                      </td>
                      <td className="p-1.5 text-right font-bold text-amber-950 dark:text-amber-200">
                        {formatCurrency(data.gas.total_valor)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Gerenciamento de Ações e Eventos do Mês */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Ações / Eventos Realizados no Mês
            </DialogTitle>
            <DialogDescription>
              Adicione ou edite os comunicados, manutenções e eventos extraordinários para {data.competencia_formatada}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Lista de Ações e Eventos
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-8 gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Linha
              </Button>
            </div>

            {editItems.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded bg-muted/20 text-xs text-muted-foreground">
                Nenhum evento na lista. Clique em &quot;Adicionar Linha&quot; para inserir.
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {editItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-card/80 space-y-2.5 shadow-sm relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">Data (Opcional)</Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={item.data || ""}
                            onChange={(e) => {
                              const copy = [...editItems];
                              copy[idx].data = e.target.value;
                              setEditItems(copy);
                            }}
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            Ação / Evento Realizado <span className="text-rose-500">*</span>
                          </Label>
                          <Input
                            placeholder="Ex: Manutenção Portão Eletrônico"
                            className="h-8 text-xs"
                            value={item.titulo}
                            onChange={(e) => {
                              const copy = [...editItems];
                              copy[idx].titulo = e.target.value;
                              setEditItems(copy);
                            }}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 mt-4"
                        onClick={() => handleRemoveRow(idx)}
                        title="Remover linha"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">
                        Descrição Detalhada <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        placeholder="Ex: Realizada troca das molas e lubrificação das guias."
                        className="h-8 text-xs"
                        value={item.descricao}
                        onChange={(e) => {
                          const copy = [...editItems];
                          copy[idx].descricao = e.target.value;
                          setEditItems(copy);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveAcoes}
              disabled={salvarAcoesMut.isPending}
            >
              {salvarAcoesMut.isPending ? "Salvando..." : "Salvar Ações e Eventos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

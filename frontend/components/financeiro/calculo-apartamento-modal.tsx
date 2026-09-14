"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Building2,
  Calendar,
  Droplets,
  Flame,
  ShieldCheck,
  Receipt,
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Info,
  Layers,
} from "lucide-react";
import {
  useDemonstrativoMensal,
  type DemonstrativoMensalResponse,
} from "@/services/cobrancas.service";
import {
  exportCalculoApartamentoPDF,
  type CalculoApartamentoData,
} from "@/lib/export-calculo-apartamento-pdf";
import { toast } from "sonner";

interface CalculoApartamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartamentoNumero: string | null;
  competencia?: string;
  demonstrativoData?: DemonstrativoMensalResponse;
}

export function CalculoApartamentoModal({
  open,
  onOpenChange,
  apartamentoNumero,
  competencia,
  demonstrativoData: initialData,
}: CalculoApartamentoModalProps) {
  // Se não foi passado demonstrativoData ou se a competência é diferente, busca do backend
  const compParam = competencia || initialData?.competencia || "";
  const { data: fetchedData, isLoading } = useDemonstrativoMensal(compParam);

  const data = initialData || fetchedData;

  const aptoCalculo = useMemo<CalculoApartamentoData | null>(() => {
    if (!data || !apartamentoNumero) return null;

    const aptoHeader = data.apartamentos_header.find(
      (a) => a.numero === apartamentoNumero
    );
    const cobranca = data.cobrancas_moradores.find(
      (c) => c.apartamento_numero === apartamentoNumero
    );
    const leituraGas = data.gas.leituras.find(
      (g) => g.apartamento_numero === apartamentoNumero
    );

    const fracoesAgua = data.fracoes_agua || [];
    // Busca fração ideal de água correspondente
    let fracaoAguaDesc = "14,2857%";
    let fracaoAguaNum = aptoHeader?.fracao_ideal || 0.142857;

    const fracaoMatch = fracoesAgua.find((f) =>
      f.descricao.includes(apartamentoNumero)
    );
    if (fracaoMatch) {
      fracaoAguaDesc = fracaoMatch.percentual_formatado;
      fracaoAguaNum = fracaoMatch.fracao;
    } else if (aptoHeader?.fracao_ideal) {
      fracaoAguaDesc = `${(aptoHeader.fracao_ideal * 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })}%`;
    }

    // 1. Despesas Comuns vs Água
    let totalDespesasComunsApto = 0;
    const despesasComuns: CalculoApartamentoData["despesasComuns"] = [];
    let aguaInfo: NonNullable<CalculoApartamentoData["agua"]> | undefined = undefined;

    for (const d of data.despesas_itens) {
      const descLower = d.descricao.toLowerCase();
      const isAgua =
        descLower.includes("copasa") ||
        descLower.includes("água") ||
        descLower.includes("agua");

      const valorApto = d.rateio_por_apto[apartamentoNumero] || 0;

      if (isAgua) {
        aguaInfo = {
          descricao: d.descricao,
          valorTotalCopasa: d.valor,
          fracaoAplicada: fracaoAguaDesc,
          valorApto,
        };
      } else {
        totalDespesasComunsApto += valorApto;
        despesasComuns.push({
          descricao: d.descricao,
          observacao: d.observacao,
          valorTotal: d.valor,
          valorApto,
        });
      }
    }

    // 2. Gás
    let gasInfo: NonNullable<CalculoApartamentoData["gas"]> | undefined = undefined;
    if (leituraGas) {
      gasInfo = {
        leituraAnterior: leituraGas.leitura_anterior,
        leituraAtual: leituraGas.leitura_atual,
        m3Usado: leituraGas.m3_usado,
        precoM3: data.gas.preco_m3 || 19.95,
        valorApto: leituraGas.valor_a_pagar,
      };
    }

    // 3. Fundo de Reserva
    const fundoReservaValor =
      data.fundo_reserva.rateio_por_apto[apartamentoNumero] ??
      data.fundo_reserva.valor_unitario ??
      0;

    // 4. Totalização
    const totalCalculado =
      cobranca?.valor_a_pagar ??
      totalDespesasComunsApto +
        (aguaInfo?.valorApto || 0) +
        (gasInfo?.valorApto || 0) +
        fundoReservaValor;

    const isAlugado = Boolean(
      aptoHeader?.is_alugado ||
      cobranca?.is_alugado ||
      aptoHeader?.status === "alugado" ||
      cobranca?.status_apartamento === "alugado"
    );

    const propNome = aptoHeader?.proprietario_nome || cobranca?.proprietario_nome || null;
    const propEmail = aptoHeader?.proprietario_email || cobranca?.proprietario_email || null;
    const cotaInquilino = cobranca?.cota_inquilino ?? (totalDespesasComunsApto + (aguaInfo?.valorApto || 0) + (gasInfo?.valorApto || 0));
    const cotaProprietario = cobranca?.cota_proprietario ?? fundoReservaValor;

    return {
      apartamentoNumero,
      bloco: aptoHeader?.bloco || null,
      responsavelNome:
        cobranca?.responsavel_nome ||
        aptoHeader?.responsavel_nome ||
        `Morador Apto ${apartamentoNumero}`,
      isAlugado,
      proprietarioNome: propNome,
      proprietarioEmail: propEmail,
      cotaInquilino,
      cotaProprietario,
      competenciaFormatada: data.competencia_formatada,
      vencimento: cobranca?.vencimento ? formatDate(cobranca.vencimento) : "10/" + data.competencia_formatada,
      status: cobranca?.status || "pendente",
      dataPagamento: cobranca?.data_pagamento ? formatDate(cobranca.data_pagamento) : null,
      fracaoAguaFormatada: fracaoAguaDesc,
      fracaoAguaValor: fracaoAguaNum,
      despesasComuns,
      totalDespesasComunsApto,
      agua: aguaInfo,
      gas: gasInfo,
      fundoReserva: {
        descricao: data.fundo_reserva.descricao,
        valorApto: fundoReservaValor,
      },
      totalGeral: totalCalculado,
      acoesEventos: data.acoes_eventos || [],
    };
  }, [data, apartamentoNumero]);

  const handleExportPDF = () => {
    if (!aptoCalculo) return;
    try {
      exportCalculoApartamentoPDF(aptoCalculo);
      toast.success(
        `Memória de cálculo do Apto ${aptoCalculo.apartamentoNumero} exportada com sucesso!`
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF do cálculo.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:border-none print:shadow-none">
        <DialogHeader className="border-b pb-3 print:border-b-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Memória de Cálculo do Condomínio
                  <Badge variant="secondary" className="font-mono text-xs">
                    Apto {apartamentoNumero}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Detalhamento item por item dos custos, frações e medições de {data?.competencia_formatada}.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExportPDF}
                className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-3.5 w-3.5" /> Salvar PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading || !aptoCalculo ? (
          <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p>Carregando memória de cálculo do apartamento...</p>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* ── CARD PRINCIPAL: IDENTIFICAÇÃO E TOTAL ──────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-foreground">
                    Apartamento {aptoCalculo.apartamentoNumero}
                    {aptoCalculo.bloco ? ` - ${aptoCalculo.bloco}` : ""}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                      aptoCalculo.status.toLowerCase() === "pago"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : aptoCalculo.status.toLowerCase() === "atrasado"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {aptoCalculo.status.toLowerCase() === "pago" && (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    )}
                    {aptoCalculo.status}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">
                    {aptoCalculo.isAlugado ? "Inquilino / Locatário:" : "Responsável:"}
                  </strong>{" "}
                  {aptoCalculo.responsavelNome}
                  {aptoCalculo.isAlugado && aptoCalculo.proprietarioNome && (
                    <span className="block pt-0.5">
                      <strong className="text-foreground">Proprietário (Locador):</strong> {aptoCalculo.proprietarioNome}
                    </span>
                  )}
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  <span>
                    <strong className="text-foreground">Vencimento:</strong> {aptoCalculo.vencimento}
                  </span>
                  {aptoCalculo.dataPagamento && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      <strong className="text-foreground">Pago em:</strong> {aptoCalculo.dataPagamento}
                    </span>
                  )}
                  <span>
                    <strong className="text-foreground">Fração Água:</strong> {aptoCalculo.fracaoAguaFormatada}
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-center items-start sm:items-end border-t sm:border-t-0 sm:border-l sm:pl-4 pt-2 sm:pt-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total do Condomínio
                </span>
                <span className="text-2xl font-extrabold text-primary font-mono tracking-tight">
                  {formatCurrency(aptoCalculo.totalGeral)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Competência: {aptoCalculo.competenciaFormatada}
                </span>
              </div>
            </div>

            {/* ── CARD DESTACADO: DIVISÃO DE RESPONSABILIDADE (LEI DO INQUILINATO) ── */}
            {aptoCalculo.isAlugado && (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-pink-50/40 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                        Divisão de Responsabilidade Legal (Lei do Inquilinato nº 8.245/91)
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Fundo de Reserva é de obrigação do proprietário; despesas ordinárias e consumos são do locatário
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                    Imóvel Alugado
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Cota Inquilino */}
                  <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                        🔵 Cota do Inquilino / Morador
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[130px]" title={aptoCalculo.responsavelNome}>
                        {aptoCalculo.responsavelNome}
                      </span>
                    </div>
                    <div className="text-xl font-black font-mono text-blue-700 dark:text-blue-300">
                      {formatCurrency(aptoCalculo.cotaInquilino ?? (aptoCalculo.totalDespesasComunsApto + (aptoCalculo.agua?.valorApto || 0) + (aptoCalculo.gas?.valorApto || 0)))}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Despesas ordinárias de consumo e rotina: Despesas Comuns ({formatCurrency(aptoCalculo.totalDespesasComunsApto)}) + Água ({formatCurrency(aptoCalculo.agua?.valorApto || 0)}) + Gás ({formatCurrency(aptoCalculo.gas?.valorApto || 0)}).
                    </p>
                  </div>

                  {/* Cota Proprietário */}
                  <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/80 dark:bg-purple-950/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">
                        🟣 Cota do Proprietário / Locador
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[130px]" title={aptoCalculo.proprietarioNome || "Proprietário"}>
                        {aptoCalculo.proprietarioNome || "Proprietário"}
                      </span>
                    </div>
                    <div className="text-xl font-black font-mono text-purple-700 dark:text-purple-300">
                      {formatCurrency(aptoCalculo.cotaProprietario ?? aptoCalculo.fundoReserva.valorApto)}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Fundo de Reserva / Obras extraordinárias ({formatCurrency(aptoCalculo.fundoReserva.valorApto)}). Exclusivo do proprietário conforme Art. 22 da Lei 8.245/91.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 1. DESPESAS ORDINÁRIAS COMUNS (RATEIO IGUAL) ───────────────── */}
            <div className="rounded-lg border overflow-hidden shadow-xs">
              <div className="bg-slate-100 dark:bg-slate-900/80 p-2.5 px-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  <span className="font-bold text-xs uppercase text-slate-900 dark:text-slate-200">
                    1. Despesas Ordinárias Comuns (Rateio Igualitário)
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  1/7 (~14,2857% cada)
                </Badge>
              </div>

              <div className="p-3 space-y-2 text-xs">
                <p className="text-[11px] text-muted-foreground">
                  As despesas ordinárias do condomínio (energia comum, limpeza, manutenções gerais e seguros) são divididas igualmente entre os 7 apartamentos.
                </p>

                {aptoCalculo.despesasComuns.length === 0 ? (
                  <p className="italic text-muted-foreground text-center py-2">
                    Nenhuma despesa comum lançada no mês.
                  </p>
                ) : (
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b">
                        <tr className="text-left font-semibold text-muted-foreground">
                          <th className="p-2">Item de Despesa</th>
                          <th className="p-2 text-right">Total Condomínio</th>
                          <th className="p-2 text-center">Critério</th>
                          <th className="p-2 text-right">Cota Apto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {aptoCalculo.despesasComuns.map((d, i) => (
                          <tr key={i} className="hover:bg-muted/20">
                            <td className="p-2 font-medium">
                              {d.descricao}
                              {d.observacao && (
                                <span className="block text-[10px] text-muted-foreground">
                                  {d.observacao}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right font-mono text-muted-foreground">
                              {formatCurrency(d.valorTotal)}
                            </td>
                            <td className="p-2 text-center text-muted-foreground text-[11px]">
                              ÷ 7 aptos
                            </td>
                            <td className="p-2 text-right font-mono font-semibold text-foreground">
                              {formatCurrency(d.valorApto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/40 font-bold border-t">
                        <tr>
                          <td colSpan={3} className="p-2 uppercase text-foreground">
                            Subtotal Despesas Comuns deste Apto:
                          </td>
                          <td className="p-2 text-right font-mono text-primary text-sm">
                            {formatCurrency(aptoCalculo.totalDespesasComunsApto)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ── 2. RATEIO DE ÁGUA (COPASA - FRAÇÃO IDEAL) ──────────────────── */}
            {aptoCalculo.agua && (
              <div className="rounded-lg border border-sky-200 dark:border-sky-900/60 overflow-hidden shadow-xs">
                <div className="bg-sky-50 dark:bg-sky-950/60 p-2.5 px-3 flex items-center justify-between border-b border-sky-200 dark:border-sky-900/60 text-sky-950 dark:text-sky-200">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <span className="font-bold text-xs uppercase">
                      2. Rateio de Água (Copasa - Fração Ideal Específica)
                    </span>
                  </div>
                  <Badge className="bg-sky-600 hover:bg-sky-700 text-[10px] font-mono">
                    Fração: {aptoCalculo.fracaoAguaFormatada}
                  </Badge>
                </div>

                <div className="p-3 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-2.5 rounded bg-sky-50/50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40">
                      <span className="text-[10px] uppercase font-semibold text-sky-700 dark:text-sky-300 block">
                        Conta Total Copasa
                      </span>
                      <span className="text-base font-bold font-mono text-foreground">
                        {formatCurrency(aptoCalculo.agua.valorTotalCopasa)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-sky-50/50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40">
                      <span className="text-[10px] uppercase font-semibold text-sky-700 dark:text-sky-300 block">
                        Fração Aplicada ao Apto
                      </span>
                      <span className="text-base font-bold font-mono text-sky-700 dark:text-sky-400">
                        {aptoCalculo.fracaoAguaFormatada}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-sky-100/70 dark:bg-sky-900/50 border border-sky-300 dark:border-sky-700">
                      <span className="text-[10px] uppercase font-semibold text-sky-900 dark:text-sky-200 block">
                        Valor de Água do Apto
                      </span>
                      <span className="text-base font-extrabold font-mono text-sky-800 dark:text-sky-200">
                        {formatCurrency(aptoCalculo.agua.valorApto)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-muted/40 border text-[11px] flex items-center gap-2 text-muted-foreground">
                    <Info className="h-4 w-4 text-sky-500 shrink-0" />
                    <span>
                      <strong>Memória da Fórmula:</strong> {formatCurrency(aptoCalculo.agua.valorTotalCopasa)} (Total Copasa) × {aptoCalculo.fracaoAguaValor} ({aptoCalculo.fracaoAguaFormatada}) ={" "}
                      <strong className="text-foreground">{formatCurrency(aptoCalculo.agua.valorApto)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── 3. CONSUMO INDIVIDUAL DE GÁS ───────────────────────────────── */}
            {aptoCalculo.gas && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 overflow-hidden shadow-xs">
                <div className="bg-amber-50 dark:bg-amber-950/60 p-2.5 px-3 flex items-center justify-between border-b border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-bold text-xs uppercase">
                      3. Consumo Individual de Gás (Medição do Mês)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-medium">
                    R$ {aptoCalculo.gas.precoM3.toFixed(2).replace(".", ",")} o m³
                  </span>
                </div>

                <div className="p-3 space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                    <div className="p-2 rounded bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Leitura Anterior
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {aptoCalculo.gas.leituraAnterior.toFixed(1)} m³
                      </span>
                    </div>

                    <div className="p-2 rounded bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Leitura Atual
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {aptoCalculo.gas.leituraAtual.toFixed(1)} m³
                      </span>
                    </div>

                    <div className="p-2 rounded bg-amber-100/60 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800">
                      <span className="text-[10px] text-amber-900 dark:text-amber-200 uppercase block font-semibold">
                        Consumo Apurado
                      </span>
                      <span className="font-mono font-extrabold text-amber-900 dark:text-amber-200">
                        {aptoCalculo.gas.m3Usado.toFixed(1)} m³
                      </span>
                    </div>

                    <div className="p-2 rounded bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Tarifa / m³
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        R$ {aptoCalculo.gas.precoM3.toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-amber-200/70 dark:bg-amber-900/70 border border-amber-300 dark:border-amber-700 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-amber-950 dark:text-amber-100 uppercase block font-bold">
                        Valor do Gás
                      </span>
                      <span className="font-mono font-extrabold text-amber-950 dark:text-amber-100 text-sm">
                        {formatCurrency(aptoCalculo.gas.valorApto)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-muted/40 border text-[11px] flex items-center gap-2 text-muted-foreground">
                    <Info className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>
                      <strong>Fórmula:</strong> {aptoCalculo.gas.m3Usado.toFixed(1)} m³ (Consumo) × R$ {aptoCalculo.gas.precoM3.toFixed(2).replace(".", ",")} (Preço m³) ={" "}
                      <strong className="text-foreground">{formatCurrency(aptoCalculo.gas.valorApto)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. FUNDO DE RESERVA E RESUMO FINAL ─────────────────────────── */}
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 overflow-hidden shadow-xs">
              <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 px-3 flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-xs uppercase">
                    4. Fundo de Reserva & Composição Total
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(aptoCalculo.fundoReserva.valorApto)}
                </span>
              </div>

              <div className="p-3 space-y-3 text-xs">
                <div className="space-y-1.5 border rounded-lg p-2.5 bg-card">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>(+) Despesas Ordinárias Comuns:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {formatCurrency(aptoCalculo.totalDespesasComunsApto)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>(+) Cota de Água (Copasa por Fração):</span>
                    <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
                      {formatCurrency(aptoCalculo.agua?.valorApto || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>(+) Consumo Individual de Gás:</span>
                    <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                      {formatCurrency(aptoCalculo.gas?.valorApto || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>(+) Fundo de Reserva / Manutenção:</span>
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(aptoCalculo.fundoReserva.valorApto)}
                    </span>
                  </div>

                  <div className="border-t pt-2 flex items-center justify-between font-bold text-sm text-foreground bg-primary/5 p-2 rounded">
                    <span className="text-primary">(=) TOTAL A PAGAR (CONDOMÍNIO):</span>
                    <span className="font-mono text-primary text-base">
                      {formatCurrency(aptoCalculo.totalGeral)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5. COMUNICADOS E AÇÕES REALIZADAS NO MÊS ───────────────────── */}
            {aptoCalculo.acoesEventos && aptoCalculo.acoesEventos.length > 0 && (
              <div className="rounded-lg border border-purple-200 dark:border-purple-900/60 overflow-hidden shadow-xs">
                <div className="bg-purple-50 dark:bg-purple-950/60 p-2.5 px-3 flex items-center gap-2 border-b border-purple-200 dark:border-purple-900/60 text-purple-950 dark:text-purple-200">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-bold text-xs uppercase">
                    5. Ações e Eventos Realizados no Mês
                  </span>
                </div>
                <div className="p-3 space-y-2 text-xs">
                  {aptoCalculo.acoesEventos.map((ev, i) => (
                    <div key={i} className="p-2 rounded bg-muted/30 border space-y-0.5">
                      <span className="font-bold text-foreground">{ev.titulo}</span>
                      <p className="text-muted-foreground leading-relaxed">{ev.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-2 border-t print:hidden">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleExportPDF}
            className="gap-1.5"
            disabled={!aptoCalculo}
          >
            <Download className="h-4 w-4" /> Salvar Extrato PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
